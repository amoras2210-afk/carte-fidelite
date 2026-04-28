import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";
import { API_BASE, apiRequest, openApplePass } from "../lib/api";
import { decodeJwtPayload } from "../lib/jwtPayload";
import { useToast } from "../components/ToastContext";

export function ClientsPage({ auth }) {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", consentMarketing: false });
  const [status, setStatus] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [importPreview, setImportPreview] = useState(null);
  const [importMapping, setImportMapping] = useState({
    fullName: "",
    email: "__skip__",
    phone: "__skip__",
    consentMarketing: "__skip__"
  });
  const [importBusy, setImportBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, limit: 10 });
  const videoRef = useRef(null);
  const [scanOn, setScanOn] = useState(false);
  const mediaStreamRef = useRef(null);
  const scanLockRef = useRef(false);
  const [manualQrValue, setManualQrValue] = useState("");
  const [walletDiagnostics, setWalletDiagnostics] = useState(null);
  const [scanMessage, setScanMessage] = useState("Pret pour un scan caisse.");
  const [lastScan, setLastScan] = useState(null);
  const [publicCardLink, setPublicCardLink] = useState("");
  const { showToast } = useToast();

  const totalPages = useMemo(() => Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 10))), [meta]);

  const merchantId = useMemo(() => decodeJwtPayload(auth.token)?.merchantId ?? null, [auth.token]);

  const qrPayloadForClient = (client) =>
    merchantId && client?.id ? `${merchantId}:${client.id}:${client.points ?? 0}` : "";

  const copyText = async (text, toastLabel) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(toastLabel || "Copie dans le presse-papiers", "success");
    } catch {
      showToast("Copie impossible (navigateur)", "error");
    }
  };

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    const response = await apiRequest(
      `/clients?search=${encodeURIComponent(search)}&page=${page}&limit=10`,
      { token: auth.token }
    );
    setClients(response.data || []);
    setMeta(response.meta || { total: 0, limit: 10 });
    setIsLoading(false);
  }, [auth.token, page, search]);

  const loadClientHistory = async (client) => {
    setSelectedClient(client);
    setPublicCardLink("");
    setIsHistoryLoading(true);
    try {
      const response = await apiRequest(`/clients/${client.id}/history`, { token: auth.token });
      setHistory(response.data || []);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function refreshClients() {
      try {
        await loadClients();
      } catch (error) {
        if (!cancelled) setStatus(error.message);
      }
    }

    refreshClients();
    return () => {
      cancelled = true;
    };
  }, [loadClients]);

  useEffect(() => {
    let cancelled = false;

    async function loadWalletDiagnostics() {
      try {
        const response = await apiRequest("/wallet/diagnostics", { token: auth.token });
        if (!cancelled) setWalletDiagnostics(response.data);
      } catch {
        if (!cancelled) setWalletDiagnostics(null);
      }
    }

    loadWalletDiagnostics();
    return () => {
      cancelled = true;
    };
  }, [auth.token]);

  const createClient = async (event) => {
    event.preventDefault();
    if (isBusy) return;
    setIsBusy(true);
    try {
      await apiRequest("/clients", { token: auth.token, method: "POST", body: form });
      setForm({ fullName: "", phone: "", email: "", consentMarketing: false });
      setStatus("Client ajoute");
      showToast("Client ajoute", "success");
      await loadClients();
    } catch (error) {
      setStatus(error.message);
      showToast(error.message, "error");
    } finally {
      setIsBusy(false);
    }
  };

  const addPoint = async (clientId, channel = "manual") => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const result = await apiRequest(`/clients/${clientId}/points`, {
        token: auth.token,
        method: "POST",
        body: { points: 1, channel, note: channel === "qr" ? "scan camera" : "dashboard" }
      });
      setStatus(result.data.message);
      showToast(result.data.message, "success");
      await loadClients();
      if (selectedClient?.id === clientId) {
        setSelectedClient(result.data.client);
        await loadClientHistory(result.data.client);
      }
    } catch (error) {
      setStatus(error.message);
      showToast(error.message, "error");
    } finally {
      setIsBusy(false);
    }
  };

  const parseQrPayload = useCallback((rawValue) => {
    const value = String(rawValue || "").trim();
    if (!value) {
      throw new Error("QR vide ou illisible");
    }

    const parts = value.split(":");
    if (parts.length < 2) {
      throw new Error("Format QR invalide. Attendu : commerce:client:points");
    }

    const [merchantFromQr, clientId] = parts;
    if (merchantId && merchantFromQr !== String(merchantId)) {
      throw new Error("Ce QR appartient a un autre commerce");
    }
    return { merchantFromQr, clientId };
  }, [merchantId]);

  const stopScan = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanOn(false);
  }, []);

  const handleQrPayload = useCallback(async (rawValue) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    try {
      const { clientId, merchantFromQr } = parseQrPayload(rawValue);
      setScanMessage(`QR detecte pour le client ${clientId}. Attribution en cours...`);
      await addPoint(clientId, "qr");
      setLastScan({
        merchantId: merchantFromQr,
        clientId,
        scannedAt: new Date().toISOString(),
        rawValue
      });
      setScanMessage(`Point ajoute avec succes pour le client ${clientId}.`);
      stopScan();
      setManualQrValue("");
    } catch (error) {
      setStatus(error.message);
      setScanMessage(error.message);
      showToast(error.message, "error");
    } finally {
      scanLockRef.current = false;
    }
  }, [addPoint, parseQrPayload, showToast, stopScan]);

  const deleteClient = async (client) => {
    const confirmation = window.prompt(`Tape SUPPRIMER pour confirmer la suppression RGPD de ${client.full_name}`);
    if (confirmation !== "SUPPRIMER") return;
    setIsBusy(true);
    try {
      await apiRequest(`/clients/${client.id}`, {
        token: auth.token,
        method: "DELETE"
      });
      showToast("Client supprime (RGPD)", "success");
      if (selectedClient?.id === client.id) {
        setSelectedClient(null);
        setHistory([]);
      }
      await loadClients();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsBusy(false);
    }
  };

  const buildPublicCardUrl = (cardToken) => {
    if (!cardToken) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/card?token=${encodeURIComponent(cardToken)}`;
  };

  const loadPublicCardLink = async (client) => {
    try {
      const response = await apiRequest(`/clients/${client.id}/card-token`, {
        token: auth.token,
        method: "POST"
      });
      const url = buildPublicCardUrl(response.data.token);
      setPublicCardLink(url);
      await navigator.clipboard.writeText(url);
      showToast("Lien carte copié (gratuit)", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleCsvFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setImportPreview(null);
    showToast("Fichier charge", "success");
  };

  const runImportPreview = async () => {
    if (!csvText.trim()) {
      showToast("Ajoute un fichier CSV", "error");
      return;
    }
    setImportBusy(true);
    try {
      const response = await apiRequest("/clients/import/preview", {
        token: auth.token,
        method: "POST",
        body: { csvText, hasHeader }
      });
      const data = response.data;
      setImportPreview(data);
      const cols = data.columns || [];
      const guessEmail = cols.find((col) => /mail/i.test(col)) || "__skip__";
      const guessPhone = cols.find((col) => /tel|phone|mobile/i.test(col)) || "__skip__";
      setImportMapping({
        fullName: cols[0] || "",
        email: guessEmail,
        phone: guessPhone,
        consentMarketing: "__skip__"
      });
      showToast(`Apercu: ${data.totalRows} lignes`, "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setImportBusy(false);
    }
  };

  const commitImport = async () => {
    if (!csvText.trim() || !importMapping.fullName) {
      showToast("Configure le mapping (nom obligatoire)", "error");
      return;
    }
    setImportBusy(true);
    try {
      const response = await apiRequest("/clients/import/commit", {
        token: auth.token,
        method: "POST",
        body: {
          csvText,
          hasHeader,
          mapping: {
            fullName: importMapping.fullName,
            email: importMapping.email === "__skip__" ? undefined : importMapping.email,
            phone: importMapping.phone === "__skip__" ? undefined : importMapping.phone,
            consentMarketing:
              importMapping.consentMarketing === "__skip__" ? undefined : importMapping.consentMarketing
          }
        }
      });
      showToast(`Import termine: ${response.data.inserted} lignes`, "success");
      setImportPreview(null);
      setCsvText("");
      await loadClients();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setImportBusy(false);
    }
  };

  const exportCsv = async () => {
    try {
      setIsExporting(true);
      const response = await fetch(`${API_BASE}/clients/export.csv`, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });
      if (!response.ok) {
        throw new Error("Export impossible");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "clients-export.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast("Export CSV genere", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsExporting(false);
    }
  };

  const startScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanOn(true);
        setScanMessage("Camera active. Place le QR dans le cadre pour attribuer 1 point.");
        showToast("Camera active. Presente le QR devant l'objectif.", "info");
      }
    } catch {
      setScanMessage("Camera indisponible. Utilise la saisie manuelle du QR.");
      showToast("Impossible d'acceder a la camera. Utilise la saisie manuelle ci-dessous.", "error");
    }
  };

  useEffect(() => {
    if (!scanOn) return undefined;

    let cancelled = false;

    async function scanLoop() {
      if (cancelled || !videoRef.current || scanLockRef.current) return;
      if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
        requestAnimationFrame(() => scanLoop().catch(() => null));
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(videoRef.current, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qr = jsQR(imgData.data, imgData.width, imgData.height);

      if (qr?.data) {
        await handleQrPayload(qr.data);
        return;
      }
      requestAnimationFrame(() => scanLoop().catch(() => null));
    }

    scanLoop().catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [handleQrPayload, scanOn]);

  return (
    <section className="stack">
      <article className="card">
        <div className="row spread wrap">
          <div>
            <h2>Clients</h2>
            <p className="muted">Ajoute un client, scanne sa carte puis ouvre sa fiche. Les outils avancés sont rangés plus bas.</p>
          </div>
          {status ? <span className="badge info-badge">{status}</span> : null}
        </div>
        <div className="grid clients-summary-grid">
          <article className="card inner stat">
            <h3>Total clients</h3>
            <strong>{meta.total || clients.length}</strong>
          </article>
          <article className="card inner stat">
            <h3>Points affichés</h3>
            <strong>{clients.reduce((sum, client) => sum + (client.points || 0), 0)}</strong>
          </article>
          <article className="card inner stat">
            <h3>Visites affichées</h3>
            <strong>{clients.reduce((sum, client) => sum + (client.visits || 0), 0)}</strong>
          </article>
        </div>
      </article>

      <section className="clients-primary-grid">
        <article className="card">
          <h2>Ajouter un client</h2>
          <form className="form" onSubmit={createClient}>
            <input
              placeholder="Nom complet"
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
              required
            />
            <div className="row wrap">
              <input
                className="grow"
                placeholder="Telephone"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
              <input
                className="grow"
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <label className="consent">
              <input
                type="checkbox"
                checked={form.consentMarketing}
                onChange={(event) => setForm((prev) => ({ ...prev, consentMarketing: event.target.checked }))}
              />
              Consentement marketing RGPD
            </label>
            <button type="submit" disabled={isBusy}>
              {isBusy ? "Traitement..." : "Ajouter client"}
            </button>
          </form>
        </article>

        <article className="card">
          <h2>Scanner une carte</h2>
          <p className="muted">Le commerçant scanne le QR pour ajouter automatiquement 1 point.</p>
          <div className="scanner-shell">
            <video ref={videoRef} className="scanner" />
            <div className="scanner-overlay" aria-hidden="true">
              <div className="scanner-frame"></div>
            </div>
          </div>
          <p className={`scan-status ${scanOn ? "live" : ""}`}>{scanMessage}</p>
          <div className="row">
            <button type="button" onClick={startScan} disabled={scanOn}>
              {scanOn ? "Scan en cours..." : "Scanner maintenant"}
            </button>
            <button type="button" className="secondary" onClick={stopScan}>
              Stop
            </button>
          </div>
          <div className="row">
            <input
              placeholder="Coller un QR texte"
              value={manualQrValue}
              onChange={(event) => setManualQrValue(event.target.value)}
            />
            <button type="button" className="secondary" onClick={() => handleQrPayload(manualQrValue)}>
              Valider
            </button>
          </div>
          {lastScan ? (
            <div className="scan-result">
              <strong>Dernier scan valide</strong>
              <p>
                Commerce {lastScan.merchantId} · Client {lastScan.clientId}
              </p>
              <p>{new Date(lastScan.scannedAt).toLocaleString("fr-FR")}</p>
            </div>
          ) : null}
        </article>
      </section>

      <article className="card">
        <div className="row spread wrap">
          <h2>Liste des clients</h2>
          <div className="row wrap">
            <input placeholder="Rechercher..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <button type="button" className="secondary" onClick={exportCsv} disabled={isExporting}>
              {isExporting ? "Export..." : "Exporter CSV"}
            </button>
          </div>
        </div>
        {isLoading ? <div className="skeleton">Chargement des clients...</div> : null}
        <div className="table client-list-simple">
          {clients.map((client) => (
            <button type="button" className="client-row-card" key={client.id} onClick={() => loadClientHistory(client)}>
              <div className="client-row-main">
                <strong>{client.full_name}</strong>
                <p>{client.email || client.phone || "Aucun contact"}</p>
              </div>
              <div className="client-row-meta">
                <span>{client.points} pts</span>
                <span>{client.visits || 0} visites</span>
              </div>
            </button>
          ))}
        </div>
        <div className="row spread wrap">
          <p className="muted">
            Page {page}/{totalPages}
          </p>
          <div className="row">
            <button type="button" className="secondary" onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
              Prev
            </button>
            <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
              Next
            </button>
          </div>
        </div>
      </article>

      <article className="card">
        <h2>Fiche client</h2>
        {!selectedClient ? (
          <p className="muted">Choisis un client dans la liste pour voir ses actions utiles.</p>
        ) : (
          <>
            <div className="detail-header">
              <div>
                <strong>{selectedClient.full_name}</strong>
                <p>{selectedClient.email || selectedClient.phone || "Aucun contact"}</p>
                <p>
                  {selectedClient.points || 0} points · {selectedClient.visits || 0} visites
                </p>
              </div>
              <button type="button" className="danger" disabled={isBusy} onClick={() => deleteClient(selectedClient)}>
                Supprimer
              </button>
            </div>

            <div className="row wrap">
              <button type="button" onClick={() => addPoint(selectedClient.id)}>
                +1 point
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => copyText(qrPayloadForClient(selectedClient), "Texte QR copie")}
              >
                Copier QR
              </button>
              <button type="button" className="secondary" onClick={() => loadPublicCardLink(selectedClient)}>
                Copier lien carte
              </button>
              <button
                type="button"
                className="secondary"
                disabled={!walletDiagnostics?.appleWallet?.ready}
                onClick={() => openApplePass(auth.token, selectedClient.id)}
              >
                {walletDiagnostics?.appleWallet?.ready ? "Apple Wallet" : "Apple Wallet indisponible"}
              </button>
            </div>

            {publicCardLink ? <p className="muted mono">{publicCardLink}</p> : null}

            {isHistoryLoading ? <div className="skeleton">Chargement historique...</div> : null}
            <div className="timeline">
              {history.slice(0, 8).map((entry) => (
                <div className="timeline-item" key={entry.id}>
                  <strong>+{entry.points_added} pts</strong>
                  <p>
                    canal: {entry.channel} · {new Date(entry.created_at).toLocaleString("fr-FR")}
                  </p>
                  {entry.reward_unlocked ? <span className="badge">Recompense debloquee</span> : null}
                </div>
              ))}
              {history.length === 0 && !isHistoryLoading ? <p>Aucun evenement pour ce client.</p> : null}
            </div>
          </>
        )}
      </article>

      <details className="card advanced-tools">
        <summary>Outils avancés</summary>
        <div className="stack advanced-tools-body">
          <article className="card inner">
            <h3>Import CSV</h3>
            <p className="muted">Colonnes detectees automatiquement. Nom + email ou telephone obligatoires par ligne.</p>
            <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} />
            <label className="consent">
              <input type="checkbox" checked={hasHeader} onChange={(event) => setHasHeader(event.target.checked)} />
              La premiere ligne contient les en-tetes
            </label>
            <div className="row">
              <button type="button" className="secondary" disabled={importBusy} onClick={runImportPreview}>
                Previsualiser
              </button>
              <button type="button" disabled={importBusy || !importPreview} onClick={commitImport}>
                Importer
              </button>
            </div>
            {importPreview && importPreview.columns?.length ? (
              <div className="import-mapping">
                <div className="row wrap">
                  <label>
                    Nom
                    <select
                      value={importMapping.fullName}
                      onChange={(event) => setImportMapping((prev) => ({ ...prev, fullName: event.target.value }))}
                    >
                      {importPreview.columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Email
                    <select
                      value={importMapping.email}
                      onChange={(event) => setImportMapping((prev) => ({ ...prev, email: event.target.value }))}
                    >
                      <option value="__skip__">Ignorer</option>
                      {importPreview.columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Telephone
                    <select
                      value={importMapping.phone}
                      onChange={(event) => setImportMapping((prev) => ({ ...prev, phone: event.target.value }))}
                    >
                      <option value="__skip__">Ignorer</option>
                      {importPreview.columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Consentement marketing
                    <select
                      value={importMapping.consentMarketing}
                      onChange={(event) =>
                        setImportMapping((prev) => ({ ...prev, consentMarketing: event.target.value }))
                      }
                    >
                      <option value="__skip__">Ignorer</option>
                      {importPreview.columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="muted">{importPreview.totalRows} lignes au total · apercu:</p>
                <div className="table compact">
                  {importPreview.previewRows.slice(0, 5).map((row, index) => (
                    <div className="row item" key={`preview-${index}`}>
                      <span>{typeof row === "object" ? JSON.stringify(row) : row.join(", ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : importPreview ? (
              <p className="muted">Impossible de detecter les colonnes. Verifie le separateur ou les en-tetes.</p>
            ) : null}
          </article>

          <article className="card inner">
            <h3>FidélioGen / QR technique</h3>
            <p className="muted">
              Pour le générateur, colle l'ID commerce et l'ID client pour produire un QR compatible caisse.
            </p>
            {merchantId ? (
              <div className="row wrap align-start">
                <label className="grow">
                  ID commerce
                  <input readOnly value={merchantId} className="mono" />
                </label>
                <button
                  type="button"
                  className="secondary self-end"
                  onClick={() => copyText(merchantId, "ID commerce copie")}
                >
                  Copier commerce
                </button>
              </div>
            ) : (
              <p className="muted">Reconnecte-toi pour afficher ton ID commerce.</p>
            )}
          </article>
        </div>
      </details>
    </section>
  );
}
