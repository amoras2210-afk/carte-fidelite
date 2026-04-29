import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { useToast } from "../components/ToastContext";
import { resolveCardDesign } from "../lib/cardDesign";

function buildQrImageUrl(payload) {
  const size = 240;
  return (
    "https://api.qrserver.com/v1/create-qr-code/?" +
    `size=${size}x${size}&margin=3&data=${encodeURIComponent(payload)}`
  );
}

export function PublicCardPage() {
  const [params] = useSearchParams();
  const tokenFromParams = params.get("token") || "";
  const token = useMemo(() => {
    if (tokenFromParams) return tokenFromParams;
    if (typeof window === "undefined") return "";
    // Fallback iOS/shortcuts: parfois le token est perdu.
    return localStorage.getItem("publicCardToken") || "";
  }, [tokenFromParams]);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (tokenFromParams) localStorage.setItem("publicCardToken", tokenFromParams);
  }, [tokenFromParams]);

  useEffect(() => {
    // Important for iOS/Android home-screen shortcuts:
    // for client card pages we prefer preserving the exact URL (?token=...),
    // instead of the global app manifest start_url.
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) return undefined;
    const previousHref = manifestLink.getAttribute("href");
    manifestLink.removeAttribute("href");
    return () => {
      if (previousHref) manifestLink.setAttribute("href", previousHref);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousTitle = document.title;
    const merchantName = data?.merchant?.businessName;
    document.title = merchantName ? `${merchantName} - Carte fidelite` : "Carte fidelite";
    return () => {
      document.title = previousTitle;
    };
  }, [data?.merchant?.businessName]);

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

  const cardDesign = resolveCardDesign(data?.merchant?.cardDesign);
  const rewardThreshold = Number(data?.merchant?.rewardThreshold || 10);
  const currentPoints = Number(data?.client?.points || 0);
  const progressRatio = Math.max(0, Math.min(1, currentPoints / rewardThreshold));
  const progressPercent = Math.round(progressRatio * 100);
  const stamps = Array.from({ length: rewardThreshold }, (_, index) => index < currentPoints);
  const cardVars = {
    "--card-bg": cardDesign.bgColor,
    "--card-bg2": cardDesign.bg2Color,
    "--card-accent": cardDesign.accentColor,
    "--card-accent2": cardDesign.accent2Color,
    "--card-text": cardDesign.textColor,
    "--card-text-muted": cardDesign.textMutedColor,
    "--card-stamp": cardDesign.stampColor
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
        className={`public-card public-card-${cardDesign.style}`}
        style={cardVars}
      >
        {isLoading ? <p>Chargement...</p> : null}
        {!isLoading && data ? (
          <>
            <div className="public-card-glow" aria-hidden="true" />
            <div className="public-card-noise" aria-hidden="true" />
            <div className="public-hero premium">
              <div className="public-brand-lockup">
                <span className="public-chip">FIDELITE</span>
                <h1 className="public-title">{data.merchant.businessName}</h1>
                <p className="public-subtitle">{cardDesign.tagline || "Carte client digitale"}</p>
              </div>
              <div className="public-logo-wrap">
                {cardDesign.logoUrl ? (
                  <img className="public-logo" src={cardDesign.logoUrl} alt={data.merchant.businessName} />
                ) : (
                  <span className="public-logo-fallback">{data.merchant.businessName.slice(0, 1)}</span>
                )}
              </div>
            </div>

            <div className="public-card-main">
              <div className="public-copy-column">
                <div className="public-client-block">
                  <p className="public-label">Titulaire</p>
                  <strong>{data.client.fullName}</strong>
                  <p className="public-meta">
                    {data.client.points} points · {data.client.visits} visites
                  </p>
                </div>

                <div className="public-progress-card">
                  <div className="row spread">
                    <span className="public-label">Progression</span>
                    <strong>{progressPercent}%</strong>
                  </div>
                  <div className="public-progress-track">
                    <span className="public-progress-fill" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="public-meta">
                    {currentPoints} / {rewardThreshold} {rewardThreshold > 1 ? "points" : "point"} pour {data.merchant.rewardLabel}
                  </p>
                </div>

                <div className="public-stamps">
                  {stamps.map((filled, index) => (
                    <span key={`stamp-${index}`} className={`public-stamp ${filled ? "filled" : ""}`}>
                      {filled ? "★" : " "}
                    </span>
                  ))}
                </div>

                <div className="public-reward-note">
                  <strong>Recompense</strong>
                  <p>{data.merchant.rewardLabel}</p>
                </div>
              </div>

              <div className="public-qr-panel">
                <div className="public-qr">
                  <img src={buildQrImageUrl(data.qrPayload)} alt="QR caisse" width="220" height="220" />
                  <p className="public-qr-caption">A presenter au commercant a chaque passage.</p>
                </div>
              </div>
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

