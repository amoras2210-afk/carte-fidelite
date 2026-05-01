import { useState } from "react";
import { Link } from "react-router-dom";
import { createBillingCheckoutSession } from "../lib/api";

function statusLabel(status) {
  if (!status) return "Aucun";
  const map = {
    active: "Actif",
    trialing: "Essai",
    past_due: "Paiement en retard",
    canceled: "Résilié",
    unpaid: "Impayé",
    inactive: "Inactif"
  };
  return map[status] || status;
}

export function BillingRequiredPage({ auth, billing, onRefresh, showToast }) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const currentPeriod = billing?.currentPeriodEnd
    ? new Date(billing.currentPeriodEnd).toLocaleDateString("fr-FR")
    : null;

  const startCheckout = async () => {
    setIsRedirecting(true);
    try {
      const response = await createBillingCheckoutSession(auth.token);
      const url = response.data?.url;
      if (!url) throw new Error("URL de paiement indisponible.");
      window.location.href = url;
    } catch (error) {
      setIsRedirecting(false);
      showToast(error.message, "error");
    }
  };

  return (
    <div className="auth-shell">
      <article className="card auth-panel">
        <div className="auth-brand-block">
          <span className="auth-logo-mark">LP</span>
          <div>
            <h1 className="auth-title">Abonnement requis</h1>
            <p className="auth-tagline">Ton compte existe. Active l'abonnement pour déverrouiller Loyalty Pro.</p>
          </div>
        </div>

        <p className="muted">
          Statut actuel : <strong>{statusLabel(billing?.subscriptionStatus)}</strong>
          {currentPeriod ? <> · Prochaine échéance : <strong>{currentPeriod}</strong></> : null}
        </p>

        <div className="row wrap">
          <button type="button" onClick={startCheckout} disabled={isRedirecting || !billing?.stripeConfigured}>
            {isRedirecting ? "Redirection..." : "Payer avec Stripe"}
          </button>
          <button type="button" className="ghost" onClick={onRefresh}>
            Vérifier mon accès
          </button>
          <button type="button" className="ghost" onClick={() => auth.setToken("")}>
            Se déconnecter
          </button>
        </div>

        <p className="muted billing-public-note">
          <Link to="/">Retour à la page d&apos;accueil</Link>
          {" · "}
          <Link to="/connexion">Connexion / autre compte</Link>
        </p>

        {!billing?.stripeConfigured ? (
          <p className="muted">Paiement indisponible pour le moment : configuration Stripe manquante sur le serveur.</p>
        ) : null}
      </article>
    </div>
  );
}
