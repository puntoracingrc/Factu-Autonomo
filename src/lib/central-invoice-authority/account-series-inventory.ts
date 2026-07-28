import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";
import {
  normalizeNumbering,
  parseDocumentNumberForKind,
} from "@/lib/numbering";
import type {
  AppData,
  Document,
  DocumentKind,
} from "@/lib/types";

import {
  deriveCentralInvoiceAuthorityInvoiceSeries,
  deriveCentralInvoiceAuthorityRectificationSeries,
} from "./document-form-canary";

export const CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_INVENTORY =
  "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_INVENTORY_V1";

export interface CentralInvoiceAuthorityAccountSeriesSummary {
  environment: "test" | "production";
  issuerNif: string;
  seriesCode: string;
  fiscalYear: number;
  observedMaxSequence: number;
  sourceDocumentCount: number;
  sourceDigest: string;
}

export interface CentralInvoiceAuthorityAccountSeriesConflict {
  seriesCode: string;
  fiscalYear: number;
  sequence: number;
  documentNumbers: string[];
}

export interface CentralInvoiceAuthorityAccountSeriesInventory {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_INVENTORY;
  summaries: CentralInvoiceAuthorityAccountSeriesSummary[];
  conflicts: CentralInvoiceAuthorityAccountSeriesConflict[];
  ignoredDocuments: number;
}

type SupportedKind = Extract<
  DocumentKind,
  "factura" | "factura_rectificativa"
>;

interface SeriesAccumulator {
  summary: Omit<
    CentralInvoiceAuthorityAccountSeriesSummary,
    "observedMaxSequence" | "sourceDocumentCount" | "sourceDigest"
  >;
  documents: Array<{ id: string; number: string; sequence: number }>;
  configuredFloor: number;
}

function kindForDocument(document: Document): SupportedKind | null {
  if (document.type !== "factura" || document.status === "borrador") {
    return null;
  }
  return document.rectification ? "factura_rectificativa" : "factura";
}

function seriesForDocument(
  data: AppData,
  document: Pick<Document, "date">,
  kind: SupportedKind,
) {
  return kind === "factura_rectificativa"
    ? deriveCentralInvoiceAuthorityRectificationSeries({
        profile: data.profile,
        date: document.date,
      })
    : deriveCentralInvoiceAuthorityInvoiceSeries({
        profile: data.profile,
        date: document.date,
      });
}

function seriesKey(input: {
  environment: string;
  issuerNif: string;
  seriesCode: string;
  fiscalYear: number;
}): string {
  return [
    input.environment,
    input.issuerNif,
    input.seriesCode,
    input.fiscalYear,
  ].join("\u0000");
}

function configuredAccumulator(
  data: AppData,
  kind: SupportedKind,
): SeriesAccumulator {
  const numbering = normalizeNumbering(data.profile.numbering);
  const date = `${numbering.year}-01-01`;
  const series = seriesForDocument(data, { date }, kind);
  return {
    summary: series,
    documents: [],
    configuredFloor: numbering.lastSequence[kind],
  };
}

function digestSeriesDocuments(
  accumulator: SeriesAccumulator,
): string {
  const evidence = accumulator.documents
    .map((document) => ({
      id: document.id,
      number: document.number,
      sequence: document.sequence,
    }))
    .sort((left, right) =>
      `${left.number}\u0000${left.id}`.localeCompare(
        `${right.number}\u0000${right.id}`,
      ),
    );
  return `sha256:${sha256Hex(
    stableStringifySnapshot({
      schema: CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_INVENTORY,
      series: accumulator.summary,
      configuredFloor: accumulator.configuredFloor,
      documents: evidence,
    }),
  )}`;
}

export function buildCentralInvoiceAuthorityAccountSeriesInventory(
  data: AppData,
): CentralInvoiceAuthorityAccountSeriesInventory {
  const numbering = normalizeNumbering(data.profile.numbering);
  const accumulators = new Map<string, SeriesAccumulator>();
  for (const kind of [
    "factura",
    "factura_rectificativa",
  ] satisfies SupportedKind[]) {
    const accumulator = configuredAccumulator(data, kind);
    accumulators.set(seriesKey(accumulator.summary), accumulator);
  }

  let ignoredDocuments = 0;
  for (const document of data.documents) {
    const kind = kindForDocument(document);
    if (!kind) continue;
    const parsed = parseDocumentNumberForKind(
      document.number,
      kind,
      numbering,
    );
    if (!parsed || parsed.sequence <= 0) {
      ignoredDocuments += 1;
      continue;
    }

    const series = seriesForDocument(data, document, kind);
    if (parsed.year !== undefined && parsed.year !== series.fiscalYear) {
      ignoredDocuments += 1;
      continue;
    }
    const key = seriesKey(series);
    const accumulator = accumulators.get(key) ?? {
      summary: series,
      documents: [],
      configuredFloor: 0,
    };
    accumulator.documents.push({
      id: document.id,
      number: document.number,
      sequence: parsed.sequence,
    });
    accumulators.set(key, accumulator);
  }

  const conflicts: CentralInvoiceAuthorityAccountSeriesConflict[] = [];
  for (const accumulator of accumulators.values()) {
    const bySequence = new Map<number, string[]>();
    for (const document of accumulator.documents) {
      const numbers = bySequence.get(document.sequence) ?? [];
      numbers.push(document.number);
      bySequence.set(document.sequence, numbers);
    }
    for (const [sequence, documentNumbers] of bySequence) {
      if (documentNumbers.length < 2) continue;
      conflicts.push({
        seriesCode: accumulator.summary.seriesCode,
        fiscalYear: accumulator.summary.fiscalYear,
        sequence,
        documentNumbers: [...documentNumbers].sort(),
      });
    }
  }

  const conflictingSeries = new Set(
    conflicts.map((conflict) =>
      `${conflict.seriesCode}\u0000${conflict.fiscalYear}`,
    ),
  );
  const summaries = [...accumulators.values()]
    .filter(
      (accumulator) =>
        !conflictingSeries.has(
          `${accumulator.summary.seriesCode}\u0000${accumulator.summary.fiscalYear}`,
        ),
    )
    .map((accumulator) => ({
      ...accumulator.summary,
      observedMaxSequence: Math.max(
        accumulator.configuredFloor,
        ...accumulator.documents.map((document) => document.sequence),
        0,
      ),
      sourceDocumentCount: accumulator.documents.length,
      sourceDigest: digestSeriesDocuments(accumulator),
    }))
    .sort((left, right) =>
      `${left.environment}:${left.seriesCode}:${left.fiscalYear}`.localeCompare(
        `${right.environment}:${right.seriesCode}:${right.fiscalYear}`,
      ),
    );

  return {
    schema: CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_INVENTORY,
    summaries,
    conflicts: conflicts.sort((left, right) =>
      `${left.seriesCode}:${left.fiscalYear}:${left.sequence}`.localeCompare(
        `${right.seriesCode}:${right.fiscalYear}:${right.sequence}`,
      ),
    ),
    ignoredDocuments,
  };
}
