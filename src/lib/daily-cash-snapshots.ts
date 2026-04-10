import type { DailyCashSnapshot } from "@/lib/types";

export function getSnapshotTotal(snapshot: DailyCashSnapshot) {
  return snapshot.accounts.reduce(
    (total, account) => total + account.balance,
    0,
  );
}

export function compareBalance(liveTotal: number, snapshotTotal: number) {
  const difference = liveTotal - snapshotTotal;

  return {
    difference,
    percentage: snapshotTotal === 0 ? 0 : difference / snapshotTotal,
  };
}
