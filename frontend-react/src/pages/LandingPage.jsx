import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createBillingCheckoutSession } from "../lib/api";
import { useToast } from "../components/ToastContext";

const features = [
  {
    title: "Encaissement & QR",
    body: "Ajout de visites au comptoir, points et récompenses sans carte physique."
  },
  {
    title: "Wallet Apple & Google",
    body: "Cartes fidélité dans le téléphone, aux couleurs de votre enseigne."
  },
  {
    title: "Relances e-mail",
    body: "Campagnes et messages depuis votre Gmail professionnel connecté."
  },
  {
    title: "Pilotage",
    body: "Vue clients, historique et indicateurs pour ajuster votre programme."
  },
  {
    title: "Studio FidélioGen",
    body: "Générateur visuel pour votre carte fidélité : QR compatible Loyalty Pro, personnalisation complète et export PNG haute définition — inclus dans l’offre souscrite."
  }
];

const steps = [
  {
    n: "01",
    title: "Identification sécurisée",
    body: "Vérifiez votre commerce avant tout encaissement — accès réservé aux professionnels."
  },
  {
    n: "02",
    title: "Souscription Stripe",
    body: "49,99 € / mois TTC, paiement carte via Stripe (facturation et résiliation depuis votre espace Stripe)."
  },
  {
    n: "03",
    title: "Mise en service",
    body: "Paramétrez votre carte, utilisez le studio FidélioGen pour le visuel, diffusez lien ou QR et suivez l’activité depuis votre tableau de bord."
  }
];

/** Illustrations marketing — personnages et enseignes fictifs. */
const testimonials = [
  {
    quote:
      "« Déploiement rapide en boutique : le QR à la caisse a remplacé nos cartons tampons. Les cartes dans Apple Wallet sont un vrai plus pour nos habitués. »",
    name: "Sophie Martel",
    meta: "Gérante · Café des Arcades · Bordeaux",
    initials: "SM"
  },
  {
    quote:
      "« Campagnes e-mail depuis notre Gmail pro, sans passer par une agence. Interface sobre — l’équipe l’a adoptée en quelques jours. »",
    name: "Karim Benali",
    meta: "Directeur · Studio Line Coiffure · Marseille",
    initials: "KB"
  },
  {
    quote:
      "« Programme fidélité digital aligné sur nos collections : QR en boutique et pilotage simple. Les exports nous servent pour nos réassorts. »",
    name: "Claire Aubert",
    meta: "Fondatrice · Fleurs & Saison · Annecy",
    initials: "CA"
  }
];

