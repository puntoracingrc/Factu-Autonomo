import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { quickStripeConfig, type QuickStripeConfig } from "./payments-config";
import { QUICK_COLLECTION_FLOW, quickCardAmount, stripeCheckoutUrl, type QuickCardPayment } from "./payments-model";
import { QuickError, readQuickDocument, type QuickContext } from "./server";

if (typeof window !== "undefined") throw new Error("Cobros: módulo exclusivo de servidor.");
export { QUICK_COLLECTION_FLOW } from "./payments-model";
export interface StoredQuickPayment {
  id: string; operation_id: string | null; collection_id?: string | null; company_id: string; user_id: string; invoice_id: string | null;
  invoice_hash: string | null; invoice_number: string | null; amount: number; currency: string;
  stripe_account_id: string; livemode: boolean; status: QuickCardPayment["status"];
  checkout_session_id: string | null; checkout_url: string | null;
  payment_intent_id: string | null; created_at: string; expires_at: string;
  paid_at: string | null; review_reason: string | null;
}
export function quickStripeClient(config: QuickStripeConfig) {
  return new Stripe(config.secretKey, { timeout: 12_000, maxNetworkRetries: 1 });
}
function unavailable(): never {
  throw new QuickError(503, "PAYMENT_UNCONFIRMED", "No se pudo comprobar el cobro. Reintenta sobre esta misma factura; no prepares otra para cobrarla.");
}
export function configuredQuickPayments(companyId: string, allowDisabled = false): QuickStripeConfig {
  const config = quickStripeConfig(process.env, allowDisabled);
  if (!config || config.companyId !== companyId) throw new QuickError(403, "CARD_PAYMENTS_UNAVAILABLE", "Los cobros con tarjeta no están habilitados para esta empresa.");
  return config;
}
export function paymentView(row: StoredQuickPayment): QuickCardPayment {
  return { status: row.status, amount: row.amount, testMode: !row.livemode,
    ...(row.status === "open" && stripeCheckoutUrl(row.checkout_url) ? { url: stripeCheckoutUrl(row.checkout_url) } : {}),
    expiresAt: row.expires_at, ...(row.paid_at ? { paidAt: row.paid_at } : {}) };
}
export async function assertQuickStripeAccount(stripe: Stripe, config: QuickStripeConfig) {
  const account = await stripe.accounts.retrieve(null);
  if (account.id !== config.accountId || (config.livemode && !account.charges_enabled)) {
    throw new QuickError(503, "STRIPE_ACCOUNT_MISMATCH", "No se pudo verificar la cuenta de cobro de esta empresa.");
  }
}
async function findPayment(admin: SupabaseClient, invoiceId: string, companyId: string, livemode: boolean) {
  const { data, error } = await admin.from("quick_stripe_payments").select("*")
    .eq("invoice_id", invoiceId).eq("company_id", companyId).eq("livemode", livemode).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) unavailable();
  return data as StoredQuickPayment | null;
}

