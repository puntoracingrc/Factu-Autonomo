import { NextResponse } from "next/server";
import { readTextBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { quickStripeConfig } from "@/lib/quick-invoicing/payments-config";
import { handleQuickStripeEvent, quickStripeClient } from "@/lib/quick-invoicing/payments-server";

export const runtime = "nodejs";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  // Disabling new checkouts never disables confirmation of money already paid.
  const config = quickStripeConfig(process.env, true);
  const admin = getSupabaseAdmin();
  if (!config || !admin) return json({ ok: false, code: "UNAVAILABLE" }, 503);
  const body = await readTextBody(request, { maxBytes: 512 * 1024, invalidMessage: "Invalid body", tooLargeMessage: "Body too large" });
  if (!body.ok) return body.response;
  const stripe = quickStripeClient(config);
  let event;
  try { event = stripe.webhooks.constructEvent(body.data, request.headers.get("stripe-signature") ?? "", config.webhookSecret); }
  catch { return json({ ok: false, code: "INVALID_SIGNATURE" }, 400); }
  try {
    await handleQuickStripeEvent(admin, stripe, config, event);
    return json({ received: true });
  } catch {
    // Retain Stripe's retry. Never acknowledge a payment that failed to persist.
    return json({ ok: false, code: "COLLECTION_UNCONFIRMED" }, 503);
  }
}
