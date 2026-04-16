import {
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  parseISO,
  subDays,
} from "date-fns";

import { getBalanceBreakdown } from "@/lib/balance-breakdown";
import { compareBalance, getSnapshotTotal } from "@/lib/daily-cash-snapshots";
import type {
  Account,
  DashboardExpenseBreakdown,
  DashboardSubcategoryBreakdownMap,
  DateRangeSelection,
  DailyCashSnapshot,
  ExpenseGroup,
  TrendPoint,
  UnifiedCategoryGroup,
  UnifiedTransaction,
} from "@/lib/types";
import {
  buildReconciliationSummary,
  getExpenseSummary,
} from "@/lib/unified-transactions";

type FinanceViewSelection =
  | string
  | Pick<DateRangeSelection, "startDate" | "endDate">;

type RevenueChannel = "shopify" | "tiktok" | "wholesale" | "consignment";

const ELIGIBLE_EXPENSE_GROUPS = new Set<UnifiedCategoryGroup>([
  "growth",
  "cost",
  "overhead",
]);

const REVENUE_CHANNEL_ORDER: RevenueChannel[] = [
  "shopify",
  "tiktok",
  "wholesale",
  "consignment",
];

const REVENUE_CHANNEL_LABELS: Record<RevenueChannel, string> = {
  shopify: "Shopify",
  tiktok: "TikTok",
  wholesale: "Wholesale",
  consignment: "Consignment",
};

function resolveSelectionRange(selection: FinanceViewSelection) {
  if (typeof selection === "string") {
    return {
      startDate: selection,
      endDate: selection,
    };
  }

  return {
    startDate: selection.startDate,
    endDate: selection.endDate,
  };
}

function buildPreviousSelection(selection: FinanceViewSelection) {
  const { startDate, endDate } = resolveSelectionRange(selection);
  const start = parseISO(`${startDate}T00:00:00+08:00`);
  const end = parseISO(`${endDate}T00:00:00+08:00`);
  const dayCount = differenceInCalendarDays(end, start) + 1;
  const previousEnd = subDays(start, 1);
  const previousStart = subDays(previousEnd, dayCount - 1);

  return {
    startDate: format(previousStart, "yyyy-MM-dd"),
    endDate: format(previousEnd, "yyyy-MM-dd"),
  };
}

function isTransactionWithinSelection(
  transaction: UnifiedTransaction,
  selection: FinanceViewSelection,
) {
  const { startDate, endDate } = resolveSelectionRange(selection);
  const transactionDate = transaction.transaction_date.split("T")[0];

  return transactionDate >= startDate && transactionDate <= endDate;
}

function mapUnifiedCategoryGroupToExpenseGroup(
  categoryGroup: UnifiedCategoryGroup | null | undefined,
): ExpenseGroup | null {
  if (categoryGroup === "growth") {
    return "GROWTH";
  }

  if (categoryGroup === "cost") {
    return "COST";
  }

  if (categoryGroup === "overhead") {
    return "OVERHEAD";
  }

  return null;
}

function getExpenseGroup(transaction: UnifiedTransaction): ExpenseGroup | null {
  const groupedCategory = mapUnifiedCategoryGroupToExpenseGroup(
    transaction.category_group,
  );

  if (groupedCategory) {
    return groupedCategory;
  }

  if (transaction.category_id?.startsWith("cat_growth_")) {
    return "GROWTH";
  }

  if (transaction.category_id?.startsWith("cat_cost_")) {
    return "COST";
  }

  if (transaction.category_id?.startsWith("cat_overhead_")) {
    return "OVERHEAD";
  }

  return null;
}

function getRevenueChannel(transaction: UnifiedTransaction): RevenueChannel | null {
  switch (transaction.category_id) {
    case "cat_income_shopify":
      return "shopify";
    case "cat_income_tiktok":
      return "tiktok";
    case "cat_income_wholesale":
      return "wholesale";
    case "cat_income_consignment":
      return "consignment";
    default:
      break;
  }

  switch (transaction.channel) {
    case "shopify":
    case "tiktok":
    case "wholesale":
    case "consignment":
      return transaction.channel;
    default:
      break;
  }

  const description = transaction.description.toLowerCase();

  if (description.includes("tiktok")) {
    return "tiktok";
  }

  if (description.includes("shopify")) {
    return "shopify";
  }

  if (description.includes("wholesale")) {
    return "wholesale";
  }

  if (description.includes("consignment")) {
    return "consignment";
  }

  return null;
}

function isEligibleRevenueTransaction(transaction: UnifiedTransaction) {
  if (transaction.type !== "income") {
    return false;
  }

  return getRevenueChannel(transaction) !== null;
}

