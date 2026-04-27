const db = require("../config/db");

async function logAuditEvent({ merchantId = null, action, targetType = null, targetId = null, metadata = null }) {
  await db.query(
    `INSERT INTO audit_logs (merchant_id, action, target_type, target_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [merchantId, action, targetType, targetId, metadata ? JSON.stringify(metadata) : null]
  );
}

module.exports = {
  logAuditEvent
};
