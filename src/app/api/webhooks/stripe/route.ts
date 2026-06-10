import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { addScanCredits } from "@/lib/billing/add-scan-credits";
import {
  findUserIdByStripeCustomer,
  receiptFromCheckoutSession,
  sendPaymentReceiptEmail,
} from "@/lib/billing/payment-receipt-email";
import { SCAN_PACK_SIZE } from "@/lib/billing/scan-packs";
import {
  syncBillingProfileFromCheckoutSession,
  syncBillingProfileFromCustomerId,
} from "@/lib/billing/sync-billing-profile";
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

async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  const userId = session.metadata?.user_id;
  if (!userId) return;

  const billingProfile = await syncBillingProfileFromCheckoutSession(
    userId,
    session,
  );

  if (session.metadata?.checkout_type === "scan_pack") {
    const credits = Number(session.metadata.scan_credits ?? SCAN_PACK_SIZE);
    if (Number.isFinite(credits) && credits > 0) {
      await addScanCredits(userId, credits);
    }
  } else {
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
  }

  const receiptInput = receiptFromCheckoutSession(session, eventId);
  if (receiptInput) {
    void sendPaymentReceiptEmail({
      userId,
      customerProfile: billingProfile,
      ...receiptInput,
    }).catch(() => undefined);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice, eventId: string) {
  if (invoice.billing_reason === "subscription_create") return;

  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
  if (!customerId) return;

  const userId = await findUserIdByStripeCustomer(customerId);
  if (!userId) return;

  const billingProfile = await syncBillingProfileFromCustomerId(
    userId,
    customerId,
  );

  const customerEmail =
    invoice.customer_email?.trim() || billingProfile?.email?.trim() || "";
  if (!customerEmail || invoice.amount_paid == null) return;

  const description =
    invoice.lines?.data?.[0]?.description?.trim() || "Factura Autónomo Pro";

  void sendPaymentReceiptEmail({
    userId,
    stripeEventId: eventId,
    stripeInvoiceId: invoice.id,
    amountCents: invoice.amount_paid,
    currency: invoice.currency ?? "eur",
    description,
    customerEmail,
    customerProfile: billingProfile,
    invoiceUrl: invoice.hosted_invoice_url,
    isRenewal: true,
    paidAt: new Date((invoice.status_transitions?.paid_at ?? invoice.created) * 1000),
  }).catch(() => undefined);
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
      await handleCheckoutCompleted(stripe, session, event.id);
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaid(invoice, event.id);
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
        subscription.status === "unpaid" ||
        subscription.status === "past_due"
      ) {
        if (subscription.status === "past_due") {
          const admin = getSupabaseAdmin();
          if (admin) {
            await admin
              .from("user_subscriptions")
              .update({
                status: "past_due",
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", userId);
          }
        } else {
          await downgradeToFree(userId);
        }
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      if (userId) await downgradeToFree(userId);
      break;
    }
    case "customer.updated": {
      const customer = event.data.object as Stripe.Customer;
      if (customer.deleted) break;
      const userId = await findUserIdByStripeCustomer(customer.id);
      if (userId) {
        await syncBillingProfileFromCustomerId(userId, customer.id);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