const planIncludes = [
  "Programme fidélité digital illimité",
  "QR boutique & gestion des clients",
  "Passes Apple Wallet & Google Wallet",
  "Studio FidélioGen — générateur visuel de carte + export PNG (fichiers inclus)",
  "Campagnes e-mail (Gmail)",
  "Statistiques et exports",
  "Mises à jour produit incluses"
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
      showToast("Paiement annulé. Vous pouvez reprendre lorsque vous le souhaitez.", "info");
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

  const goToProfessionalIdentification = () => {
    navigate("/connexion");
  };

  return (
    <div className="landing-page landing-page--pro">
      <header className="landing-nav landing-nav--pro">
        <div className="landing-nav-inner landing-nav-inner--pro">
          <div className="landing-nav-brand">
            <img className="landing-brand-logo" src="/logo-loyalty-pro.svg" alt="" width={44} height={44} decoding="async" />
            <div>
              <span className="landing-nav-title landing-nav-title--pro">Loyalty Pro</span>
              <span className="landing-nav-tag landing-nav-tag--pro">Fidélité & CRM léger</span>
            </div>
          </div>
          <div className="landing-nav-actions landing-nav-actions--pro">
            <a href="#produit" className="landing-nav-link">
              Produit
            </a>
            <a href="#avis" className="landing-nav-link">
              Références
            </a>
            <a href="#parcours" className="landing-nav-link">
              Déploiement
            </a>
            {hasSession ? (
              <>
                <Link to="/tableau" className="landing-nav-pill landing-nav-pill--primary">
                  Espace client
                </Link>
                <button type="button" className="landing-nav-pill landing-nav-pill--ghost" onClick={() => auth.setToken("")}>
                  Fermer la session
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="landing-main landing-main--pro">
        <section className="landing-pro-split" id="tarifs" aria-labelledby="landing-price-heading">
          <div className="landing-pro-split-copy">
            <p className="landing-pro-kicker">Solution SaaS pour commerces physiques</p>
            <h1 id="landing-price-heading" className="landing-pro-headline">
              La fidélité client professionnelle, sans application à télécharger.
            </h1>
            <p className="landing-pro-sub">
              Loyalty Pro centralise QR caisse, cartes wallet, relances e-mail et pilotage client dans une interface unique —
              sécurisée, évolutive, pensée pour les équipes en boutique.
            </p>
            <ul className="landing-pro-highlights">
              <li>Paiement et conformité via Stripe</li>
              <li>Hébergement et chiffrement HTTPS</li>
              <li>Mise en route guidée en trois étapes</li>
            </ul>
          </div>

          <aside className="landing-pro-checkout" aria-label="Offre et paiement">
            <div className="landing-pro-checkout-inner">
              <p className="landing-pro-checkout-label">Offre tout inclus</p>
              <div className="landing-pro-price-line">
                <span className="landing-pro-price-value">49,99&nbsp;€</span>
                <span className="landing-pro-price-unit">/ mois TTC</span>
              </div>
              <p className="landing-pro-checkout-meta">
                Facturation mensuelle · résiliation depuis votre espace de facturation Stripe
              </p>

              <ul className="landing-pro-plan-check">
                {planIncludes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              {subActive ? (
                <p className="landing-pro-banner landing-pro-banner--ok">Votre abonnement est actif.</p>
              ) : null}

              {!billingLoading && !billing?.stripeConfigured && hasSession ? (
                <p className="landing-pro-banner landing-pro-banner--warn">
                  Paiement indisponible : configurez Stripe sur l’API ({""}
                  <code className="mono">STRIPE_SECRET_KEY</code>, <code className="mono">STRIPE_PRICE_ID</code>
                  ).
                </p>
              ) : null}

              <div className="landing-pro-actions">
                {hasSession ? (
                  <>
                    <button
                      type="button"
                      className="landing-pro-btn landing-pro-btn--solid"
                      onClick={startCheckout}
                      disabled={payRedirecting || billingLoading || !billing?.stripeConfigured || subActive}
                    >
                      {payRedirecting
                        ? "Redirection sécurisée…"
                        : subActive
                          ? "Abonnement en cours"
                          : "Régler par carte (Stripe)"}
                    </button>
                    {!subActive ? (
                      <button
                        type="button"
                        className="landing-pro-btn landing-pro-btn--outline"
                        onClick={() => onBillingRefresh?.()}
                        disabled={billingLoading}
                      >
                        {billingLoading ? "Synchronisation…" : "Actualiser le statut"}
                      </button>
                    ) : (
                      <Link to="/tableau" className="landing-pro-btn landing-pro-btn--solid landing-pro-btn--link">
                        Ouvrir le tableau de bord
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <button type="button" className="landing-pro-btn landing-pro-btn--solid" onClick={goToProfessionalIdentification}>
                      Continuer vers le paiement sécurisé
                    </button>
                    <p className="landing-pro-fineprint">
                      Étape suivante : identification professionnelle obligatoire avant encaissement (domaine réservé, hors page
                      publique).
                    </p>
                  </>
                )}
              </div>
            </div>
          </aside>
        </section>

        <section className="landing-pro-band" id="produit" aria-labelledby="landing-features-heading">
          <div className="landing-pro-band-head">
            <h2 id="landing-features-heading" className="landing-pro-section-title">
              Une plateforme, quatre leviers
            </h2>
            <p className="landing-pro-section-lead">
              Des modules qui fonctionnent ensemble — sans intégration technique lourde de votre côté.
            </p>
          </div>
          <div className="landing-pro-feature-grid">
            {features.map((f) => (
              <article key={f.title} className="landing-pro-feature">
                <h3 className="landing-pro-feature-title">{f.title}</h3>
                <p className="landing-pro-feature-body">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-pro-testimonials" id="avis" aria-labelledby="landing-testimonials-heading">
          <div className="landing-pro-testimonials-head">
            <h2 id="landing-testimonials-heading" className="landing-pro-section-title landing-pro-section-title--center">
              Retours d’expérience
            </h2>
            <p className="landing-pro-testimonials-disclaimer">
              Personnages et enseignes ci-dessous sont fictifs — illustration du positionnement produit.
            </p>
          </div>
          <div className="landing-pro-testimonial-grid">
            {testimonials.map((t) => (
              <blockquote key={t.initials} className="landing-pro-testimonial-card">
                <p className="landing-pro-testimonial-quote">{t.quote}</p>
                <footer className="landing-pro-testimonial-footer">
                  <span className="landing-pro-testimonial-avatar" aria-hidden>
                    {t.initials}
                  </span>
                  <div>
                    <cite className="landing-pro-testimonial-name">{t.name}</cite>
                    <span className="landing-pro-testimonial-meta">{t.meta}</span>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        <section className="landing-pro-steps-wrap" id="parcours" aria-labelledby="landing-steps-heading">
          <h2 id="landing-steps-heading" className="landing-pro-section-title landing-pro-section-title--center">
            Déploiement standard
          </h2>
          <ol className="landing-pro-steps">
            {steps.map((s) => (
              <li key={s.n} className="landing-pro-step">
                <span className="landing-pro-step-index">{s.n}</span>
                <div>
                  <h3 className="landing-pro-step-title">{s.title}</h3>
                  <p className="landing-pro-step-body">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="landing-footer landing-footer--pro">
        <span>© Loyalty Pro · Paiement traité par Stripe · Usage réservé aux professionnels</span>
      </footer>
    </div>
  );
}
