import { buildDailyFinanceView } from "@/lib/daily-finance-view";

export type AdsEfficiencyStatus = "healthy" | "optimize" | "unsafe";

export interface AdsEfficiencySignal {
  ratio: number;
  status: AdsEfficiencyStatus;
  message: string;
}

function getAdsEfficiencySignal(
  financeView: ReturnType<typeof buildDailyFinanceView>,
): AdsEfficiencySignal {
  const revenue = financeView.performance.sales;
  const growthExpense = financeView.performance.growthExpense;
  const ratio = revenue === 0 ? 0 : growthExpense / revenue;

  if (ratio > 0.25) {
    return {
      ratio,
      status: "unsafe",
      message: "Spending too aggressively. Scaling is risky.",
    };
  }

  if (ratio >= 0.15) {
    const adsTrend = financeView.comparison?.adsRatio.trend;

    return {
      ratio,
      status: "optimize",
      message:
        adsTrend === "better"
          ? "Good direction, continue optimizing."
          : adsTrend === "worse"
            ? "Efficiency declining, take action urgently."
            : "Profit is okay but efficiency needs improvement.",
    };
  }

  return {
    ratio,
    status: "healthy",
    message: "Efficient and scalable.",
  };
}

export function buildSignals(
  financeView: ReturnType<typeof buildDailyFinanceView>,
) {
  const signals: Array<{
    type: "info" | "warning" | "danger";
    message: string;
  }> = [];

  const sales = financeView.performance.sales;
  const expense = financeView.performance.expense;
  const liveBalance = financeView.balance.liveTotal;
  const net = financeView.performance.net;
  const pendingCount = financeView.reconciliation.pendingCount;
  const adsEfficiency = getAdsEfficiencySignal(financeView);

  if (adsEfficiency.status === "unsafe") {
    signals.push({
      type: "danger",
      message: adsEfficiency.message,
    });
  } else if (adsEfficiency.status === "optimize") {
    signals.push({
      type: "warning",
      message: adsEfficiency.message,
    });
  }

  if (net < 0) {
    signals.push({
      type: "danger",
      message: "Net is negative for the selected period.",
    });
  }

  if (pendingCount > 0) {
    signals.push({
      type: "warning",
      message: `${pendingCount} transactions are still pending reconciliation.`,
    });
  }

  if (liveBalance < expense * 3) {
    signals.push({
      type: "warning",
      message: "Live balance is below a three-times expense buffer.",
    });
  }

  if (expense > sales) {
    signals.push({
      type: "danger",
      message: "Expenses are higher than sales.",
    });
  }

  if (signals.length === 0) {
    signals.push({
      type: "info",
      message: "Daily finance signals are stable.",
    });
  }

  return { adsEfficiency, signals };
}
