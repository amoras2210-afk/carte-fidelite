import { Navigate, useSearchParams } from "react-router-dom";

/** Ancienne URL de retour Stripe ; redirige vers les routes actuelles. */
export function BillingStripeReturn() {
  const [params] = useSearchParams();
  const status = params.get("status");
  if (status === "success") {
    return <Navigate to="/tableau?paiement=reussi" replace />;
  }
  return <Navigate to="/?paiement=annule" replace />;
}
