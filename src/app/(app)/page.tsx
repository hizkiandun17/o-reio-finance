"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  CircleCheckBig,
  MessageSquareWarning,
} from "lucide-react";

import { DashboardDateRangeSelector } from "@/components/dashboard-date-range-selector";
import { ExpenseDonutChart, TrendChart } from "@/components/charts";
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
import { buildDailyFinanceView } from "@/lib/daily-finance-view";
import { buildSignals } from "@/lib/financial-signals";
import { getSourceDisplayName } from "@/lib/source-display";
import type {
  Account,
  DailyCashSnapshot,
  DailyCashSnapshotStatus,
  TrafficLightStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const {
    balanceSummary,
    dashboard,
    dashboardDateRange,
    hydrated,
    role,
    transactions,
  } = useAppState();
  const [balanceDetailView, setBalanceDetailView] = useState<"live" | "closing" | null>(
    null,
  );

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
    () => normalizeTransactions(transactions),
    [transactions],
  );
  const financeView = useMemo(
    () =>
      buildDailyFinanceView(
        accountSeed,
        unifiedTransactions,
        snapshot,
        selectedDate,
      ),
    [selectedDate, snapshot, unifiedTransactions],
  );
  const liveAccountBalances = useMemo(
    () => getAllAccountBalances(accountSeed, unifiedTransactions),
    [unifiedTransactions],
  );
  const signalState = useMemo(
    () => buildSignals(financeView),
    [financeView],
  );
  const financeStatus = getFinanceStatus(signalState.signals);
  const selectedDateLabel = formatDate(`${selectedDate}T00:00:00+08:00`);
  const isSingleDayRange = dashboardDateRange.startDate === dashboardDateRange.endDate;
  const selectedRangeLabel = formatDashboardDateRangeLabel(
    dashboardDateRange.startDate,
    dashboardDateRange.endDate,
  );
  const netPerformanceLabel = isSingleDayRange ? "Today's Net" : "Net Profit";
  const liveBalanceStatus = getLiveBalanceStatus(balanceSummary?.liveStatus);
  const adsRatio =
    financeView.performance.sales === 0
      ? 0
      : (financeView.performance.growthExpense / financeView.performance.sales) * 100;
  const profitTone = getValueTone(financeView.performance.net);
  const closeDifferenceTone = getValueTone(financeView.balance.difference);
  const profitStatusBanner = getProfitStatusBanner(financeStatus);
  const profitInsight = getProfitInsight(
    financeStatus,
    financeView.performance.net,
    adsRatio,
  );
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
  if (role === "FINANCE") {
    return null;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="System status: operational"
        title="Command Center"
        description="A simpler view of the business: net profit, ad efficiency, expense mix, and whether it is safe to scale today."
        actions={
          <>
            <DashboardDateRangeSelector />
            <Button className="rounded-none border border-white bg-white px-5 text-xs font-semibold uppercase tracking-[0.22em] text-black hover:bg-white/90">
              Export report
            </Button>
            <Button
              variant="outline"
              className="rounded-none border-white/10 bg-transparent px-5 text-xs font-semibold uppercase tracking-[0.22em] text-white hover:bg-white/6"
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
        <div className="grid items-stretch gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => setBalanceDetailView("live")}
            className="h-full text-left"
          >
            <Card className="command-panel h-full min-h-[190px] transition hover:border-white/14 hover:bg-[#181818]">
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
            <Card className="command-panel h-full min-h-[190px] transition hover:border-white/14 hover:bg-[#181818]">
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
              "command-panel h-full min-h-[190px]",
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

      <section className="space-y-3">
        <SectionHeading
          eyebrow="Performance"
          title={isSingleDayRange ? "Daily performance" : "Range performance"}
          description="Sales, expense, and net outcome for the selected finance range."
        />
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="command-panel">
            <CardHeader className="pb-4">
              <div
                className={cn(
                  "rounded-[20px] border px-4 py-3",
                  profitStatusBanner.bannerClass,
                )}
              >
                <p className="text-sm font-semibold text-white">
                  {profitStatusBanner.label}
                </p>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-4 pt-2">
                <div>
                  <p className="command-label">{netPerformanceLabel}</p>
                  <CardTitle className={cn("mt-3 command-kpi", profitTone.valueClass)}>
                    {formatCompactCurrency(financeView.performance.net)}
                  </CardTitle>
                  <p className="mt-3 text-sm text-[#b7b7b7]">{profitInsight}</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-[#121212] px-4 py-3 text-right">
                  <p className="command-label">
                    {isSingleDayRange ? "Selected date" : "Selected range"}
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">{selectedRangeLabel}</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-[#9f9f9f]">
                {selectedRangeLabel} · ADS ratio {formatPercent(adsRatio)}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <TrendChart data={dashboard.trend} dense muted />
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <SummaryMetricCard
              label="Sales"
              value={formatCompactCurrency(financeView.performance.sales)}
              note="Income captured for the selected range."
            />
            <SummaryMetricCard
              label="Expense"
              value={formatCompactCurrency(financeView.performance.expense)}
              note="Spend captured for the selected range."
            />
            <SummaryMetricCard
              label="Net"
              value={formatCompactCurrency(financeView.performance.net)}
              note="Sales minus expense for the selected range."
              valueClass={profitTone.valueClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading
          eyebrow="Breakdown"
          title="Sales and expense detail"
          description="Where income is coming from and how expense is distributed today."
        />
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
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
                          {getChannelDisplayName(item.channel)}
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
                    No sales activity for the selected day.
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
              <ExpenseDonutChart data={dashboard.expenseBreakdown} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading
          eyebrow="Signals"
          title="What needs attention"
          description="Daily guardrails across reconciliation, ad efficiency, and financial risk."
        />
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="command-panel">
            <CardHeader>
              <CardTitle className="text-xl text-white">Health checks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
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
                    {formatPercent(adsRatio)}
                  </p>
                  <p className="mt-3 text-xs text-[#8f8f8f]">Keep below 40%</p>
                </div>
                <div className="border border-white/8 bg-[#121212] px-4 py-4">
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
      </section>
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
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="text-sm text-[#8f8f8f]">{description}</p>
    </div>
  );
}

function SummaryMetricCard({
  label,
  value,
  note,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  note: string;
  valueClass?: string;
}) {
  return (
    <Card className="command-panel">
      <CardHeader className="pb-3">
        <p className="command-label">{label}</p>
        <CardTitle className={cn("mt-3 text-3xl", valueClass)}>{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[#8f8f8f]">{note}</p>
      </CardContent>
    </Card>
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

function getProfitStatusBanner(status: TrafficLightStatus) {
  if (status === "RED") {
    return {
      label: "Unhealthy - High ad spend",
      bannerClass: "border-rose-500/20 bg-rose-500/10",
    };
  }

  if (status === "YELLOW") {
    return {
      label: "Watch closely - Efficiency needs work",
      bannerClass: "border-amber-500/20 bg-amber-500/10",
    };
  }

  return {
    label: "Healthy - Spend is under control",
    bannerClass: "border-emerald-500/20 bg-emerald-500/10",
  };
}

function getProfitInsight(
  status: "GREEN" | "YELLOW" | "RED",
  net: number,
  adsPercent: number,
) {
  if (status === "RED" && net > 0) {
    return "Profit is positive but pressured by ad spend.";
  }

  if (status === "RED") {
    return "Profit is under pressure and ad spend is too high.";
  }

  if (status === "YELLOW") {
    return `Profit is holding, but ${formatPercent(adsPercent)} in ads needs tighter control.`;
  }

  return "Profit looks healthy and spend remains under control.";
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

function getChannelDisplayName(channelId: string) {
  return getSourceDisplayName(channelId);
}

function getFinanceStatus(
  signals: Array<{ type: "info" | "warning" | "danger"; message: string }>,
): TrafficLightStatus {
  if (signals.some((signal) => signal.type === "danger")) {
    return "RED";
  }

  if (signals.some((signal) => signal.type === "warning")) {
    return "YELLOW";
  }

  return "GREEN";
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
