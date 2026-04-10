import { describe, expect, it } from "vitest";

import type { DailyCashSnapshot, Transaction } from "@/lib/types";

import { buildDashboardPayload } from "./dashboard-payload";

describe("dashboard payload helpers", () => {
  it("builds live balance, snapshot balance, comparison, and reconciliation", () => {
    const transactions: Transaction[] = [
      {
        id: "txn_income_pingpong",
        amount: 1000000,
        originalCurrency: "IDR",
        exchangeRate: 1,
        baseAmount: 1000000,
        transactionDate: "2026-04-09T08:00:00+08:00",
        description: "Shopify payout",
        kind: "INCOME",
        entryType: "MANUAL",
        verificationStatus: "VERIFIED",
        categoryId: "cat_income_shopify",
        channelId: "pingpong",
        proof: null,
        loggedBy: "usr_finance",
      },
      {
        id: "txn_expense_bca",
        amount: 250000,
        originalCurrency: "IDR",
        exchangeRate: 1,
        baseAmount: 250000,
        transactionDate: "2026-04-09T09:00:00+08:00",
        description: "Office rent",
        kind: "EXPENSE",
        entryType: "MANUAL",
        verificationStatus: "PENDING",
        categoryId: "cat_overhead_office_rent",
        channelId: "bca_pt",
        proof: null,
        loggedBy: "usr_finance",
      },
    ];

    const snapshot: DailyCashSnapshot = {
      date: "2026-04-08",
      accounts: [
        { account_id: "pingpong", balance: 500000 },
        { account_id: "bca_pt", balance: 200000 },
      ],
      total_balance: 700000,
      closingBalance: 700000,
      currency: "IDR",
      capturedAt: "2026-04-09T00:05:00+07:00",
      sourceCount: 2,
      status: "COMPLETE",
      metadata: {
        includedChannelIds: ["chn_pingpong", "chn_bca"],
        missingChannelIds: [],
        availableChannelIds: ["chn_pingpong", "chn_bca"],
        accountBreakdown: [],
      },
    };

    expect(buildDashboardPayload(transactions, snapshot)).toEqual({
      liveBalance: 750000,
      snapshotBalance: 700000,
      difference: 50000,
      percentage: 50000 / 700000,
      reconciliation: {
        total: 1250000,
        verified: 1000000,
        pending: 250000,
        pendingCount: 1,
        completionRate: 1000000 / 1250000,
      },
    });
  });
});
