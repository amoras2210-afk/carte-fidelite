import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createBillingCheckoutSession } from "../lib/api";
import { useMerchantBilling } from "../context/MerchantBillingContext.jsx";
import { useToast } from "../components/ToastContext";

export function SubscribeGatePage({ auth }) {
  const navigate = useNavigate();
  const { billing, billingLoading, refreshBilling } = useMerchantBilling() ?? {};
  const { showToast } = useToast();
  const [payRedirecting, setPayRedirecting] = useState(false);

  const subActive =
    billing?.subscriptionStatus === "active" || billing?.subscriptionStatus === "trialing";

  useEffect(() => {
    if (subActive) {
      navigate("/tableau", { replace: true });
    }
  }, [subActive, navigate]);

  const startCheckout = async () => {
    if (!auth?.token) return;
    setPayRedirecting(true);
    try {
      const response = await createBillingCheckoutSession(auth.token);
      const url = response.data?.url;
      if (!url) throw new Error("URL de paiement indisponible.");
      window.location.href = url;
    } catch (error) {
      showToast(error.message, "error");
      setPayRedirecting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel card">
        <div className="auth-brand-block">
          <img className="auth-brand-logo-img" src="/logo-loyalty-pro.svg" alt="" width={48} height={48} decoding="async" />
          <div>
            <h1 className="auth-title">Abonnement requis</h1>
            <p className="auth-tagline">
              L’accès à Loyalty Pro (clients, QR, wallet, campagnes) s’ouvre après souscription à 49,99&nbsp;€&nbsp;/&nbsp;mois via Stripe.
            </p>
          </div>
        </div>

        {subActive ? (
          <p className="muted">Abonnement actif — ouverture du tableau de bord…</p>
        ) : (
          <>
            {!billingLoading && !billing?.stripeConfigured ? (
              <p className="muted">
                Paiement indisponible : configure <code className="mono">STRIPE_SECRET_KEY</code> et{" "}
                <code className="mono">STRIPE_PRICE_ID</code> sur le serveur.
              </p>
            ) : null}

            <div className="row wrap" style={{ gap: 12 }}>
              <button
                type="button"
                onClick={startCheckout}
                disabled={payRedirecting || billingLoading || !billing?.stripeConfigured}
              >
                {payRedirecting ? "Redirection vers Stripe…" : "Payer et activer mon accès"}
              </button>
              <button type="button" className="ghost" onClick={() => refreshBilling?.()} disabled={billingLoading}>
                {billingLoading ? "Vérification…" : "J’ai déjà payé — actualiser"}
              </button>
            </div>

            <p className="muted" style={{ marginTop: 16 }}>
              Après un paiement réussi, revenez ici et cliquez sur «&nbsp;actualiser&nbsp;» si le tableau de bord ne s’ouvre pas tout de suite (webhook Stripe).
            </p>
          </>
        )}

        <div className="row wrap" style={{ marginTop: 20, gap: 12 }}>
          <Link className="quick-link" to="/">
            Retour à l’accueil
          </Link>
          <button type="button" className="ghost" onClick={() => auth.setToken("")}>
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
