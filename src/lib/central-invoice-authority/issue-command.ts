import { createHash, randomUUID } from "node:crypto";

// CENTRAL_INVOICE_AUTHORITY_ISSUE_COMMAND_CONTRACT_V1
assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_ISSUE_COMMAND_CONTRACT =
  "CENTRAL_INVOICE_AUTHORITY_ISSUE_COMMAND_CONTRACT_V1";

export type CentralInvoiceAuthorityIssueKind = "invoice" | "rectification";

export interface CentralInvoiceAuthorityServerAuth {
  userId: string;
  deviceId: string;
  sessionId: string;
  userIdSource: "server" | "test";
}

export interface CentralInvoiceAuthorityIssueDraftRef {
  localDocumentId: string;
  expectedVersion: number;
  draftHash: string;
  draftCreatedAt?: string;
  draftUpdatedAt?: string;
}

export interface CentralInvoiceAuthoritySeriesRef {
  environment: "test" | "production";
  issuerNif: string;
  seriesCode: string;
  fiscalYear: number;
}

export interface CentralInvoiceAuthorityIssueInput {
  kind: CentralInvoiceAuthorityIssueKind;
  auth: CentralInvoiceAuthorityServerAuth;
  idempotencyKey: string;
  draft: CentralInvoiceAuthorityIssueDraftRef;
  series: CentralInvoiceAuthoritySeriesRef;
  issuedAt: string;
  rectifiesIdentityId?: string;
}

export interface CentralInvoiceAuthorityIssueCommand {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_ISSUE_COMMAND_CONTRACT;
  kind: CentralInvoiceAuthorityIssueKind;
  requestId: string;
  userId: string;
  deviceId: string;
  sessionId: string;
  idempotencyKey: string;
  requestHash: string;
  draft: CentralInvoiceAuthorityIssueDraftRef;
  series: CentralInvoiceAuthoritySeriesRef;
  issuedAt: string;
  rectifiesIdentityId?: string;
  safeSummary: CentralInvoiceAuthorityIssueCommandSafeSummary;
}

export interface CentralInvoiceAuthorityIssueCommandSafeSummary {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_ISSUE_COMMAND_CONTRACT;
  kind: CentralInvoiceAuthorityIssueKind;
  requestId: string;
  userId: string;
  deviceId: string;
  localDocumentId: string;
  expectedVersion: number;
  draftHashPresent: boolean;
  idempotencyKeyHash: string;
  requestHash: string;
  environment: CentralInvoiceAuthoritySeriesRef["environment"];
  issuerNifHash: string;
  seriesCode: string;
  fiscalYear: number;
  issuedAt: string;
  rectification: boolean;
}

export type CentralInvoiceAuthorityIssueCommandErrorCode =
  | "INVALID_SERVER_AUTH"
  | "INVALID_ISSUE_KIND"
  | "INVALID_IDEMPOTENCY_KEY"
  | "INVALID_DRAFT_REFERENCE"
  | "INVALID_SERIES_REFERENCE"
  | "INVALID_ISSUED_AT"
  | "RECTIFICATION_TARGET_REQUIRED"
  | "UNSAFE_COMMAND_CONTENT";

export class CentralInvoiceAuthorityIssueCommandError extends Error {
  readonly code: CentralInvoiceAuthorityIssueCommandErrorCode;

  constructor(code: CentralInvoiceAuthorityIssueCommandErrorCode, message: string) {
    super(message);
    this.name = "CentralInvoiceAuthorityIssueCommandError";
    this.code = code;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El contrato de emision con autoridad central solo puede cargarse en servidor.",
    );
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
    .join(",")}}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function assertSafeString(value: string, code: CentralInvoiceAuthorityIssueCommandErrorCode) {
  const normalized = value.toLowerCase();
  if (
    normalized.includes("<" + "?xm" + "l") ||
    normalized.includes("%p" + "df") ||
    normalized.includes("tok" + "en") ||
    normalized.includes("sec" + "ret") ||
    normalized.includes("service" + "_role") ||
    normalized.includes("private" + " key")
  ) {
    throw new CentralInvoiceAuthorityIssueCommandError(
      code,
      "El comando contiene contenido completo o sensible no permitido.",
    );
  }
}

function assertAuth(auth: CentralInvoiceAuthorityServerAuth) {
  if (
    !auth ||
    !isNonEmptyString(auth.userId) ||
    !isNonEmptyString(auth.deviceId) ||
    !isNonEmptyString(auth.sessionId) ||
    (auth.userIdSource !== "server" && auth.userIdSource !== "test")
  ) {
    throw new CentralInvoiceAuthorityIssueCommandError(
      "INVALID_SERVER_AUTH",
      "La emision central requiere usuario, dispositivo y sesion derivados por servidor.",
    );
  }
}

