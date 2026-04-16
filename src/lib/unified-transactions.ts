import type {
  ManualEntryInput,
  Transaction,
  UnifiedCategoryGroup,
  UnifiedTransaction,
  UnifiedTransactionOrigin,
  UnifiedTransactionStatus,
  UnifiedTransactionType,
} from "@/lib/types";

const UNIFIED_TRANSACTION_TYPES = new Set<UnifiedTransactionType>([
  "income",
  "expense",
  "transfer",
]);

const UNIFIED_TRANSACTION_STATUSES = new Set<UnifiedTransactionStatus>([
  "pending",
  "verified",
]);

const UNIFIED_TRANSACTION_ORIGINS = new Set<UnifiedTransactionOrigin>([
  "manual",
  "auto",
]);

const UNIFIED_CATEGORY_GROUPS = new Set(["growth", "cost", "overhead"]);

export interface CreateManualUnifiedTransactionOptions {
  id?: string;
  accountId: string;
  channel?: string | null;
  categoryId?: string | null;
  categoryGroup?: UnifiedCategoryGroup | null;
  categoryName?: string | null;
  baseAmount: number;
  transactionDateTime: string;
  loggedBy?: string | null;
}

export interface AdaptUnifiedTransactionToLegacyTransactionOptions {
  categoryId: string;
}

export interface TodayMovementBreakdown {
  income: number;
  expense: number;
  transfer_in: number;
  transfer_out: number;
  net: number;
}

export function isTransferTransaction(transaction: UnifiedTransaction) {
  return transaction.type === "transfer";
}

export function isIncomeTransaction(transaction: UnifiedTransaction) {
  return transaction.type === "income";
}

export function isExpenseTransaction(transaction: UnifiedTransaction) {
  return transaction.type === "expense";
}

export function canAffectProfit(transaction: UnifiedTransaction) {
  return transaction.type !== "transfer";
}

export function canAffectBalance(
  transaction: UnifiedTransaction,
  accountId?: string,
) {
  if (!accountId) {
    return true;
  }

  if (transaction.account_id === accountId) {
    return true;
  }

  return transaction.type === "transfer" && transaction.target_account_id === accountId;
}

export function getLiveBalanceByAccount(
  transactions: UnifiedTransaction[],
  accountId: string,
) {
  return transactions.reduce((balance, transaction) => {
    if (transaction.type === "income") {
      return transaction.account_id === accountId
        ? balance + transaction.base_amount
        : balance;
    }

    if (transaction.type === "expense") {
      return transaction.account_id === accountId
        ? balance - transaction.base_amount
        : balance;
    }

    if (transaction.account_id === accountId) {
      return balance - transaction.base_amount;
    }

    if (transaction.target_account_id === accountId) {
      return balance + transaction.base_amount;
    }

    return balance;
  }, 0);
}

export function getTransactionsByAccount(
  transactions: UnifiedTransaction[],
  accountId: string,
) {
  return transactions
    .filter(
      (transaction) =>
        transaction.account_id === accountId ||
        transaction.target_account_id === accountId,
    )
    .sort((left, right) =>
      right.transaction_date.localeCompare(left.transaction_date),
    );
}

export function buildReconciliationSummary(transactions: UnifiedTransaction[]) {
  const totals = transactions.reduce(
    (summary, transaction) => {
      summary.total += transaction.base_amount;

      if (transaction.status === "verified") {
        summary.verified += transaction.base_amount;
      } else {
        summary.pending += transaction.base_amount;
        summary.pendingCount += 1;
      }

      return summary;
    },
    {
      total: 0,
      verified: 0,
      pending: 0,
      pendingCount: 0,
      completionRate: 1,
    },
  );

  return {
    ...totals,
    completionRate: totals.total === 0 ? 1 : totals.verified / totals.total,
  };
}

export function getSalesSummary(transactions: UnifiedTransaction[]) {
  const totalsByChannel = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "income" || !transaction.channel) {
      continue;
    }

    totalsByChannel.set(
      transaction.channel,
      (totalsByChannel.get(transaction.channel) ?? 0) + transaction.base_amount,
    );
  }

  const by_channel = [...totalsByChannel.entries()]
    .map(([channel, total]) => ({ channel, total }))
    .sort((left, right) => right.total - left.total);

  return {
    by_channel,
    total: by_channel.reduce((sum, item) => sum + item.total, 0),
  };
}

export function getExpenseSummary(transactions: UnifiedTransaction[]) {
  const totalsByAccount = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") {
      continue;
    }

    totalsByAccount.set(
      transaction.account_id,
      (totalsByAccount.get(transaction.account_id) ?? 0) + transaction.base_amount,
    );
  }

  const by_account = [...totalsByAccount.entries()]
    .map(([account_id, total]) => ({ account_id, total }))
    .sort((left, right) => right.total - left.total);

  return {
    by_account,
    total: by_account.reduce((sum, item) => sum + item.total, 0),
  };
}

export function getDailyFinancialSummary(
  transactions: UnifiedTransaction[],
  date: string,
) {
  return transactions.reduce(
    (summary, transaction) => {
      if (transaction.transaction_date.split("T")[0] !== date) {
        return summary;
      }

      if (transaction.type === "income") {
        summary.sales += transaction.base_amount;
        summary.net += transaction.base_amount;
        return summary;
      }

      if (transaction.type === "expense") {
        summary.expense += transaction.base_amount;
        summary.net -= transaction.base_amount;
      }

      return summary;
    },
    {
      sales: 0,
      expense: 0,
      net: 0,
    },
  );
}

