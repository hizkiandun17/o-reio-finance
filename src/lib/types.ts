export type Role = "OWNER" | "OPS_MANAGER" | "FINANCE";

export type Currency = "IDR" | "USD" | "SGD" | "EUR";

export type TransactionKind = "INCOME" | "EXPENSE";

export type EntryType = "AUTO" | "MANUAL";

export type VerificationStatus = "VERIFIED" | "PENDING";
export type UnifiedTransactionType = "income" | "expense" | "transfer";
export type UnifiedTransactionStatus = "pending" | "verified";
export type UnifiedTransactionOrigin = "manual" | "auto";
export type UnifiedCategoryGroup = "growth" | "cost" | "overhead";
export type AccountSource = "manual" | "auto";
export type AccountType = "bank" | "wallet" | "platform" | "holding";
export type AccountGroup = "local" | "foreign" | "holding" | "platform";

export type ExpenseGroup = "GROWTH" | "COST" | "OVERHEAD";
export type MainCategoryLabel = "Growth" | "Cost" | "Overhead";
export type DailyCashSnapshotStatus = "COMPLETE" | "PARTIAL" | "FAILED";
export type AccountBalanceStatus = "SYNCED" | "ATTENTION" | "UNAVAILABLE";

export type TrafficLightStatus = "GREEN" | "YELLOW" | "RED";

export type DateRangePreset =
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "CUSTOM";

export interface DateRangeSelection {
  preset: DateRangePreset;
  startDate: string;
  endDate: string;
  compareWithPrevious: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionKind;
  expenseGroup?: ExpenseGroup;
  parentId?: string | null;
}

export interface TransactionCategoryMapping {
  mainCategory: MainCategoryLabel;
  subCategory: string;
}

export interface Channel {
  id: string;
  name: string;
  type: "BANK" | "WALLET" | "GATEWAY" | "MODULE";
  status: "SYNCED" | "MANUAL" | "ATTENTION";
  isCashAccount: boolean;
}

export interface Account {
  id: string;
  name: string;
  currency: Currency;
  source: AccountSource;
  type: AccountType;
  group?: AccountGroup;
}

export interface AccountBalanceRecord {
  channelId: string;
  provider: string;
  currency: Currency;
  balance: number | null;
  syncedAt: string | null;
  status: AccountBalanceStatus;
  accountName: string;
}

export interface DailyCashSnapshotAccountBalance {
  account_id: Account["id"];
  balance: number;
}

export interface DailyCashSnapshot {
  date: string;
  accounts: DailyCashSnapshotAccountBalance[];
  total_balance: number;
  closingBalance: number;
  currency: Currency;
  capturedAt: string;
  sourceCount: number;
  status: DailyCashSnapshotStatus;
  metadata: {
    includedChannelIds: string[];
    missingChannelIds: string[];
    availableChannelIds: string[];
    accountBreakdown?: DailyCashSnapshotAccount[];
  };
}

export interface DailyCashSnapshotAccount {
  channelId: string;
  channelName: string;
  provider: string;
  accountName: string;
  balance: number;
  syncedAt: string | null;
}

export interface BalanceIncludedAccount {
  channelId: string;
  channelName: string;
  provider: string;
  accountName: string;
  balance: number | null;
  status: AccountBalanceStatus;
  syncedAt: string | null;
}

export interface BalanceSummary {
  liveBalance: number;
  liveBalanceUpdatedAt: string | null;
  liveStatus: DailyCashSnapshotStatus;
  lastClosingBalance: number | null;
  lastClosingDate: string | null;
  deltaAmount: number | null;
  deltaPercent: number | null;
  snapshotStatus: DailyCashSnapshotStatus | "NO_HISTORY";
  includedAccounts: BalanceIncludedAccount[];
  lastClosingSnapshot: DailyCashSnapshot | null;
}

export interface TransactionProof {
  name: string;
  mimeType: "image/jpeg" | "image/png" | "application/pdf";
  dataUrl: string;
  size: number;
}

