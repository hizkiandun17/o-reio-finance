import { describe, expect, it } from "vitest";

import { buildSignals } from "./financial-signals";

describe("financial signal helpers", () => {
  it("builds warning and danger signals from the daily finance view", () => {
    const financeView = {
      balance: {
        liveTotal: 500000,
        snapshotTotal: 600000,
        difference: -100000,
        percentage: -100000 / 600000,
        breakdown: {
          local: { accounts: [], total: 300000 },
          foreign: { accounts: [], total: 200000 },
        },
      },
      performance: {
        sales: 1000000,
        expense: 1200000,
        net: -200000,
        growthExpense: 650000,
      },
      breakdowns: {
        sales: {
          by_channel: [{ channel: "shopify", total: 1000000 }],
          total: 1000000,
        },
        expense: {
          by_account: [{ account_id: "bca_pt", total: 1200000 }],
          total: 1200000,
        },
      },
      reconciliation: {
        total: 2200000,
        verified: 1800000,
        pending: 400000,
        pendingCount: 2,
        completionRate: 1800000 / 2200000,
      },
    };

    expect(buildSignals(financeView).signals).toEqual([
      {
        type: "danger",
        message: "Growth spend is above 60% of sales.",
      },
      {
        type: "danger",
        message: "Net is negative for the selected day.",
      },
      {
        type: "warning",
        message: "2 transactions are still pending reconciliation.",
      },
      {
        type: "warning",
        message: "Live balance is below a three-times expense buffer.",
      },
      {
        type: "danger",
        message: "Expenses are higher than sales.",
      },
    ]);
  });

  it("returns an info signal when no warnings or danger conditions are met", () => {
    const financeView = {
      balance: {
        liveTotal: 5000000,
        snapshotTotal: 4500000,
        difference: 500000,
        percentage: 500000 / 4500000,
        breakdown: {
          local: { accounts: [], total: 3000000 },
          foreign: { accounts: [], total: 2000000 },
        },
      },
      performance: {
        sales: 2000000,
        expense: 500000,
        net: 1500000,
        growthExpense: 300000,
      },
      breakdowns: {
        sales: {
          by_channel: [{ channel: "shopify", total: 2000000 }],
          total: 2000000,
        },
        expense: {
          by_account: [{ account_id: "bca_pt", total: 500000 }],
          total: 500000,
        },
      },
      reconciliation: {
        total: 2500000,
        verified: 2500000,
        pending: 0,
        pendingCount: 0,
        completionRate: 1,
      },
    };

    expect(buildSignals(financeView)).toEqual({
      signals: [
        {
          type: "info",
          message: "Daily finance signals are stable.",
        },
      ],
    });
  });
});
