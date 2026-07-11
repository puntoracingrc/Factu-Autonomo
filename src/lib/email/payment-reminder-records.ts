import { createHmac } from "node:crypto";
import { buildPdfViewModelForDocument } from "@/lib/document-integrity/pdf-source";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { BusinessProfile, Document } from "@/lib/types";

const MAX_DOCUMENT_PAYLOAD_BYTES = 1_000_000;
const MAX_PROFILE_PAYLOAD_BYTES = 512_000;

type ReminderEntityType = "document" | "profile";

interface ReminderEntityRow {
  entityId: string;
  payload: unknown;
  deleted: boolean;
}

export type PaymentReminderEntityLookupResult =
  | { ok: true; row: ReminderEntityRow | null }
  | { ok: false };

export type PaymentReminderEntityLookup = (
  userId: string,
  entityType: ReminderEntityType,
  entityId: string,
) => Promise<PaymentReminderEntityLookupResult>;

export type ResolvePaymentReminderRecordsResult =
  | { ok: true; doc: Document; profile: BusinessProfile }
  | {
      ok: false;
      reason:
        | "unavailable"
        | "not_found"
        | "invalid_document"
        | "invalid_profile";
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || isString(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function payloadFits(value: unknown, maxBytes: number): boolean {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8") <= maxBytes;
  } catch {
    return false;
  }
}

function isClientPayload(value: unknown): boolean {
  if (!isRecord(value) || !isString(value.name)) return false;
  if (
    value.customerType !== undefined &&
    value.customerType !== "person" &&
    value.customerType !== "company"
  ) {
    return false;
  }
  return [
    value.firstName,
    value.lastName,
    value.contactName,
    value.nif,
    value.email,
    value.phone,
    value.streetType,
    value.addressExtra,
    value.residenceType,
    value.address,
    value.city,
    value.postalCode,
  ].every(isOptionalString);
}

function isIssuerPayload(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (
    !isString(value.name) ||
    !isString(value.nif) ||
    !isString(value.address) ||
    !isString(value.city) ||
    !isString(value.postalCode) ||
    !isString(value.capturedAt)
  ) {
    return false;
  }
  return [
    value.commercialName,
    value.vatId,
    value.province,
    value.country,
    value.phone,
    value.email,
    value.website,
    value.iban,
    value.logoUrl,
  ].every(isOptionalString);
}

function isRectificationPayload(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.originalDocumentId) &&
    isString(value.originalNumber) &&
    isString(value.originalDate) &&
    isString(value.reason) &&
    (value.type === "anulacion" || value.type === "correccion")
  );
}

function isLinePayload(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.description) &&
    isFiniteNumber(value.quantity) &&
    isFiniteNumber(value.unitPrice) &&
    isFiniteNumber(value.ivaPercent) &&
    isOptionalString(value.unit)
  );
}

function isDocumentPayload(value: unknown, documentId: string): value is Document {
  if (!isRecord(value) || !payloadFits(value, MAX_DOCUMENT_PAYLOAD_BYTES)) {
    return false;
  }
  if (
    value.id !== documentId ||
    !isString(value.number) ||
    !isString(value.date) ||
    !isString(value.createdAt) ||
    !isString(value.updatedAt) ||
    !["factura", "presupuesto", "recibo"].includes(String(value.type)) ||
    ![
      "borrador",
      "enviado",
      "aceptado",
      "rechazado",
      "pagado",
      "vencido",
      "rectificada",
      "anulada",
    ].includes(String(value.status)) ||
    !isClientPayload(value.client) ||
    !Array.isArray(value.items) ||
    !value.items.every(isLinePayload)
  ) {
    return false;
  }

  if (
    ![
      value.dueDate,
      value.customerId,
      value.notes,
      value.paymentTerms,
      value.rectifiedById,
      value.issuedAt,
      value.sentAt,
      value.paidAt,
      value.acceptedAt,
      value.sourceQuoteDocumentId,
      value.sourceQuoteNumber,
      value.sourceDocumentId,
      value.receiptDocumentId,
    ].every(isOptionalString) ||
    (value.issuer !== undefined && !isIssuerPayload(value.issuer)) ||
    (value.rectification !== undefined &&
      !isRectificationPayload(value.rectification)) ||
    (value.documentSnapshot !== undefined &&
      !isRecord(value.documentSnapshot)) ||
    (value.pdfSnapshot !== undefined && !isRecord(value.pdfSnapshot)) ||
    (value.documentLifecycle !== undefined &&
      !["draft", "issued", "canceled"].includes(
        String(value.documentLifecycle),
      )) ||
    (value.integrityLock !== undefined &&
      value.integrityLock !== "unlocked" &&
      value.integrityLock !== "locked")
  ) {
    return false;
  }

  return true;
}

function isNumberingFormat(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.template) &&
    isFiniteNumber(value.padding)
  );
}

function isNumberingPayload(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.year) ||
    !isRecord(value.lastSequence) ||
    !isRecord(value.formats)
  ) {
    return false;
  }
  const kinds = [
    "factura",
    "factura_rectificativa",
    "presupuesto",
    "recibo",
  ];
  const lastSequence = value.lastSequence;
  const formats = value.formats;
  return kinds.every(
    (kind) =>
      isFiniteNumber(lastSequence[kind]) && isNumberingFormat(formats[kind]),
  );
}