export interface UnifiedTransaction {
  id: string;
  type: UnifiedTransactionType;
  account_id: string;
  target_account_id?: string | null;
  channel?: string | null;
  category_group?: UnifiedCategoryGroup | null;
  category_name?: string | null;
  status: UnifiedTransactionStatus;
  origin: UnifiedTransactionOrigin;
  amount: number;
  original_currency: Currency;
  exchange_rate: number;
  base_amount: number;
  transaction_date: string;
  description: string;
  proof?: TransactionProof | null;
  logged_by?: string | null;
}

export interface Transaction {
  id: string;
  amount: number;
  originalCurrency: Currency;
  exchangeRate: number;
  baseAmount: number;
  transactionDate: string;
  description: string;
  kind: TransactionKind;
  entryType: EntryType;
  verificationStatus: VerificationStatus;
  categoryId: string;
  channelId: string;
  proof?: TransactionProof | null;
  loggedBy?: string | null;
}

export interface KeywordRule {
  id: string;
  keyword: string;
  categoryId: string;
  note: string;
  createdBy: string;
  updatedAt: string;
}

export interface ReconciliationLog {
  id: string;
  checkTime: string;
  status: "COMPLETE" | "DISCREPANCY";
  details: string;
  expectedTotal: number;
  actualTotal: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  createdAt: string;
  channel: "IN_APP" | "WHATSAPP";
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalExpense: number;
  growthExpense: number;
  costExpense: number;
  overheadExpense: number;
  net: number;
  adsPercent: number;
  status: TrafficLightStatus;
}

export interface DashboardBreakdownItem {
  id: string;
  label: string;
  value: number;
  group: ExpenseGroup;
}

export interface DashboardSubcategoryBreakdownItem {
  categoryId: string;
  label: string;
  value: number;
  group: ExpenseGroup;
}

export type DashboardSubcategoryBreakdownMap = Record<
  ExpenseGroup,
  DashboardSubcategoryBreakdownItem[]
>;

export interface DashboardExpenseBreakdown {
  total: number;
  main: DashboardBreakdownItem[];
  subcategories: DashboardSubcategoryBreakdownMap;
}

export interface TrendPoint {
  label: string;
  revenue: number;
  expense: number;
  net: number;
}

export interface ChannelSnapshotItem {
  channelId: string;
  channelName: string;
  amount: number;
  percentage: number;
}

export interface DashboardPayload {
  metrics: DashboardMetrics;
  expenseBreakdown: DashboardExpenseBreakdown;
  trend: TrendPoint[];
  monthlyTrend: TrendPoint[];
  channelSnapshot: ChannelSnapshotItem[];
  alerts: Notification[];
  lastSyncAt: string;
  reconciliation: ReconciliationSummaryPayload;
  selectedRangeLabel: string;
  comparison?: {
    previousRangeLabel: string;
    previousMetrics: DashboardMetrics;
    netDeltaPercent: number | null;
    revenueDeltaPercent: number | null;
    expenseDeltaPercent: number | null;
    adsDelta: number;
  };
}

export interface TransactionListPayload {
  items: Transaction[];
  totals: {
    count: number;
    revenue: number;
    expense: number;
    pending: number;
  };
}

export interface ManualEntryInput {
  description: string;
  amount: number;
  originalCurrency: Currency;
  exchangeRate: number;
  transactionDate: string;
  kind: TransactionKind;
  categoryId: string;
  channelId: string;
  proof?: TransactionProof | null;
}

export interface TransactionUpdateInput {
  description: string;
  amount: number;
  originalCurrency: Currency;
  exchangeRate: number;
  transactionDate: string;
  kind: TransactionKind;
  categoryId: string;
  channelId: string;
}

export interface KeywordRuleInput {
  keyword: string;
  categoryId: string;
  note: string;
}

export interface ReconciliationSummaryPayload {
  pendingCount: number;
  verifiedCount: number;
  completeness: number;
  latestStatus: "COMPLETE" | "DISCREPANCY";
}

export interface IntegrationStatus {
  id: string;
  name: string;
  surface: "API" | "MODULE" | "GATEWAY" | "ALERT";
  state: "SYNCED" | "ATTENTION" | "MANUAL";
  lastEvent: string;
  note: string;
}
