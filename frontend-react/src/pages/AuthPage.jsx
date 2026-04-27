import { useEffect, useState } from "react";
import { apiRequest, linkOnboardingSession, trackOnboarding } from "../lib/api";
import { useToast } from "../components/ToastContext";

export function AuthPage({ auth }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("Mon Commerce");
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    trackOnboarding({ step, action: "view" }).catch(() => null);
  }, [step]);

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
      showToast("Connexion reussie", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: {
          businessName,
          email,
          password
        }
      });
      showToast("Compte cree. Connecte-toi.", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <form className="card form" onSubmit={handleLogin}>
        <h1>Loyalty Pro</h1>
        <p>Plateforme fidelite pour commerces independants</p>
        <div className="onboarding wizard">
          <p className="onboarding-title">Onboarding en 3 etapes</p>
          <div className="wizard-steps">
            <button type="button" className={step === 1 ? "active" : ""} onClick={() => setStep(1)}>
              1
            </button>
            <button type="button" className={step === 2 ? "active" : ""} onClick={() => setStep(2)}>
              2
            </button>
            <button type="button" className={step === 3 ? "active" : ""} onClick={() => setStep(3)}>
              3
            </button>
          </div>
          {step === 1 ? <p>Cree ton compte commerce avec email + mot de passe.</p> : null}
          {step === 2 ? <p>Ajoute tes premiers clients et active le consentement marketing RGPD.</p> : null}
          {step === 3 ? <p>Distribue la carte wallet puis attribue les points a chaque passage.</p> : null}
          <div className="row">
            <button
              type="button"
              className="secondary"
              disabled={step === 1}
              onClick={() => {
                trackOnboarding({ step, action: "back" }).catch(() => null);
                setStep((s) => Math.max(1, s - 1));
              }}
            >
              Retour
            </button>
            <button
              type="button"
              disabled={step === 3}
              onClick={() => {
                trackOnboarding({ step, action: "next" }).catch(() => null);
                setStep((s) => Math.min(3, s + 1));
              }}
            >
              Suivant
            </button>
          </div>
        </div>
        <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Nom commerce" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Connexion..." : "Se connecter"}
        </button>
        <button type="button" className="secondary" onClick={handleRegister} disabled={isLoading}>
          Creer un compte
        </button>
      </form>
    </div>
  );
}
