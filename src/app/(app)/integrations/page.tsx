"use client";

import { Link2, Siren } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/components/providers/app-state-provider";
import { RestrictedState } from "@/components/restricted-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

export default function IntegrationsPage() {
  const { integrations, role } = useAppState();

  if (role === "FINANCE") {
    return (
      <RestrictedState
        title="Finance does not manage integration status"
        description="This page is reserved for owner and operations views because it reflects system readiness, sync health, and alert routing rather than day-to-day data entry."
      />
    );
  }

  const readOnly = role === "OPS_MANAGER";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Connected systems"
        title="Integration status"
        description="Track the frontend contract states for BCA sync, internal modules, manual gateways, and WhatsApp alert delivery."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.id} className="surface-panel border-white/10">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {integration.surface === "ALERT" ? (
                    <Siren className="size-5 text-chart-3" />
                  ) : (
                    <Link2 className="size-5 text-chart-1" />
                  )}
                  <CardTitle className="text-2xl">{integration.name}</CardTitle>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {integration.note}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  integration.state === "SYNCED"
                    ? "rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : integration.state === "ATTENTION"
                      ? "rounded-full border-amber-500/20 bg-amber-500/10 text-amber-300"
                      : "rounded-full border-sky-500/20 bg-sky-500/10 text-sky-300"
                }
              >
                {integration.state}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-background/60 px-4 py-4">
                <p className="text-sm text-muted-foreground">Last event</p>
                <p className="mt-2 font-medium">{formatDateTime(integration.lastEvent)}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {integration.surface}
                </Badge>
                <Button variant="outline" className="rounded-2xl" disabled={readOnly}>
                  {readOnly ? "View only" : "Configure"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
