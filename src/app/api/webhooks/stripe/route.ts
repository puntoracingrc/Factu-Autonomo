import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { addScanCredits } from "@/lib/billing/add-scan-credits";
import { SCAN_PACK_SIZE } from "@/lib/billing/scan-packs";
import { getStripe } from "@/lib/billing/stripe";
import { sendWelcomeEmailForUser } from "@/lib/email/welcome";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function subscriptionPeriodEnd(subscription: Stripe.Subscription): number | null {
  const firstItem = subscription.items?.data?.[0];
  return firstItem?.current_period_end ?? null;
}

async function upsertProSubscription(params: {
  userId: string;
  customerId: string;
  subscriptionId: string;
  status: string;
  currentPeriodEnd?: number | null;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const periodEnd = params.currentPeriodEnd
    ? new Date(params.currentPeriodEnd * 1000).toISOString()
    : null;

  await admin.from("user_subscriptions").upsert(
    {
      user_id: params.userId,
      plan: "pro",
      status:
        params.status === "trialing"
          ? "trialing"
          : params.status === "active"
            ? "active"
            : params.status,
      stripe_customer_id: params.customerId,
      stripe_subscription_id: params.subscriptionId,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

async function downgradeToFree(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  await admin
    .from("user_subscriptions")
    .update({
      plan: "free",
      status: "canceled",
      stripe_subscription_id: null,
      current_period_end: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Firma ausente" }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      if (!userId) break;

      if (session.metadata?.checkout_type === "scan_pack") {
        const credits = Number(
          session.metadata.scan_credits ?? SCAN_PACK_SIZE,
        );
        if (Number.isFinite(credits) && credits > 0) {
          await addScanCredits(userId, credits);
        }
        break;
      }

      const subscriptionId = session.subscription as string | null;
      const customerId = session.customer as string | null;
      if (subscriptionId && customerId) {
        const subscription = (await stripe.subscriptions.retrieve(
          subscriptionId,
        )) as unknown as Stripe.Subscription;
        await upsertProSubscription({
          userId,
          customerId,
          subscriptionId,
          status: subscription.status,
          currentPeriodEnd: subscriptionPeriodEnd(subscription),
        });

        const customerEmail =
          session.customer_details?.email?.trim() ||
          session.customer_email?.trim();
        if (customerEmail) {
          void sendWelcomeEmailForUser({
            userId,
            email: customerEmail,
          }).catch(() => undefined);
        }
      }
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      if (!userId) break;
      if (
        subscription.status === "active" ||
        subscription.status === "trialing"
      ) {
        await upsertProSubscription({
          userId,
          customerId: subscription.customer as string,
          subscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscriptionPeriodEnd(subscription),
        });
      } else if (
        subscription.status === "canceled" ||
        subscription.status === "unpaid"
      ) {
        await downgradeToFree(userId);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      if (userId) await downgradeToFree(userId);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
