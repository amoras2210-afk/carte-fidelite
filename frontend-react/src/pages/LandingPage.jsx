import { Link } from "react-router-dom";

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
    body: "Email, mot de passe et nom du commerce — tu accèdes à l’espace marchand."
  },
  {
    n: 2,
    title: "Active l’abonnement",
    body: "Paiement sécurisé avec Stripe. Une fois validé, l’accès à Loyalty Pro se débloque automatiquement."
  },
  {
    n: 3,
    title: "Configure et distribue",
    body: "Personnalise ta carte, partage le lien ou le QR aux clients et suit les visites depuis le tableau de bord."
  }
];

export function LandingPage({ auth }) {
  const hasSession = Boolean(auth?.token);

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
                <Link to="/abonnement" className="landing-nav-cta">
                  Abonnement
                </Link>
                <button type="button" className="ghost landing-nav-logout" onClick={() => auth.setToken("")}>
                  Déconnexion
                </button>
              </>
            ) : (
              <Link to="/connexion" className="landing-nav-cta">
                Connexion / S’inscrire
              </Link>
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
            <Link
              to={hasSession ? "/tableau" : "/connexion"}
              className="btn-link-primary landing-btn-wide"
            >
              {hasSession ? "Ouvrir mon espace marchand" : "Créer mon compte et voir les tarifs"}
            </Link>
            <a href="#fonctionnalites" className="landing-link-anchor">
              Découvrir les fonctionnalités
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

        <section className="landing-section landing-section-alt" aria-labelledby="landing-steps-heading">
          <h2 id="landing-steps-heading" className="landing-section-title">
            Comment ça marche ?
          </h2>
          <p className="landing-section-intro">
            Trois étapes pour passer du papier-cartes au digital — le paiement active tout en ligne.
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
            <h2 className="landing-cta-title">Prêt à fidéliser sans friction ?</h2>
            <p className="muted landing-cta-text">
              Tu crées ton compte sur la page suivante, puis tu finalises l’abonnement avec Stripe pour débloquer
              l’accès complet. Déjà inscrit ? Connecte-toi directement.
            </p>
            <Link
              to={hasSession ? "/tableau" : "/connexion"}
              className="btn-link-primary landing-btn-wide"
            >
              {hasSession ? "Accéder à mon espace" : "Commencer maintenant"}
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer muted">
        <span>Loyalty Pro — programme de fidélité digital pour ton commerce.</span>
      </footer>
    </div>
  );
}
