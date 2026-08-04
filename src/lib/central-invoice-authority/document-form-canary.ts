import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";
import {
  buildDocumentSnapshot,
  stableStringifySnapshot,
} from "@/lib/document-integrity/snapshots";
import { attachIssuerSnapshot } from "@/lib/issuer-snapshot";
import { normalizeNumbering } from "@/lib/numbering";
import type {
  BusinessProfile,
  Document,
  DocumentKind,
  DocumentType,
  RectificationInfo,
} from "@/lib/types";

import type {
  CentralInvoiceAuthorityFormIssueRequest,
  CentralInvoiceAuthorityFormJson,
} from "./form-canary-client";

export const CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY =
  "CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY_V1";

export const CENTRAL_INVOICE_AUTHORITY_RECTIFICATION_FORM_CANARY =
  "CENTRAL_INVOICE_AUTHORITY_RECTIFICATION_FORM_CANARY_V1";

export const CENTRAL_INVOICE_AUTHORITY_PENDING_NUMBER =
  "__CENTRAL_AUTHORITY_FULL_NUMBER__";

export type CentralInvoiceAuthorityDocumentFormPayload = Omit<
  Document,
  "id" | "number" | "createdAt" | "updatedAt"
>;

export interface CentralInvoiceAuthorityDocumentFormCanaryInput {
  type: DocumentType;
  existing?: Pick<
    Document,
    "id" | "type" | "status" | "rectification" | "centralInvoiceAuthority"
  > | null;
  payload: CentralInvoiceAuthorityDocumentFormPayload;
  resolvedStatus: Document["status"];
}

export interface BuildCentralInvoiceAuthorityDocumentFormIssueRequestInput {
  localDocumentId: string;
  payload: CentralInvoiceAuthorityDocumentFormPayload;
  profile: BusinessProfile;
  issuedAt: string;
}

export type CentralInvoiceAuthorityRectificationFormPayload =
  CentralInvoiceAuthorityDocumentFormPayload & {
    type: "factura";
    rectification: RectificationInfo;
  };

export interface CentralInvoiceAuthorityRectificationTarget {
  originalDocumentId: string;
  originalIdentityId: string;
  originalFullNumber: string;
  originalDocumentVersion: number;
}

export interface BuildCentralInvoiceAuthorityRectificationFormIssueRequestInput {
  localDocumentId: string;
  payload: CentralInvoiceAuthorityRectificationFormPayload;
  original: Document;
  profile: BusinessProfile;
  issuedAt: string;
}

