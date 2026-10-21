import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserSessionFromBearer } from "@/lib/billing/server-auth";
import { reserveCentralInvoiceQuota, reserveCentralNumberedDocumentQuota, commitCentralQuotaReservations, releaseCentralQuotaReservations } from "@/lib/billing/central-quota-enforcement";
import { ensureCloudDeviceAccess, hashCloudDeviceToken, normalizeCloudDeviceToken } from "@/lib/cloud/devices";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";
import { buildCentralInvoiceAuthorityDocumentFormIssueRequest } from "@/lib/central-invoice-authority/document-form-canary";
import { issueCentralInvoiceWithAuthority } from "@/lib/central-invoice-authority/issue-service";
import { evaluateCentralInvoiceAuthorityActivation } from "@/lib/central-invoice-authority/activation";
import { createCentralBusinessNumberedDocument } from "@/lib/central-business-authority/numbered-document-service";
import { evaluateCentralBusinessAuthorityActivation } from "@/lib/central-business-authority/activation";
import { normalizeNumbering } from "@/lib/numbering";
import { migrateCustomer } from "@/lib/customers";
import { validateDocumentEmission } from "@/lib/invoice-compliance";
import type { BusinessProfile, Document } from "@/lib/types";
import { quickIssuedDocument, quickRenderProfile } from "./render";
import { buildQuickDocumentPayload } from "./payload";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import { quickCompanyScopeProblem } from "./request-scope";
import { type QuickIntent, type QuickReceipt } from "./model";

if (typeof window !== "undefined") throw new Error("Factu Rápido: módulo exclusivo del servidor.");

