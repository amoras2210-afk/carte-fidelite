import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, createBillingCheckoutSession, linkOnboardingSession, trackOnboarding } from "../lib/api";
import { useToast } from "../components/ToastContext";

export function AuthPage({ auth }) {
  const navigate = useNavigate();
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
      showToast("Connexion réussie — ouverture en cours.", "success");
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
      try {
        const checkoutRes = await createBillingCheckoutSession(token);
        const payUrl = checkoutRes.data?.url;
        if (payUrl) {
          window.location.href = payUrl;
          return;
        }
      } catch (checkoutErr) {
        showToast(checkoutErr.message, "error");
        navigate("/abonnement", { replace: true });
        return;
      }
      navigate("/abonnement", { replace: true });
      showToast("Compte créé — finalisez le paiement pour accéder à l’application.", "success");
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
          <img className="auth-brand-logo-img" src="/logo-loyalty-pro.svg" alt="" width={48} height={48} decoding="async" />
          <div>
            <h1 className="auth-title">Loyalty Pro</h1>
            <p className="auth-tagline">
              Créez un compte puis souscription Stripe : aucun accès aux modules avant paiement validé.
            </p>
          </div>
        </div>

        <ul className="auth-highlights">
          <li>Cartes wallet et QR en boutique</li>
          <li>Points et récompenses en quelques clics</li>
          <li>Emails promo depuis ton Gmail</li>
        </ul>

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
            Créer un compte et payer
          </button>
        </form>
      </div>
    </div>
  );
}
