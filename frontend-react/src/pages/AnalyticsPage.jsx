import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { useToast } from "../components/ToastContext";

export function AnalyticsPage({ auth }) {
  const [analytics, setAnalytics] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    apiRequest("/analytics/overview", { token: auth.token })
      .then((response) => setAnalytics(response.data))
      .catch((error) => showToast(error.message, "error"));
  }, [auth.token, showToast]);

  if (!analytics) {
    return <div className="card skeleton subtle">Chargement des statistiques…</div>;
  }

  return (
    <section className="dashboard-stats analytics-stats">
      <article className="stat-card">
        <span className="stat-card-label">Clients actifs (7 j)</span>
        <strong className="stat-card-value">{analytics.activeClients7d}</strong>
      </article>
      <article className="stat-card">
        <span className="stat-card-label">Clients actifs (30 j)</span>
        <strong className="stat-card-value">{analytics.activeClients30d}</strong>
      </article>
      <article className="stat-card">
        <span className="stat-card-label">Rétention 7 j</span>
        <strong className="stat-card-value">{analytics.retentionRate7d}%</strong>
      </article>
      <article className="stat-card">
        <span className="stat-card-label">Rétention 30 j</span>
        <strong className="stat-card-value">{analytics.retentionRate30d}%</strong>
      </article>
      <article className="stat-card">
        <span className="stat-card-label">Total clients</span>
        <strong className="stat-card-value">{analytics.totalClients}</strong>
      </article>
      <article className="stat-card">
        <span className="stat-card-label">Total points</span>
        <strong className="stat-card-value">{analytics.totalPoints}</strong>
      </article>
    </section>
  );
}
