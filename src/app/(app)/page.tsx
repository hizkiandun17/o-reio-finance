"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  CircleCheckBig,
  CircleHelp,
  MessageSquareWarning,
} from "lucide-react";

import { DashboardDateRangeSelector } from "@/components/dashboard-date-range-selector";
import {
  ChartCardSkeleton,
  MetricCardsSkeleton,
  PageHeaderSkeleton,
  SectionErrorBoundary,
  StateMessage,
} from "@/components/data-state";
import {
  ExpenseDonutChart,
  SingleDayPerformanceChart,
  TrendChart,
} from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/components/providers/app-state-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatCurrency,
  formatCompactCurrency,
  formatDate,
  formatPercent,
} from "@/lib/format";
import { accounts as accountSeed } from "@/lib/mock-data";
import {
  getAllAccountBalances,
  type AccountBalanceSummary,
} from "@/lib/balance-breakdown";
import { normalizeTransactions } from "@/lib/business";
import {
  buildDailyFinanceView,
  getRevenueChannelDisplayName,
} from "@/lib/daily-finance-view";
import { buildSignals, type AdsEfficiencyStatus } from "@/lib/financial-signals";
import type {
  Account,
  DailyCashSnapshot,
  DailyCashSnapshotStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const {
    balanceSummary,
    balanceSummaryError,
    balanceSummaryLoading,
    categoryMap,
    dashboardDateRange,
    hydrated,
    role,
    transactions,
  } = useAppState();
  const [balanceDetailView, setBalanceDetailView] = useState<"live" | "closing" | null>(
    null,
  );
  const [adsEfficiencyDetailOpen, setAdsEfficiencyDetailOpen] = useState(false);
  const [showPerformanceTrend, setShowPerformanceTrend] = useState(false);

  useEffect(() => {
    if (hydrated && role === "FINANCE") {
      router.replace("/manual-inputs");
    }
  }, [hydrated, role, router]);

  const selectedDate = dashboardDateRange.endDate;
  const snapshot = useMemo<DailyCashSnapshot>(
    () =>
      balanceSummary?.lastClosingSnapshot ?? {
        date: selectedDate,
        accounts: [],
        total_balance: 0,
        closingBalance: 0,
        currency: "IDR",
        capturedAt: `${selectedDate}T00:00:00+07:00`,
        sourceCount: 0,
        status: "FAILED",
        metadata: {
          includedChannelIds: [],
          missingChannelIds: [],
          availableChannelIds: [],
          accountBreakdown: [],
        },
      },
    [balanceSummary?.lastClosingSnapshot, selectedDate],
  );
  const unifiedTransactions = useMemo(
    () => normalizeTransactions(transactions, categoryMap),
    [categoryMap, transactions],
  );
  const financeView = useMemo(
    () =>
      buildDailyFinanceView(
        accountSeed,
        unifiedTransactions,
        snapshot,
        {
          startDate: dashboardDateRange.startDate,
          endDate: dashboardDateRange.endDate,
        },
      ),
    [
      dashboardDateRange.endDate,
      dashboardDateRange.startDate,
      snapshot,
      unifiedTransactions,
    ],
  );
  const liveAccountBalances = useMemo(
    () => getAllAccountBalances(accountSeed, unifiedTransactions),
    [unifiedTransactions],
  );
  const signalState = useMemo(
    () => buildSignals(financeView),
    [financeView],
  );
  const adsEfficiency = signalState.adsEfficiency;
  const adsRatioPercent = adsEfficiency.ratio * 100;
  const selectedDateLabel = formatDate(`${selectedDate}T00:00:00+08:00`);
  const isSingleDayRange = dashboardDateRange.startDate === dashboardDateRange.endDate;
  const selectedRangeLabel = formatDashboardDateRangeLabel(
    dashboardDateRange.startDate,
    dashboardDateRange.endDate,
  );
  const netPerformanceLabel = isSingleDayRange ? "Today's Net" : "Net Profit";
  const liveBalanceStatus = getLiveBalanceStatus(balanceSummary?.liveStatus);
  const profitTone = getValueTone(financeView.performance.net);
  const closeDifferenceTone = getValueTone(financeView.balance.difference);
  const adsEfficiencyBanner = getAdsEfficiencyBanner(adsEfficiency.status);
  const prioritizedSignals = [...signalState.signals]
    .sort((left, right) => getSignalPriority(right.type) - getSignalPriority(left.type));
  const primarySignal = prioritizedSignals[0] ?? {
    type: "info" as const,
    message: "Daily finance signals are stable.",
  };
  const secondarySignals = prioritizedSignals.slice(1, 4);
  const liveBalanceGroups = useMemo(
    () => buildLiveBalanceGroups(liveAccountBalances),
    [liveAccountBalances],
  );
  const snapshotBalanceGroups = useMemo(
    () => buildSnapshotBalanceGroups(snapshot, accountSeed),
    [snapshot],
  );
  const snapshotCoverage = useMemo(
    () => getSnapshotCoverage(snapshot, accountSeed),
    [snapshot],
  );

  useEffect(() => {
    console.log("growth_expense:", financeView.performance.growthExpense);
    console.log("revenue:", financeView.performance.sales);
    console.log("ads_ratio:", adsEfficiency.ratio);
  }, [
    adsEfficiency.ratio,
    financeView.performance.growthExpense,
    financeView.performance.sales,
  ]);

  if (!hydrated) {
    return <DashboardLoadingState />;
  }

  if (role === "FINANCE") {
    return null;
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        eyebrow="System status: operational"
        title="Command Center"
        description="A simpler view of the business: net profit, ad efficiency, expense mix, and whether it is safe to scale today."
        actions={
          <>
            <DashboardDateRangeSelector />
            <Button className="w-full rounded-none border border-white bg-white px-5 text-xs font-semibold uppercase tracking-[0.22em] text-black hover:bg-white/90 sm:w-auto">
              Export report
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-none border-white/10 bg-transparent px-5 text-xs font-semibold uppercase tracking-[0.22em] text-white hover:bg-white/6 sm:w-auto"
            >
              Config
            </Button>
          </>
        }
      />

      <section className="space-y-3">
        <SectionHeading
          eyebrow="Balance"
          title="Cash position"
          description="Current balance, last close, and how today is moving against the previous snapshot."
        />
        <SectionErrorBoundary title="Balance unavailable" description="Something went wrong. Please refresh or try again.">
          {balanceSummaryLoading ? (
            <MetricCardsSkeleton />
          ) : balanceSummaryError ? (
            <StateMessage
              title="Balance data unavailable"
              description={balanceSummaryError}
              tone="error"
            />
          ) : (
            <div className="grid items-stretch gap-3 md:gap-4 md:grid-cols-3">
              <button
                type="button"
                onClick={() => setBalanceDetailView("live")}
                className="h-full text-left"
              >
                <Card className="command-panel h-full min-h-[168px] transition hover:border-white/14 hover:bg-[#181818] md:min-h-[190px]">
                  <CardHeader className="space-y-4 pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="command-label">Live balance</p>
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.18em] uppercase",
                          liveBalanceStatus.badgeClass,
                        )}
                      >
                        <span className="relative flex size-2">
                          <span
                            className={cn(
                              "absolute inline-flex h-full w-full rounded-full opacity-75",
                              liveBalanceStatus.pulseClass,
                            )}
                          />
                          <span
                            className={cn(
                              "relative inline-flex size-2 rounded-full",
                              liveBalanceStatus.dotClass,
                            )}
                          />
                        </span>
                        {liveBalanceStatus.label}
                      </span>
                    </div>
                    <CardTitle className="text-3xl leading-none text-white">
                      {formatCompactCurrency(financeView.balance.liveTotal)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-2 border-t border-white/8 pt-4 text-sm text-[#8f8f8f]">
                    <p>
                      {financeView.balance.breakdown.local.accounts.length +
                        financeView.balance.breakdown.foreign.accounts.length +
                        financeView.balance.breakdown.holding.accounts.length}{" "}
                      accounts included
                    </p>
                    <p>{selectedDateLabel}</p>
                    <p className={liveBalanceStatus.textClass}>
                      Status: {liveBalanceStatus.detailLabel}
                    </p>
                  </CardContent>
                </Card>
              </button>

              <button
                type="button"
                onClick={() => setBalanceDetailView("closing")}
                className="h-full text-left"
              >
                <Card className="command-panel h-full min-h-[168px] transition hover:border-white/14 hover:bg-[#181818] md:min-h-[190px]">
                  <CardHeader className="space-y-4 pb-0">
                    <p className="command-label">Last closing balance</p>
                    <CardTitle className="text-3xl leading-none text-white">
                      {balanceSummary?.lastClosingSnapshot
                        ? formatCompactCurrency(financeView.balance.snapshotTotal)
                        : "No close yet"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-2 border-t border-white/8 pt-4 text-sm text-[#8f8f8f]">
                    <p>
                      {balanceSummary?.lastClosingSnapshot?.date
                        ? `Snapshot date ${formatDate(`${balanceSummary.lastClosingSnapshot.date}T00:00:00+07:00`)}`
                        : "The first automated close will appear after the next daily run."}
                    </p>
                    <p>
                      {balanceSummary?.lastClosingSnapshot
                        ? `Snapshot state: ${balanceSummary.lastClosingSnapshot.status}`
                        : "Reading daily_cash_snapshots"}
                    </p>
                  </CardContent>
                </Card>
              </button>

              <Card
                className={cn(
                  "command-panel h-full min-h-[168px] md:min-h-[190px]",
                  closeDifferenceTone.panelClass,
                )}
              >
                <CardHeader className="space-y-4 pb-0">
                  <p className="command-label">Difference vs close</p>
                  <CardTitle
                    className={cn("text-3xl leading-none", closeDifferenceTone.valueClass)}
                  >
                    {formatSignedCompactCurrency(financeView.balance.difference)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="mt-auto space-y-2 border-t border-white/8 pt-4 text-sm text-[#8f8f8f]">
                  <p className={closeDifferenceTone.emphasisClass}>
                    {balanceSummary?.lastClosingSnapshot
                      ? `${financeView.balance.percentage > 0 ? "+" : ""}${formatPercent(financeView.balance.percentage)} vs last close`
                      : "Percentage will appear after the first previous close is available."}
                  </p>
                  <p className="text-white">
                    {!balanceSummary?.lastClosingSnapshot
                      ? "Waiting for the first comparable closing snapshot."
                      : financeView.balance.difference > 0
                      ? "Live cash is above the previous close."
                      : financeView.balance.difference < 0
                        ? "Live cash is below the previous close."
                        : "Live cash is flat against the previous close."}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </SectionErrorBoundary>
      </section>

      <Dialog
        open={balanceDetailView !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBalanceDetailView(null);
          }
        }}
      >
        <DialogContent
          className={cn(
            "border-white/10 bg-[#151515] text-white sm:max-w-2xl",
            balanceDetailView !== null &&
              "max-h-[78vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden",
          )}
        >
          {balanceDetailView === "live" ? (
            <>
              <DialogHeader>
                <DialogTitle>Live balance details</DialogTitle>
                <DialogDescription>
                  Current balances from the unified transaction flow grouped by account.
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 space-y-4 overflow-y-auto py-2 pr-1">
                {liveBalanceGroups.map((group) => (
                  <div
                    key={group.label}
                    className="rounded-[22px] border border-white/8 bg-[#121212] px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-3">
                      <div>
                        <p className="command-label">{group.label}</p>
                        <p className="mt-2 text-sm text-[#8f8f8f]">
                          {group.accounts.length} accounts
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-white">
                        {formatCurrency(group.total)}
                      </p>
                    </div>

                    <div className="mt-2 space-y-1">
                      {group.accounts.length > 0 ? (
                        group.accounts.map((account) => (
                          <button
                            key={account.id}
                            type="button"
                            onClick={() => {
                              router.push(buildTransactionDetailHref({ accountId: account.id }));
                            }}
                            className="flex w-full items-start justify-between gap-4 border-t border-white/8 py-4 text-left transition hover:bg-white/[0.03] first:border-t-0"
                          >
                            <div>
                              <p className="font-medium text-white">{account.name}</p>
                              <p className="mt-1 text-sm text-[#8f8f8f]">
                                {selectedDateLabel} · View transactions
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-white">
                                {formatCurrency(account.balance)}
                              </p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="py-4 text-sm text-[#8f8f8f]">
                          No accounts in this group.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter className="border-white/10 bg-[#121212]">
                <div className="flex w-full items-center justify-between gap-4 text-sm">
                  <div className="text-[#8f8f8f]">
                    {financeView.balance.breakdown.local.accounts.length +
                      financeView.balance.breakdown.foreign.accounts.length +
                      financeView.balance.breakdown.holding.accounts.length}{" "}
                    accounts included
                  </div>
                  <div className="font-medium text-white">
                    Total {formatCurrency(financeView.balance.liveTotal)}
                  </div>
                </div>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Last closing balance details</DialogTitle>
                <DialogDescription>
                  Stored daily snapshot data from the end-of-day closing process in Asia/Jakarta.
                </DialogDescription>
              </DialogHeader>

              {balanceSummary?.lastClosingSnapshot ? (
                <div className="min-h-0 space-y-4 overflow-y-auto py-2 pr-1">
                  <div className="space-y-3 border border-white/8 bg-[#121212] px-4 py-4 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">
                          Snapshot:{" "}
                          {formatDate(`${balanceSummary.lastClosingSnapshot.date}T00:00:00+07:00`)}{" "}
                          (End of day)
                        </p>
                        <p className="mt-1 text-[#8f8f8f]">
                          This snapshot shows balances captured at end of day. Accounts without activity may not appear.
                        </p>
                        <p className="mt-1 text-xs text-[#707070]">
                          Timezone: Asia/Jakarta
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="command-label">Status</p>
                        <p className="mt-1 font-semibold text-white">
                          {snapshotCoverage.included === snapshotCoverage.total
                            ? "COMPLETE"
                            : "PARTIAL"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-white/8 pt-3">
                      <span className="text-[#8f8f8f]">Accounts</span>
                      <span className="font-medium text-white">
                        {snapshotCoverage.included} / {snapshotCoverage.total}
                      </span>
                    </div>
                  </div>

                  {snapshotBalanceGroups.map((group) => {
                    const accountsWithSnapshot = group.accounts.filter(
                      (account) => account.balance !== null,
                    );
                    const accountsWithoutSnapshot = group.accounts.filter(
                      (account) => account.balance === null,
                    );

                    return (
                      <div
                        key={group.label}
                        className="rounded-[22px] border border-white/8 bg-[#121212] px-4 py-4"
                      >
                        <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-3">
                          <div>
                            <p className="command-label">{group.label}</p>
                            <p className="mt-2 text-sm text-[#8f8f8f]">
                              {group.accounts.length} accounts
                            </p>
                          </div>
                          <p className="text-lg font-semibold text-white">
                            {formatCurrency(group.total)}
                          </p>
                        </div>

                        <div className="mt-3 space-y-4">
                          <SnapshotAccountSection
                            accounts={accountsWithSnapshot}
                            emptyLabel="No accounts with snapshot data."
                            label="Accounts with snapshot"
                            muted={false}
                            onSelect={(accountId) => {
                              router.push(
                                buildTransactionDetailHref({
                                  accountId,
                                  date: balanceSummary.lastClosingSnapshot?.date,
                                }),
                              );
                            }}
                          />
                          <SnapshotAccountSection
                            accounts={accountsWithoutSnapshot}
                            emptyLabel="All accounts in this group were included."
                            label="Other accounts"
                            muted
                            onSelect={(accountId) => {
                              router.push(
                                buildTransactionDetailHref({
                                  accountId,
                                  date: balanceSummary.lastClosingSnapshot?.date,
                                }),
                              );
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-white/8 bg-[#121212] px-4 py-4 text-sm text-[#8f8f8f]">
                  The first automated close has not been stored yet.
                </div>
              )}

              <DialogFooter className="border-white/10 bg-[#121212]">
                <div className="flex w-full items-center justify-between gap-4 text-sm">
                  <div className="text-[#8f8f8f]">
                    {balanceSummary?.lastClosingSnapshot?.date
                      ? `Snapshot ${formatDate(`${balanceSummary.lastClosingSnapshot.date}T00:00:00+07:00`)}`
                      : "No snapshot available"}
                  </div>
                  <div className="font-medium text-white">
                    Total {formatCurrency(financeView.balance.snapshotTotal)}
                  </div>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={adsEfficiencyDetailOpen} onOpenChange={setAdsEfficiencyDetailOpen}>
        <DialogContent className="border-white/10 bg-[#151515] text-white sm:max-w-xl">
          <AdsEfficiencyDetail
            adsRatioPercent={adsRatioPercent}
            status={adsEfficiency.status}
          />
        </DialogContent>
      </Dialog>

      <section className="space-y-3">
        <SectionHeading
          eyebrow="Performance"
          title={isSingleDayRange ? "Daily performance" : "Range performance"}
          description="Sales, expense, and net outcome for the selected finance range."
        />
        <div className="space-y-2 rounded-[18px] border border-white/8 bg-[#121212] px-4 py-4">
          <p className="text-sm font-medium text-white">
            Daily (Realtime): Shopify (WWX) + TikTok (OSCO)
          </p>
          <p className="text-sm text-[#8f8f8f]">
            Excludes wholesale and consignment unless verified and included in dataset.
          </p>
          <p className="text-sm text-[#8f8f8f]">
            Live balance reflects wallet funds, not revenue. This is operational daily decision data.
          </p>
        </div>
        <SectionErrorBoundary title="Performance unavailable" description="Something went wrong. Please refresh or try again.">
          <div className="grid gap-3 md:gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="command-panel">
            <CardHeader className="pb-3 md:pb-4">
              <button
                type="button"
                onClick={() => setAdsEfficiencyDetailOpen(true)}
                className={cn(
                  "w-full rounded-[20px] border px-4 py-3 text-left transition hover:border-white/20",
                  adsEfficiencyBanner.bannerClass,
                )}
              >
                <p className="text-sm font-semibold text-white">
                  {adsEfficiencyBanner.label}
                </p>
                <p className="mt-1 text-xs text-[#c7c7c7]">
                  Click to understand what this means
                </p>
              </button>
              <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="command-label">{netPerformanceLabel}</p>
                  <CardTitle className={cn("mt-3 text-4xl md:command-kpi", profitTone.valueClass)}>
                    {formatCompactCurrency(financeView.performance.net)}
                  </CardTitle>
                  <p className="mt-3 text-sm text-[#b7b7b7]">{adsEfficiency.message}</p>
                </div>
                <div className="w-full rounded-[18px] border border-white/10 bg-[#121212] px-4 py-3 text-left sm:w-auto sm:text-right">
                  <p className="command-label">ADS efficiency</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {formatPercent(adsRatioPercent)}
                  </p>
                  <p className={cn("mt-2 text-xs font-medium uppercase tracking-[0.16em]", adsEfficiencyBanner.textClass)}>
                    {adsEfficiencyBanner.shortLabel}
                  </p>
                  <p className="mt-2 text-xs text-[#8f8f8f]">
                    {isSingleDayRange ? selectedRangeLabel : `Range ${selectedRangeLabel}`}
                  </p>
                </div>
              </div>
              <div className="mt-4 text-sm text-[#9f9f9f]">
                {selectedRangeLabel} · ADS {formatPercent(adsRatioPercent)}
              </div>
              {!isSingleDayRange ? (
                <div className="mt-4 flex items-center justify-end gap-3 border-t border-white/8 pt-4">
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#8f8f8f]">
                    Show trend
                  </span>
                  <Switch
                    checked={showPerformanceTrend}
                    onCheckedChange={setShowPerformanceTrend}
                    aria-label="Show trend"
                    size="sm"
                  />
                </div>
              ) : null}
              {isSingleDayRange ? (
                <div className="mt-4 border-t border-white/8 pt-4">
                  <p className="text-sm text-[#8f8f8f]">No comparison available</p>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/8 pt-4 md:grid-cols-3">
                  <TrendComparisonItem
                    label="Revenue"
                    comparison={financeView.comparison.revenue}
                    formatValue={(value) => formatPercent(value)}
                  />
                  <TrendComparisonItem
                    label="Net"
                    comparison={financeView.comparison.net}
                    formatValue={(value) => formatPercent(value)}
                  />
                  <TrendComparisonItem
                    className="col-span-2 md:col-span-1"
                    label="ADS ratio"
                    comparison={financeView.comparison.adsRatio}
                    formatValue={(value) => formatPercent(value)}
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-5">
              {isSingleDayRange ? (
                <SingleDayPerformanceChart
                  dateLabel={selectedDateLabel}
                  revenue={financeView.performance.sales}
                  expense={financeView.performance.expense}
                  net={financeView.performance.net}
                />
              ) : (
                <TrendChart
                  data={financeView.trend}
                  dense
                  muted
                  showTrend={showPerformanceTrend}
                />
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-1">
            <SummaryMetricCard
              className="col-span-1"
              label="Sales"
              value={formatCompactCurrency(financeView.performance.sales)}
              note="Income captured for the selected range."
              infoTooltip="Based on transaction data, not bank balance."
            />
            <SummaryMetricCard
              className="col-span-1"
              label="Expense"
              value={formatCompactCurrency(financeView.performance.expense)}
              note="Spend captured for the selected range."
            />
            <SummaryMetricCard
              className="col-span-2 xl:col-span-1"
              label="Net"
              value={formatCompactCurrency(financeView.performance.net)}
              note="Sales minus expense for the selected range."
              valueClass={profitTone.valueClass}
            />
          </div>
          </div>
        </SectionErrorBoundary>
      </section>

      <section className="space-y-3">
        <SectionHeading
          eyebrow="Breakdown"
          title="Sales and expense detail"
          description="Where income is coming from and how expense is distributed for the selected range."
        />
        <SectionErrorBoundary title="Breakdown unavailable" description="Something went wrong. Please refresh or try again.">
          <div className="grid gap-3 md:gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="command-panel">
            <CardHeader>
              <p className="command-label">Sales breakdown</p>
              <CardTitle className="mt-3 text-2xl text-white">By channel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-[18px] border border-white/8 bg-[#121212] px-4 py-4">
                <p className="command-label">Total sales</p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {formatCompactCurrency(financeView.breakdowns.sales.total)}
                </p>
              </div>
              <div className="space-y-2">
                {financeView.breakdowns.sales.by_channel.length > 0 ? (
                  financeView.breakdowns.sales.by_channel.map((item) => (
                    <div
                      key={item.channel}
                      className="flex items-center justify-between gap-4 border-t border-white/8 py-4 first:border-t-0 first:pt-0"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {getRevenueChannelDisplayName(item.channel)}
                        </p>
                        <p className="mt-1 text-sm text-[#8f8f8f]">Sales channel</p>
                      </div>
                      <p className="font-medium text-white">
                        {formatCurrency(item.total)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-white/8 bg-[#121212] px-4 py-4 text-sm text-[#8f8f8f]">
                    No sales activity for the selected range.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="command-panel">
            <CardHeader>
              <p className="command-label">Expense breakdown</p>
              <CardTitle className="mt-3 text-2xl text-white">Burn allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpenseDonutChart data={financeView.expenseBreakdown} />
            </CardContent>
          </Card>
          </div>
        </SectionErrorBoundary>
      </section>

      <section className="space-y-3">
        <SectionHeading
          eyebrow="Signals"
          title="What needs attention"
          description="Daily guardrails across reconciliation, ad efficiency, and financial risk."
        />
        <SectionErrorBoundary title="Signals unavailable" description="Something went wrong. Please refresh or try again.">
          <div className="grid gap-3 md:gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="command-panel">
            <CardHeader>
              <CardTitle className="text-xl text-white">Health checks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="border border-white/8 bg-[#121212] px-4 py-4">
                  <p className="command-label">Health</p>
                  <p className="mt-4 text-4xl font-semibold text-[var(--chart-1)]">
                    {(financeView.reconciliation.completionRate * 100).toFixed(0)}%
                  </p>
                  <p className="mt-3 text-xs text-[#8f8f8f]">Data completeness</p>
                </div>
                <div className="border border-white/8 bg-[#121212] px-4 py-4">
                  <p className="command-label">Ads ratio</p>
                  <p className="mt-4 text-4xl font-semibold text-white">
                    {formatPercent(adsRatioPercent)}
                  </p>
                  <p className="mt-3 text-xs text-[#8f8f8f]">Healthy below 15%, caution above 25%</p>
                </div>
                <div className="col-span-2 border border-white/8 bg-[#121212] px-4 py-4 md:col-span-1">
                  <p className="command-label">Pending</p>
                  <p className="mt-4 text-4xl font-semibold text-white">
                    {financeView.reconciliation.pendingCount}
                  </p>
                  <p className="mt-3 text-xs text-[#8f8f8f]">Needs finance review</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="command-panel">
            <CardHeader>
              <CardTitle className="text-xl text-white">Signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className={cn(
                  "flex items-start gap-3 rounded-[20px] border px-4 py-4",
                  getSignalTone(primarySignal.type).containerClass,
                )}
              >
                {primarySignal.type === "danger" || primarySignal.type === "warning" ? (
                  <MessageSquareWarning
                    className={cn("mt-0.5 size-5", getSignalTone(primarySignal.type).iconClass)}
                  />
                ) : (
                  <CircleCheckBig className="mt-0.5 size-5 text-[var(--chart-1)]" />
                )}
                <div>
                  <p className="text-base font-medium text-white">
                    {getPrimarySignalTitle(primarySignal.type)}
                  </p>
                  <p className="mt-1 text-sm text-[#9b9b9b]">{primarySignal.message}</p>
                </div>
              </div>
              {secondarySignals.map((signal, index) => {
                const alertTone = getSignalTone(signal.type);

                return (
                  <div
                    key={`${signal.type}-${index}`}
                    className={cn(
                      "flex items-start gap-3 rounded-[18px] border px-4 py-4",
                      alertTone.containerClass,
                    )}
                  >
                    <CircleAlert className={cn("mt-0.5 size-4", alertTone.iconClass)} />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {getPrimarySignalTitle(signal.type)}
                      </p>
                      <p className="mt-1 text-sm text-[#8f8f8f]">{signal.message}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          </div>
        </SectionErrorBoundary>
      </section>
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeaderSkeleton showActions />

      <div className="space-y-3">
        <SkeletonSectionHeading />
        <MetricCardsSkeleton />
      </div>

      <div className="space-y-3">
        <SkeletonSectionHeading />
        <div className="grid gap-3 md:gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <ChartCardSkeleton />
          <MetricCardsSkeleton count={3} columnsClassName="grid-cols-2 xl:grid-cols-1" />
        </div>
      </div>

      <div className="space-y-3">
        <SkeletonSectionHeading />
        <div className="grid gap-3 md:gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>
      </div>
    </div>
  );
}

function SkeletonSectionHeading() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-24 rounded-md bg-white/8" />
      <div className="h-7 w-44 rounded-md bg-white/8" />
      <div className="h-4 w-full max-w-xl rounded-md bg-white/8" />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <p className="command-label">{eyebrow}</p>
      <h2 className="text-lg font-semibold text-white md:text-xl">{title}</h2>
      <p className="text-sm text-[#8f8f8f]">{description}</p>
    </div>
  );
}

function SummaryMetricCard({
  className,
  label,
  value,
  note,
  infoTooltip,
  valueClass = "text-white",
}: {
  className?: string;
  label: string;
  value: string;
  note: string;
  infoTooltip?: string;
  valueClass?: string;
}) {
  return (
    <Card className={cn("command-panel", className)}>
      <CardHeader className="pb-2 md:pb-3">
        <div className="flex items-center gap-2">
          <p className="command-label">{label}</p>
          {infoTooltip ? (
            <Tooltip>
              <TooltipTrigger className="inline-flex items-center justify-center text-[#8f8f8f] transition hover:text-white">
                <CircleHelp className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] border border-white/10 bg-[#151515] text-[#f3f3f3]">
                {infoTooltip}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        <CardTitle className={cn("mt-2 text-3xl md:mt-3 md:text-4xl", valueClass)}>{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[#8f8f8f]">{note}</p>
      </CardContent>
    </Card>
  );
}

function TrendComparisonItem({
  className,
  label,
  comparison,
  formatValue,
}: {
  className?: string;
  label: string;
  comparison: {
    availability?: "available" | "no_baseline" | "not_comparable" | "first_recorded";
    deltaPercent: number | null;
    direction: "up" | "down" | "flat";
    trend: "better" | "worse" | "neutral";
  };
  formatValue: (value: number) => string;
}) {
  if (comparison.availability && comparison.availability !== "available") {
    return (
      <div className={cn("rounded-[16px] border border-white/8 bg-[#121212] px-3 py-3", className)}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7f7f7f]">
          {label}
        </p>
        <p className="mt-2 text-sm font-medium text-[#d4d4d8]">
          {getComparisonAvailabilityLabel(comparison.availability)}
        </p>
        <p className="mt-2 text-xs text-[#8f8f8f]">
          {getComparisonAvailabilityCaption(comparison.availability)}
        </p>
      </div>
    );
  }

  const tone = getComparisonTone(comparison.trend);
  const deltaLabel =
    comparison.deltaPercent === null
      ? "0.0%"
      : comparison.direction === "flat"
        ? "0.0%"
        : formatValue(Math.abs(comparison.deltaPercent));

  return (
    <div className={cn("rounded-[16px] border border-white/8 bg-[#121212] px-3 py-3", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7f7f7f]">
        {label}
      </p>
      <div className={cn("mt-2 flex items-center gap-2", tone.textClass)}>
        {comparison.direction === "up" ? (
          <ArrowUp className="size-4" />
        ) : comparison.direction === "down" ? (
          <ArrowDown className="size-4" />
        ) : (
          <span className="text-sm leading-none">•</span>
        )}
        <span className="text-sm font-medium">{deltaLabel}</span>
      </div>
      <p className="mt-2 text-xs text-[#8f8f8f]">{tone.caption}</p>
    </div>
  );
}

function AdsEfficiencyDetail({
  adsRatioPercent,
  status,
}: {
  adsRatioPercent: number;
  status: AdsEfficiencyStatus;
}) {
  const content = getAdsEfficiencyDetailContent(status);
  const semantic = getAdsEfficiencySemanticStyles(status);

  return (
    <>
      <DialogHeader className="border-b border-white/8 pb-4">
        <div
          className={cn(
            "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5",
            semantic.badgeClass,
          )}
        >
          <semantic.Icon className={cn("size-4", semantic.iconClass)} />
          <span className={cn("text-sm font-medium", semantic.textClass)}>
            {content.title}
          </span>
        </div>
        <DialogTitle className="mt-2 text-3xl text-white">
          Ads Efficiency {formatPercent(adsRatioPercent)}
        </DialogTitle>
        <DialogDescription className="mt-2 text-[#8f8f8f]">
          Operational daily decision data from verified transactions.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-2">
        <div
          className={cn(
            "rounded-[18px] border px-4 py-4",
            semantic.panelClass,
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f7f7f]">
            Priority
          </p>
          <div className="mt-3 flex items-start gap-3">
            <semantic.Icon className={cn("mt-0.5 size-4 shrink-0", semantic.iconClass)} />
            <p className="text-sm font-medium text-white">{content.priority}</p>
          </div>
        </div>

        <div className="border-b border-white/8 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f7f7f]">
            Meaning
          </p>
          <p className="mt-3 text-sm leading-6 text-[#d3d3d3]">{content.meaning}</p>
        </div>

        <div className="border-b border-white/8 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f7f7f]">
            What To Do
          </p>
          <div className="mt-3 space-y-3">
            {content.steps.map((step) => (
              <div
                key={step}
                className={cn(
                  "rounded-[14px] border bg-[#121212] px-3 py-3 transition",
                  semantic.actionClass,
                )}
              >
                <div className="flex items-start gap-3">
                  <CircleCheckBig className={cn("mt-0.5 size-4 shrink-0", semantic.iconClass)} />
                  <p className="text-sm font-medium text-white">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f7f7f]">
            Why It Matters
          </p>
          <p className="mt-3 text-sm leading-6 text-[#d3d3d3]">{content.whyItMatters}</p>
        </div>
      </div>
    </>
  );
}

function SnapshotAccountSection({
  accounts,
  emptyLabel,
  label,
  muted,
  onSelect,
}: {
  accounts: Array<{ id: string; name: string; balance: number | null }>;
  emptyLabel: string;
  label: string;
  muted: boolean;
  onSelect: (accountId: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.18em] text-[#8f8f8f] uppercase">
        {label}
      </p>
      <div className="mt-2 space-y-1">
        {accounts.length > 0 ? (
          accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => onSelect(account.id)}
              className={cn(
                "flex w-full items-start justify-between gap-4 border-t border-white/8 py-4 text-left transition first:border-t-0 hover:bg-white/[0.03]",
                muted && "opacity-70 hover:opacity-100",
              )}
            >
              <div>
                <p className="font-medium text-white">{account.name}</p>
                <p className="mt-1 text-sm text-[#8f8f8f]">
                  {account.balance === null
                    ? "Not included in last closing"
                    : "Stored snapshot balance"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-white">
                  {account.balance === null
                    ? "Not included in last closing"
                    : formatCurrency(account.balance)}
                </p>
              </div>
            </button>
          ))
        ) : (
          <p className="py-3 text-sm text-[#8f8f8f]">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}

function formatSignedCompactCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "No change";
  }

  if (value === 0) {
    return formatCompactCurrency(0);
  }

  return `${value > 0 ? "+" : "-"}${formatCompactCurrency(Math.abs(value))}`;
}

function buildTransactionDetailHref({
  accountId,
  date,
  transactionId,
}: {
  accountId?: string;
  date?: string | null;
  transactionId?: string;
}) {
  const params = new URLSearchParams();

  if (transactionId) {
    params.set("transactionId", transactionId);
  }

  if (accountId) {
    params.set("accountId", accountId);
  }

  if (date) {
    params.set("date", date);
  }

  return `/transactions/detail?${params.toString()}`;
}

function formatDashboardDateRangeLabel(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatDate(`${endDate}T00:00:00+08:00`, "MMM d, yyyy");
  }

  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  const startPattern = sameYear ? "MMM d" : "MMM d, yyyy";
  const endPattern = sameYear ? "MMM d" : "MMM d, yyyy";

  return `${formatDate(`${startDate}T00:00:00+08:00`, startPattern)} – ${formatDate(`${endDate}T00:00:00+08:00`, endPattern)}`;
}

function getAdsEfficiencyBanner(status: AdsEfficiencyStatus) {
  if (status === "unsafe") {
    return {
      label: "Unsafe",
      shortLabel: "Unsafe",
      bannerClass: "border-rose-500/20 bg-rose-500/10",
      textClass: "text-rose-300",
    };
  }

  if (status === "optimize") {
    return {
      label: "Optimize",
      shortLabel: "Optimize",
      bannerClass: "border-amber-500/20 bg-amber-500/10",
      textClass: "text-amber-300",
    };
  }

  return {
    label: "Healthy",
    shortLabel: "Healthy",
    bannerClass: "border-emerald-500/20 bg-emerald-500/10",
    textClass: "text-emerald-300",
  };
}

function getComparisonTone(trend: "better" | "worse" | "neutral") {
  if (trend === "better") {
    return {
      textClass: "text-emerald-300",
      caption: "Better vs previous",
    };
  }

  if (trend === "worse") {
    return {
      textClass: "text-rose-300",
      caption: "Worse vs previous",
    };
  }

  return {
    textClass: "text-[#bdbdbd]",
    caption: "Flat vs previous",
  };
}

function getComparisonAvailabilityLabel(
  availability: "no_baseline" | "not_comparable" | "first_recorded",
) {
  if (availability === "no_baseline") {
    return "No baseline";
  }

  if (availability === "not_comparable") {
    return "Not comparable";
  }

  return "First recorded";
}

function getComparisonAvailabilityCaption(
  availability: "no_baseline" | "not_comparable" | "first_recorded",
) {
  if (availability === "no_baseline") {
    return "No verified previous-period data is available.";
  }

  if (availability === "not_comparable") {
    return "Previous-period baseline is zero.";
  }

  return "This metric was not recorded in the previous period.";
}

function getAdsEfficiencyDetailContent(status: AdsEfficiencyStatus) {
  if (status === "optimize") {
    return {
      title: "Optimize",
      priority: "Tighten efficiency before increasing spend.",
      meaning:
        "Profit is still okay. Efficiency needs work before you scale.",
      steps: [
        "✓ Test creatives -> reduce CPA",
        "✓ Shift budget -> high performers",
        "✓ Improve landing page / offer",
        "✓ Wait before scaling",
      ],
      whyItMatters:
        "Margin is still there. Scaling too early can make profit unstable.",
    };
  }

  if (status === "unsafe") {
    return {
      title: "Unsafe",
      priority: "Cut waste now before scaling again.",
      meaning:
        "Ad spend is too heavy for current revenue. Scaling now increases risk fast.",
      steps: [
        "✓ Stop scaling",
        "✓ Reduce ad spend immediately",
        "✓ Identify wasteful campaigns",
        "✓ Fix conversion funnel before spending more",
      ],
      whyItMatters:
        "Weak efficiency can drain profit quickly. Pulling back protects cash and stability.",
    };
  }

  return {
    title: "Healthy",
    priority: "Scale carefully while protecting efficiency.",
    meaning:
      "Ad spend is efficient for current revenue. This is a good zone for controlled growth.",
    steps: [
      "✓ Scale gradually",
      "✓ Increase budget on winning campaigns",
      "✓ Maintain efficiency",
    ],
    whyItMatters:
      "Healthy efficiency supports profit stability. It gives you room to scale carefully.",
  };
}

function getAdsEfficiencySemanticStyles(status: AdsEfficiencyStatus) {
  if (status === "unsafe") {
    return {
      Icon: CircleAlert,
      textClass: "text-[#EF4444]",
      iconClass: "text-[#EF4444]",
      badgeClass: "border-[#EF4444]/25 bg-[#EF4444]/10",
      panelClass: "border-[#EF4444]/18 bg-[#EF4444]/8",
      actionClass: "border-white/8 hover:border-[#EF4444]/25 hover:bg-[#EF4444]/6",
    };
  }

  if (status === "optimize") {
    return {
      Icon: MessageSquareWarning,
      textClass: "text-[#FACC15]",
      iconClass: "text-[#FACC15]",
      badgeClass: "border-[#FACC15]/25 bg-[#FACC15]/10",
      panelClass: "border-[#FACC15]/18 bg-[#FACC15]/8",
      actionClass: "border-white/8 hover:border-[#FACC15]/25 hover:bg-[#FACC15]/6",
    };
  }

  return {
    Icon: CircleCheckBig,
    textClass: "text-[#22C55E]",
    iconClass: "text-[#22C55E]",
    badgeClass: "border-[#22C55E]/25 bg-[#22C55E]/10",
    panelClass: "border-[#22C55E]/18 bg-[#22C55E]/8",
    actionClass: "border-white/8 hover:border-[#22C55E]/25 hover:bg-[#22C55E]/6",
  };
}

function getValueTone(value: number | null) {
  if (value === null) {
    return {
      panelClass: "",
      valueClass: "text-white",
      emphasisClass: "text-white",
    };
  }

  if (value > 0) {
    return {
      panelClass: "border-emerald-500/15 bg-emerald-500/5",
      valueClass: "text-emerald-300",
      emphasisClass: "text-emerald-200",
    };
  }

  if (value < 0) {
    return {
      panelClass: "border-rose-500/15 bg-rose-500/5",
      valueClass: "text-rose-300",
      emphasisClass: "text-rose-200",
    };
  }

  return {
    panelClass: "",
    valueClass: "text-white",
    emphasisClass: "text-white",
  };
}

function getLiveBalanceStatus(status: DailyCashSnapshotStatus | undefined) {
  if (status === "COMPLETE") {
    return {
      label: "Live",
      detailLabel: "Live",
      badgeClass: "border-emerald-400/20 bg-emerald-400/8 text-emerald-200",
      dotClass: "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.65)]",
      pulseClass: "animate-ping bg-emerald-300/40",
      textClass: "text-emerald-200",
    };
  }

  if (status === "PARTIAL") {
    return {
      label: "Partial",
      detailLabel: "Partial sync",
      badgeClass: "border-white/10 bg-white/[0.03] text-[#b7b7b7]",
      dotClass: "bg-white/35",
      pulseClass: "bg-transparent",
      textClass: "text-[#c7c7c7]",
    };
  }

  return {
    label: "Offline",
    detailLabel: status === "FAILED" ? "Sync unavailable" : "Checking sync",
    badgeClass: "border-white/8 bg-white/[0.02] text-[#8f8f8f]",
    dotClass: "bg-white/20",
    pulseClass: "bg-transparent",
    textClass: "text-[#8f8f8f]",
  };
}

function getSignalPriority(signalType: "info" | "warning" | "danger") {
  if (signalType === "danger") {
    return 3;
  }

  if (signalType === "warning") {
    return 2;
  }

  return 1;
}

function getSignalTone(signalType: "info" | "warning" | "danger") {
  if (signalType === "danger") {
    return {
      containerClass: "border-rose-500/20 bg-rose-500/8",
      iconClass: "text-rose-300",
    };
  }

  if (signalType === "warning") {
    return {
      containerClass: "border-amber-500/20 bg-amber-500/8",
      iconClass: "text-amber-300",
    };
  }

  return {
    containerClass: "border-white/8 bg-[#121212]",
    iconClass: "text-[#8f8f8f]",
  };
}

function buildSnapshotBalanceGroups(snapshot: DailyCashSnapshot, accounts: Account[]) {
  const balanceByAccountId = new Map(
    snapshot.accounts.map((account) => [account.account_id, account.balance]),
  );
  const groups = {
    Local: [] as Array<{ id: string; name: string; balance: number | null }>,
    Foreign: [] as Array<{ id: string; name: string; balance: number | null }>,
    Holding: [] as Array<{ id: string; name: string; balance: number | null }>,
  };

  accounts.forEach((account) => {
    const item = {
      id: account.id,
      name: account.name,
      balance: balanceByAccountId.get(account.id) ?? null,
    };

    if (account.group === "local" || (!account.group && account.type === "bank")) {
      groups.Local.push(item);
      return;
    }

    if (
      account.group === "foreign" ||
      (!account.group && (account.type === "wallet" || account.type === "platform"))
    ) {
      groups.Foreign.push(item);
      return;
    }

    if (account.group === "holding" || (!account.group && account.type === "holding")) {
      groups.Holding.push(item);
    }
  });

  return [
    {
      label: "Local",
      accounts: groups.Local,
      total: groups.Local.reduce((sum, account) => sum + (account.balance ?? 0), 0),
    },
    {
      label: "Foreign",
      accounts: groups.Foreign,
      total: groups.Foreign.reduce((sum, account) => sum + (account.balance ?? 0), 0),
    },
    {
      label: "Holding",
      accounts: groups.Holding,
      total: groups.Holding.reduce((sum, account) => sum + (account.balance ?? 0), 0),
    },
  ];
}

function getSnapshotCoverage(snapshot: DailyCashSnapshot, accounts: Account[]) {
  const includedAccountIds = new Set(snapshot.accounts.map((account) => account.account_id));

  return {
    included: accounts.filter((account) => includedAccountIds.has(account.id)).length,
    total: accounts.length,
  };
}

function buildLiveBalanceGroups(accountBalances: AccountBalanceSummary[]) {
  const groups = {
    Local: [] as Array<{ id: string; name: string; balance: number }>,
    Foreign: [] as Array<{ id: string; name: string; balance: number }>,
    Holding: [] as Array<{ id: string; name: string; balance: number }>,
  };

  accountBalances.forEach(({ account, balance }) => {
    const item = {
      id: account.id,
      name: account.name,
      balance,
    };

    if (account.group === "local" || (!account.group && account.type === "bank")) {
      groups.Local.push(item);
      return;
    }

    if (
      account.group === "foreign" ||
      (!account.group && (account.type === "wallet" || account.type === "platform"))
    ) {
      groups.Foreign.push(item);
      return;
    }

    if (account.group === "holding" || (!account.group && account.type === "holding")) {
      groups.Holding.push(item);
    }
  });

  return [
    {
      label: "Local",
      accounts: groups.Local,
      total: groups.Local.reduce((sum, account) => sum + account.balance, 0),
    },
    {
      label: "Foreign",
      accounts: groups.Foreign,
      total: groups.Foreign.reduce((sum, account) => sum + account.balance, 0),
    },
    {
      label: "Holding",
      accounts: groups.Holding,
      total: groups.Holding.reduce((sum, account) => sum + account.balance, 0),
    },
  ];
}

function getPrimarySignalTitle(signalType: "info" | "warning" | "danger") {
  if (signalType === "danger") {
    return "Action needed";
  }

  if (signalType === "warning") {
    return "Watch closely";
  }

  return "Stable";
}
