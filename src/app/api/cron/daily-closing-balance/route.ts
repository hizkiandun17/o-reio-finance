import { NextResponse } from "next/server";

import {
  DAILY_CLOSING_TIMEZONE,
  getPreviousClosingDate,
  runDailyClosingSnapshot,
} from "@/server/balance-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET() {
  const targetDate = getPreviousClosingDate();
  const result = await runDailyClosingSnapshot(targetDate);

  return NextResponse.json({
    ok: true,
    mode: "scheduled",
    timeZone: DAILY_CLOSING_TIMEZONE,
    targetDate,
    snapshot: result.snapshot,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { date?: unknown };
  const targetDate = isIsoDate(body.date) ? body.date : getPreviousClosingDate();
  const result = await runDailyClosingSnapshot(targetDate);

  return NextResponse.json({
    ok: true,
    mode: "manual",
    timeZone: DAILY_CLOSING_TIMEZONE,
    targetDate,
    snapshot: result.snapshot,
  });
}
