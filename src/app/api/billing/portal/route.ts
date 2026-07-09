import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/billing/config";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getStripe } from "@/lib/billing/stripe";
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
      namespace: "billing_portal",
      limit: 20,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const stripe = getStripe();
  const admin = getSupabaseAdmin();
  if (!stripe || !admin) {
    return NextResponse.json(
      { error: "Facturación no configurada en el servidor" },
      { status: 503 },
    );
  }

  const { data } = await admin
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data?.stripe_customer_id) {
    return NextResponse.json(
      { error: "Aún no tienes una suscripción activa" },
      { status: 400 },
    );
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${getAppUrl()}/configuracion`,
  });

  return NextResponse.json({ url: portal.url });
}
