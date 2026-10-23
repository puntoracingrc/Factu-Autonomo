import { createHash, randomBytes } from "node:crypto";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hashCloudDeviceSessionId } from "@/lib/cloud/devices";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { QuickError, readQuickDocument, type QuickContext } from "./server";
import { quickCardAmount } from "./payments-model";
import { assertQuickStripeAccount, configuredQuickPayments, paymentView, quickStripeClient, refreshQuickPayment, type StoredQuickPayment } from "./payments-server";
import type { QuickStripeConfig } from "./payments-config";
import { QUICK_TERMINAL_FLOW } from "./terminal-model";

if (typeof window !== "undefined") throw new Error("NFC: módulo exclusivo de servidor.");
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
function unconfirmed(): never { throw new QuickError(503, "NFC_UNCONFIRMED", "No se pudo comprobar el cobro NFC. Recupera este mismo cobro antes de intentarlo de nuevo."); }
export function quickTerminalLocation(env: Readonly<Record<string,string|undefined>> = process.env) {
  return env.QUICK_STRIPE_NFC_ENABLED === "true" && /^tml_[A-Za-z0-9]+$/.test(env.QUICK_STRIPE_TERMINAL_LOCATION_ID ?? "")
    ? env.QUICK_STRIPE_TERMINAL_LOCATION_ID! : null;
}
function requireNfc() {
  const location = quickTerminalLocation();
  if (!location) throw new QuickError(503, "NFC_UNAVAILABLE", "El cobro NFC todavía no está habilitado en esta empresa.");
  return location;
}
async function source(context: QuickContext, operationId?: string, collectionId?: string) {
  if (Boolean(operationId) === Boolean(collectionId)) throw new QuickError(400,"NFC_SOURCE_REQUIRED","Selecciona un único cobro.");
  if (operationId) {
    const receipt = await readQuickDocument(context, operationId);
    if (!receipt) throw new QuickError(404,"DOCUMENT_MISSING","No se encontró la factura.");
    const linked = await context.admin.from("quick_payment_requests").select("id,amount,description").eq("invoice_id", receipt.document.centralInvoiceAuthority!.serverDocumentId)
      .eq("actor_user_id",context.scope.actor_id).eq("company_id",context.scope.company_id).maybeSingle();
    if (linked.error) unconfirmed();
    if (linked.data) return { collectionId: linked.data.id as string, amount: linked.data.amount as number, description: linked.data.description as string };
    return { operationId, amount: quickCardAmount(receipt), version: receipt.document.centralInvoiceAuthority!.documentVersion, description: `Factura ${receipt.document.number}` };
  }
  const row = await context.admin.from("quick_payment_requests").select("amount,description").eq("id",collectionId!)
    .eq("actor_user_id",context.scope.actor_id).eq("company_id",context.scope.company_id).single();
  if (row.error || !row.data) throw new QuickError(404,"COLLECTION_MISSING","No se encontró el cobro.");
  return { collectionId, amount: row.data.amount as number, description: row.data.description as string };
}
async function current(context: QuickContext, origin: {operationId?:string; collectionId?:string}, config: QuickStripeConfig) {
  const result = await context.admin.from("quick_stripe_payments").select("*").eq("company_id",context.scope.company_id)
    .eq(origin.collectionId ? "collection_id" : "operation_id",origin.collectionId ?? origin.operationId!)
    .eq("livemode",config.livemode).neq("status","expired").maybeSingle();
  if (result.error) unconfirmed();
  return result.data as StoredQuickPayment | null;
}
/** A method switch first closes the provider object, then releases the ledger slot.
 * A timeout or concurrent success keeps the slot occupied and cannot double-charge. */