/** Also used for explicit status checks. Only authenticated Stripe API state is evidence. */
export async function reconcileQuickStripeSession(
  admin: SupabaseClient, stripe: Stripe, config: QuickStripeConfig,
  session: Stripe.Checkout.Session, eventId: string,
): Promise<StoredQuickPayment> {
  if (session.metadata?.flow !== QUICK_COLLECTION_FLOW || session.mode !== "payment" || session.livemode !== config.livemode) unavailable();
  const { data, error } = await admin.from("quick_stripe_payments").select("*").eq("id", session.metadata.payment_id ?? "").maybeSingle();
  if (error || !data) unavailable();
  const row = data as StoredQuickPayment;
  if (row.company_id !== config.companyId || row.stripe_account_id !== config.accountId || row.livemode !== config.livemode
    || (row.operation_id ?? "") !== (session.metadata.operation_id ?? "")
    || (row.collection_id ?? "") !== (session.metadata.collection_id ?? "") || row.id !== session.client_reference_id
    || row.amount !== session.amount_total || row.currency !== session.currency
    || (row.checkout_session_id && row.checkout_session_id !== session.id)) unavailable();
  if (session.status === "complete" && session.payment_status === "paid") {
    const intent = session.payment_intent;
    if (!intent || typeof intent === "string" || intent.status !== "succeeded" || intent.amount_received !== row.amount
      || intent.amount !== row.amount || intent.currency !== row.currency || intent.livemode !== row.livemode
      || intent.metadata.payment_id !== row.id || intent.metadata.flow !== QUICK_COLLECTION_FLOW) unavailable();
    const charge = intent.latest_charge;
    if (!charge || typeof charge === "string" || !charge.paid || !charge.captured || charge.amount !== row.amount) unavailable();
    const confirmed = await admin.rpc("confirm_quick_stripe_payment_v1", {
      p_payment_id: row.id, p_session_id: session.id, p_account_id: config.accountId,
      p_livemode: session.livemode, p_amount: session.amount_total, p_currency: session.currency,
      p_intent_id: intent.id, p_paid_at: new Date(charge.created * 1000).toISOString(), p_event_id: eventId,
      p_review_reason: charge.refunded || charge.amount_refunded > 0 || charge.disputed ? "REFUND_OR_DISPUTE" : null,
    });
    if (confirmed.error || !confirmed.data) unavailable();
    return confirmed.data as StoredQuickPayment;
  }
  if (session.status === "expired" && (row.status === "open" || row.status === "creating")) {
    const updated = await admin.from("quick_stripe_payments").update({ status: "expired", last_event_id: eventId })
      .eq("id", row.id).in("status", ["open", "creating"]).is("paid_at", null).select("*").maybeSingle();
    if (updated.error) unavailable();
    return updated.data as StoredQuickPayment ?? row;
  }
  return row;
}
const expand = ["payment_intent.latest_charge"];
export async function refreshQuickPayment(admin: SupabaseClient, stripe: Stripe, config: QuickStripeConfig, row: StoredQuickPayment) {
  if (!row.checkout_session_id || row.status === "review" || row.status === "expired") return row;
  const session = await stripe.checkout.sessions.retrieve(row.checkout_session_id, { expand });
  return reconcileQuickStripeSession(admin, stripe, config, session, `check:${session.id}`);
}
export async function readQuickCardPayment(context: QuickContext, operationId: string): Promise<QuickCardPayment | null> {
  const config = configuredQuickPayments(context.scope.company_id, true);
  const receipt = await readQuickDocument(context, operationId);
  if (!receipt) throw new QuickError(404, "DOCUMENT_MISSING", "No se encontró la factura.");
  const row = await findPayment(context.admin, receipt.document.centralInvoiceAuthority!.serverDocumentId, context.scope.company_id, config.livemode);
  if (!row) return null;
  if (!row.checkout_session_id || row.status === "review" || row.status === "expired") return paymentView(row);
  const stripe = quickStripeClient(config);
  await assertQuickStripeAccount(stripe, config);
  return paymentView(await refreshQuickPayment(context.admin, stripe, config, row));
}

export async function createQuickCardPayment(context: QuickContext, operationId: string): Promise<QuickCardPayment> {
  const config = configuredQuickPayments(context.scope.company_id);
  const stripe = quickStripeClient(config);
  await assertQuickStripeAccount(stripe, config);
  const receipt = await readQuickDocument(context, operationId);
  if (!receipt) throw new QuickError(404, "DOCUMENT_MISSING", "No se encontró la factura.");
  let existing = await findPayment(context.admin, receipt.document.centralInvoiceAuthority!.serverDocumentId, context.scope.company_id, config.livemode);
  if (existing?.checkout_session_id) {
    existing = await refreshQuickPayment(context.admin, stripe, config, existing);
    if (existing.status === "paid" || existing.status === "review") return paymentView(existing);
  }
  if (existing?.collection_id && existing.status !== "expired") {
    const request = await context.admin.from("quick_payment_requests").select("description").eq("id", existing.collection_id)
      .eq("company_id", context.scope.company_id).single();
    if (request.error || !request.data?.description) unavailable();
    return prepareReservedQuickPayment(context, stripe, config, existing, request.data.description);
  }
  const linked = await context.admin.from("quick_payment_requests").select("id,description").eq("invoice_id", receipt.document.centralInvoiceAuthority!.serverDocumentId)
    .eq("company_id", context.scope.company_id).eq("actor_user_id", context.scope.actor_id).maybeSingle();
  if (linked.error) unavailable();
  if (linked.data && typeof linked.data.description === "string") {
    const { prepareQuickCollectionPayment } = await import("./collections-server");
    return (await prepareQuickCollectionPayment(context, linked.data.id)).payment!;
  }
  let amount: number;
  try { amount = quickCardAmount(receipt); }
  catch (error) { throw new QuickError(409, "INVOICE_NOT_COLLECTIBLE", (error as Error).message); }
  const result = await context.admin.rpc("reserve_quick_stripe_payment_v1", {
    p_actor_id: context.scope.actor_id, p_operation_id: operationId,
    p_expected_version: receipt.document.centralInvoiceAuthority?.documentVersion,
    p_amount: amount, p_account_id: config.accountId, p_livemode: config.livemode,
  });
  if (result.error || !result.data) throw new QuickError(409, "PAYMENT_PREPARATION_CONFLICT", "La factura o su cobro han cambiado. Comprueba su estado antes de volver a preparar el enlace.");
  const row = result.data as StoredQuickPayment;
  return prepareReservedQuickPayment(context, stripe, config, row, `Factura ${row.invoice_number}`);
}

