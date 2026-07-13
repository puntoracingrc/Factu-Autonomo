import type Stripe from "stripe";
import { createHash } from "node:crypto";
import { APP_BRAND_NAME } from "../brand";
import { sendEmail } from "../email/send";
import { buildPaymentReceiptEmail } from "../email/templates/payment-receipt";
import { getSupabaseAdmin } from "../supabase/admin";
import type { BillingProfile } from "./billing-profile";

export interface PaymentReceiptRecordInput {
  userId: string;
  stripeEventId: string;
  stripeInvoiceId?: string | null;
  stripeCheckoutSessionId?: string | null;
  amountCents: number;
  currency: string;
  description: string;
  customerEmail: string;
  customerProfile?: BillingProfile | null;
  invoiceUrl?: string | null;
  isRenewal?: boolean;
  paidAt?: Date;
}

function formatMoney(amountCents: number, currency: string): string {
  const amount = amountCents / 100;
  return `${amount.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency.toUpperCase()}`;
}

function formatPaidAt(date: Date): string {
  return date.toLocaleString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface StoredPaymentReceipt {
  id: string;
  emailed_at: string | null;
}

export interface PaymentReceiptDeliveryResult {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  retryable?: boolean;
}

async function findStoredReceipt(
  input: PaymentReceiptRecordInput,
): Promise<StoredPaymentReceipt | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const identities: Array<[string, string | null | undefined]> = [
    ["stripe_event_id", input.stripeEventId],
    ["stripe_checkout_session_id", input.stripeCheckoutSessionId],
    ["stripe_invoice_id", input.stripeInvoiceId],
  ];
  for (const [column, value] of identities) {
    if (!value) continue;
    const { data, error } = await admin
      .from("payment_receipts")
      .select("id,emailed_at")
      .eq(column, value)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error("No se pudo consultar el recibo de pago");
    if (data) return data as StoredPaymentReceipt;
  }
  return null;
}

function paymentReceiptIdempotencyKey(
  input: PaymentReceiptRecordInput,
): string {
  const logicalIdentity =
    input.stripeCheckoutSessionId ||
    input.stripeInvoiceId ||
    input.stripeEventId;
  const digest = createHash("sha256").update(logicalIdentity).digest("hex");
  return `payment-receipt-v1/${digest}`;
}

function paymentReceiptRow(
  input: PaymentReceiptRecordInput,
  emailedAt: string | null,
) {
  return {
    user_id: input.userId,
    stripe_event_id: input.stripeEventId,
    stripe_invoice_id: input.stripeInvoiceId ?? null,
    stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
    amount_cents: input.amountCents,
    currency: input.currency,
    description: input.description,
    customer_email: input.customerEmail,
    emailed_at: emailedAt,
  };
}

export async function sendPaymentReceiptEmail(
  input: PaymentReceiptRecordInput,
): Promise<PaymentReceiptDeliveryResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      sent: false,
      reason: "receipt_store_unavailable",
      retryable: true,
    };
  }

  const storedReceipt = await findStoredReceipt(input);
  if (storedReceipt?.emailed_at) {
    return { sent: false, skipped: true, reason: "already_sent" };
  }

  const paidAt = input.paidAt ?? new Date();
  const content = buildPaymentReceiptEmail({
    customerEmail: input.customerEmail,
    customerProfile: input.customerProfile,
    description: input.description,
    amountLabel: formatMoney(input.amountCents, input.currency),
    paidAtLabel: formatPaidAt(paidAt),
    invoiceUrl: input.invoiceUrl,
    isRenewal: input.isRenewal,
  });

  const emailResult = await sendEmail({
    to: input.customerEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
    idempotencyKey: paymentReceiptIdempotencyKey(input),
  });

  const emailedAt = emailResult.ok ? new Date().toISOString() : null;
  const persistence = storedReceipt
    ? await admin
        .from("payment_receipts")
        .update({ emailed_at: emailedAt })
        .eq("id", storedReceipt.id)
    : await admin
        .from("payment_receipts")
        .insert(paymentReceiptRow(input, emailedAt));
  if (persistence.error) {
    return {
      sent: false,
      reason: "receipt_persistence_failed",
      retryable: true,
    };
  }

  if (emailResult.skipped) {
    return {
      sent: false,
      skipped: true,
      reason: emailResult.error,
      retryable: emailResult.retryable ?? false,
    };
  }

  if (!emailResult.ok) {
    return {
      sent: false,
      reason: emailResult.error,
      retryable: emailResult.retryable ?? true,
    };
  }

  return { sent: true };
}

export function receiptFromCheckoutSession(
  session: Stripe.Checkout.Session,
  eventId: string,
): Omit<PaymentReceiptRecordInput, "userId" | "customerProfile"> | null {
  const amountCents = session.amount_total;
  if (amountCents == null) return null;

  const description =
    session.metadata?.checkout_type === "scan_pack"
      ? "Pack de 10 escaneos extra"
      : `${APP_BRAND_NAME} Pro`;

  const customerEmail =
    session.customer_details?.email?.trim() ||
    session.customer_email?.trim() ||
    "";

  if (!customerEmail) return null;

  return {
    stripeEventId: eventId,
    stripeCheckoutSessionId: session.id,
    amountCents,
    currency: session.currency ?? "eur",
    description,
    customerEmail,
    paidAt: new Date((session.created ?? Date.now() / 1000) * 1000),
  };
}

export async function findUserIdByStripeCustomer(
  customerId: string,
): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data } = await admin
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return (data?.user_id as string | undefined) ?? null;
}
