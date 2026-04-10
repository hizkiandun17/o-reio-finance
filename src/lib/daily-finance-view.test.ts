import { describe, expect, it } from "vitest";

import type { Account, DailyCashSnapshot, UnifiedTransaction } from "@/lib/types";

import { buildDailyFinanceView } from "./daily-finance-view";

describe("daily finance view helpers", () => {
  it("builds the combined balance, performance, and breakdown view", () => {
    const accounts: Account[] = [
      {
        id: "bca_pt",
        name: "BCA PT",
        currency: "IDR",
        source: "auto",
        type: "bank",
      },
      {
        id: "wise",
        name: "Wise",
        currency: "USD",
        source: "manual",
        type: "wallet",
      },
      {
        id: "payout_holding",
        name: "Payout Holding",
        currency: "IDR",
        source: "manual",
        type: "holding",
      },
    ];

    const transactions: UnifiedTransaction[] = [
      {
        id: "utx_dfv_1",
        type: "income",
        account_id: "bca_pt",
        channel: "shopify",
        category_group: null,
        category_name: null,
        status: "verified",
        origin: "manual",
        amount: 1000000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 1000000,
        transaction_date: "2026-04-09T08:00:00+08:00",
        description: "Shopify payout",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_dfv_2",
        type: "expense",
        account_id: "bca_pt",
        channel: null,
        category_group: "overhead",
        category_name: "Office Rent",
        status: "pending",
        origin: "manual",
        amount: 250000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 250000,
        transaction_date: "2026-04-09T09:00:00+08:00",
        description: "Office rent",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_dfv_3",
        type: "income",
        account_id: "wise",
        channel: "wholesale",
        category_group: null,
        category_name: null,
        status: "verified",
        origin: "manual",
        amount: 500000,
        original_currency: "USD",
        exchange_rate: 16000,
        base_amount: 500000,
        transaction_date: "2026-04-09T10:00:00+08:00",
        description: "Wholesale payout",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_dfv_4",
        type: "income",
        account_id: "bca_pt",
        channel: "shopify",
        category_group: null,
        category_name: null,
        status: "verified",
        origin: "manual",
        amount: 300000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 300000,
        transaction_date: "2026-04-08T10:00:00+08:00",
        description: "Prior-day payout",
        proof: null,
        logged_by: "usr_finance",
      },
    ];

    const snapshot: DailyCashSnapshot = {
      date: "2026-04-08",
      accounts: [
        { account_id: "bca_pt", balance: 1200000 },
        { account_id: "wise", balance: 200000 },
      ],
      total_balance: 1400000,
      closingBalance: 1400000,
      currency: "IDR",
      capturedAt: "2026-04-09T00:05:00+07:00",
      sourceCount: 2,
      status: "COMPLETE",
      metadata: {
        includedChannelIds: ["chn_bca", "chn_wise"],
        missingChannelIds: [],
        availableChannelIds: ["chn_bca", "chn_wise"],
        accountBreakdown: [],
      },
    };

    expect(buildDailyFinanceView(accounts, transactions, snapshot, "2026-04-09")).toEqual({
      balance: {
        liveTotal: 1550000,
        snapshotTotal: 1400000,
        difference: 150000,
        percentage: 150000 / 1400000,
        breakdown: {
          local: {
            accounts: [{ id: "bca_pt", name: "BCA PT", balance: 1050000 }],
            total: 1050000,
          },
          foreign: {
            accounts: [{ id: "wise", name: "Wise", balance: 500000 }],
            total: 500000,
          },
          holding: {
            accounts: [{ id: "payout_holding", name: "Payout Holding", balance: 0 }],
            total: 0,
          },
        },
      },
      performance: {
        sales: 1500000,
        expense: 250000,
        net: 1250000,
        growthExpense: 0,
      },
      breakdowns: {
        sales: {
          by_channel: [
            { channel: "shopify", total: 1000000 },
            { channel: "wholesale", total: 500000 },
          ],
          total: 1500000,
        },
        expense: {
          by_account: [{ account_id: "bca_pt", total: 250000 }],
          total: 250000,
        },
      },
      reconciliation: {
        total: 1750000,
        verified: 1500000,
        pending: 250000,
        pendingCount: 1,
        completionRate: 1500000 / 1750000,
      },
    });
  });
});
