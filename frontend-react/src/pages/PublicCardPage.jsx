import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { useToast } from "../components/ToastContext";

function buildQrImageUrl(payload) {
  const size = 240;
  return (
    "https://api.qrserver.com/v1/create-qr-code/?" +
    `size=${size}x${size}&margin=3&data=${encodeURIComponent(payload)}`
  );
}

export function PublicCardPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const cardUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.pathname = "/card";
    url.searchParams.set("token", token);
    return url.toString();
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        const response = await apiRequest(`/public/card?token=${encodeURIComponent(token)}`);
        if (!cancelled) setData(response.data);
      } catch (error) {
        if (!cancelled) showToast(error.message, "error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    if (!token) {
      setIsLoading(false);
      setData(null);
      return undefined;
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [showToast, token]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(cardUrl);
      showToast("Lien de carte copié", "success");
    } catch {
      showToast("Copie impossible", "error");
    }
  };

  if (!token) {
    return (
      <main className="public-shell">
        <section className="public-card">
          <h1>Carte de fidelite</h1>
          <p className="muted">Lien invalide : token manquant.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="public-shell">
      <header className="public-top">
        <div className="public-brand">
          <strong>{data?.merchant?.businessName || "Loyalty Pro"}</strong>
          <span className="muted">Carte fidelite</span>
        </div>
        <div className="row">
          <button type="button" className="secondary" onClick={copyLink} disabled={!cardUrl}>
            Copier le lien
          </button>
        </div>
      </header>

      <section
        className="public-card"
        style={{
          borderColor: data?.merchant?.brandColor ? "rgba(0,0,0,0)" : undefined
        }}
      >
        {isLoading ? <p>Chargement...</p> : null}
        {!isLoading && data ? (
          <>
            <div className="public-hero">
              <div>
                <h1 className="public-title">{data.client.fullName}</h1>
                <p className="muted">
                  {data.client.points} points · Seuil {data.merchant.rewardThreshold}
                </p>
              </div>
              <span className="public-pill">Gratuit (PWA)</span>
            </div>

            <div className="public-qr">
              <img src={buildQrImageUrl(data.qrPayload)} alt="QR caisse" width="240" height="240" />
              <p className="muted">A presenter au commerçant a chaque passage.</p>
            </div>

            <div className="public-actions">
              <div className="soft-note">
                <strong>Ajouter sur l'ecran d'accueil</strong>
                <p className="muted">
                  iPhone : bouton Partager puis <em>Sur l'ecran d'accueil</em>.<br />
                  Android : menu du navigateur puis <em>Ajouter a l'ecran d'accueil</em>.
                </p>
              </div>
            </div>
          </>
        ) : null}

        {!isLoading && !data ? <p className="muted">Carte indisponible.</p> : null}
      </section>

      <footer className="public-foot muted">
        Cette carte web remplace Apple Wallet en mode gratuit.
      </footer>
    </main>
  );
}

