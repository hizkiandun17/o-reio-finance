"use client";

import { PageHeader } from "@/components/page-header";
import { ExpenseGroupBarChart, TrendChart } from "@/components/charts";
import { useAppState } from "@/components/providers/app-state-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { groupExpenseCategories, getTransactionsForMode } from "@/lib/business";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";
import type { TrendPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
  const { categoryMap, dashboard, transactions, viewMode } = useAppState();
  const scopedTransactions = getTransactionsForMode(transactions, viewMode);
  const expenseGroups = groupExpenseCategories(scopedTransactions, categoryMap);
  const monthlyRollup = dashboard.monthlyTrend;
  const bestMonth = monthlyRollup.reduce<TrendPoint | null>(
    (best, item) => (best === null || item.net > best.net ? item : best),
    null,
  );
  const worstMonth = monthlyRollup.reduce<TrendPoint | null>(
    (worst, item) => (worst === null || item.net < worst.net ? item : worst),
    null,
  );
  const reportInsight = getReportsInsight(monthlyRollup);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reporting"
        title="Historical revenue and expense reporting"
        description="Review daily or monthly movement, compare trajectory, and inspect expense concentration before pushing more spend into growth."
      />

      <p className="text-sm text-[#b7b7b7]">{reportInsight}</p>

      <div className="grid gap-4 2xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="surface-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-2xl">Historical trajectory</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={dashboard.monthlyTrend} />
          </CardContent>
        </Card>

        <Card className="surface-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-2xl">Expense group split</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseGroupBarChart data={expenseGroups} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="surface-panel border-white/10">
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Reporting scope</p>
            <CardTitle className="text-3xl">
              {viewMode === "daily" ? "Daily" : "Monthly"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The top bar controls whether report widgets reflect daily or monthly operating windows.
          </CardContent>
        </Card>
        <Card className="surface-panel border-white/10">
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Net in scope</p>
            <CardTitle className="text-3xl">{formatCompactCurrency(dashboard.metrics.net)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Positive net means the business is earning after growth, cost, and overhead.
          </CardContent>
        </Card>
        <Card className="surface-panel border-white/10">
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Tracked transactions</p>
            <CardTitle className="text-3xl">{scopedTransactions.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Revenue and expense movements included in the current report scope.
          </CardContent>
        </Card>
      </div>

      <Card className="surface-panel border-white/10">
        <CardHeader>
          <CardTitle className="text-2xl">Monthly rollup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {monthlyRollup.map((item, index) => {
            const previous = monthlyRollup[index - 1];
            const delta = getMonthDelta(item, previous);
            const isBest = bestMonth?.label === item.label;
            const isWorst = worstMonth?.label === item.label;

            return (
              <div
                key={item.label}
                className={cn(
                  "grid gap-3 rounded-[1.35rem] border bg-background/60 px-4 py-4 md:grid-cols-4",
                  isBest
                    ? "border-emerald-500/18 bg-emerald-500/6"
                    : isWorst
                      ? "border-rose-500/18 bg-rose-500/6"
                      : "border-white/10",
                )}
              >
              <div>
                <p className="text-sm text-muted-foreground">Month</p>
                <p className="mt-1 font-medium">{item.label}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="mt-1 font-medium">{formatCurrency(item.revenue)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expense</p>
                <p className="mt-1 font-medium">{formatCurrency(item.expense)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net</p>
                <p className="mt-1 font-medium">{formatCurrency(item.net)}</p>
                <p className="mt-1 text-xs text-[#8f8f8f]">{delta}</p>
              </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function getReportsInsight(monthlyTrend: TrendPoint[]) {
  if (monthlyTrend.length < 2) {
    return "More monthly history will make revenue and expense direction easier to compare.";
  }

  const latest = monthlyTrend[monthlyTrend.length - 1];
  const previous = monthlyTrend[monthlyTrend.length - 2];
  const revenueDelta = latest.revenue - previous.revenue;
  const expenseDelta = latest.expense - previous.expense;
  const netDelta = latest.net - previous.net;

  if (revenueDelta > 0 && expenseDelta > 0 && expenseDelta > revenueDelta) {
    return "Revenue is growing, but expenses are rising faster in recent months.";
  }

  if (revenueDelta > 0 && expenseDelta <= 0) {
    return "Revenue is improving while expense growth stays under control.";
  }

  if (revenueDelta < 0 && expenseDelta > 0) {
    return "Revenue softened while expenses increased in the latest month.";
  }

  if (netDelta > 0) {
    return "Recent months are ending with stronger net profit momentum.";
  }

  if (netDelta < 0) {
    return "Net profit has weakened recently and needs closer cost control.";
  }

  return "Revenue and expense are moving at a similar pace across recent months.";
}

function getMonthDelta(item: TrendPoint, previous?: TrendPoint) {
  if (!previous) {
    return "No prior month";
  }

  if (previous.net === 0) {
    if (item.net === 0) {
      return "Flat vs previous";
    }

    return `${item.net > 0 ? "+" : "-"}${formatCompactCurrency(Math.abs(item.net))} vs previous`;
  }

  const deltaPercent = ((item.net - previous.net) / Math.abs(previous.net)) * 100;
  return `${deltaPercent > 0 ? "+" : ""}${formatPercent(deltaPercent)} vs previous`;
}
