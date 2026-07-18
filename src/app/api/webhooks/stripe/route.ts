import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { PaidPlanId } from "@/lib/billing/plans";
import {
  grantPaidReferralReward,
  isEligiblePaidReferralInvoice,
} from "@/lib/billing/paid-referral-rewards";
import {
  findUserIdByStripeCustomer,
  receiptFromCheckoutSession,
  sendPaymentReceiptEmail,
} from "@/lib/billing/payment-receipt-email";
import {
  hasAtomicScanPackFulfillmentProvenance,
  SCAN_PACK_FULFILLMENT_CONTRACT,
  SCAN_PACK_SIZE,
} from "@/lib/billing/scan-packs";
import {
  syncBillingProfileFromCheckoutSession,
  syncBillingProfileFromCustomerId,
} from "@/lib/billing/sync-billing-profile";
import {
  completeStripeScanPackEvent,
  markStripeEventFailed,
  markStripeEventProcessed,
  reserveStripeEvent,
} from "@/lib/billing/stripe-events";
import { getStripe, planFromStripePriceId } from "@/lib/billing/stripe";
import { APP_BRAND_NAME } from "@/lib/brand";
import { readTextBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

class InvalidCheckoutStateError extends Error {}
class LegacyCheckoutUnresolvedError extends Error {}
class ReceiptDeliveryRetryError extends Error {}

function subscriptionPeriodEnd(
  subscription: Stripe.Subscription,
): number | null {
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

function strictPaidPlanFromStripe(
  subscription: Stripe.Subscription,
): PaidPlanId | null {
  const pricePlan = planFromStripePriceId(
    subscription.items?.data?.[0]?.price?.id,
  );
  if (!pricePlan) return null;
  const metadataPlan = subscription.metadata?.plan;
  if (
    metadataPlan !== undefined &&
    metadataPlan !== "pro" &&
    metadataPlan !== "pro_plus"
  ) {
    return null;
  }
  if (metadataPlan && metadataPlan !== pricePlan) {
    throw new InvalidCheckoutStateError("subscription_plan_mismatch");
  }
  return pricePlan;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const compatible = invoice as unknown as {
    subscription?: string | { id?: string } | null;
    parent?: {
      subscription_details?: {
        subscription?: string | { id?: string } | null;
      } | null;
    } | null;
  };
  const subscription =
    compatible.parent?.subscription_details?.subscription ??
    compatible.subscription;
  if (typeof subscription === "string") return subscription;
  return subscription?.id ?? null;
}

function stripeObjectId(value: string | { id?: string } | null): string | null {
  if (typeof value === "string") return value;
  return value?.id ?? null;
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

async function deliverCheckoutReceipt(
  session: Stripe.Checkout.Session,
  eventId: string,
  userId: string,
  billingProfile: Awaited<
    ReturnType<typeof syncBillingProfileFromCheckoutSession>
  >,
): Promise<boolean> {
  const receiptInput = receiptFromCheckoutSession(session, eventId);
  if (!receiptInput) return false;

  return deliverPaymentReceipt({
    userId,
    customerProfile: billingProfile,
    ...receiptInput,
  });
}

async function deliverPaymentReceipt(
  input: Parameters<typeof sendPaymentReceiptEmail>[0],
): Promise<boolean> {
  const delivery = await sendPaymentReceiptEmail(input).catch(() => {
    throw new ReceiptDeliveryRetryError("receipt_delivery_failed");
  });
  if (delivery.sent || delivery.reason === "already_sent") return false;
  if (delivery.retryable === false) return true;
  if (!delivery.sent) {
    throw new ReceiptDeliveryRetryError(
      delivery.reason || "receipt_delivery_pending",
    );
  }
  return false;
}

async function reconcileProcessedCheckoutReceipt(
  event: Stripe.Event,
): Promise<boolean> {
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return false;
  }
  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.user_id;
  if (session.payment_status !== "paid" || !userId) return false;

  const billingProfile = await syncBillingProfileFromCheckoutSession(
    userId,
    session,
  );
  return deliverCheckoutReceipt(session, event.id, userId, billingProfile);
}

async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  eventId: string,
  attemptToken: string,
): Promise<{ completedAtomically: boolean; receiptManualReview: boolean }> {
  const userId = session.metadata?.user_id;
  const isScanPack = session.metadata?.checkout_type === "scan_pack";

  if (isScanPack) {
    if (
      !hasAtomicScanPackFulfillmentProvenance({
        fulfillmentContract: session.metadata?.fulfillment_contract,
        checkoutCreatedAt: session.created,
      })
    ) {
      throw new LegacyCheckoutUnresolvedError("legacy_checkout_unresolved");
    }
    if (
      session.mode !== "payment" ||
      !session.id ||
      session.metadata?.scan_credits !== String(SCAN_PACK_SIZE)
    ) {
      throw new InvalidCheckoutStateError("pack_checkout_invalid");
    }
    if (!userId) {
      throw new InvalidCheckoutStateError("pack_user_missing");
    }
  }

  if (session.payment_status === "unpaid") {
    return { completedAtomically: false, receiptManualReview: false };
  }
  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    throw new InvalidCheckoutStateError("payment_status_invalid");
  }
  if (!userId) {
    return { completedAtomically: false, receiptManualReview: false };
  }

  if (session.mode === "payment" && !isScanPack) {
    throw new InvalidCheckoutStateError("payment_checkout_type_unknown");
  }

  if (isScanPack && session.payment_status !== "paid") {
    throw new InvalidCheckoutStateError("pack_checkout_invalid");
  }

  const billingProfile = await syncBillingProfileFromCheckoutSession(
    userId,
    session,
  );

  let completedAtomically = false;
  if (isScanPack) {
    await completeStripeScanPackEvent({
      eventId,
      attemptToken,
      userId,
      checkoutSessionId: session.id,
      scanCredits: SCAN_PACK_SIZE,
      paymentStatus: "paid",
      fulfillmentContract: SCAN_PACK_FULFILLMENT_CONTRACT,
    });
    completedAtomically = true;
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

  const receiptManualReview =
    session.payment_status === "paid"
      ? await deliverCheckoutReceipt(
          session,
          eventId,
          userId,
          billingProfile,
        )
      : false;
  return { completedAtomically, receiptManualReview };
}

async function handleInvoicePaid(
  stripe: Stripe,
  invoice: Stripe.Invoice,
  eventId: string,
): Promise<boolean> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
  if (!customerId) return false;

  const amountPaidCents = invoice.amount_paid;
  const currency = invoice.currency?.toLowerCase() ?? "";
  const paidAt = new Date(
    (invoice.status_transitions?.paid_at ?? invoice.created) * 1000,
  );
  if (
    isEligiblePaidReferralInvoice({
      amountPaidCents,
      currency,
      billingReason: invoice.billing_reason,
      collectionMethod: invoice.collection_method,
      paidOutOfBand:
        (invoice as Stripe.Invoice & { paid_out_of_band?: boolean })
          .paid_out_of_band === true,
    })
  ) {
    const subscriptionId = invoiceSubscriptionId(invoice);
    if (subscriptionId) {
      const subscription = (await stripe.subscriptions.retrieve(
        subscriptionId,
      )) as unknown as Stripe.Subscription;
      const subscriptionCustomerId = stripeObjectId(subscription.customer);
      const refereeUserId = subscription.metadata?.user_id;
      const plan = strictPaidPlanFromStripe(subscription);
      if (
        subscription.status === "active" &&
        subscriptionCustomerId === customerId &&
        refereeUserId &&
        plan
      ) {
        await upsertPaidSubscription({
          userId: refereeUserId,
          plan,
          customerId,
          subscriptionId,
          status: subscription.status,
          currentPeriodEnd: subscriptionPeriodEnd(subscription),
        });
        await grantPaidReferralReward({
          refereeUserId,
          stripeEventId: eventId,
          stripeInvoiceId: invoice.id,
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
          plan,
          amountPaidCents,
          currency,
          billingReason: invoice.billing_reason,
          collectionMethod: invoice.collection_method,
          paidOutOfBand:
            (invoice as Stripe.Invoice & { paid_out_of_band?: boolean })
              .paid_out_of_band === true,
          paidAt,
        });
      }
    }
  }

  // Checkout already sends the first-payment receipt. The invoice event is
  // still the only authority for an Affiliate reward.
  if (invoice.billing_reason === "subscription_create") return false;

  const userId = await findUserIdByStripeCustomer(customerId);
  if (!userId) return false;

  const billingProfile = await syncBillingProfileFromCustomerId(
    userId,
    customerId,
  );

  const customerEmail =
    invoice.customer_email?.trim() || billingProfile?.email?.trim() || "";
  if (!customerEmail || invoice.amount_paid == null) return false;

  const description =
    invoice.lines?.data?.[0]?.description?.trim() || `${APP_BRAND_NAME} Pro`;

  return deliverPaymentReceipt({
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
    paidAt,
  });
}

