"use client";

import * as React from "react";

import {
  buildCategoryMap,
  buildChannelMap,
  buildDashboardPayload,
  buildReconciliationSummary,
  getDefaultDateRangeSelection,
  getDateRangeSelectionForPreset,
  getExpenseGroupForCategory,
  getLandingPath,
  type ViewMode,
} from "@/lib/business";
import {
  categories as categorySeed,
  channels as channelSeed,
  integrations as integrationSeed,
  keywordRules as keywordRuleSeed,
  notifications as notificationSeed,
  reconciliationLogs as reconciliationSeed,
  transactions as transactionSeed,
  users,
} from "@/lib/mock-data";
import type {
  BalanceSummary,
  DateRangeSelection,
  DashboardPayload,
  IntegrationStatus,
  KeywordRule,
  KeywordRuleInput,
  ManualEntryInput,
  Role,
  Transaction,
  TransactionUpdateInput,
  UnifiedCategoryGroup,
} from "@/lib/types";
import {
  adaptUnifiedTransactionToLegacyTransaction,
  createManualUnifiedTransaction,
  validateUnifiedTransaction,
} from "@/lib/unified-transactions";

const STORAGE_KEY = "o-reio.role";
const DASHBOARD_RANGE_KEY = "o-reio.dashboard-range";

interface AppStateContextValue {
  hydrated: boolean;
  role: Role;
  setRole: (role: Role) => void;
  landingPath: string;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  dashboardDateRange: DateRangeSelection;
  setDashboardPreset: (preset: DateRangeSelection["preset"]) => void;
  setDashboardCustomRange: (startDate: string, endDate: string) => void;
  setCompareWithPrevious: (value: boolean) => void;
  users: typeof users;
  categories: typeof categorySeed;
  channels: typeof channelSeed;
  transactions: Transaction[];
  keywordRules: KeywordRule[];
  integrations: IntegrationStatus[];
  reconciliationLogs: typeof reconciliationSeed;
  dashboard: DashboardPayload;
  balanceSummary: BalanceSummary | null;
  balanceSummaryLoading: boolean;
  reconciliationSummary: ReturnType<typeof buildReconciliationSummary>;
  categoryMap: Record<string, (typeof categorySeed)[number]>;
  channelMap: Record<string, (typeof channelSeed)[number]>;
  addManualEntry: (input: ManualEntryInput) => void;
  verifyTransaction: (transactionId: string) => void;
  updateTransaction: (transactionId: string, input: TransactionUpdateInput) => void;
  removeTransaction: (transactionId: string) => void;
  saveRule: (input: KeywordRuleInput, ruleId?: string) => void;
}

const AppStateContext = React.createContext<AppStateContextValue | null>(null);

function calculateBaseAmount(amount: number, originalCurrency: Transaction["originalCurrency"], exchangeRate: number) {
  return originalCurrency === "IDR" ? amount : Math.round(amount * exchangeRate);
}

function mergeTransactionDate(nextDate: string, currentDateTime: string) {
  const timePart = currentDateTime.split("T")[1] ?? "09:00:00+08:00";
  return `${nextDate}T${timePart}`;
}

