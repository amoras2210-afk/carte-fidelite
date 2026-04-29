import { Link, useLocation } from "react-router-dom";

/** Navigation desktop. Barre mobile : 4 entrées (pas de sidebar sur petit écran). */
const NAV_LINKS = [
  { to: "/", label: "Tableau de bord", mobile: true },
  { to: "/clients", label: "Clients", mobile: true },
  { to: "/wallet", label: "Cartes wallet", mobile: false },
  { to: "/campaigns", label: "Campagnes", mobile: true },
  { to: "/analytics", label: "Statistiques", mobile: false },
  { to: "/settings", label: "Paramètres", mobile: true }
];

const PAGE_META = [
  { prefix: "/settings", title: "Paramètres", subtitle: "Commerce, carte fidélité et emails" },
  { prefix: "/campaigns", title: "Campagnes", subtitle: "Annonces envoyées depuis ton Gmail" },
  { prefix: "/wallet", title: "Cartes wallet", subtitle: "Apple Wallet et Google Wallet" },
  { prefix: "/clients", title: "Clients", subtitle: "Fiches, points et scan QR" },
  { prefix: "/analytics", title: "Statistiques", subtitle: "Activité et rétention" },
  { prefix: "/", title: "Tableau de bord", subtitle: "Vue d’ensemble" }
];

function pageMetaForPath(pathname) {
  if (pathname === "/") {
    return PAGE_META.find((p) => p.prefix === "/") || PAGE_META[0];
  }
  const sorted = [...PAGE_META].filter((p) => p.prefix !== "/").sort((a, b) => b.prefix.length - a.prefix.length);
  return sorted.find((p) => pathname.startsWith(p.prefix)) || PAGE_META.find((p) => p.prefix === "/") || PAGE_META[0];
}

export function DashboardLayout({ auth, children }) {
  const location = useLocation();
  const meta = pageMetaForPath(location.pathname);

  const isActive = (to) => (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to));

  const mobileLinks = NAV_LINKS.filter((item) => item.mobile);

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Navigation principale">
        <Link to="/" className="sidebar-brand">
          <span className="sidebar-brand-mark">LP</span>
          <span className="sidebar-brand-text">
            <span className="sidebar-brand-title">Loyalty Pro</span>
            <span className="sidebar-brand-sub">Espace commerçant</span>
          </span>
        </Link>
        <nav className="sidebar-nav">
          {NAV_LINKS.map((item) => (
            <Link key={item.to} className={`nav-link ${isActive(item.to) ? "active" : ""}`} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="page-head">
            <h1 className="page-head-title">{meta.title}</h1>
            <p className="page-head-sub">{meta.subtitle}</p>
          </div>
          <button type="button" className="ghost topbar-logout" onClick={() => auth.setToken("")}>
            Déconnexion
          </button>
        </header>
        <main className="content-inner">{children}</main>
      </section>

      <nav className="mobile-nav" aria-label="Navigation mobile">
        {mobileLinks.map((item) => (
          <Link key={item.to} to={item.to} className={`mobile-nav-link ${isActive(item.to) ? "active" : ""}`}>
            <span className="mobile-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
