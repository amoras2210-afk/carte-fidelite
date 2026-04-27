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
    return <div className="card skeleton">Chargement analytics...</div>;
  }

  return (
    <section className="grid">
      <article className="card stat">
        <h3>Clients actifs (7j)</h3>
        <strong>{analytics.activeClients7d}</strong>
      </article>
      <article className="card stat">
        <h3>Clients actifs (30j)</h3>
        <strong>{analytics.activeClients30d}</strong>
      </article>
      <article className="card stat">
        <h3>Retention 7j</h3>
        <strong>{analytics.retentionRate7d}%</strong>
      </article>
      <article className="card stat">
        <h3>Retention 30j</h3>
        <strong>{analytics.retentionRate30d}%</strong>
      </article>
      <article className="card stat">
        <h3>Total clients</h3>
        <strong>{analytics.totalClients}</strong>
      </article>
      <article className="card stat">
        <h3>Total points</h3>
        <strong>{analytics.totalPoints}</strong>
      </article>
    </section>
  );
}
