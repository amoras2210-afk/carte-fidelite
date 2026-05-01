import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createBillingCheckoutSession } from "../lib/api";
import { useToast } from "../components/ToastContext";

const heroBadges = ["Paiement sécurisé Stripe", "HTTPS & sauvegardes", "Interface pensée terrain"];

const verticals = ["Restaurants & cafés", "Instituts & salons", "Retail & boutiques", "Artisans & services"];

const statsBand = [
  { value: "49,99 €", label: "TTC / mois · tout inclus" },
  { value: "5 modules", label: "QR, Wallet, Mail, Studio, stats" },
  { value: "3 étapes", label: "Pour être opérationnel" }
];

const integrations = [
  { name: "Stripe", hint: "Abonnement & conformité paiement" },
  { name: "Gmail", hint: "Campagnes depuis votre boîte pro" },
  { name: "Apple Wallet", hint: "Passes dans l’iPhone" },
  { name: "Google Wallet", hint: "Passes Android" }
];

const features = [
  {
    title: "Encaissement & QR",
    body: "Ajoutez visites et points au comptoir en quelques secondes — plus de cartes papier à gérer.",
    icon: "◇",
    large: false
  },
  {
    title: "Apple Wallet & Google Wallet",
    body: "Cartes fidélité dans le téléphone, couleurs et libellés aux standards de votre enseigne.",
    icon: "◈",
    large: false
  },
  {
    title: "Relances & campagnes e-mail",
    body: "Diffusez vos annonces depuis Gmail connecté : segmentez vos clients sans changer d’outil.",
    icon: "✉",
    large: false
  },
  {
    title: "Pilotage & exports",
    body: "Historique client, indicateurs simples et exports pour vos décisions terrain.",
    icon: "◎",
    large: false
  },
  {
    title: "Studio FidélioGen",
    body: "Maquette carte fidélité, QR Loyalty Pro, export PNG HD — inclus avec votre abonnement.",
    icon: "✦",
    large: true
  }
];

const steps = [
  {
    n: "01",
    title: "Identification sécurisée",
    body: "Accès réservé aux professionnels avant tout encaissement."
  },
  {
    n: "02",
    title: "Souscription Stripe",
    body: "49,99 € / mois TTC — facturation et résiliation depuis votre espace Stripe."
  },
  {
    n: "03",
    title: "Mise en ligne",
    body: "Paramétrez la carte, ouvrez FidélioGen pour le visuel, partagez lien ou QR."
  }
];

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
  "Studio FidélioGen — générateur visuel + export PNG",
  "Campagnes e-mail (Gmail)",
  "Statistiques et exports",
  "Évolutions produit incluses"
];

