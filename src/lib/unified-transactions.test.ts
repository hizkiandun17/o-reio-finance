import { describe, expect, it } from "vitest";

import type { ManualEntryInput, UnifiedTransaction } from "./types";
import {
  adaptUnifiedTransactionToLegacyTransaction,
  buildReconciliationSummary,
  canAffectBalance,
  canAffectProfit,
  createManualUnifiedTransaction,
  getDailyFinancialSummary,
  getExpenseSummary,
  getLiveBalanceByAccount,
  getSalesSummary,
  getTodayMovementBreakdown,
  getTransactionsByAccount,
  isExpenseTransaction,
  isIncomeTransaction,
  isTransferTransaction,
  isUnifiedTransaction,
  validateUnifiedTransaction,
} from "./unified-transactions";

const baseIncomeTransaction: UnifiedTransaction = {
  id: "utx_income_1",
  type: "income",
  account_id: "acc_bca_main",
  channel: "shopify",
  status: "verified",
  origin: "manual",
  amount: 1250000,
  original_currency: "IDR",
  exchange_rate: 1,
  base_amount: 1250000,
  transaction_date: "2026-04-07T10:00:00+08:00",
  description: "Shopify payout settlement",
  proof: null,
  logged_by: "usr_finance",
};

const baseManualInput: ManualEntryInput = {
  description: "Pingpong Shopify payout batch 04/07",
  amount: 5850000,
  originalCurrency: "IDR",
  exchangeRate: 1,
  transactionDate: "2026-04-07",
  kind: "INCOME",
  categoryId: "cat_income_shopify",
  channelId: "chn_pingpong",
  proof: null,
};