export class QuickError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
interface QuickScope {
  actor_id: string; company_id: string; company_name: string; user_id: string;
  billing_user_id: string; profile_version: number; profile: BusinessProfile;
}
export interface QuickContext {
  admin: SupabaseClient; scope: QuickScope; sessionId: string; deviceId: string; email?: string;
}
interface StoredReceipt {
  operation_id: string; document: Document; render_profile: BusinessProfile;
  invoice_id: string | null; document_version: number; customer_pending: boolean;
  rpc_result: { identity_id: string; outbox_event_id: string; sequence: number };
}
function databaseError(error: { code?: string; message?: string }): never {
  if (error.code === "42501") throw new QuickError(403, "PILOT_ONLY", "Tu cuenta no tiene acceso a la empresa habilitada en Factu Rápido.");
  if (error.code === "P4502") throw new QuickError(409, "INTENT_MISMATCH", "Esta operación ya corresponde a otro contenido. Recupera primero su confirmación.");
  if (error.code === "P4503") throw new QuickError(410, "DOCUMENT_REMOVED", "Este documento fue eliminado desde el programa. No se volverá a emitir al reintentar.");
  if (error.code === "P4505") throw new QuickError(409, "PROFILE_CHANGED", "La configuración de la empresa cambió. Revisa los datos antes de volver a emitir.");
  if (error.code === "P4508") throw new QuickError(409, "OPERATION_CANCELLED", "Esta operación se canceló para volver a editar. Pulsa Volver a editar para recuperar los datos.");
  throw new QuickError(503, "CENTRAL_UNCONFIRMED", "No se pudo confirmar la operación. Conservamos tus datos: pulsa Comprobar y reintentar; no crees otra factura.");
}
export async function authenticateQuick(request: Request, options: { allowBootstrap?: boolean } = {}): Promise<QuickContext> {
  const identity = await getUserSessionFromBearer(request.headers.get("authorization"), { requireEmailConfirmed: true });
  if (!identity) throw new QuickError(401, "SIGN_IN_REQUIRED", "Inicia sesión con tu cuenta de Google.");
  const admin = getSupabaseAdmin();
  if (!admin) throw new QuickError(503, "UNAVAILABLE", "El servidor no está disponible ahora.");
  const result = await admin.rpc("quick_invoicing_scope_v1", { p_actor_id: identity.user.id });
  if (result.error) databaseError(result.error);
  const scope = result.data as QuickScope;
  if (!scope || scope.actor_id !== identity.user.id || !scope.company_id) throw new QuickError(403, "PILOT_ONLY", "Acceso no habilitado.");
  const scopeProblem = quickCompanyScopeProblem(request.headers.get(FACTU_COMPANY_HEADER), scope.company_id, options.allowBootstrap);
  if (scopeProblem) throw new QuickError(scopeProblem.status, scopeProblem.code, scopeProblem.message);
  const deviceToken = normalizeCloudDeviceToken(request.headers.get("x-factu-device-token"));
  if (!deviceToken) throw new QuickError(400, "INVALID_DEVICE", "No se pudo identificar este dispositivo.");
  const access = await ensureCloudDeviceAccess({ userId: scope.user_id, billingUserId: scope.billing_user_id,
    sessionId: identity.sessionId, token: deviceToken, userAgent: request.headers.get("user-agent") ?? undefined, name: "Factu Rápido" });
  if (!access.allowed) throw new QuickError(403, access.reason, access.message);
  const issue = request.method === "POST";
  const rate = await checkRateLimit(request, { namespace: issue ? "quick_issue" : "quick_read", limit: issue ? 20 : 100, windowMs: issue ? 600_000 : 60_000 }, identity.user.id);
  if (!rate.allowed) throw new QuickError(429, "RATE_LIMITED", "Espera un momento antes de volver a intentarlo.");
  return { admin, scope: { ...scope, profile: quickRenderProfile(scope.profile) }, sessionId: identity.sessionId, deviceId: hashCloudDeviceToken(deviceToken), email: identity.user.email };
}
export function intentHash(intent: QuickIntent) {
  return createHash("sha256").update(stableStringifySnapshot(intent)).digest("hex");
}
function materialize(row: StoredReceipt): QuickReceipt {
  const profile = quickRenderProfile(row.render_profile);
  let document = quickIssuedDocument(row.document, profile);
  if (row.invoice_id) document = { ...document, centralInvoiceAuthority: {
    schemaVersion: 1, source: "central_invoice_authority", serverDocumentId: row.invoice_id,
    identityId: row.rpc_result.identity_id, outboxEventId: row.rpc_result.outbox_event_id,
    eventType: "invoice_issued", fullNumber: document.number, sequence: row.rpc_result.sequence,
    documentVersion: row.document_version, receivedAt: new Date().toISOString(),
  } };
  return { operationId: row.operation_id, document, profile, customerPending: row.customer_pending };
}
export async function readQuickDocument(context: QuickContext, operationId: string, hash?: string): Promise<QuickReceipt | null> {
  const { data, error } = await context.admin.rpc("read_quick_document_v1", { p_actor_id: context.scope.actor_id, p_operation_id: operationId, p_intent_hash: hash ?? null });
  if (error) databaseError(error);
  return data ? materialize(data as StoredReceipt) : null;
}
export async function searchQuickCatalog(context: QuickContext, kind: string, query: string) {
  if (kind !== "customer" && kind !== "product") throw new QuickError(400, "INVALID_CATALOG", "Búsqueda no válida.");
  const { data, error } = await context.admin.rpc("search_quick_catalog_v1", { p_actor_id: context.scope.actor_id, p_kind: kind, p_query: query.slice(0, 100) });
  if (error) databaseError(error);
  return data;
}
export async function cancelQuickOperation(context: QuickContext, intent: QuickIntent) {
  const { data,error } = await context.admin.rpc("cancel_quick_operation_v1",{ p_actor_id:context.scope.actor_id,p_operation_id:intent.operationId,p_intent_hash:intentHash(intent) });
  if (error) databaseError(error);
  return { cancelled:data.cancelled === true, receipt:data.receipt ? materialize(data.receipt as StoredReceipt) : null };
}

