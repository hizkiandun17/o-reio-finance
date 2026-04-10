import { NextResponse } from "next/server";

import { getBalanceSummary } from "@/server/balance-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await getBalanceSummary();
  return NextResponse.json(summary);
}
