// Phase 5 — PayPal sandbox (server-only). Orders v2 API.
// Configured → real sandbox order + approve link. Unconfigured → demo link,
// so the Finance Clerk step always works.

const BASE = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const SECRET = process.env.PAYPAL_SECRET;

export const isPaypalConfigured = Boolean(CLIENT_ID && SECRET);

export interface PaypalOrder {
  orderId: string;
  approveUrl: string;
  demo: boolean;
}

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${CLIENT_ID}:${SECRET}`).toString("base64");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal token ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

export interface CreateOrderInput {
  amount: number;
  currency?: string;
  reference: string; // ticket ref, e.g. T-102
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export async function createPaypalOrder(input: CreateOrderInput): Promise<PaypalOrder> {
  const currency = input.currency ?? "GBP";

  // demo fallback — believable sandbox checkout URL, no network call
  if (!isPaypalConfigured) {
    const token = `DEMO-${input.reference}`;
    const web = BASE.includes("sandbox") ? "https://www.sandbox.paypal.com" : "https://www.paypal.com";
    return { orderId: token, approveUrl: `${web}/checkoutnow?token=${token}`, demo: true };
  }

  const accessToken = await getAccessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.reference,
          description: input.description ?? `Thirty Labs repair — ${input.reference}`,
          amount: { currency_code: currency, value: input.amount.toFixed(2) },
        },
      ],
      application_context: {
        brand_name: "Thirty Labs Autopilot",
        user_action: "PAY_NOW",
        return_url: input.returnUrl ?? "https://example.com/return",
        cancel_url: input.cancelUrl ?? "https://example.com/cancel",
      },
    }),
  });
  if (!res.ok) throw new Error(`PayPal order ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const approve = (data.links as { rel: string; href: string }[]).find((l) => l.rel === "approve");
  return { orderId: data.id as string, approveUrl: approve?.href ?? "", demo: false };
}
