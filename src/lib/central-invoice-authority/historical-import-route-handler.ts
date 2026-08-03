import { createHash } from "node:crypto";

import { CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY } from "./document-form-canary";
import {
  evaluateCentralInvoiceAuthorityActivation,
  type CentralInvoiceAuthorityActivation,
} from "./activation";
import {
  CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_NUMBERS,
  CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_USER_ID,
} from "./historical-import-scope";
import type { CentralInvoiceAuthorityJson } from "./issue-rpc-adapter";

assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_ROUTE =
  "CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_ROUTE_V1";

const TARGET_NUMBERS = new Set<string>(
  CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_NUMBERS,
);

export interface CentralInvoiceAuthorityHistoricalImportRouteAuth {
  userId: string;
  sessionId: string;
  userEmail?: string | null;
}

type CentralInvoiceAuthorityHistoricalImportMode =
  | "cutover_batch"
  | "on_demand_original";

export type CentralInvoiceAuthorityHistoricalImportRouteDeviceGateResult =
  | { allowed: true; deviceId: string }
  | { allowed: false; status: number; code: string; message: string };

export type CentralInvoiceAuthorityHistoricalImportRouteRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      status: number;
      body: unknown;
      headers?: Record<string, string>;
    };

export interface CentralInvoiceAuthorityHistoricalImportRpcArgs {
  p_user_id: string;
  p_device_id: string;
  p_session_hash: string;
  p_idempotency_key_hash: string;
  p_request_hash: string;
  p_local_document_id: string;
  p_expected_full_number: string;
  p_sequence: number;
  p_environment: "test" | "production";
  p_issuer_nif: string;
  p_series_code: string;
  p_fiscal_year: number;
  p_issued_at: string;
  p_document_payload: CentralInvoiceAuthorityJson;
  p_emitted_snapshot: CentralInvoiceAuthorityJson;
  p_emitted_hash: string;
}

export interface CentralInvoiceAuthorityHistoricalImportRpcClient {
  rpc(
    name: "import_central_invoice_historical_v1",
    args: CentralInvoiceAuthorityHistoricalImportRpcArgs,
  ): Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
}

export interface CentralInvoiceAuthorityHistoricalImportRouteDependencies {
  authenticate(
    authorization: string | null,
  ): Promise<CentralInvoiceAuthorityHistoricalImportRouteAuth | null>;
  rateLimit(
    request: CentralInvoiceAuthorityHistoricalImportRouteRequest,
    userId: string,
  ): Promise<CentralInvoiceAuthorityHistoricalImportRouteRateLimitResult>;
  verifyDevice(input: {
    userId: string;
    sessionId: string;
    token: string | null;
    userAgent: string | null;
  }): Promise<CentralInvoiceAuthorityHistoricalImportRouteDeviceGateResult>;
  evaluateActivation?: (input: {
    userId: string;
    userEmail?: string | null;
  }) => CentralInvoiceAuthorityActivation;
  getRpcClient(): CentralInvoiceAuthorityHistoricalImportRpcClient | null;
}

export interface CentralInvoiceAuthorityHistoricalImportRouteRequest {
  method: string;
  headers: Headers;
  readBody?: () => Promise<string>;
}

export interface CentralInvoiceAuthorityHistoricalImportRouteResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

interface ParsedHistoricalInvoiceImport {
  fullNumber: string;
  sequence: number;
  seriesCode: string;
  fiscalYear: number;
  environment: "test" | "production";
  issuerNif: string;
  localDocumentId: string;
  issuedAt: string;
  documentPayload: CentralInvoiceAuthorityJson;
  emittedSnapshot: CentralInvoiceAuthorityJson;
  emittedHash: string;
}

interface HistoricalImportRpcRow {
  result_status?: unknown;
  document_id?: unknown;
  identity_id?: unknown;
  outbox_event_id?: unknown;
  full_number?: unknown;
  sequence?: unknown;
  document_version?: unknown;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La importacion historica central solo puede cargarse en servidor.",
    );
  }
}

function privateHeaders(extra: Record<string, string> = {}) {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    Vary: "Authorization, X-Factu-Device-Token",
    ...extra,
  };
}

