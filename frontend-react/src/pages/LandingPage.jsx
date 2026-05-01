import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createBillingCheckoutSession } from "../lib/api";
import { useToast } from "../components/ToastContext";

const features = [
  {
    title: "QR & caisse",
    body: "Scan au comptoir pour ajouter des visites ou des points. Tes clients gardent leur historique sans carte physique."
  },
  {
    title: "Cartes wallet",
    body: "Ajout Apple Wallet et Google Wallet pour que la carte fidélité reste dans le téléphone, avec ton branding."
  },
  {
    title: "Campagnes email",
    body: "Envoie des messages promo depuis ton Gmail connecté : annonces, relances, automatisation simple."
  },
  {
    title: "Pilotage",
    body: "Vue d’ensemble, clients et stats pour voir qui revient et ajuster tes récompenses."
  }
];

const steps = [
  {
    n: 1,
    title: "Crée ton compte commerce",
    body: "Email, mot de passe et nom du commerce — gratuit, en une minute."
  },
  {
    n: 2,
    title: "Souscris depuis cette page",
    body: "Tout se passe ici : 49,99 € / mois, paiement sécurisé par Stripe."
  },
  {
    n: 3,
    title: "Configure et distribue",
    body: "Personnalise ta carte, partage le lien ou le QR aux clients et suit les visites depuis le tableau de bord."
  }
];

const planIncludes = [
  "QR boutique, points et récompenses",
  "Cartes Apple Wallet & Google Wallet",
  "Campagnes e-mail via ton Gmail",
  "Tableau de bord clients et stats",
  "Mises à jour incluses"
];

