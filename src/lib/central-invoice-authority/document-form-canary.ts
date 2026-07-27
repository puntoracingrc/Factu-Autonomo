import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";
import {
  buildDocumentSnapshot,
  stableStringifySnapshot,
} from "@/lib/document-integrity/snapshots";
import { attachIssuerSnapshot } from "@/lib/issuer-snapshot";
import { normalizeNumbering } from "@/lib/numbering";
import type { BusinessProfile, Document, DocumentType } from "@/lib/types";

import type {
  CentralInvoiceAuthorityFormIssueRequest,
  CentralInvoiceAuthorityFormJson,
} from "./form-canary-client";

export const CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY =
  "CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY_V1";

export const CENTRAL_INVOICE_AUTHORITY_PENDING_NUMBER =
  "__CENTRAL_AUTHORITY_FULL_NUMBER__";

export type CentralInvoiceAuthorityDocumentFormPayload = Omit<
  Document,
  "id" | "number" | "createdAt" | "updatedAt"
>;

export interface CentralInvoiceAuthorityDocumentFormCanaryInput {
  type: DocumentType;
  existing?: Pick<Document, "id"> | null;
  payload: CentralInvoiceAuthorityDocumentFormPayload;
  resolvedStatus: Document["status"];
}

export interface BuildCentralInvoiceAuthorityDocumentFormIssueRequestInput {
  localDocumentId: string;
  payload: CentralInvoiceAuthorityDocumentFormPayload;
  profile: BusinessProfile;
  issuedAt: string;
}

function hashJson(value: unknown): string {
  return `sha256:${sha256Hex(stableStringifySnapshot(value))}`;
}

function toJson(value: unknown): CentralInvoiceAuthorityFormJson {
  return JSON.parse(stableStringifySnapshot(value)) as CentralInvoiceAuthorityFormJson;
}

function fiscalYearFromDate(date: string): number {
  const year = Number.parseInt(date.slice(0, 4), 10);
  if (Number.isInteger(year) && year >= 2000 && year <= 2100) return year;
  return new Date().getFullYear();
}

function normalizeIssuerNif(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function sanitizeSeriesCode(value: string, fallback: string): string {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/[-_.]+$/g, "")
    .replace(/^[-_.]+/g, "")
    .slice(0, 24);
  return sanitized || fallback;
}

export function deriveCentralInvoiceAuthorityInvoiceSeries(input: {
  profile: BusinessProfile;
  date: string;
}): CentralInvoiceAuthorityFormIssueRequest["series"] {
  const fiscalYear = fiscalYearFromDate(input.date);
  const numbering = normalizeNumbering(input.profile.numbering);
  const template = numbering.formats.factura.template;
  const beforeNumber = template.split("{num}")[0] ?? "";
  const expandedPrefix = beforeNumber.replace(/\{year\}/g, String(fiscalYear));
  const fallback = `F-${fiscalYear}`;

  return {
    environment:
      input.profile.verifactu?.environment === "production"
        ? "production"
        : "test",
    issuerNif: normalizeIssuerNif(input.profile.nif),
    seriesCode: sanitizeSeriesCode(expandedPrefix, fallback),
    fiscalYear,
  };
}

export function shouldUseCentralInvoiceAuthorityDocumentFormCanary(
  input: CentralInvoiceAuthorityDocumentFormCanaryInput,
): boolean {
  return (
    input.type === "factura" &&
    !input.existing &&
    input.resolvedStatus !== "borrador" &&
    !input.payload.rectification
  );
}

export function buildCentralInvoiceAuthorityDocumentFormIssueRequest(
  input: BuildCentralInvoiceAuthorityDocumentFormIssueRequestInput,
): CentralInvoiceAuthorityFormIssueRequest {
  const provisionalDocument: Document = attachIssuerSnapshot(
    {
      ...input.payload,
      id: input.localDocumentId,
      number: CENTRAL_INVOICE_AUTHORITY_PENDING_NUMBER,
      createdAt: input.issuedAt,
      updatedAt: input.issuedAt,
    },
    input.profile,
  );
  const emittedSnapshot = buildDocumentSnapshot(
    provisionalDocument,
    input.profile,
    { capturedAt: input.issuedAt, issuer: provisionalDocument.issuer },
  );
  const documentPayload = {
    schema: CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY,
    localDocumentId: input.localDocumentId,
    document: provisionalDocument,
    pendingNumber: CENTRAL_INVOICE_AUTHORITY_PENDING_NUMBER,
  };
  const draftPayload = {
    schema: CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY,
    localDocumentId: input.localDocumentId,
    document: {
      ...provisionalDocument,
      status: "borrador" as const,
      number: "BORRADOR",
      issuer: undefined,
    },
  };

  return {
    kind: "invoice",
    idempotencyKey: `FORM_CANARY:${input.localDocumentId}`,
    draft: {
      localDocumentId: input.localDocumentId,
      expectedVersion: 0,
      draftHash: hashJson(draftPayload),
      draftCreatedAt: input.issuedAt,
      draftUpdatedAt: input.issuedAt,
    },
    series: deriveCentralInvoiceAuthorityInvoiceSeries({
      profile: input.profile,
      date: input.payload.date,
    }),
    issuedAt: input.issuedAt,
    documentPayload: toJson(documentPayload),
    emittedSnapshot: toJson(emittedSnapshot),
    emittedHash: hashJson(emittedSnapshot),
  };
}
