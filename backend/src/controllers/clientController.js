const { z } = require("zod");
const { parse } = require("csv-parse/sync");
const db = require("../config/db");
const ApiError = require("../utils/ApiError");
const { buildRewardState } = require("../services/loyaltyService");
const { sendRewardUnlockedEmail } = require("../services/notificationService");
const { logAuditEvent } = require("../services/auditService");
const { sendSuccess } = require("../utils/httpResponse");
const { parsePagination } = require("../utils/pagination");
const { signCardToken } = require("../utils/cardToken");

const createClientSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  consentMarketing: z.boolean().default(false)
}).refine((value) => value.email || value.phone, {
  message: "Email or phone is required"
});

const addPointsSchema = z.object({
  points: z.number().int().min(1).max(1000),
  channel: z.enum(["qr", "phone", "manual"]).default("manual"),
  note: z.string().max(255).optional()
});

async function listClients(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    const { page, limit, offset } = parsePagination(req.query);
    const search = (req.query.search || "").trim();
    const filter = `%${search}%`;

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM clients
       WHERE merchant_id = $1
       AND ($2 = '%%' OR full_name ILIKE $2 OR email ILIKE $2 OR phone ILIKE $2)`,
      [merchantId, filter]
    );
    const result = await db.query(
      `SELECT c.*, ls.reward_threshold
       FROM clients c
       JOIN loyalty_settings ls ON ls.merchant_id = c.merchant_id
       WHERE c.merchant_id = $1
       AND ($2 = '%%' OR c.full_name ILIKE $2 OR c.email ILIKE $2 OR c.phone ILIKE $2)
       ORDER BY c.created_at DESC
       LIMIT $3 OFFSET $4`,
      [merchantId, filter, limit, offset]
    );

    const rows = result.rows.map((client) => ({
      ...client,
      reward_state: buildRewardState(client.points, client.reward_threshold)
    }));

    return sendSuccess(res, {
      data: rows,
      meta: {
        page,
        limit,
        total: countResult.rows[0].total
      }
    });
  } catch (error) {
    next(error);
  }
}

async function createClient(req, res, next) {
  try {
    const payload = createClientSchema.parse(req.body);
    const merchantId = req.auth.merchantId;

    const result = await db.query(
      `INSERT INTO clients (merchant_id, full_name, email, phone, consent_marketing)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [merchantId, payload.fullName, payload.email || null, payload.phone || null, payload.consentMarketing]
    );
    await logAuditEvent({
      merchantId,
      action: "client.created",
      targetType: "client",
      targetId: result.rows[0].id
    });
    return sendSuccess(res, { statusCode: 201, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function addPoints(req, res, next) {
  try {
    const payload = addPointsSchema.parse(req.body);
    const clientId = req.params.clientId;
    const merchantId = req.auth.merchantId;

    const clientResult = await db.query(
      "SELECT * FROM clients WHERE id = $1 AND merchant_id = $2",
      [clientId, merchantId]
    );
    const settingsResult = await db.query(
      "SELECT reward_threshold FROM loyalty_settings WHERE merchant_id = $1",
      [merchantId]
    );

    const client = clientResult.rows[0];
    if (!client) {
      throw new ApiError(404, "Client not found", null, "CLIENT_NOT_FOUND");
    }
    const rewardThreshold = settingsResult.rows[0]?.reward_threshold || 10;
    const merchantResult = await db.query("SELECT business_name FROM merchants WHERE id = $1", [merchantId]);

    const previousState = buildRewardState(client.points, rewardThreshold);
    const shouldIncreaseVisit = payload.channel === "qr";
    const newPoints = client.points + payload.points;
    const newVisits = Number(client.visits || 0) + (shouldIncreaseVisit ? 1 : 0);
    const newState = buildRewardState(newPoints, rewardThreshold);
    const rewardUnlocked = newState.rewardsEarned > previousState.rewardsEarned;

    const updatedClientResult = await db.query(
      "UPDATE clients SET points = $1, visits = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
      [newPoints, newVisits, client.id]
    );
    await db.query(
      `INSERT INTO points_history (client_id, merchant_id, points_added, channel, note, reward_unlocked)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [client.id, merchantId, payload.points, payload.channel, payload.note || null, rewardUnlocked]
    );
    await logAuditEvent({
      merchantId,
      action: "client.points_added",
      targetType: "client",
      targetId: client.id,
      metadata: { points: payload.points, channel: payload.channel, rewardUnlocked, visitIncremented: shouldIncreaseVisit }
    });

    const emailResult =
      rewardUnlocked && client.email
        ? await sendRewardUnlockedEmail({
            merchantName: merchantResult.rows[0]?.business_name || "Votre commerce",
            clientEmail: client.email,
            clientName: client.full_name,
            points: newPoints,
            rewardsEarned: newState.rewardsEarned
          })
        : { delivered: false, reason: "no_reward_or_no_email" };

    return sendSuccess(res, {
      data: {
        client: updatedClientResult.rows[0],
        rewardUnlocked,
        rewardState: newState,
        notification: emailResult,
        message: rewardUnlocked
          ? "Reward unlocked. Email notification processed."
          : shouldIncreaseVisit
            ? "Visite enregistree et points ajoutes."
            : "Points added successfully."
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getClientHistory(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    const clientId = req.params.clientId;
    const result = await db.query(
      `SELECT *
       FROM points_history
       WHERE merchant_id = $1 AND client_id = $2
       ORDER BY created_at DESC`,
      [merchantId, clientId]
    );
    return sendSuccess(res, { data: result.rows });
  } catch (error) {
    next(error);
  }
}

async function deleteClient(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    const clientId = req.params.clientId;

    const result = await db.query(
      "DELETE FROM clients WHERE merchant_id = $1 AND id = $2 RETURNING id",
      [merchantId, clientId]
    );
    if (!result.rows[0]) {
      throw new ApiError(404, "Client not found", null, "CLIENT_NOT_FOUND");
    }
    await logAuditEvent({
      merchantId,
      action: "client.deleted",
      targetType: "client",
      targetId: clientId
    });

    return sendSuccess(res, { data: { deleted: true } });
  } catch (error) {
    next(error);
  }
}

const previewImportSchema = z.object({
  csvText: z.string().min(1).max(2_000_000),
  hasHeader: z.boolean().default(true)
});

const commitImportSchema = z.object({
  csvText: z.string().min(1).max(2_000_000),
  hasHeader: z.boolean().default(true),
  mapping: z.object({
    fullName: z.string().min(1),
    email: z.string().optional(),
    phone: z.string().optional(),
    consentMarketing: z.string().optional()
  })
});

function parseBool(value) {
  if (value === undefined || value === null || value === "") return false;
  const s = String(value).trim().toLowerCase();
  return ["1", "true", "oui", "yes", "o"].includes(s);
}

function pickField(row, columnKey, hasHeader) {
  if (!columnKey || columnKey === "__skip__") return undefined;
  if (hasHeader) {
    return row[columnKey];
  }
  const index = Number.parseInt(columnKey, 10);
  if (Number.isNaN(index)) return undefined;
  return Array.isArray(row) ? row[index] : undefined;
}

async function previewImport(req, res, next) {
  try {
    const payload = previewImportSchema.parse(req.body);
    let records;
    try {
      records = parse(payload.csvText, {
        columns: payload.hasHeader,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      });
    } catch {
      throw new ApiError(400, "CSV invalide ou vide", null, "IMPORT_PARSE_ERROR");
    }

    if (!records.length) {
      throw new ApiError(400, "Aucune ligne trouvee dans le fichier", null, "IMPORT_EMPTY");
    }

    const totalRows = records.length;
    const previewRows = records.slice(0, 8);
    let columns = [];
    if (payload.hasHeader && records[0] && typeof records[0] === "object" && !Array.isArray(records[0])) {
      columns = Object.keys(records[0]);
    } else if (!payload.hasHeader && records[0]) {
      const len = Array.isArray(records[0]) ? records[0].length : 0;
      columns = Array.from({ length: len }, (_, index) => String(index));
    }

    return sendSuccess(res, {
      data: {
        columns,
        previewRows,
        totalRows
      }
    });
  } catch (error) {
    next(error);
  }
}

async function commitImport(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    const payload = commitImportSchema.parse(req.body);

    let records;
    try {
      records = parse(payload.csvText, {
        columns: payload.hasHeader,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      });
    } catch {
      throw new ApiError(400, "CSV invalide", null, "IMPORT_PARSE_ERROR");
    }

    if (records.length > 500) {
      throw new ApiError(400, "Maximum 500 rows per import", null, "IMPORT_TOO_LARGE");
    }

    const dbClient = await db.connect();
    let inserted = 0;
    try {
      await dbClient.query("BEGIN");
      for (const row of records) {
        const fullNameRaw = pickField(row, payload.mapping.fullName, payload.hasHeader);
        const fullName = fullNameRaw ? String(fullNameRaw).trim() : "";
        if (fullName.length < 2) continue;

        const emailRaw = pickField(row, payload.mapping.email || "__skip__", payload.hasHeader);
        const phoneRaw = pickField(row, payload.mapping.phone || "__skip__", payload.hasHeader);
        const consentRaw = pickField(row, payload.mapping.consentMarketing || "__skip__", payload.hasHeader);

        const email = emailRaw ? String(emailRaw).trim() : "";
        const phone = phoneRaw ? String(phoneRaw).trim() : "";
        if (!email && !phone) continue;

        const consentMarketing = parseBool(consentRaw);

        await dbClient.query(
          `INSERT INTO clients (merchant_id, full_name, email, phone, consent_marketing)
           VALUES ($1, $2, $3, $4, $5)`,
          [merchantId, fullName, email || null, phone || null, consentMarketing]
        );
        inserted += 1;
      }
      await dbClient.query("COMMIT");
    } catch (error) {
      await dbClient.query("ROLLBACK");
      throw error;
    } finally {
      dbClient.release();
    }

    await logAuditEvent({
      merchantId,
      action: "clients.import",
      targetType: "merchant",
      targetId: merchantId,
      metadata: { inserted, totalParsed: records.length }
    });

    return sendSuccess(res, {
      data: {
        inserted,
        skipped: records.length - inserted
      }
    });
  } catch (error) {
    next(error);
  }
}

async function exportClientsCsv(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    const result = await db.query(
      `SELECT full_name, email, phone, points, visits, consent_marketing, created_at
       FROM clients
       WHERE merchant_id = $1
       ORDER BY created_at DESC`,
      [merchantId]
    );

    const header = "full_name,email,phone,points,visits,consent_marketing,created_at";
    const rows = result.rows.map((row) =>
      [
        row.full_name,
        row.email || "",
        row.phone || "",
        row.points,
        row.visits || 0,
        row.consent_marketing,
        new Date(row.created_at).toISOString()
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    );

    const csv = [header, ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=clients-export.csv");
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

async function createClientCardToken(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    const clientId = req.params.clientId;

    const result = await db.query("SELECT id FROM clients WHERE id = $1 AND merchant_id = $2", [clientId, merchantId]);
    if (!result.rows[0]) {
      throw new ApiError(404, "Client not found", null, "CLIENT_NOT_FOUND");
    }

    const token = signCardToken({ merchantId, clientId });
    return sendSuccess(res, {
      data: {
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listClients,
  createClient,
  addPoints,
  getClientHistory,
  deleteClient,
  exportClientsCsv,
  previewImport,
  commitImport,
  createClientCardToken
};
