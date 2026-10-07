import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCompanyRouteAuthFromBearer } from "@/lib/companies/server";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import { ensureCloudDeviceAccess, hashCloudDeviceToken, normalizeCloudDeviceToken } from "@/lib/cloud/devices";
import { CLOUD_DEVICE_TOKEN_HEADER } from "@/lib/cloud/device-token";
import { evaluateCentralInvoiceAuthorityActivation } from "@/lib/central-invoice-authority/activation";
import { buildAmendedCentralInvoice, type InvoiceAmendmentPatch } from "@/lib/central-invoice-authority/amendment";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { readTextBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { BusinessProfile, Document, DocumentSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store",
  Vary: `Authorization, ${CLOUD_DEVICE_TOKEN_HEADER}, ${FACTU_COMPANY_HEADER}`,
};
function failure(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status, headers });
}
function hash(value: unknown) {
  return createHash("sha256").update(stableStringifySnapshot(value)).digest("hex");
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const auth = await getCompanyRouteAuthFromBearer(request.headers.get("Authorization"), request.headers.get(FACTU_COMPANY_HEADER));
  if (!auth) return failure(401, "SESSION_REQUIRED", "La sesión no tiene acceso a esta empresa.");
  const rate = await checkRateLimit(request, { namespace: "central_invoice_management", limit: 60, windowMs: 600_000 }, auth.actorUserId);
  if (!rate.allowed) return failure(429, "RATE_LIMITED", "Demasiadas solicitudes. Vuelve a intentarlo en unos minutos.");
  const activation = evaluateCentralInvoiceAuthorityActivation({ userId: auth.userId, userEmail: auth.userEmail });
  if (!activation.fiscalWritesEnabled) return failure(403, "CENTRAL_WRITES_DISABLED", "El servidor central tiene las escrituras pausadas.");
  const token = normalizeCloudDeviceToken(request.headers.get(CLOUD_DEVICE_TOKEN_HEADER));
  if (!token) return failure(400, "INVALID_DEVICE_TOKEN", "No se pudo verificar el dispositivo.");
  const access = await ensureCloudDeviceAccess({ userId: auth.userId, billingUserId: auth.billingUserId, sessionId: auth.sessionId, token });
  if (!access.allowed) return failure(403, access.reason, access.message);
  const bodyResult = await readTextBody(request, { maxBytes: 512 * 1024, invalidMessage: "JSON inválido", tooLargeMessage: "Factura demasiado grande" });
  if (!bodyResult.ok) return bodyResult.response;
  let body: unknown;
  try { body = JSON.parse(bodyResult.data); } catch { return failure(400, "INVALID_REQUEST", "Solicitud inválida."); }
  if (!object(body) || !object(body.documentRef) ||
      !["update", "delete"].includes(String(body.action)) ||
      typeof body.idempotencyKey !== "string" || !/^[a-zA-Z0-9:_-]{12,160}$/.test(body.idempotencyKey) ||
      typeof body.documentRef.serverDocumentId !== "string" || !uuid.test(body.documentRef.serverDocumentId) ||
      typeof body.documentRef.identityId !== "string" || !uuid.test(body.documentRef.identityId) ||
      !Number.isInteger(body.documentRef.expectedVersion) || Number(body.documentRef.expectedVersion) < 1) {
    return failure(400, "INVALID_REQUEST", "La factura necesita identidad y versión centrales válidas.");
  }
  const patch = body.patch;
  if (body.action === "update" && (!object(patch) || typeof patch.date !== "string" ||
      !object(patch.client) || typeof patch.client.name !== "string" ||
      !Array.isArray(patch.items) || patch.items.length === 0 || patch.items.length > 1000 ||
      !patch.items.every((item: unknown) => object(item) && typeof item.id === "string" &&
        typeof item.description === "string" && [item.quantity, item.unitPrice, item.ivaPercent].every(
          (value) => typeof value === "number" && Number.isFinite(value))))) {
    return failure(400, "INVALID_REQUEST", "Revisa el cliente y los conceptos de la factura.");
  }
  // Reject unknown/protected fields instead of trusting a full browser invoice.
  const patchFields = new Set(["date", "dueDate", "customerId", "client", "items", "notes", "salesTerms", "paymentTerms"]);
  if (object(patch) && Object.keys(patch).some((key) => !patchFields.has(key))) {
    return failure(400, "PROTECTED_FIELD", "No se puede cambiar la identidad ni el emisor de la factura.");
  }
  const admin = getSupabaseAdmin();
  if (!admin) return failure(503, "SERVER_UNAVAILABLE", "El servidor central no está disponible.");
  const { data: stored, error: readError } = await admin.from("central_invoice_documents")
    .select("current_payload,emitted_snapshot,current_version")
    .eq("user_id", auth.userId).eq("id", body.documentRef.serverDocumentId).maybeSingle();
  if (readError) return failure(503, "SERVER_READ_FAILED", "No se pudo leer la factura central.");
  if (!stored) return failure(404, "DOCUMENT_NOT_FOUND", "La factura no pertenece a esta empresa.");
  let payload: unknown = null;
  let snapshot: unknown = null;
  if (body.action === "update" && stored.current_version === body.documentRef.expectedVersion) {
    const { data: identity, error: identityError } = await admin.from("central_invoice_identities")
      .select("issued_at,fiscal_year").eq("user_id", auth.userId)
      .eq("id", body.documentRef.identityId).eq("document_id", body.documentRef.serverDocumentId).maybeSingle();
    const { data: profile, error: profileError } = await admin.from("central_business_entities")
      .select("current_payload").eq("user_id", auth.userId).eq("entity_type", "profile")
      .eq("entity_id", "profile").eq("deleted", false).maybeSingle();
    if (identityError || profileError || !identity || !profile || !stored.emitted_snapshot) {
      return failure(409, "CANONICAL_DATA_MISSING", "No se pudieron verificar el emisor y el perfil centrales.");
    }
    try {
      const envelope = stored.current_payload as Record<string, unknown>;
      const current = (envelope.document ?? envelope) as Document;
      const amended = buildAmendedCentralInvoice({
        current, originalSnapshot: stored.emitted_snapshot as DocumentSnapshot,
        profile: profile.current_payload as BusinessProfile, patch: patch as unknown as InvoiceAmendmentPatch,
        fiscalYear: identity.fiscal_year, issuedAt: identity.issued_at, now: new Date().toISOString(),
      });
      payload = { ...envelope, document: amended };
      snapshot = amended.documentSnapshot;
    } catch (error) {
      return failure(400, "INVALID_AMENDMENT", error instanceof Error ? error.message : "Revisa la corrección de la factura.");
    }
  }
  const { data, error } = await admin.rpc("manage_central_invoice_v1", {
    p_user_id: auth.userId, p_device_id: hashCloudDeviceToken(token),
    p_session_hash: hash(auth.sessionId), p_idempotency_key_hash: hash(body.idempotencyKey),
    p_request_hash: hash({ action: body.action, documentRef: body.documentRef, patch: patch ?? null }),
    p_document_id: body.documentRef.serverDocumentId, p_identity_id: body.documentRef.identityId,
    p_expected_version: body.documentRef.expectedVersion, p_action: body.action,
    p_document_payload: payload, p_emitted_snapshot: snapshot,
  });
  if (error) {
    return failure(409, error.code ?? "CENTRAL_CHANGE_REJECTED", error.code === "P4103"
      ? "Otro dispositivo ha cambiado esta factura. Sincroniza y revisa la versión nueva antes de guardar."
      : error.code === "P4141" ? "Esta factura tiene un recibo vinculado. Borra primero el recibo para corregir o borrar la factura."
      : "El servidor no pudo confirmar el cambio. Sincroniza y vuelve a intentarlo; no se aplicó ningún cambio local.");
  }
  const row = data?.[0];
  if (!row) return failure(502, "CONFIRMATION_MISSING", "Falta la confirmación central del cambio.");
  return NextResponse.json({ ok: true, eventId: row.outbox_event_id }, { headers });
}
