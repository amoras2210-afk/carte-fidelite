import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { useMerchantBilling } from "../context/MerchantBillingContext.jsx";
import { useToast } from "../components/ToastContext";

export function OverviewPage({ auth }) {
  const { subscriptionActive } = useMerchantBilling() ?? {};
  const [stats, setStats] = useState({ clients: 0, points: 0, rewards: 0, visits: 0 });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  useEffect(() => {
    if (searchParams.get("paiement") === "reussi") {
      showToast("Paiement confirmé — merci ! Ton espace Loyalty Pro est à jour.", "success");
      navigate("/tableau", { replace: true });
    }
  }, [searchParams, navigate, showToast]);

  useEffect(() => {
    async function load() {
      const response = await apiRequest("/clients?limit=100", { token: auth.token });
      const clients = response.data || [];
      const totals = clients.reduce(
        (acc, client) => {
          acc.points += client.points;
          acc.rewards += client.reward_state?.rewardsEarned || 0;
          acc.visits += client.visits || 0;
          return acc;
        },
        { points: 0, rewards: 0, visits: 0 }
      );
      setStats({
        clients: clients.length,
        points: totals.points,
        rewards: totals.rewards,
        visits: totals.visits
      });
    }
    load().catch(() => null);
  }, [auth.token]);

  return (
    <div className="stack dashboard-overview">
      <div className="quick-links card subtle">
        <span className="quick-links-label">Accès rapides</span>
        <div className="quick-links-row">
          <Link className="quick-link" to="/clients">
            Gérer les clients
          </Link>
          <Link className="quick-link" to="/wallet">
            Cartes Apple / Google
          </Link>
          <Link className="quick-link" to="/campaigns">
            Nouvelle campagne
          </Link>
          {subscriptionActive ? (
            <Link className="quick-link" to="/generateur-carte">
              FidélioGen (carte visuelle)
            </Link>
          ) : null}
        </div>
      </div>

      <section className="dashboard-stats">
        <article className="stat-card">
          <span className="stat-card-label">Clients</span>
          <strong className="stat-card-value">{stats.clients}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-card-label">Points actifs</span>
          <strong className="stat-card-value">{stats.points}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-card-label">Visites (QR)</span>
          <strong className="stat-card-value">{stats.visits}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-card-label">Récompenses débloquées</span>
          <strong className="stat-card-value">{stats.rewards}</strong>
        </article>
      </section>
    </div>
  );
}
