import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";
import {
  formatDocumentNumberWithSettings,
  formatUsesYear,
  normalizeNumbering,
  parseDocumentNumberForKind,
} from "@/lib/numbering";
import type { AppData, Document, DocumentKind } from "@/lib/types";

import type { CentralBusinessNumberedDocumentEntityType } from "./numbered-document-command";

export const CENTRAL_BUSINESS_NONFISCAL_SERIES_INVENTORY =
  "CENTRAL_BUSINESS_NONFISCAL_SERIES_INVENTORY_V1";

type SupportedKind = Extract<DocumentKind, "presupuesto" | "recibo">;

export interface CentralBusinessNonfiscalSeriesSummary {
  schema: typeof CENTRAL_BUSINESS_NONFISCAL_SERIES_INVENTORY;
  entityType: CentralBusinessNumberedDocumentEntityType;
  numberTemplate: string;
  padding: number;
  fiscalYear: number;
  scopeYear: number;
  observedMaxSequence: number;
  sourceDocumentCount: number;
  ignoredDocumentCount: number;
  sourceDigest: string;
}

function kindForEntityType(
  entityType: CentralBusinessNumberedDocumentEntityType,
): SupportedKind {
  return entityType === "quote" ? "presupuesto" : "recibo";
}

function documentMatchesKind(
  document: Document,
  kind: SupportedKind,
): boolean {
  return document.type === kind;
}

function documentYear(document: Pick<Document, "date">): number | null {
  const match = document.date.match(/^(\d{4})-\d{2}-\d{2}$/);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isInteger(year) && year >= 2000 && year <= 2100
    ? year
    : null;
}

export function buildCentralBusinessNonfiscalSeriesInventory(input: {
  data: AppData;
  entityType: CentralBusinessNumberedDocumentEntityType;
  fiscalYear: number;
}): CentralBusinessNonfiscalSeriesSummary {
  const numbering = normalizeNumbering(input.data.profile.numbering);
  const kind = kindForEntityType(input.entityType);
  const format = numbering.formats[kind];
  const usesYear = formatUsesYear(format.template);
  const scopeYear = usesYear ? input.fiscalYear : 0;
  const configuredFloor =
    !usesYear || numbering.year === input.fiscalYear
      ? numbering.lastSequence[kind]
      : 0;
  const evidence: Array<{
    id: string;
    number: string;
    date: string;
    sequence: number;
  }> = [];
  let ignoredDocumentCount = 0;

  for (const document of input.data.documents) {
    if (!documentMatchesKind(document, kind)) continue;
    const year = documentYear(document);
    const parsed = parseDocumentNumberForKind(
      document.number,
      kind,
      numbering,
    );
    if (!year || !parsed || parsed.sequence < 1) {
      ignoredDocumentCount += 1;
      continue;
    }
    const parsedYear = parsed.year ?? year;
    const exactNumber = formatDocumentNumberWithSettings(
      kind,
      parsedYear,
      parsed.sequence,
      numbering,
    );
    if (
      exactNumber !== document.number ||
      (usesYear && parsedYear !== input.fiscalYear)
    ) {
      ignoredDocumentCount += 1;
      continue;
    }
    evidence.push({
      id: document.id,
      number: document.number,
      date: document.date,
      sequence: parsed.sequence,
    });
  }

  evidence.sort((left, right) =>
    `${left.number}\u0000${left.id}`.localeCompare(
      `${right.number}\u0000${right.id}`,
    ),
  );
  const observedMaxSequence = Math.max(
    configuredFloor,
    ...evidence.map((document) => document.sequence),
    0,
  );
  const sourceDigest = `sha256:${sha256Hex(
    stableStringifySnapshot({
      schema: CENTRAL_BUSINESS_NONFISCAL_SERIES_INVENTORY,
      entityType: input.entityType,
      numberTemplate: format.template,
      padding: format.padding,
      fiscalYear: input.fiscalYear,
      scopeYear,
      configuredFloor,
      documents: evidence,
    }),
  )}`;

  return {
    schema: CENTRAL_BUSINESS_NONFISCAL_SERIES_INVENTORY,
    entityType: input.entityType,
    numberTemplate: format.template,
    padding: format.padding,
    fiscalYear: input.fiscalYear,
    scopeYear,
    observedMaxSequence,
    sourceDocumentCount: evidence.length,
    ignoredDocumentCount,
    sourceDigest,
  };
}
