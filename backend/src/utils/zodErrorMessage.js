const { ZodError } = require("zod");

const FIELD_LABEL_FR = {
  businessName: "Nom du commerce",
  email: "Email",
  password: "Mot de passe",
  name: "Nom",
  phone: "Téléphone",
  notes: "Notes",
  rewardThreshold: "Seuil de récompense",
  rewardLabel: "Libellé de récompense",
  campaignName: "Nom de campagne",
  step: "Étape",
  action: "Action",
  sessionId: "Session",
  mapping: "Correspondance des colonnes"
};

function fieldLabel(path) {
  if (!path || path.length === 0) return "Données";
  const key = path[0];
  return FIELD_LABEL_FR[key] || String(key);
}

function issueToFr(issue) {
  const label = fieldLabel(issue.path);
  const key = issue.path?.[0];

  if (issue.code === "invalid_format" && issue.format === "email") {
    return `${label} : adresse invalide.`;
  }
  if (issue.code === "too_small" && typeof issue.minimum === "number") {
    if (key === "password") {
      return `Mot de passe : au moins ${issue.minimum} caractères.`;
    }
    return `${label} : au moins ${issue.minimum} caractères.`;
  }
  if (issue.code === "too_big") {
    return `${label} : valeur trop grande.`;
  }
  if (issue.code === "invalid_type") {
    return `${label} : type invalide.`;
  }
  return `${label} : ${issue.message}`;
}

/**
 * @param {unknown} err
 * @returns {string | null} French summary, or null if not a ZodError
 */
function formatZodErrorMessage(err) {
  if (!(err instanceof ZodError)) return null;
  const lines = err.issues.map(issueToFr);
  return [...new Set(lines)].join(" ");
}

module.exports = {
  formatZodErrorMessage,
  ZodError
};
