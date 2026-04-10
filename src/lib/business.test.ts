import { describe, expect, it } from "vitest";

import {
  buildCategoryMap,
  buildExpenseBreakdown,
  buildExpenseSubcategoryBreakdown,
  buildReconciliationSummary,
  calculateMetrics,
  getLandingPath,
  getTrafficLightStatus,
  groupExpenseCategories,
  groupExpenseSubcategories,
  mapTransactionCategory,
  normalizeTransaction,
  normalizeTransactions,
} from "./business";
import { categories, reconciliationLogs, transactions } from "./mock-data";

describe("business helpers", () => {
  it("maps ads ratio thresholds to the correct traffic light", () => {
    expect(getTrafficLightStatus(12)).toBe("GREEN");
    expect(getTrafficLightStatus(20)).toBe("YELLOW");
    expect(getTrafficLightStatus(28)).toBe("RED");
  });

  it("calculates monthly metrics from the April sample data", () => {
    const categoryMap = buildCategoryMap(categories);
    const aprilTransactions = transactions.filter((transaction) =>
      transaction.transactionDate.startsWith("2026-04-01"),
    );
    const metrics = calculateMetrics(aprilTransactions, categoryMap);

    expect(metrics.totalRevenue).toBe(133835000);
    expect(metrics.totalExpense).toBe(85350000);
    expect(metrics.net).toBe(48485000);
    expect(metrics.status).toBe("RED");
  });

  it("builds reconciliation completeness from transaction verification state", () => {
    const summary = buildReconciliationSummary(transactions, reconciliationLogs);

    expect(summary.pendingCount).toBe(2);
    expect(summary.latestStatus).toBe("DISCREPANCY");
    expect(summary.completeness).toBeGreaterThan(90);
  });

  it("maps expense subcategories back to their main category dynamically", () => {
    const categoryMap = buildCategoryMap(categories);

    expect(
      mapTransactionCategory("Promote-Online-ads", categoryMap),
    ).toEqual({
      mainCategory: "Growth",
      subCategory: "Promote-Online-ads",
    });

    expect(
      mapTransactionCategory("cat_cost_shipping_grab", categoryMap),
    ).toEqual({
      mainCategory: "Cost",
      subCategory: "Shipping-Grab",
    });
  });

  it("normalizes legacy income transactions into unified transactions", () => {
    const categoryMap = buildCategoryMap(categories);
    const normalized = normalizeTransaction(transactions[0], categoryMap);

    expect(normalized).toMatchObject({
      id: "txn_apr_shopify",
      type: "income",
      origin: "manual",
      status: "verified",
      account_id: "pingpong",
      channel: "chn_pingpong",
      target_account_id: null,
      category_group: null,
      category_name: null,
    });
  });

  it("normalizes legacy expense transactions with category group and name", () => {
    const categoryMap = buildCategoryMap(categories);
    const expenseTransaction = transactions.find(
      (transaction) => transaction.id === "txn_apr_fb_ads",
    );

    expect(expenseTransaction).toBeDefined();

    const normalized = normalizeTransactions(
      [expenseTransaction!],
      categoryMap,
    )[0];

    expect(normalized).toMatchObject({
      type: "expense",
      origin: "auto",
      status: "verified",
      category_group: "growth",
      category_name: "Promote-Online-ads",
    });
  });

  it("aggregates expense totals by main category and subcategory", () => {
    const categoryMap = buildCategoryMap(categories);
    const aprilTransactions = transactions.filter((transaction) =>
      transaction.transactionDate.startsWith("2026-04-01"),
    );

    expect(groupExpenseCategories(aprilTransactions, categoryMap)).toEqual([
      { group: "GROWTH", value: 37300000 },
      { group: "COST", value: 21200000 },
      { group: "OVERHEAD", value: 26850000 },
    ]);

    expect(groupExpenseSubcategories(aprilTransactions, categoryMap)).toEqual(
      expect.arrayContaining([
        {
          categoryId: "cat_growth_promote_online_ads",
          mainCategory: "Growth",
          subCategory: "Promote-Online-ads",
          value: 22400000,
        },
        {
          categoryId: "cat_overhead_office_salaries",
          mainCategory: "Overhead",
          subCategory: "Office-Salaries",
          value: 17500000,
        },
      ]),
    );
  });

  it("builds a drill-down breakdown for the dashboard donut", () => {
    const categoryMap = buildCategoryMap(categories);
    const aprilTransactions = transactions.filter((transaction) =>
      transaction.transactionDate.startsWith("2026-04-01"),
    );

    expect(buildExpenseSubcategoryBreakdown(aprilTransactions, categoryMap).GROWTH).toEqual([
      {
        categoryId: "cat_growth_promote_online_ads",
        label: "Promote-Online-ads",
        value: 22400000,
        group: "GROWTH",
      },
      {
        categoryId: "cat_growth_promote_tiktok_ads",
        label: "Promote-Tiktok-ads",
        value: 14900000,
        group: "GROWTH",
      },
    ]);

    expect(buildExpenseBreakdown(aprilTransactions, categoryMap)).toEqual({
      total: 85350000,
      main: [
        { id: "GROWTH", label: "Growth", value: 37300000, group: "GROWTH" },
        { id: "COST", label: "Cost", value: 21200000, group: "COST" },
        { id: "OVERHEAD", label: "Overhead", value: 26850000, group: "OVERHEAD" },
      ],
      subcategories: expect.objectContaining({
        GROWTH: expect.arrayContaining([
          {
            categoryId: "cat_growth_promote_online_ads",
            label: "Promote-Online-ads",
            value: 22400000,
            group: "GROWTH",
          },
        ]),
      }),
    });
  });

  it("routes finance users into manual inputs by default", () => {
    expect(getLandingPath("OWNER")).toBe("/");
    expect(getLandingPath("OPS_MANAGER")).toBe("/");
    expect(getLandingPath("FINANCE")).toBe("/manual-inputs");
  });
});
