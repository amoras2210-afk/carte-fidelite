import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

export function OverviewPage({ auth }) {
  const [stats, setStats] = useState({ clients: 0, points: 0, rewards: 0, visits: 0 });

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
    <section className="grid">
      <article className="card stat">
        <h3>Clients</h3>
        <strong>{stats.clients}</strong>
      </article>
      <article className="card stat">
        <h3>Points actifs</h3>
        <strong>{stats.points}</strong>
      </article>
      <article className="card stat">
        <h3>Visites scannees</h3>
        <strong>{stats.visits}</strong>
      </article>
      <article className="card stat">
        <h3>Recompenses gagnees</h3>
        <strong>{stats.rewards}</strong>
      </article>
    </section>
  );
}