function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): CentralInvoiceAuthorityHistoricalImportRouteResponse {
  return { status, body, headers: privateHeaders(headers) };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

function sha256Json(value: unknown): string {
  return `sha256:${sha256(stableJson(value))}`;
}

function toJson(value: unknown): CentralInvoiceAuthorityJson {
  return JSON.parse(JSON.stringify(value)) as CentralInvoiceAuthorityJson;
}

function normalizeInvoiceNumber(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeIssuerNif(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, "").toUpperCase();
  return normalized ? normalized : null;
}

function parseNumber(
  value: unknown,
  mode: CentralInvoiceAuthorityHistoricalImportMode,
): {
  fullNumber: string;
  sequence: number;
  seriesCode: string;
  fiscalYear: number;
} | null {
  if (typeof value !== "string") return null;
  const fullNumber = normalizeInvoiceNumber(value);
  if (mode === "cutover_batch" && !TARGET_NUMBERS.has(fullNumber)) return null;
  const match = /^([A-Z0-9][A-Z0-9._-]{0,22}-(\d{4}))-(\d{4})$/.exec(
    fullNumber,
  );
  if (!match) return null;
  const fiscalYear = Number.parseInt(match[2]!, 10);
  const sequence = Number.parseInt(match[3]!, 10);
  if (
    !Number.isInteger(fiscalYear) ||
    !Number.isInteger(sequence) ||
    sequence <= 0 ||
    (mode === "cutover_batch" &&
      (fiscalYear !== 2026 || sequence < 2959 || sequence > 2965))
  ) {
    return null;
  }
  return {
    fullNumber,
    sequence,
    seriesCode: match[1]!,
    fiscalYear,
  };
}

function validIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  if (Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function issuedAtForDocument(document: Record<string, unknown>): string | null {
  return (
    validIsoDate(document.issuedAt) ??
    validIsoDate(document.sentAt) ??
    (typeof document.date === "string"
      ? validIsoDate(`${document.date}T00:00:00.000Z`)
      : null)
  );
}

function environmentForSnapshot(snapshot: Record<string, unknown>) {
  const fiscalContext = isObject(snapshot.fiscalContext)
    ? snapshot.fiscalContext
    : {};
  const verifactu = isObject(fiscalContext.verifactu)
    ? fiscalContext.verifactu
    : {};
  return verifactu.environment === "production" ? "production" : "test";
}

function documentForEventPayload(
  document: Record<string, unknown>,
): Record<string, unknown> {
  const payload = { ...document };
  delete payload.documentSnapshot;
  delete payload.pdfSnapshot;
  delete payload.snapshotSeal;
  delete payload.snapshotIntegrity;
  delete payload.snapshotIntegrityRequired;
  delete payload.centralInvoiceAuthority;
  return payload;
}

function parseImportDocument(
  value: unknown,
  mode: CentralInvoiceAuthorityHistoricalImportMode,
): ParsedHistoricalInvoiceImport {
  if (!isObject(value)) throw new Error("INVALID_DOCUMENT_PAYLOAD");
  if (value.type !== "factura") throw new Error("INVALID_DOCUMENT_TYPE");
  if (value.status === "borrador") throw new Error("DRAFT_DOCUMENT_NOT_ALLOWED");
  if (value.rectification) throw new Error("RECTIFICATION_NOT_ALLOWED");
  if (typeof value.id !== "string" || !value.id.trim()) {
    throw new Error("INVALID_LOCAL_DOCUMENT_ID");
  }
  if (
    typeof value.date !== "string" ||
    !isObject(value.client) ||
    !Array.isArray(value.items) ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    throw new Error("INCOMPLETE_DOCUMENT_PAYLOAD");
  }

  const number = parseNumber(value.number, mode);
  if (!number) throw new Error("DOCUMENT_NUMBER_NOT_ALLOWED");
  if (Number.parseInt(value.date.slice(0, 4), 10) !== number.fiscalYear) {
    throw new Error("DOCUMENT_FISCAL_YEAR_MISMATCH");
  }

  const snapshot = isObject(value.documentSnapshot)
    ? value.documentSnapshot
    : null;
  if (!snapshot) throw new Error("MISSING_DOCUMENT_SNAPSHOT");
  if (normalizeInvoiceNumber(String(snapshot.number ?? "")) !== number.fullNumber) {
    throw new Error("DOCUMENT_SNAPSHOT_NUMBER_MISMATCH");
  }
  const issuer = isObject(snapshot.issuer) ? snapshot.issuer : null;
  const issuerNif = normalizeIssuerNif(issuer?.nif);
  if (!issuerNif) throw new Error("DOCUMENT_SNAPSHOT_ISSUER_MISSING");

  const issuedAt = issuedAtForDocument(value);
  if (!issuedAt) throw new Error("DOCUMENT_ISSUED_AT_MISSING");

  const eventDocument = documentForEventPayload(value);
  const documentPayload = toJson({
    schema: CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY,
    localDocumentId: value.id,
    document: eventDocument,
    historicalImport: true,
  });
  const emittedSnapshot = toJson(snapshot);

  return {
    ...number,
    environment: environmentForSnapshot(snapshot),
    issuerNif,
    localDocumentId: value.id,
    issuedAt,
    documentPayload,
    emittedSnapshot,
    emittedHash: sha256Json(emittedSnapshot),
  };
}

function parseBody(raw: string): {
  mode: CentralInvoiceAuthorityHistoricalImportMode;
  invoices: ParsedHistoricalInvoiceImport[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("INVALID_JSON");
  }
  if (!isObject(parsed) || !Array.isArray(parsed.documents)) {
    throw new Error("INVALID_BODY");
  }
  const mode: CentralInvoiceAuthorityHistoricalImportMode =
    parsed.mode === "on_demand_original"
      ? "on_demand_original"
      : parsed.mode === undefined || parsed.mode === "cutover_batch"
        ? "cutover_batch"
        : (() => {
            throw new Error("INVALID_IMPORT_MODE");
          })();
  const expectedCount =
    mode === "cutover_batch"
      ? CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_NUMBERS.length
      : 1;
  if (parsed.documents.length !== expectedCount) {
    throw new Error("INVALID_DOCUMENT_COUNT");
  }

  const imports = parsed.documents.map((document) =>
    parseImportDocument(document, mode),
  );
  const byNumber = new Map(imports.map((item) => [item.fullNumber, item]));
  if (byNumber.size !== imports.length) {
    throw new Error("DUPLICATE_DOCUMENT_NUMBER");
  }
  if (mode === "cutover_batch") {
    for (const target of CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_NUMBERS) {
      if (!byNumber.has(target)) throw new Error("MISSING_TARGET_DOCUMENT");
    }
    return {
      mode,
      invoices: CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_NUMBERS.map(
        (target) => byNumber.get(target)!,
      ),
    };
  }
  return { mode, invoices: imports };
}

function requestHashPayload(input: {
  auth: CentralInvoiceAuthorityHistoricalImportRouteAuth;
  deviceId: string;
  item: ParsedHistoricalInvoiceImport;
}) {
  return {
    schema: CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_ROUTE,
    userId: input.auth.userId,
    deviceId: input.deviceId,
    localDocumentId: input.item.localDocumentId,
    fullNumber: input.item.fullNumber,
    sequence: input.item.sequence,
    environment: input.item.environment,
    issuerNif: input.item.issuerNif,
    seriesCode: input.item.seriesCode,
    fiscalYear: input.item.fiscalYear,
    issuedAt: input.item.issuedAt,
    documentPayloadHash: sha256Json(input.item.documentPayload),
    emittedSnapshotHash: input.item.emittedHash,
  };
}

function buildRpcArgs(input: {
  auth: CentralInvoiceAuthorityHistoricalImportRouteAuth;
  deviceId: string;
  item: ParsedHistoricalInvoiceImport;
}): CentralInvoiceAuthorityHistoricalImportRpcArgs {
  const idempotencyKey =
    `CENTRAL_HISTORICAL_IMPORT:${input.auth.userId}:` +
    `${input.item.localDocumentId}:${input.item.fullNumber}`;
  return {
    p_user_id: input.auth.userId,
    p_device_id: input.deviceId,
    p_session_hash: sha256(input.auth.sessionId),
    p_idempotency_key_hash: sha256(idempotencyKey),
    p_request_hash: sha256(stableJson(requestHashPayload(input))),
    p_local_document_id: input.item.localDocumentId,
    p_expected_full_number: input.item.fullNumber,
    p_sequence: input.item.sequence,
    p_environment: input.item.environment,
    p_issuer_nif: input.item.issuerNif,
    p_series_code: input.item.seriesCode,
    p_fiscal_year: input.item.fiscalYear,
    p_issued_at: input.item.issuedAt,
    p_document_payload: input.item.documentPayload,
    p_emitted_snapshot: input.item.emittedSnapshot,
    p_emitted_hash: input.item.emittedHash,
  };
}

function parseRpcRow(
  row: unknown,
  mode: CentralInvoiceAuthorityHistoricalImportMode,
) {
  const value = Array.isArray(row) ? row[0] : row;
  if (!isObject(value)) throw new Error("INVALID_RPC_RESULT");
  const result = value as HistoricalImportRpcRow;
  if (
    result.result_status !== "committed" &&
    result.result_status !== "replayed" &&
    result.result_status !== "already_present"
  ) {
    throw new Error("INVALID_RPC_RESULT");
  }
  const number = parseNumber(result.full_number, mode);
  if (!number) throw new Error("INVALID_RPC_RESULT");
  if (
    result.sequence !== number.sequence ||
    typeof result.document_id !== "string" ||
    !result.document_id.trim() ||
    typeof result.identity_id !== "string" ||
    !result.identity_id.trim() ||
    typeof result.outbox_event_id !== "string" ||
    !result.outbox_event_id.trim() ||
    typeof result.document_version !== "number" ||
    !Number.isInteger(result.document_version) ||
    result.document_version <= 0
  ) {
    throw new Error("INVALID_RPC_RESULT");
  }
  return {
    status: result.result_status,
    documentId: result.document_id,
    identityId: result.identity_id,
    outboxEventId: result.outbox_event_id,
    fullNumber: number.fullNumber,
    sequence: number.sequence,
    documentVersion: result.document_version,
  };
}

function counts(
  imported: Array<ReturnType<typeof parseRpcRow>>,
): { committed: number; replayed: number; alreadyPresent: number } {
  return {
    committed: imported.filter((item) => item.status === "committed").length,
    replayed: imported.filter((item) => item.status === "replayed").length,
    alreadyPresent: imported.filter((item) => item.status === "already_present")
      .length,
  };
}

export function createCentralInvoiceAuthorityHistoricalImportRouteHandler(
  dependencies: CentralInvoiceAuthorityHistoricalImportRouteDependencies,
) {
  return {
    async handle(
      request: CentralInvoiceAuthorityHistoricalImportRouteRequest,
    ): Promise<CentralInvoiceAuthorityHistoricalImportRouteResponse> {
      if (request.method === "OPTIONS") {
        return json(204, { ok: true }, { Allow: "POST, OPTIONS" });
      }
      if (request.method !== "POST") {
        return json(
          405,
          { ok: false, error: { code: "METHOD_NOT_ALLOWED" } },
          { Allow: "POST, OPTIONS" },
        );
      }

      const auth = await dependencies.authenticate(
        request.headers.get("authorization"),
      );
      if (!auth) {
        return json(401, { ok: false, error: { code: "UNAUTHORIZED" } });
      }

      const rateLimit = await dependencies.rateLimit(request, auth.userId);
      if (!rateLimit.allowed) {
        return json(rateLimit.status, rateLimit.body, rateLimit.headers);
      }

      const device = await dependencies.verifyDevice({
        userId: auth.userId,
        sessionId: auth.sessionId,
        token: request.headers.get("x-factu-device-token"),
        userAgent: request.headers.get("user-agent"),
      });
      if (!device.allowed) {
        return json(device.status, {
          ok: false,
          error: { code: device.code, message: device.message },
        });
      }

      let importMode: CentralInvoiceAuthorityHistoricalImportMode;
      let invoices: ParsedHistoricalInvoiceImport[];
      try {
        const parsed = parseBody(
          await (request.readBody?.() ?? Promise.resolve("")),
        );
        importMode = parsed.mode;
        invoices = parsed.invoices;
      } catch (error) {
        const code =
          error instanceof Error ? error.message : "INVALID_REQUEST_BODY";
        return json(code === "REQUEST_BODY_TOO_LARGE" ? 413 : 400, {
          ok: false,
          error: { code },
        });
      }

      if (
        importMode === "cutover_batch" &&
        auth.userId !== CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_USER_ID
      ) {
        return json(403, {
          ok: false,
          error: { code: "CENTRAL_HISTORICAL_IMPORT_NOT_ALLOWED" },
        });
      }
      if (importMode === "on_demand_original") {
        const activation = (
          dependencies.evaluateActivation ??
          ((input) => evaluateCentralInvoiceAuthorityActivation(input))
        )({ userId: auth.userId, userEmail: auth.userEmail });
        if (!activation.fiscalWritesEnabled) {
          return json(409, {
            ok: false,
            error: {
              code: "CENTRAL_HISTORICAL_IMPORT_AUTHORITY_DISABLED",
              message:
                "La autoridad central no admite el registro de esta factura original.",
            },
          });
        }
      }

      const rpcClient = dependencies.getRpcClient();
      if (!rpcClient) {
        return json(503, {
          ok: false,
          error: { code: "CENTRAL_HISTORICAL_IMPORT_RPC_UNAVAILABLE" },
        });
      }

      const imported: Array<ReturnType<typeof parseRpcRow>> = [];
      try {
        for (const item of invoices) {
          const { data, error } = await rpcClient.rpc(
            "import_central_invoice_historical_v1",
            buildRpcArgs({ auth, deviceId: device.deviceId, item }),
          );
          if (error) {
            return json(409, {
              ok: false,
              error: {
                code: "CENTRAL_HISTORICAL_IMPORT_RPC_REJECTED",
                causeCode: error.code,
              },
            });
          }
          imported.push(parseRpcRow(data, importMode));
        }
      } catch (error) {
        return json(500, {
          ok: false,
          error: {
            code:
              error instanceof Error
                ? error.message
                : "CENTRAL_HISTORICAL_IMPORT_FAILED",
          },
        });
      }

      return json(200, {
        ok: true,
        schema: CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_ROUTE,
        imported,
        counts: counts(imported),
      });
    },
  };
}
