import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/billing/config";
import { getCompanyRouteAuthFromBearer } from "@/lib/companies/server";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import { getStripe } from "@/lib/billing/stripe";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
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
      namespace: "billing_portal",
      limit: 20,
      windowMs: 10 * 60_000,
    },
    auth.actorUserId,
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
    .eq("user_id", auth.billingUserId)
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
