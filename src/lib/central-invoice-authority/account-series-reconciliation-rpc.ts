import { createHash } from "node:crypto";

import type { CentralInvoiceAuthorityAccountSeriesSummary } from "./account-series-inventory";

assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_RPC =
  "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_RPC_V1";

export interface CentralInvoiceAuthorityAccountSeriesReconciliationRpcArgs {
  p_user_id: string;
  p_device_id: string;
  p_session_hash: string;
  p_idempotency_key_hash: string;
  p_request_hash: string;
  p_environment: "test" | "production";
  p_issuer_nif: string;
  p_series_code: string;
  p_fiscal_year: number;
  p_observed_max_sequence: number;
  p_source_document_count: number;
  p_source_digest: string;
}

export interface CentralInvoiceAuthorityAccountSeriesReconciliationRpcClient {
  rpc(
    name: "reconcile_central_invoice_series_v1",
    args: CentralInvoiceAuthorityAccountSeriesReconciliationRpcArgs,
  ): Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
}

export interface CentralInvoiceAuthorityAccountSeriesReconciliationRpcInput {
  userId: string;
  deviceId: string;
  sessionId: string;
  summary: CentralInvoiceAuthorityAccountSeriesSummary;
}

export interface CentralInvoiceAuthorityAccountSeriesReconciliationRpcResult {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_RPC;
  status: "committed" | "replayed";
  reconciliationId: string;
  previousSequence: number;
  resultingSequence: number;
  seriesCode: string;
  fiscalYear: number;
}

export class CentralInvoiceAuthorityAccountSeriesReconciliationRpcError extends Error {
  readonly code: "INVALID_RPC_INPUT" | "RPC_REJECTED" | "INVALID_RPC_RESULT";
  readonly causeCode?: string;

  constructor(
    code: "INVALID_RPC_INPUT" | "RPC_REJECTED" | "INVALID_RPC_RESULT",
    message: string,
    causeCode?: string,
  ) {
    super(message);
    this.name =
      "CentralInvoiceAuthorityAccountSeriesReconciliationRpcError";
    this.code = code;
    this.causeCode = causeCode;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La reconciliacion de series centrales solo puede ejecutarse en servidor.",
    );
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isValidSummary(
  summary: CentralInvoiceAuthorityAccountSeriesSummary,
): boolean {
  return (
    (summary.environment === "test" ||
      summary.environment === "production") &&
    /^[A-Z0-9]{3,20}$/.test(summary.issuerNif) &&
    /^[A-Z0-9._-]{1,24}$/i.test(summary.seriesCode) &&
    Number.isInteger(summary.fiscalYear) &&
    summary.fiscalYear >= 2000 &&
    summary.fiscalYear <= 2100 &&
    Number.isInteger(summary.observedMaxSequence) &&
    summary.observedMaxSequence >= 0 &&
    summary.observedMaxSequence <= 999_999 &&
    Number.isInteger(summary.sourceDocumentCount) &&
    summary.sourceDocumentCount >= 0 &&
    summary.sourceDocumentCount <= 1_000_000 &&
    /^sha256:[0-9a-f]{64}$/.test(summary.sourceDigest)
  );
}

function requestMaterial(
  input: CentralInvoiceAuthorityAccountSeriesReconciliationRpcInput,
): string {
  const { summary } = input;
  return JSON.stringify({
    schema: CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_RPC,
    userId: input.userId,
    deviceId: input.deviceId,
    environment: summary.environment,
    issuerNif: summary.issuerNif,
    seriesCode: summary.seriesCode,
    fiscalYear: summary.fiscalYear,
    observedMaxSequence: summary.observedMaxSequence,
    sourceDocumentCount: summary.sourceDocumentCount,
    sourceDigest: summary.sourceDigest,
  });
}

export function buildCentralInvoiceAuthorityAccountSeriesReconciliationRpcArgs(
  input: CentralInvoiceAuthorityAccountSeriesReconciliationRpcInput,
): CentralInvoiceAuthorityAccountSeriesReconciliationRpcArgs {
  if (
    !input.userId.trim() ||
    !input.deviceId.trim() ||
    !input.sessionId.trim() ||
    !isValidSummary(input.summary)
  ) {
    throw new CentralInvoiceAuthorityAccountSeriesReconciliationRpcError(
      "INVALID_RPC_INPUT",
      "La reconciliacion de serie central contiene datos invalidos.",
    );
  }

  const request = requestMaterial(input);
  const idempotency = [
    "ACCOUNT_SERIES_RECONCILIATION_V1",
    input.userId,
    input.summary.environment,
    input.summary.issuerNif,
    input.summary.seriesCode,
    input.summary.fiscalYear,
    input.summary.sourceDigest,
  ].join(":");

  return {
    p_user_id: input.userId,
    p_device_id: input.deviceId,
    p_session_hash: sha256(input.sessionId),
    p_idempotency_key_hash: sha256(idempotency),
    p_request_hash: sha256(request),
    p_environment: input.summary.environment,
    p_issuer_nif: input.summary.issuerNif,
    p_series_code: input.summary.seriesCode,
    p_fiscal_year: input.summary.fiscalYear,
    p_observed_max_sequence: input.summary.observedMaxSequence,
    p_source_document_count: input.summary.sourceDocumentCount,
    p_source_digest: input.summary.sourceDigest,
  };
}

function parseRpcResult(
  data: unknown,
  summary: CentralInvoiceAuthorityAccountSeriesSummary,
): CentralInvoiceAuthorityAccountSeriesReconciliationRpcResult {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new CentralInvoiceAuthorityAccountSeriesReconciliationRpcError(
      "INVALID_RPC_RESULT",
      "La RPC de reconciliacion no devolvio una fila.",
    );
  }
  const value = row as Record<string, unknown>;
  if (
    (value.result_status !== "committed" &&
      value.result_status !== "replayed") ||
    typeof value.reconciliation_id !== "string" ||
    typeof value.previous_sequence !== "number" ||
    typeof value.resulting_sequence !== "number" ||
    value.resulting_sequence < summary.observedMaxSequence
  ) {
    throw new CentralInvoiceAuthorityAccountSeriesReconciliationRpcError(
      "INVALID_RPC_RESULT",
      "La RPC de reconciliacion devolvio un resultado incompleto.",
    );
  }

  return {
    schema: CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_RPC,
    status: value.result_status,
    reconciliationId: value.reconciliation_id,
    previousSequence: value.previous_sequence,
    resultingSequence: value.resulting_sequence,
    seriesCode: summary.seriesCode,
    fiscalYear: summary.fiscalYear,
  };
}

export async function reconcileCentralInvoiceAuthorityAccountSeriesThroughRpc(
  client: CentralInvoiceAuthorityAccountSeriesReconciliationRpcClient,
  input: CentralInvoiceAuthorityAccountSeriesReconciliationRpcInput,
): Promise<CentralInvoiceAuthorityAccountSeriesReconciliationRpcResult> {
  const args =
    buildCentralInvoiceAuthorityAccountSeriesReconciliationRpcArgs(input);
  const { data, error } = await client.rpc(
    "reconcile_central_invoice_series_v1",
    args,
  );
  if (error) {
    throw new CentralInvoiceAuthorityAccountSeriesReconciliationRpcError(
      "RPC_REJECTED",
      "Supabase rechazo la reconciliacion de la serie central.",
      error.code,
    );
  }
  return parseRpcResult(data, input.summary);
}