function isEligibleExpenseTransaction(transaction: UnifiedTransaction) {
  if (transaction.type !== "expense") {
    return false;
  }

  if (transaction.category_group && ELIGIBLE_EXPENSE_GROUPS.has(transaction.category_group)) {
    return true;
  }

  return getExpenseGroup(transaction) !== null;
}

function getScopedDailyPerformanceTransactions(
  transactions: UnifiedTransaction[],
  selection: FinanceViewSelection,
) {
  return transactions.filter((transaction) => {
    if (transaction.status !== "verified") {
      return false;
    }

    if (!isTransactionWithinSelection(transaction, selection)) {
      return false;
    }

    return (
      isEligibleRevenueTransaction(transaction) ||
      isEligibleExpenseTransaction(transaction)
    );
  });
}

function buildPerformanceSummary(transactions: UnifiedTransaction[]) {
  return transactions.reduce(
    (summary, transaction) => {
      if (isEligibleRevenueTransaction(transaction)) {
        return {
          sales: summary.sales + transaction.base_amount,
          expense: summary.expense,
          net:
            summary.sales +
            transaction.base_amount -
            summary.expense,
          growthExpense: summary.growthExpense,
        };
      }

      if (!isEligibleExpenseTransaction(transaction)) {
        return summary;
      }

      const nextExpense = summary.expense + transaction.base_amount;
      const nextGrowthExpense =
        getExpenseGroup(transaction) === "GROWTH"
          ? summary.growthExpense + transaction.base_amount
          : summary.growthExpense;

      return {
        sales: summary.sales,
        expense: nextExpense,
        net: summary.sales - nextExpense,
        growthExpense: nextGrowthExpense,
      };
    },
    {
      sales: 0,
      expense: 0,
      net: 0,
      growthExpense: 0,
    },
  );
}

