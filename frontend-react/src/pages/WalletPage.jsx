import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { useToast } from "../components/ToastContext";

export function WalletPage({ auth }) {
  const [diagnostics, setDiagnostics] = useState(null);
  const [googleClientId, setGoogleClientId] = useState("");
  const [googlePayload, setGooglePayload] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    apiRequest("/wallet/diagnostics", { token: auth.token })
      .then((response) => setDiagnostics(response.data))
      .catch((error) => showToast(error.message, "error"));
  }, []);

  const loadGooglePayload = async () => {
    try {
      const response = await apiRequest(`/wallet/google/${googleClientId}`, { token: auth.token });
      setGooglePayload(JSON.stringify(response.data, null, 2));
      showToast("Payload Google charge", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  return (
    <section className="stack">
      <article className="card">
        <h2>Wallet diagnostics</h2>
        {diagnostics ? (
          <>
            <p>Apple config: {diagnostics.appleWallet.configured ? "OK" : "Missing certificates"}</p>
            <p>Google config: {diagnostics.googleWallet.mode}</p>
          </>
        ) : (
          <p>Chargement...</p>
        )}
      </article>
      <article className="card">
        <h2>Google payload preview</h2>
        <div className="row">
          <input
            value={googleClientId}
            onChange={(event) => setGoogleClientId(event.target.value)}
            placeholder="Client ID"
          />
          <button type="button" onClick={loadGooglePayload}>
            Charger
          </button>
        </div>
        <pre>{googlePayload}</pre>
      </article>
    </section>
  );
}