export async function issueQuickDocument(context: QuickContext, intent: QuickIntent): Promise<QuickReceipt> {
  const hash = intentHash(intent);
  // Resolve an ambiguous response before consulting changed profile/catalog
  // settings: a successful retry must always recover the original operation.
  const replay = await readQuickDocument(context, intent.operationId, hash);
  if (replay) return replay;
  const { scope, admin } = context;
  const profile = scope.profile;
  if (profile.verifactu?.enabled) throw new QuickError(409, "QUICK_NOT_SUPPORTED", "Esta prueba no admite el registro VeriFactu activo. Utiliza el programa completo.");
  if (intent.paymentMethod === "transferencia" && !profile.iban?.trim()) throw new QuickError(400, "IBAN_MISSING", "Añade el IBAN de la empresa en el programa antes de usar transferencia.");
  if (intent.customerId) {
    const selected = await admin.from("central_business_entities").select("current_payload").eq("user_id", scope.user_id).eq("entity_type", "customer").eq("entity_id", intent.customerId).eq("deleted", false).maybeSingle();
    if (selected.error) databaseError(selected.error);
    if (!selected.data) throw new QuickError(409, "CUSTOMER_CHANGED", "El cliente ya no está disponible. Busca de nuevo o introduce sus datos.");
    const master = selected.data.current_payload as Record<string, unknown>;
    for (const key of Object.keys(intent.client) as Array<keyof typeof intent.client>) {
      if ((master[key] ?? "") !== (intent.client[key] ?? "")) throw new QuickError(409, "CUSTOMER_CHANGED", "Los datos del cliente han cambiado. Búscalo de nuevo o continúa como cliente nuevo.");
    }
  }
  const createdAt = new Date().toISOString();
  const id = `quick-${intent.operationId}`;
  const payload = buildQuickDocumentPayload(intent, profile, createdAt);
  const validation = validateDocumentEmission(payload, profile);
  if (!validation.ok) throw new QuickError(400, "INVALID_DOCUMENT", validation.message ?? "Revisa el documento.");
  const customer = intent.customerId ? null : migrateCustomer({
    ...intent.client, id, firstName: "", lastName: "", name: intent.client.name, createdAt, updatedAt: createdAt,
  });
  const auth = { userId: scope.user_id, deviceId: context.deviceId, sessionId: context.sessionId, userIdSource: "server" as const };
  const quota = intent.kind === "factura"
    ? await reserveCentralInvoiceQuota({ userId: scope.billing_user_id, kind: "invoice", localDocumentId: id })
    : await reserveCentralNumberedDocumentQuota({ userId: scope.billing_user_id, action: "create", entityType: "quote", entityId: id, payloadWithoutNumber: JSON.parse(JSON.stringify(payload)) });
  if (!quota.allowed) throw new QuickError(403, "QUOTA_REACHED", "Has alcanzado el límite de documentos de tu plan.");
  let stored: StoredReceipt | undefined;
  const commit = async (args: unknown) => {
    const result = await admin.rpc("commit_quick_document_v1", {
      p_actor_id: scope.actor_id, p_operation_id: intent.operationId, p_intent_hash: hash,
      p_profile_version: scope.profile_version, p_kind: intent.kind, p_args: args,
      p_render_profile: profile, p_customer: customer,
    });
    if (result.error) databaseError(result.error);
    stored = result.data as StoredReceipt;
    return { data: [stored.rpc_result], error: null };
  };
  try {
    if (intent.kind === "factura") {
      const form = buildCentralInvoiceAuthorityDocumentFormIssueRequest({ localDocumentId: id, payload, profile, issuedAt: createdAt });
      await issueCentralInvoiceWithAuthority({ issueInput: { ...form, auth }, documentPayload: form.documentPayload,
        emittedSnapshot: form.emittedSnapshot, emittedHash: form.emittedHash, rpcClient: { rpc: (_name, args) => commit(args) },
        activation: evaluateCentralInvoiceAuthorityActivation({ userId: scope.billing_user_id, userEmail: context.email }), userEmail: context.email });
    } else {
      const format = normalizeNumbering(profile.numbering).formats.presupuesto;
      await createCentralBusinessNumberedDocument({ creation: { action: "create", auth, idempotencyKey: `QUICK:${intent.operationId}`,
        entityType: "quote", entityId: id, numberTemplate: format.template, padding: format.padding, fiscalYear: Number(intent.date.slice(0,4)), payloadWithoutNumber: JSON.parse(JSON.stringify(payload)) },
        rpcClient: { rpc: (_name, args) => commit(args) },
        activation: evaluateCentralBusinessAuthorityActivation({ userId: scope.billing_user_id, userEmail: context.email }), userEmail: context.email });
    }
  } catch (error) {
    // A transport timeout can occur AFTER commit. Never release a reserved
    // document or report a rejection unless its outcome has been checked.
    const recovered = await readQuickDocument(context, intent.operationId, hash).catch(() => undefined);
    if (recovered) return recovered;
    if (recovered === null) await releaseCentralQuotaReservations({ userId: scope.billing_user_id, reservations: quota.reservations });
    throw error;
  }
  if (!stored) throw new QuickError(503, "CENTRAL_UNCONFIRMED", "Conservamos la operación. Comprueba su confirmación antes de volver a emitir.");
  // Pilot requires cloud access (not the free plan). Keep quota finalization
  // for compatibility without putting an ancillary bookkeeping failure in the
  // way of a document already durably committed and recoverable by operation.
  await commitCentralQuotaReservations({ userId: scope.billing_user_id, reservations: quota.reservations });
  return materialize(stored);
}

export async function runQuickCustomerJobs(context: QuickContext) {
  await context.admin.rpc("process_quick_customer_jobs_v1", { p_limit: 10 });
}
