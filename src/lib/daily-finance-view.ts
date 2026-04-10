import { getBalanceBreakdown } from "@/lib/balance-breakdown";
import { compareBalance, getSnapshotTotal } from "@/lib/daily-cash-snapshots";
import type { Account, DailyCashSnapshot, UnifiedTransaction } from "@/lib/types";
import {
  buildReconciliationSummary,
  getDailyFinancialSummary,
  getExpenseSummary,
  getSalesSummary,
} from "@/lib/unified-transactions";

function filterTransactionsByDate(
  transactions: UnifiedTransaction[],
  date: string,
) {
  return transactions.filter(
    (transaction) => transaction.transaction_date.split("T")[0] === date,
  );
}

function getDailyGrowthExpense(
  transactions: UnifiedTransaction[],
  date: string,
) {
  return transactions.reduce((total, transaction) => {
    if (
      transaction.transaction_date.split("T")[0] !== date ||
      transaction.type !== "expense" ||
      transaction.category_group !== "growth"
    ) {
      return total;
    }

    return total + transaction.base_amount;
  }, 0);
}

export function buildDailyFinanceView(
  accounts: Account[],
  transactions: UnifiedTransaction[],
  snapshot: DailyCashSnapshot,
  date: string,
) {
  const balanceBreakdown = getBalanceBreakdown(accounts, transactions);
  const liveTotal =
    balanceBreakdown.local.total +
    balanceBreakdown.foreign.total +
    balanceBreakdown.holding.total;
  const snapshotTotal = getSnapshotTotal(snapshot);
  const { difference, percentage } = compareBalance(liveTotal, snapshotTotal);
  const scopedTransactions = filterTransactionsByDate(transactions, date);

  return {
    balance: {
      liveTotal,
      snapshotTotal,
      difference,
      percentage,
      breakdown: balanceBreakdown,
    },
    performance: {
      ...getDailyFinancialSummary(transactions, date),
      growthExpense: getDailyGrowthExpense(transactions, date),
    },
    breakdowns: {
      sales: getSalesSummary(scopedTransactions),
      expense: getExpenseSummary(scopedTransactions),
    },
    reconciliation: buildReconciliationSummary(scopedTransactions),
  };
}
