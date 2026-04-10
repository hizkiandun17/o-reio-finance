import { addDays, format, parseISO } from "date-fns";

import { channels } from "@/lib/mock-data";
import type {
  AccountBalanceRecord,
  BalanceIncludedAccount,
  BalanceSummary,
  Channel,
  DailyCashSnapshotAccount,
  DailyCashSnapshot,
  DailyCashSnapshotStatus,
} from "@/lib/types";
import {
  listAccountBalances,
  listDailyCashSnapshots,
  saveDailyCashSnapshots,
} from "@/server/balance-repository";

export const DAILY_CLOSING_TIMEZONE = "Asia/Jakarta";

function getDatePart(date: Date, type: "year" | "month" | "day", timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    [type]: "2-digit",
  }).format(date);
}

export function getLocalDateString(
  now: Date = new Date(),
  timeZone = DAILY_CLOSING_TIMEZONE,
) {
  const year = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
  }).format(now);

  return `${year}-${getDatePart(now, "month", timeZone)}-${getDatePart(now, "day", timeZone)}`;
}

export function shiftIsoDate(date: string, amount: number) {
  return format(addDays(parseISO(`${date}T00:00:00Z`), amount), "yyyy-MM-dd");
}

export function getPreviousClosingDate(
  now: Date = new Date(),
  timeZone = DAILY_CLOSING_TIMEZONE,
) {
  return shiftIsoDate(getLocalDateString(now, timeZone), -1);
}

function getLatestTimestamp(values: Array<string | null>) {
  const timestamps = values.filter((value): value is string => Boolean(value)).sort();
  return timestamps.at(-1) ?? null;
}

function mapChannelIdToAccountId(channelId: string) {
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

  return channelId;
}

export function buildIncludedAccounts(
  channelList: Channel[],
  balances: AccountBalanceRecord[],
): BalanceIncludedAccount[] {
  const balanceMap = new Map(balances.map((record) => [record.channelId, record]));

  return channelList
    .filter((channel) => channel.isCashAccount)
    .map((channel) => {
      const record = balanceMap.get(channel.id);

      return {
        channelId: channel.id,
        channelName: channel.name,
        provider: record?.provider ?? channel.name,
        accountName: record?.accountName ?? `${channel.name} cash account`,
        balance: record?.balance ?? null,
        status: record?.status ?? "UNAVAILABLE",
        syncedAt: record?.syncedAt ?? null,
      };
    });
}

export function getBalanceHealth(accounts: BalanceIncludedAccount[]) {
  const availableAccounts = accounts.filter(
    (account) => account.status === "SYNCED" && account.balance !== null,
  );
  const missingAccounts = accounts.filter(
    (account) => account.status !== "SYNCED" || account.balance === null,
  );

  const status: DailyCashSnapshotStatus =
    availableAccounts.length === 0
      ? "FAILED"
      : missingAccounts.length > 0
        ? "PARTIAL"
        : "COMPLETE";

  return {
    status,
    availableAccounts,
    missingAccounts,
  };
}

export function buildDailyCashSnapshot(
  channelList: Channel[],
  balances: AccountBalanceRecord[],
  targetDate: string,
  capturedAt = new Date().toISOString(),
): DailyCashSnapshot {
  const includedAccounts = buildIncludedAccounts(channelList, balances);
  const { status, availableAccounts, missingAccounts } = getBalanceHealth(includedAccounts);
  const accountBreakdown: DailyCashSnapshotAccount[] = availableAccounts.map((account) => ({
    channelId: account.channelId,
    channelName: account.channelName,
    provider: account.provider,
    accountName: account.accountName,
    balance: account.balance ?? 0,
    syncedAt: account.syncedAt,
  }));
  const totalBalance = availableAccounts.reduce(
    (sum, account) => sum + (account.balance ?? 0),
    0,
  );

  return {
    date: targetDate,
    accounts: availableAccounts.map((account) => ({
      account_id: mapChannelIdToAccountId(account.channelId),
      balance: account.balance ?? 0,
    })),
    total_balance: totalBalance,
    closingBalance: totalBalance,
    currency: "IDR",
    capturedAt,
    sourceCount: availableAccounts.length,
    status,
    metadata: {
      includedChannelIds: includedAccounts.map((account) => account.channelId),
      missingChannelIds: missingAccounts.map((account) => account.channelId),
      availableChannelIds: availableAccounts.map((account) => account.channelId),
      accountBreakdown,
    },
  };
}

export function upsertDailyCashSnapshot(
  snapshots: DailyCashSnapshot[],
  nextSnapshot: DailyCashSnapshot,
) {
  const remaining = snapshots.filter((snapshot) => snapshot.date !== nextSnapshot.date);
  return [...remaining, nextSnapshot].sort((left, right) =>
    right.date.localeCompare(left.date),
  );
}

export function buildBalanceSummary(
  channelList: Channel[],
  balances: AccountBalanceRecord[],
  snapshots: DailyCashSnapshot[],
  now: Date = new Date(),
): BalanceSummary {
  const includedAccounts = buildIncludedAccounts(channelList, balances);
  const { status, availableAccounts } = getBalanceHealth(includedAccounts);
  const currentDate = getLocalDateString(now);
  const lastClosingSnapshot =
    [...snapshots]
      .filter((snapshot) => snapshot.date < currentDate)
      .sort((left, right) => right.date.localeCompare(left.date))[0] ?? null;
  const liveBalance = availableAccounts.reduce(
    (sum, account) => sum + (account.balance ?? 0),
    0,
  );
  const deltaAmount = lastClosingSnapshot
    ? liveBalance - lastClosingSnapshot.closingBalance
    : null;
  const deltaPercent =
    lastClosingSnapshot && lastClosingSnapshot.closingBalance !== 0
      ? (deltaAmount! / lastClosingSnapshot.closingBalance) * 100
      : null;

  return {
    liveBalance,
    liveBalanceUpdatedAt: getLatestTimestamp(
      includedAccounts.map((account) => account.syncedAt),
    ),
    liveStatus: status,
    lastClosingBalance: lastClosingSnapshot?.closingBalance ?? null,
    lastClosingDate: lastClosingSnapshot?.date ?? null,
    deltaAmount,
    deltaPercent,
    snapshotStatus: lastClosingSnapshot?.status ?? "NO_HISTORY",
    includedAccounts,
    lastClosingSnapshot,
  };
}

export async function getBalanceSummary(now: Date = new Date()) {
  const [balances, snapshots] = await Promise.all([
    listAccountBalances(),
    listDailyCashSnapshots(),
  ]);

  return buildBalanceSummary(channels, balances, snapshots, now);
}

export async function runDailyClosingSnapshot(targetDate?: string) {
  const [balances, snapshots] = await Promise.all([
    listAccountBalances(),
    listDailyCashSnapshots(),
  ]);
  const resolvedDate = targetDate ?? getPreviousClosingDate();
  const snapshot = buildDailyCashSnapshot(channels, balances, resolvedDate);
  const nextSnapshots = upsertDailyCashSnapshot(snapshots, snapshot);

  await saveDailyCashSnapshots(nextSnapshots);

  return {
    snapshot,
    snapshots: nextSnapshots,
  };
}
