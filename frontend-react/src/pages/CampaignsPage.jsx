import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { useToast } from "../components/ToastContext";

export function CampaignsPage({ auth }) {
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({ title: "", message: "", channel: "email" });
  const [recipientCount, setRecipientCount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const loadRecipientCount = async () => {
    try {
      const response = await apiRequest("/campaigns/email-recipient-count", { token: auth.token });
      setRecipientCount(typeof response.data?.count === "number" ? response.data.count : 0);
    } catch {
      setRecipientCount(null);
    }
  };

  const load = async () => {
    setIsLoading(true);
    try {
      const [campaignsRes] = await Promise.all([
        apiRequest("/campaigns?page=1&limit=20", { token: auth.token }),
        loadRecipientCount()
      ]);
      setCampaigns(campaignsRes.data || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load().catch((error) => showToast(error.message, "error"));
  }, []);

  const createCampaign = async (event) => {
    event.preventDefault();
    try {
      await apiRequest("/campaigns", { token: auth.token, method: "POST", body: form });
      setForm({ title: "", message: "", channel: "email" });
      showToast("Campagne enregistrée", "success");
      await load();
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const sendCampaign = async (campaignId) => {
    if (recipientCount === 0) {
      showToast(
        "Aucun destinataire : ajoute des emails et coche le consentement marketing (RGPD) sur les fiches clients.",
        "error"
      );
      return;
    }
    try {
      const result = await apiRequest(`/campaigns/${campaignId}/send`, {
        token: auth.token,
        method: "POST",
        retries: 0
      });
      const delivered = result.data?.delivered ?? 0;
      const recipients = result.data?.recipients ?? 0;
      showToast(`Envoye : ${delivered} / ${recipients}`, delivered > 0 ? "success" : "info");
      await loadRecipientCount();
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  return (
    <section className="stack">
      <article className="card">
        <h2>Emails promotionnels</h2>
        <p className="muted">
          Tu rédiges une annonce (événement, réduction, nouveauté). Clique sur <strong>Envoyer maintenant</strong> quand
          tu es prêt : les mails partent depuis ton Gmail connecté (Paramètres) vers les clients ayant accepté le{" "}
          <strong>marketing</strong> et une adresse email.
        </p>
        <p className="muted">
          Destinataires eligibles :{" "}
          <strong>{recipientCount === null ? "..." : recipientCount}</strong>
          {recipientCount === 0 ? (
            <span> — ajoute des clients avec email et consentement marketing active.</span>
          ) : null}
        </p>
        <form className="form" onSubmit={createCampaign}>
          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Objet interne + objet mail (ex: -20% ce week-end)"
            required
          />
          <textarea
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            placeholder="Corps du message (visible par les clients)"
            rows={8}
            required
          />
          <button type="submit">Enregistrer la campagne</button>
        </form>
      </article>
      <article className="card">
        <h2>Tes campagnes</h2>
        {isLoading ? <div className="skeleton">Chargement...</div> : null}
        {!isLoading && campaigns.length === 0 ? (
          <p className="muted">Aucune campagne pour le moment.</p>
        ) : null}
        {campaigns.map((campaign) => (
          <div className="row item" key={campaign.id}>
            <div>
              <strong>{campaign.title}</strong>
              <p className="muted">{campaign.channel === "sms" ? "SMS (non disponible)" : "Email"}</p>
              <p>{campaign.message}</p>
            </div>
            <button type="button" onClick={() => sendCampaign(campaign.id)} disabled={recipientCount === 0}>
              Envoyer maintenant
            </button>
          </div>
        ))}
      </article>
    </section>
  );
}
