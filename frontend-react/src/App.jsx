import { Navigate, Route, Routes } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MerchantBillingContext } from "./context/MerchantBillingContext.jsx";
import { DashboardLayout } from "./components/DashboardLayout";
import { AuthPage } from "./pages/AuthPage";
import { LandingPage } from "./pages/LandingPage";
import { BillingStripeReturn } from "./pages/BillingStripeReturn";
import { PublicCardPage } from "./pages/PublicCardPage";
import { OverviewPage } from "./pages/OverviewPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ClientsPage } from "./pages/ClientsPage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { WalletPage } from "./pages/WalletPage";
import { GeneratorAccessPage } from "./pages/GeneratorAccessPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ToastProvider } from "./components/ToastContext";
import { useToast } from "./components/ToastContext";
import { getBillingStatus } from "./lib/api";

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
    if (!auth.token) {
      setBilling(null);
      setBillingLoading(false);
      return;
    }
    setBillingLoading(true);
    queueMicrotask(() => {
      refreshBilling();
    });
  }, [auth.token, refreshBilling]);

  const landingProps = {
    auth,
    billing: auth.token ? billing : null,
    billingLoading: Boolean(auth.token && billingLoading),
    onBillingRefresh: refreshBilling
  };

  const subscriptionActive =
    billing?.subscriptionStatus === "active" || billing?.subscriptionStatus === "trialing";

  const merchantBillingValue = useMemo(
    () => ({
      billing,
      billingLoading,
      refreshBilling,
      subscriptionActive
    }),
    [billing, billingLoading, refreshBilling, subscriptionActive]
  );

  if (!auth.token) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage {...landingProps} />} />
        <Route path="/accueil" element={<LandingPage {...landingProps} />} />
        <Route path="/connexion" element={<AuthPage auth={auth} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <MerchantBillingContext.Provider value={merchantBillingValue}>
      <Routes>
        <Route path="/" element={<LandingPage {...landingProps} />} />
        <Route path="/accueil" element={<LandingPage {...landingProps} />} />
        <Route path="/connexion" element={<Navigate to="/tableau" replace />} />
        <Route element={<DashboardLayout auth={auth} />}>
          <Route path="/tableau" element={<OverviewPage auth={auth} />} />
          <Route path="/analytics" element={<AnalyticsPage auth={auth} />} />
          <Route path="/clients" element={<ClientsPage auth={auth} />} />
          <Route path="/campaigns" element={<CampaignsPage auth={auth} />} />
          <Route path="/wallet" element={<WalletPage auth={auth} />} />
          <Route path="/generateur-carte" element={<GeneratorAccessPage />} />
          <Route path="/settings" element={<SettingsPage auth={auth} />} />
        </Route>
        <Route path="*" element={<Navigate to="/tableau" replace />} />
      </Routes>
    </MerchantBillingContext.Provider>
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
        <Route path="/billing" element={<BillingStripeReturn />} />
        <Route path="/*" element={<MerchantApp auth={auth} />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
