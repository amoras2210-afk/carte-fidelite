import { Navigate, Route, Routes } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "./components/DashboardLayout";
import { AuthPage } from "./pages/AuthPage";
import { LandingPage } from "./pages/LandingPage";
import { BillingRequiredPage } from "./pages/BillingRequiredPage";
import { PublicCardPage } from "./pages/PublicCardPage";
import { OverviewPage } from "./pages/OverviewPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ClientsPage } from "./pages/ClientsPage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { WalletPage } from "./pages/WalletPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ToastProvider } from "./components/ToastContext";
import { useToast } from "./components/ToastContext";
import { getBillingStatus } from "./lib/api";

function BillingLoadingScreen() {
  return (
    <div className="auth-shell">
      <article className="card auth-panel">
        <p className="muted">Vérification de l'abonnement...</p>
      </article>
    </div>
  );
}

function MerchantApp({ auth }) {
  const { showToast } = useToast();
  const [billing, setBilling] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const refreshBilling = useCallback(async () => {
    if (!auth.token) return;
    setBillingLoading(true);
    try {
      const response = await getBillingStatus(auth.token);
      setBilling(response.data);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBillingLoading(false);
    }
  }, [auth.token, showToast]);

  useEffect(() => {
    if (!auth.token) return;
    queueMicrotask(() => {
      refreshBilling();
    });
  }, [auth.token, refreshBilling]);

  if (!auth.token) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/accueil" element={<LandingPage />} />
        <Route path="/connexion" element={<AuthPage auth={auth} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  const isActive = billing?.subscriptionStatus === "active" || billing?.subscriptionStatus === "trialing";

  if (billingLoading && !billing) {
    return (
      <Routes>
        <Route path="/accueil" element={<LandingPage />} />
        <Route path="/connexion" element={<AuthPage auth={auth} />} />
        <Route path="*" element={<BillingLoadingScreen />} />
      </Routes>
    );
  }

  if (!isActive) {
    return (
      <Routes>
        <Route path="/accueil" element={<LandingPage />} />
        <Route path="/connexion" element={<AuthPage auth={auth} />} />
        <Route
          path="/abonnement"
          element={<BillingRequiredPage auth={auth} billing={billing} onRefresh={refreshBilling} showToast={showToast} />}
        />
        <Route path="/" element={<Navigate to="/abonnement" replace />} />
        <Route path="*" element={<Navigate to="/abonnement" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/accueil" element={<LandingPage />} />
      <Route path="/connexion" element={<Navigate to="/" replace />} />
      <Route path="/abonnement" element={<Navigate to="/" replace />} />
      <Route element={<DashboardLayout auth={auth} />}>
        <Route path="/" element={<OverviewPage auth={auth} />} />
        <Route path="/analytics" element={<AnalyticsPage auth={auth} />} />
        <Route path="/clients" element={<ClientsPage auth={auth} />} />
        <Route path="/campaigns" element={<CampaignsPage auth={auth} />} />
        <Route path="/wallet" element={<WalletPage auth={auth} />} />
        <Route path="/settings" element={<SettingsPage auth={auth} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("merchantToken") || "");

  const auth = useMemo(
    () => ({
      token,
      setToken: (nextToken) => {
        setToken(nextToken);
        if (nextToken) localStorage.setItem("merchantToken", nextToken);
        else localStorage.removeItem("merchantToken");
      }
    }),
    [token]
  );

  return (
    <ToastProvider>
      <Routes>
        <Route path="/card" element={<PublicCardPage />} />
        <Route path="/card/:token" element={<PublicCardPage />} />
        <Route path="/*" element={<MerchantApp auth={auth} />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
