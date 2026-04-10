import { buildDailyFinanceView } from "@/lib/daily-finance-view";

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
  const growthRatio =
    sales === 0 ? 0 : financeView.performance.growthExpense / sales;

  if (growthRatio > 0.6) {
    signals.push({
      type: "danger",
      message: "Growth spend is above 60% of sales.",
    });
  } else if (growthRatio > 0.4) {
    signals.push({
      type: "warning",
      message: "Growth spend is above 40% of sales.",
    });
  }

  if (net < 0) {
    signals.push({
      type: "danger",
      message: "Net is negative for the selected day.",
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

  return { signals };
}
