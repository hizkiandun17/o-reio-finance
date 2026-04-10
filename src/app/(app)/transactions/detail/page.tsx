"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Paperclip } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/components/providers/app-state-provider";
import { TransactionProofDialog } from "@/components/transaction-proof-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllAccountBalances } from "@/lib/balance-breakdown";
import { normalizeTransactions } from "@/lib/business";
import { formatCurrency, formatDate } from "@/lib/format";
import { accounts as accountSeed } from "@/lib/mock-data";
import { getSourceDisplayName } from "@/lib/source-display";
import type { Account, TransactionProof, UnifiedTransaction } from "@/lib/types";
import { getTransactionsByAccount } from "@/lib/unified-transactions";
import { cn } from "@/lib/utils";

export default function TransactionDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[22px] border border-white/8 bg-[#121212] px-4 py-4 text-sm text-[#8f8f8f]">
          Loading transaction detail...
        </div>
      }
    >
      <TransactionDetailContent />
    </Suspense>
  );
}

function TransactionDetailContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get("transactionId");
  const accountId = searchParams.get("accountId");
  const snapshotDate = searchParams.get("date");
  const { categoryMap, transactions } = useAppState();
  const [previewProof, setPreviewProof] = useState<TransactionProof | null>(null);

  const unifiedTransactions = useMemo(
    () => normalizeTransactions(transactions, categoryMap),
    [categoryMap, transactions],
  );
  const selectedAccount = useMemo(
    () => accountSeed.find((account) => account.id === accountId) ?? null,
    [accountId],
  );
  const selectedAccountBalance = useMemo(
    () =>
      accountId
        ? getAllAccountBalances(accountSeed, unifiedTransactions).find(
            ({ account }) => account.id === accountId,
          )?.balance ?? 0
        : null,
    [accountId, unifiedTransactions],
  );
  const selectedTransaction = useMemo(
    () =>
      transactionId
        ? unifiedTransactions.find((transaction) => transaction.id === transactionId) ?? null
        : null,
    [transactionId, unifiedTransactions],
  );
  const scopedTransactions = useMemo(() => {
    if (selectedTransaction) {
      return [selectedTransaction];
    }

    if (!accountId) {
      return [];
    }

    const accountTransactions = getTransactionsByAccount(unifiedTransactions, accountId);

    if (!snapshotDate) {
      return accountTransactions;
    }

    return accountTransactions.filter(
      (transaction) => transaction.transaction_date.split("T")[0] === snapshotDate,
    );
  }, [accountId, selectedTransaction, snapshotDate, unifiedTransactions]);

  const pageTitle = selectedTransaction
    ? "Transaction detail"
    : selectedAccount
      ? `${selectedAccount.name} transactions`
      : "Transaction detail";
  const pageDescription = selectedTransaction
    ? "A synced view of the unified transaction record, account context, proof, status, and category."
    : snapshotDate
      ? "Transactions affecting this account during the selected closing snapshot date."
      : "Transactions affecting this account from the unified transaction source.";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ledger detail"
        title={pageTitle}
        description={pageDescription}
        actions={
          <Link
            href="/transactions"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-none border border-white/10 bg-transparent px-5 text-xs font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-white/6"
          >
            <ArrowLeft className="size-4" />
            Back to ledger
          </Link>
        }
      />

      <DetailContextCard
        account={selectedAccount}
        accountBalance={selectedAccountBalance}
        date={snapshotDate}
        transactionId={transactionId}
      />

      <Card className="command-panel">
        <CardHeader className="border-b border-white/8 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="command-label">Synced transaction source</p>
              <CardTitle className="mt-2 text-2xl text-white">
                {scopedTransactions.length} record{scopedTransactions.length === 1 ? "" : "s"}
              </CardTitle>
            </div>
            {snapshotDate ? (
              <Badge variant="outline" className="rounded-full border-white/10 text-[#cfcfcf]">
                Snapshot date {formatDate(`${snapshotDate}T00:00:00+07:00`)}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {scopedTransactions.length > 0 ? (
            scopedTransactions.map((transaction) => (
              <TransactionDetailCard
                key={transaction.id}
                contextAccountId={accountId}
                onPreviewProof={setPreviewProof}
                transaction={transaction}
              />
            ))
          ) : (
            <div className="rounded-[20px] border border-white/8 bg-[#121212] px-4 py-4 text-sm text-[#8f8f8f]">
              No matching unified transactions were found for this detail link.
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionProofDialog
        open={Boolean(previewProof)}
        proof={previewProof}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewProof(null);
          }
        }}
      />
    </div>
  );
}