export interface CentralInvoiceAuthorityRectificationFormCanaryInput {
  original: Pick<Document, "id" | "centralInvoiceAuthority">;
  payload: CentralInvoiceAuthorityRectificationFormPayload;
  resolvedStatus: Document["status"];
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

function deriveCentralInvoiceAuthoritySeries(input: {
  profile: BusinessProfile;
  date: string;
  kind: Extract<DocumentKind, "factura" | "factura_rectificativa">;
  fallbackPrefix: "F" | "FR";
}): CentralInvoiceAuthorityFormIssueRequest["series"] {
  const fiscalYear = fiscalYearFromDate(input.date);
  const numbering = normalizeNumbering(input.profile.numbering);
  const template = numbering.formats[input.kind].template;
  const beforeNumber = template.split("{num}")[0] ?? "";
  const expandedPrefix = beforeNumber.replace(/\{year\}/g, String(fiscalYear));
  const fallback = `${input.fallbackPrefix}-${fiscalYear}`;

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

export function deriveCentralInvoiceAuthorityInvoiceSeries(input: {
  profile: BusinessProfile;
  date: string;
}): CentralInvoiceAuthorityFormIssueRequest["series"] {
  return deriveCentralInvoiceAuthoritySeries({
    ...input,
    kind: "factura",
    fallbackPrefix: "F",
  });
}

export function deriveCentralInvoiceAuthorityRectificationSeries(input: {
  profile: BusinessProfile;
  date: string;
}): CentralInvoiceAuthorityFormIssueRequest["series"] {
  return deriveCentralInvoiceAuthoritySeries({
    ...input,
    kind: "factura_rectificativa",
    fallbackPrefix: "FR",
  });
}

export function shouldUseCentralInvoiceAuthorityDocumentFormCanary(
  input: CentralInvoiceAuthorityDocumentFormCanaryInput,
): boolean {
  const existingDraftEligible =
    !input.existing ||
    (input.existing.type === "factura" &&
      input.existing.status === "borrador" &&
      !input.existing.rectification &&
      !input.existing.centralInvoiceAuthority);

  return (
    input.type === "factura" &&
    existingDraftEligible &&
    input.resolvedStatus !== "borrador" &&
    !input.payload.rectification
  );
}

export function resolveCentralInvoiceAuthorityRectificationTarget(
  original: Pick<
    Document,
    | "id"
    | "type"
    | "number"
    | "status"
    | "rectification"
    | "centralInvoiceAuthority"
  >,
): CentralInvoiceAuthorityRectificationTarget | null {
  if (
    original.type !== "factura" ||
    original.status === "borrador" ||
    original.rectification
  ) {
    return null;
  }

  const link = original.centralInvoiceAuthority;
  if (
    !link ||
    link.source !== "central_invoice_authority" ||
    link.eventType === "rectification_issued" ||
    !link.identityId.trim() ||
    !link.fullNumber.trim() ||
    link.fullNumber !== original.number ||
    !Number.isInteger(link.documentVersion) ||
    link.documentVersion <= 0
  ) {
    return null;
  }

  return {
    originalDocumentId: original.id,
    originalIdentityId: link.identityId,
    originalFullNumber: link.fullNumber,
    originalDocumentVersion: link.documentVersion,
  };
}

export function shouldUseCentralInvoiceAuthorityRectificationFormCanary(
  input: CentralInvoiceAuthorityRectificationFormCanaryInput,
): boolean {
  return (
    input.payload.type === "factura" &&
    input.resolvedStatus !== "borrador" &&
    input.payload.status !== "borrador" &&
    input.payload.rectification.originalDocumentId === input.original.id
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

export function buildCentralInvoiceAuthorityRectificationFormIssueRequest(
  input: BuildCentralInvoiceAuthorityRectificationFormIssueRequestInput,
): CentralInvoiceAuthorityFormIssueRequest {
  const target = resolveCentralInvoiceAuthorityRectificationTarget(
    input.original,
  );
  if (!target) {
    throw new Error(
      "La rectificativa central exige una factura original con identidad central valida.",
    );
  }
  if (
    input.payload.rectification.originalDocumentId !==
      target.originalDocumentId ||
    input.payload.rectification.originalNumber !== target.originalFullNumber
  ) {
    throw new Error(
      "La rectificativa central no coincide con la identidad central original.",
    );
  }

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
    schema: CENTRAL_INVOICE_AUTHORITY_RECTIFICATION_FORM_CANARY,
    localDocumentId: input.localDocumentId,
    rectifies: target,
    document: provisionalDocument,
    pendingNumber: CENTRAL_INVOICE_AUTHORITY_PENDING_NUMBER,
  };
  const draftPayload = {
    schema: CENTRAL_INVOICE_AUTHORITY_RECTIFICATION_FORM_CANARY,
    localDocumentId: input.localDocumentId,
    rectifies: target,
    document: {
      ...provisionalDocument,
      status: "borrador" as const,
      number: "BORRADOR",
      issuer: undefined,
    },
  };

  return {
    kind: "rectification",
    idempotencyKey: `FORM_CANARY_RECTIFICATION:${input.localDocumentId}`,
    draft: {
      localDocumentId: input.localDocumentId,
      expectedVersion: 0,
      draftHash: hashJson(draftPayload),
      draftCreatedAt: input.issuedAt,
      draftUpdatedAt: input.issuedAt,
    },
    series: deriveCentralInvoiceAuthorityRectificationSeries({
      profile: input.profile,
      date: input.payload.date,
    }),
    issuedAt: input.issuedAt,
    rectifiesIdentityId: target.originalIdentityId,
    documentPayload: toJson(documentPayload),
    emittedSnapshot: toJson(emittedSnapshot),
    emittedHash: hashJson(emittedSnapshot),
  };
}
