import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useMerchantBilling } from "../context/MerchantBillingContext.jsx";

export function GeneratorAccessPage() {
  const { billing, billingLoading, subscriptionActive, refreshBilling } = useMerchantBilling() ?? {};

  useEffect(() => {
    refreshBilling?.();
  }, [refreshBilling]);

  const blocked = !billingLoading && billing != null && !subscriptionActive;

  return (
    <div className="stack generator-access-page">
      <div className="generator-access-toolbar row wrap spread">
        <p className="muted" style={{ margin: 0 }}>
          <strong>FidélioGen</strong> — studio graphique pour le visuel de vos cartes (QR Loyalty Pro, export PNG).
        </p>
        <Link className="quick-link" to="/wallet">
          Retour aux cartes wallet
        </Link>
      </div>

      {billingLoading && billing == null ? (
        <p className="muted">Vérification de l’abonnement…</p>
      ) : blocked ? (
        <article className="card subtle">
          <h2 className="section-heading">Abonnement requis</h2>
          <p className="muted">
            Le générateur visuel FidélioGen est inclus dans l’offre à 49,99 € / mois. Après paiement Stripe, cette page se
            débloque automatiquement.
          </p>
          <div className="row wrap">
            <Link className="quick-link" to="/">
              Voir l’offre sur la page publique
            </Link>
            <button type="button" className="ghost" onClick={() => refreshBilling?.()}>
              J’ai payé — actualiser
            </button>
          </div>
        </article>
      ) : (
        <div className="generator-access-frame-wrap">
          <iframe
            title="FidélioGen — générateur de carte fidélité"
            src="/fideliogen/index.html"
            className="generator-access-iframe"
          />
        </div>
      )}
    </div>
  );
}