function mapExpenseGroupToUnifiedCategoryGroup(
  expenseGroup: "GROWTH" | "COST" | "OVERHEAD" | undefined,
): UnifiedCategoryGroup | null {
  if (expenseGroup === "GROWTH") {
    return "growth";
  }

  if (expenseGroup === "COST") {
    return "cost";
  }

  if (expenseGroup === "OVERHEAD") {
    return "overhead";
  }

  return null;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = React.useState(false);
  const [role, setRoleState] = React.useState<Role>("OWNER");
  const [viewMode, setViewMode] = React.useState<ViewMode>("monthly");
  const [dashboardDateRange, setDashboardDateRange] =
    React.useState<DateRangeSelection>(getDefaultDateRangeSelection);
  const [transactions, setTransactions] = React.useState(transactionSeed);
  const [keywordRules, setKeywordRules] = React.useState(keywordRuleSeed);
  const [balanceSummary, setBalanceSummary] = React.useState<BalanceSummary | null>(null);
  const [balanceSummaryLoading, setBalanceSummaryLoading] = React.useState(true);
  const categoryMap = React.useMemo(() => buildCategoryMap(categorySeed), []);
  const channelMap = React.useMemo(() => buildChannelMap(channelSeed), []);

  React.useEffect(() => {
    const storedRole = window.localStorage.getItem(STORAGE_KEY) as Role | null;
    if (storedRole) {
      setRoleState(storedRole);
    }

    const storedRange = window.sessionStorage.getItem(DASHBOARD_RANGE_KEY);
    if (storedRange) {
      try {
        setDashboardDateRange(JSON.parse(storedRange) as DateRangeSelection);
      } catch {
        setDashboardDateRange(getDefaultDateRangeSelection());
      }
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadBalanceSummary() {
      try {
        setBalanceSummaryLoading(true);
        const response = await fetch("/api/dashboard/balance-summary", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load balance summary.");
        }

        const payload = (await response.json()) as BalanceSummary;
        if (!cancelled) {
          setBalanceSummary(payload);
        }
      } catch {
        if (!cancelled) {
          setBalanceSummary(null);
        }
      } finally {
        if (!cancelled) {
          setBalanceSummaryLoading(false);
        }
      }
    }

    void loadBalanceSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  const setRole = React.useCallback((nextRole: Role) => {
    setRoleState(nextRole);
    window.localStorage.setItem(STORAGE_KEY, nextRole);
  }, []);

  const persistDashboardRange = React.useCallback((nextRange: DateRangeSelection) => {
    setDashboardDateRange(nextRange);
    window.sessionStorage.setItem(DASHBOARD_RANGE_KEY, JSON.stringify(nextRange));
  }, []);

  const setDashboardPreset = React.useCallback(
    (preset: DateRangeSelection["preset"]) => {
      persistDashboardRange(
        getDateRangeSelectionForPreset(preset, dashboardDateRange),
      );
    },
    [dashboardDateRange, persistDashboardRange],
  );

  const setDashboardCustomRange = React.useCallback(
    (startDate: string, endDate: string) => {
      persistDashboardRange({
        ...dashboardDateRange,
        preset: "CUSTOM",
        startDate,
        endDate,
      });
    },
    [dashboardDateRange, persistDashboardRange],
  );

  const setCompareWithPrevious = React.useCallback(
    (value: boolean) => {
      persistDashboardRange({
        ...dashboardDateRange,
        compareWithPrevious: value,
      });
    },
    [dashboardDateRange, persistDashboardRange],
  );

  const addManualEntry = React.useCallback((input: ManualEntryInput) => {
    const category = categoryMap[input.categoryId];
    const expenseGroup = getExpenseGroupForCategory(input.categoryId, categoryMap);
    const baseAmount = calculateBaseAmount(
      input.amount,
      input.originalCurrency,
      input.exchangeRate,
    );
    const unifiedTransaction = createManualUnifiedTransaction(input, {
      id: `txn_manual_${crypto.randomUUID()}`,
      accountId: input.channelId,
      channel: input.channelId,
      categoryId: input.categoryId,
      categoryGroup:
        input.kind === "EXPENSE"
          ? mapExpenseGroupToUnifiedCategoryGroup(expenseGroup)
          : null,
      categoryName: input.kind === "EXPENSE" ? category?.name ?? null : null,
      baseAmount,
      transactionDateTime: `${input.transactionDate}T09:00:00+08:00`,
      loggedBy: users.find((user) => user.role === "FINANCE")?.id ?? null,
    });

    if (validateUnifiedTransaction(unifiedTransaction).length > 0) {
      return;
    }

    const legacyTransaction = adaptUnifiedTransactionToLegacyTransaction(
      unifiedTransaction,
      { categoryId: input.categoryId },
    );

    setTransactions((current) => [legacyTransaction, ...current]);
  }, [categoryMap]);

  const verifyTransaction = React.useCallback((transactionId: string) => {
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === transactionId
          ? { ...transaction, verificationStatus: "VERIFIED" }
          : transaction,
      ),
    );
  }, []);

  const updateTransaction = React.useCallback(
    (transactionId: string, input: TransactionUpdateInput) => {
      setTransactions((current) =>
        current.map((transaction) =>
          transaction.id === transactionId
            ? {
                ...transaction,
                description: input.description,
                amount: input.amount,
                originalCurrency: input.originalCurrency,
                exchangeRate: input.exchangeRate,
                baseAmount: calculateBaseAmount(
                  input.amount,
                  input.originalCurrency,
                  input.exchangeRate,
                ),
                transactionDate: mergeTransactionDate(
                  input.transactionDate,
                  transaction.transactionDate,
                ),
                kind: input.kind,
                categoryId: input.categoryId,
                channelId: input.channelId,
                verificationStatus: "PENDING",
              }
            : transaction,
        ),
      );
    },
    [],
  );

  const removeTransaction = React.useCallback((transactionId: string) => {
    setTransactions((current) =>
      current.filter((transaction) => transaction.id !== transactionId),
    );
  }, []);

  const saveRule = React.useCallback((input: KeywordRuleInput, ruleId?: string) => {
    setKeywordRules((current) => {
      if (ruleId) {
        return current.map((rule) =>
          rule.id === ruleId
            ? {
                ...rule,
                ...input,
                updatedAt: new Date().toISOString(),
              }
            : rule,
        );
      }

      return [
        {
          id: `rule_${crypto.randomUUID()}`,
          ...input,
          createdBy: users.find((user) => user.role === "OWNER")?.id ?? "usr_owner",
          updatedAt: new Date().toISOString(),
        },
        ...current,
      ];
    });
  }, []);

  const dashboard = React.useMemo(
    () =>
      buildDashboardPayload({
        transactions,
        categories: categorySeed,
        channels: channelSeed,
        reconciliationLogs: reconciliationSeed,
        notifications: notificationSeed,
        dateRange: dashboardDateRange,
      }),
    [dashboardDateRange, transactions],
  );

  const reconciliationSummary = React.useMemo(
    () => buildReconciliationSummary(transactions, reconciliationSeed),
    [transactions],
  );

  const value = React.useMemo<AppStateContextValue>(
    () => ({
      hydrated,
      role,
      setRole,
      landingPath: getLandingPath(role),
      viewMode,
      setViewMode,
      dashboardDateRange,
      setDashboardPreset,
      setDashboardCustomRange,
      setCompareWithPrevious,
      users,
      categories: categorySeed,
      channels: channelSeed,
      transactions,
      keywordRules,
      integrations: integrationSeed,
      reconciliationLogs: reconciliationSeed,
      dashboard,
      balanceSummary,
      balanceSummaryLoading,
      reconciliationSummary,
      categoryMap,
      channelMap,
      addManualEntry,
      verifyTransaction,
      updateTransaction,
      removeTransaction,
      saveRule,
    }),
    [
      addManualEntry,
      balanceSummary,
      balanceSummaryLoading,
      categoryMap,
      channelMap,
      dashboardDateRange,
      dashboard,
      hydrated,
      keywordRules,
      reconciliationSummary,
      role,
      setCompareWithPrevious,
      setDashboardCustomRange,
      setDashboardPreset,
      setRole,
      removeTransaction,
      transactions,
      updateTransaction,
      verifyTransaction,
      viewMode,
      saveRule,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = React.useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppStateProvider.");
  }

  return context;
}
