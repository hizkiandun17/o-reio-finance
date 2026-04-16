"use client";

import { startTransition, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { formatCompactCurrency, formatPercent } from "@/lib/format";
import type {
  DashboardExpenseBreakdown,
  ExpenseGroup,
  TrendPoint,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const expenseColors: Record<ExpenseGroup, string> = {
  GROWTH: "#6f9c7b",
  COST: "#6a85a6",
  OVERHEAD: "#b4875b",
};

const subcategoryPalettes: Record<ExpenseGroup, string[]> = {
  GROWTH: ["#6f9c7b", "#638d6f", "#577d63", "#4b6e57", "#415f4c", "#375141"],
  COST: ["#6a85a6", "#5f7897", "#556b87", "#4a5e78", "#415269", "#38465a"],
  OVERHEAD: ["#b4875b", "#a57950", "#956b47", "#865f3e", "#765336", "#67472f"],
};

function CurrencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151515] p-3 shadow-2xl backdrop-blur-xl">
      {label ? <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p> : null}
      <div className="space-y-1.5">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.name}</span>
            </div>
            <span className="font-medium text-foreground">
              {formatCompactCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExpenseDonutChart({
  data,
}: {
  data: DashboardExpenseBreakdown;
}) {
  const [drilldown, setDrilldown] = useState<
    { level: "main" } | { level: "subcategory"; group: ExpenseGroup }
  >({ level: "main" });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const currentView = useMemo(() => {
    const items =
      drilldown.level === "main"
        ? data.main
        : data.subcategories[drilldown.group].map((item) => ({
            id: item.categoryId,
            label: item.label,
            value: item.value,
            group: item.group,
          }));
    const total = items.reduce((sum, item) => sum + item.value, 0);
    const selectedMainCategory =
      drilldown.level === "subcategory"
        ? data.main.find((item) => item.group === drilldown.group)
        : null;

    return {
      title: selectedMainCategory?.label ?? "Expense Mix",
      total,
      items: items.map((item, index) => ({
        ...item,
        percentage: total === 0 ? 0 : (item.value / total) * 100,
        fill:
          drilldown.level === "main"
            ? expenseColors[item.group]
            : subcategoryPalettes[item.group][index % subcategoryPalettes[item.group].length],
      })),
    };
  }, [data.main, data.subcategories, drilldown]);

  const canDrillDown = drilldown.level === "main";
  const hasData = currentView.total > 0 && currentView.items.length > 0;
  const topInsightItem = useMemo(
    () =>
      [...currentView.items].sort((left, right) => right.value - left.value)[0] ?? null,
    [currentView.items],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#8f8f8f]">
            {drilldown.level === "main" ? "Top level" : "Subcategories"}
          </p>
          <p className="mt-2 text-sm text-[#b5b5b5]">
            {drilldown.level === "main"
              ? "Click a segment to inspect its subcategories."
              : `${currentView.title} categories in the selected date range.`}
          </p>
        </div>
        {drilldown.level === "subcategory" ? (
          <Button
            variant="ghost"
            className="h-8 rounded-none border border-white/10 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-white/6"
            onClick={() =>
              startTransition(() => {
                setDrilldown({ level: "main" });
                setActiveIndex(null);
              })
            }
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Button>
        ) : null}
      </div>

      <div className="h-80 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={currentView.items}
                dataKey="value"
                nameKey="label"
                innerRadius={82}
                outerRadius={116}
                paddingAngle={4}
                strokeWidth={0}
                isAnimationActive
                animationDuration={240}
                animationEasing="ease-out"
                onClick={(_, index) => {
                  const clickedItem =
                    typeof index === "number" ? currentView.items[index] : undefined;

                  if (!canDrillDown || !clickedItem || clickedItem.value <= 0) {
                    return;
                  }

                  startTransition(() => {
                    setDrilldown({
                      level: "subcategory",
                      group: clickedItem.group,
                    });
                    setActiveIndex(null);
                  });
                }}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {currentView.items.map((entry, index) => (
                  <Cell
                    key={entry.id}
                    fill={
                      activeIndex === index ? brightenHex(entry.fill, 0.08) : entry.fill
                    }
                    cursor={canDrillDown && entry.value > 0 ? "pointer" : "default"}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.68}
                    stroke={activeIndex === index ? "rgba(255,255,255,0.85)" : "transparent"}
                    strokeWidth={activeIndex === index ? 1.5 : 0}
                    onMouseEnter={() => setActiveIndex(index)}
                  />
                ))}
              </Pie>
              <Tooltip content={<ExpenseBreakdownTooltip />} />
              <text
                x="50%"
                y="47%"
                textAnchor="middle"
                fill="#8f8f8f"
                fontSize="12"
                letterSpacing="0.24em"
                style={{ textTransform: "uppercase" }}
              >
                {currentView.title}
              </text>
              <text
                x="50%"
                y="56%"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="28"
                fontWeight="600"
              >
                {formatCompactCurrency(currentView.total)}
              </text>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[28px] border border-white/8 bg-[#121212]">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8f8f8f]">
                {currentView.title}
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {formatCompactCurrency(currentView.total)}
              </p>
              <p className="mt-3 text-sm text-[#8f8f8f]">
                No expense activity in this range.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/8 pt-3 text-sm text-[#b8b8b8]">
        {topInsightItem ? (
          <p>
            Top expense:{" "}
            <span className="font-medium text-white">{topInsightItem.label}</span>{" "}
            <span className="text-[#8f8f8f]">
              ({formatPercent(topInsightItem.percentage)})
            </span>
          </p>
        ) : (
          <p>No expense activity in this range.</p>
        )}
      </div>

      <div className="space-y-2">
        {(hasData ? currentView.items : []).map((item) => {
          const interactive = drilldown.level === "main" && item.value > 0;

          return (
            <button
              key={item.id}
              type="button"
              disabled={!interactive}
              onClick={() => {
                if (!interactive) {
                  return;
                }

                startTransition(() => {
                  setDrilldown({ level: "subcategory", group: item.group });
                  setActiveIndex(null);
                });
              }}
              className={cn(
                "flex w-full items-center justify-between border-t border-white/8 py-3 text-left text-sm transition",
                interactive ? "hover:bg-white/5" : "cursor-default",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <div>
                  <p className="text-[#b8b8b8]">{item.label}</p>
                  <p className="mt-1 text-xs text-[#7e7e7e]">
                    {formatPercent(item.percentage)}
                  </p>
                </div>
              </div>
              <span className="font-medium text-white">
                {formatCompactCurrency(item.value)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function brightenHex(hex: string, amount: number) {
  const normalized = hex.replace("#", "");
  const channels =
    normalized.length === 3
      ? normalized.split("").map((value) => parseInt(value.repeat(2), 16))
      : [
          parseInt(normalized.slice(0, 2), 16),
          parseInt(normalized.slice(2, 4), 16),
          parseInt(normalized.slice(4, 6), 16),
        ];

  const next = channels.map((value) =>
    Math.min(255, Math.round(value + (255 - value) * amount)),
  );

  return `#${next.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function ExpenseBreakdownTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: {
      label: string;
      value: number;
      percentage: number;
      fill: string;
    };
  }>;
}) {
  const item = payload?.[0]?.payload;

  if (!active || !item) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151515] p-3 shadow-2xl backdrop-blur-xl">
      <p className="text-sm font-medium text-white">{item.label}</p>
      <div className="mt-2 space-y-1 text-sm text-[#bdbdbd]">
        <div className="flex items-center justify-between gap-5">
          <span>Amount</span>
          <span className="font-medium text-white">
            {formatCompactCurrency(item.value)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span>Share</span>
          <span className="font-medium text-white">
            {formatPercent(item.percentage)}
          </span>
        </div>
      </div>
    </div>
  );
}

function calculateMovingAverage(
  values: number[],
  index: number,
  windowSize = 3,
) {
  const start = Math.max(0, index - windowSize + 1);
  const slice = values.slice(start, index + 1);
  const total = slice.reduce((sum, value) => sum + value, 0);

  return slice.length === 0 ? 0 : total / slice.length;
}

function getTrendDomain(data: Array<{ revenue: number; expense: number; net: number }>) {
  const values = data.flatMap((point) => [point.revenue, point.expense, point.net]);
  const minimum = Math.min(...values, 0);
  const maximum = Math.max(...values, 0);
  const spread = Math.max(maximum - minimum, Math.abs(maximum), Math.abs(minimum), 1);
  const padding = spread * 0.14;

  return [minimum - padding * 0.45, maximum + padding] as const;
}

function TrendLatestDot({
  cx,
  cy,
  payload,
  stroke,
}: {
  cx?: number;
  cy?: number;
  payload?: { isLatest?: boolean };
  stroke?: string;
}) {
  if (!payload?.isLatest || cx === undefined || cy === undefined) {
    return null;
  }

  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill="rgba(255,255,255,0.08)" />
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={stroke ?? "#ffffff"}
        stroke="#0b0b0b"
        strokeWidth={1.5}
      />
    </g>
  );
}

function TrendTooltip({
  active,
  payload,
  label,
  showTrend = false,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: TrendPoint & {
      isLatest?: boolean;
      revenueTrend?: number;
      expenseTrend?: number;
      netTrend?: number;
    };
  }>;
  label?: string;
  showTrend?: boolean;
}) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="min-w-[220px] rounded-2xl border border-white/10 bg-[#151515] p-3 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {label ?? point.label}
        </p>
        {point.isLatest ? (
          <span className="rounded-full border border-white/10 bg-white/6 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white">
            Latest
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-2">
        <TrendTooltipRow
          color="var(--chart-1)"
          label="Revenue"
          value={point.revenue}
          trendValue={showTrend ? point.revenueTrend : undefined}
        />
        <TrendTooltipRow
          color="var(--chart-3)"
          label="Expense"
          value={point.expense}
          trendValue={showTrend ? point.expenseTrend : undefined}
        />
        <TrendTooltipRow
          color="var(--chart-4)"
          label="Net"
          value={point.net}
          trendValue={showTrend ? point.netTrend : undefined}
        />
      </div>
      {typeof point.adsRatio === "number" ? (
        <div className="mt-3 border-t border-white/8 pt-3 text-xs text-[#9f9f9f]">
          ADS ratio {formatPercent(point.adsRatio * 100)}
        </div>
      ) : null}
    </div>
  );
}

function TrendTooltipRow({
  color,
  label,
  value,
  trendValue,
}: {
  color: string;
  label: string;
  value: number;
  trendValue?: number;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <div className="flex items-start gap-2 text-muted-foreground">
        <span
          className="mt-1 size-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div>
          <span>{label}</span>
          {typeof trendValue === "number" ? (
            <p className="mt-1 text-xs text-[#8f8f8f]">
              Trend {formatCompactCurrency(trendValue)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-foreground">
          {formatCompactCurrency(value)}
        </p>
      </div>
    </div>
  );
}

type TrendChartPoint = TrendPoint & {
  isLatest: boolean;
  revenueTrend?: number;
  expenseTrend?: number;
  netTrend?: number;
};

function SingleDayBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: {
      label: string;
      value: number;
      fill: string;
      note: string;
    };
  }>;
}) {
  const item = payload?.[0]?.payload;

  if (!active || !item) {
    return null;
  }

  return (
    <div className="min-w-[220px] rounded-2xl border border-white/10 bg-[#151515] p-3 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: item.fill }}
        />
        <p className="text-sm font-medium text-white">{item.label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">
        {formatCompactCurrency(item.value)}
      </p>
      <p className="mt-2 text-xs text-[#8f8f8f]">{item.note}</p>
    </div>
  );
}

export function SingleDayPerformanceChart({
  revenue,
  expense,
  net,
  dateLabel,
}: {
  revenue: number;
  expense: number;
  net: number;
  dateLabel: string;
}) {
  const data = [
    {
      label: "Revenue",
      value: revenue,
      fill: "rgb(74 222 128 / 0.88)",
      note: "Verified revenue for the selected day.",
    },
    {
      label: "Expense",
      value: expense,
      fill: "rgb(161 161 170 / 0.82)",
      note: "Verified expense for the selected day.",
    },
    {
      label: "Net",
      value: net,
      fill:
        net > 0
          ? "rgb(45 212 191 / 0.9)"
          : net < 0
            ? "rgb(103 232 249 / 0.82)"
            : "rgb(163 163 163 / 0.72)",
      note: "Revenue minus expense from the same dataset.",
    },
  ];
  const domain = getTrendDomain(
    data.map((item) => ({
      revenue: item.value,
      expense: 0,
      net: 0,
    })),
  );

  return (
    <div className="space-y-4">
      <div className="rounded-[18px] border border-white/8 bg-[#121212] px-4 py-3">
        <p className="text-sm font-medium text-white">
          Single-day view — no trend available
        </p>
        <p className="mt-1 text-sm text-[#8f8f8f]">{dateLabel}</p>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgb(255 255 255 / 0.08)" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              tick={{ fill: "#7a7a7a", fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={64}
              domain={domain}
              tickCount={5}
              tickFormatter={(value) => formatCompactCurrency(value)}
              tick={{ fill: "#7a7a7a", fontSize: 12 }}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.16)" />
            <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} content={<SingleDayBarTooltip />} />
            <Bar dataKey="value" radius={[12, 12, 0, 0]} maxBarSize={72}>
              {data.map((item) => (
                <Cell key={item.label} fill={item.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TrendChart({
  data,
  dense = false,
  muted = false,
  showTrend = false,
}: {
  data: TrendPoint[];
  dense?: boolean;
  muted?: boolean;
  showTrend?: boolean;
}) {
  const displayData = useMemo<TrendChartPoint[]>(() => {
    if (!showTrend) {
      return data.map((point, index) => ({
        ...point,
        isLatest: index === data.length - 1,
      }));
    }

    const revenueSeries = data.map((point) => point.revenue);
    const expenseSeries = data.map((point) => point.expense);
    const netSeries = data.map((point) => point.net);

    return data.map((point, index) => ({
      ...point,
      isLatest: index === data.length - 1,
      revenueTrend: calculateMovingAverage(revenueSeries, index),
      expenseTrend: calculateMovingAverage(expenseSeries, index),
      netTrend: calculateMovingAverage(netSeries, index),
    }));
  }, [data, showTrend]);

  const yDomain = useMemo(
    () =>
      getTrendDomain(
        displayData.map((point) => ({
          revenue:
            showTrend && typeof point.revenueTrend === "number"
              ? Math.abs(point.revenueTrend) > Math.abs(point.revenue)
                ? point.revenueTrend
                : point.revenue
              : point.revenue,
          expense:
            showTrend && typeof point.expenseTrend === "number"
              ? Math.abs(point.expenseTrend) > Math.abs(point.expense)
                ? point.expenseTrend
                : point.expense
              : point.expense,
          net:
            showTrend && typeof point.netTrend === "number"
              ? Math.abs(point.netTrend) > Math.abs(point.net)
                ? point.netTrend
                : point.net
              : point.net,
        })),
      ),
    [displayData, showTrend],
  );
  const latestPoint = displayData.at(-1);

  return (
    <div className="space-y-3">
      <div className={dense ? "h-72 w-full" : "h-80 w-full"}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgb(255 255 255 / 0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            tick={{ fill: "#7a7a7a", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            domain={yDomain}
            tickCount={5}
            tickFormatter={(value) => formatCompactCurrency(value)}
            tick={{ fill: "#7a7a7a", fontSize: 12 }}
          />
          {latestPoint ? (
            <ReferenceLine
              x={latestPoint.label}
              stroke="rgba(255,255,255,0.12)"
              strokeDasharray="4 4"
            />
          ) : null}
          <Tooltip content={<TrendTooltip showTrend={showTrend} />} />
          <Line
            type="linear"
            dataKey="revenue"
            stroke={muted ? "rgb(141 211 149 / 0.72)" : "var(--chart-1)"}
            strokeWidth={muted ? 2 : 2.5}
            strokeOpacity={muted ? 0.78 : 1}
            dot={<TrendLatestDot />}
            activeDot={{ r: 5, fill: muted ? "rgb(141 211 149 / 0.92)" : "var(--chart-1)" }}
            name="Revenue"
          />
          {showTrend ? (
            <Line
              type="monotone"
              dataKey="revenueTrend"
              stroke={muted ? "rgb(141 211 149 / 0.34)" : "rgb(141 211 149 / 0.46)"}
              strokeWidth={1.5}
              strokeDasharray="4 5"
              strokeOpacity={0.7}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              name="Revenue trend"
            />
          ) : null}
          <Line
            type="linear"
            dataKey="expense"
            stroke={muted ? "rgb(176 176 181 / 0.72)" : "var(--chart-3)"}
            strokeWidth={2}
            strokeOpacity={muted ? 0.72 : 1}
            dot={<TrendLatestDot />}
            activeDot={{ r: 5, fill: muted ? "rgb(176 176 181 / 0.88)" : "var(--chart-3)" }}
            name="Expense"
          />
          {showTrend ? (
            <Line
              type="monotone"
              dataKey="expenseTrend"
              stroke={muted ? "rgb(176 176 181 / 0.3)" : "rgb(176 176 181 / 0.42)"}
              strokeWidth={1.5}
              strokeDasharray="4 5"
              strokeOpacity={0.68}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              name="Expense trend"
            />
          ) : null}
          <Line
            type="linear"
            dataKey="net"
            stroke={muted ? "rgb(240 190 110 / 0.78)" : "var(--chart-4)"}
            strokeWidth={2}
            strokeOpacity={muted ? 0.82 : 1}
            strokeDasharray="6 4"
            dot={<TrendLatestDot />}
            activeDot={{ r: 5, fill: muted ? "rgb(240 190 110 / 0.92)" : "var(--chart-4)" }}
            name="Net"
          />
          {showTrend ? (
            <Line
              type="monotone"
              dataKey="netTrend"
              stroke={muted ? "rgb(240 190 110 / 0.32)" : "rgb(240 190 110 / 0.44)"}
              strokeWidth={1.5}
              strokeDasharray="4 5"
              strokeOpacity={0.7}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              name="Net trend"
            />
          ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#8f8f8f]">
        <span>Solid lines show actual daily values.</span>
        {showTrend ? <span>Dashed lines show the optional trend view.</span> : null}
        <span>The latest day is highlighted for quick comparison.</span>
      </div>
    </div>
  );
}

export function ExpenseGroupBarChart({
  data,
}: {
  data: { group: string; value: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgb(255 255 255 / 0.08)" vertical={false} />
          <XAxis dataKey="group" tickLine={false} axisLine={false} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCompactCurrency(value)}
          />
          <Tooltip content={<CurrencyTooltip />} />
          <Bar dataKey="value" radius={[10, 10, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.group}
                fill={
                  entry.group === "GROWTH"
                    ? "var(--chart-1)"
                    : entry.group === "COST"
                      ? "var(--chart-2)"
                      : "var(--chart-3)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
