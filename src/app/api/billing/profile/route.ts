import { NextResponse } from "next/server";
import { billingProfileFromDbRow } from "@/lib/billing/billing-profile";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Servidor de suscripciones no disponible" },
      { status: 503 },
    );
  }

  const { data, error } = await admin
    .from("user_subscriptions")
    .select(
      "billing_name,billing_email,billing_tax_id,billing_address_line1,billing_address_line2,billing_city,billing_postal_code,billing_country,billing_synced_at,stripe_customer_id",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: billingProfileFromDbRow(data as Record<string, unknown> | null),
    hasStripeCustomer: Boolean(data?.stripe_customer_id),
  });
}
