import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { useToast } from "../components/ToastContext";

export function BusinessPage({ auth }) {
  const [business, setBusiness] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([
      apiRequest("/analytics/business", { token: auth.token }),
      apiRequest("/analytics/onboarding-funnel", { token: auth.token })
    ])
      .then(([biz, fun]) => {
        setBusiness(biz.data);
        setFunnel(fun.data);
      })
      .catch((error) => showToast(error.message, "error"));
  }, [auth.token, showToast]);

  if (!business || !funnel) {
    return <div className="card skeleton">Chargement business...</div>;
  }

  return (
    <section className="stack">
      <article className="card">
        <h2>SaaS & retention (simulation)</h2>
        <p className="muted">{business.notes}</p>
        <div className="grid">
          <div className="stat card inner">
            <h3>MRR simule (EUR)</h3>
            <strong>{business.mrrSimulated}</strong>
          </div>
          <div className="stat card inner">
            <h3>Activation clients</h3>
            <strong>{business.activationRate}%</strong>
          </div>
          <div className="stat card inner">
            <h3>Activite 30j</h3>
            <strong>{business.retentionActivity30d}%</strong>
          </div>
          <div className="stat card inner">
            <h3>Risque churn</h3>
            <strong>{business.churnRisk}</strong>
          </div>
        </div>
      </article>

      <article className="card">
        <h2>Funnel onboarding</h2>
        <p className="muted">Sessions liees a ton compte apres connexion.</p>
        <div className="row spread">
          <span>Completes</span>
          <strong>{funnel.completedSessions}</strong>
        </div>
        <div className="row spread">
          <span>Abandons (&gt;24h, non termine)</span>
          <strong>{funnel.abandonedSessions}</strong>
        </div>
        <div className="funnel-steps">
          {funnel.sessionsByStep.map((row) => (
            <div className="funnel-bar" key={row.step}>
              <span>Etape {row.step}</span>
              <div className="bar">
                <div className="fill" style={{ width: `${Math.min(100, row.total * 8)}px` }} />
              </div>
              <strong>{row.total}</strong>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
