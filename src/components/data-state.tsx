"use client";

import * as React from "react";
import { AlertCircle, Inbox } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeaderSkeleton({
  showActions = false,
}: {
  showActions?: boolean;
}) {
  return (
    <div className="space-y-3 md:space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-28 bg-white/8" />
        <Skeleton className="h-10 w-56 bg-white/8 sm:w-72 md:h-14 md:w-96" />
        <Skeleton className="h-4 w-full max-w-2xl bg-white/8" />
        <Skeleton className="h-4 w-4/5 max-w-xl bg-white/8" />
      </div>
      {showActions ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Skeleton className="h-10 w-full bg-white/8 sm:w-44" />
          <Skeleton className="h-10 w-full bg-white/8 sm:w-32" />
          <Skeleton className="h-10 w-full bg-white/8 sm:w-28" />
        </div>
      ) : null}
    </div>
  );
}

export function MetricCardsSkeleton({
  count = 3,
  columnsClassName = "md:grid-cols-3",
}: {
  count?: number;
  columnsClassName?: string;
}) {
  return (
    <div className={cn("grid gap-3 md:gap-4", columnsClassName)}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="command-panel">
          <CardHeader className="space-y-3">
            <Skeleton className="h-3 w-24 bg-white/8" />
            <Skeleton className="h-10 w-32 bg-white/8" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-40 bg-white/8" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChartCardSkeleton({
  className,
  chartHeightClassName = "h-72",
}: {
  className?: string;
  chartHeightClassName?: string;
}) {
  return (
    <Card className={cn("command-panel", className)}>
      <CardHeader className="space-y-3">
        <Skeleton className="h-3 w-24 bg-white/8" />
        <Skeleton className="h-8 w-44 bg-white/8" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className={cn("w-full bg-white/8", chartHeightClassName)} />
        <div className="space-y-2">
          <Skeleton className="h-3 w-40 bg-white/8" />
          <Skeleton className="h-3 w-32 bg-white/8" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TableCardSkeleton({
  rows = 6,
}: {
  rows?: number;
}) {
  return (
    <Card className="command-panel">
      <CardHeader className="space-y-3">
        <Skeleton className="h-8 w-36 bg-white/8" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-[1.1fr_140px]">
          <Skeleton className="h-11 w-full bg-white/8" />
          <Skeleton className="h-11 w-full bg-white/8" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={index}
              className="rounded-[1.25rem] border border-white/8 bg-[#121212] px-4 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3 bg-white/8" />
                  <Skeleton className="h-3 w-1/3 bg-white/8" />
                </div>
                <Skeleton className="h-5 w-20 bg-white/8" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Skeleton className="h-14 w-full bg-white/8" />
                <Skeleton className="h-14 w-full bg-white/8" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function FormCardSkeleton() {
  return (
    <Card className="command-panel">
      <CardHeader className="space-y-3">
        <Skeleton className="h-8 w-32 bg-white/8" />
      </CardHeader>
      <CardContent className="space-y-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-24 bg-white/8" />
            <Skeleton className="h-12 w-full bg-white/8" />
          </div>
        ))}
        <Skeleton className="h-28 w-full bg-white/8" />
        <Skeleton className="h-12 w-full bg-white/8" />
      </CardContent>
    </Card>
  );
}

export function ListCardSkeleton({
  rows = 4,
  titleWidthClassName = "w-40",
}: {
  rows?: number;
  titleWidthClassName?: string;
}) {
  return (
    <Card className="command-panel">
      <CardHeader className="space-y-3">
        <Skeleton className={cn("h-8 bg-white/8", titleWidthClassName)} />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="flex items-start justify-between gap-4 border-t border-white/8 pt-3 first:border-t-0 first:pt-0"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3 bg-white/8" />
              <Skeleton className="h-3 w-1/3 bg-white/8" />
            </div>
            <div className="space-y-2 text-right">
              <Skeleton className="h-5 w-20 bg-white/8" />
              <Skeleton className="h-3 w-14 bg-white/8" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function StateMessage({
  title,
  description,
  tone = "empty",
  className,
}: {
  title: string;
  description: string;
  tone?: "empty" | "error";
  className?: string;
}) {
  const Icon = tone === "error" ? AlertCircle : Inbox;

  return (
    <div
      className={cn(
        "rounded-[1.35rem] border px-4 py-5 text-center",
        tone === "error"
          ? "border-rose-500/18 bg-rose-500/[0.05]"
          : "border-white/8 bg-[#121212]",
        className,
      )}
    >
      <div className="mx-auto flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
        <Icon className={cn("size-4", tone === "error" ? "text-rose-300" : "text-[#a1a1aa]")} />
      </div>
      <p className="mt-3 text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-sm text-[#8f8f8f]">{description}</p>
    </div>
  );
}

type SectionErrorBoundaryProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
};

type SectionErrorBoundaryState = {
  hasError: boolean;
};

class SectionErrorBoundaryInner extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  override state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch() {
    // Intentionally swallow render errors and replace the section UI with a safe fallback.
  }

  override render() {
    if (this.state.hasError) {
      return (
        <StateMessage
          title={this.props.title ?? "Something went wrong"}
          description={
            this.props.description ??
            "Please refresh or try again."
          }
          tone="error"
          className={this.props.className}
        />
      );
    }

    return this.props.children;
  }
}

export function SectionErrorBoundary(props: SectionErrorBoundaryProps) {
  return <SectionErrorBoundaryInner {...props} />;
}
