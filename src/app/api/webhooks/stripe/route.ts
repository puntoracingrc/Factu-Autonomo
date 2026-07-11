import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { addScanCredits } from "@/lib/billing/add-scan-credits";
import type { PaidPlanId } from "@/lib/billing/plans";
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
import {
  markStripeEventFailed,
  markStripeEventProcessed,
  reserveStripeEvent,
} from "@/lib/billing/stripe-events";
import { getStripe, planFromStripePriceId } from "@/lib/billing/stripe";
import { APP_BRAND_NAME } from "@/lib/brand";
import { readTextBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function subscriptionPeriodEnd(subscription: Stripe.Subscription): number | null {
  const firstItem = subscription.items?.data?.[0];
  return firstItem?.current_period_end ?? null;
}

function subscriptionPlanFromStripe(
  subscription: Stripe.Subscription,
  fallbackPlan?: PaidPlanId | null,
): PaidPlanId {
  const metadataPlan =
    subscription.metadata?.plan === "pro_plus" ? "pro_plus" : null;
  const pricePlan = planFromStripePriceId(
    subscription.items?.data?.[0]?.price?.id,
  );
  return metadataPlan ?? pricePlan ?? fallbackPlan ?? "pro";
}

async function upsertPaidSubscription(params: {
  userId: string;
  plan: PaidPlanId;
  customerId: string;
  subscriptionId: string;
  status: string;
  currentPeriodEnd?: number | null;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase admin no disponible");

  const periodEnd = params.currentPeriodEnd
    ? new Date(params.currentPeriodEnd * 1000).toISOString()
    : null;

  const { error } = await admin.from("user_subscriptions").upsert(
    {
      user_id: params.userId,
      plan: params.plan,
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
  if (error) throw new Error(error.message);
}

async function downgradeToFree(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase admin no disponible");

  const { error } = await admin
    .from("user_subscriptions")
    .update({
      plan: "free",
      status: "canceled",
      stripe_subscription_id: null,
      current_period_end: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

async function markPastDue(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase admin no disponible");

  const { error } = await admin
    .from("user_subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
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
      const credited = await addScanCredits(userId, credits);
      if (!credited) throw new Error("No se pudieron añadir créditos IA");
    }
  } else {
    const subscriptionId = session.subscription as string | null;
    const customerId = session.customer as string | null;
    if (subscriptionId && customerId) {
      const sessionPlan: PaidPlanId =
        session.metadata?.plan === "pro_plus" ? "pro_plus" : "pro";
      const subscription = (await stripe.subscriptions.retrieve(
        subscriptionId,
      )) as unknown as Stripe.Subscription;
      await upsertPaidSubscription({
        userId,
        plan: subscriptionPlanFromStripe(subscription, sessionPlan),
        customerId,
        subscriptionId,
        status: subscription.status,
        currentPeriodEnd: subscriptionPeriodEnd(subscription),
      });

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
    invoice.lines?.data?.[0]?.description?.trim() || `${APP_BRAND_NAME} Pro`;

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

  const payloadResult = await readTextBody(request, {
    maxBytes: 1024 * 1024,
    invalidMessage: "El evento Stripe no es válido.",
    tooLargeMessage: "El evento Stripe es demasiado grande.",
  });
  if (!payloadResult.ok) return payloadResult.response;
  const payload = payloadResult.data;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  let reservation;
  try {
    reservation = await reserveStripeEvent(event.id, event.type);
  } catch {
    return NextResponse.json(
      { error: "No se pudo reservar el evento Stripe" },
      { status: 503 },
    );
  }

  if (!reservation.reserved) {
    return NextResponse.json({
      received: true,
      duplicate: true,
      status: reservation.status,
    });
  }

  try {
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
          await upsertPaidSubscription({
            userId,
            plan: subscriptionPlanFromStripe(subscription),
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
            await markPastDue(userId);
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

    await markStripeEventProcessed(event.id);
  } catch (error) {
    await markStripeEventFailed(event.id, error).catch(() => undefined);
    return NextResponse.json(
      { error: "No se pudo procesar el evento Stripe" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