describe("unified transaction helpers", () => {
  it("accepts a valid income transaction", () => {
    expect(validateUnifiedTransaction(baseIncomeTransaction)).toEqual([]);
    expect(isUnifiedTransaction(baseIncomeTransaction)).toBe(true);
    expect(isIncomeTransaction(baseIncomeTransaction)).toBe(true);
    expect(canAffectProfit(baseIncomeTransaction)).toBe(true);
  });

  it("accepts a valid expense transaction", () => {
    const expenseTransaction: UnifiedTransaction = {
      ...baseIncomeTransaction,
      id: "utx_expense_1",
      type: "expense",
      channel: null,
      category_group: "growth",
      category_name: "Online Ads",
      description: "Meta ads billing",
    };

    expect(validateUnifiedTransaction(expenseTransaction)).toEqual([]);
    expect(isExpenseTransaction(expenseTransaction)).toBe(true);
    expect(canAffectProfit(expenseTransaction)).toBe(true);
  });

  it("accepts a valid transfer transaction", () => {
    const transferTransaction: UnifiedTransaction = {
      ...baseIncomeTransaction,
      id: "utx_transfer_1",
      type: "transfer",
      target_account_id: "acc_wise_wallet",
      channel: null,
      category_group: null,
      category_name: null,
      description: "Move cash from BCA to Wise",
    };

    expect(validateUnifiedTransaction(transferTransaction)).toEqual([]);
    expect(isTransferTransaction(transferTransaction)).toBe(true);
    expect(canAffectProfit(transferTransaction)).toBe(false);
  });

  it("rejects a transfer without target_account_id", () => {
    const errors = validateUnifiedTransaction({
      ...baseIncomeTransaction,
      type: "transfer",
    });

    expect(errors).toContain("target_account_id is required for transfers.");
  });

  it("rejects a transfer using the same source and target account", () => {
    const errors = validateUnifiedTransaction({
      ...baseIncomeTransaction,
      type: "transfer",
      target_account_id: "acc_bca_main",
    });

    expect(errors).toContain(
      "transfer account_id and target_account_id must be different.",
    );
  });

  it("rejects an expense without category_group", () => {
    const errors = validateUnifiedTransaction({
      ...baseIncomeTransaction,
      type: "expense",
      category_name: "Office Rent",
    });

    expect(errors).toContain("category_group is required for expenses.");
  });

  it("rejects an expense without category_name", () => {
    const errors = validateUnifiedTransaction({
      ...baseIncomeTransaction,
      type: "expense",
      category_group: "overhead",
    });

    expect(errors).toContain("category_name is required for expenses.");
  });

  it("reports balance impact for matching accounts and transfers", () => {
    const transferTransaction: UnifiedTransaction = {
      ...baseIncomeTransaction,
      id: "utx_transfer_2",
      type: "transfer",
      target_account_id: "acc_aspire_wallet",
      channel: null,
      category_group: null,
      category_name: null,
      description: "Move cash to Aspire",
    };

    expect(canAffectBalance(baseIncomeTransaction, "acc_bca_main")).toBe(true);
    expect(canAffectBalance(baseIncomeTransaction, "acc_wise_wallet")).toBe(false);
    expect(canAffectBalance(transferTransaction, "acc_bca_main")).toBe(true);
    expect(canAffectBalance(transferTransaction, "acc_aspire_wallet")).toBe(true);
  });

  it("rejects income using transfer-only target_account_id", () => {
    const errors = validateUnifiedTransaction({
      ...baseIncomeTransaction,
      target_account_id: "acc_wise_wallet",
    });

    expect(errors).toContain("target_account_id is only allowed for transfers.");
  });

  it("creates a valid manual income unified transaction", () => {
    const transaction = createManualUnifiedTransaction(baseManualInput, {
      id: "txn_manual_income",
      accountId: "chn_pingpong",
      channel: "chn_pingpong",
      baseAmount: 5850000,
      transactionDateTime: "2026-04-07T09:00:00+08:00",
      loggedBy: "usr_finance",
    });

    expect(transaction.type).toBe("income");
    expect(transaction.origin).toBe("manual");
    expect(transaction.status).toBe("pending");
    expect(transaction.category_group).toBeNull();
    expect(transaction.category_name).toBeNull();
    expect(validateUnifiedTransaction(transaction)).toEqual([]);
  });

  it("creates a valid manual expense unified transaction", () => {
    const transaction = createManualUnifiedTransaction(
      {
        ...baseManualInput,
        kind: "EXPENSE",
        categoryId: "cat_growth_promote_online_ads",
        description: "Meta ads billing cycle",
      },
      {
        id: "txn_manual_expense",
        accountId: "chn_bca",
        channel: "chn_bca",
        categoryGroup: "growth",
        categoryName: "Online Ads",
        baseAmount: 22400000,
        transactionDateTime: "2026-04-07T09:00:00+08:00",
        loggedBy: "usr_finance",
      },
    );

    expect(transaction.type).toBe("expense");
    expect(transaction.category_group).toBe("growth");
    expect(transaction.category_name).toBe("Online Ads");
    expect(validateUnifiedTransaction(transaction)).toEqual([]);
  });

  it("adapts a unified manual transaction back to the legacy transaction shape", () => {
    const transaction = createManualUnifiedTransaction(
      {
        ...baseManualInput,
        kind: "EXPENSE",
        categoryId: "cat_overhead_office_rent",
        channelId: "chn_bca",
        description: "HQ rent transfer",
        proof: {
          name: "rent-proof.pdf",
          mimeType: "application/pdf",
          dataUrl: "data:application/pdf;base64,ZmFrZQ==",
          size: 1024,
        },
      },
      {
        id: "txn_manual_legacy",
        accountId: "chn_bca",
        channel: "chn_bca",
        categoryGroup: "overhead",
        categoryName: "Office Rent",
        baseAmount: 7900000,
        transactionDateTime: "2026-04-07T09:00:00+08:00",
        loggedBy: "usr_finance",
      },
    );

    const legacyTransaction = adaptUnifiedTransactionToLegacyTransaction(transaction, {
      categoryId: "cat_overhead_office_rent",
    });

    expect(legacyTransaction.kind).toBe("EXPENSE");
    expect(legacyTransaction.entryType).toBe("MANUAL");
    expect(legacyTransaction.verificationStatus).toBe("PENDING");
    expect(legacyTransaction.channelId).toBe("chn_bca");
    expect(legacyTransaction.categoryId).toBe("cat_overhead_office_rent");
    expect(legacyTransaction.proof?.name).toBe("rent-proof.pdf");
  });

  it("calculates live balance for an account using income, expense, and transfer flows", () => {
    const transactions: UnifiedTransaction[] = [
      {
        ...baseIncomeTransaction,
        id: "utx_balance_income",
        type: "income",
        account_id: "bca_pt",
        base_amount: 1000000,
      },
      {
        ...baseIncomeTransaction,
        id: "utx_balance_expense",
        type: "expense",
        account_id: "bca_pt",
        base_amount: 250000,
        category_group: "overhead",
        category_name: "Office Rent",
      },
      {
        ...baseIncomeTransaction,
        id: "utx_balance_transfer_out",
        type: "transfer",
        account_id: "bca_pt",
        target_account_id: "wise",
        base_amount: 150000,
        channel: null,
        category_group: null,
        category_name: null,
      },
      {
        ...baseIncomeTransaction,
        id: "utx_balance_transfer_in",
        type: "transfer",
        account_id: "pingpong",
        target_account_id: "bca_pt",
        base_amount: 200000,
        channel: null,
        category_group: null,
        category_name: null,
      },
      {
        ...baseIncomeTransaction,
        id: "utx_other_account",
        type: "income",
        account_id: "aspire_sgd",
        base_amount: 999999,
      },
    ];

    expect(getLiveBalanceByAccount(transactions, "bca_pt")).toBe(800000);
  });

  it("returns zero when no transactions relate to the account", () => {
    expect(getLiveBalanceByAccount([baseIncomeTransaction], "settlement_holding")).toBe(0);
  });

  it("builds reconciliation totals from unified transactions", () => {
    const transactions: UnifiedTransaction[] = [
      {
        ...baseIncomeTransaction,
        id: "utx_recon_verified_income",
        type: "income",
        status: "verified",
        base_amount: 1000000,
      },
      {
        ...baseIncomeTransaction,
        id: "utx_recon_pending_expense",
        type: "expense",
        status: "pending",
        base_amount: 250000,
        category_group: "growth",
        category_name: "Online Ads",
      },
      {
        ...baseIncomeTransaction,
        id: "utx_recon_verified_transfer",
        type: "transfer",
        status: "verified",
        base_amount: 500000,
        target_account_id: "wise",
        channel: null,
        category_group: null,
        category_name: null,
      },
    ];

    expect(buildReconciliationSummary(transactions)).toEqual({
      total: 1750000,
      verified: 1500000,
      pending: 250000,
      pendingCount: 1,
      completionRate: 1500000 / 1750000,
    });
  });

  it("returns a full completion rate when there is no reconciled value", () => {
    expect(buildReconciliationSummary([])).toEqual({
      total: 0,
      verified: 0,
      pending: 0,
      pendingCount: 0,
      completionRate: 1,
    });
  });

  it("builds a sales summary grouped by channel", () => {
    const transactions: UnifiedTransaction[] = [
      {
        ...baseIncomeTransaction,
        id: "utx_sales_1",
        channel: "shopify",
        base_amount: 1000000,
      },
      {
        ...baseIncomeTransaction,
        id: "utx_sales_2",
        channel: "shopify",
        base_amount: 500000,
      },
      {
        ...baseIncomeTransaction,
        id: "utx_sales_3",
        channel: "wholesale",
        base_amount: 750000,
      },
      {
        ...baseIncomeTransaction,
        id: "utx_sales_4",
        type: "expense",
        channel: "shopify",
        base_amount: 250000,
        category_group: "growth",
        category_name: "Online Ads",
      },
    ];

    expect(getSalesSummary(transactions)).toEqual({
      by_channel: [
        { channel: "shopify", total: 1500000 },
        { channel: "wholesale", total: 750000 },
      ],
      total: 2250000,
    });
  });

  it("builds an expense summary grouped by account", () => {
    const transactions: UnifiedTransaction[] = [
      {
        ...baseIncomeTransaction,
        id: "utx_expense_summary_1",
        type: "expense",
        account_id: "bca_pt",
        base_amount: 400000,
        category_group: "cost",
        category_name: "Production Material",
      },
      {
        ...baseIncomeTransaction,
        id: "utx_expense_summary_2",
        type: "expense",
        account_id: "bca_pt",
        base_amount: 100000,
        category_group: "overhead",
        category_name: "Office Rent",
      },
      {
        ...baseIncomeTransaction,
        id: "utx_expense_summary_3",
        type: "expense",
        account_id: "wise",
        base_amount: 250000,
        category_group: "growth",
        category_name: "Online Ads",
      },
      {
        ...baseIncomeTransaction,
        id: "utx_expense_summary_4",
        type: "income",
        account_id: "wise",
        base_amount: 900000,
      },
    ];

    expect(getExpenseSummary(transactions)).toEqual({
      by_account: [
        { account_id: "bca_pt", total: 500000 },
        { account_id: "wise", total: 250000 },
      ],
      total: 750000,
    });
  });

  it("builds a daily financial summary for a specific date", () => {
    const transactions: UnifiedTransaction[] = [
      {
        ...baseIncomeTransaction,
        id: "utx_daily_1",
        type: "income",
        transaction_date: "2026-04-09T08:00:00+08:00",
        base_amount: 1000000,
      },
      {
        ...baseIncomeTransaction,
        id: "utx_daily_2",
        type: "expense",
        transaction_date: "2026-04-09T09:00:00+08:00",
        base_amount: 250000,
        category_group: "overhead",
        category_name: "Office Rent",
      },
      {
        ...baseIncomeTransaction,
        id: "utx_daily_3",
        type: "transfer",
        transaction_date: "2026-04-09T10:00:00+08:00",
        base_amount: 500000,
        target_account_id: "wise",
        channel: null,
        category_group: null,
        category_name: null,
      },
      {
        ...baseIncomeTransaction,
        id: "utx_daily_4",
        type: "income",
        transaction_date: "2026-04-08T12:00:00+08:00",
        base_amount: 750000,
      },
    ];

    expect(getDailyFinancialSummary(transactions, "2026-04-09")).toEqual({
      sales: 1000000,
      expense: 250000,
      net: 750000,
    });
  });

  it("breaks down today's balance movement by income, expense, and transfers", () => {
    const transactions: UnifiedTransaction[] = [
      {
        ...baseIncomeTransaction,
        id: "utx_movement_income",
        type: "income",
        transaction_date: "2026-04-09T08:00:00+08:00",
        base_amount: 1000000,
      },
      {
        ...baseIncomeTransaction,
        id: "utx_movement_expense",
        type: "expense",
        transaction_date: "2026-04-09T09:00:00+08:00",
        base_amount: 250000,
        category_group: "overhead",
        category_name: "Office Rent",
      },
      {
        ...baseIncomeTransaction,
        id: "utx_movement_transfer",
        type: "transfer",
        account_id: "wise",
        target_account_id: "bca_pt",
        channel: null,
        category_group: null,
        category_name: null,
        transaction_date: "2026-04-09T10:00:00+08:00",
        base_amount: 400000,
      },
      {
        ...baseIncomeTransaction,
        id: "utx_movement_other_date",
        type: "income",
        transaction_date: "2026-04-08T12:00:00+08:00",
        base_amount: 750000,
      },
    ];

    expect(getTodayMovementBreakdown(transactions, "2026-04-09")).toEqual({
      income: 1000000,
      expense: 250000,
      transfer_in: 400000,
      transfer_out: 400000,
      net: 750000,
    });
  });

  it("returns transactions related to an account sorted by newest first", () => {
    const transactions: UnifiedTransaction[] = [
      {
        ...baseIncomeTransaction,
        id: "utx_account_1",
        account_id: "bca_pt",
        transaction_date: "2026-04-09T08:00:00+08:00",
      },
      {
        ...baseIncomeTransaction,
        id: "utx_account_2",
        type: "transfer",
        account_id: "wise",
        target_account_id: "bca_pt",
        channel: null,
        category_group: null,
        category_name: null,
        transaction_date: "2026-04-09T10:00:00+08:00",
      },
      {
        ...baseIncomeTransaction,
        id: "utx_account_3",
        account_id: "pingpong",
        transaction_date: "2026-04-09T12:00:00+08:00",
      },
      {
        ...baseIncomeTransaction,
        id: "utx_account_4",
        type: "expense",
        account_id: "bca_pt",
        category_group: "overhead",
        category_name: "Office Rent",
        transaction_date: "2026-04-09T09:00:00+08:00",
      },
    ];

    expect(getTransactionsByAccount(transactions, "bca_pt").map((item) => item.id)).toEqual([
      "utx_account_2",
      "utx_account_4",
      "utx_account_1",
    ]);
  });
});
