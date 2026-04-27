import { useEffect, useMemo, useRef, useState } from "react";
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

  const loadClients = async () => {
    setIsLoading(true);
    const response = await apiRequest(
      `/clients?search=${encodeURIComponent(search)}&page=${page}&limit=10`,
      { token: auth.token }
    );
    setClients(response.data || []);
    setMeta(response.meta || { total: 0, limit: 10 });
    setIsLoading(false);
  };

  const loadClientHistory = async (client) => {
    setSelectedClient(client);
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
    loadClients().catch((error) => setStatus(error.message));
  }, [search, page]);

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
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    mediaStreamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScanOn(true);
    }
  };

  const stopScan = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanOn(false);
  };

  const scanFrame = async () => {
    if (!scanOn || !videoRef.current || !window.jsQR) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(videoRef.current, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = window.jsQR(imgData.data, imgData.width, imgData.height);
    if (qr?.data) {
      const parts = qr.data.split(":");
      const clientId = parts[1] || qr.data;
      await addPoint(clientId, "qr");
      stopScan();
      return;
    }
    requestAnimationFrame(() => scanFrame().catch(() => null));
  };

  useEffect(() => {
    if (scanOn) scanFrame().catch(() => null);
  }, [scanOn]);

  return (
    <section className="stack">
      <article className="card">
        <h2>Import CSV</h2>
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

      <article className="card">
        <h2>Carte visuelle / QR (FidelioGen)</h2>
        <p className="muted">
          Pour lier ta carte au scan caisse : dans le générateur, colle <strong>ID commerce</strong> et{" "}
          <strong>ID client</strong> ci-dessous (format scan : commerce:client:points).
        </p>
        {merchantId ? (
          <div className="row wrap align-start">
            <label className="grow">
              ID commerce
              <input readOnly value={merchantId} className="mono" />
            </label>
            <button type="button" className="secondary self-end" onClick={() => copyText(merchantId, "ID commerce copie")}>
              Copier commerce
            </button>
          </div>
        ) : (
          <p className="muted">Reconnecte-toi pour afficher ton ID commerce.</p>
        )}
      </article>

      <article className="card">
        <h2>Nouveau client</h2>
        <form className="form" onSubmit={createClient}>
          <input
            placeholder="Nom complet"
            value={form.fullName}
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            required
          />
          <input
            placeholder="Telephone"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
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
        <h2>Attribution points (QR)</h2>
        <video ref={videoRef} className="scanner" />
        <div className="row">
          <button type="button" onClick={startScan}>
            Demarrer scan
          </button>
          <button type="button" className="secondary" onClick={stopScan}>
            Stop
          </button>
        </div>
      </article>

      <article className="card">
        <div className="row">
          <h2>Clients</h2>
          <input placeholder="Rechercher..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <button type="button" className="secondary" onClick={exportCsv} disabled={isExporting}>
            {isExporting ? "Export..." : "Exporter CSV"}
          </button>
        </div>
        {isLoading ? <div className="skeleton">Chargement des clients...</div> : null}
        <div className="table">
          {clients.map((client) => (
            <div className="row item" key={client.id}>
              <div>
                <strong>{client.full_name}</strong>
                <p>
                  {client.email || client.phone || "-"} · {client.visits || 0} visites · {client.points} pts ·{" "}
                  {client.reward_state.rewardsEarned} rewards
                </p>
              </div>
              <div className="row">
                <button
                  type="button"
                  className="secondary"
                  disabled={!qrPayloadForClient(client)}
                  title="Copie commerce:client:points pour QR FidelioGen"
                  onClick={() => copyText(qrPayloadForClient(client), "Texte QR copie")}
                >
                  Copier QR
                </button>
                <button type="button" className="secondary" onClick={() => loadClientHistory(client)}>
                  Detail
                </button>
                <button type="button" onClick={() => addPoint(client.id)}>
                  +1
                </button>
                <button type="button" className="secondary" onClick={() => openApplePass(auth.token, client.id)}>
                  Apple Pass
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="row">
          <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
            Prev
          </button>
          <p>
            Page {page}/{totalPages}
          </p>
          <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
            Next
          </button>
        </div>
      </article>
      <article className="card">
        <h2>Fiche client</h2>
        {!selectedClient ? (
          <p>Selectionne un client pour voir son historique.</p>
        ) : (
          <>
            <div className="detail-header">
              <div>
                <strong>{selectedClient.full_name}</strong>
                <p>{selectedClient.email || selectedClient.phone || "Aucun contact"}</p>
                <p>{selectedClient.visits || 0} visites · {selectedClient.points || 0} points</p>
                {merchantId ? (
                  <div className="muted mono small row wrap detail-client-ids">
                    <span>ID client : {selectedClient.id}</span>
                    <button
                      type="button"
                      className="secondary tiny-inline"
                      onClick={() => copyText(selectedClient.id, "ID client copie")}
                    >
                      Copier ID
                    </button>
                  </div>
                ) : null}
              </div>
              <button type="button" className="danger" disabled={isBusy} onClick={() => deleteClient(selectedClient)}>
                Supprimer (RGPD)
              </button>
            </div>
            {isHistoryLoading ? <div className="skeleton">Chargement historique...</div> : null}
            <div className="timeline">
              {history.map((entry) => (
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
      <p>{status}</p>
    </section>
  );
}