function isBusinessProfilePayload(value: unknown): value is BusinessProfile {
  if (!isRecord(value) || !payloadFits(value, MAX_PROFILE_PAYLOAD_BYTES)) {
    return false;
  }

  const requiredStrings = [
    value.name,
    value.nif,
    value.address,
    value.city,
    value.postalCode,
    value.phone,
    value.email,
  ];
  if (!requiredStrings.every(isString)) return false;
  if (
    ![
      value.commercialName,
      value.vatId,
      value.province,
      value.country,
      value.website,
      value.iban,
      value.logoUrl,
    ].every(isOptionalString)
  ) {
    return false;
  }

  if (!isRecord(value.iva) || !Array.isArray(value.iva.rates)) return false;
  if (
    !value.iva.rates.every(isFiniteNumber) ||
    !isFiniteNumber(value.iva.defaultRate)
  ) {
    return false;
  }

  if (
    (value.vatExempt !== undefined && typeof value.vatExempt !== "boolean") ||
    (value.irpfPercent !== undefined &&
      !isFiniteNumber(value.irpfPercent)) ||
    (value.quoteValidityDays !== undefined &&
      !isFiniteNumber(value.quoteValidityDays))
  ) {
    return false;
  }

  return isNumberingPayload(value.numbering);
}

function canonicalPaymentReminderDocument(
  doc: Document,
  profile: BusinessProfile,
): Document | null {
  try {
    const view = buildPdfViewModelForDocument(doc, profile);
    if (!isDocumentPayload(view.doc, doc.id)) return null;
    if (!view.items.every(isLinePayload)) return null;
    if (
      !isString(view.issuer.name) ||
      !isString(view.issuer.nif) ||
      !isString(view.issuer.address) ||
      !isString(view.issuer.city) ||
      !isString(view.issuer.postalCode)
    ) {
      return null;
    }
    if (
      view.taxSummary &&
      (!isFiniteNumber(view.taxSummary.subtotal) ||
        !isFiniteNumber(view.taxSummary.iva) ||
        !isFiniteNumber(view.taxSummary.total) ||
        !Array.isArray(view.taxSummary.byRate) ||
        !view.taxSummary.byRate.every(
          (row) =>
            isFiniteNumber(row.ivaPercent) &&
            isFiniteNumber(row.taxableBase) &&
            isFiniteNumber(row.ivaAmount) &&
            isFiniteNumber(row.total),
        ))
    ) {
      return null;
    }
    // This exact document drives validation, recipient, subject, sender and PDF.
    // For immutable documents it contains the frozen snapshot, never a divergent
    // editable top-level customer/number/issuer.
    return view.doc;
  } catch {
    return null;
  }
}

export const lookupPaymentReminderEntity: PaymentReminderEntityLookup = async (
  userId,
  entityType,
  entityId,
) => {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false };

  const { data, error } = await admin
    .from("sync_entities")
    .select("entity_id,payload,deleted")
    .eq("user_id", userId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  if (error) return { ok: false };
  if (!data) return { ok: true, row: null };

  const row = data as {
    entity_id?: unknown;
    payload?: unknown;
    deleted?: unknown;
  };
  if (
    typeof row.entity_id !== "string" ||
    typeof row.deleted !== "boolean"
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    row: {
      entityId: row.entity_id,
      payload: row.payload,
      deleted: row.deleted,
    },
  };
};

export async function resolvePaymentReminderRecords(
  userId: string,
  documentId: string,
  lookup: PaymentReminderEntityLookup = lookupPaymentReminderEntity,
): Promise<ResolvePaymentReminderRecordsResult> {
  const documentResult = await lookup(userId, "document", documentId);
  if (!documentResult.ok) return { ok: false, reason: "unavailable" };
  if (!documentResult.row || documentResult.row.deleted) {
    return { ok: false, reason: "not_found" };
  }
  if (
    documentResult.row.entityId !== documentId ||
    !isDocumentPayload(documentResult.row.payload, documentId)
  ) {
    return { ok: false, reason: "invalid_document" };
  }

  const profileResult = await lookup(userId, "profile", "profile");
  if (!profileResult.ok) return { ok: false, reason: "unavailable" };
  if (
    !profileResult.row ||
    profileResult.row.deleted ||
    profileResult.row.entityId !== "profile" ||
    !isBusinessProfilePayload(profileResult.row.payload)
  ) {
    return { ok: false, reason: "invalid_profile" };
  }

  const doc = documentResult.row.payload;
  const profile = profileResult.row.payload;
  const canonicalDoc = canonicalPaymentReminderDocument(doc, profile);
  if (!canonicalDoc) {
    return { ok: false, reason: "invalid_document" };
  }

  return { ok: true, doc: canonicalDoc, profile };
}

export function normalizePaymentReminderRecipient(email: string): string {
  return email.trim().toLowerCase();
}

export function paymentReminderRecipientRateLimitSubject(
  email: string,
  secret =
    process.env.SERVER_RATE_LIMIT_SALT?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.RESEND_API_KEY?.trim(),
): string | null {
  // Never derive a recipient identifier with a public or hard-coded salt.
  // In production RESEND_API_KEY is necessarily present before this is used.
  if (!secret) return null;

  const digest = createHmac("sha256", secret)
    .update(normalizePaymentReminderRecipient(email))
    .digest("hex");
  return `recipient:${digest}`;
}