function DetailContextCard({
  account,
  accountBalance,
  date,
  transactionId,
}: {
  account: Account | null;
  accountBalance: number | null;
  date: string | null;
  transactionId: string | null;
}) {
  return (
    <Card className="command-panel">
      <CardContent className="grid gap-4 pt-4 md:grid-cols-3">
        <ContextItem label="Open mode" value={transactionId ? "Transaction ID" : "Account context"} />
        <ContextItem
          label="Account"
          value={account ? `${account.name} · ${account.currency}` : "Not scoped"}
        />
        <ContextItem
          label="Date context"
          value={date ? formatDate(`${date}T00:00:00+07:00`) : "All dates"}
        />
        {accountBalance !== null ? (
          <ContextItem label="Live account balance" value={formatCurrency(accountBalance)} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-[#121212] px-4 py-4">
      <p className="command-label">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function TransactionDetailCard({
  contextAccountId,
  onPreviewProof,
  transaction,
}: {
  contextAccountId: string | null;
  onPreviewProof: (proof: TransactionProof) => void;
  transaction: UnifiedTransaction;
}) {
  const signedAmount = contextAccountId
    ? getSignedAmountForAccount(transaction, contextAccountId)
    : transaction.type === "expense"
      ? -transaction.base_amount
      : transaction.base_amount;

  return (
    <div className="rounded-[22px] border border-white/8 bg-[#121212] px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-white">{transaction.description}</h2>
            <Badge
              variant="outline"
              className={cn(
                "rounded-full",
                transaction.status === "verified"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-300",
              )}
            >
              {transaction.status}
            </Badge>
            <Badge variant="outline" className="rounded-full border-white/10 text-[#cfcfcf]">
              {transaction.origin}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-[#8f8f8f]">
            {formatDate(transaction.transaction_date)} · {getTransactionActivityLabel(transaction, contextAccountId)}
          </p>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "text-xl font-semibold",
              signedAmount > 0
                ? "text-emerald-300"
                : signedAmount < 0
                  ? "text-rose-300"
                  : "text-white",
            )}
          >
            {formatSignedCurrency(signedAmount)}
          </p>
          <p className="mt-1 text-xs text-[#8f8f8f]">IDR base impact</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <DetailField label="Transaction ID" value={transaction.id} />
        <DetailField label="Type" value={transaction.type} />
        <DetailField label="Account" value={getSourceDisplayName(transaction.account_id)} />
        <DetailField
          label="Target account"
          value={transaction.target_account_id ? getSourceDisplayName(transaction.target_account_id) : "None"}
        />
        <DetailField label="Channel" value={transaction.channel ? getSourceDisplayName(transaction.channel) : "None"} />
        <DetailField
          label="Category"
          value={
            transaction.category_name
              ? `${transaction.category_name} · ${transaction.category_group ?? "uncategorized"}`
              : "Income / uncategorized"
          }
        />
        <DetailField
          label="Original amount"
          value={formatCurrency(
            transaction.amount,
            transaction.original_currency,
            transaction.original_currency === "IDR" ? 0 : 2,
          )}
        />
        <DetailField label="Exchange rate" value={transaction.exchange_rate.toLocaleString("en-ID")} />
        <DetailField label="Base amount" value={formatCurrency(transaction.base_amount)} />
        <DetailField label="Logged by" value={transaction.logged_by ?? "System"} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
        <div>
          <p className="command-label">Proof</p>
          <p className="mt-1 text-sm text-[#8f8f8f]">
            {transaction.proof ? transaction.proof.name : "No proof attached"}
          </p>
        </div>
        {transaction.proof ? (
          <Button
            variant="outline"
            className="rounded-none border-white/10 bg-transparent text-white hover:bg-white/6"
            onClick={() => onPreviewProof(transaction.proof as TransactionProof)}
          >
            <Paperclip className="size-4" />
            View proof
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-white/8 bg-black/10 px-3 py-3">
      <p className="text-xs font-semibold tracking-[0.18em] text-[#8f8f8f] uppercase">
        {label}
      </p>
      <p className="mt-2 break-words text-sm text-white">{value}</p>
    </div>
  );
}

function getSignedAmountForAccount(
  transaction: UnifiedTransaction,
  accountId: string,
) {
  if (transaction.type === "income") {
    return transaction.account_id === accountId ? transaction.base_amount : 0;
  }

  if (transaction.type === "expense") {
    return transaction.account_id === accountId ? -transaction.base_amount : 0;
  }

  if (transaction.account_id === accountId) {
    return -transaction.base_amount;
  }

  if (transaction.target_account_id === accountId) {
    return transaction.base_amount;
  }

  return 0;
}

function getTransactionActivityLabel(
  transaction: UnifiedTransaction,
  accountId: string | null,
) {
  if (!accountId) {
    return transaction.type;
  }

  if (transaction.type === "transfer") {
    return transaction.account_id === accountId ? "Transfer out" : "Transfer in";
  }

  if (transaction.type === "income") {
    return "Income";
  }

  return "Expense";
}

function formatSignedCurrency(value: number) {
  if (value === 0) {
    return formatCurrency(0);
  }

  return `${value > 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`;
}