export function getTodayMovementBreakdown(
  transactions: UnifiedTransaction[],
  date: string,
): TodayMovementBreakdown {
  const totals = transactions.reduce(
    (summary, transaction) => {
      if (transaction.transaction_date.split("T")[0] !== date) {
        return summary;
      }

      if (transaction.type === "income") {
        summary.income += transaction.base_amount;
        return summary;
      }

      if (transaction.type === "expense") {
        summary.expense += transaction.base_amount;
        return summary;
      }

      if (transaction.account_id) {
        summary.transfer_out += transaction.base_amount;
      }

      if (transaction.target_account_id) {
        summary.transfer_in += transaction.base_amount;
      }

      return summary;
    },
    {
      income: 0,
      expense: 0,
      transfer_in: 0,
      transfer_out: 0,
    },
  );

  return {
    ...totals,
    net:
      totals.income -
      totals.expense +
      totals.transfer_in -
      totals.transfer_out,
  };
}

export function validateUnifiedTransaction(
  transaction: Partial<UnifiedTransaction> | null | undefined,
) {
  const errors: string[] = [];

  if (!transaction) {
    return ["Transaction is required."];
  }

  if (!transaction.id) {
    errors.push("id is required.");
  }

  if (!transaction.type || !UNIFIED_TRANSACTION_TYPES.has(transaction.type)) {
    errors.push("type must be income, expense, or transfer.");
  }

  if (!transaction.account_id) {
    errors.push("account_id is required.");
  }

  if (!transaction.status || !UNIFIED_TRANSACTION_STATUSES.has(transaction.status)) {
    errors.push("status must be pending or verified.");
  }

  if (!transaction.origin || !UNIFIED_TRANSACTION_ORIGINS.has(transaction.origin)) {
    errors.push("origin must be manual or auto.");
  }

  if (typeof transaction.amount !== "number" || Number.isNaN(transaction.amount)) {
    errors.push("amount must be a number.");
  } else if (transaction.amount < 0) {
    errors.push("amount must be greater than or equal to 0.");
  }

  if (
    typeof transaction.exchange_rate !== "number" ||
    Number.isNaN(transaction.exchange_rate)
  ) {
    errors.push("exchange_rate must be a number.");
  } else if (transaction.exchange_rate <= 0) {
    errors.push("exchange_rate must be greater than 0.");
  }

  if (
    typeof transaction.base_amount !== "number" ||
    Number.isNaN(transaction.base_amount)
  ) {
    errors.push("base_amount must be a number.");
  } else if (transaction.base_amount < 0) {
    errors.push("base_amount must be greater than or equal to 0.");
  }

  if (!transaction.original_currency) {
    errors.push("original_currency is required.");
  }

  if (!transaction.transaction_date) {
    errors.push("transaction_date is required.");
  }

  if (!transaction.description) {
    errors.push("description is required.");
  }

  if (transaction.type === "transfer") {
    if (!transaction.target_account_id) {
      errors.push("target_account_id is required for transfers.");
    }

    if (
      transaction.account_id &&
      transaction.target_account_id &&
      transaction.account_id === transaction.target_account_id
    ) {
      errors.push("transfer account_id and target_account_id must be different.");
    }
  }

  if (
    (transaction.type === "income" || transaction.type === "expense") &&
    transaction.target_account_id
  ) {
    errors.push("target_account_id is only allowed for transfers.");
  }

  if (transaction.type === "expense") {
    if (!transaction.category_group) {
      errors.push("category_group is required for expenses.");
    } else if (!UNIFIED_CATEGORY_GROUPS.has(transaction.category_group)) {
      errors.push("category_group must be growth, cost, or overhead.");
    }

    if (!transaction.category_name) {
      errors.push("category_name is required for expenses.");
    }
  }

  return errors;
}

export function isUnifiedTransaction(value: unknown): value is UnifiedTransaction {
  if (!value || typeof value !== "object") {
    return false;
  }

  return validateUnifiedTransaction(value as Partial<UnifiedTransaction>).length === 0;
}

export function createManualUnifiedTransaction(
  input: ManualEntryInput,
  options: CreateManualUnifiedTransactionOptions,
): UnifiedTransaction {
  const type = input.kind === "INCOME" ? "income" : "expense";

  return {
    id: options.id ?? `utx_manual_${crypto.randomUUID()}`,
    type,
    account_id: options.accountId,
    target_account_id: null,
    channel: options.channel ?? options.accountId,
    category_id: options.categoryId ?? null,
    category_group: type === "expense" ? options.categoryGroup ?? null : null,
    category_name: type === "expense" ? options.categoryName ?? null : null,
    status: "pending",
    origin: "manual",
    amount: input.amount,
    original_currency: input.originalCurrency,
    exchange_rate: input.exchangeRate,
    base_amount: options.baseAmount,
    transaction_date: options.transactionDateTime,
    description: input.description,
    proof: input.proof ?? null,
    logged_by: options.loggedBy ?? null,
  };
}

export function adaptUnifiedTransactionToLegacyTransaction(
  transaction: UnifiedTransaction,
  options: AdaptUnifiedTransactionToLegacyTransactionOptions,
): Transaction {
  return {
    id: transaction.id,
    amount: transaction.amount,
    originalCurrency: transaction.original_currency,
    exchangeRate: transaction.exchange_rate,
    baseAmount: transaction.base_amount,
    transactionDate: transaction.transaction_date,
    description: transaction.description,
    kind: transaction.type === "income" ? "INCOME" : "EXPENSE",
    entryType: transaction.origin === "auto" ? "AUTO" : "MANUAL",
    verificationStatus:
      transaction.status === "verified" ? "VERIFIED" : "PENDING",
    categoryId: options.categoryId,
    channelId: transaction.account_id,
    accountId: transaction.account_id,
    proof: transaction.proof ?? null,
    loggedBy: transaction.logged_by ?? null,
  };
}
