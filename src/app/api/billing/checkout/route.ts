import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/billing/config";
import type { PaidPlanId } from "@/lib/billing/plans";
import { getCompanyRouteAuthFromBearer } from "@/lib/companies/server";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import { getStripe, priceIdForPlanInterval } from "@/lib/billing/stripe";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await getCompanyRouteAuthFromBearer(
    request.headers.get("authorization"),
    request.headers.get(FACTU_COMPANY_HEADER),
  );
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "billing_checkout",
      limit: 10,
      windowMs: 10 * 60_000,
    },
    auth.actorUserId,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe no configurado en el servidor" },
      { status: 503 },
    );
  }

  const bodyResult = await readJsonBody<{
    interval?: "monthly" | "yearly";
    plan?: PaidPlanId;
  }>(request, {
    maxBytes: 8 * 1024,
    invalidMessage: "Petición de pago no válida.",
  });
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;
  const interval = body.interval === "yearly" ? "yearly" : "monthly";
  const plan: PaidPlanId = body.plan === "pro_plus" ? "pro_plus" : "pro";
  const priceId = priceIdForPlanInterval(plan, interval);
  if (!priceId) {
    return NextResponse.json(
      { error: "Precio de Stripe no configurado para este plan" },
      { status: 503 },
    );
  }

  const admin = getSupabaseAdmin();
  let customerId: string | undefined;

  if (admin) {
    const { data } = await admin
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", auth.billingUserId)
      .maybeSingle();
    customerId = data?.stripe_customer_id ?? undefined;
  }

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    customer_email: customerId ? undefined : (auth.userEmail ?? undefined),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/precios?checkout=success`,
    cancel_url: `${appUrl}/precios?checkout=cancel`,
    metadata: { user_id: auth.billingUserId, plan },
    subscription_data: {
      metadata: { user_id: auth.billingUserId, plan },
    },
    tax_id_collection: { enabled: true },
    billing_address_collection: "required",
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
