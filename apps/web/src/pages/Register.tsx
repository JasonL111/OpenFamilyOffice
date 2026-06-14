import { useState } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await register(email, password, token || undefined);
      navigate("/", { replace: true });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="login">
      <h2>{token ? "Accept Invite" : "Create Account"}</h2>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          type="password"
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        {error && <div style={{ color: "var(--neg)" }}>{error}</div>}
        <button type="submit">{token ? "Accept & Sign Up" : "Create Account"}</button>
      </form>
      <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center" }}>
        Already have an account? <a href="/login">Sign in</a>
      </p>
    </div>
  );
}