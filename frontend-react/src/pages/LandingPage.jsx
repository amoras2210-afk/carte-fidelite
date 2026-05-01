import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="auth-shell">
      <article className="card auth-panel">
        <div className="auth-brand-block">
          <span className="auth-logo-mark">LP</span>
          <div>
            <h1 className="auth-title">Loyalty Pro</h1>
            <p className="auth-tagline">Abonnement simple pour fidéliser tes clients.</p>
          </div>
        </div>
        <ul className="auth-highlights">
          <li>QR caisse + points + récompenses</li>
          <li>Campagnes email depuis ton Gmail</li>
          <li>Accès générateur de carte inclus</li>
        </ul>
        <div className="stack">
          <Link to="/connexion" className="btn-link-primary">
            Commencer l'abonnement
          </Link>
          <p className="muted">
            Tu crées ton compte d'abord, puis le paiement Stripe débloque l'accès automatiquement.
          </p>
        </div>
      </article>
    </div>
  );
}
