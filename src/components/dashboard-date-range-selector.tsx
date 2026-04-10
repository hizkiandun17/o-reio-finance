"use client";

import { useState } from "react";
import { CalendarRange, ChevronDown } from "lucide-react";

import { useAppState } from "@/components/providers/app-state-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getDateRangeLabel } from "@/lib/business";
import type { DateRangePreset } from "@/lib/types";
import { cn } from "@/lib/utils";

const presetOptions: { value: DateRangePreset; label: string }[] = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "LAST_7_DAYS", label: "Last 7 Days" },
  { value: "THIS_MONTH", label: "This Month" },
  { value: "LAST_MONTH", label: "Last Month" },
  { value: "CUSTOM", label: "Custom Range" },
];

export function DashboardDateRangeSelector() {
  const {
    dashboardDateRange,
    setCompareWithPrevious,
    setDashboardCustomRange,
    setDashboardPreset,
  } = useAppState();
  const [open, setOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(dashboardDateRange.startDate);
  const [customEndDate, setCustomEndDate] = useState(dashboardDateRange.endDate);

  const selectedLabel = getDateRangeLabel(dashboardDateRange);

  return (
    <>
      <Button
        onClick={() => {
          setCustomStartDate(dashboardDateRange.startDate);
          setCustomEndDate(dashboardDateRange.endDate);
          setOpen(true);
        }}
        variant="outline"
        className="h-10 rounded-none border-white/10 bg-transparent px-4 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-white/6"
      >
        <CalendarRange className="size-4" />
        <span className="max-w-[210px] truncate">{selectedLabel}</span>
        <ChevronDown className="size-4 opacity-70" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/10 bg-[#151515] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Dashboard date range</DialogTitle>
            <DialogDescription>
              Change the reporting window for profit, revenue, expense, ads ratio, charts, and expense mix.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-2 md:grid-cols-[1fr_1fr]">
            <div className="space-y-2">
              <p className="command-label">Presets</p>
              <div className="grid gap-2">
                {presetOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDashboardPreset(option.value)}
                    className={cn(
                      "border px-4 py-3 text-left text-sm font-medium transition",
                      dashboardDateRange.preset === option.value
                        ? "border-white bg-white text-black"
                        : "border-white/10 bg-[#121212] text-white hover:bg-white/6",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <p className="command-label">Selected range</p>
                <div className="border border-white/10 bg-[#121212] px-4 py-4">
                  <p className="text-base font-medium text-white">{selectedLabel}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="command-label">Custom range</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    className="rounded-none border-white/10 bg-[#121212] text-white"
                  />
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    className="rounded-none border-white/10 bg-[#121212] text-white"
                  />
                </div>
                <Button
                  variant="outline"
                  className="rounded-none border-white/10 bg-transparent text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-white/6"
                  disabled={!customStartDate || !customEndDate || customEndDate < customStartDate}
                  onClick={() =>
                    setDashboardCustomRange(customStartDate, customEndDate)
                  }
                >
                  Apply custom range
                </Button>
              </div>

              <div className="flex items-center justify-between border border-white/10 bg-[#121212] px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-white">Compare vs previous period</p>
                  <p className="mt-1 text-sm text-[#8f8f8f]">
                    Show how this range compares to the immediately previous window.
                  </p>
                </div>
                <Switch
                  checked={dashboardDateRange.compareWithPrevious}
                  onCheckedChange={setCompareWithPrevious}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-white/10 bg-[#121212]">
            <Button
              variant="outline"
              className="rounded-none border-white/10 bg-transparent text-white hover:bg-white/6"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
