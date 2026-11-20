import type { QuickCollection, QuickCollectionIntent, QuickCollectionInvoice } from "./collections-model";
import { quickCardAmount } from "./payments-model";
import type { QuickReceipt } from "./model";
import { QuickError, readQuickDocument, type QuickContext } from "./server";
import { assertQuickStripeAccount, configuredQuickPayments, paymentView, prepareReservedQuickPayment, quickStripeClient, refreshQuickPayment, type StoredQuickPayment } from "./payments-server";

interface StoredCollection {
  id: string; actor_user_id: string; company_id: string; user_id: string;
  amount: number; description: string; customer_name: string; created_at: string;
  invoice_operation_id: string | null; linked_at: string | null;
  invoice_id: string | null; invoice_number: string | null; invoice_local_id: string | null;
}
function failed(): never { throw new QuickError(503, "COLLECTION_UNCONFIRMED", "No se pudo confirmar el cobro. Conserva esta operación y reintenta sin crear otra."); }
async function readStored(context: QuickContext, id: string) {
  const result = await context.admin.from("quick_payment_requests").select("*").eq("id", id)
    .eq("company_id", context.scope.company_id).eq("actor_user_id", context.scope.actor_id).maybeSingle();
  if (result.error) failed();
  if (!result.data) throw new QuickError(404, "COLLECTION_MISSING", "No se encontró este cobro.");
  return result.data as StoredCollection;
}
async function latestPayment(context: QuickContext, id: string, livemode: boolean) {
  const result = await context.admin.from("quick_stripe_payments").select("*").eq("collection_id", id)
    .eq("company_id", context.scope.company_id).eq("livemode", livemode).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) failed();
  return result.data as StoredQuickPayment | null;
}
function collectionView(row: StoredCollection, payment?: StoredQuickPayment | null): QuickCollection {
  return { id: row.id, amount: row.amount, description: row.description, customerName: row.customer_name, createdAt: row.created_at,
    invoiceLinked: Boolean(row.linked_at), ...(row.invoice_operation_id ? { invoiceOperationId: row.invoice_operation_id } : {}),
    ...(row.invoice_number ? { invoiceNumber: row.invoice_number } : {}),
    ...(row.linked_at && row.invoice_local_id ? { invoiceUrl: `https://facturacion-autonomos.app/facturas/${encodeURIComponent(row.invoice_local_id)}` } : {}),
    ...(payment ? { payment: paymentView(payment) } : {}) };
}
export async function readQuickCollection(context: QuickContext, id: string, refresh = true): Promise<QuickCollection> {
  const config = configuredQuickPayments(context.scope.company_id, true), row = await readStored(context, id);
  let payment = await latestPayment(context, id, config.livemode);
  if (refresh && payment && (payment.checkout_session_id || payment.channel === "terminal")) {
    const stripe = quickStripeClient(config); await assertQuickStripeAccount(stripe, config);
    payment = await refreshQuickPayment(context.admin, stripe, config, payment);
  }
  return collectionView(row, payment);
}
export async function listQuickCollections(context: QuickContext, before?: string) {
  const config = configuredQuickPayments(context.scope.company_id, true);
  let query = context.admin.from("quick_payment_requests").select("*").eq("company_id", context.scope.company_id)
    .eq("actor_user_id", context.scope.actor_id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(31);
  if (before) {
    const cursor = await readStored(context, before);
    query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
  }
  const result = await query;
  if (result.error) failed();
  const rows = result.data as StoredCollection[], page = rows.slice(0, 30);
  // Bounded queries; listing history never calls Stripe or returns checkout URLs.
  const payments = page.length ? await context.admin.from("quick_stripe_payments").select("*").in("collection_id", page.map(row => row.id))
    .eq("company_id", context.scope.company_id).eq("livemode", config.livemode).neq("status", "expired") : { data: [], error: null };
  if (payments.error) failed();
  const byId = new Map((payments.data as StoredQuickPayment[]).map(row => [row.collection_id, row]));
  return { collections: page.map(row => {
    const view = collectionView(row, byId.get(row.id));
    if (view.payment) delete view.payment.url;
    return view;
  }), ...(rows.length > 30 ? { next: page.at(-1)!.id } : {}) };
}
export async function createQuickCollection(context: QuickContext, intent: QuickCollectionIntent) {
  configuredQuickPayments(context.scope.company_id);
  const result = await context.admin.rpc("create_quick_payment_request_v1", { p_actor_id: context.scope.actor_id, p_id: intent.id,
    p_amount: intent.amount, p_description: intent.description, p_customer_name: intent.customerName });
  if (result.error) throw new QuickError(409, "COLLECTION_CONFLICT", "Este cobro no se pudo guardar con esos datos. Comprueba la operación anterior antes de crear otra.");
  if (!result.data) failed();
  return collectionView(result.data as StoredCollection);
}
export async function prepareQuickCollectionPayment(context: QuickContext, id: string) {
  const config = configuredQuickPayments(context.scope.company_id), request = await readStored(context, id), stripe = quickStripeClient(config);
  await assertQuickStripeAccount(stripe, config);
  const current = await latestPayment(context, id, config.livemode);
  if (current) {
    const refreshed = await refreshQuickPayment(context.admin, stripe, config, current);
    if (refreshed.status !== "expired") return { ...collectionView(request), payment: await prepareReservedQuickPayment(context, stripe, config, refreshed, request.description) };
  }
  if (request.linked_at && request.invoice_operation_id) {
    const receipt = await readQuickDocument(context, request.invoice_operation_id);
    if (!receipt || quickCardAmount(receipt) !== request.amount) throw new QuickError(409, "COLLECTION_INVOICE_CHANGED", "La factura ha cambiado. Revisa el cobro antes de preparar otro enlace.");
  }
  const reserved = await context.admin.rpc("reserve_quick_collection_payment_v1", { p_actor_id: context.scope.actor_id, p_id: id, p_account_id: config.accountId, p_livemode: config.livemode });
  if (reserved.error || !reserved.data) failed();
  return { ...collectionView(request), payment: await prepareReservedQuickPayment(context, stripe, config, reserved.data as StoredQuickPayment, request.description) };
}
async function attach(context: QuickContext, request: StoredCollection, receipt: QuickReceipt) {
  // Ignore collection status only while reading the amount: proof comes from
  // the Stripe ledger, never from this synthetic pending projection.
  const amount = quickCardAmount({ ...receipt, document: { ...receipt.document, paymentStatus: "pending", status: "enviado" } });
  const result = await context.admin.rpc("attach_quick_collection_invoice_v1", { p_actor_id: context.scope.actor_id, p_id: request.id,
    p_operation_id: receipt.operationId, p_expected_version: receipt.document.centralInvoiceAuthority?.documentVersion, p_amount: amount });
  if (result.error || !result.data) throw new QuickError(409, "COLLECTION_LINK_PENDING", "La factura está emitida. El cobro sigue guardado, pero hay que revisar su vinculación desde Cobrar.");
}
export async function prepareQuickCollectionInvoice(context: QuickContext, id: string) {
  configuredQuickPayments(context.scope.company_id, true);
  await readStored(context, id);
  const result = await context.admin.rpc("prepare_quick_collection_invoice_v1", { p_actor_id: context.scope.actor_id, p_id: id });
  if (result.error || !result.data) failed();
  const request = result.data as StoredCollection;
  if (!request.invoice_operation_id) throw new QuickError(409, "COLLECTION_ALREADY_LINKED", "Este cobro ya está vinculado a una factura de Factu.");
  let receipt = await readQuickDocument(context, request.invoice_operation_id!);
  if (receipt) {
    await attach(context, request, receipt);
    receipt = await readQuickDocument(context, receipt.operationId);
  }
  return { collection: await readQuickCollection(context, id, false), receipt };
}
export async function searchQuickCollectionInvoices(context: QuickContext, query: string): Promise<QuickCollectionInvoice[]> {
  configuredQuickPayments(context.scope.company_id, true);
  const term = query.trim();
  if (!term || term.length > 100) return [];
  const escaped = term.replace(/[\\%_]/g, "\\$&");
  const result = await context.admin.from("central_invoice_documents").select("id,current_version,current_payload,emitted_snapshot")
    .eq("user_id", context.scope.user_id).eq("kind", "invoice").eq("lifecycle_status", "issued")
    .ilike("current_payload->document->>number", `%${escaped}%`).order("updated_at", { ascending: false }).limit(20);
  if (result.error) failed();
  return result.data.flatMap(row => {
    const doc = row.current_payload?.document, amount = Math.round(Number(row.emitted_snapshot?.taxSummary?.total) * 100);
    if (!doc || doc.type !== "factura" || doc.paymentStatus === "paid" || ["pagado", "anulada", "rectificada"].includes(doc.status)
      || doc.receiptDocumentId || doc.rectifiedById || doc.legacyImportAttestation || doc.legacyImportProvenance
      || !Number.isSafeInteger(amount) || amount < 50 || amount > 99_999_999) return [];
    return [{ id: row.id, number: String(doc.number), customerName: String(doc.client?.name ?? ""), amount, version: row.current_version }];
  });
}
export async function linkQuickCollectionToInvoice(context: QuickContext, id: string, invoiceId: string, version: number) {
  configuredQuickPayments(context.scope.company_id, true);
  await readStored(context, id);
  const result = await context.admin.rpc("attach_quick_collection_to_invoice_v1", { p_actor_id: context.scope.actor_id, p_id: id, p_invoice_id: invoiceId, p_expected_version: version });
  if (result.error || !result.data) throw new QuickError(409, "COLLECTION_LINK_CONFLICT", "No se pudo vincular. Comprueba que la factura está pendiente, que el importe coincide y que no tiene otro cobro asociado.");
  return readQuickCollection(context, id, false);
}
/** Invoice issuance has already committed. Linking failure must never undo or hide it. */
export async function finishQuickCollectionInvoice(context: QuickContext, receipt: QuickReceipt): Promise<QuickReceipt> {
  try {
    const result = await context.admin.from("quick_payment_requests").select("*").eq("invoice_operation_id", receipt.operationId)
      .eq("company_id", context.scope.company_id).eq("actor_user_id", context.scope.actor_id).maybeSingle();
    if (result.error) return { ...receipt, collectionLinkPending: true };
    if (!result.data) return receipt;
    await attach(context, result.data as StoredCollection, receipt);
    return await readQuickDocument(context, receipt.operationId) ?? { ...receipt, collectionLinkPending: true };
  } catch { return { ...receipt, collectionLinkPending: true }; }
}
