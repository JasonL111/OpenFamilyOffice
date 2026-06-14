import { useEffect, useState } from "react";
import type { AssetClass } from "@fo/shared";
import { api } from "../lib/api";

interface Account { id: string; name: string; type: string; }

interface Holding {
  id: string; quantity: string;
  instrument: { name: string; symbol?: string; assetClass: string };
  account: { name: string };
}

const ASSET_CLASSES: AssetClass[] = [
  "EQUITY", "FIXED_INCOME", "FUND", "CASH",
  "CRYPTO", "REAL_ESTATE", "PRIVATE", "COMMODITY", "OTHER",
];

export default function Portfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState("");

  const [accountId, setAccountId] = useState("");
  const [instrumentName, setInstrumentName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [assetClass, setAssetClass] = useState<AssetClass>("EQUITY");
  const [quantity, setQuantity] = useState("");

  const load = () => {
    api.get<Holding[]>("/portfolio/holdings").then(setHoldings).catch(() => {});
    api.get<Account[]>("/accounts").then(setAccounts).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const addHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/portfolio/holdings", {
        accountId,
        instrumentName,
        symbol: symbol || undefined,
        assetClass,
        quantity: Number(quantity),
      });
      setAccountId("");
      setInstrumentName("");
      setSymbol("");
      setAssetClass("EQUITY");
      setQuantity("");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1>Portfolio</h1>
      {error && <p style={{ color: "var(--neg)" }}>{error}</p>}

      <div className="card">
        <table>
          <thead><tr><th>Instrument</th><th>Class</th><th>Account</th><th>Quantity</th></tr></thead>
          <tbody>
            {holdings.map((h) => (
              <tr key={h.id}>
                <td>{h.instrument.name}{h.instrument.symbol ? ` (${h.instrument.symbol})` : ""}</td>
                <td>{h.instrument.assetClass}</td>
                <td>{h.account.name}</td>
                <td>{h.quantity}</td>
              </tr>
            ))}
            {holdings.length === 0 && <tr><td colSpan={4} style={{ color: "var(--muted)" }}>No holdings yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Add Holding</h3>
        <form onSubmit={addHolding} style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto", alignItems: "end" }}>
          <label>Account <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
            <option value="">—</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
          </select></label>
          <label>Instrument Name <input value={instrumentName} onChange={(e) => setInstrumentName(e.target.value)} required /></label>
          <label>Symbol <input value={symbol} onChange={(e) => setSymbol(e.target.value)} /></label>
          <label>Class <select value={assetClass} onChange={(e) => setAssetClass(e.target.value as AssetClass)}>
            {ASSET_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></label>
          <label>Quantity <input type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} required /></label>
          <button type="submit">Add</button>
        </form>
      </div>
    </>
  );
}