import { createContext, useContext } from "react";

/** Billing Stripe + statut d’abonnement pour l’espace commerçant (hors landing qui reçoit les props). */
export const MerchantBillingContext = createContext(null);

export function useMerchantBilling() {
  return useContext(MerchantBillingContext);
}
