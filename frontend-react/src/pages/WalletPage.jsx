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
      showToast("Renseigne un ID client", "error");
      return;
    }
    try {
      setIsLoadingGoogle(true);
      const response = await apiRequest(`/wallet/google/${googleClientId}`, { token: auth.token });
      setGooglePayload(JSON.stringify(response.data, null, 2));
      showToast("Payload Google charge", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  return (
    <section className="stack">
      <article className="card">
        <h2>État Wallet</h2>
        <p className="muted">
          Les passes sont signés côté serveur. Configure les certificats pour Apple ; Google Wallet peut fonctionner en
          mode gabarit tant que la prod n’est pas branchée.
        </p>
        {diagnostics ? (
          <div className="wallet-grid">
            <section className="wallet-panel">
              <div className="wallet-panel-head">
                <h3>Apple Wallet</h3>
                <span className={`wallet-state ${diagnostics.appleWallet.ready ? "ok" : "warn"}`}>
                  {diagnostics.appleWallet.ready ? "Pret" : "Configuration requise"}
                </span>
              </div>
              <p>{diagnostics.appleWallet.message}</p>
              <ul className="wallet-checklist">
                {diagnostics.appleWallet.files.map((file) => (
                  <li key={file.key}>
                    <strong>{file.label} :</strong>{" "}
                    {file.configured ? (file.exists ? "fichier detecte" : "chemin configure mais fichier absent") : "non configure"}
                  </li>
                ))}
                <li>
                  <strong>Pass Type ID :</strong> {diagnostics.appleWallet.passTypeIdentifier || "non configure"}
                </li>
                <li>
                  <strong>Team ID :</strong> {diagnostics.appleWallet.teamIdentifier || "non configure"}
                </li>
              </ul>
              {diagnostics.appleWallet.missingItems.length ? (
                <p className="muted">
                  A completer pour la prod : {diagnostics.appleWallet.missingItems.join(", ")}.
                </p>
              ) : (
                <p className="muted">Le bouton Apple Pass dans la fiche client peut etre utilise des maintenant.</p>
              )}
            </section>

            <section className="wallet-panel">
              <div className="wallet-panel-head">
                <h3>Google Wallet</h3>
                <span className={`wallet-state ${diagnostics.googleWallet.configured ? "ok" : "soft"}`}>
                  {diagnostics.googleWallet.configured ? "Mode integration" : "Mode gabarit"}
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
                Tant que la signature finale Google n'est pas branchee, ce bloc sert surtout de diagnostic et de base
                pour la suite.
              </p>
            </section>
          </div>
        ) : (
          <p>Chargement...</p>
        )}
      </article>

      <article className="card">
        <h2>Guide rapide</h2>
        <div className="stack">
          <div className="soft-note">
            <strong>1. Creer ou ouvrir un client.</strong> Depuis la page <Link to="/clients">Clients</Link>, chaque
            fiche client contient deja le bouton <code>Apple Pass</code>.
          </div>
          <div className="soft-note">
            <strong>2. Utiliser le generateur visuel uniquement pour le design.</strong> Le fichier <code>index.html</code>{" "}
            produit une carte visuelle et un QR, mais pas un pass Wallet signe.
          </div>
          <div className="soft-note">
            <strong>3. Scanner cote commerçant.</strong> Les points ne doivent pas monter par auto-scan client. Le QR doit
            etre lu par la caisse ou par l'interface commerçant.
          </div>
        </div>
        <div className="row wrap align-start">
          <Link className="link-btn" to="/clients">
            Ouvrir les fiches clients
          </Link>
          <span className="muted">Ajoute la carte Apple Wallet depuis une fiche client.</span>
        </div>
      </article>

      <details className="card advanced-details">
        <summary>Outils avancés — diagnostic Google Wallet</summary>
        <p className="muted">
          Payload JSON brut pour un client (intégration technique).
        </p>
        <div className="row wrap">
          <input
            value={googleClientId}
            onChange={(event) => setGoogleClientId(event.target.value)}
            placeholder="ID client"
          />
          <button type="button" onClick={loadGooglePayload} disabled={isLoadingGoogle}>
            {isLoadingGoogle ? "Chargement..." : "Charger"}
          </button>
        </div>
        {googlePayload ? <pre>{googlePayload}</pre> : <p className="muted">Aucun payload chargé.</p>}
      </details>
    </section>
  );
}
