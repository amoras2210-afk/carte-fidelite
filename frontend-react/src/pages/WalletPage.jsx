import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { useToast } from "../components/ToastContext";

export function WalletPage({ auth }) {
  const [diagnostics, setDiagnostics] = useState(null);
  const [googleClientId, setGoogleClientId] = useState("");
  const [googlePayload, setGooglePayload] = useState("");
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;

    async function loadDiagnostics() {
      try {
        const response = await apiRequest("/wallet/diagnostics", { token: auth.token });
        if (!cancelled) setDiagnostics(response.data);
      } catch (error) {
        if (!cancelled) showToast(error.message, "error");
      }
    }

    loadDiagnostics();
    return () => {
      cancelled = true;
    };
  }, [auth.token, showToast]);

  const loadGooglePayload = async () => {
    if (!googleClientId.trim()) {
      showToast("Indique un ID client", "error");
      return;
    }
    try {
      setIsLoadingGoogle(true);
      const response = await apiRequest(`/wallet/google/${googleClientId}`, { token: auth.token });
      setGooglePayload(JSON.stringify(response.data, null, 2));
      showToast("Payload Google chargé", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  return (
    <section className="stack wallet-page">
      <article className="card">
        <h2 className="section-heading">État des passes</h2>
        <p className="muted">
          Les fichiers sont signés côté serveur. Configure les certificats Apple pour la prod ; Google Wallet peut rester
          en gabarit tant que la signature finale n’est pas branchée.
        </p>
        {diagnostics ? (
          <div className="wallet-grid wallet-grid-spaced">
            <section className="wallet-panel">
              <div className="wallet-panel-head">
                <h3>Apple Wallet</h3>
                <span className={`wallet-state ${diagnostics.appleWallet.ready ? "ok" : "warn"}`}>
                  {diagnostics.appleWallet.ready ? "Prêt" : "À configurer"}
                </span>
              </div>
              <p>{diagnostics.appleWallet.message}</p>
              <ul className="wallet-checklist">
                {diagnostics.appleWallet.files.map((file) => (
                  <li key={file.key}>
                    <strong>{file.label} :</strong>{" "}
                    {file.configured
                      ? file.exists
                        ? "fichier détecté"
                        : "chemin défini mais fichier absent"
                      : "non configuré"}
                  </li>
                ))}
                <li>
                  <strong>Pass Type ID :</strong> {diagnostics.appleWallet.passTypeIdentifier || "non configuré"}
                </li>
                <li>
                  <strong>Team ID :</strong> {diagnostics.appleWallet.teamIdentifier || "non configuré"}
                </li>
              </ul>
              {diagnostics.appleWallet.missingItems.length ? (
                <p className="muted">À compléter pour la prod : {diagnostics.appleWallet.missingItems.join(", ")}.</p>
              ) : (
                <p className="muted">Tu peux utiliser le bouton Apple Pass depuis une fiche client.</p>
              )}
            </section>

            <section className="wallet-panel">
              <div className="wallet-panel-head">
                <h3>Google Wallet</h3>
                <span className={`wallet-state ${diagnostics.googleWallet.configured ? "ok" : "soft"}`}>
                  {diagnostics.googleWallet.configured ? "Intégration" : "Gabarit"}
                </span>
              </div>
              <p>{diagnostics.googleWallet.message}</p>
              <ul className="wallet-checklist">
                <li>
                  <strong>Issuer ID :</strong> {diagnostics.googleWallet.issuerId}
                </li>
                <li>
                  <strong>Class suffix :</strong> {diagnostics.googleWallet.classSuffix}
                </li>
                <li>
                  <strong>Mode :</strong> {diagnostics.googleWallet.mode}
                </li>
              </ul>
              <p className="muted">
                Utile surtout comme diagnostic tant que la signature Google Wallet n’est pas finalisée.
              </p>
            </section>
          </div>
        ) : (
          <p className="muted">Chargement…</p>
        )}
      </article>

      <article className="card">
        <h2 className="section-heading">Guide rapide</h2>
        <div className="stack wallet-guide-stack">
          <div className="soft-note">
            <strong>1. Client</strong> — Crée ou ouvre une fiche sur la page{" "}
            <Link to="/clients">Clients</Link>. Le bouton <code>Apple Pass</code> s’y trouve.
          </div>
          <div className="soft-note">
            <strong>2. Design</strong> — Utilise le générateur visuel uniquement pour le rendu ; le fichier HTML produit un
            visuel + QR, pas un pass signé.
          </div>
          <div className="soft-note">
            <strong>3. Points</strong> — Le QR doit être scanné par la caisse ou ton interface commerçant, pas en
            auto-scan côté client.
          </div>
        </div>
        <div className="row wrap align-start wallet-guide-cta">
          <Link className="link-btn" to="/clients">
            Ouvrir les clients
          </Link>
          <span className="muted">Ajoute Apple Wallet depuis la fiche du client.</span>
        </div>
      </article>

      <details className="card advanced-details wallet-advanced">
        <summary>Outils avancés — diagnostic Google Wallet</summary>
        <p className="muted">Payload JSON brut pour un client (usage technique).</p>
        <div className="row wrap">
          <input
            value={googleClientId}
            onChange={(event) => setGoogleClientId(event.target.value)}
            placeholder="ID client"
          />
          <button type="button" onClick={loadGooglePayload} disabled={isLoadingGoogle}>
            {isLoadingGoogle ? "Chargement…" : "Charger"}
          </button>
        </div>
        {googlePayload ? <pre>{googlePayload}</pre> : <p className="muted">Aucun payload chargé.</p>}
      </details>
    </section>
  );
}
