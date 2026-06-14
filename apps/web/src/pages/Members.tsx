import { useEffect, useState } from "react";
import type { Role } from "@fo/shared";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

interface Member {
  id: string;
  fullName: string;
  relation?: string;
  email?: string;
}

export default function Members() {
  const { user, createInvite } = useAuth();
  const canInvite = user?.role === "OWNER" || user?.role === "ADMIN";

  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [relation, setRelation] = useState("");
  const [email, setEmail] = useState("");

  // invite dialog state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("MEMBER");
  const [inviteResult, setInviteResult] = useState<{ link: string; role: Role } | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = () => api.get<Member[]>("/members").then(setMembers).catch(() => {});
  useEffect(() => {
    load();
  }, []);

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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteResult(null);
    setCopied(false);
    try {
      const res = await createInvite({
        email: inviteEmail || undefined,
        role: inviteRole,
      });
      const link = `${window.location.origin}/register?token=${res.token}`;
      setInviteResult({ link, role: res.role });
      setInviteEmail("");
    } catch (err: any) {
      setInviteError(err.message);
    }
  };

  const copyLink = () => {
    if (!inviteResult) return;
    navigator.clipboard.writeText(inviteResult.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <h1>Members & Access</h1>
      {error && <p style={{ color: "var(--neg)" }}>{error}</p>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Relation</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.fullName}</td>
                <td>{m.relation ?? "—"}</td>
                <td>{m.email ?? "—"}</td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: "var(--muted)" }}>
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Add Member</h3>
        <form onSubmit={addMember} style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr auto", alignItems: "end" }}>
          <label>
            Full Name * <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label>
            Relation <input value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="e.g. spouse, child" />
          </label>
          <label>
            Email <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button type="submit">Add</button>
        </form>
      </div>

      {canInvite && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3>Invite to Login</h3>
          <form onSubmit={handleInvite} style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr auto auto", alignItems: "end" }}>
            <label>
              Email (optional) <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Leave blank for any email" />
            </label>
            <label>
              Role{" "}
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}>
                <option value="ADMIN">ADMIN</option>
                <option value="ADVISOR">ADVISOR</option>
                <option value="MEMBER">MEMBER</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </label>
            <button type="submit">Generate Invite</button>
          </form>
          {inviteError && <p style={{ color: "var(--neg)", marginTop: 8 }}>{inviteError}</p>}
          {inviteResult && (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <p style={{ color: "var(--muted)", margin: 0 }}>Role: {inviteResult.role}</p>
              <a href={inviteResult.link} target="_blank" rel="noreferrer" style={{ wordBreak: "break-all" }}>
                {inviteResult.link}
              </a>
              <button onClick={copyLink} style={{ width: "fit-content" }}>
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}