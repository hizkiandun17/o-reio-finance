"use client";

import { useMemo, useState } from "react";
import { Bolt, Gauge, ScanSearch } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/components/providers/app-state-provider";
import { RestrictedState } from "@/components/restricted-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCategoryLabel } from "@/lib/business";
import { formatDateTime } from "@/lib/format";

export default function RulesPage() {
  const { categoryMap, categories, keywordRules, role, saveRule, transactions } = useAppState();

  const canEdit = role === "OWNER";
  const canView = role !== "FINANCE";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | undefined>();
  const [keyword, setKeyword] = useState("FACEBOOK");
  const [categoryId, setCategoryId] = useState("cat_growth_promote_online_ads");
  const [note, setNote] = useState("Growth spend billed through Meta.");
  const [search, setSearch] = useState("");

  const filteredRules = useMemo(
    () =>
      keywordRules.filter((rule) =>
        rule.keyword.toLowerCase().includes(search.toLowerCase()),
      ),
    [keywordRules, search],
  );

  function getRuleHits(ruleKeyword: string) {
    return transactions.filter((transaction) =>
      transaction.description.toUpperCase().includes(ruleKeyword.toUpperCase()),
    ).length;
  }

  function openCreate() {
    setEditingRuleId(undefined);
    setKeyword("FACEBOOK");
    setCategoryId("cat_growth_promote_online_ads");
    setNote("Growth spend billed through Meta.");
    setDialogOpen(true);
  }

  function openEdit(ruleId: string) {
    const rule = keywordRules.find((item) => item.id === ruleId);
    if (!rule) {
      return;
    }

    setEditingRuleId(rule.id);
    setKeyword(rule.keyword);
    setCategoryId(rule.categoryId);
    setNote(rule.note);
    setDialogOpen(true);
  }

  if (!canView) {
    return (
      <RestrictedState
        title="Finance does not configure keyword rules"
        description="Finance staff can reconcile and log manual entries, but categorization rules stay in the owner and management workspace."
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Logic engine"
        title="Categorization Rules"
        description="Define how O-REIO interprets transaction keywords so income and expenses land in the right reporting groups automatically."
        actions={
          <Button
            onClick={openCreate}
            disabled={!canEdit}
            variant="outline"
            className="rounded-none border-white/10 bg-transparent px-5 text-xs font-semibold uppercase tracking-[0.22em] text-white hover:bg-white/6"
          >
            Add new rule
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="command-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="command-label">Automation health</p>
              <Bolt className="size-4 text-[#8f8f8f]" />
            </div>
            <CardTitle className="mt-4 text-5xl text-white">98.4%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-1.5 w-full bg-white/8">
              <div className="h-full w-[98.4%] bg-white" />
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-[#8f8f8f]">
              Matching confidence
            </p>
          </CardContent>
        </Card>

        <Card className="command-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="command-label">Active logic sets</p>
              <ScanSearch className="size-4 text-[#8f8f8f]" />
            </div>
            <CardTitle className="mt-4 text-5xl text-white">{keywordRules.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="inline-flex border border-white/8 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-[#8f8f8f]">
              {filteredRules.length} in current view
            </p>
          </CardContent>
        </Card>

        <Card className="command-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="command-label">System latency</p>
              <Gauge className="size-4 text-[#8f8f8f]" />
            </div>
            <CardTitle className="mt-4 text-5xl text-white">12ms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs uppercase tracking-[0.22em] text-[#8f8f8f]">
              Optimized for fast matching
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="command-panel">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="command-label">Active rule manifest</p>
            <CardTitle className="mt-3 text-2xl text-white">Current mappings</CardTitle>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter by keyword..."
            className="h-11 max-w-xs rounded-none border-white/10 bg-[#121212] text-white"
          />
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              className="grid gap-4 border-t border-white/8 py-5 first:border-t-0 md:grid-cols-[1.1fr_0.75fr_120px]"
            >
              <div>
                <p className="text-lg font-semibold text-white">{rule.keyword}</p>
                <p className="mt-1 text-sm text-[#8f8f8f]">{rule.note}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#666]">
                  Updated {formatDateTime(rule.updatedAt)}
                </p>
              </div>
              <div>
                <p className="command-label">Target category</p>
                <p className="mt-3 text-sm text-white">
                  {getCategoryLabel(rule.categoryId, categoryMap)}
                </p>
              </div>
              <div className="flex items-start justify-between gap-3 md:block md:text-right">
                <div>
                  <p className="text-lg font-semibold text-white">{getRuleHits(rule.keyword)}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8f8f8f]">
                    Hits
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="rounded-none px-0 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-transparent hover:text-white"
                  disabled={!canEdit}
                  onClick={() => openEdit(rule.id)}
                >
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-white/10 bg-[#151515] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingRuleId ? "Edit rule" : "Create rule"}</DialogTitle>
            <DialogDescription>
              Keep the matching logic simple and predictable.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <label className="command-label">Keyword</label>
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value.toUpperCase())}
                className="rounded-none border-white/10 bg-[#121212] text-white"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <label className="command-label">Target category</label>
              <Select
                value={categoryId}
                onValueChange={(value) => value && setCategoryId(value)}
                disabled={!canEdit}
              >
                <SelectTrigger className="rounded-none border-white/10 bg-[#121212] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((category) => category.type === "EXPENSE" && category.parentId)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {getCategoryLabel(category.id, categoryMap)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="command-label">Notes</label>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="min-h-28 rounded-none border-white/10 bg-[#121212] text-white"
                disabled={!canEdit}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              className="rounded-none border border-white bg-white text-black hover:bg-white/90"
              disabled={!canEdit || keyword.trim().length === 0}
              onClick={() => {
                saveRule({ keyword, categoryId, note }, editingRuleId);
                setDialogOpen(false);
              }}
            >
              Save rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
