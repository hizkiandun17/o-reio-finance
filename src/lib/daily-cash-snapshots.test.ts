import { describe, expect, it } from "vitest";

import type { DailyCashSnapshot } from "@/lib/types";

import { compareBalance, getSnapshotTotal } from "./daily-cash-snapshots";

describe("daily cash snapshot helpers", () => {
  it("sums all account balances from a snapshot", () => {
    const snapshot: DailyCashSnapshot = {
      date: "2026-04-08",
      accounts: [
        { account_id: "bca_pt", balance: 120000000 },
        { account_id: "wise", balance: 45000000 },
        { account_id: "pingpong", balance: 30000000 },
      ],
      total_balance: 195000000,
      closingBalance: 195000000,
      currency: "IDR",
      capturedAt: "2026-04-09T00:05:00+07:00",
      sourceCount: 3,
      status: "COMPLETE",
      metadata: {
        includedChannelIds: ["chn_bca", "chn_wise", "chn_pingpong"],
        missingChannelIds: [],
        availableChannelIds: ["chn_bca", "chn_wise", "chn_pingpong"],
        accountBreakdown: [],
      },
    };

    expect(getSnapshotTotal(snapshot)).toBe(195000000);
  });

  it("compares live balance against a snapshot total", () => {
    expect(compareBalance(210000000, 200000000)).toEqual({
      difference: 10000000,
      percentage: 0.05,
    });
  });

  it("returns zero percentage when the snapshot total is zero", () => {
    expect(compareBalance(5000000, 0)).toEqual({
      difference: 5000000,
      percentage: 0,
    });
  });
});
