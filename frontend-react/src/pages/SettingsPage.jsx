import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { useToast } from "../components/ToastContext";
import { applyThemePreset, DEFAULT_CARD_DESIGN, resolveCardDesign } from "../lib/cardDesign";

const initialState = {
  businessName: "",
  reviewUrl: "",
  googleMailAddress: "",
  googleMailConnected: false,
  brandColor: "#1f2937",
  rewardThreshold: 10,
  rewardLabel: "1 reward",
  planMrrEur: 49,
  cardDesign: DEFAULT_CARD_DESIGN
};

export function SettingsPage({ auth }) {
  const [settings, setSettings] = useState(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    apiRequest("/settings", { token: auth.token })
      .then((response) =>
        setSettings({
          businessName: response.data.businessName,
          reviewUrl: response.data.reviewUrl || "",
          googleMailAddress: response.data.googleMailAddress || "",
          googleMailConnected: Boolean(response.data.googleMailConnected),
          brandColor: response.data.brandColor,
          rewardThreshold: response.data.rewardThreshold,
          rewardLabel: response.data.rewardLabel,
          planMrrEur: response.data.planMrrEur ?? 49,
          cardDesign: resolveCardDesign(response.data.cardDesign)
        })
      )
      .catch((error) => showToast(error.message, "error"))
      .finally(() => setIsLoading(false));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    try {
      await apiRequest("/settings", {
        token: auth.token,
        method: "PUT",
        body: {
          businessName: settings.businessName,
          reviewUrl: settings.reviewUrl,
          brandColor: settings.brandColor,
          rewardThreshold: Number(settings.rewardThreshold),
          rewardLabel: settings.rewardLabel,
          planMrrEur: Number(settings.planMrrEur),
          cardDesign: settings.cardDesign
        }
      });
      showToast("Settings sauvegardes", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const connectGoogleMail = async () => {
    try {
      const response = await apiRequest("/settings/google/connect-url", { token: auth.token, retries: 0 });
      const connectUrl = response.data?.connectUrl;
      if (!connectUrl) throw new Error("Lien de connexion Google indisponible");
      window.open(connectUrl, "_blank", "noopener,noreferrer");
      showToast("Fenetre Google ouverte. Autorise l'acces puis recharge cette page.", "info");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const disconnectGoogleMail = async () => {
    try {
      await apiRequest("/settings/google/disconnect", {
        token: auth.token,
        method: "POST"
      });
      setSettings((prev) => ({ ...prev, googleMailConnected: false, googleMailAddress: "" }));
      showToast("Compte Gmail deconnecte", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  return (
    <article className="card">
      <h2>Parametres commerce</h2>
      {isLoading ? <div className="skeleton">Chargement...</div> : null}
      <form className="form" onSubmit={save}>
        <input
          value={settings.businessName}
          onChange={(event) => setSettings((prev) => ({ ...prev, businessName: event.target.value }))}
          placeholder="Nom commerce"
        />
        <input
          value={settings.brandColor}
          onChange={(event) => setSettings((prev) => ({ ...prev, brandColor: event.target.value }))}
          placeholder="Couleur marque (rgb/hex)"
        />
        <input
          type="url"
          value={settings.reviewUrl}
          onChange={(event) => setSettings((prev) => ({ ...prev, reviewUrl: event.target.value }))}
          placeholder="Lien page d'avis (Google/Facebook/Tripadvisor)"
        />
        <div className="card inner">
          <div className="row spread wrap">
            <div>
              <h3>Envoi email depuis Gmail du commerce</h3>
              <p className="muted">
                Le commerçant connecte son compte Google une fois, puis les emails partent depuis cette adresse.
              </p>
            </div>
            <span className="badge info-badge">
              {settings.googleMailConnected ? "Connecte" : "Non connecte"}
            </span>
          </div>
          <p className="muted">
            Adresse connectee : <strong>{settings.googleMailAddress || "Aucune"}</strong>
          </p>
          <div className="row wrap">
            <button type="button" onClick={connectGoogleMail}>
              Connecter Gmail
            </button>
            {settings.googleMailConnected ? (
              <button type="button" className="ghost" onClick={disconnectGoogleMail}>
                Deconnecter Gmail
              </button>
            ) : null}
          </div>
        </div>
        <input
          type="number"
          value={settings.rewardThreshold}
          onChange={(event) => setSettings((prev) => ({ ...prev, rewardThreshold: event.target.value }))}
          placeholder="Seuil points"
        />
        <input
          value={settings.rewardLabel}
          onChange={(event) => setSettings((prev) => ({ ...prev, rewardLabel: event.target.value }))}
          placeholder="Label recompense"
        />
        <label>
          MRR simule (EUR / mois)
          <input
            type="number"
            min="0"
            step="1"
            value={settings.planMrrEur}
            onChange={(event) => setSettings((prev) => ({ ...prev, planMrrEur: event.target.value }))}
          />
        </label>
        <div className="card inner">
          <div className="row spread wrap">
            <div>
              <h3>Design de la carte client</h3>
              <p className="muted">
                Ce design sera applique automatiquement a toutes les cartes client envoyees depuis Loyalty Pro.
              </p>
            </div>
            <span className="badge info-badge">1 design pour tout le commerce</span>
          </div>
          <div className="form">
            <input
              value={settings.cardDesign.tagline}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  cardDesign: { ...prev.cardDesign, tagline: event.target.value }
                }))
              }
              placeholder="Sous-titre de la carte"
            />
            <input
              value={settings.cardDesign.logoUrl}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  cardDesign: { ...prev.cardDesign, logoUrl: event.target.value }
                }))
              }
              placeholder="Logo URL (https://...)"
            />
            <div className="row wrap">
              <label className="grow">
                Palette
                <select
                  value={settings.cardDesign.theme}
                  onChange={(event) => {
                    const theme = event.target.value;
                    const preset = applyThemePreset(theme);
                    setSettings((prev) => ({
                      ...prev,
                      cardDesign: {
                        ...prev.cardDesign,
                        ...(preset || {}),
                        theme
                      }
                    }));
                  }}
                >
                  <option value="gold">Or premium</option>
                  <option value="night">Bleu nuit</option>
                  <option value="forest">Foret</option>
                  <option value="rose">Rose</option>
                  <option value="slate">Ardoise claire</option>
                  <option value="ocean">Ocean</option>
                  <option value="custom">Personnalise</option>
                </select>
              </label>
              <label className="grow">
                Style
                <select
                  value={settings.cardDesign.style}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      cardDesign: { ...prev.cardDesign, style: event.target.value }
                    }))
                  }
                >
                  <option value="modern">Elegant</option>
                  <option value="minimal">Epure</option>
                  <option value="bold">Contraste</option>
                </select>
              </label>
            </div>
            <div className="design-color-grid">
              <label>
                Fond
                <input
                  type="color"
                  value={settings.cardDesign.bgColor}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      cardDesign: { ...prev.cardDesign, bgColor: event.target.value, theme: "custom" }
                    }))
                  }
                />
              </label>
              <label>
                Fond 2
                <input
                  type="color"
                  value={settings.cardDesign.bg2Color}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      cardDesign: { ...prev.cardDesign, bg2Color: event.target.value, theme: "custom" }
                    }))
                  }
                />
              </label>
              <label>
                Accent
                <input
                  type="color"
                  value={settings.cardDesign.accentColor}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      cardDesign: { ...prev.cardDesign, accentColor: event.target.value, theme: "custom" }
                    }))
                  }
                />
              </label>
              <label>
                Accent 2
                <input
                  type="color"
                  value={settings.cardDesign.accent2Color}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      cardDesign: { ...prev.cardDesign, accent2Color: event.target.value, theme: "custom" }
                    }))
                  }
                />
              </label>
              <label>
                Texte
                <input
                  type="color"
                  value={settings.cardDesign.textColor}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      cardDesign: { ...prev.cardDesign, textColor: event.target.value, theme: "custom" }
                    }))
                  }
                />
              </label>
              <label>
                Couleur tampons
                <input
                  value={settings.cardDesign.stampColor}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      cardDesign: { ...prev.cardDesign, stampColor: event.target.value, theme: "custom" }
                    }))
                  }
                />
              </label>
            </div>
          </div>
        </div>
        <button type="submit">Sauvegarder</button>
      </form>
    </article>
  );
}