async function retire(admin: SupabaseClient,stripe: Stripe,config: QuickStripeConfig,row: StoredQuickPayment) {
  const refreshed = await refreshQuickPayment(admin,stripe,config,row);
  if (refreshed.status === "paid" || refreshed.status === "review") throw new QuickError(409,"PAYMENT_ALREADY_RECEIVED","El pago ya está recibido o en revisión. Comprueba el cobro.");
  if (row.channel === "terminal" && refreshed.status !== "expired") {
    if (!row.payment_intent_id) unconfirmed();
    const canceled = await stripe.paymentIntents.cancel(row.payment_intent_id, {}, { idempotencyKey:`quick-nfc-cancel:${row.id}` });
    if (canceled.status !== "canceled") unconfirmed();
  } else if (row.channel !== "terminal") {
    if (!row.checkout_session_id) throw new QuickError(409,"CHECKOUT_RECOVERY_REQUIRED","Recupera primero el enlace que se estaba preparando y vuelve a elegir NFC.");
    if (refreshed.status !== "expired") {
      const expired = await stripe.checkout.sessions.expire(row.checkout_session_id);
      if (expired.status !== "expired") unconfirmed();
    }
  }
  const updated = await admin.from("quick_stripe_payments").update({status:"expired"}).eq("id",row.id).in("status",["creating","open","expired"]).is("paid_at",null).select("id").single();
  if (updated.error || !updated.data) unconfirmed();
}
export async function prepareQuickTerminal(context: QuickContext,operationId?:string,collectionId?:string) {
  requireNfc();
  const config=configuredQuickPayments(context.scope.company_id), origin=await source(context,operationId,collectionId),stripe=quickStripeClient(config);
  await assertQuickStripeAccount(stripe,config);
  const previous=await current(context,origin,config);
  if (previous && previous.channel !== "terminal") await retire(context.admin,stripe,config,previous);
  const reserved=await context.admin.rpc("reserve_quick_terminal_payment_v1",{p_actor_id:context.scope.actor_id,
    p_operation_id:origin.operationId ?? null,p_collection_id:origin.collectionId ?? null,p_expected_version:origin.version ?? null,
    p_amount:origin.amount,p_account_id:config.accountId,p_livemode:config.livemode});
  if (reserved.error || !reserved.data) throw new QuickError(409,"NFC_CONFLICT","Este cobro ha cambiado. Comprueba su estado antes de continuar.");
  let row=reserved.data as StoredQuickPayment;
  if (row.status === "paid" || row.status === "review") return {payment:paymentView(row)};
  if (Date.now()-new Date(row.created_at).getTime()>20*3600_000 && !row.payment_intent_id) unconfirmed();
  const metadata={flow:QUICK_TERMINAL_FLOW,payment_id:row.id,operation_id:row.operation_id ?? "",collection_id:row.collection_id ?? ""};
  const intent=row.payment_intent_id ? await stripe.paymentIntents.retrieve(row.payment_intent_id) : await stripe.paymentIntents.create({
    amount:row.amount,currency:"eur",payment_method_types:["card_present"],capture_method:"automatic",metadata,description:origin.description,
  },{idempotencyKey:`quick-terminal:${row.id}`});
  if (intent.livemode!==row.livemode || intent.amount!==row.amount || intent.currency!==row.currency || intent.metadata.payment_id!==row.id
    || intent.metadata.flow!==QUICK_TERMINAL_FLOW || intent.payment_method_types.length!==1 || intent.payment_method_types[0]!=="card_present") unconfirmed();
  const bound=await context.admin.rpc("bind_quick_terminal_intent_v1",{p_payment_id:row.id,p_intent_id:intent.id});
  if (bound.error || !bound.data) unconfirmed();
  row=await reconcileQuickTerminal(context.admin,stripe,config,intent,`check:${intent.id}`);
  if (row.status === "paid" || row.status === "review" || row.status === "expired") return {payment:paymentView(row)};
  const grant=randomBytes(32).toString("base64url");
  const saved=await context.admin.from("quick_terminal_grants").insert({token_hash:sha(grant),payment_id:row.id,
    actor_id:context.scope.actor_id,company_id:context.scope.company_id,session_hash:hashCloudDeviceSessionId(context.sessionId),device_hash:context.deviceId});
  if (saved.error) unconfirmed();
  return {grant,payment:paymentView(row)};
}
export async function cancelQuickTerminal(context: QuickContext,operationId?:string,collectionId?:string) {
  const config=configuredQuickPayments(context.scope.company_id,true), origin=await source(context,operationId,collectionId),stripe=quickStripeClient(config);
  await assertQuickStripeAccount(stripe,config);
  const row=await current(context,origin,config);
  if (row?.channel === "terminal") await retire(context.admin,stripe,config,row);
  return {ok:true};
}
export async function reconcileQuickTerminal(admin:SupabaseClient,stripe:Stripe,config:QuickStripeConfig,intent:Stripe.PaymentIntent,eventId:string):Promise<StoredQuickPayment> {
  const result=await admin.from("quick_stripe_payments").select("*").eq("id",intent.metadata.payment_id ?? "").single();
  const row=result.data as StoredQuickPayment | null;
  if (result.error || !row || row.channel!=="terminal" || intent.metadata.flow!==QUICK_TERMINAL_FLOW
    || row.company_id!==config.companyId || row.stripe_account_id!==config.accountId || row.livemode!==config.livemode
    || intent.livemode!==row.livemode || intent.id!==row.payment_intent_id || intent.amount!==row.amount || intent.currency!==row.currency
    || intent.metadata.operation_id!==(row.operation_id ?? "") || intent.metadata.collection_id!==(row.collection_id ?? "")
    || intent.payment_method_types.length!==1 || intent.payment_method_types[0]!=="card_present" || intent.capture_method!=="automatic") unconfirmed();
  if (intent.status==="succeeded") {
    const charge=typeof intent.latest_charge==="string" ? await stripe.charges.retrieve(intent.latest_charge) : intent.latest_charge;
    if (!charge || !charge.paid || !charge.captured || charge.amount!==row.amount || charge.currency!==row.currency
      || charge.livemode!==row.livemode || intent.amount_received!==row.amount || charge.amount_captured!==row.amount
      || charge.payment_method_details?.type!=="card_present" || charge.payment_intent!==intent.id) unconfirmed();
    const confirmed=await admin.rpc("confirm_quick_terminal_payment_v1",{p_payment_id:row.id,p_account_id:config.accountId,
      p_livemode:row.livemode,p_amount:row.amount,p_currency:row.currency,p_intent_id:intent.id,
      p_paid_at:new Date(charge.created*1000).toISOString(),p_event_id:eventId,
      p_review_reason:charge.refunded || charge.amount_refunded>0 || charge.disputed ? "REFUND_OR_DISPUTE" : null});
    if (confirmed.error || !confirmed.data) unconfirmed();
    return confirmed.data as StoredQuickPayment;
  }
  if (intent.status==="canceled" && !row.paid_at && ["open","creating"].includes(row.status)) {
    const expired=await admin.from("quick_stripe_payments").update({status:"expired"}).eq("id",row.id).is("paid_at",null).in("status",["open","creating"]).select("*").maybeSingle();
    if (expired.error) unconfirmed();
    return expired.data as StoredQuickPayment ?? row;
  }
  return row;
}
export async function terminalDeviceAction(request:Request,action:string) {
  const grant=request.headers.get("authorization")?.match(/^FastNfc ([A-Za-z0-9_-]{43})$/)?.[1];
  if (!grant) throw new QuickError(401,"NFC_ACCESS_REQUIRED","Abre el cobro NFC desde Fast.");
  const admin=getSupabaseAdmin(); if (!admin) unconfirmed();
  const result=await admin.rpc("read_quick_terminal_grant_v1",{p_hash:sha(grant)});
  if (result.error || !result.data) throw new QuickError(401,"NFC_ACCESS_EXPIRED","El acceso NFC ha caducado. Abre de nuevo este cobro en Fast.");
  let row=result.data as StoredQuickPayment;
  const limit=await checkRateLimit(request,{namespace:"quick_terminal",limit:60,windowMs:60_000},row.id);
  if (!limit.allowed) throw new QuickError(429,"RATE_LIMITED","Espera un momento y reintenta.");
  const config=configuredQuickPayments(row.company_id,true),stripe=quickStripeClient(config);
  await assertQuickStripeAccount(stripe,config);
  if (!row.payment_intent_id) unconfirmed();
  const intent=await stripe.paymentIntents.retrieve(row.payment_intent_id);
  row=await reconcileQuickTerminal(admin,stripe,config,intent,`check:${intent.id}`);
  if (action==="check") return {payment:paymentView(row)};
  if (!["open","creating"].includes(row.status)) throw new QuickError(409,"NFC_FINISHED","Este cobro ya no está disponible. Comprueba el resultado en Fast.");
  const location=requireNfc(); configuredQuickPayments(row.company_id);
  if (action==="token") {
    const token=await stripe.terminal.connectionTokens.create({});
    return {secret:token.secret};
  }
  if (action!=="intent" || !intent.client_secret) throw new QuickError(400,"NFC_ACTION_INVALID","Acción NFC no válida.");
  return {clientSecret:intent.client_secret,locationId:location,amount:row.amount,currency:row.currency,
    merchantName:(process.env.QUICK_STRIPE_TERMINAL_DISPLAY_NAME?.trim() || "Fast").slice(0,100),
    description:intent.description ?? "Cobro Fast",testMode:!row.livemode};
}
