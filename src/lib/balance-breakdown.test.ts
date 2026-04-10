import { describe, expect, it } from "vitest";

import type { Account, UnifiedTransaction } from "@/lib/types";

import { getAllAccountBalances, getBalanceBreakdown } from "./balance-breakdown";

describe("balance breakdown helpers", () => {
  it("builds live balances for every account", () => {
    const accounts: Account[] = [
      {
        id: "bca_pt",
        name: "BCA PT",
        currency: "IDR",
        source: "auto",
        type: "bank",
      },
      {
        id: "pingpong",
        name: "PingPong",
        currency: "USD",
        source: "manual",
        type: "platform",
      },
      {
        id: "wise",
        name: "Wise",
        currency: "USD",
        source: "manual",
        type: "wallet",
      },
      {
        id: "payout_holding",
        name: "Payout Holding",
        currency: "IDR",
        source: "manual",
        type: "holding",
      },
    ];

    const transactions: UnifiedTransaction[] = [
      {
        id: "utx_1",
        type: "income",
        account_id: "bca_pt",
        channel: null,
        category_group: null,
        category_name: null,
        status: "verified",
        origin: "manual",
        amount: 1000000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 1000000,
        transaction_date: "2026-04-09T08:00:00+08:00",
        description: "Income to BCA",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_2",
        type: "expense",
        account_id: "bca_pt",
        channel: null,
        category_group: "overhead",
        category_name: "Office Rent",
        status: "pending",
        origin: "manual",
        amount: 250000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 250000,
        transaction_date: "2026-04-09T09:00:00+08:00",
        description: "Rent payment",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_3",
        type: "income",
        account_id: "pingpong",
        channel: null,
        category_group: null,
        category_name: null,
        status: "verified",
        origin: "manual",
        amount: 500000,
        original_currency: "USD",
        exchange_rate: 16000,
        base_amount: 500000,
        transaction_date: "2026-04-09T10:00:00+08:00",
        description: "Platform settlement",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_4",
        type: "transfer",
        account_id: "wise",
        target_account_id: "bca_pt",
        channel: null,
        category_group: null,
        category_name: null,
        status: "verified",
        origin: "manual",
        amount: 100000,
        original_currency: "USD",
        exchange_rate: 16000,
        base_amount: 100000,
        transaction_date: "2026-04-09T11:00:00+08:00",
        description: "Move cash to BCA",
        proof: null,
        logged_by: "usr_finance",
      },
    ];

    expect(getAllAccountBalances(accounts, transactions)).toEqual([
      {
        account: accounts[0],
        balance: 850000,
      },
      {
        account: accounts[1],
        balance: 500000,
      },
      {
        account: accounts[2],
        balance: -100000,
      },
      {
        account: accounts[3],
        balance: 0,
      },
    ]);
  });

  it("builds live balance groups from account nature and unified transactions", () => {
    const accounts: Account[] = [
      {
        id: "bca_pt",
        name: "BCA PT",
        currency: "IDR",
        source: "auto",
        type: "bank",
      },
      {
        id: "pingpong",
        name: "PingPong",
        currency: "USD",
        source: "manual",
        type: "platform",
        group: "foreign",
      },
      {
        id: "bca_sgd_cv",
        name: "BCA SGD CV",
        currency: "SGD",
        source: "manual",
        type: "bank",
      },
      {
        id: "wise",
        name: "Wise",
        currency: "USD",
        source: "manual",
        type: "wallet",
      },
      {
        id: "payout_holding",
        name: "Payout Holding",
        currency: "IDR",
        source: "manual",
        type: "holding",
      },
    ];

    const transactions: UnifiedTransaction[] = [
      {
        id: "utx_1",
        type: "income",
        account_id: "bca_pt",
        channel: null,
        category_group: null,
        category_name: null,
        status: "verified",
        origin: "manual",
        amount: 1000000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 1000000,
        transaction_date: "2026-04-09T08:00:00+08:00",
        description: "Income to BCA",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_2",
        type: "expense",
        account_id: "bca_pt",
        channel: null,
        category_group: "overhead",
        category_name: "Office Rent",
        status: "pending",
        origin: "manual",
        amount: 250000,
        original_currency: "IDR",
        exchange_rate: 1,
        base_amount: 250000,
        transaction_date: "2026-04-09T09:00:00+08:00",
        description: "Rent payment",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_3",
        type: "income",
        account_id: "pingpong",
        channel: null,
        category_group: null,
        category_name: null,
        status: "verified",
        origin: "manual",
        amount: 500000,
        original_currency: "USD",
        exchange_rate: 16000,
        base_amount: 500000,
        transaction_date: "2026-04-09T10:00:00+08:00",
        description: "Platform settlement",
        proof: null,
        logged_by: "usr_finance",
      },
      {
        id: "utx_4",
        type: "transfer",
        account_id: "wise",
        target_account_id: "bca_pt",
        channel: null,
        category_group: null,
        category_name: null,
        status: "verified",
        origin: "manual",
        amount: 100000,
        original_currency: "USD",
        exchange_rate: 16000,
        base_amount: 100000,
        transaction_date: "2026-04-09T11:00:00+08:00",
        description: "Move cash to BCA",
        proof: null,
        logged_by: "usr_finance",
      },
    ];

    expect(getBalanceBreakdown(accounts, transactions)).toEqual({
      local: {
        accounts: [
          {
            id: "bca_pt",
            name: "BCA PT",
            balance: 850000,
          },
          {
            id: "bca_sgd_cv",
            name: "BCA SGD CV",
            balance: 0,
          },
        ],
        total: 850000,
      },
      foreign: {
        accounts: [
          {
            id: "pingpong",
            name: "PingPong",
            balance: 500000,
          },
          {
            id: "wise",
            name: "Wise",
            balance: -100000,
          },
        ],
        total: 400000,
      },
      holding: {
        accounts: [
          {
            id: "payout_holding",
            name: "Payout Holding",
            balance: 0,
          },
        ],
        total: 0,
      },
    });
  });
});
