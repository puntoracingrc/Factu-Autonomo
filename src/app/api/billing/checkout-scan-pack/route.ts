import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/billing/config";
import { SCAN_PACK_SIZE } from "@/lib/billing/scan-packs";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { resolveEffectivePlan } from "@/lib/billing/subscription";
import { isProPlan, type PlanId } from "@/lib/billing/plans";
import { getStripe, scanPackPriceId } from "@/lib/billing/stripe";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const rateLimit = checkRateLimit(
    request,
    {
      namespace: "billing_checkout_scan_pack",
      limit: 10,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const stripe = getStripe();
  const priceId = scanPackPriceId();
  if (!stripe || !priceId) {
    return NextResponse.json(
      { error: "Pack de escaneos no configurado en Stripe" },
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

  const { data: subRow } = await admin
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const plan = resolveEffectivePlan(
    subRow
      ? {
          userId: user.id,
          plan: (subRow.plan as PlanId) ?? "free",
          status: subRow.status ?? "inactive",
          stripeCustomerId: subRow.stripe_customer_id,
          stripeSubscriptionId: subRow.stripe_subscription_id,
          trialEndsAt: subRow.trial_ends_at,
          currentPeriodEnd: subRow.current_period_end,
        }
      : null,
  );

  if (!isProPlan(plan)) {
    return NextResponse.json(
      { error: "Necesitas plan Pro para comprar escaneos extra." },
      { status: 403 },
    );
  }

  const customerId = subRow?.stripe_customer_id as string | undefined;
  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    customer_email: customerId ? undefined : (user.email ?? undefined),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/gastos/nuevo?checkout=scan_pack_success`,
    cancel_url: `${appUrl}/gastos/nuevo?checkout=scan_pack_cancel`,
    metadata: {
      user_id: user.id,
      checkout_type: "scan_pack",
      scan_credits: String(SCAN_PACK_SIZE),
    },
    tax_id_collection: { enabled: true },
    billing_address_collection: "required",
  });

  return NextResponse.json({ url: session.url });
}