function calculateDeltaPercent(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

function buildMetricComparison(
  current: number,
  previous: number,
  preference: "higher" | "lower",
  availability: "available" | "no_baseline" | "not_comparable" | "first_recorded" = "available",
) {
  if (availability !== "available") {
    return {
      current,
      previous,
      deltaPercent: null,
      direction: "flat" as const,
      trend: "neutral" as const,
      availability,
    };
  }

  const direction: "up" | "down" | "flat" =
    current === previous ? "flat" : current > previous ? "up" : "down";
  const trend: "better" | "worse" | "neutral" =
    direction === "flat"
      ? "neutral"
      : preference === "higher"
        ? current > previous
          ? "better"
          : "worse"
        : current < previous
          ? "better"
          : "worse";

  return {
    current,
    previous,
    deltaPercent: calculateDeltaPercent(current, previous),
    direction,
    trend,
    availability,
  };
}

function buildSalesBreakdown(transactions: UnifiedTransaction[]) {
  const totalsByChannel = new Map<RevenueChannel, number>();

  for (const transaction of transactions) {
    const revenueChannel = getRevenueChannel(transaction);

    if (!revenueChannel || !isEligibleRevenueTransaction(transaction)) {
      continue;
    }

    totalsByChannel.set(
      revenueChannel,
      (totalsByChannel.get(revenueChannel) ?? 0) + transaction.base_amount,
    );
  }

  const by_channel = REVENUE_CHANNEL_ORDER
    .map((channel) => ({
      channel,
      total: totalsByChannel.get(channel) ?? 0,
    }))
    .filter((item) => item.total > 0);

  return {
    by_channel,
    total: by_channel.reduce((sum, item) => sum + item.total, 0),
  };
}

function buildExpenseBreakdown(transactions: UnifiedTransaction[]): DashboardExpenseBreakdown {
  const mainTotals = new Map<ExpenseGroup, number>();
  const subcategoryTotals = new Map<
    string,
    {
      categoryId: string;
      label: string;
      group: ExpenseGroup;
      value: number;
    }
  >();

  for (const transaction of transactions) {
    if (!isEligibleExpenseTransaction(transaction)) {
      continue;
    }

    const group = getExpenseGroup(transaction);

    if (!group) {
      continue;
    }

    mainTotals.set(group, (mainTotals.get(group) ?? 0) + transaction.base_amount);

    const categoryId =
      transaction.category_id ??
      transaction.category_name?.toLowerCase().replace(/\s+/g, "_") ??
      `expense_${group.toLowerCase()}`;
    const label =
      transaction.category_name ??
      (group === "GROWTH" ? "Growth" : group === "COST" ? "Cost" : "Overhead");
    const existing = subcategoryTotals.get(categoryId);

    subcategoryTotals.set(categoryId, {
      categoryId,
      label,
      group,
      value: (existing?.value ?? 0) + transaction.base_amount,
    });
  }

  const subcategories = (["GROWTH", "COST", "OVERHEAD"] as ExpenseGroup[]).reduce(
    (grouped, group) => {
      grouped[group] = [...subcategoryTotals.values()]
        .filter((item) => item.group === group)
        .sort((left, right) => right.value - left.value);
      return grouped;
    },
    {
      GROWTH: [],
      COST: [],
      OVERHEAD: [],
    } as DashboardSubcategoryBreakdownMap,
  );

  const main = (["GROWTH", "COST", "OVERHEAD"] as ExpenseGroup[]).map((group) => ({
    id: group,
    label: group === "GROWTH" ? "Growth" : group === "COST" ? "Cost" : "Overhead",
    value: mainTotals.get(group) ?? 0,
    group,
  }));

  return {
    total: main.reduce((sum, item) => sum + item.value, 0),
    main,
    subcategories,
  };
}

function buildDailyTrendSeries(
  transactions: UnifiedTransaction[],
  selection: FinanceViewSelection,
): TrendPoint[] {
  const { startDate, endDate } = resolveSelectionRange(selection);
  const days = eachDayOfInterval({
    start: parseISO(`${startDate}T00:00:00+08:00`),
    end: parseISO(`${endDate}T00:00:00+08:00`),
  });

  return days.map((day) => {
    const isoDate = format(day, "yyyy-MM-dd");
    const dayTransactions = transactions.filter(
      (transaction) => transaction.transaction_date.split("T")[0] === isoDate,
    );
    const performance = buildPerformanceSummary(dayTransactions);

    return {
      date: isoDate,
      label: format(day, "dd MMM"),
      revenue: performance.sales,
      expense: performance.expense,
      net: performance.net,
      growthExpense: performance.growthExpense,
      adsRatio:
        performance.sales === 0
          ? 0
          : performance.growthExpense / performance.sales,
    };
  });
}

export function getRevenueChannelDisplayName(channel: string) {
  if (channel in REVENUE_CHANNEL_LABELS) {
    return REVENUE_CHANNEL_LABELS[channel as RevenueChannel];
  }

  return channel;
}

export function buildDailyFinanceView(
  accounts: Account[],
  transactions: UnifiedTransaction[],
  snapshot: DailyCashSnapshot,
  selection: FinanceViewSelection,
) {
  const balanceBreakdown = getBalanceBreakdown(accounts, transactions);
  const liveTotal =
    balanceBreakdown.local.total +
    balanceBreakdown.foreign.total +
    balanceBreakdown.holding.total;
  const snapshotTotal = getSnapshotTotal(snapshot);
  const { difference, percentage } = compareBalance(liveTotal, snapshotTotal);
  const scopedTransactions = getScopedDailyPerformanceTransactions(transactions, selection);
  const previousSelection = buildPreviousSelection(selection);
  const previousTransactions = getScopedDailyPerformanceTransactions(
    transactions,
    previousSelection,
  );
  const hasPreviousData = previousTransactions.length > 0;
  const currentPerformance = buildPerformanceSummary(scopedTransactions);
  const previousPerformance = buildPerformanceSummary(previousTransactions);
  const currentAdsRatio =
    currentPerformance.sales === 0
      ? 0
      : currentPerformance.growthExpense / currentPerformance.sales;
  const previousAdsRatio =
    previousPerformance.sales === 0
      ? 0
      : previousPerformance.growthExpense / previousPerformance.sales;
  const adsRatioAvailability =
    !hasPreviousData
      ? "no_baseline"
      : previousPerformance.sales === 0
        ? "not_comparable"
        : previousPerformance.growthExpense === 0 &&
            currentPerformance.growthExpense > 0
          ? "first_recorded"
          : "available";
  const revenueAvailability =
    !hasPreviousData
      ? "no_baseline"
      : previousPerformance.sales === 0
        ? "not_comparable"
        : "available";
  const netAvailability =
    !hasPreviousData
      ? "no_baseline"
      : previousPerformance.net === 0
        ? "not_comparable"
        : "available";

  return {
    balance: {
      liveTotal,
      snapshotTotal,
      difference,
      percentage,
      breakdown: balanceBreakdown,
    },
    performance: currentPerformance,
    breakdowns: {
      sales: buildSalesBreakdown(scopedTransactions),
      expense: getExpenseSummary(scopedTransactions),
    },
    expenseBreakdown: buildExpenseBreakdown(scopedTransactions),
    trend: buildDailyTrendSeries(scopedTransactions, selection),
    comparison: {
      selection: previousSelection,
      adsRatio: buildMetricComparison(
        currentAdsRatio,
        previousAdsRatio,
        "lower",
        adsRatioAvailability,
      ),
      revenue: buildMetricComparison(
        currentPerformance.sales,
        previousPerformance.sales,
        "higher",
        revenueAvailability,
      ),
      net: buildMetricComparison(
        currentPerformance.net,
        previousPerformance.net,
        "higher",
        netAvailability,
      ),
    },
    reconciliation: buildReconciliationSummary(scopedTransactions),
  };
}
