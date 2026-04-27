/** En prod, définir VITE_API_URL (ex. https://ton-api.onrender.com/api) sur l’hébergeur du front. */
export const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/$/, "");

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
        throw new Error(payload?.error?.message || "API request failed");
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
  const body = {
    ...payload,
    sessionId: payload.sessionId || existing || undefined
  };
  const response = await fetchWithTimeout(`${API_BASE}/onboarding/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.ok === false) {
    throw new Error(json?.error?.message || "Onboarding track failed");
  }
  if (json.data?.sessionId) {
    localStorage.setItem(ONBOARDING_SESSION_KEY, json.data.sessionId);
  }
  return json.data.sessionId;
}

export async function linkOnboardingSession(token) {
  const sessionId = localStorage.getItem(ONBOARDING_SESSION_KEY);
  if (!sessionId || !token) return;
  await apiRequest("/onboarding/link-session", {
    method: "POST",
    token,
    body: { sessionId }
  });
}
