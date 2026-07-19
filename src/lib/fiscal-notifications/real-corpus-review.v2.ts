import type { BaseExtractorIdV1 } from "./extractor-core/extractor-contract.v1";
import { resolveFamilyRuleV2 } from "./extractor-core/family-rule-registry.v2";
import type {
  RealCorpusExtractorOutcomeV2,
  RealCorpusFieldV2,
  RealCorpusMissingReturnV2,
  RealCorpusSectionRowV2,
} from "./extractor-core/real-corpus-extractor.v2";
import {
  parseFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewFieldV1,
  type FiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";

export const REAL_CORPUS_REVIEW_PROJECTION_VERSION_V2 =
  "real-corpus-review.2026-07-16.v2" as const;

const PROJECTABLE_TEXT_FIELD_CODES_V2 = new Set([
  "TAX_CONCEPT",
  "ALLEGATIONS_UNIT",
  "ALLEGATIONS_TRIGGER",
  "OFFSET_TYPE",
  "UNDERLYING_ACT_TYPE",
]);

function isProjectableField(item: RealCorpusFieldV2): boolean {
  return (
    (item.kind === "REFERENCE" ||
      item.kind === "DATE" ||
      item.kind === "MONEY" ||
      (item.kind === "TEXT" &&
        PROJECTABLE_TEXT_FIELD_CODES_V2.has(item.fieldCode)))
  );
}

function formatMoney(amountCents: number): string {
  const absolute = Math.abs(amountCents);
  const integer = String(Math.floor(absolute / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/gu,
    ".",
  );
  return `${amountCents < 0 ? "-" : ""}${integer},${String(absolute % 100).padStart(2, "0")}\u00a0€`;
}

function reviewField(input: {
  readonly fieldId: string;
  readonly semantic: FiscalNotificationVerticalSliceReviewFieldV1["semantic"];
  readonly canonicalType: FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"];
  readonly label: string;
  readonly displayValue: string;
  readonly normalizedValue: string | null;
  readonly amountCents?: number | null;
  readonly sourcePageNumbers: readonly number[];
}): FiscalNotificationVerticalSliceReviewFieldV1 {
  return Object.freeze({
    ...input,
    amountCents: input.amountCents ?? null,
    currency:
      input.amountCents === undefined || input.amountCents === null
        ? null
        : "EUR",
    sourceLabel: input.label,
    confidence: 1,
    reviewStatus: "REVIEW_REQUIRED" as const,
  });
}

function projectField(
  item: RealCorpusFieldV2,
  index: number,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  if (item.kind === "MONEY") {
    const signed = item.amountCents < 0;
    return reviewField({
      fieldId: `real-corpus:${item.fieldCode}:${index}`,
      semantic: signed ? "DETAIL" : "MONEY",
      canonicalType: signed ? "FACT_OR_GROUND" : "OTHER",
      label: item.label,
      displayValue: formatMoney(item.amountCents),
      normalizedValue: signed
        ? `SIGNED_CENTS:${item.amountCents}`
        : String(item.amountCents),
      amountCents: signed ? null : item.amountCents,
      sourcePageNumbers: item.evidence.pageNumbers,
    });
  }
  const value =
    item.kind === "BOOLEAN" ? (item.value ? "Sí" : "No") : String(item.value);
  const normalizedValue =
    item.kind === "REFERENCE" || item.kind === "DATE" || item.kind === "TEXT"
      ? String(item.value)
      : `${item.kind}:${item.fieldCode}:${String(item.value).toUpperCase()}`;
  const displayValue =
    item.kind === "DATE"
      ? String(item.value).split("-").reverse().join("/")
      : value;
  return reviewField({
    fieldId: `real-corpus:${item.fieldCode}:${index}`,
    semantic:
      item.kind === "REFERENCE"
        ? "REFERENCE"
        : item.kind === "DATE"
          ? "DATE"
          : "DETAIL",
    canonicalType:
      item.kind === "REFERENCE"
        ? "OTHER_OFFICIAL_REFERENCE"
        : item.kind === "DATE"
          ? "ACTION_DATE"
          : "FACT_OR_GROUND",
    label: item.label,
    displayValue,
    normalizedValue,
    sourcePageNumbers: item.evidence.pageNumbers,
  });
}

function projectSectionRow(
  row: RealCorpusSectionRowV2,
  index: number,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  const values = [
    row.participantRole === "SPOUSE" ? "Cónyuge" : "Titular",
    `fila ${row.rowOrdinal}`,
    row.model ? `modelo ${row.model}` : null,
    row.taxPeriod ? `periodo ${row.taxPeriod}` : null,
    row.amountCents !== null ? formatMoney(row.amountCents) : null,
    row.withholdingCents !== null
      ? `retención ${formatMoney(row.withholdingCents)}`
      : null,
  ].filter((value): value is string => value !== null);
  return reviewField({
    fieldId: `real-corpus:section:${index}`,
    semantic: "DETAIL",
    canonicalType: "FACT_OR_GROUND",
    label: row.sectionKind.replace(/_/gu, " "),
    displayValue: values.join(" · "),
    normalizedValue: [
      row.sectionKind,
      row.participantRole,
      row.rowOrdinal,
      row.model ?? "-",
      row.taxPeriod ?? "-",
      row.amountCents ?? "-",
      row.withholdingCents ?? "-",
    ].join(":"),
    sourcePageNumbers: Object.freeze([row.pageNumber]),
  });
}

function projectMissingReturn(
  item: RealCorpusMissingReturnV2,
  index: number,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  return reviewField({
    fieldId: `real-corpus:missing-return:${index}`,
    semantic: "OBLIGATION",
    canonicalType: "OBLIGATION",
    label: "Declaración no registrada en el aviso",
    displayValue: `Modelo ${item.model} · ${item.fiscalYear} · ${item.taxPeriod}`,
    normalizedValue: `${item.model}:${item.fiscalYear}:${item.taxPeriod}`,
    sourcePageNumbers: Object.freeze([item.pageNumber]),
  });
}

function emptyReview(): FiscalNotificationVerticalSliceReviewV1 {
  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: "1.0.0",
    status: "INFORMATION_PENDING",
    documents: [],
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
  });
}

/** Projects the exact V2 corpus result into the existing private review model. */
export function projectRealCorpusReviewV2(
  outcome: RealCorpusExtractorOutcomeV2,
): FiscalNotificationVerticalSliceReviewV1 {
  if (
    outcome.status !== "REVIEW_REQUIRED" ||
    outcome.familyId === null ||
    outcome.canonicalTitle === null ||
    outcome.explanation === null
  ) {
    return emptyReview();
  }
  const rule = resolveFamilyRuleV2(outcome.familyId);
  if (!rule) return emptyReview();
  const fields = [
    ...outcome.fields.filter(isProjectableField).map(projectField),
    ...outcome.sectionRows.map(projectSectionRow),
    ...outcome.missingReturns.map(projectMissingReturn),
  ];
  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: "1.0.0",
    status: "REVIEW_REQUIRED",
    documents: [
      {
        reviewDocumentId: `review-document:real-corpus:${outcome.familyId}`,
        extractorId: rule.extractorId as BaseExtractorIdV1,
        familyId: outcome.familyId,
        title: outcome.canonicalTitle,
        subtitle: "Título, autoridad y estructura coinciden",
        pageFrom: 1,
        pageTo: outcome.physicalPageCount,
        confidence: 1,
        fields,
        warnings: [],
        requiresHumanReview: true,
      },
    ],
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
  });
}
