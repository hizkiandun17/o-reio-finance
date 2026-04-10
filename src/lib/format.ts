import { format, parseISO } from "date-fns";

import type { Currency, TrafficLightStatus } from "@/lib/types";

export function formatCurrency(
  value: number,
  currency: Currency = "IDR",
  maximumFractionDigits = 0,
) {
  return new Intl.NumberFormat("en-ID", {
    style: "currency",
    currency,
    maximumFractionDigits,
  }).format(value);
}

export function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-ID", {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatDateTime(value: string, pattern = "dd MMM yyyy, HH:mm") {
  return format(parseISO(value), pattern);
}

export function formatDate(value: string, pattern = "dd MMM yyyy") {
  return format(parseISO(value), pattern);
}

export function formatDateRangeLabel(startDate: string, endDate: string) {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd")) {
    return format(start, "MMM d, yyyy");
  }

  if (format(start, "yyyy") === format(end, "yyyy")) {
    if (format(start, "MMM") === format(end, "MMM")) {
      return `${format(start, "MMM d")} - ${format(end, "d, yyyy")}`;
    }

    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
  }

  return `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
}

export function trafficLightCopy(status: TrafficLightStatus) {
  switch (status) {
    case "GREEN":
      return {
        label: "Green",
        tone: "Healthy and scalable",
      };
    case "YELLOW":
      return {
        label: "Yellow",
        tone: "Pause scaling and optimize",
      };
    case "RED":
      return {
        label: "Red",
        tone: "Unsafe acquisition cost",
      };
  }
}
