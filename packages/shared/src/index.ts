// Types shared between the API and web app. Keep this dependency-free so both
// the Express backend and the Vite frontend can import it.

export type Role = "OWNER" | "ADMIN" | "ADVISOR" | "MEMBER" | "VIEWER";

export type AccountType =
  | "CASH" | "BANK" | "BROKERAGE" | "RETIREMENT" | "CRYPTO"
  | "REAL_ESTATE" | "PRIVATE_EQUITY" | "LOAN" | "OTHER";

export type AssetClass =
  | "EQUITY" | "FIXED_INCOME" | "FUND" | "CASH"
  | "CRYPTO" | "REAL_ESTATE" | "PRIVATE" | "COMMODITY" | "OTHER";

export type DocCategory =
  | "LEGAL" | "TAX" | "INSURANCE" | "ESTATE"
  | "STATEMENT" | "CONTRACT" | "IDENTITY" | "OTHER";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  householdId: string;
}

export interface NetWorth {
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface NetWorthHistoryPoint {
  date: string;
  netWorth: number;
}
