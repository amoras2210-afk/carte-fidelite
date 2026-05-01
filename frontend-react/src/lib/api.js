/** En prod, définir VITE_API_URL (ex. https://ton-api.onrender.com/api) sur l’hébergeur du front. */
export const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/$/, "");

/** Short user-facing message from API error payload (handles legacy Zod JSON in message). */
export function formatApiErrorMessage(payload) {
  const msg = payload?.error?.message;
  if (typeof msg === "string" && msg.trim().startsWith("[")) {
    try {
      const issues = JSON.parse(msg);
      if (Array.isArray(issues)) {
        const parts = issues.map((iss) => {
          const path = Array.isArray(iss.path) && iss.path.length ? iss.path.join(".") : "";
          const label =
            path === "email"
              ? "Email"
              : path === "password"
                ? "Mot de passe"
                : path === "businessName"
                  ? "Nom du commerce"
                  : path || "Champ";
          if (iss.code === "invalid_format" && iss.format === "email") return `${label} : adresse invalide.`;
          if (iss.code === "too_small" && typeof iss.minimum === "number") {
            return path === "password"
              ? `Mot de passe : au moins ${iss.minimum} caractères.`
              : `${label} : au moins ${iss.minimum} caractères.`;
          }
          return iss.message ? `${label} : ${iss.message}` : label;
        });
        return [...new Set(parts)].join(" ");
      }
    } catch {
      /* fall through */
    }
  }
  return typeof msg === "string" && msg.length ? msg : "Une erreur est survenue.";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options, timeoutMs = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function apiRequest(path, { token, method = "GET", body, retries = 1 } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await fetchWithTimeout(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) {
        throw new Error(formatApiErrorMessage(payload));
      }
      return payload;
    } catch (error) {
      if (attempt === retries) throw error;
      await sleep(200 * (attempt + 1));
      attempt += 1;
    }
  }
}

export function openApplePass(token, clientId) {
  window.open(
    `${API_BASE}/wallet/apple/${clientId}?token=${encodeURIComponent(token)}&t=${Date.now()}`,
    "_blank",
    "noopener,noreferrer"
  );
}

const ONBOARDING_SESSION_KEY = "onboarding_session_id";

export async function trackOnboarding(payload) {
  const existing = localStorage.getItem(ONBOARDING_SESSION_KEY);

  async function postEvent(sessionId) {
    const body = {
      ...payload,
      sessionId: payload.sessionId || sessionId || undefined
    };
    const response = await fetchWithTimeout(`${API_BASE}/onboarding/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.ok === false) {
      throw new Error(formatApiErrorMessage(json));
    }
    if (json.data?.sessionId) {
      localStorage.setItem(ONBOARDING_SESSION_KEY, json.data.sessionId);
    }
    return json.data.sessionId;
  }

  try {
    return await postEvent(existing);
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    // If browser kept a stale onboarding session id, retry once without it.
    if (existing && message.includes("onboarding")) {
      localStorage.removeItem(ONBOARDING_SESSION_KEY);
      return postEvent(undefined);
    }
    throw error;
  }
}

export async function linkOnboardingSession(token) {
  const sessionId = localStorage.getItem(ONBOARDING_SESSION_KEY);
  if (!sessionId || !token) return;
  try {
    await apiRequest("/onboarding/link-session", {
      method: "POST",
      token,
      body: { sessionId }
    });
  } catch (error) {
    // Stale local session ids should never block auth.
    localStorage.removeItem(ONBOARDING_SESSION_KEY);
    if (!String(error?.message || "").toLowerCase().includes("onboarding")) {
      console.warn("[onboarding] link-session skipped:", error?.message || error);
    }
  }
}

export async function getBillingStatus(token) {
  return apiRequest("/billing/status", { token, retries: 0 });
}

export async function createBillingCheckoutSession(token) {
  return apiRequest("/billing/checkout-session", {
    token,
    method: "POST",
    body: {},
    retries: 0
  });
}
