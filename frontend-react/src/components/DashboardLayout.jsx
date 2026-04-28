import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/", label: "Overview" },
  { to: "/analytics", label: "Analytics" },
  { to: "/business", label: "Business" },
  { to: "/clients", label: "Clients" },
  { to: "/campaigns", label: "Campaigns" },
  { to: "/wallet", label: "Wallet" },
  { to: "/settings", label: "Settings" }
];

export function DashboardLayout({ auth, children }) {
  const location = useLocation();
  const isActive = (to) => (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to));

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Navigation">
        <h1 className="brand">Loyalty Pro</h1>
        <nav>
          {links.map((item) => (
            <Link key={item.to} className={`nav-link ${isActive(item.to) ? "active" : ""}`} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="content">
        <header className="topbar">
          <div className="topbar-title">
            <strong>Loyalty Pro</strong>
            <span className="muted">Commerçant</span>
          </div>
          <button type="button" className="secondary" onClick={() => auth.setToken("")}>
            Deconnexion
          </button>
        </header>
        <main>{children}</main>
      </section>

      <nav className="mobile-nav" aria-label="Navigation mobile">
        {links.map((item) => (
          <Link key={item.to} to={item.to} className={`mobile-nav-link ${isActive(item.to) ? "active" : ""}`}>
            <span className="mobile-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
