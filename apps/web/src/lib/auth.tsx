import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role, SessionUser } from "@fo/shared";
import { api } from "./api";

interface InviteResult {
  token: string;
  role: Role;
  email?: string | null;
  expiresAt: string;
}

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, token?: string) => Promise<void>;
  createInvite: (opts?: { email?: string; role?: Role; expiresInSeconds?: number }) => Promise<InviteResult>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => api.get<SessionUser>("/auth/me").then(setUser);

  useEffect(() => {
    refresh().catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    await api.post("/auth/login", { email, password });
    await refresh();
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  const register = async (email: string, password: string, token?: string) => {
    await api.post("/auth/register", { email, password, ...(token ? { token } : {}) });
    await refresh();
  };

  const createInvite = async (opts?: { email?: string; role?: Role; expiresInSeconds?: number }) => {
    return api.post<InviteResult>("/auth/invite", {
      email: opts?.email || undefined,
      role: opts?.role ?? "MEMBER",
      expiresInSeconds: opts?.expiresInSeconds,
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, createInvite }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