const faqItems = [
  {
    q: "Mes clients doivent-ils installer une application ?",
    a: "Non. Loyalty Pro fonctionne avec des cartes wallet et des liens web ; le passage en caisse repose sur votre QR ou votre interface commerçant."
  },
  {
    q: "Comment fonctionne la facturation ?",
    a: "L’abonnement est prélevé par carte via Stripe au tarif affiché TTC. Vous gérez factures et résiliation depuis votre espace Stripe."
  },
  {
    q: "Qu’est-ce que FidélioGen exactement ?",
    a: "C’est le studio graphique intégré pour créer le visuel de votre carte (couleurs, logo, QR compatible Loyalty Pro) et exporter en PNG. Les passes Apple/Google sont générées depuis les fiches clients."
  },
  {
    q: "Puis-je importer mes clients ?",
    a: "L’outil prévoit des imports et exports CSV depuis l’espace commerçant pour migrer vos listes progressivement."
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Les échanges passent en HTTPS ; les paiements sont traités par Stripe sans stockage de carte sur nos serveurs."
  }
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
    <div className="landing-site">
      <div className="landing-site-bg" aria-hidden />

      <header className="landing-site-nav">
        <div className="landing-site-nav-inner">
          <div className="landing-site-brand">
            <img className="landing-brand-logo landing-brand-logo--site" src="/logo-loyalty-pro.svg" alt="" width={46} height={46} decoding="async" />
            <div className="landing-site-brand-text">
              <span className="landing-site-brand-title">Loyalty Pro</span>
              <span className="landing-site-brand-tag">Plateforme fidélité pour commerces physiques</span>
            </div>
          </div>
          <nav className="landing-site-nav-links" aria-label="Sections">
            <a href="#tarifs">Offre</a>
            <a href="#produit">Plateforme</a>
            <a href="#integrations">Écosystème</a>
            <a href="#avis">Références</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="landing-site-nav-cta">
            {hasSession ? (
              <>
                <Link to="/tableau" className="landing-site-btn landing-site-btn--primary">
                  Espace client
                </Link>
                <button type="button" className="landing-site-btn landing-site-btn--ghost" onClick={() => auth.setToken("")}>
                  Déconnexion
                </button>
              </>
            ) : (
              <a href="#tarifs" className="landing-site-btn landing-site-btn--primary landing-site-btn--compact">
                Voir l’offre
              </a>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <div className="landing-site-container landing-hero-grid">
            <div className="landing-hero-copy landing-animate landing-animate-1">
              <div className="landing-hero-badges">
                {heroBadges.map((b) => (
                  <span key={b} className="landing-pill">
                    {b}
                  </span>
                ))}
              </div>
              <h1 id="landing-hero-title" className="landing-hero-title">
                La fidélité client qui vit dans la poche — sans nouvelle app à installer.
              </h1>
              <p className="landing-hero-lead">
                Loyalty Pro réunit QR caisse, cartes wallet Apple & Google, e-mails depuis votre Gmail et pilotage client dans une
                suite sobre. Pensée pour les équipes qui n’ont pas le temps de formations longues.
              </p>
              <div className="landing-hero-actions">
                <a href="#tarifs" className="landing-site-btn landing-site-btn--primary landing-site-btn--lg">
                  Découvrir le tarif
                </a>
                <a href="#produit" className="landing-site-btn landing-site-btn--outline landing-site-btn--lg">
                  Explorer la plateforme
                </a>
              </div>
              <p className="landing-hero-microcopy">
                Usage réservé aux professionnels · Paiement encadré par Stripe
              </p>
            </div>

            <div className="landing-hero-visual landing-animate landing-animate-2" aria-hidden>
              <div className="landing-mock-glow" />
              <div className="landing-mock-window">
                <div className="landing-mock-titlebar">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="landing-mock-frame">
                  <aside className="landing-mock-sidebar">
                    <span className="landing-mock-nav-active" />
                    <span />
                    <span />
                    <span />
                  </aside>
                  <div className="landing-mock-main">
                    <header className="landing-mock-toolbar">
                      <span className="landing-mock-chip">Vue d’ensemble</span>
                      <span className="landing-mock-chip muted">Cette semaine</span>
                    </header>
                    <div className="landing-mock-cards">
                      <div className="landing-mock-stat">
                        <small>Clients actifs</small>
                        <strong>1 248</strong>
                      </div>
                      <div className="landing-mock-stat">
                        <small>Scans QR</small>
                        <strong>382</strong>
                      </div>
                      <div className="landing-mock-stat">
                        <small>Passes wallet</small>
                        <strong>692</strong>
                      </div>
                    </div>
                    <div className="landing-mock-chart">
                      <div className="landing-mock-chart-bars">
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                      <span className="landing-mock-chart-label">Activité récente</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="landing-site-container landing-marquee-wrap">
            <p className="landing-marquee-label">Secteurs d’usage</p>
            <ul className="landing-marquee">
              {verticals.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="landing-band landing-band--stats">
          <div className="landing-site-container landing-stats-row">
            {statsBand.map((s) => (
              <div key={s.label} className="landing-stat-cell">
                <strong className="landing-stat-value">{s.value}</strong>
                <span className="landing-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-band landing-band--pricing" id="tarifs" aria-labelledby="landing-offer-title">
          <div className="landing-site-container">
            <header className="landing-section-head">
              <p className="landing-eyebrow">Offre unique</p>
              <h2 id="landing-offer-title" className="landing-section-h2">
                Tout ce dont une boutique a besoin pour fidéliser — à un prix public.
              </h2>
              <p className="landing-section-sub">
                Un seul palier : pas de fonctionnalités cachées derrière des options. Vous réglez par Stripe ; nous hébergeons la
                plateforme et livrons les mises à jour.
              </p>
            </header>

            <div className="landing-offer-grid">
              <div className="landing-offer-aside">
                <p className="landing-checklist-label">Inclus dans l’abonnement</p>
                <ul className="landing-checklist">
                  {planIncludes.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>

              <aside className="landing-checkout-card" aria-label="Paiement">
                <div className="landing-checkout-card-inner">
                  <p className="landing-checkout-kicker">Abonnement mensuel</p>
                  <div className="landing-checkout-price">
                    <span className="landing-checkout-amount">49,99&nbsp;€</span>
                    <span className="landing-checkout-period">/ mois TTC</span>
                  </div>
                  <p className="landing-checkout-meta">Résiliation depuis votre portail de facturation Stripe.</p>

                  {subActive ? (
                    <p className="landing-banner landing-banner--success">Votre abonnement est actif.</p>
                  ) : null}

                  {!billingLoading && !billing?.stripeConfigured && hasSession ? (
                    <p className="landing-banner landing-banner--warn">
                      Configurez Stripe sur l’API (<code className="mono">STRIPE_SECRET_KEY</code>,{" "}
                      <code className="mono">STRIPE_PRICE_ID</code>).
                    </p>
                  ) : null}

                  <div className="landing-checkout-actions">
                    {hasSession ? (
                      <>
                        <button
                          type="button"
                          className="landing-site-btn landing-site-btn--primary landing-site-btn--block"
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
                            className="landing-site-btn landing-site-btn--ghost landing-site-btn--block"
                            onClick={() => onBillingRefresh?.()}
                            disabled={billingLoading}
                          >
                            {billingLoading ? "Synchronisation…" : "Actualiser le statut"}
                          </button>
                        ) : (
                          <Link to="/tableau" className="landing-site-btn landing-site-btn--primary landing-site-btn--block">
                            Ouvrir le tableau de bord
                          </Link>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="landing-site-btn landing-site-btn--primary landing-site-btn--block"
                          onClick={goToProfessionalIdentification}
                        >
                          Continuer vers le paiement sécurisé
                        </button>
                        <p className="landing-checkout-fineprint">
                          Identification professionnelle requise — page dédiée hors site public marketing.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="landing-band" id="produit" aria-labelledby="landing-plateforme-title">
          <div className="landing-site-container">
            <header className="landing-section-head landing-section-head--left">
              <p className="landing-eyebrow">Plateforme</p>
              <h2 id="landing-plateforme-title" className="landing-section-h2">
                Un seul lieu pour animer votre programme fidélité.
              </h2>
              <p className="landing-section-sub">
                Chaque module est conçu pour la répétition quotidienne en point de vente — pas pour les démonstrations PowerPoint.
              </p>
            </header>

            <div className="landing-bento">
              {features.map((f) => (
                <article key={f.title} className={`landing-bento-card ${f.large ? "landing-bento-card--wide" : ""}`}>
                  <span className="landing-bento-icon" aria-hidden>
                    {f.icon}
                  </span>
                  <h3 className="landing-bento-title">{f.title}</h3>
                  <p className="landing-bento-body">{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-band landing-band--integrations" id="integrations" aria-labelledby="landing-int-title">
          <div className="landing-site-container">
            <header className="landing-section-head">
              <p className="landing-eyebrow">Écosystème</p>
              <h2 id="landing-int-title" className="landing-section-h2">
                Branché sur les services que vous utilisez déjà.
              </h2>
            </header>
            <ul className="landing-int-grid">
              {integrations.map((x) => (
                <li key={x.name} className="landing-int-card">
                  <strong>{x.name}</strong>
                  <span>{x.hint}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="landing-band" id="avis" aria-labelledby="landing-avis-title">
          <div className="landing-site-container">
            <header className="landing-section-head">
              <p className="landing-eyebrow">Références</p>
              <h2 id="landing-avis-title" className="landing-section-h2">
                Ce que disent les équipes terrain
              </h2>
            </header>
            <div className="landing-tgrid">
              {testimonials.map((t) => (
                <blockquote key={t.initials} className="landing-tcard">
                  <p className="landing-tquote">{t.quote}</p>
                  <footer className="landing-tfoot">
                    <span className="landing-tavatar" aria-hidden>
                      {t.initials}
                    </span>
                    <div>
                      <cite className="landing-tname">{t.name}</cite>
                      <span className="landing-tmeta">{t.meta}</span>
                    </div>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-band landing-band--steps" id="parcours" aria-labelledby="landing-parcours-title">
          <div className="landing-site-container">
            <header className="landing-section-head">
              <p className="landing-eyebrow">Déploiement</p>
              <h2 id="landing-parcours-title" className="landing-section-h2">
                Un chemin clair, du premier jour à la première campagne.
              </h2>
            </header>
            <ol className="landing-steps-h">
              {steps.map((s) => (
                <li key={s.n} className="landing-step-card">
                  <span className="landing-step-num">{s.n}</span>
                  <h3 className="landing-step-h">{s.title}</h3>
                  <p className="landing-step-p">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-band" id="faq" aria-labelledby="landing-faq-title">
          <div className="landing-site-container landing-faq-wrap">
            <header className="landing-section-head landing-section-head--left">
              <p className="landing-eyebrow">FAQ</p>
              <h2 id="landing-faq-title" className="landing-section-h2">
                Questions fréquentes
              </h2>
            </header>
            <div className="landing-faq-list">
              {faqItems.map((item) => (
                <details key={item.q} className="landing-faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-band landing-band--cta-final" aria-labelledby="landing-cta-final-title">
          <div className="landing-site-container landing-cta-final-inner">
            <h2 id="landing-cta-final-title" className="landing-cta-final-title">
              Prêt à moderniser votre programme fidélité ?
            </h2>
            <p className="landing-cta-final-sub">
              Tarif transparent, mise en route guidée, outils wallet et studio graphique inclus.
            </p>
            <div className="landing-cta-final-actions">
              <a href="#tarifs" className="landing-site-btn landing-site-btn--primary landing-site-btn--lg">
                Consulter l’offre à 49,99 € / mois
              </a>
              {hasSession ? (
                <Link to="/tableau" className="landing-site-btn landing-site-btn--outline landing-site-btn--lg">
                  Accéder à mon espace
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-site-footer">
        <div className="landing-site-container landing-footer-grid">
          <div className="landing-footer-col">
            <div className="landing-footer-brand">
              <img src="/logo-loyalty-pro.svg" alt="" width={40} height={40} decoding="async" />
              <span>Loyalty Pro</span>
            </div>
            <p className="landing-footer-desc">
              Suite de fidélisation pour commerces qui veulent garder le contrôle — sans projet informatique de six mois.
            </p>
          </div>
          <div className="landing-footer-col">
            <p className="landing-footer-heading">Navigation</p>
            <a href="#tarifs">Offre &amp; tarif</a>
            <a href="#produit">Plateforme</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="landing-footer-col">
            <p className="landing-footer-heading">Informations</p>
            <span>Paiements traités par Stripe, Inc.</span>
            <span>Usage réservé aux professionnels (B2B).</span>
          </div>
        </div>
        <div className="landing-site-container landing-footer-bottom">
          <span>© {new Date().getFullYear()} Loyalty Pro · Tous droits réservés</span>
        </div>
      </footer>
    </div>
  );
}
