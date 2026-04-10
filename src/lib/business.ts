import {
  differenceInCalendarDays,
  eachMonthOfInterval,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfDay,
  subDays,
  subMilliseconds,
  subMonths,
} from "date-fns";

import { NOW } from "@/lib/mock-data";
import { formatDateRangeLabel } from "@/lib/format";
import {
  isExpenseTransaction,
  isIncomeTransaction,
} from "@/lib/unified-transactions";
import type {
  Category,
  Channel,
  ChannelSnapshotItem,
  DateRangeSelection,
  DashboardExpenseBreakdown,
  DashboardMetrics,
  DashboardPayload,
  DashboardSubcategoryBreakdownMap,
  ExpenseGroup,
  MainCategoryLabel,
  Notification,
  ReconciliationLog,
  ReconciliationSummaryPayload,
  TrafficLightStatus,
  Transaction,
  TransactionCategoryMapping,
  TrendPoint,
  UnifiedCategoryGroup,
  UnifiedTransaction,
} from "@/lib/types";

export type ViewMode = "daily" | "monthly";

export const MANUAL_EXPENSE_GROUP_OPTIONS = [
  {
    group: "COST" as const,
    label: "Cost",
    items: [
      { id: "cat_cost_production_bangkok", label: "Production - Bangkok" },
      { id: "cat_cost_production_brass", label: "Production - Brass" },
      { id: "cat_cost_production_worker", label: "Production - Worker" },
      { id: "cat_cost_production_package", label: "Production - Packaging" },
      { id: "cat_cost_production_material", label: "Production - Material" },
      { id: "cat_cost_shipping_dhl", label: "Shipping - DHL" },
      { id: "cat_cost_shipping_baraka", label: "Shipping - Baraka" },
      { id: "cat_cost_shipping_grab", label: "Shipping - Grab" },
      { id: "cat_cost_shipping_package", label: "Shipping - Packaging" },
    ],
  },
  {
    group: "GROWTH" as const,
    label: "Growth",
    items: [
      { id: "cat_growth_promote_online_ads", label: "Online Ads" },
      { id: "cat_growth_promote_tiktok_ads", label: "TikTok Ads" },
      { id: "cat_growth_promote_tiktok_salary", label: "TikTok Salary" },
      { id: "cat_growth_promote_tiktok_live", label: "TikTok Live" },
      { id: "cat_growth_promote_tiktok_commiss", label: "TikTok Commission" },
      { id: "cat_growth_promote_tiktok_shop_fee", label: "TikTok Shop Fee" },
      { id: "cat_growth_sosmed_team", label: "Social Media Team" },
      { id: "cat_growth_sosmed_shoot", label: "Content Shoot" },
    ],
  },
  {
    group: "OVERHEAD" as const,
    label: "Overhead",
    items: [
      { id: "cat_overhead_office_salaries", label: "Office Salaries" },
      { id: "cat_overhead_office_rent", label: "Office Rent" },
      { id: "cat_overhead_office_power", label: "Office Electricity" },
      { id: "cat_overhead_office_operational", label: "Office Operational" },
      { id: "cat_overhead_office_tax", label: "Office Tax" },
      { id: "cat_overhead_office_refund", label: "Office Refund" },
      { id: "cat_overhead_german_expense", label: "German Expense" },
    ],
  },
];

const CURRENT_DATE = parseISO(NOW);

export function getDefaultDateRangeSelection(): DateRangeSelection {
  return {
    preset: "THIS_MONTH",
    startDate: format(startOfMonth(CURRENT_DATE), "yyyy-MM-dd"),
    endDate: format(CURRENT_DATE, "yyyy-MM-dd"),
    compareWithPrevious: false,
  };
}

export function getTrafficLightStatus(adsPercent: number): TrafficLightStatus {
  if (adsPercent < 15) {
    return "GREEN";
  }

  if (adsPercent <= 25) {
    return "YELLOW";
  }

  return "RED";
}

export function getLandingPath(role: string) {
  return role === "FINANCE" ? "/manual-inputs" : "/";
}