export async function prepareReservedQuickPayment(context: QuickContext, stripe: Stripe, config: QuickStripeConfig, row: StoredQuickPayment, description: string): Promise<QuickCardPayment> {
  if (row.status !== "creating") return paymentView(row);
  // Stripe can prune idempotency keys after 24 h. An ambiguous old creation
  // must be reconciled by an operator, never silently recreated and charged twice.
  if (Date.now() - new Date(row.created_at).getTime() > 20 * 3600_000) {
    throw new QuickError(409, "PAYMENT_NEEDS_REVIEW", "La preparación anterior no se pudo confirmar. Revisa el cobro en Stripe antes de generar otro enlace.");
  }
  const metadata = { flow: QUICK_COLLECTION_FLOW, payment_id: row.id,
    ...(row.operation_id ? { operation_id: row.operation_id } : { collection_id: row.collection_id! }) };
  const session = await stripe.checkout.sessions.create({
    mode: "payment", payment_method_types: ["card"], locale: "es",
    client_reference_id: row.id, metadata,
    payment_intent_data: { metadata, capture_method: "automatic", description },
    line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: row.amount, product_data: { name: description } } }],
    success_url: `${config.origin}/rapido/pago.html`,
    expires_at: Math.floor(new Date(row.expires_at).getTime() / 1000),
    // The invoice already exists in Factu. No second Stripe invoice, tax,
    // promotion, subscription, reusable payment link or saved card is created.
    invoice_creation: { enabled: false }, automatic_tax: { enabled: false },
  }, { idempotencyKey: `quick-collection:${row.id}` });
  const url = stripeCheckoutUrl(session.url);
  if (!url || session.livemode !== config.livemode || session.amount_total !== row.amount) unavailable();
  const bound = await context.admin.rpc("bind_quick_stripe_session_v1", { p_payment_id: row.id, p_session_id: session.id, p_url: url });
  if (bound.error || !bound.data) unavailable();
  return paymentView(bound.data as StoredQuickPayment);
}

export async function handleQuickStripeEvent(admin: SupabaseClient, stripe: Stripe, config: QuickStripeConfig, event: Stripe.Event) {
  if (event.account || event.livemode !== config.livemode) unavailable();
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded" || event.type === "checkout.session.expired") {
    const object = event.data.object as Stripe.Checkout.Session;
    if (object.metadata?.flow !== QUICK_COLLECTION_FLOW) return;
    await assertQuickStripeAccount(stripe, config);
    const session = await stripe.checkout.sessions.retrieve(object.id, { expand });
    await reconcileQuickStripeSession(admin, stripe, config, session, event.id);
  } else if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
    const object = event.data.object;
    const chargeId = event.type === "charge.refunded" ? object.id : (object as Stripe.Dispute).charge;
    if (typeof chargeId !== "string") unavailable();
    await assertQuickStripeAccount(stripe, config);
    const charge = await stripe.charges.retrieve(chargeId);
    if (charge.metadata.flow !== QUICK_COLLECTION_FLOW) return;
    const { error } = await admin.from("quick_stripe_payments").update({ status: "review", review_reason: "REFUND_OR_DISPUTE", last_event_id: event.id })
      .eq("payment_intent_id", typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? "")
      .eq("company_id", config.companyId).eq("stripe_account_id", config.accountId).eq("livemode", config.livemode);
    if (error) unavailable();
  }
}