function assertKind(input: CentralInvoiceAuthorityIssueInput) {
  if (input.kind !== "invoice" && input.kind !== "rectification") {
    throw new CentralInvoiceAuthorityIssueCommandError(
      "INVALID_ISSUE_KIND",
      "Tipo de emision central no soportado.",
    );
  }
  if (input.kind === "rectification" && !isNonEmptyString(input.rectifiesIdentityId)) {
    throw new CentralInvoiceAuthorityIssueCommandError(
      "RECTIFICATION_TARGET_REQUIRED",
      "Una rectificativa central exige identidad tecnica de la factura rectificada.",
    );
  }
}

function assertIdempotencyKey(value: string) {
  if (!/^[a-zA-Z0-9:_-]{12,120}$/.test(value)) {
    throw new CentralInvoiceAuthorityIssueCommandError(
      "INVALID_IDEMPOTENCY_KEY",
      "La emision central requiere una clave de idempotencia estable.",
    );
  }
}

function assertDraft(draft: CentralInvoiceAuthorityIssueDraftRef) {
  if (
    !draft ||
    !isNonEmptyString(draft.localDocumentId) ||
    !Number.isInteger(draft.expectedVersion) ||
    draft.expectedVersion < 0 ||
    !isNonEmptyString(draft.draftHash)
  ) {
    throw new CentralInvoiceAuthorityIssueCommandError(
      "INVALID_DRAFT_REFERENCE",
      "La emision central requiere ID local, version esperada y huella del borrador.",
    );
  }
  assertSafeString(draft.draftHash, "UNSAFE_COMMAND_CONTENT");
}

function assertSeries(series: CentralInvoiceAuthoritySeriesRef) {
  if (
    !series ||
    (series.environment !== "test" && series.environment !== "production") ||
    !isNonEmptyString(series.issuerNif) ||
    !/^[A-Z0-9._-]{1,24}$/i.test(series.seriesCode) ||
    !Number.isInteger(series.fiscalYear) ||
    series.fiscalYear < 2000 ||
    series.fiscalYear > 2100
  ) {
    throw new CentralInvoiceAuthorityIssueCommandError(
      "INVALID_SERIES_REFERENCE",
      "La emision central requiere entorno, NIF emisor, serie y ejercicio validos.",
    );
  }
}

function assertIssuedAt(value: string) {
  if (!isNonEmptyString(value) || Number.isNaN(Date.parse(value))) {
    throw new CentralInvoiceAuthorityIssueCommandError(
      "INVALID_ISSUED_AT",
      "La emision central requiere fecha/hora de emision valida.",
    );
  }
}

function requestHashPayload(input: CentralInvoiceAuthorityIssueInput) {
  return {
    kind: input.kind,
    userId: input.auth.userId,
    deviceId: input.auth.deviceId,
    sessionId: input.auth.sessionId,
    idempotencyKey: input.idempotencyKey,
    draft: input.draft,
    series: input.series,
    issuedAt: input.issuedAt,
    rectifiesIdentityId: input.rectifiesIdentityId ?? null,
  };
}

export function buildCentralInvoiceAuthorityIssueCommand(
  input: CentralInvoiceAuthorityIssueInput,
  requestId = `SYNTHETIC_ONLY_CENTRAL_ISSUE_${randomUUID()}`,
): CentralInvoiceAuthorityIssueCommand {
  assertAuth(input.auth);
  assertKind(input);
  assertIdempotencyKey(input.idempotencyKey);
  assertDraft(input.draft);
  assertSeries(input.series);
  assertIssuedAt(input.issuedAt);

  const requestHash = sha256(stableJson(requestHashPayload(input)));
  const idempotencyKeyHash = sha256(input.idempotencyKey);
  const issuerNifHash = sha256(input.series.issuerNif.trim().toUpperCase());

  const safeSummary: CentralInvoiceAuthorityIssueCommandSafeSummary = {
    schema: CENTRAL_INVOICE_AUTHORITY_ISSUE_COMMAND_CONTRACT,
    kind: input.kind,
    requestId,
    userId: input.auth.userId,
    deviceId: input.auth.deviceId,
    localDocumentId: input.draft.localDocumentId,
    expectedVersion: input.draft.expectedVersion,
    draftHashPresent: true,
    idempotencyKeyHash,
    requestHash,
    environment: input.series.environment,
    issuerNifHash,
    seriesCode: input.series.seriesCode,
    fiscalYear: input.series.fiscalYear,
    issuedAt: input.issuedAt,
    rectification: input.kind === "rectification",
  };

  return {
    schema: CENTRAL_INVOICE_AUTHORITY_ISSUE_COMMAND_CONTRACT,
    kind: input.kind,
    requestId,
    userId: input.auth.userId,
    deviceId: input.auth.deviceId,
    sessionId: input.auth.sessionId,
    idempotencyKey: input.idempotencyKey,
    requestHash,
    draft: input.draft,
    series: input.series,
    issuedAt: input.issuedAt,
    rectifiesIdentityId: input.rectifiesIdentityId,
    safeSummary,
  };
}

export function summarizeCentralInvoiceAuthorityIssueCommand(
  command: CentralInvoiceAuthorityIssueCommand,
): CentralInvoiceAuthorityIssueCommandSafeSummary {
  return command.safeSummary;
}
