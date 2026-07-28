"use client";

import type { AppData, BusinessProfile } from "@/lib/types";

import {
  buildCentralInvoiceAuthorityAccountSeriesInventory,
  type CentralInvoiceAuthorityAccountSeriesSummary,
} from "./account-series-inventory";
import {
  reconcileCentralInvoiceAuthorityAccountSeriesFromBrowser,
  type CentralInvoiceAuthorityAccountSeriesReconciliationClientResult,
  type CentralInvoiceAuthorityAccountSeriesReconciliationResult,
} from "./account-series-reconciliation-client";
import type {
  CentralInvoiceAuthorityFormIssueRequest,
  CentralInvoiceAuthorityFormIssueSeries,
} from "./form-canary-client";

export const CENTRAL_INVOICE_AUTHORITY_FORM_SERIES_PREFLIGHT =
  "CENTRAL_INVOICE_AUTHORITY_FORM_SERIES_PREFLIGHT_V1";

export type CentralInvoiceAuthorityFormSeriesPreflightResult =
  | {
      ok: true;
      schema: typeof CENTRAL_INVOICE_AUTHORITY_FORM_SERIES_PREFLIGHT;
      summary: CentralInvoiceAuthorityAccountSeriesSummary;
      reconciliation: CentralInvoiceAuthorityAccountSeriesReconciliationResult;
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
    };

export interface CentralInvoiceAuthorityFormSeriesPreflightDependencies {
  reconcile?: (
    summaries: CentralInvoiceAuthorityAccountSeriesSummary[],
  ) => Promise<CentralInvoiceAuthorityAccountSeriesReconciliationClientResult>;
}

function sameSeries(
  left: CentralInvoiceAuthorityFormIssueSeries,
  right: CentralInvoiceAuthorityFormIssueSeries,
): boolean {
  return (
    left.environment === right.environment &&
    left.issuerNif === right.issuerNif &&
    left.seriesCode === right.seriesCode &&
    left.fiscalYear === right.fiscalYear
  );
}

function sameReconciledSeries(
  result: CentralInvoiceAuthorityAccountSeriesReconciliationResult,
  series: CentralInvoiceAuthorityFormIssueSeries,
): boolean {
  return (
    result.seriesCode === series.seriesCode &&
    result.fiscalYear === series.fiscalYear
  );
}

function errorResult(
  status: number,
  code: string,
  message: string,
): CentralInvoiceAuthorityFormSeriesPreflightResult {
  return { ok: false, status, code, message };
}

export async function preflightCentralInvoiceAuthorityFormSeries(
  input: {
    data: AppData;
    profile: BusinessProfile;
    request: CentralInvoiceAuthorityFormIssueRequest;
  },
  dependencies: CentralInvoiceAuthorityFormSeriesPreflightDependencies = {},
): Promise<CentralInvoiceAuthorityFormSeriesPreflightResult> {
  const kind =
    input.request.kind === "rectification"
      ? "factura_rectificativa"
      : "factura";
  const scopedData: AppData = {
    ...input.data,
    profile: input.profile,
  };
  const inventory =
    buildCentralInvoiceAuthorityAccountSeriesInventory(scopedData, {
      requiredSeries: [{ kind, series: input.request.series }],
    });
  const conflict = inventory.conflicts.find((candidate) =>
    sameSeries(candidate, input.request.series),
  );
  if (conflict) {
    return errorResult(
      409,
      "CENTRAL_AUTHORITY_FORM_SERIES_DUPLICATE",
      `La serie ${conflict.seriesCode} contiene el numero duplicado ${conflict.sequence}. Revisa esas facturas antes de emitir.`,
    );
  }

  const summary = inventory.summaries.find((candidate) =>
    sameSeries(candidate, input.request.series),
  );
  if (!summary) {
    return errorResult(
      409,
      "CENTRAL_AUTHORITY_FORM_SERIES_NOT_INVENTORIED",
      "No se pudo preparar la serie exacta de esta factura. No se ha emitido nada.",
    );
  }

  const reconcile =
    dependencies.reconcile ??
    reconcileCentralInvoiceAuthorityAccountSeriesFromBrowser;
  const result = await reconcile([summary]);
  if (!result.ok) return result;

  const reconciliation = result.results[0];
  if (
    result.results.length !== 1 ||
    !reconciliation ||
    !sameReconciledSeries(reconciliation, input.request.series) ||
    reconciliation.resultingSequence < summary.observedMaxSequence
  ) {
    return errorResult(
      502,
      "CENTRAL_AUTHORITY_FORM_SERIES_PREFLIGHT_INVALID",
      "El servidor no confirmo el contador exacto de esta serie. No se ha emitido nada.",
    );
  }

  return {
    ok: true,
    schema: CENTRAL_INVOICE_AUTHORITY_FORM_SERIES_PREFLIGHT,
    summary,
    reconciliation,
  };
}
