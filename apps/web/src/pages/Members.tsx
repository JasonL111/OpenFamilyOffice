import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Member { id: string; fullName: string; relation?: string; email?: string; }

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [relation, setRelation] = useState("");
  const [email, setEmail] = useState("");

  const load = () => api.get<Member[]>("/members").then(setMembers).catch(() => {});
  useEffect(() => { load(); }, []);

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/members", {
        fullName,
        relation: relation || undefined,
        email: email || undefined,
      });
      setFullName("");
      setRelation("");
      setEmail("");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1>Members & Access</h1>
      {error && <p style={{ color: "var(--neg)" }}>{error}</p>}

      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Relation</th><th>Email</th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}><td>{m.fullName}</td><td>{m.relation ?? "—"}</td><td>{m.email ?? "—"}</td></tr>
            ))}
            {members.length === 0 && <tr><td colSpan={3} style={{ color: "var(--muted)" }}>No members yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Add Member</h3>
        <form onSubmit={addMember} style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr auto", alignItems: "end" }}>
          <label>Full Name * <input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label>
          <label>Relation <input value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="e.g. spouse, child" /></label>
          <label>Email <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <button type="submit">Add</button>
        </form>
      </div>

      <p style={{ color: "var(--muted)", marginTop: 24 }}>TODO: invite a member to a login account with a role; audit-log viewer (ADMIN only).</p>
    </>
  );
}