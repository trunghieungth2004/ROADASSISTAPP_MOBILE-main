import {api} from "./client";

export type SubscriptionPlanId = "WEEKLY" | "MONTHLY" | "YEARLY";

type PaymentWire = {
  id: string;
  status: string;
  method: string;
  checkout?: {qrUrl?: string | null} | null;
};

export type SubscriptionCheckout = {
  paymentId: string;
  status: string;
  checkoutUrl: string | null;
};

export async function purchaseSubscription(
  planId: SubscriptionPlanId,
  token: string,
): Promise<SubscriptionCheckout> {
  const raw = await api.post<PaymentWire>(
    "/payments/create",
    {planId, method: "SEPAY"},
    token,
  );
  const url = raw.checkout?.qrUrl;
  return {
    paymentId: raw.id,
    status: raw.status,
    checkoutUrl: typeof url === "string" && url !== "" ? url : null,
  };
}
