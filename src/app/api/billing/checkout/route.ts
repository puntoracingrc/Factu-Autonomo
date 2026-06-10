import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/billing/config";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getStripe, priceIdForInterval } from "@/lib/billing/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe no configurado en el servidor" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { interval?: "monthly" | "yearly" };
  const interval = body.interval === "yearly" ? "yearly" : "monthly";
  const priceId = priceIdForInterval(interval);
  if (!priceId) {
    return NextResponse.json(
      { error: "Precio de Stripe no configurado" },
      { status: 503 },
    );
  }

  const admin = getSupabaseAdmin();
  let customerId: string | undefined;

  if (admin) {
    const { data } = await admin
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    customerId = data?.stripe_customer_id ?? undefined;
  }

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    customer_email: customerId ? undefined : user.email ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/precios?checkout=success`,
    cancel_url: `${appUrl}/precios?checkout=cancel`,
    metadata: { user_id: user.id },
    subscription_data: {
      metadata: { user_id: user.id },
    },
    tax_id_collection: { enabled: true },
    billing_address_collection: "required",
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
