import { describe, expect, it } from "vitest";

import { channels } from "@/lib/mock-data";
import type { AccountBalanceRecord, DailyCashSnapshot } from "@/lib/types";
import {
  buildBalanceSummary,
  buildDailyCashSnapshot,
  getPreviousClosingDate,
  upsertDailyCashSnapshot,
} from "@/server/balance-service";

const baseBalances: AccountBalanceRecord[] = [
  {
    channelId: "chn_bca",
    provider: "BCA API",
    currency: "IDR",
    balance: 124600000,
    syncedAt: "2026-04-02T13:45:00+07:00",
    status: "SYNCED",
    accountName: "BCA Main Operating",
  },
  {
    channelId: "chn_wise",
    provider: "Wise",
    currency: "IDR",
    balance: 47850000,
    syncedAt: "2026-04-02T13:39:00+07:00",
    status: "SYNCED",
    accountName: "Wise Wholesale Settlement",
  },
  {
    channelId: "chn_pingpong",
    provider: "Pingpong",
    currency: "IDR",
    balance: 31250000,
    syncedAt: "2026-04-02T13:42:00+07:00",
    status: "SYNCED",
    accountName: "Pingpong Shopify Wallet",
  },
  {
    channelId: "chn_aspire",
    provider: "Aspire",
    currency: "IDR",
    balance: 19900000,
    syncedAt: "2026-04-02T13:33:00+07:00",
    status: "SYNCED",
    accountName: "Aspire Ads Wallet",
  },
];

const baseSnapshots: DailyCashSnapshot[] = [
  {
    date: "2026-04-01",
    accounts: [
      { account_id: "bca_pt", balance: 121000000 },
      { account_id: "wise", balance: 46800000 },
      { account_id: "pingpong", balance: 30700000 },
      { account_id: "aspire_sgd", balance: 19800000 },
    ],
    total_balance: 218300000,
    closingBalance: 218300000,
    currency: "IDR",
    capturedAt: "2026-04-02T00:05:00+07:00",
    sourceCount: 4,
    status: "COMPLETE",
    metadata: {
      includedChannelIds: ["chn_bca", "chn_wise", "chn_pingpong", "chn_aspire"],
      missingChannelIds: [],
      availableChannelIds: ["chn_bca", "chn_wise", "chn_pingpong", "chn_aspire"],
    },
  },
];

describe("daily closing balance service", () => {
  it("builds a complete daily snapshot from synced cash accounts", () => {
    expect(buildDailyCashSnapshot(channels, baseBalances, "2026-04-02")).toEqual({
      date: "2026-04-02",
      accounts: [
        {
          account_id: "bca_pt",
          balance: 124600000,
        },
        {
          account_id: "wise",
          balance: 47850000,
        },
        {
          account_id: "pingpong",
          balance: 31250000,
        },
        {
          account_id: "aspire_sgd",
          balance: 19900000,
        },
      ],
      total_balance: 223600000,
      closingBalance: 223600000,
      currency: "IDR",
      capturedAt: expect.any(String),
      sourceCount: 4,
      status: "COMPLETE",
      metadata: {
        includedChannelIds: ["chn_bca", "chn_wise", "chn_pingpong", "chn_aspire"],
        missingChannelIds: [],
        availableChannelIds: ["chn_bca", "chn_wise", "chn_pingpong", "chn_aspire"],
        accountBreakdown: [
          {
            channelId: "chn_bca",
            channelName: "BCA",
            provider: "BCA API",
            accountName: "BCA Main Operating",
            balance: 124600000,
            syncedAt: "2026-04-02T13:45:00+07:00",
          },
          {
            channelId: "chn_wise",
            channelName: "Wise",
            provider: "Wise",
            accountName: "Wise Wholesale Settlement",
            balance: 47850000,
            syncedAt: "2026-04-02T13:39:00+07:00",
          },
          {
            channelId: "chn_pingpong",
            channelName: "Pingpong",
            provider: "Pingpong",
            accountName: "Pingpong Shopify Wallet",
            balance: 31250000,
            syncedAt: "2026-04-02T13:42:00+07:00",
          },
          {
            channelId: "chn_aspire",
            channelName: "Aspire",
            provider: "Aspire",
            accountName: "Aspire Ads Wallet",
            balance: 19900000,
            syncedAt: "2026-04-02T13:33:00+07:00",
          },
        ],
      },
    });
  });

  it("marks the snapshot partial when one cash account is unavailable", () => {
    const balances = baseBalances.map((balance) =>
      balance.channelId === "chn_aspire"
        ? { ...balance, balance: null, status: "UNAVAILABLE" as const }
        : balance,
    );

    expect(buildDailyCashSnapshot(channels, balances, "2026-04-02")).toMatchObject({
      closingBalance: 203700000,
      sourceCount: 3,
      status: "PARTIAL",
      metadata: {
        missingChannelIds: ["chn_aspire"],
      },
    });
  });

  it("upserts a snapshot idempotently by date", () => {
    const initial = buildDailyCashSnapshot(channels, baseBalances, "2026-04-02");
    const rerun = { ...initial, closingBalance: 224000000 };
    const snapshots = upsertDailyCashSnapshot([baseSnapshots[0], initial], rerun);

    expect(snapshots.filter((snapshot) => snapshot.date === "2026-04-02")).toHaveLength(1);
    expect(snapshots[0]?.closingBalance).toBe(224000000);
  });

  it("builds the dashboard balance summary against the most recent prior close", () => {
    const summary = buildBalanceSummary(
      channels,
      baseBalances,
      baseSnapshots,
      new Date("2026-04-02T15:00:00+07:00"),
    );

    expect(summary.liveBalance).toBe(223600000);
    expect(summary.lastClosingBalance).toBe(218300000);
    expect(summary.lastClosingDate).toBe("2026-04-01");
    expect(summary.deltaAmount).toBe(5300000);
    expect(summary.deltaPercent).toBeCloseTo(2.428, 2);
    expect(summary.snapshotStatus).toBe("COMPLETE");
    expect(summary.lastClosingSnapshot?.date).toBe("2026-04-01");
  });

  it("resolves the cron target date in Asia/Jakarta", () => {
    expect(
      getPreviousClosingDate(new Date("2026-04-02T00:10:00+07:00")),
    ).toBe("2026-04-01");
  });
});
