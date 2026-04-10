import { normalizeTransactions } from "@/lib/business";
import {
  compareBalance,
  getSnapshotTotal,
} from "@/lib/daily-cash-snapshots";
import type { DailyCashSnapshot, Transaction } from "@/lib/types";
import {
  buildReconciliationSummary,
  getLiveBalanceByAccount,
} from "@/lib/unified-transactions";

export function buildDashboardPayload(
  transactions: Transaction[],
  snapshot: DailyCashSnapshot,
) {
  const normalizedTransactions = normalizeTransactions(transactions);
  const accountIds = new Set<string>();

  normalizedTransactions.forEach((transaction) => {
    accountIds.add(transaction.account_id);

    if (transaction.target_account_id) {
      accountIds.add(transaction.target_account_id);
    }
  });

  snapshot.accounts.forEach((account) => {
    accountIds.add(account.account_id);
  });

  const liveBalance = [...accountIds].reduce(
    (total, accountId) =>
      total + getLiveBalanceByAccount(normalizedTransactions, accountId),
    0,
  );
  const snapshotBalance = getSnapshotTotal(snapshot);
  const { difference, percentage } = compareBalance(liveBalance, snapshotBalance);

  return {
    liveBalance,
    snapshotBalance,
    difference,
    percentage,
    reconciliation: buildReconciliationSummary(normalizedTransactions),
  };
}
