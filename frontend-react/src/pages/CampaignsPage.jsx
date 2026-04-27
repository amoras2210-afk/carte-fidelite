import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { useToast } from "../components/ToastContext";

export function CampaignsPage({ auth }) {
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({ title: "", message: "", channel: "email" });
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const load = async () => {
    setIsLoading(true);
    const response = await apiRequest("/campaigns?page=1&limit=20", { token: auth.token });
    setCampaigns(response.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    load().catch((error) => showToast(error.message, "error"));
  }, []);

  const createCampaign = async (event) => {
    event.preventDefault();
    try {
      await apiRequest("/campaigns", { token: auth.token, method: "POST", body: form });
      setForm({ title: "", message: "", channel: "email" });
      showToast("Campagne creee", "success");
      await load();
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const sendCampaign = async (campaignId) => {
    try {
      const result = await apiRequest(`/campaigns/${campaignId}/send`, { token: auth.token, method: "POST" });
      showToast(`Envoye: ${result.data.delivered}/${result.data.recipients}`, "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  return (
    <section className="stack">
      <article className="card">
        <h2>Nouvelle campagne</h2>
        <form className="form" onSubmit={createCampaign}>
          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Titre"
            required
          />
          <textarea
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            placeholder="Message"
            required
          />
          <button type="submit">Creer campagne</button>
        </form>
      </article>
      <article className="card">
        <h2>Historique</h2>
        {isLoading ? <div className="skeleton">Chargement...</div> : null}
        {campaigns.map((campaign) => (
          <div className="row item" key={campaign.id}>
            <div>
              <strong>{campaign.title}</strong>
              <p>{campaign.message}</p>
            </div>
            <button type="button" onClick={() => sendCampaign(campaign.id)}>
              Envoyer
            </button>
          </div>
        ))}
      </article>
    </section>
  );
}
