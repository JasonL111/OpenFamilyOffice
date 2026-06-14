import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/accounts", label: "Accounts" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/documents", label: "Documents" },
  { to: "/members", label: "Members" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Family Office</div>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>{l.label}</NavLink>
          ))}
        </nav>
        <div style={{ marginTop: 32, color: "var(--muted)", fontSize: 13 }}>
          {user?.email}<br />
          <a onClick={logout} style={{ cursor: "pointer" }}>Sign out</a>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
