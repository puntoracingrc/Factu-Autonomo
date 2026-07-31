"use client";

import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";
import type { AppData } from "@/lib/types";

import {
  mutateCentralBusinessNumberedDocumentFromBrowser,
  type CentralBusinessDocumentSeriesReconciliationBrowserResult,
  type CentralBusinessNumberedDocumentBrowserInput,
  type CentralBusinessNumberedDocumentBrowserResult,
} from "./numbered-document-client";
import type { CentralBusinessNumberedDocumentEntityType } from "./numbered-document-command";
import {
  buildCentralBusinessNonfiscalSeriesInventory,
  type CentralBusinessNonfiscalSeriesSummary,
} from "./nonfiscal-document-series-inventory";

export const CENTRAL_BUSINESS_NONFISCAL_SERIES_PREFLIGHT =
  "CENTRAL_BUSINESS_NONFISCAL_SERIES_PREFLIGHT_V1";

export type CentralBusinessNonfiscalSeriesPreflightResult =
  | {
      ok: true;
      schema: typeof CENTRAL_BUSINESS_NONFISCAL_SERIES_PREFLIGHT;
      summary: CentralBusinessNonfiscalSeriesSummary;
      reconciliation: CentralBusinessDocumentSeriesReconciliationBrowserResult;
    }
  | Extract<CentralBusinessNumberedDocumentBrowserResult, { ok: false }>;

export interface CentralBusinessNonfiscalSeriesPreflightDependencies {
  mutate?: (
    input: CentralBusinessNumberedDocumentBrowserInput,
  ) => Promise<CentralBusinessNumberedDocumentBrowserResult>;
}

function failure(
  status: number,
  code: string,
  message: string,
): Extract<CentralBusinessNumberedDocumentBrowserResult, { ok: false }> {
  return {
    ok: false,
    status,
    code,
    message,
    retryable: status === 0 || status === 429 || status >= 500,
    conflict: status === 409,
  };
}

function reconciliationKey(
  summary: CentralBusinessNonfiscalSeriesSummary,
): string {
  const digest = sha256Hex(stableStringifySnapshot(summary));
  return `CENTRAL_BUSINESS_SERIES:${digest.slice(0, 48)}`;
}

export async function preflightCentralBusinessNonfiscalSeries(
  input: {
    data: AppData;
    entityType: CentralBusinessNumberedDocumentEntityType;
    fiscalYear: number;
  },
  dependencies: CentralBusinessNonfiscalSeriesPreflightDependencies = {},
): Promise<CentralBusinessNonfiscalSeriesPreflightResult> {
  if (
    !Number.isInteger(input.fiscalYear) ||
    input.fiscalYear < 2000 ||
    input.fiscalYear > 2100
  ) {
    return failure(
      400,
      "CENTRAL_BUSINESS_SERIES_YEAR_INVALID",
      "El ejercicio del documento no es valido.",
    );
  }
  const summary = buildCentralBusinessNonfiscalSeriesInventory(input);
  const mutate =
    dependencies.mutate ??
    mutateCentralBusinessNumberedDocumentFromBrowser;
  const result = await mutate({
    action: "reconcile_series",
    idempotencyKey: reconciliationKey(summary),
    entityType: summary.entityType,
    numberTemplate: summary.numberTemplate,
    fiscalYear: summary.fiscalYear,
    observedMaxSequence: summary.observedMaxSequence,
    sourceDocumentCount: summary.sourceDocumentCount,
    sourceDigest: summary.sourceDigest,
  });
  if (!result.ok) return result;
  if (
    result.result.action !== "reconcile_series" ||
    result.result.scopeYear !== summary.scopeYear ||
    result.result.resultingSequence < summary.observedMaxSequence
  ) {
    return failure(
      502,
      "CENTRAL_BUSINESS_SERIES_PREFLIGHT_INVALID",
      "El servidor no confirmo el contador exacto de esta serie.",
    );
  }
  return {
    ok: true,
    schema: CENTRAL_BUSINESS_NONFISCAL_SERIES_PREFLIGHT,
    summary,
    reconciliation: result.result,
  };
}