export function LandingPage({ auth, billing, billingLoading, onBillingRefresh }) {
  const hasSession = Boolean(auth?.token);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [payRedirecting, setPayRedirecting] = useState(false);

  const subActive =
    billing?.subscriptionStatus === "active" || billing?.subscriptionStatus === "trialing";

  useEffect(() => {
    if (searchParams.get("paiement") === "annule") {
      showToast("Paiement annulé — tu peux réessayer quand tu veux dans la section Tarifs.", "info");
      navigate("/", { replace: true });
    }
  }, [searchParams, navigate, showToast]);

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
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-nav-brand">
            <span className="auth-logo-mark landing-nav-logo">LP</span>
            <div>
              <span className="landing-nav-title">Loyalty Pro</span>
              <span className="landing-nav-tag">Fidélité locale</span>
            </div>
          </div>
          <div className="landing-nav-actions">
            {hasSession ? (
              <>
                <Link to="/tableau" className="btn-link-primary landing-nav-btn-solid">
                  Mon espace
                </Link>
                <a href="#tarifs" className="landing-nav-cta">
                  Tarifs
                </a>
                <button type="button" className="ghost landing-nav-logout" onClick={() => auth.setToken("")}>
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <a href="#tarifs" className="landing-nav-cta">
                  Tarifs
                </a>
                <Link to="/connexion" className="landing-nav-cta landing-nav-cta-strong">
                  Connexion / S’inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <p className="landing-eyebrow">Pour commerces et indépendants</p>
          <h1 className="landing-headline">
            Le programme de fidélité qui vit dans le téléphone de tes clients
          </h1>
          <p className="landing-lead">
            Loyalty Pro regroupe QR en boutique, points, récompenses, cartes wallet et emails depuis ton Gmail —
            sans développeur ni application à installer pour tes clients.
          </p>
          <div className="landing-hero-actions">
            {hasSession ? (
              <Link to="/tableau" className="btn-link-primary landing-btn-wide">
                Ouvrir mon espace marchand
              </Link>
            ) : (
              <Link to="/connexion" className="btn-link-primary landing-btn-wide">
                Créer mon compte
              </Link>
            )}
            <a href="#fonctionnalites" className="landing-link-anchor">
              Découvrir les fonctionnalités
            </a>
            <a href="#tarifs" className="landing-link-anchor">
              Voir le tarif
            </a>
          </div>
        </section>

        <section className="landing-section" id="fonctionnalites" aria-labelledby="landing-features-heading">
          <h2 id="landing-features-heading" className="landing-section-title">
            Ce que tu obtiens avec Loyalty Pro
          </h2>
          <p className="landing-section-intro">
            Une suite pensée pour les petites équipes : tout centralisé dans un tableau de bord clair.
          </p>
          <div className="landing-feature-grid">
            {features.map((f) => (
              <article key={f.title} className="card landing-feature-card">
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-body muted">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-pricing-section" id="tarifs" aria-labelledby="landing-price-heading">
          <h2 id="landing-price-heading" className="landing-section-title">
            Tarif unique
          </h2>
          <p className="landing-section-intro">
            Un abonnement simple pour tout débloquer — paiement sécurisé par carte via Stripe.
          </p>

          <div className="landing-pricing-card card">
            <div className="landing-price-row">
              <span className="landing-price-amount">49,99&nbsp;€</span>
              <span className="landing-price-period muted">/ mois TTC</span>
            </div>
            <p className="muted landing-price-note">Sans frais cachés — résilie quand tu veux depuis l’espace Stripe après paiement.</p>

            <ul className="landing-plan-list">
              {planIncludes.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            {subActive ? (
              <p className="landing-price-status landing-price-status-ok">
                Ton abonnement est actif. Tu peux gérer ta facturation depuis le tableau de bord si besoin.
              </p>
            ) : null}

            {!billingLoading && !billing?.stripeConfigured ? (
              <p className="muted landing-stripe-warning">
                Paiement indisponible pour le moment : configure Stripe sur ton backend (variables{" "}
                <code className="mono">STRIPE_SECRET_KEY</code>, <code className="mono">STRIPE_PRICE_ID</code>
                … puis redémarre le service).
              </p>
            ) : null}

            <div className="landing-price-actions stack">
              {hasSession ? (
                <>
                  <button
                    type="button"
                    className="landing-pay-btn"
                    onClick={startCheckout}
                    disabled={payRedirecting || billingLoading || !billing?.stripeConfigured || subActive}
                  >
                    {payRedirecting
                      ? "Redirection vers Stripe…"
                      : subActive
                        ? "Déjà abonné"
                        : "Payer avec Stripe"}
                  </button>
                  {!subActive ? (
                    <button type="button" className="ghost landing-verify-btn" onClick={() => onBillingRefresh?.()} disabled={billingLoading}>
                      {billingLoading ? "Actualisation…" : "Actualiser mon statut après paiement"}
                    </button>
                  ) : (
                    <Link to="/tableau" className="btn-link-primary landing-btn-wide">
                      Aller au tableau de bord
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link to="/connexion" className="btn-link-primary landing-btn-wide">
                    Créer un compte ou me connecter pour payer
                  </Link>
                  <p className="muted landing-price-footnote">
                    Une fois connecté, reviens sur cette page : le bouton « Payer avec Stripe » apparaît ici.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section-alt" aria-labelledby="landing-steps-heading">
          <h2 id="landing-steps-heading" className="landing-section-title">
            Comment ça marche ?
          </h2>
          <p className="landing-section-intro">
            Trois étapes pour passer du papier-cartes au digital.
          </p>
          <ol className="landing-steps">
            {steps.map((s) => (
              <li key={s.n} className="landing-step card">
                <span className="landing-step-num" aria-hidden>
                  {s.n}
                </span>
                <div>
                  <h3 className="landing-step-title">{s.title}</h3>
                  <p className="muted landing-step-body">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-section landing-cta-block">
          <div className="card landing-cta-card">
            <h2 className="landing-cta-title">Une question avant de commencer ?</h2>
            <p className="muted landing-cta-text">
              Crée ton compte gratuitement, consulte les tarifs ci-dessus puis paie en ligne quand tu es prêt.
            </p>
            {hasSession ? (
              <Link to="/tableau" className="btn-link-primary landing-btn-wide">
                Accéder à mon espace
              </Link>
            ) : (
              <Link to="/connexion" className="btn-link-primary landing-btn-wide">
                Commencer maintenant
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="landing-footer muted">
        <span>Loyalty Pro — programme de fidélité digital pour ton commerce.</span>
      </footer>
    </div>
  );
}
