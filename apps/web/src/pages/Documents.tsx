import { useEffect, useState } from "react";
import type { DocCategory } from "@fo/shared";
import { api } from "../lib/api";

interface Doc { id: string; title: string; category: string; createdAt: string; }

const DOC_CATEGORIES: DocCategory[] = [
  "LEGAL", "TAX", "INSURANCE", "ESTATE",
  "STATEMENT", "CONTRACT", "IDENTITY", "OTHER",
];

export default function Documents() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocCategory>("OTHER");
  const [file, setFile] = useState<File | null>(null);

  const load = () => api.get<Doc[]>("/documents").then(setDocs).catch(() => {});
  useEffect(() => { load(); }, []);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!file) { setError("Select a file"); return; }
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title);
      form.append("category", category);
      await api.upload("/documents", form);
      setTitle("");
      setCategory("OTHER");
      setFile(null);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1>Document Vault</h1>
      {error && <p style={{ color: "var(--neg)" }}>{error}</p>}

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>Upload Document</h3>
        <form onSubmit={upload} style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr auto", alignItems: "end" }}>
          <label>Title * <input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
          <label>Category <select value={category} onChange={(e) => setCategory(e.target.value as DocCategory)}>
            {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></label>
          <label>File <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required /></label>
          <button type="submit">Upload</button>
        </form>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Title</th><th>Category</th><th>Added</th></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td><a href={`/api/documents/${d.id}/download`}>{d.title}</a></td>
                <td>{d.category}</td>
                <td>{new Date(d.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {docs.length === 0 && <tr><td colSpan={3} style={{ color: "var(--muted)" }}>No documents yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}