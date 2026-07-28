"use client";

import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

import type { CentralInvoiceAuthorityAccountSeriesSummary } from "./account-series-inventory";

export const CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_CLIENT =
  "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_CLIENT_V1";

export interface CentralInvoiceAuthorityAccountSeriesReconciliationResult {
  status: "committed" | "replayed";
  reconciliationId: string;
  previousSequence: number;
  resultingSequence: number;
  seriesCode: string;
  fiscalYear: number;
}

export type CentralInvoiceAuthorityAccountSeriesReconciliationClientResult =
  | {
      ok: true;
      schema: typeof CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_CLIENT;
      results: CentralInvoiceAuthorityAccountSeriesReconciliationResult[];
    }
  | {
      ok: false;
      code: string;
      message: string;
      status: number;
    };

export interface CentralInvoiceAuthorityAccountSeriesReconciliationClientDependencies {
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string | null>;
  getDeviceToken?: () => string | null;
}

async function defaultAccessToken(): Promise<string | null> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function defaultDeviceToken(): string | null {
  return getLocalCloudDeviceToken();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseResult(
  value: unknown,
): CentralInvoiceAuthorityAccountSeriesReconciliationResult | null {
  if (
    !isObject(value) ||
    (value.status !== "committed" && value.status !== "replayed") ||
    typeof value.reconciliationId !== "string" ||
    typeof value.previousSequence !== "number" ||
    typeof value.resultingSequence !== "number" ||
    typeof value.seriesCode !== "string" ||
    typeof value.fiscalYear !== "number" ||
    !Number.isInteger(value.previousSequence) ||
    !Number.isInteger(value.resultingSequence) ||
    !Number.isInteger(value.fiscalYear) ||
    value.previousSequence < 0 ||
    value.resultingSequence < value.previousSequence
  ) {
    return null;
  }
  return {
    status: value.status,
    reconciliationId: value.reconciliationId,
    previousSequence: value.previousSequence,
    resultingSequence: value.resultingSequence,
    seriesCode: value.seriesCode,
    fiscalYear: value.fiscalYear,
  };
}

function errorResult(
  status: number,
  code: string,
  message: string,
): CentralInvoiceAuthorityAccountSeriesReconciliationClientResult {
  return { ok: false, status, code, message };
}

export async function reconcileCentralInvoiceAuthorityAccountSeriesFromBrowser(
  summaries: CentralInvoiceAuthorityAccountSeriesSummary[],
  dependencies: CentralInvoiceAuthorityAccountSeriesReconciliationClientDependencies = {},
): Promise<CentralInvoiceAuthorityAccountSeriesReconciliationClientResult> {
  if (summaries.length === 0 || summaries.length > 32) {
    return errorResult(
      400,
      "CENTRAL_AUTHORITY_RECONCILIATION_SUMMARIES_INVALID",
      "No hay una lista valida de series para conciliar.",
    );
  }

  const getAccessToken = dependencies.getAccessToken ?? defaultAccessToken;
  const getDeviceToken = dependencies.getDeviceToken ?? defaultDeviceToken;
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const accessToken = await getAccessToken();
  const deviceToken = getDeviceToken();
  if (!accessToken || !deviceToken) {
    return errorResult(
      401,
      "CENTRAL_AUTHORITY_RECONCILIATION_SESSION_REQUIRED",
      "Inicia sesion y registra este dispositivo antes de conciliar la numeracion.",
    );
  }

  let response: Response;
  try {
    response = await fetchImpl(
      "/api/central-invoice-authority/reconcile",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          [CLOUD_DEVICE_TOKEN_HEADER]: deviceToken,
        },
        body: JSON.stringify({
          schema:
            "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_REQUEST_V1",
          confirmed: true,
          summaries,
        }),
        cache: "no-store",
      },
    );
  } catch {
    return errorResult(
      0,
      "CENTRAL_AUTHORITY_RECONCILIATION_NETWORK_ERROR",
      "No se pudo contactar con la autoridad central de facturas.",
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const error =
      isObject(payload) && isObject(payload.error) ? payload.error : {};
    return errorResult(
      response.status,
      typeof error.code === "string"
        ? error.code
        : "CENTRAL_AUTHORITY_RECONCILIATION_REJECTED",
      typeof error.message === "string"
        ? error.message
        : "La autoridad central no acepto la conciliacion.",
    );
  }

  if (
    !isObject(payload) ||
    payload.ok !== true ||
    payload.schema !==
      "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_ROUTE_V1" ||
    !Array.isArray(payload.results)
  ) {
    return errorResult(
      502,
      "CENTRAL_AUTHORITY_RECONCILIATION_INVALID_RESPONSE",
      "La autoridad central no devolvio una conciliacion valida.",
    );
  }
  const results = payload.results.map(parseResult);
  if (
    results.length !== summaries.length ||
    results.some((result) => result === null)
  ) {
    return errorResult(
      502,
      "CENTRAL_AUTHORITY_RECONCILIATION_INVALID_RESPONSE",
      "La autoridad central no devolvio todas las series conciliadas.",
    );
  }

  return {
    ok: true,
    schema:
      CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_CLIENT,
    results:
      results as CentralInvoiceAuthorityAccountSeriesReconciliationResult[],
  };
}
