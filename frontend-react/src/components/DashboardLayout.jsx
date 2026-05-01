import { Link, Outlet, useLocation } from "react-router-dom";
import { useMerchantBilling } from "../context/MerchantBillingContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

/** Navigation desktop. Barre mobile : entrées avec mobile: true uniquement. */
const NAV_LINKS_BASE = [
  { to: "/tableau", label: "Tableau de bord", mobile: true },
  { to: "/clients", label: "Clients", mobile: true },
  { to: "/wallet", label: "Cartes wallet", mobile: false },
  { to: "/campaigns", label: "Campagnes", mobile: true },
  { to: "/analytics", label: "Statistiques", mobile: false },
  { to: "/settings", label: "Paramètres", mobile: true }
];

const PAGE_META = [
  { prefix: "/settings", title: "Paramètres", subtitle: "Commerce, carte fidélité et emails" },
  { prefix: "/campaigns", title: "Campagnes", subtitle: "Annonces envoyées depuis ton Gmail" },
  { prefix: "/generateur-carte", title: "FidélioGen", subtitle: "Générateur visuel de carte fidélité" },
  { prefix: "/wallet", title: "Cartes wallet", subtitle: "Apple Wallet et Google Wallet" },
  { prefix: "/clients", title: "Clients", subtitle: "Fiches, points et scan QR" },
  { prefix: "/analytics", title: "Statistiques", subtitle: "Activité et rétention" },
  { prefix: "/tableau", title: "Tableau de bord", subtitle: "Vue d’ensemble" }
];

function pageMetaForPath(pathname) {
  if (pathname === "/tableau") {
    return PAGE_META.find((p) => p.prefix === "/tableau") || PAGE_META[0];
  }
  const sorted = [...PAGE_META].filter((p) => p.prefix !== "/tableau").sort((a, b) => b.prefix.length - a.prefix.length);
  return sorted.find((p) => pathname.startsWith(p.prefix)) || PAGE_META.find((p) => p.prefix === "/tableau") || PAGE_META[0];
}

export function DashboardLayout({ auth }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { subscriptionActive } = useMerchantBilling() ?? {};
  const meta = pageMetaForPath(location.pathname);

  const navLinks =
    subscriptionActive === true
      ? [
          ...NAV_LINKS_BASE.slice(0, 3),
          { to: "/generateur-carte", label: "Générateur carte", mobile: false },
          ...NAV_LINKS_BASE.slice(3)
        ]
      : NAV_LINKS_BASE;

  const isActive = (to) =>
    to === "/tableau"
      ? location.pathname === "/tableau"
      : to === "/generateur-carte"
        ? location.pathname === "/generateur-carte"
        : location.pathname.startsWith(to);

  const mobileLinks = navLinks.filter((item) => item.mobile);

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Navigation principale">
        <Link to="/tableau" className="sidebar-brand">
          <img className="sidebar-brand-mark-img" src="/logo-loyalty-pro.svg" alt="" width={42} height={42} decoding="async" />
          <span className="sidebar-brand-text">
            <span className="sidebar-brand-title">Loyalty Pro</span>
            <span className="sidebar-brand-sub">Espace commerçant</span>
          </span>
        </Link>
        <nav className="sidebar-nav">
          {navLinks.map((item) => (
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
          <div className="topbar-actions">
            <button
              type="button"
              className="ghost theme-toggle-btn"
              onClick={toggleTheme}
              aria-pressed={theme === "dark"}
              aria-label={theme === "dark" ? "Activer le mode clair" : "Activer le mode sombre"}
              title={theme === "dark" ? "Mode clair" : "Mode sombre"}
            >
              {theme === "dark" ? "Mode clair" : "Mode sombre"}
            </button>
            <button type="button" className="ghost topbar-logout" onClick={() => auth.setToken("")}>
              Déconnexion
            </button>
          </div>
        </header>
        <main className="content-inner">
          <Outlet />
        </main>
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
