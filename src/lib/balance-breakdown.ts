import type { Account, UnifiedTransaction } from "@/lib/types";

import { getLiveBalanceByAccount } from "@/lib/unified-transactions";

export interface AccountBalanceSummary {
  account: Account;
  balance: number;
}

function isLocalAccount(account: Account) {
  return account.group === "local" || (!account.group && account.type === "bank");
}

function isForeignAccount(account: Account) {
  return (
    account.group === "foreign" ||
    (!account.group && (account.type === "wallet" || account.type === "platform"))
  );
}

function isHoldingAccount(account: Account) {
  return account.group === "holding" || (!account.group && account.type === "holding");
}

export function getAllAccountBalances(
  accounts: Account[],
  transactions: UnifiedTransaction[],
): AccountBalanceSummary[] {
  return accounts.map((account) => ({
    account,
    balance: getLiveBalanceByAccount(transactions, account.id),
  }));
}

export function getBalanceBreakdown(
  accounts: Account[],
  transactions: UnifiedTransaction[],
) {
  const accountBalances = getAllAccountBalances(accounts, transactions);
  const localAccounts: Array<{ id: string; name: string; balance: number }> = [];
  const foreignAccounts: Array<{ id: string; name: string; balance: number }> = [];
  const holdingAccounts: Array<{ id: string; name: string; balance: number }> = [];

  for (const { account, balance } of accountBalances) {
    const accountSummary = {
      id: account.id,
      name: account.name,
      balance,
    };

    if (isLocalAccount(account)) {
      localAccounts.push(accountSummary);
      continue;
    }

    if (isForeignAccount(account)) {
      foreignAccounts.push(accountSummary);
      continue;
    }

    if (isHoldingAccount(account)) {
      holdingAccounts.push(accountSummary);
    }
  }

  return {
    local: {
      accounts: localAccounts,
      total: localAccounts.reduce((total, account) => total + account.balance, 0),
    },
    foreign: {
      accounts: foreignAccounts,
      total: foreignAccounts.reduce((total, account) => total + account.balance, 0),
    },
    holding: {
      accounts: holdingAccounts,
      total: holdingAccounts.reduce((total, account) => total + account.balance, 0),
    },
  };
}
