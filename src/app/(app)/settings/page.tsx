"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  ChevronRight,
  Cog,
  Database,
  Link2,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/components/providers/app-state-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accounts as accountSeed } from "@/lib/mock-data";

export default function SettingsPage() {
  const { integrations, keywordRules } = useAppState();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration layer"
        title="Settings"
        description="Setup and maintenance live here, separate from the daily operating workflow."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <SettingsSectionCard
          icon={Link2}
          title="Integrations"
          description="Connections and sync surfaces for commerce, banking, and external services."
          items={[
            "Shopify",
            "TikTok",
            "Bank connections",
            "External services",
          ]}
          meta={`${integrations.length} connected surfaces`}
          href="/integrations"
          actionLabel="Open integrations"
        />

        <SettingsSectionCard
          icon={Sparkles}
          title="Automation / Rules"
          description="Logic that controls categorization, mapping, and automated transaction handling."
          items={[
            "Categorization rules",
            "Auto-mapping logic",
            "Rule-based processing",
          ]}
          meta={`${keywordRules.length} active rules`}
          href="/rules"
          actionLabel="Open rules"
        />

        <SettingsSectionCard
          icon={Database}
          title="Accounts"
          description="Financial accounts and balance-related entities used across live balance and ledger reporting."
          items={accountSeed.map((account) => `${account.name} · ${account.currency}`)}
          meta={`${accountSeed.length} configured accounts`}
        />

        <SettingsSectionCard
          icon={SlidersHorizontal}
          title="Preferences"
          description="Display and formatting defaults that shape how financial data is presented across the workspace."
          items={[
            "Currency: IDR base reporting",
            "Date format: operational daily view",
            "Display options",
          ]}
          meta="Workspace defaults"
        />
      </div>

      <Card className="surface-panel border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Cog className="size-4 text-[#8f8f8f]" />
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8f8f8f]">
              Usage split
            </p>
          </div>
          <CardTitle className="text-xl text-white">Daily work vs setup</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-[#9f9f9f] md:grid-cols-2">
          <div className="rounded-[18px] border border-white/8 bg-[#121212] px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#7f7f7f]">
              Daily workflow
            </p>
            <p className="mt-2 text-white">
              Dashboard, Transactions, Manual Input, Reconciliation, and Reports.
            </p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-[#121212] px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#7f7f7f]">
              Occasional setup
            </p>
            <p className="mt-2 text-white">
              Integrations, rules, account configuration, and preferences.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsSectionCard({
  actionLabel,
  description,
  href,
  icon: Icon,
  items,
  meta,
  title,
}: {
  actionLabel?: string;
  description: string;
  href?: string;
  icon: ComponentType<{ className?: string }>;
  items: string[];
  meta: string;
  title: string;
}) {
  return (
    <Card className="surface-panel border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-[#8f8f8f]" />
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8f8f8f]">
            {title}
          </p>
        </div>
        <CardTitle className="text-xl text-white">{title}</CardTitle>
        <p className="text-sm text-[#8f8f8f]">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[18px] border border-white/8 bg-[#121212] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[#7f7f7f]">{meta}</p>
          <div className="mt-3 space-y-2">
            {items.map((item) => (
              <div
                key={item}
                className="flex items-center justify-between gap-3 text-sm text-[#cfcfcf]"
              >
                <span>{item}</span>
                <ChevronRight className="size-3.5 text-[#5f5f5f]" />
              </div>
            ))}
          </div>
        </div>
        {href && actionLabel ? (
          <Link href={href}>
            <Button
              variant="outline"
              className="rounded-none border-white/10 bg-transparent text-white hover:bg-white/6"
            >
              {actionLabel}
            </Button>
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
