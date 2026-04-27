import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { useToast } from "../components/ToastContext";

const initialState = {
  businessName: "",
  brandColor: "#1f2937",
  rewardThreshold: 10,
  rewardLabel: "1 reward",
  planMrrEur: 49
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
          brandColor: response.data.brandColor,
          rewardThreshold: response.data.rewardThreshold,
          rewardLabel: response.data.rewardLabel,
          planMrrEur: response.data.planMrrEur ?? 49
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
          brandColor: settings.brandColor,
          rewardThreshold: Number(settings.rewardThreshold),
          rewardLabel: settings.rewardLabel,
          planMrrEur: Number(settings.planMrrEur)
        }
      });
      showToast("Settings sauvegardes", "success");
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
        <button type="submit">Sauvegarder</button>
      </form>
    </article>
  );
}
