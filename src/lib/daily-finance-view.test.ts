import { describe, expect, it } from "vitest";

import type { Account, DailyCashSnapshot, UnifiedTransaction } from "@/lib/types";

import { buildDailyFinanceView } from "./daily-finance-view";

describe("daily finance view helpers", () => {
  it("builds the combined balance and verified-only performance view", () => {
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

    expect(buildDailyFinanceView(accounts, transactions, snapshot, "2026-04-09")).toMatchObject({
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
        expense: 0,
        net: 1500000,
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
          by_account: [],
          total: 0,
        },
      },
      expenseBreakdown: {
        total: 0,
      },
      trend: [
        {
          date: "2026-04-09",
          label: "09 Apr",
          revenue: 1500000,
          expense: 0,
          net: 1500000,
          growthExpense: 0,
          adsRatio: 0,
        },
      ],
      reconciliation: {
        total: 1500000,
        verified: 1500000,
        pending: 0,
        pendingCount: 0,
        completionRate: 1,
      },
    });
  });

  it("aggregates performance consistently across a selected date range", () => {
    const accounts: Account[] = [
      {
        id: "bca_pt",
        name: "BCA PT",
        currency: "IDR",
        source: "auto",
        type: "bank",
      },
    ];

    const transactions: UnifiedTransaction[] = [
      {
        id: "utx_dfv_range_1",
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
        transaction_date: "2026-04-08T09:00:00+08:00",
        description: "Shopify payout",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_dfv_range_2",
        type: "expense",
        account_id: "bca_pt",
        channel: null,
        category_group: "growth",
        category_name: "Ads",
        status: "verified",
        origin: "manual",
        amount: 200000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 200000,
        transaction_date: "2026-04-09T10:00:00+08:00",
        description: "Ads spend",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_dfv_range_3",
        type: "expense",
        account_id: "bca_pt",
        channel: null,
        category_group: "overhead",
        category_name: "Rent",
        status: "verified",
        origin: "manual",
        amount: 150000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 150000,
        transaction_date: "2026-04-10T10:00:00+08:00",
        description: "Rent",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_dfv_range_4",
        type: "income",
        account_id: "bca_pt",
        channel: "wholesale",
        category_group: null,
        category_name: null,
        status: "verified",
        origin: "manual",
        amount: 500000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 500000,
        transaction_date: "2026-04-11T09:00:00+08:00",
        description: "Outside selected range",
        proof: null,
        logged_by: "usr_finance",
      },
    ];

    const snapshot: DailyCashSnapshot = {
      date: "2026-04-09",
      accounts: [{ account_id: "bca_pt", balance: 650000 }],
      total_balance: 650000,
      closingBalance: 650000,
      currency: "IDR",
      capturedAt: "2026-04-10T00:05:00+07:00",
      sourceCount: 1,
      status: "COMPLETE",
      metadata: {
        includedChannelIds: ["chn_bca"],
        missingChannelIds: [],
        availableChannelIds: ["chn_bca"],
        accountBreakdown: [],
      },
    };

    const view = buildDailyFinanceView(accounts, transactions, snapshot, {
      startDate: "2026-04-08",
      endDate: "2026-04-10",
    });

    expect(view.performance).toEqual({
      sales: 1000000,
      expense: 350000,
      net: 650000,
      growthExpense: 200000,
    });
    expect(view.performance.net).toBe(
      view.performance.sales - view.performance.expense,
    );
    expect(view.breakdowns.sales).toEqual({
      by_channel: [{ channel: "shopify", total: 1000000 }],
      total: 1000000,
    });
    expect(view.breakdowns.expense).toEqual({
      by_account: [{ account_id: "bca_pt", total: 350000 }],
      total: 350000,
    });
    expect(view.expenseBreakdown.total).toBe(350000);
    expect(view.trend).toEqual([
      {
        date: "2026-04-08",
        label: "08 Apr",
        revenue: 1000000,
        expense: 0,
        net: 1000000,
        growthExpense: 0,
        adsRatio: 0,
      },
      {
        date: "2026-04-09",
        label: "09 Apr",
        revenue: 0,
        expense: 200000,
        net: -200000,
        growthExpense: 200000,
        adsRatio: 0,
      },
      {
        date: "2026-04-10",
        label: "10 Apr",
        revenue: 0,
        expense: 150000,
        net: -150000,
        growthExpense: 0,
        adsRatio: 0,
      },
    ]);
    expect(view.comparison).toEqual({
      selection: {
        startDate: "2026-04-05",
        endDate: "2026-04-07",
      },
      adsRatio: {
        current: 0.2,
        previous: 0,
        deltaPercent: null,
        direction: "flat",
        trend: "neutral",
        availability: "no_baseline",
      },
      revenue: {
        current: 1000000,
        previous: 0,
        deltaPercent: null,
        direction: "flat",
        trend: "neutral",
        availability: "no_baseline",
      },
      net: {
        current: 650000,
        previous: 0,
        deltaPercent: null,
        direction: "flat",
        trend: "neutral",
        availability: "no_baseline",
      },
    });
  });

  it("marks ads ratio as not comparable when previous revenue is zero", () => {
    const accounts: Account[] = [
      {
        id: "bca_pt",
        name: "BCA PT",
        currency: "IDR",
        source: "auto",
        type: "bank",
      },
    ];

    const transactions: UnifiedTransaction[] = [
      {
        id: "utx_dfv_ads_current_revenue",
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
        transaction_date: "2026-04-10T09:00:00+08:00",
        description: "Shopify payout",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_dfv_ads_current_growth",
        type: "expense",
        account_id: "bca_pt",
        channel: null,
        category_group: "growth",
        category_name: "Ads",
        status: "verified",
        origin: "manual",
        amount: 200000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 200000,
        transaction_date: "2026-04-10T12:00:00+08:00",
        description: "Ads spend",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_dfv_ads_previous_expense",
        type: "expense",
        account_id: "bca_pt",
        channel: null,
        category_group: "overhead",
        category_name: "Rent",
        status: "verified",
        origin: "manual",
        amount: 100000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 100000,
        transaction_date: "2026-04-09T10:00:00+08:00",
        description: "Rent",
        proof: null,
        logged_by: "usr_finance",
      },
    ];

    const snapshot: DailyCashSnapshot = {
      date: "2026-04-09",
      accounts: [],
      total_balance: 0,
      closingBalance: 0,
      currency: "IDR",
      capturedAt: "2026-04-10T00:05:00+07:00",
      sourceCount: 0,
      status: "COMPLETE",
      metadata: {
        includedChannelIds: [],
        missingChannelIds: [],
        availableChannelIds: [],
        accountBreakdown: [],
      },
    };

    const view = buildDailyFinanceView(accounts, transactions, snapshot, {
      startDate: "2026-04-10",
      endDate: "2026-04-10",
    });

    expect(view.comparison.adsRatio).toMatchObject({
      availability: "not_comparable",
      direction: "flat",
      trend: "neutral",
    });
  });

  it("marks ads ratio as first recorded when previous period had revenue but no growth expense", () => {
    const accounts: Account[] = [
      {
        id: "bca_pt",
        name: "BCA PT",
        currency: "IDR",
        source: "auto",
        type: "bank",
      },
    ];

    const transactions: UnifiedTransaction[] = [
      {
        id: "utx_dfv_ads_first_current_revenue",
        type: "income",
        account_id: "bca_pt",
        channel: "shopify",
        category_group: null,
        category_name: null,
        status: "verified",
        origin: "manual",
        amount: 1200000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 1200000,
        transaction_date: "2026-04-10T09:00:00+08:00",
        description: "Shopify payout",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_dfv_ads_first_current_growth",
        type: "expense",
        account_id: "bca_pt",
        channel: null,
        category_group: "growth",
        category_name: "Ads",
        status: "verified",
        origin: "manual",
        amount: 240000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 240000,
        transaction_date: "2026-04-10T12:00:00+08:00",
        description: "Ads spend",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_dfv_ads_first_previous_revenue",
        type: "income",
        account_id: "bca_pt",
        channel: "shopify",
        category_group: null,
        category_name: null,
        status: "verified",
        origin: "manual",
        amount: 900000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 900000,
        transaction_date: "2026-04-09T09:00:00+08:00",
        description: "Prior Shopify payout",
        proof: null,
        logged_by: "usr_finance",
      },
    ];

    const snapshot: DailyCashSnapshot = {
      date: "2026-04-09",
      accounts: [],
      total_balance: 0,
      closingBalance: 0,
      currency: "IDR",
      capturedAt: "2026-04-10T00:05:00+07:00",
      sourceCount: 0,
      status: "COMPLETE",
      metadata: {
        includedChannelIds: [],
        missingChannelIds: [],
        availableChannelIds: [],
        accountBreakdown: [],
      },
    };

    const view = buildDailyFinanceView(accounts, transactions, snapshot, {
      startDate: "2026-04-10",
      endDate: "2026-04-10",
    });

    expect(view.comparison.adsRatio).toMatchObject({
      availability: "first_recorded",
      direction: "flat",
      trend: "neutral",
    });
  });

  it("uses business revenue channels instead of integration channels", () => {
    const accounts: Account[] = [
      {
        id: "bca_pt",
        name: "BCA PT",
        currency: "IDR",
        source: "auto",
        type: "bank",
      },
    ];

    const transactions: UnifiedTransaction[] = [
      {
        id: "utx_dfv_channel_1",
        type: "income",
        account_id: "wise",
        channel: "chn_pingpong",
        category_id: "cat_income_shopify",
        category_group: null,
        category_name: null,
        status: "verified",
        origin: "manual",
        amount: 1100000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 1100000,
        transaction_date: "2026-04-09T09:00:00+08:00",
        description: "PingPong Shopify settlement",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_dfv_channel_2",
        type: "income",
        account_id: "tiktok_settlement",
        channel: "chn_tiktok",
        category_id: "cat_income_tiktok",
        category_group: null,
        category_name: null,
        status: "verified",
        origin: "auto",
        amount: 700000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 700000,
        transaction_date: "2026-04-09T10:00:00+08:00",
        description: "TikTok Shop settlement",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_dfv_channel_3",
        type: "income",
        account_id: "wise",
        channel: "chn_offline",
        category_id: "cat_income_offline",
        category_group: null,
        category_name: null,
        status: "verified",
        origin: "manual",
        amount: 500000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 500000,
        transaction_date: "2026-04-09T11:00:00+08:00",
        description: "Offline closing",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_dfv_channel_4",
        type: "income",
        account_id: "wise",
        channel: "chn_wise",
        category_id: "cat_income_wholesale",
        category_group: null,
        category_name: null,
        status: "pending",
        origin: "manual",
        amount: 900000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 900000,
        transaction_date: "2026-04-09T12:00:00+08:00",
        description: "Wholesale pending receipt",
        proof: null,
        logged_by: "usr_finance",
      },
    ];

    const snapshot: DailyCashSnapshot = {
      date: "2026-04-08",
      accounts: [],
      total_balance: 0,
      closingBalance: 0,
      currency: "IDR",
      capturedAt: "2026-04-09T00:05:00+07:00",
      sourceCount: 0,
      status: "COMPLETE",
      metadata: {
        includedChannelIds: [],
        missingChannelIds: [],
        availableChannelIds: [],
        accountBreakdown: [],
      },
    };

    const view = buildDailyFinanceView(accounts, transactions, snapshot, "2026-04-09");

    expect(view.performance).toEqual({
      sales: 1800000,
      expense: 0,
      net: 1800000,
      growthExpense: 0,
    });
    expect(view.breakdowns.sales).toEqual({
      by_channel: [
        { channel: "shopify", total: 1100000 },
        { channel: "tiktok", total: 700000 },
      ],
      total: 1800000,
    });
  });

  it("includes verified expenses even when group must be inferred from category id", () => {
    const accounts: Account[] = [
      {
        id: "bca_pt",
        name: "BCA PT",
        currency: "IDR",
        source: "auto",
        type: "bank",
      },
    ];

    const transactions: UnifiedTransaction[] = [
      {
        id: "utx_dfv_expense_fallback_1",
        type: "income",
        account_id: "bca_pt",
        channel: "chn_pingpong",
        category_id: "cat_income_shopify",
        category_group: null,
        category_name: null,
        status: "verified",
        origin: "manual",
        amount: 1000000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 1000000,
        transaction_date: "2026-04-09T09:00:00+08:00",
        description: "Shopify payout",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_dfv_expense_fallback_2",
        type: "expense",
        account_id: "bca_pt",
        channel: "chn_bca",
        category_id: "cat_growth_promote_online_ads",
        category_group: null,
        category_name: "Promote-Online-ads",
        status: "verified",
        origin: "manual",
        amount: 250000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 250000,
        transaction_date: "2026-04-09T10:00:00+08:00",
        description: "Ads billing",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_dfv_expense_fallback_3",
        type: "expense",
        account_id: "bca_pt",
        channel: "chn_bca",
        category_id: "cat_overhead_office_rent",
        category_group: null,
        category_name: "Office-Rent",
        status: "verified",
        origin: "manual",
        amount: 150000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 150000,
        transaction_date: "2026-04-09T11:00:00+08:00",
        description: "Office rent",
        proof: null,
        logged_by: "usr_finance",
      },
    ];

    const snapshot: DailyCashSnapshot = {
      date: "2026-04-08",
      accounts: [],
      total_balance: 0,
      closingBalance: 0,
      currency: "IDR",
      capturedAt: "2026-04-09T00:05:00+07:00",
      sourceCount: 0,
      status: "COMPLETE",
      metadata: {
        includedChannelIds: [],
        missingChannelIds: [],
        availableChannelIds: [],
        accountBreakdown: [],
      },
    };

    const view = buildDailyFinanceView(accounts, transactions, snapshot, "2026-04-09");

    expect(view.performance).toEqual({
      sales: 1000000,
      expense: 400000,
      net: 600000,
      growthExpense: 250000,
    });
    expect(view.breakdowns.expense).toEqual({
      by_account: [{ account_id: "bca_pt", total: 400000 }],
      total: 400000,
    });
    expect(view.expenseBreakdown.total).toBe(400000);
    expect(view.trend).toEqual([
      {
        date: "2026-04-09",
        label: "09 Apr",
        revenue: 1000000,
        expense: 400000,
        net: 600000,
        growthExpense: 250000,
        adsRatio: 0.25,
      },
    ]);
  });
});
