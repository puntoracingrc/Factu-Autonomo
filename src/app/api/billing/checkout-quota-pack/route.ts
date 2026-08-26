import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/billing/config";
import { resolveServerBillingPlan } from "@/lib/billing/quota-server";
import {
  BILLING_QUOTA_PACKS,
  BILLING_QUOTA_PACK_FULFILLMENT_CONTRACT,
  isBillingQuotaPackKey,
} from "@/lib/billing/quotas";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getStripe, quotaPackPriceId } from "@/lib/billing/stripe";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MAX_CHECKOUT_REQUEST_BYTES = 16 * 1024;

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "billing_checkout_quota_pack",
      limit: 10,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const parsedBody = await readJsonBody<{ pack?: unknown }>(request, {
    maxBytes: MAX_CHECKOUT_REQUEST_BYTES,
    invalidMessage: "Solicitud inválida",
  });
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;
  if (!body || !isBillingQuotaPackKey(body.pack)) {
    return NextResponse.json({ error: "Pack no válido" }, { status: 400 });
  }

  const pack = body.pack;
  const definition = BILLING_QUOTA_PACKS[pack];
  const stripe = getStripe();
  const priceId = quotaPackPriceId(pack);
  if (!stripe || !priceId) {
    return NextResponse.json(
      { error: "Este extra todavía no está configurado en Stripe" },
      { status: 503 },
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Servidor de suscripciones no disponible" },
      { status: 503 },
    );
  }

  const plan = await resolveServerBillingPlan(user.id);
  if (plan !== "free") {
    return NextResponse.json(
      { error: "Tu plan ya incluye este uso sin límite." },
      { status: 409 },
    );
  }

  const { data: subscription } = await admin
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const customerId = subscription?.stripe_customer_id as string | undefined;
  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    customer_email: customerId ? undefined : (user.email ?? undefined),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/cuenta?checkout=quota_pack_success`,
    cancel_url: `${appUrl}/cuenta?checkout=quota_pack_cancel`,
    metadata: {
      user_id: user.id,
      checkout_type: "quota_pack",
      quota_pack: pack,
      quota_quantity: String(definition.quantity),
      fulfillment_contract: BILLING_QUOTA_PACK_FULFILLMENT_CONTRACT,
    },
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    billing_address_collection: "required",
    customer_update: customerId ? { address: "auto" } : undefined,
  });

  return NextResponse.json({ url: session.url });
}
