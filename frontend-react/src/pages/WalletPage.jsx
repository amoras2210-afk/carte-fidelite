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
        <h2>Wallet commerçant</h2>
        <p className="muted">
          Cette page centralise le vrai parcours Wallet. Le générateur visuel sert au design et au QR, mais l'ajout au
          Wallet se fait ici car il faut un pass signé côté serveur.
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
        <h2>Parcours recommande</h2>
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
        <div className="row wrap">
          <Link to="/clients">Ouvrir les fiches clients</Link>
          <span className="muted">C'est depuis cette page que tu ajoutes ensuite la carte a Apple Wallet.</span>
        </div>
      </article>

      <article className="card">
        <h2>Diagnostic Google Wallet</h2>
        <p className="muted">
          Ce test renvoie le payload brut pour un client. Utile pour valider la structure avant une vraie integration
          Google Wallet.
        </p>
        <div className="row">
          <input
            value={googleClientId}
            onChange={(event) => setGoogleClientId(event.target.value)}
            placeholder="ID client"
          />
          <button type="button" onClick={loadGooglePayload} disabled={isLoadingGoogle}>
            {isLoadingGoogle ? "Chargement..." : "Charger"}
          </button>
        </div>
        {googlePayload ? <pre>{googlePayload}</pre> : <p className="muted">Aucun payload charge pour le moment.</p>}
      </article>

      <article className="card">
        <h2>Suites prevues</h2>
        <div className="stack">
          <p className="muted">
            <strong>Scan caisse :</strong> la base existe deja via l'API d'ajout de points. La prochaine etape est un
            vrai flux de scan QR cote commerçant.
          </p>
          <p className="muted">
            <strong>Notifications :</strong> on recommande de commencer par les campagnes email avant un vrai push web,
            plus lourd a mettre en place.
          </p>
        </div>
      </article>
    </section>
  );
}
