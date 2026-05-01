import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, linkOnboardingSession, trackOnboarding } from "../lib/api";
import { useToast } from "../components/ToastContext";

export function AuthPage({ auth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    trackOnboarding({ step: 1, action: "view" }).catch(() => null);
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const response = await apiRequest("/auth/login", {
        method: "POST",
        body: { email, password }
      });
      const token = response.data.token;
      await trackOnboarding({ step: 3, action: "complete" });
      await linkOnboardingSession(token);
      auth.setToken(token);
      showToast("Connexion réussie", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("/auth/register", {
        method: "POST",
        body: {
          businessName: businessName.trim() || "Mon commerce",
          email,
          password
        }
      });
      const token = response.data?.token;
      await trackOnboarding({ step: 3, action: "complete" });
      await linkOnboardingSession(token);
      auth.setToken(token);
      showToast("Compte créé. Passe au paiement pour activer ton accès.", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel card">
        <div className="auth-brand-block">
          <span className="auth-logo-mark">LP</span>
          <div>
            <h1 className="auth-title">Loyalty Pro</h1>
            <p className="auth-tagline">Programme de fidélité digital pour ton commerce.</p>
          </div>
        </div>

        <ul className="auth-highlights">
          <li>Cartes wallet et QR en boutique</li>
          <li>Points et récompenses en quelques clics</li>
          <li>Emails promo depuis ton Gmail</li>
        </ul>

        {auth.token ? (
          <div className="card subtle auth-session-banner stack">
            <p className="muted" style={{ margin: 0 }}>
              Une session est déjà enregistrée sur cet appareil. Pour payer l&apos;abonnement ou utiliser un autre compte,
              choisis une option ci-dessous.
            </p>
            <div className="row wrap">
              <Link to="/abonnement" className="btn-link-primary">
                Retour au paiement / abonnement
              </Link>
              <button type="button" className="ghost" onClick={() => auth.setToken("")}>
                Se déconnecter
              </button>
              <Link to="/" className="landing-nav-cta" style={{ textDecoration: "none" }}>
                Page d&apos;accueil
              </Link>
            </div>
          </div>
        ) : null}

        <form className="form auth-form" onSubmit={handleLogin}>
          <label className="field-label">
            Nom du commerce <span className="optional">(création de compte)</span>
          </label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Ex. Boulangerie du Centre"
            autoComplete="organization"
          />
          <label className="field-label">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@email.com" required autoComplete="email" />
          <label className="field-label">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Connexion…" : "Se connecter"}
          </button>
          <button type="button" className="secondary" onClick={handleRegister} disabled={isLoading}>
            Créer un compte
          </button>
        </form>
      </div>
    </div>
  );
}