function resolveDateRange(selection: DateRangeSelection) {
  const today = startOfDay(CURRENT_DATE);

  switch (selection.preset) {
    case "TODAY":
      return { start: today, end: today };
    case "YESTERDAY": {
      const yesterday = startOfDay(subDays(CURRENT_DATE, 1));
      return { start: yesterday, end: yesterday };
    }
    case "LAST_7_DAYS":
      return { start: startOfDay(subDays(CURRENT_DATE, 6)), end: today };
    case "THIS_MONTH":
      return { start: startOfMonth(CURRENT_DATE), end: today };
    case "LAST_MONTH": {
      const lastMonth = subMonths(CURRENT_DATE, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case "CUSTOM":
      return {
        start: startOfDay(parseISO(selection.startDate)),
        end: startOfDay(parseISO(selection.endDate)),
      };
  }
}

export function getDateRangeSelectionForPreset(
  preset: DateRangeSelection["preset"],
  currentSelection?: DateRangeSelection,
): DateRangeSelection {
  if (preset === "CUSTOM" && currentSelection) {
    return { ...currentSelection, preset };
  }

  const base = getDefaultDateRangeSelection();
  const resolved = resolveDateRange({ ...base, preset });

  return {
    preset,
    startDate: format(resolved.start, "yyyy-MM-dd"),
    endDate: format(resolved.end, "yyyy-MM-dd"),
    compareWithPrevious: currentSelection?.compareWithPrevious ?? false,
  };
}

export function getDateRangeLabel(selection: DateRangeSelection) {
  const resolved = resolveDateRange(selection);
  return formatDateRangeLabel(
    format(resolved.start, "yyyy-MM-dd"),
    format(resolved.end, "yyyy-MM-dd"),
  );
}

function mapLegacyChannelIdToAccountId(channelId: string) {
  if (channelId === "chn_bca") {
    return "bca_pt";
  }

  if (channelId === "chn_wise") {
    return "wise";
  }

  if (channelId === "chn_pingpong") {
    return "pingpong";
  }

  if (channelId === "chn_aspire") {
    return "aspire_sgd";
  }

  if (channelId === "chn_tiktok") {
    return "tiktok_settlement";
  }

  return channelId;
}

function isInRange(date: string, mode: ViewMode) {
  const parsed = parseISO(date);
  return mode === "daily"
    ? isSameDay(parsed, CURRENT_DATE)
    : isSameMonth(parsed, CURRENT_DATE);
}

export function buildCategoryMap(categories: Category[]) {
  return Object.fromEntries(categories.map((category) => [category.id, category]));
}

export function getMainCategoryLabel(expenseGroup: ExpenseGroup): MainCategoryLabel {
  if (expenseGroup === "GROWTH") {
    return "Growth";
  }
  if (expenseGroup === "COST") {
    return "Cost";
  }
  return "Overhead";
}

export function getExpenseCategoryRoot(
  categoryId: string,
  categories: Record<string, Category>,
) {
  let current = categories[categoryId];

  if (!current || current.type !== "EXPENSE") {
    return null;
  }

  while (current.parentId) {
    const parent = categories[current.parentId];
    if (!parent) {
      break;
    }
    current = parent;
  }

  return current;
}

export function getExpenseGroupForCategory(
  categoryId: string,
  categories: Record<string, Category>,
) {
  return getExpenseCategoryRoot(categoryId, categories)?.expenseGroup;
}

export function mapTransactionCategory(
  transactionCategory: string,
  categories: Record<string, Category>,
): TransactionCategoryMapping | null {
  const normalizedInput = transactionCategory.trim().toLowerCase();
  const category = Object.values(categories).find(
    (item) =>
      item.type === "EXPENSE" &&
      (item.id.toLowerCase() === normalizedInput ||
        item.name.toLowerCase() === normalizedInput),
  );

  if (!category) {
    return null;
  }

  const root = getExpenseCategoryRoot(category.id, categories);
  const expenseGroup = root?.expenseGroup;

  if (!root || !expenseGroup) {
    return null;
  }

  return {
    mainCategory: getMainCategoryLabel(expenseGroup),
    subCategory: category.parentId ? category.name : root.name,
  };
}

export function buildChannelMap(channels: Channel[]) {
  return Object.fromEntries(channels.map((channel) => [channel.id, channel]));
}

export function getCategoryLabel(
  categoryId: string,
  categories: Record<string, Category>,
) {
  const current = categories[categoryId];
  if (!current) {
    return "Uncategorized";
  }

  if (!current.parentId) {
    return current.name;
  }

  const parent = categories[current.parentId];
  return parent ? `${parent.name} / ${current.name}` : current.name;
}

export function getManualExpenseGroupLabel(expenseGroup: ExpenseGroup) {
  return (
    MANUAL_EXPENSE_GROUP_OPTIONS.find((option) => option.group === expenseGroup)?.label ??
    getMainCategoryLabel(expenseGroup)
  );
}

export function getManualExpenseCategoryLabel(categoryId: string) {
  return MANUAL_EXPENSE_GROUP_OPTIONS.flatMap((option) => option.items).find(
    (item) => item.id === categoryId,
  )?.label;
}

export function getTransactionsForMode(
  transactions: Transaction[],
  mode: ViewMode,
) {
  return transactions.filter((transaction) => isInRange(transaction.transactionDate, mode));
}

export function getTransactionsForDateRange(
  transactions: Transaction[],
  selection: DateRangeSelection,
) {
  const resolved = resolveDateRange(selection);
  const interval = {
    start: resolved.start,
    end: endOfDay(resolved.end),
  };

  return transactions.filter((transaction) =>
    isWithinInterval(parseISO(transaction.transactionDate), interval),
  );
}

function mapExpenseGroupToUnifiedCategoryGroup(
  expenseGroup: ExpenseGroup | undefined,
): UnifiedCategoryGroup | null {
  if (!expenseGroup) {
    return null;
  }

  if (expenseGroup === "GROWTH") {
    return "growth";
  }

  if (expenseGroup === "COST") {
    return "cost";
  }

  return "overhead";
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

export function normalizeTransaction(
  transaction: Transaction,
  categories: Record<string, Category> = {},
): UnifiedTransaction {
  const category = categories[transaction.categoryId];
  const expenseGroup = getExpenseGroupForCategory(transaction.categoryId, categories);

  return {
    id: transaction.id,
    type: transaction.kind === "INCOME" ? "income" : "expense",
    account_id: mapLegacyChannelIdToAccountId(transaction.channelId),
    target_account_id: null,
    channel: transaction.channelId,
    category_group:
      transaction.kind === "EXPENSE"
        ? mapExpenseGroupToUnifiedCategoryGroup(expenseGroup)
        : null,
    category_name:
      transaction.kind === "EXPENSE" ? category?.name ?? null : null,
    status:
      transaction.verificationStatus === "VERIFIED" ? "verified" : "pending",
    origin: transaction.entryType === "AUTO" ? "auto" : "manual",
    amount: transaction.amount,
    original_currency: transaction.originalCurrency,
    exchange_rate: transaction.exchangeRate,
    base_amount: transaction.baseAmount,
    transaction_date: transaction.transactionDate,
    description: transaction.description,
    proof: transaction.proof ?? null,
    logged_by: transaction.loggedBy ?? null,
  };
}

export function normalizeTransactions(
  transactions: Transaction[],
  categories: Record<string, Category> = {},
) {
  return transactions.map((transaction) => normalizeTransaction(transaction, categories));
}

export function calculateMetrics(
  transactions: Transaction[],
  categories: Record<string, Category>,
): DashboardMetrics {
  const normalizedTransactions = normalizeTransactions(transactions, categories);
  let totalRevenue = 0;
  let totalExpense = 0;
  const expenseTotalsByMainCategory = new Map<ExpenseGroup, number>();

  for (const transaction of normalizedTransactions) {
    if (isIncomeTransaction(transaction)) {
      totalRevenue += transaction.base_amount;
      continue;
    }

    if (!isExpenseTransaction(transaction)) {
      continue;
    }

    totalExpense += transaction.base_amount;

    const expenseGroup = mapUnifiedCategoryGroupToExpenseGroup(transaction.category_group);
    if (!expenseGroup) {
      continue;
    }

    expenseTotalsByMainCategory.set(
      expenseGroup,
      (expenseTotalsByMainCategory.get(expenseGroup) ?? 0) + transaction.base_amount,
    );
  }

  const growthExpense = expenseTotalsByMainCategory.get("GROWTH") ?? 0;
  const costExpense = expenseTotalsByMainCategory.get("COST") ?? 0;
  const overheadExpense = expenseTotalsByMainCategory.get("OVERHEAD") ?? 0;

  const adsPercent = totalRevenue === 0 ? 0 : (growthExpense / totalRevenue) * 100;

  return {
    totalRevenue,
    totalExpense,
    growthExpense,
    costExpense,
    overheadExpense,
    net: totalRevenue - totalExpense,
    adsPercent,
    status: getTrafficLightStatus(adsPercent),
  };
}

export function buildExpenseBreakdown(
  transactions: Transaction[],
  categories: Record<string, Category>,
): DashboardExpenseBreakdown {
  const main = groupExpenseCategories(transactions, categories).map((item) => ({
    id: item.group,
    label: getMainCategoryLabel(item.group),
    value: item.value,
    group: item.group,
  }));

  return {
    total: main.reduce((sum, item) => sum + item.value, 0),
    main,
    subcategories: buildExpenseSubcategoryBreakdown(transactions, categories),
  };
}

export function buildTrendSeries(
  transactions: Transaction[],
  categories: Record<string, Category>,
  mode: ViewMode,
): TrendPoint[] {
  if (mode === "daily") {
    const days = Array.from({ length: 7 }, (_, index) =>
      startOfDay(subDays(CURRENT_DATE, 6 - index)),
    );

    return days.map((day) => {
      const dayTransactions = transactions.filter((transaction) =>
        isSameDay(parseISO(transaction.transactionDate), day),
      );
      const metrics = calculateMetrics(dayTransactions, categories);

      return {
        label: format(day, "dd MMM"),
        revenue: metrics.totalRevenue,
        expense: metrics.totalExpense,
        net: metrics.net,
      };
    });
  }

  const months = eachMonthOfInterval({
    start: subMonths(CURRENT_DATE, 5),
    end: CURRENT_DATE,
  });

  return months.map((month) => {
    const monthTransactions = transactions.filter((transaction) =>
      isSameMonth(parseISO(transaction.transactionDate), month),
    );
    const metrics = calculateMetrics(monthTransactions, categories);

    return {
      label: format(month, "MMM yyyy"),
      revenue: metrics.totalRevenue,
      expense: metrics.totalExpense,
      net: metrics.net,
    };
  });
}

export function buildTrendSeriesForDateRange(
  transactions: Transaction[],
  categories: Record<string, Category>,
  selection: DateRangeSelection,
): TrendPoint[] {
  const resolved = resolveDateRange(selection);
  const days = eachDayOfInterval({
    start: resolved.start,
    end: resolved.end,
  });

  return days.map((day) => {
    const dayTransactions = transactions.filter((transaction) =>
      isSameDay(parseISO(transaction.transactionDate), day),
    );
    const metrics = calculateMetrics(dayTransactions, categories);

    return {
      label: format(day, days.length > 31 ? "dd MMM" : "dd MMM"),
      revenue: metrics.totalRevenue,
      expense: metrics.totalExpense,
      net: metrics.net,
    };
  });
}

export function buildChannelSnapshot(
  transactions: Transaction[],
  channels: Record<string, Channel>,
): ChannelSnapshotItem[] {
  const normalizedTransactions = normalizeTransactions(transactions);
  const totals = new Map<string, number>();
  let grandTotal = 0;

  for (const transaction of normalizedTransactions) {
    if (!isIncomeTransaction(transaction)) {
      continue;
    }

    const summaryChannel = transaction.channel ?? transaction.account_id;
    const nextValue = (totals.get(summaryChannel) ?? 0) + transaction.base_amount;
    totals.set(summaryChannel, nextValue);
    grandTotal += transaction.base_amount;
  }

  return [...totals.entries()]
    .map(([channelId, amount]) => ({
      channelId,
      channelName: channels[channelId]?.name ?? "Unknown channel",
      amount,
      percentage: grandTotal === 0 ? 0 : (amount / grandTotal) * 100,
    }))
    .sort((left, right) => right.amount - left.amount);
}

export function buildReconciliationSummary(
  transactions: Transaction[],
  reconciliationLogs: ReconciliationLog[],
): ReconciliationSummaryPayload {
  const normalizedTransactions = normalizeTransactions(transactions);
  const pendingCount = normalizedTransactions.filter(
    (transaction) => transaction.status === "pending",
  ).length;
  const verifiedCount = normalizedTransactions.length - pendingCount;
  const latestStatus = reconciliationLogs[0]?.status ?? "COMPLETE";

  return {
    pendingCount,
    verifiedCount,
    completeness:
      transactions.length === 0 ? 100 : (verifiedCount / transactions.length) * 100,
    latestStatus,
  };
}

export function buildAlerts(
  metrics: DashboardMetrics,
  reconciliation: ReconciliationSummaryPayload,
  seedNotifications: Notification[],
): Notification[] {
  const alerts = [...seedNotifications];

  if (metrics.status === "RED") {
    alerts.unshift({
      id: "notif_red_status",
      title: "WhatsApp red-state alert armed",
      message:
        "ADS% is above the safe threshold. Owner notification is ready to fire as soon as live WhatsApp credentials are connected.",
      severity: "CRITICAL",
      createdAt: NOW,
      channel: "WHATSAPP",
    });
  }

  if (reconciliation.pendingCount > 0) {
    alerts.unshift({
      id: "notif_recon_pending",
      title: "Reconciliation needs finance review",
      message: `${reconciliation.pendingCount} transactions still need verification before the board view is fully clean.`,
      severity: "WARNING",
      createdAt: NOW,
      channel: "IN_APP",
    });
  }

  return alerts;
}

function buildPreviousPeriodSelection(selection: DateRangeSelection): DateRangeSelection {
  const resolved = resolveDateRange(selection);
  const dayCount = differenceInCalendarDays(resolved.end, resolved.start) + 1;
  const previousEnd = subMilliseconds(resolved.start, 1);
  const previousStart = startOfDay(subDays(previousEnd, dayCount - 1));

  return {
    preset: "CUSTOM",
    startDate: format(previousStart, "yyyy-MM-dd"),
    endDate: format(previousEnd, "yyyy-MM-dd"),
    compareWithPrevious: selection.compareWithPrevious,
  };
}

function calculateDeltaPercent(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - previous) / previous) * 100;
}

export function buildDashboardPayload({
  transactions,
  categories,
  channels,
  reconciliationLogs,
  notifications,
  dateRange,
}: {
  transactions: Transaction[];
  categories: Category[];
  channels: Channel[];
  reconciliationLogs: ReconciliationLog[];
  notifications: Notification[];
  dateRange: DateRangeSelection;
}): DashboardPayload {
  const categoryMap = buildCategoryMap(categories);
  const channelMap = buildChannelMap(channels);
  const scopedTransactions = getTransactionsForDateRange(transactions, dateRange);
  const metrics = calculateMetrics(scopedTransactions, categoryMap);
  const reconciliation = buildReconciliationSummary(transactions, reconciliationLogs);
  const comparisonSelection = buildPreviousPeriodSelection(dateRange);
  const previousTransactions = getTransactionsForDateRange(
    transactions,
    comparisonSelection,
  );
  const previousMetrics = calculateMetrics(previousTransactions, categoryMap);
  const selectedRangeLabel = getDateRangeLabel(dateRange);

  return {
    metrics,
    expenseBreakdown: buildExpenseBreakdown(scopedTransactions, categoryMap),
    trend: buildTrendSeriesForDateRange(transactions, categoryMap, dateRange),
    monthlyTrend: buildTrendSeries(transactions, categoryMap, "monthly"),
    channelSnapshot: buildChannelSnapshot(scopedTransactions, channelMap),
    alerts: buildAlerts(metrics, reconciliation, notifications),
    lastSyncAt: reconciliationLogs[0]?.checkTime ?? NOW,
    reconciliation,
    selectedRangeLabel,
    comparison: dateRange.compareWithPrevious
      ? {
          previousRangeLabel: getDateRangeLabel(comparisonSelection),
          previousMetrics,
          netDeltaPercent: calculateDeltaPercent(metrics.net, previousMetrics.net),
          revenueDeltaPercent: calculateDeltaPercent(
            metrics.totalRevenue,
            previousMetrics.totalRevenue,
          ),
          expenseDeltaPercent: calculateDeltaPercent(
            metrics.totalExpense,
            previousMetrics.totalExpense,
          ),
          adsDelta: metrics.adsPercent - previousMetrics.adsPercent,
        }
      : undefined,
  };
}

export function groupExpenseCategories(
  transactions: Transaction[],
  categories: Record<string, Category>,
) {
  const normalizedTransactions = normalizeTransactions(transactions, categories);
  const totals = new Map<ExpenseGroup, number>();

  for (const transaction of normalizedTransactions) {
    if (!isExpenseTransaction(transaction)) {
      continue;
    }

    const group = mapUnifiedCategoryGroupToExpenseGroup(transaction.category_group);
    if (!group) {
      continue;
    }

    totals.set(group, (totals.get(group) ?? 0) + transaction.base_amount);
  }

  return (["GROWTH", "COST", "OVERHEAD"] as ExpenseGroup[]).map((group) => ({
    group,
    value: totals.get(group) ?? 0,
  }));
}

export function buildExpenseSubcategoryBreakdown(
  transactions: Transaction[],
  categories: Record<string, Category>,
): DashboardSubcategoryBreakdownMap {
  const normalizedTransactions = normalizeTransactions(transactions, categories);
  const totals = new Map<string, number>();

  for (const transaction of normalizedTransactions) {
    if (!isExpenseTransaction(transaction) || !transaction.category_name) {
      continue;
    }

    const expenseGroup = mapUnifiedCategoryGroupToExpenseGroup(transaction.category_group);
    const category = Object.values(categories).find(
      (item) =>
        item.type === "EXPENSE" &&
        item.parentId &&
        item.name === transaction.category_name &&
        getExpenseGroupForCategory(item.id, categories) === expenseGroup,
    );

    if (!category) {
      continue;
    }

    totals.set(category.id, (totals.get(category.id) ?? 0) + transaction.base_amount);
  }

  const grouped: DashboardSubcategoryBreakdownMap = {
    GROWTH: [],
    COST: [],
    OVERHEAD: [],
  };

  Object.values(categories).forEach((category) => {
    if (category.type !== "EXPENSE" || !category.parentId) {
      return;
    }

    const group = getExpenseGroupForCategory(category.id, categories);
    if (!group) {
      return;
    }

    grouped[group].push({
      categoryId: category.id,
      label: category.name,
      value: totals.get(category.id) ?? 0,
      group,
    });
  });

  (Object.keys(grouped) as ExpenseGroup[]).forEach((group) => {
    grouped[group] = grouped[group]
      .filter((item) => item.value > 0)
      .sort((left, right) => right.value - left.value);
  });

  return grouped;
}

export function groupExpenseSubcategories(
  transactions: Transaction[],
  categories: Record<string, Category>,
) {
  const normalizedTransactions = normalizeTransactions(transactions, categories);
  const totals = new Map<
    string,
    {
      categoryId: string;
      mainCategory: MainCategoryLabel;
      subCategory: string;
      value: number;
    }
  >();

  for (const transaction of normalizedTransactions) {
    if (!isExpenseTransaction(transaction) || !transaction.category_name) {
      continue;
    }

    const category = Object.values(categories).find(
      (item) =>
        item.type === "EXPENSE" &&
        item.parentId &&
        item.name === transaction.category_name,
    );
    const mainCategory = mapUnifiedCategoryGroupToExpenseGroup(transaction.category_group);
    if (!category || !mainCategory) {
      continue;
    }

    const current = totals.get(category.id);
    totals.set(category.id, {
      categoryId: category.id,
      mainCategory: getMainCategoryLabel(mainCategory),
      subCategory: transaction.category_name,
      value: (current?.value ?? 0) + transaction.base_amount,
    });
  }

  return [...totals.values()].sort((left, right) => right.value - left.value);
}
