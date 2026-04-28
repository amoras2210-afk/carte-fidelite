import { Navigate, Route, Routes } from "react-router-dom";
import { useMemo, useState } from "react";
import { DashboardLayout } from "./components/DashboardLayout";
import { AuthPage } from "./pages/AuthPage";
import { PublicCardPage } from "./pages/PublicCardPage";
import { OverviewPage } from "./pages/OverviewPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { BusinessPage } from "./pages/BusinessPage";
import { ClientsPage } from "./pages/ClientsPage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { WalletPage } from "./pages/WalletPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ToastProvider } from "./components/ToastContext";

function MerchantApp({ auth }) {
  if (!auth.token) return <AuthPage auth={auth} />;

  return (
    <DashboardLayout auth={auth}>
      <Routes>
        <Route path="/" element={<OverviewPage auth={auth} />} />
        <Route path="/analytics" element={<AnalyticsPage auth={auth} />} />
        <Route path="/business" element={<BusinessPage auth={auth} />} />
        <Route path="/clients" element={<ClientsPage auth={auth} />} />
        <Route path="/campaigns" element={<CampaignsPage auth={auth} />} />
        <Route path="/wallet" element={<WalletPage auth={auth} />} />
        <Route path="/settings" element={<SettingsPage auth={auth} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
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
        {/* Public PWA card (no merchant auth) */}
        <Route path="/card" element={<PublicCardPage />} />
        <Route path="/*" element={<MerchantApp auth={auth} />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
