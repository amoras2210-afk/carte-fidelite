const db = require("../config/db");
const { sendSuccess } = require("../utils/httpResponse");

async function getOverview(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    const [clientsCount, pointsTotal, active7d, active30d] = await Promise.all([
      db.query("SELECT COUNT(*)::int AS value FROM clients WHERE merchant_id = $1", [merchantId]),
      db.query("SELECT COALESCE(SUM(points),0)::int AS value FROM clients WHERE merchant_id = $1", [merchantId]),
      db.query(
        `SELECT COUNT(DISTINCT client_id)::int AS value
         FROM points_history
         WHERE merchant_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
        [merchantId]
      ),
      db.query(
        `SELECT COUNT(DISTINCT client_id)::int AS value
         FROM points_history
         WHERE merchant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
        [merchantId]
      )
    ]);

    const clients = clientsCount.rows[0].value;
    const cohort7d = clients > 0 ? Number(((active7d.rows[0].value / clients) * 100).toFixed(1)) : 0;
    const cohort30d = clients > 0 ? Number(((active30d.rows[0].value / clients) * 100).toFixed(1)) : 0;

    return sendSuccess(res, {
      data: {
        totalClients: clients,
        totalPoints: pointsTotal.rows[0].value,
        activeClients7d: active7d.rows[0].value,
        activeClients30d: active30d.rows[0].value,
        retentionRate7d: cohort7d,
        retentionRate30d: cohort30d
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getOnboardingFunnel(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;

    const [byStep, completed, abandoned] = await Promise.all([
      db.query(
        `SELECT last_step AS step, COUNT(*)::int AS total
         FROM onboarding_sessions
         WHERE merchant_id = $1
         GROUP BY last_step
         ORDER BY last_step`,
        [merchantId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS total FROM onboarding_sessions WHERE merchant_id = $1 AND completed = TRUE`,
        [merchantId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS total
         FROM onboarding_sessions
         WHERE merchant_id = $1
         AND completed = FALSE
         AND updated_at < NOW() - INTERVAL '24 hours'`,
        [merchantId]
      )
    ]);

    return sendSuccess(res, {
      data: {
        sessionsByStep: byStep.rows,
        completedSessions: completed.rows[0].total,
        abandonedSessions: abandoned.rows[0].total
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getBusiness(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;

    const [merchantRow, totalClients, activatedClients, overview30] = await Promise.all([
      db.query("SELECT plan_mrr_eur FROM merchants WHERE id = $1", [merchantId]),
      db.query("SELECT COUNT(*)::int AS value FROM clients WHERE merchant_id = $1", [merchantId]),
      db.query(
        `SELECT COUNT(DISTINCT c.id)::int AS value
         FROM clients c
         INNER JOIN points_history ph ON ph.client_id = c.id
         WHERE c.merchant_id = $1`,
        [merchantId]
      ),
      db.query(
        `SELECT COUNT(DISTINCT client_id)::int AS value
         FROM points_history
         WHERE merchant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
        [merchantId]
      )
    ]);

    const total = totalClients.rows[0].value;
    const activated = activatedClients.rows[0].value;
    const active30 = overview30.rows[0].value;

    const activationRate = total > 0 ? Number(((activated / total) * 100).toFixed(1)) : 0;
    const mrrSimulated = Number(merchantRow.rows[0]?.plan_mrr_eur || 49);

    const retention30 = total > 0 ? Number(((active30 / total) * 100).toFixed(1)) : 0;
    let churnRisk = "low";
    if (retention30 < 15) churnRisk = "high";
    else if (retention30 < 35) churnRisk = "medium";

    return sendSuccess(res, {
      data: {
        mrrSimulated,
        activationRate,
        retentionActivity30d: retention30,
        churnRisk,
        notes:
          "Metriques orientees produit: MRR simule via plan_mrr_eur tant que la facturation n'est pas branchee."
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverview,
  getOnboardingFunnel,
  getBusiness
};
