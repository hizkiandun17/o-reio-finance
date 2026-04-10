"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Eye, Paperclip } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/components/providers/app-state-provider";
import { TransactionProofDialog } from "@/components/transaction-proof-dialog";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getCategoryLabel,
  getExpenseGroupForCategory,
  getMainCategoryLabel,
} from "@/lib/business";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { getSourceDisplayName } from "@/lib/source-display";
import type {
  Category,
  EntryType,
  ExpenseGroup,
  Transaction,
  TransactionProof,
  VerificationStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type LedgerFilterState = {
  channelId: string;
  categoryId: string;
  verificationStatus: "all" | VerificationStatus;
  entryType: "all" | EntryType;
  currency: string;
};

const defaultFilters: LedgerFilterState = {
  channelId: "all",
  categoryId: "all",
  verificationStatus: "all",
  entryType: "all",
  currency: "all",
};

export default function TransactionsPage() {
  const { categories, categoryMap, channels, dashboard, transactions } =
    useAppState();
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<LedgerFilterState>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<LedgerFilterState>(defaultFilters);
  const [previewProof, setPreviewProof] = useState<TransactionProof | null>(null);
  const deferredQuery = useDeferredValue(query);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesQuery =
        deferredQuery.length === 0 ||
        transaction.description.toLowerCase().includes(deferredQuery.toLowerCase());
      const matchesChannel =
        appliedFilters.channelId === "all" ||
        transaction.channelId === appliedFilters.channelId;
      const matchesEntry =
        appliedFilters.entryType === "all" ||
        transaction.entryType === appliedFilters.entryType;
      const matchesCurrency =
        appliedFilters.currency === "all" ||
        transaction.originalCurrency === appliedFilters.currency;
      const matchesVerification =
        appliedFilters.verificationStatus === "all" ||
        transaction.verificationStatus === appliedFilters.verificationStatus;
      const matchesCategory =
        appliedFilters.categoryId === "all" ||
        transaction.categoryId === appliedFilters.categoryId;

      return (
        matchesQuery &&
        matchesChannel &&
        matchesEntry &&
        matchesCurrency &&
        matchesVerification &&
        matchesCategory
      );
    });
  }, [
    appliedFilters,
    deferredQuery,
    transactions,
  ]);

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.type === "INCOME" || Boolean(category.parentId))
        .sort((left, right) =>
          getCategoryLabel(left.id, categoryMap).localeCompare(
            getCategoryLabel(right.id, categoryMap),
          ),
        ),
    [categories, categoryMap],
  );

  const activeFilterBadges = useMemo(
    () => getActiveFilterBadges(appliedFilters, categoryMap),
    [appliedFilters, categoryMap],
  );

  const topTransactionThreshold = useMemo(() => {
    if (filteredTransactions.length === 0) {
      return null;
    }

    const sortedAmounts = [...filteredTransactions]
      .map((transaction) => transaction.baseAmount)
      .sort((left, right) => right - left);
    const topCount = Math.max(1, Math.ceil(sortedAmounts.length * 0.1));

    return sortedAmounts[topCount - 1] ?? null;
  }, [filteredTransactions]);

  const ledgerInsight = useMemo(
    () => getLedgerInsight(filteredTransactions, categoryMap),
    [categoryMap, filteredTransactions],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ledger view"
        title="Unified transaction stream"
        description="Inspect every auto-synced and manually entered movement with filtering for channel, verification, entry type, and currency."
      />

      <p className="text-sm text-[#b7b7b7]">{ledgerInsight}</p>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="surface-panel border-white/10">
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Transaction count</p>
            <CardTitle className="text-3xl">{filteredTransactions.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Filtered from the full omni-channel ledger.
          </CardContent>
        </Card>
        <Card className="surface-panel border-white/10">
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Scoped revenue</p>
            <CardTitle className="text-3xl">
              {formatCurrency(
                filteredTransactions
                  .filter((item) => item.kind === "INCOME")
                  .reduce((sum, item) => sum + item.baseAmount, 0),
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Includes manual FX conversions into IDR.
          </CardContent>
        </Card>
        <Card className="surface-panel border-white/10">
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Scoped expense</p>
            <CardTitle className="text-3xl">
              {formatCurrency(
                filteredTransactions
                  .filter((item) => item.kind === "EXPENSE")
                  .reduce((sum, item) => sum + item.baseAmount, 0),
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Ads share currently sits at {formatPercent(dashboard.metrics.adsPercent)}.
          </CardContent>
        </Card>
        <Card className="surface-panel border-white/10">
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Pending verification</p>
            <CardTitle className="text-3xl">
              {
                filteredTransactions.filter(
                  (item) => item.verificationStatus === "PENDING",
                ).length
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Manual items waiting on finance review.
          </CardContent>
        </Card>
      </div>

      <Card className="surface-panel border-white/10">
        <CardContent className="space-y-3 pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search description..."
              className="h-11 flex-1 rounded-2xl bg-background/60"
            />
            <Button
              variant="outline"
              className="h-11 rounded-2xl border-white/10 bg-background/60 px-4 text-white hover:bg-white/6"
              onClick={() => {
                setDraftFilters(appliedFilters);
                setFiltersOpen(true);
              }}
            >
              Filters
              {activeFilterBadges.length > 0 ? ` (${activeFilterBadges.length})` : ""}
            </Button>
          </div>

          {activeFilterBadges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {activeFilterBadges.map((badge) => (
                <Badge
                  key={badge.label}
                  variant="outline"
                  className="rounded-full border-white/10 bg-background/60 text-[#cfcfcf]"
                >
                  {badge.label}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="surface-panel border-white/10">
        <CardHeader>
          <CardTitle className="text-2xl">Transactions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/8">
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>FX Rate</TableHead>
                  <TableHead>Base Amount</TableHead>
                  <TableHead>Verification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => {
                  const expenseGroup =
                    transaction.kind === "EXPENSE"
                      ? getExpenseGroupForCategory(transaction.categoryId, categoryMap)
                      : null;
                  const groupTone = getExpenseGroupTone(expenseGroup);
                  const isLargeTransaction =
                    topTransactionThreshold !== null &&
                    transaction.baseAmount >= topTransactionThreshold;

                  return (
                    <TableRow
                      key={transaction.id}
                      className={cn(
                        "border-white/8",
                        isLargeTransaction && "bg-white/[0.03]",
                      )}
                    >
                      <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                      <TableCell className="min-w-[280px]">
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/transactions/detail?transactionId=${encodeURIComponent(transaction.id)}`}
                              className="font-medium text-white transition hover:text-[#d6d6d6]"
                            >
                              {transaction.description}
                            </Link>
                            {transaction.proof ? (
                              <button
                                type="button"
                                onClick={() => setPreviewProof(transaction.proof ?? null)}
                                className="inline-flex size-6 items-center justify-center rounded-full border border-white/10 text-[#d6d6d6] transition hover:bg-white/6 hover:text-white"
                                aria-label={`View proof for ${transaction.description}`}
                              >
                                <Paperclip className="size-3.5" />
                              </button>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{transaction.kind}</span>
                            {transaction.proof ? (
                              <button
                                type="button"
                                onClick={() => setPreviewProof(transaction.proof ?? null)}
                                className="inline-flex items-center gap-1 text-[#d6d6d6] transition hover:text-white"
                              >
                                <Eye className="size-3" />
                                Proof attached
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getSourceDisplayName(transaction.channelId)}</TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <span
                            className={cn("mt-1.5 size-2 rounded-full", groupTone.dotClass)}
                          />
                          <div>
                            <p className="font-medium text-white">
                              {getCategoryLabel(transaction.categoryId, categoryMap)}
                            </p>
                            {expenseGroup ? (
                              <p className={cn("mt-1 text-xs", groupTone.textClass)}>
                                {getMainCategoryLabel(expenseGroup)}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-muted-foreground">Income</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full border-white/10">
                          {transaction.entryType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(
                          transaction.amount,
                          transaction.originalCurrency,
                          transaction.originalCurrency === "IDR" ? 0 : 2,
                        )}
                      </TableCell>
                      <TableCell>{transaction.exchangeRate.toLocaleString("en-ID")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isLargeTransaction ? (
                            <span className="size-1.5 rounded-full bg-white/45" />
                          ) : null}
                          <span className={cn(isLargeTransaction && "font-medium text-white")}>
                            {formatCurrency(transaction.baseAmount)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            transaction.verificationStatus === "VERIFIED"
                              ? "rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                              : "rounded-full border-amber-500/20 bg-amber-500/10 text-amber-300"
                          }
                        >
                          {transaction.verificationStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="border-white/10 bg-[#151515] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Filters</DialogTitle>
            <DialogDescription>
              Narrow the ledger with optional filters. Search stays separate so it is always fast to reach.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Channel</p>
              <Select
                value={draftFilters.channelId}
                onValueChange={(value) =>
                  value && setDraftFilters((current) => ({ ...current, channelId: value }))
                }
              >
                <SelectTrigger className="h-10 w-full rounded-2xl bg-[#121212]">
                  <SelectValue placeholder="All channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All channels</SelectItem>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Category</p>
              <Select
                value={draftFilters.categoryId}
                onValueChange={(value) =>
                  value && setDraftFilters((current) => ({ ...current, categoryId: value }))
                }
              >
                <SelectTrigger className="h-10 w-full rounded-2xl bg-[#121212]">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {getCategoryLabel(category.id, categoryMap)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Status</p>
              <Select
                value={draftFilters.verificationStatus}
                onValueChange={(value) =>
                  value &&
                  setDraftFilters((current) => ({
                    ...current,
                    verificationStatus: value as LedgerFilterState["verificationStatus"],
                  }))
                }
              >
                <SelectTrigger className="h-10 w-full rounded-2xl bg-[#121212]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="VERIFIED">Verified</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Entry Type</p>
              <Select
                value={draftFilters.entryType}
                onValueChange={(value) =>
                  value &&
                  setDraftFilters((current) => ({
                    ...current,
                    entryType: value as LedgerFilterState["entryType"],
                  }))
                }
              >
                <SelectTrigger className="h-10 w-full rounded-2xl bg-[#121212]">
                  <SelectValue placeholder="All entry types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entry types</SelectItem>
                  <SelectItem value="AUTO">Auto</SelectItem>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <p className="text-sm text-muted-foreground">Currency</p>
              <Select
                value={draftFilters.currency}
                onValueChange={(value) =>
                  value && setDraftFilters((current) => ({ ...current, currency: value }))
                }
              >
                <SelectTrigger className="h-10 w-full rounded-2xl bg-[#121212]">
                  <SelectValue placeholder="All currencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All currencies</SelectItem>
                  <SelectItem value="IDR">IDR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="SGD">SGD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="border-white/10 bg-[#121212]">
            <Button
              variant="outline"
              className="rounded-none border-white/10 bg-transparent text-white hover:bg-white/6"
              onClick={() => setDraftFilters(defaultFilters)}
            >
              Reset
            </Button>
            <Button
              className="rounded-none border border-white bg-white text-black hover:bg-white/90"
              onClick={() => {
                setAppliedFilters(draftFilters);
                setFiltersOpen(false);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransactionProofDialog
        open={previewProof !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewProof(null);
          }
        }}
        proof={previewProof}
        title="Proof attachment"
        description="View or download the proof linked to this transaction."
      />
    </div>
  );
}

function getLedgerInsight(
  transactions: Transaction[],
  categoryMap: Record<string, Category>,
) {
  const expenses = transactions.filter((transaction) => transaction.kind === "EXPENSE");

  if (expenses.length === 0) {
    return "Current filters show no expense pressure in the ledger.";
  }

  const expenseGroupTotals = new Map<ExpenseGroup, number>();
  const expenseChannelTotals = new Map<string, number>();

  expenses.forEach((transaction) => {
    const group = getExpenseGroupForCategory(transaction.categoryId, categoryMap);
    if (group) {
      expenseGroupTotals.set(
        group,
        (expenseGroupTotals.get(group) ?? 0) + transaction.baseAmount,
      );
    }

    expenseChannelTotals.set(
      transaction.channelId,
      (expenseChannelTotals.get(transaction.channelId) ?? 0) + transaction.baseAmount,
    );
  });

  const topExpenseGroup = [...expenseGroupTotals.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0];
  const topExpenseChannel = [...expenseChannelTotals.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0];

  if (!topExpenseGroup || !topExpenseChannel) {
    return "Expense activity is limited in the current ledger view.";
  }

  const totalExpense = expenses.reduce((sum, transaction) => sum + transaction.baseAmount, 0);
  const share = totalExpense === 0 ? 0 : (topExpenseGroup[1] / totalExpense) * 100;

  return `Most expenses are in ${getMainCategoryLabel(topExpenseGroup[0])} (${formatPercent(share)}), mainly from ${getSourceDisplayName(topExpenseChannel[0])}.`;
}

function getActiveFilterBadges(
  filters: LedgerFilterState,
  categoryMap: Record<string, Category>,
) {
  const badges: { label: string }[] = [];

  if (filters.channelId !== "all") {
    badges.push({
      label: `Channel: ${getSourceDisplayName(filters.channelId)}`,
    });
  }

  if (filters.categoryId !== "all") {
    badges.push({
      label: `Category: ${getCategoryLabel(filters.categoryId, categoryMap)}`,
    });
  }

  if (filters.verificationStatus !== "all") {
    badges.push({
      label: `Status: ${filters.verificationStatus === "PENDING" ? "Pending" : "Verified"}`,
    });
  }

  if (filters.entryType !== "all") {
    badges.push({
      label: `Entry: ${filters.entryType === "AUTO" ? "Auto" : "Manual"}`,
    });
  }

  if (filters.currency !== "all") {
    badges.push({
      label: `Currency: ${filters.currency}`,
    });
  }

  return badges;
}

function getExpenseGroupTone(group: ExpenseGroup | undefined | null) {
  if (group === "GROWTH") {
    return {
      dotClass: "bg-[#6f9c7b]",
      textClass: "text-[#8fb79a]",
    };
  }

  if (group === "COST") {
    return {
      dotClass: "bg-[#6a85a6]",
      textClass: "text-[#8ea4bf]",
    };
  }

  if (group === "OVERHEAD") {
    return {
      dotClass: "bg-[#b4875b]",
      textClass: "text-[#c39d79]",
    };
  }

  return {
    dotClass: "bg-white/20",
    textClass: "text-muted-foreground",
  };
}
