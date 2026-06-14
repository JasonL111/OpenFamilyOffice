import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="login">
      <h2>Sign in</h2>
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <div style={{ color: "var(--neg)" }}>{error}</div>}
      <button onClick={submit}>Sign in</button>
      <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center" }}>
        Don't have an account? <a href="/register">Register</a>
      </p>
    </div>
  );
}
