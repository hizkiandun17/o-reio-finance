"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  BookOpenText,
  ChevronRight,
  Database,
  LayoutDashboard,
  Link2,
  Menu,
  MoonStar,
  Bell,
  Receipt,
  ShieldCheck,
  SunMedium,
  UserCircle2,
  WalletCards,
} from "lucide-react";
import { useTheme } from "next-themes";

import { useAppState } from "@/components/providers/app-state-provider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/format";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
};

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["OWNER", "OPS_MANAGER"] },
  { href: "/transactions", label: "Transactions", icon: Receipt, roles: ["OWNER", "OPS_MANAGER", "FINANCE"] },
  { href: "/manual-inputs", label: "Manual Inputs", icon: WalletCards, roles: ["OWNER", "FINANCE"] },
  { href: "/reconciliation", label: "Reconciliation", icon: ShieldCheck, roles: ["OWNER", "OPS_MANAGER", "FINANCE"] },
  { href: "/rules", label: "Rules", icon: BookOpenText, roles: ["OWNER", "OPS_MANAGER"] },
  { href: "/reports", label: "Reports", icon: Database, roles: ["OWNER", "OPS_MANAGER", "FINANCE"] },
  { href: "/integrations", label: "Integrations", icon: Link2, roles: ["OWNER", "OPS_MANAGER"] },
];

const pageMeta: Record<string, { title: string; kicker: string }> = {
  "/": { title: "Control center", kicker: "Financial command" },
  "/transactions": { title: "Live ledger", kicker: "Money movement" },
  "/transactions/detail": { title: "Transaction detail", kicker: "Ledger record" },
  "/manual-inputs": { title: "Manual capture", kicker: "Finance workspace" },
  "/reconciliation": { title: "Data completeness", kicker: "Trust the numbers" },
  "/rules": { title: "Keyword engine", kicker: "Auto categorization" },
  "/reports": { title: "Financial trajectory", kicker: "Decision support" },
  "/integrations": { title: "Connected systems", kicker: "Operational health" },
};

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { role } = useAppState();
  const items = navItems.filter((item) => item.roles.includes(role));

  return (
    <nav className="space-y-1 p-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-white text-black"
                  : "text-muted-foreground hover:bg-white/6 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="size-4" />
                {item.label}
              </span>
              <ChevronRight
                className={cn(
                  "size-4 opacity-0 transition group-hover:opacity-100",
                  active && "opacity-100",
                )}
              />
            </Link>
          );
        })}
      </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const { dashboard, hydrated, role, setRole } = useAppState();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const currentMeta = pageMeta[pathname] ?? pageMeta["/"];

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="surface-panel rounded-[1.5rem] border px-6 py-5 text-sm text-muted-foreground">
          Loading O-REIO workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-3 py-4 md:px-6">
      <div className="command-frame mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1420px] flex-col overflow-hidden">
        <header className="border-b border-white/8 px-4 py-4 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-[#171717] lg:hidden">
                  <Menu className="size-4" />
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] border-white/10 bg-[#111111] p-0">
                  <NavContent onNavigate={() => setSheetOpen(false)} />
                </SheetContent>
              </Sheet>

              <Link href={role === "FINANCE" ? "/manual-inputs" : "/"} className="text-lg font-semibold tracking-tight text-white">
                O-REIO
              </Link>

              <nav className="hidden items-center gap-6 lg:flex">
                {navItems
                  .filter((item) => item.roles.includes(role))
                  .map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "text-xs font-medium uppercase tracking-[0.22em] transition",
                        pathname === item.href ? "text-white" : "text-[#8f8f8f] hover:text-white",
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={role}
                onValueChange={(value) => value && setRole(value as Role)}
              >
                <SelectTrigger className="hidden w-[150px] rounded-xl border-white/10 bg-[#171717] text-xs uppercase tracking-[0.18em] md:flex">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">Owner</SelectItem>
                  <SelectItem value="OPS_MANAGER">Ops Manager</SelectItem>
                  <SelectItem value="FINANCE">Finance</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl border border-white/10 bg-[#171717] text-white hover:bg-white/8 hover:text-white"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {resolvedTheme === "dark" ? (
                  <SunMedium className="size-4" />
                ) : (
                  <MoonStar className="size-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl border border-white/10 bg-[#171717] text-white hover:bg-white/8 hover:text-white"
              >
                <Bell className="size-4" />
              </Button>

              <div className="hidden size-10 items-center justify-center rounded-xl border border-white/10 bg-[#171717] md:flex">
                <UserCircle2 className="size-5 text-white" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-between gap-4 border-b border-white/8 px-4 py-3 text-xs md:px-6">
          <div>
            <p className="command-label">{currentMeta.kicker}</p>
            <p className="mt-1 text-sm text-[#cfcfcf]">
              Last sync {formatDateTime(dashboard.lastSyncAt)}
            </p>
          </div>
          <div className="hidden items-center gap-6 text-right text-[#8f8f8f] md:flex">
            <div>
              <p className="command-label">Alerts</p>
              <p className="mt-1 text-sm text-white">{dashboard.alerts.length}</p>
            </div>
            <div>
              <p className="command-label">Reconciliation</p>
              <p className="mt-1 text-sm text-white">
                {dashboard.reconciliation.latestStatus === "COMPLETE"
                  ? "Complete"
                  : "Needs review"}
              </p>
            </div>
          </div>
        </div>

        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>

        <Separator className="bg-white/8" />
        <footer className="flex items-center justify-around px-4 py-3 lg:hidden">
          {navItems
            .filter((item) => item.roles.includes(role))
            .slice(0, 4)
            .map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex size-10 items-center justify-center rounded-xl border transition",
                    active
                      ? "border-white/20 bg-white text-black"
                      : "border-white/10 bg-[#171717] text-white",
                  )}
                >
                  <Icon className="size-4" />
                </Link>
              );
            })}
        </footer>
      </div>
    </div>
  );
}
