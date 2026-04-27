const API_BASE = "http://localhost:4000/api";
let token = "";

const statusEl = document.getElementById("status");
const authBox = document.getElementById("authBox");
const dashboard = document.getElementById("dashboard");
const clientsList = document.getElementById("clientsList");
const scannerVideo = document.getElementById("scannerVideo");
const startScanBtn = document.getElementById("startScanBtn");
const stopScanBtn = document.getElementById("stopScanBtn");

let scannerStream = null;
let scanning = false;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b91c1c" : "#065f46";
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "API error");
  }
  return data;
}

async function loadClients() {
  const clients = await api("/clients");
  clientsList.innerHTML = "";

  clients.forEach((client) => {
    const li = document.createElement("li");
    li.className = "client-item";
    li.innerHTML = `
      <strong>${client.full_name}</strong>
      <div>Points: ${client.points}</div>
      <div>Recompenses: ${client.reward_state.rewardsEarned}</div>
      <div>Prochaine recompense dans: ${client.reward_state.pointsUntilNextReward} point(s)</div>
      <div class="row">
        <button data-client="${client.id}" data-action="points">+1 point</button>
        <button data-client="${client.id}" data-action="apple">Apple Wallet</button>
      </div>
    `;
    clientsList.appendChild(li);
  });
}

document.getElementById("registerBtn").addEventListener("click", async () => {
  try {
    const email = document.getElementById("email").value || `demo${Date.now()}@shop.test`;
    const payload = {
      businessName: "Demo Shop",
      email,
      password: "Password123"
    };
    await api("/auth/register", { method: "POST", body: JSON.stringify(payload) });
    setStatus("Compte cree. Connectez-vous.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = {
      email: document.getElementById("email").value,
      password: document.getElementById("password").value
    };
    const data = await api("/auth/login", { method: "POST", body: JSON.stringify(payload) });
    token = data.token;
    authBox.classList.add("hidden");
    dashboard.classList.remove("hidden");
    await loadClients();
    setStatus("Connecte");
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.getElementById("clientForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = {
      fullName: document.getElementById("clientName").value,
      phone: document.getElementById("clientPhone").value || undefined,
      email: document.getElementById("clientEmail").value || undefined,
      consentMarketing: true
    };
    await api("/clients", { method: "POST", body: JSON.stringify(payload) });
    event.target.reset();
    await loadClients();
    setStatus("Client ajoute");
  } catch (error) {
    setStatus(error.message, true);
  }
});

clientsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const clientId = button.dataset.client;
  const action = button.dataset.action;
  try {
    if (action === "points") {
      const result = await api(`/clients/${clientId}/points`, {
        method: "POST",
        body: JSON.stringify({ points: 1, channel: "manual" })
      });
      setStatus(result.message);
      await loadClients();
    }

    if (action === "apple") {
      window.open(`${API_BASE}/wallet/apple/${clientId}`, "_blank");
    }
  } catch (error) {
    setStatus(error.message, true);
  }
});

function parseQrClientId(rawValue) {
  if (!rawValue) return null;
  const chunks = rawValue.split(":");
  if (chunks.length >= 2) return chunks[1];
  return rawValue;
}

async function handleQrValue(rawValue) {
  const clientId = parseQrClientId(rawValue);
  if (!clientId) return;

  const result = await api(`/clients/${clientId}/points`, {
    method: "POST",
    body: JSON.stringify({ points: 1, channel: "qr", note: "scan camera" })
  });
  setStatus(`QR valide. ${result.message}`);
  await loadClients();
}

async function startScanner() {
  if (scanning) return;
  scannerStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" }
  });
  scannerVideo.srcObject = scannerStream;
  await scannerVideo.play();
  scanning = true;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  async function tick() {
    if (!scanning) return;
    if (scannerVideo.readyState === scannerVideo.HAVE_ENOUGH_DATA) {
      canvas.width = scannerVideo.videoWidth;
      canvas.height = scannerVideo.videoHeight;
      context.drawImage(scannerVideo, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = window.jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        try {
          await handleQrValue(code.data);
        } catch (error) {
          setStatus(error.message, true);
        }
        stopScanner();
        return;
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function stopScanner() {
  scanning = false;
  if (scannerStream) {
    scannerStream.getTracks().forEach((track) => track.stop());
    scannerStream = null;
  }
  scannerVideo.srcObject = null;
}

startScanBtn.addEventListener("click", async () => {
  try {
    await startScanner();
    setStatus("Scan en cours...");
  } catch (error) {
    setStatus(`Camera indisponible: ${error.message}`, true);
  }
});

stopScanBtn.addEventListener("click", () => {
  stopScanner();
  setStatus("Scan arrete");
});
