"use client";

import Image from "next/image";
import { Fragment, startTransition, useMemo, useRef, useState } from "react";
import { Download, FileText, ImageIcon, Paperclip, Upload, X } from "lucide-react";

import {
  getManualExpenseGroupLabel,
  MANUAL_EXPENSE_GROUP_OPTIONS,
} from "@/lib/business";
import { accounts as accountSeed } from "@/lib/mock-data";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/components/providers/app-state-provider";
import { TransactionProofDialog } from "@/components/transaction-proof-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/format";
import { getSourceDisplayName } from "@/lib/source-display";
import type {
  Account,
  AccountGroup,
  Currency,
  ExpenseGroup,
  TransactionKind,
  TransactionProof,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const PROOF_ACCEPT = "image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf";
const SUPPORTED_PROOF_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

export default function ManualInputsPage() {
  const { addManualEntry, categories, categoryMap, role, transactions } = useAppState();
  const canSubmit = role !== "OPS_MANAGER";
  const proofInputRef = useRef<HTMLInputElement | null>(null);

  const [kind, setKind] = useState<TransactionKind>("INCOME");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [exchangeRate, setExchangeRate] = useState("16100");
  const [accountId, setAccountId] = useState("pingpong");
  const [categoryId, setCategoryId] = useState("cat_income_shopify");
  const [expenseSelection, setExpenseSelection] = useState<{
    group: ExpenseGroup;
    category: string;
  }>({
    group: "GROWTH",
    category: "Online Ads",
  });
  const [transactionDate, setTransactionDate] = useState("2026-04-01");
  const [submitted, setSubmitted] = useState(false);
  const [proof, setProof] = useState<TransactionProof | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [isDraggingProof, setIsDraggingProof] = useState(false);
  const [previewProof, setPreviewProof] = useState<TransactionProof | null>(null);

  const categoryOptions = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.type === kind &&
          (kind === "INCOME" ? !category.parentId : Boolean(category.parentId)),
      ),
    [categories, kind],
  );

  const expenseGroupOptions = useMemo(
    () =>
      MANUAL_EXPENSE_GROUP_OPTIONS.filter((option) =>
        option.items.some((item) => categoryMap[item.id]),
      ),
    [categoryMap],
  );

  const selectedExpenseGroupOption = useMemo(
    () => expenseGroupOptions.find((option) => option.group === expenseSelection.group),
    [expenseGroupOptions, expenseSelection.group],
  );

  const selectedExpenseCategoryId = useMemo(
    () =>
      selectedExpenseGroupOption?.items.find(
        (item) => item.label === expenseSelection.category,
      )?.id ?? selectedExpenseGroupOption?.items[0]?.id ?? null,
    [expenseSelection.category, selectedExpenseGroupOption],
  );
  const selectedAccount = useMemo(
    () => accountSeed.find((account) => account.id === accountId) ?? null,
    [accountId],
  );
  const groupedAccounts = useMemo(
    () => getAccountDropdownGroups(accountSeed),
    [],
  );

  const numericAmount = Number(amount || 0);
  const numericRate = currency === "IDR" ? 1 : Number(exchangeRate || 0);
  const convertedAmount =
    currency === "IDR" ? numericAmount : Math.round(numericAmount * numericRate);
  const formattedAmount = formatIndonesianNumberInput(amount);

  function handleKindChange(nextKind: TransactionKind) {
    setKind(nextKind);

    if (nextKind === "EXPENSE") {
      const defaultExpenseGroup = expenseGroupOptions[0];
      const defaultExpenseCategory = defaultExpenseGroup?.items[0];

      if (defaultExpenseGroup && defaultExpenseCategory) {
        setExpenseSelection({
          group: defaultExpenseGroup.group,
          category: defaultExpenseCategory.label,
        });
        setCategoryId(defaultExpenseCategory.id);
      }
      return;
    }

    const nextIncomeCategory = categories.find(
      (category) => category.type === "INCOME" && !category.parentId,
    );

    if (nextIncomeCategory) {
      setCategoryId(nextIncomeCategory.id);
    }
  }

  function handleExpenseGroupChange(nextGroup: string | null) {
    if (!nextGroup) {
      return;
    }

    const matchingGroup = expenseGroupOptions.find((option) => option.group === nextGroup);
    if (!matchingGroup) {
      return;
    }

    const nextCategory = matchingGroup.items[0];
    setExpenseSelection({
      group: matchingGroup.group,
      category: nextCategory?.label ?? "",
    });
    if (nextCategory) {
      setCategoryId(nextCategory.id);
    }
  }

  function handleExpenseCategoryChange(nextCategoryLabel: string | null) {
    if (!nextCategoryLabel) {
      return;
    }

    setExpenseSelection((current) => ({
      ...current,
      category: nextCategoryLabel,
    }));

    const nextCategoryId =
      selectedExpenseGroupOption?.items.find((item) => item.label === nextCategoryLabel)?.id ??
      null;

    if (nextCategoryId) {
      setCategoryId(nextCategoryId);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    startTransition(() => {
      const resolvedCategoryId =
        kind === "EXPENSE" ? selectedExpenseCategoryId ?? categoryId : categoryId;

      addManualEntry({
        description,
        amount: numericAmount,
        originalCurrency: currency,
        exchangeRate: numericRate,
        transactionDate,
        kind,
        categoryId: resolvedCategoryId,
        channelId: accountId,
        accountId,
        proof,
      });
      setSubmitted(true);
      setDescription("");
      setAmount("0");
      setProof(null);
      setProofError(null);
    });
  }

  async function applyProofFile(file: File | null) {
    if (!file) {
      return;
    }

    if (!SUPPORTED_PROOF_TYPES.has(file.type)) {
      setProofError("Use a JPG, PNG, or PDF file for proof.");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setProof({
      name: file.name,
      mimeType: file.type as TransactionProof["mimeType"],
      dataUrl,
      size: file.size,
    });
    setProofError(null);
  }

  function handleProofInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    void applyProofFile(event.target.files?.[0] ?? null);
  }

  function handleAmountChange(event: React.ChangeEvent<HTMLInputElement>) {
    const sanitized = event.target.value.replace(/\D/g, "");
    setAmount(sanitized);
  }

  function resetProofSelection() {
    setProof(null);
    setProofError(null);
    if (proofInputRef.current) {
      proofInputRef.current.value = "";
    }
  }

  const recentManualEntries = transactions
    .filter((item) => item.entryType === "MANUAL")
    .slice(0, 3);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Manual entry"
        title="New Transaction"
        description="Record non-BCA income or expense with a manual exchange rate, clear account selection, and an instant IDR conversion preview."
      />

      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="command-panel">
          <CardHeader>
            <CardTitle className="text-xl text-white">Entry form</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-7" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="command-label">Flow</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["INCOME", "EXPENSE"] as TransactionKind[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleKindChange(option)}
                        className={cn(
                          "border px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition",
                          kind === option
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
                    value={transactionDate}
                    onChange={(event) => setTransactionDate(event.target.value)}
                    className="h-12 rounded-none border-white/10 bg-[#121212] text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="command-label">Amount</label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm font-medium uppercase tracking-[0.22em] text-[#8f8f8f]">
                    {currency === "IDR" ? "Rp" : currency}
                  </span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formattedAmount}
                    onChange={handleAmountChange}
                    className="h-16 rounded-none border-white/10 bg-[#121212] pr-5 pl-16 text-left text-2xl font-semibold tabular-nums text-white"
                    disabled={!canSubmit}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="command-label">Original currency</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["USD", "SGD", "IDR"] as Currency[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setCurrency(option)}
                      className={cn(
                        "border px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition",
                        currency === option
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
                <label className="command-label">Manual exchange rate</label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={currency === "IDR" ? "1" : exchangeRate}
                  onChange={(event) => setExchangeRate(event.target.value)}
                  className="h-12 rounded-none border-white/10 bg-[#121212] text-white"
                  disabled={!canSubmit || currency === "IDR"}
                />
              </div>

              <div className="space-y-2">
                <label className="command-label">Account</label>
                <Select
                  value={accountId}
                  onValueChange={(value) => value && setAccountId(value)}
                >
                  <SelectTrigger className="h-14 w-full rounded-none border-white/10 bg-[#121212] px-4 text-white">
                    <SelectValue>
                      {selectedAccount ? getAccountOptionLabel(selectedAccount) : "Select account"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-none border border-white/10 bg-[#121212] p-2 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
                    {groupedAccounts.map((group, index) => (
                      <Fragment key={group.key}>
                        <SelectGroup>
                          <SelectLabel className="px-3 pt-3 pb-2 uppercase tracking-[0.18em] text-[#8f8f8f]">
                            {group.label}
                          </SelectLabel>
                          {group.items.map((account) => (
                            <SelectItem
                              key={account.id}
                              value={account.id}
                              className="rounded-none px-3 py-2.5"
                            >
                              <span className="flex min-w-0 flex-col items-start gap-1">
                                <span className="truncate text-sm font-medium text-white">
                                  {account.name}
                                </span>
                                <span className="text-xs tracking-[0.14em] text-[#8f8f8f] uppercase">
                                  {getAccountOptionMetaLabel(account)}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        {index < groupedAccounts.length - 1 ? (
                          <SelectSeparator className="mx-2 bg-white/6" />
                        ) : null}
                      </Fragment>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-[#8f8f8f]">
                  Select where this transaction happens
                </p>
              </div>

              <div className="space-y-2">
                <label className="command-label">Category</label>
                {kind === "EXPENSE" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.18em] text-[#8f8f8f]">
                        Group
                      </label>
                      <Select
                        value={expenseSelection.group}
                        onValueChange={handleExpenseGroupChange}
                      >
                        <SelectTrigger className="h-12 rounded-none border-white/10 bg-[#121212] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseGroupOptions.map((option) => (
                            <SelectItem key={option.group} value={option.group}>
                              {option.group} · {getManualExpenseGroupLabel(option.group)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.18em] text-[#8f8f8f]">
                        Category
                      </label>
                      <Select
                        value={expenseSelection.category}
                        onValueChange={handleExpenseCategoryChange}
                      >
                        <SelectTrigger className="h-12 rounded-none border-white/10 bg-[#121212] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedExpenseGroupOption?.items.map((item) => (
                            <SelectItem key={item.id} value={item.label}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <Select
                    value={categoryId}
                    onValueChange={(value) => value && setCategoryId(value)}
                  >
                    <SelectTrigger className="h-12 rounded-none border-white/10 bg-[#121212] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <label className="command-label">Description</label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the payout, spend, or settlement..."
                  className="min-h-28 rounded-none border-white/10 bg-[#121212] text-white"
                  disabled={!canSubmit}
                />
              </div>

              <div className="space-y-2">
                <label className="command-label">Upload proof</label>
                <input
                  ref={proofInputRef}
                  type="file"
                  accept={PROOF_ACCEPT}
                  className="hidden"
                  onChange={handleProofInputChange}
                />
                <button
                  type="button"
                  onClick={() => proofInputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDraggingProof(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDraggingProof(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDraggingProof(false);
                    void applyProofFile(event.dataTransfer.files?.[0] ?? null);
                  }}
                  className={cn(
                    "flex min-h-36 w-full flex-col items-center justify-center gap-3 border border-dashed px-4 py-5 text-center transition",
                    isDraggingProof
                      ? "border-white/30 bg-white/6"
                      : "border-white/10 bg-[#121212] hover:bg-white/[0.03]",
                  )}
                  disabled={!canSubmit}
                >
                  <Upload className="size-5 text-[#cfcfcf]" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Drag proof here or click to upload
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#8f8f8f]">
                      Optional · JPG, PNG, or PDF
                    </p>
                  </div>
                </button>

                {proofError ? (
                  <p className="text-sm text-amber-300">{proofError}</p>
                ) : null}

                {proof ? (
                  <div className="border border-white/8 bg-[#121212] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        {proof.mimeType === "application/pdf" ? (
                          <div className="flex size-14 shrink-0 items-center justify-center border border-white/8 bg-[#181818]">
                            <FileText className="size-5 text-[#d6d6d6]" />
                          </div>
                        ) : (
                          <Image
                            src={proof.dataUrl}
                            alt={proof.name}
                            width={56}
                            height={56}
                            unoptimized
                            className="size-14 shrink-0 border border-white/8 object-cover"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{proof.name}</p>
                          <p className="mt-1 text-sm text-[#8f8f8f]">
                            {proof.mimeType === "application/pdf"
                              ? "PDF proof ready"
                              : "Image proof ready"}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewProof(proof)}
                          className="inline-flex size-8 items-center justify-center border border-white/10 text-[#d6d6d6] transition hover:bg-white/6 hover:text-white"
                          aria-label={`View proof ${proof.name}`}
                        >
                          {proof.mimeType === "application/pdf" ? (
                            <FileText className="size-4" />
                          ) : (
                            <ImageIcon className="size-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={resetProofSelection}
                          className="inline-flex size-8 items-center justify-center border border-white/10 text-[#d6d6d6] transition hover:bg-white/6 hover:text-white"
                          aria-label="Remove proof"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-sm text-[#8f8f8f]">
                      <Paperclip className="size-4" />
                      <span>Attached and ready to link to this transaction.</span>
                      <button
                        type="button"
                        onClick={() => proofInputRef.current?.click()}
                        className="text-white transition hover:text-white/80"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="border border-white/8 bg-[linear-gradient(90deg,#181818,transparent)] px-6 py-6">
                <p className="command-label">Calculated settlement</p>
                <p className="mt-3 text-5xl font-semibold tracking-tight text-white">
                  {formatCurrency(convertedAmount)}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-[#8f8f8f]">
                  Verification starts as pending
                </p>
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-none border border-white bg-white text-xs font-semibold uppercase tracking-[0.24em] text-black hover:bg-white/90"
                disabled={
                  !canSubmit ||
                  !description.trim() ||
                  numericAmount <= 0 ||
                  (currency !== "IDR" && numericRate <= 0)
                }
              >
                Confirm transaction
              </Button>

              {submitted ? (
                <p className="text-center text-sm text-[var(--chart-1)]">
                  Transaction added to the local ledger.
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card className="command-panel">
          <CardHeader>
            <CardTitle className="text-lg text-white">Recent manual entries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentManualEntries.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-4 border-t border-white/8 pt-3 first:border-t-0 first:pt-0">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{entry.description}</p>
                    {entry.proof ? (
                      <button
                        type="button"
                        onClick={() => setPreviewProof(entry.proof ?? null)}
                        className="inline-flex size-7 items-center justify-center border border-white/10 text-[#d6d6d6] transition hover:bg-white/6 hover:text-white"
                        aria-label={`View proof for ${entry.description}`}
                      >
                        <Paperclip className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-[#8f8f8f]">
                    {formatDate(entry.transactionDate)} · {getSourceDisplayName(entry.accountId ?? entry.channelId)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-none border px-2 py-0.5 text-[11px] uppercase tracking-[0.18em]",
                      entry.verificationStatus === "VERIFIED"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-300",
                    )}
                  >
                    {entry.verificationStatus}
                  </Badge>
                  <p className="mt-2 text-sm font-medium text-white">
                    {formatCurrency(entry.baseAmount)}
                  </p>
                  {entry.proof ? (
                    <button
                      type="button"
                      onClick={() => setPreviewProof(entry.proof ?? null)}
                      className="mt-2 inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-[#cfcfcf] transition hover:text-white"
                    >
                      <Download className="size-3" />
                      Proof
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <TransactionProofDialog
        open={previewProof !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewProof(null);
          }
        }}
        proof={previewProof}
        title="Transaction proof"
        description="Review or download the proof attached to this transaction."
      />
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read proof file."));
    reader.readAsDataURL(file);
  });
}

function formatIndonesianNumberInput(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.NumberFormat("id-ID").format(Number(value));
}

function getAccountOptionLabel(account: Account) {
  return `${account.name} • ${formatAccountType(account.type)} • ${account.currency}`;
}

function formatAccountType(type: Account["type"]) {
  if (type === "bank") {
    return "Bank";
  }

  if (type === "wallet") {
    return "Wallet";
  }

  if (type === "holding") {
    return "Holding";
  }

  return "Platform";
}

function formatAccountSource(source: Account["source"]) {
  return source === "auto" ? "Auto sync" : "Manual source";
}

function getAccountOptionMetaLabel(account: Account) {
  return `${formatAccountType(account.type)} • ${account.currency} • ${formatAccountSource(account.source)}`;
}

function getAccountDropdownGroups(accounts: Account[]) {
  const groupLabels: Record<AccountGroup, string> = {
    local: "Local bank",
    foreign: "Foreign wallet",
    holding: "Holding",
    platform: "Platform",
  };

  return (Object.entries(groupLabels) as Array<[AccountGroup, string]>)
    .map(([key, label]) => ({
      key,
      label,
      items: accounts.filter((account) => resolveAccountGroup(account) === key),
    }))
    .filter((group) => group.items.length > 0);
}

function resolveAccountGroup(account: Account): AccountGroup {
  if (account.group) {
    return account.group;
  }

  if (account.type === "bank") {
    return "local";
  }

  if (account.type === "holding") {
    return "holding";
  }

  if (account.type === "wallet" || account.type === "platform") {
    return "foreign";
  }

  return "local";
}
