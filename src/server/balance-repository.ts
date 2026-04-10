import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AccountBalanceRecord, DailyCashSnapshot } from "@/lib/types";

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const ACCOUNT_BALANCES_PATH = path.join(DATA_DIRECTORY, "account-balances.json");
const DAILY_SNAPSHOTS_PATH = path.join(DATA_DIRECTORY, "daily-cash-snapshots.json");

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function writeJsonFile<T>(filePath: string, value: T) {
  await mkdir(DATA_DIRECTORY, { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function listAccountBalances() {
  return readJsonFile<AccountBalanceRecord[]>(ACCOUNT_BALANCES_PATH);
}

export async function listDailyCashSnapshots() {
  return readJsonFile<DailyCashSnapshot[]>(DAILY_SNAPSHOTS_PATH);
}

export async function saveDailyCashSnapshots(snapshots: DailyCashSnapshot[]) {
  await writeJsonFile(DAILY_SNAPSHOTS_PATH, snapshots);
}
