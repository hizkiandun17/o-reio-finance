"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, PencilLine, Trash2 } from "lucide-react";

import { getCategoryLabel } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/components/providers/app-state-provider";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getSourceDisplayName } from "@/lib/source-display";
import type { Currency, Transaction, TransactionKind } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EditFormState {
  transactionId: string;
  description: string;
  amount: string;
  originalCurrency: Currency;
  exchangeRate: string;
  transactionDate: string;
  kind: TransactionKind;
  categoryId: string;
  channelId: string;
}

function createEditFormState(transaction: Transaction): EditFormState {
  return {
    transactionId: transaction.id,
    description: transaction.description,
    amount: String(transaction.amount),
    originalCurrency: transaction.originalCurrency,
    exchangeRate: String(transaction.exchangeRate),
    transactionDate: transaction.transactionDate.split("T")[0] ?? transaction.transactionDate,
    kind: transaction.kind,
    categoryId: transaction.categoryId,
    channelId: transaction.channelId,
  };
}

export default function ReconciliationPage() {
  const {
    categories,
    categoryMap,
    channels,
    reconciliationSummary,
    role,
    transactions,
    verifyTransaction,
    updateTransaction,
    removeTransaction,
  } = useAppState();
  const canVerify = role !== "OPS_MANAGER";
  const canManageTransactions = role !== "OPS_MANAGER";
  const [editingTransaction, setEditingTransaction] = useState<EditFormState | null>(null);
  const [transactionToRemove, setTransactionToRemove] = useState<Transaction | null>(null);
  const statusInsight =
    reconciliationSummary.pendingCount === 0
      ? "All visible transactions are verified and today’s balance can be trusted."
      : `${reconciliationSummary.pendingCount} transactions still need verification before today’s balance is fully trusted.`;

  const ledgerRows = transactions
    .slice()
    .sort((left, right) => {
      if (left.verificationStatus !== right.verificationStatus) {
        return left.verificationStatus === "PENDING" ? -1 : 1;
      }

      return right.transactionDate.localeCompare(left.transactionDate);
    })
    .slice(0, 8);

  const totalVolume = transactions.reduce((sum, transaction) => sum + transaction.baseAmount, 0);
  const verifiedAmount = transactions
    .filter((transaction) => transaction.verificationStatus === "VERIFIED")
    .reduce((sum, transaction) => sum + transaction.baseAmount, 0);
  const pendingAmount = transactions
    .filter((transaction) => transaction.verificationStatus === "PENDING")
    .reduce((sum, transaction) => sum + transaction.baseAmount, 0);

  const editableCategoryOptions = useMemo(() => {
    if (!editingTransaction) {
      return [];
    }

    return categories.filter(
      (category) =>
        category.type === editingTransaction.kind &&
        (editingTransaction.kind === "INCOME" ? !category.parentId : Boolean(category.parentId)),
    );
  }, [categories, editingTransaction]);

  const numericEditAmount = Number(editingTransaction?.amount ?? 0);
  const numericEditRate =
    editingTransaction?.originalCurrency === "IDR"
      ? 1
      : Number(editingTransaction?.exchangeRate ?? 0);

  function openEditDialog(transaction: Transaction) {
    setEditingTransaction(createEditFormState(transaction));
  }

  function handleEditKindChange(nextKind: TransactionKind) {
    setEditingTransaction((current) => {
      if (!current) {
        return current;
      }

      const nextCategory = categories.find(
        (category) =>
          category.type === nextKind &&
          (nextKind === "INCOME" ? !category.parentId : Boolean(category.parentId)),
      );

      return {
        ...current,
        kind: nextKind,
        categoryId: nextCategory?.id ?? current.categoryId,
      };
    });
  }

  function handleSaveTransaction() {
    if (!editingTransaction) {
      return;
    }

    updateTransaction(editingTransaction.transactionId, {
      description: editingTransaction.description.trim(),
      amount: numericEditAmount,
      originalCurrency: editingTransaction.originalCurrency,
      exchangeRate: numericEditRate,
      transactionDate: editingTransaction.transactionDate,
      kind: editingTransaction.kind,
      categoryId: editingTransaction.categoryId,
      channelId: editingTransaction.channelId,
    });
    setEditingTransaction(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Ledger overview"
        title="Reconciliation"
        description="See what is verified, what is still pending, and which entries need finance action before the numbers are trusted."
        actions={
          <Link href="/manual-inputs">
            <Button className="rounded-none border border-white bg-white px-5 text-xs font-semibold uppercase tracking-[0.22em] text-black hover:bg-white/90">
              Manual Entry
            </Button>
          </Link>
        }
      />

      <p
        className={cn(
          "text-sm",
          reconciliationSummary.pendingCount > 0 ? "text-amber-300" : "text-[#b7b7b7]",
        )}
      >
        {statusInsight}
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="command-panel">
          <CardHeader>
            <p className="command-label">Total volume</p>
            <CardTitle className="mt-4 text-5xl text-white">
              {formatCurrency(totalVolume)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="command-panel">
          <CardHeader>
            <p className="command-label">Verified</p>
            <CardTitle className="mt-4 text-5xl text-white">
              {formatCurrency(verifiedAmount)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="command-panel">
          <CardHeader>
            <p className="command-label">Pending</p>
            <CardTitle className="mt-4 text-5xl text-white">
              {formatCurrency(pendingAmount)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="command-panel">
        <CardHeader>
          <div className="grid gap-4 md:grid-cols-[180px_1.2fr_180px_180px_176px]">
            <p className="command-label">Date & time</p>
            <p className="command-label">Transaction details</p>
            <p className="command-label">Channel</p>
            <p className="command-label">Amount</p>
            <p className="command-label text-left md:text-right">Action</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-0">
          {ledgerRows.map((transaction) => (
            <div
              key={transaction.id}
              className={cn(
                "grid gap-4 border-t py-5 md:grid-cols-[180px_1.2fr_180px_180px_176px]",
                transaction.verificationStatus === "PENDING"
                  ? "border-amber-500/18 bg-amber-500/[0.04]"
                  : "border-white/8",
              )}
            >
              <div>
                <p className="font-medium text-white">
                  {formatDateTime(transaction.transactionDate, "dd MMM yyyy")}
                </p>
                <p className="mt-1 text-sm text-[#8f8f8f]">
                  {formatDateTime(transaction.transactionDate, "HH:mm:ss")}
                </p>
              </div>

              <div>
                <p className="font-medium text-white">{transaction.description}</p>
                <div className="mt-1 flex items-center gap-2 text-sm text-[#8f8f8f]">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      transaction.verificationStatus === "VERIFIED"
                        ? "bg-white"
                        : "bg-amber-300",
                    )}
                  />
                  <span
                    className={cn(
                      transaction.verificationStatus === "PENDING" && "text-amber-200",
                    )}
                  >
                    {transaction.verificationStatus === "VERIFIED"
                      ? "Verified"
                      : "Pending"}{" "}
                    · {transaction.entryType}
                  </span>
                </div>
              </div>

              <div className="flex items-center">
                <Badge
                  variant="outline"
                  className="rounded-none border-white/10 bg-[#1b1b1b] text-[11px] uppercase tracking-[0.18em] text-[#d8d8d8]"
                >
                  {getSourceDisplayName(transaction.channelId)}
                </Badge>
              </div>

              <div className="flex items-center">
                <p className="font-medium text-white">{formatCurrency(transaction.baseAmount)}</p>
              </div>

              <div className="flex items-center md:justify-end">
                <div className="flex items-center gap-2">
                  {transaction.verificationStatus === "PENDING" ? (
                    <Button
                      onClick={() => verifyTransaction(transaction.id)}
                      disabled={!canVerify}
                      variant="outline"
                      className="rounded-none border-amber-500/30 bg-amber-500/10 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100 hover:bg-amber-500/15"
                    >
                      Verify now
                    </Button>
                  ) : (
                    <span className="text-xs uppercase tracking-[0.18em] text-[#8f8f8f]">
                      Complete
                    </span>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      disabled={!canManageTransactions}
                      className="inline-flex size-8 items-center justify-center rounded-none border border-white/10 bg-[#151515] text-[#8f8f8f] transition hover:border-white/18 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`More actions for ${transaction.description}`}
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-48 rounded-none border border-white/10 bg-[#151515] p-1 text-white"
                    >
                      <DropdownMenuItem
                        className="rounded-none px-2 py-2 text-sm text-white focus:bg-white/6 focus:text-white"
                        onClick={() => openEditDialog(transaction)}
                      >
                        <PencilLine className="size-4" />
                        Edit transaction
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/8" />
                      <DropdownMenuItem
                        variant="destructive"
                        className="rounded-none px-2 py-2 text-sm focus:bg-red-500/10"
                        onClick={() => setTransactionToRemove(transaction)}
                      >
                        <Trash2 className="size-4" />
                        Remove transaction
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-[#8f8f8f]">
        <span>
          {reconciliationSummary.pendingCount} pending entries remain
        </span>
        <span>{reconciliationSummary.completeness.toFixed(0)}% complete</span>
      </div>

      <Dialog
        open={editingTransaction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTransaction(null);
          }
        }}
      >
        <DialogContent className="border-white/10 bg-[#151515] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
            <DialogDescription>
              Saving changes will move this transaction back to pending verification so reconciliation stays accurate.
            </DialogDescription>
          </DialogHeader>

          {editingTransaction ? (
            <div className="grid gap-4 py-2">
              <div className="rounded-none border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-100">
                Editing affects reconciliation state. Save only after confirming the amount, category, and channel.
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="command-label">Flow</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["INCOME", "EXPENSE"] as TransactionKind[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleEditKindChange(option)}
                        className={cn(
                          "border px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition",
                          editingTransaction.kind === option
                            ? "border-white bg-white text-black"
                            : "border-white/10 bg-transparent text-white hover:bg-white/6",
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="command-label">Transaction date</label>
                  <Input
                    type="date"
                    value={editingTransaction.transactionDate}
                    onChange={(event) =>
                      setEditingTransaction((current) =>
                        current
                          ? { ...current, transactionDate: event.target.value }
                          : current,
                      )
                    }
                    className="h-12 rounded-none border-white/10 bg-[#121212] text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="command-label">Amount</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingTransaction.amount}
                    onChange={(event) =>
                      setEditingTransaction((current) =>
                        current ? { ...current, amount: event.target.value } : current,
                      )
                    }
                    className="h-12 rounded-none border-white/10 bg-[#121212] text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="command-label">Original currency</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["USD", "SGD", "IDR"] as Currency[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setEditingTransaction((current) =>
                            current
                              ? {
                                  ...current,
                                  originalCurrency: option,
                                  exchangeRate: option === "IDR" ? "1" : current.exchangeRate,
                                }
                              : current,
                          )
                        }
                        className={cn(
                          "border px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition",
                          editingTransaction.originalCurrency === option
                            ? "border-white bg-white text-black"
                            : "border-white/10 bg-transparent text-white hover:bg-white/6",
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="command-label">Exchange rate</label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={editingTransaction.originalCurrency === "IDR" ? "1" : editingTransaction.exchangeRate}
                    onChange={(event) =>
                      setEditingTransaction((current) =>
                        current
                          ? { ...current, exchangeRate: event.target.value }
                          : current,
                      )
                    }
                    disabled={editingTransaction.originalCurrency === "IDR"}
                    className="h-12 rounded-none border-white/10 bg-[#121212] text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="command-label">Channel</label>
                  <Select
                    value={editingTransaction.channelId}
                    onValueChange={(value) =>
                      value &&
                      setEditingTransaction((current) =>
                        current ? { ...current, channelId: value } : current,
                      )
                    }
                  >
                    <SelectTrigger className="h-12 rounded-none border-white/10 bg-[#121212] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border border-white/10 bg-[#151515] text-white">
                      {channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
                <div className="space-y-2">
                  <label className="command-label">Category</label>
                  <Select
                    value={editingTransaction.categoryId}
                    onValueChange={(value) =>
                      value &&
                      setEditingTransaction((current) =>
                        current ? { ...current, categoryId: value } : current,
                      )
                    }
                  >
                    <SelectTrigger className="h-12 rounded-none border-white/10 bg-[#121212] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border border-white/10 bg-[#151515] text-white">
                      {editableCategoryOptions.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {getCategoryLabel(category.id, categoryMap)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="command-label">Description</label>
                  <Textarea
                    value={editingTransaction.description}
                    onChange={(event) =>
                      setEditingTransaction((current) =>
                        current
                          ? { ...current, description: event.target.value }
                          : current,
                      )
                    }
                    className="min-h-28 rounded-none border-white/10 bg-[#121212] text-white"
                  />
                </div>
              </div>

              <div className="border border-white/8 bg-[linear-gradient(90deg,#181818,transparent)] px-4 py-4">
                <p className="command-label">Updated base amount</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  {formatCurrency(
                    editingTransaction.originalCurrency === "IDR"
                      ? numericEditAmount
                      : Math.round(numericEditAmount * numericEditRate),
                  )}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#8f8f8f]">
                  Save reopens verification
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter className="border-white/10 bg-[#121212]">
            <Button
              variant="outline"
              className="rounded-none border-white/10 bg-transparent text-white hover:bg-white/6"
              onClick={() => setEditingTransaction(null)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-none border border-white bg-white text-black hover:bg-white/90"
              disabled={
                !editingTransaction ||
                editingTransaction.description.trim().length === 0 ||
                numericEditAmount <= 0 ||
                (editingTransaction.originalCurrency !== "IDR" && numericEditRate <= 0)
              }
              onClick={handleSaveTransaction}
            >
              Save and reopen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={transactionToRemove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTransactionToRemove(null);
          }
        }}
      >
        <DialogContent className="border-white/10 bg-[#151515] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Remove transaction</DialogTitle>
            <DialogDescription>
              This will immediately change reconciliation totals and remove the transaction from the visible ledger.
            </DialogDescription>
          </DialogHeader>

          {transactionToRemove ? (
            <div className="rounded-none border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-100">
              <p className="font-medium text-white">{transactionToRemove.description}</p>
              <p className="mt-2 text-red-100/90">
                {formatCurrency(transactionToRemove.baseAmount)} ·{" "}
                {getSourceDisplayName(transactionToRemove.channelId)}
              </p>
              <p className="mt-2 text-red-100/90">
                Confirm removal only if this entry should no longer affect reconciliation.
              </p>
            </div>
          ) : null}

          <DialogFooter className="border-white/10 bg-[#121212]">
            <Button
              variant="outline"
              className="rounded-none border-white/10 bg-transparent text-white hover:bg-white/6"
              onClick={() => setTransactionToRemove(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-none border border-red-500/20"
              onClick={() => {
                if (!transactionToRemove) {
                  return;
                }

                removeTransaction(transactionToRemove.id);
                setTransactionToRemove(null);
              }}
            >
              Remove transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
