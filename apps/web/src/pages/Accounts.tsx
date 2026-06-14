import { useEffect, useState } from "react";
import type { AccountType } from "@fo/shared";
import { api } from "../lib/api";

interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  institution?: string;
  valuations: { date: string; value: number }[];
}

const ACCOUNT_TYPES: AccountType[] = [
  "CASH", "BANK", "BROKERAGE", "RETIREMENT", "CRYPTO",
  "REAL_ESTATE", "PRIVATE_EQUITY", "LOAN", "OTHER",
];

const fmt = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("BANK");
  const [currency, setCurrency] = useState("USD");

  const [valAccountId, setValAccountId] = useState("");
  const [valDate, setValDate] = useState("");
  const [valAmount, setValAmount] = useState("");

  const load = () => api.get<Account[]>("/accounts").then(setAccounts).catch(() => {});
  useEffect(() => { load(); }, []);

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/accounts", { name, type, currency });
      setName("");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const submitValuation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/accounts/${valAccountId}/valuations`, {
        date: valDate,
        value: Number(valAmount),
        currency: "USD",
      });
      setValAccountId("");
      setValDate("");
      setValAmount("");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1>Accounts</h1>
      {error && <p style={{ color: "var(--neg)" }}>{error}</p>}

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>New Account</h3>
        <form onSubmit={createAccount} style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr auto", alignItems: "end" }}>
          <label>Name <input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label>Type <select value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select></label>
          <label>Currency <input value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} /></label>
          <button type="submit">Add</button>
        </form>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Name</th><th>Type</th><th>Currency</th><th>Latest Value</th><th></th></tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.type}</td>
                <td>{a.currency}</td>
                <td>{a.valuations[0] ? fmt(Number(a.valuations[0].value)) : "—"}</td>
                <td><button onClick={() => setValAccountId(a.id)}>Record Valuation</button></td>
              </tr>
            ))}
            {accounts.length === 0 && <tr><td colSpan={5} style={{ color: "var(--muted)" }}>No accounts yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {valAccountId && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Record Valuation</h3>
          <form onSubmit={submitValuation} style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr auto", alignItems: "end" }}>
            <label>Date <input type="date" value={valDate} onChange={(e) => setValDate(e.target.value)} required /></label>
            <label>Amount <input type="number" step="0.01" value={valAmount} onChange={(e) => setValAmount(e.target.value)} required /></label>
            <button type="submit">Save</button>
          </form>
          <button style={{ marginTop: 8, background: "transparent", color: "var(--muted)", border: "1px solid var(--border)" }} onClick={() => setValAccountId("")}>Cancel</button>
        </div>
      )}
    </>
  );
}