async function reconcileProcessedPaymentReceipt(
  event: Stripe.Event,
): Promise<boolean> {
  if (event.type === "invoice.paid") {
    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe unavailable");
    return handleInvoicePaid(
      stripe,
      event.data.object as Stripe.Invoice,
      event.id,
    );
  }
  return reconcileProcessedCheckoutReceipt(event);
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook no configurado" },
      { status: 503 },
    );
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
    if (reservation.manualReview) {
      return NextResponse.json({
        received: true,
        manualReview: true,
        status: reservation.status,
      });
    }
    if (reservation.busy) {
      return NextResponse.json(
        {
          received: false,
          retryable: true,
          status: reservation.status,
        },
        {
          status: 503,
          headers: { "Retry-After": "10" },
        },
      );
    }
    let receiptManualReview = false;
    try {
      receiptManualReview =
        reservation.attemptCount > 0
          ? await reconcileProcessedPaymentReceipt(event)
          : false;
    } catch {
      return NextResponse.json(
        { received: false, retryable: true, receiptPending: true },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    return NextResponse.json({
      received: true,
      duplicate: true,
      status: reservation.status,
      ...(receiptManualReview ? { receiptManualReview: true } : {}),
    });
  }

  const attemptToken = reservation.attemptToken;
  if (!attemptToken) {
    return NextResponse.json(
      { error: "La reserva Stripe no devolvió un lease válido" },
      { status: 503 },
    );
  }

  try {
    let completedAtomically = false;
    let receiptManualReview = false;
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await handleCheckoutCompleted(
          stripe,
          session,
          event.id,
          attemptToken,
        );
        completedAtomically = result.completedAtomically;
        receiptManualReview = result.receiptManualReview;
        break;
      }
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== "paid") {
          throw new InvalidCheckoutStateError("async_payment_not_paid");
        }
        const result = await handleCheckoutCompleted(
          stripe,
          session,
          event.id,
          attemptToken,
        );
        completedAtomically = result.completedAtomically;
        receiptManualReview = result.receiptManualReview;
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        receiptManualReview = await handleInvoicePaid(stripe, invoice, event.id);
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

    if (!completedAtomically) {
      await markStripeEventProcessed(event.id, attemptToken);
    }
    return NextResponse.json({
      received: true,
      ...(receiptManualReview ? { receiptManualReview: true } : {}),
    });
  } catch (error) {
    if (error instanceof ReceiptDeliveryRetryError) {
      return NextResponse.json(
        { received: false, retryable: true, receiptPending: true },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    const failureCode =
      error instanceof LegacyCheckoutUnresolvedError
        ? "legacy_checkout_unresolved"
        : error instanceof InvalidCheckoutStateError
          ? "invalid_checkout_state"
          : error instanceof Error && error.message.includes("Conflicto")
            ? "scan_pack_conflict"
            : "handler_failed";
    const failureResult = await markStripeEventFailed(
      event.id,
      attemptToken,
      failureCode,
    ).catch(() => "stale_attempt" as const);
    if (
      error instanceof LegacyCheckoutUnresolvedError &&
      failureResult === "manual_review"
    ) {
      return NextResponse.json({
        received: true,
        manualReview: true,
        status: "failed",
      });
    }
    return NextResponse.json(
      { error: "No se pudo procesar el evento Stripe" },
      { status: 500 },
    );
  }

}
