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
import {
  canonicalRealCorpusDateType,
  canonicalRealCorpusMoneyType,
  canonicalRealCorpusReferenceType,
  serializableRealCorpusReference,
} from "./real-corpus-review-observation.v1";

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
    const displayValue = formatMoney(item.amountCents);
    return reviewField({
      fieldId: `real-corpus:${item.fieldCode}:${index}`,
      semantic: signed ? "DETAIL" : "MONEY",
      canonicalType: signed
        ? "FACT_OR_GROUND"
        : canonicalRealCorpusMoneyType(item.fieldCode),
      label: item.label,
      displayValue,
      normalizedValue: signed
        ? displayValue
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
  const dateType =
    item.kind === "DATE" ? canonicalRealCorpusDateType(item.fieldCode) : null;
  const referenceType =
    item.kind === "REFERENCE"
      ? canonicalRealCorpusReferenceType(item.fieldCode)
      : null;
  const reference =
    referenceType === null
      ? null
      : serializableRealCorpusReference(referenceType, String(item.value));
  return reviewField({
    fieldId: `real-corpus:${item.fieldCode}:${index}`,
    semantic:
      item.kind === "REFERENCE"
        ? "REFERENCE"
        : item.kind === "DATE"
          ? dateType === null
            ? "DETAIL"
            : "DATE"
          : "DETAIL",
    canonicalType:
      item.kind === "REFERENCE"
        ? referenceType!
        : item.kind === "DATE"
          ? dateType ?? "FACT_OR_GROUND"
          : "FACT_OR_GROUND",
    label: item.label,
    displayValue: reference?.displayValue ?? displayValue,
    normalizedValue: reference?.normalizedValue ?? normalizedValue,
    sourcePageNumbers: item.evidence.pageNumbers,
  });
}

function projectSectionRow(
  row: RealCorpusSectionRowV2,
  index: number,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  const values = [
    `Fila ${row.rowOrdinal}`,
    row.participantRole === "SPOUSE"
      ? "Cónyuge"
      : row.participantRole === "ACCOUNT_HOLDER"
        ? "Titular"
        : null,
    row.model ? `modelo ${row.model}` : null,
    row.taxPeriod ? `periodo ${row.taxPeriod}` : null,
    row.amountCents !== null ? formatMoney(row.amountCents) : null,
    row.withholdingCents !== null
      ? `retención ${formatMoney(row.withholdingCents)}`
      : null,
  ].filter((value): value is string => value !== null);
  const displayValue = values.join(" · ");
  return reviewField({
    fieldId: `real-corpus:section:${index}`,
    semantic: "DETAIL",
    canonicalType: "FACT_OR_GROUND",
    label: REAL_CORPUS_SECTION_LABELS_V2[row.sectionKind] ??
      "Dato fiscal observado",
    displayValue,
    normalizedValue: displayValue,
    sourcePageNumbers: Object.freeze([row.pageNumber]),
  });
}

const REAL_CORPUS_SECTION_LABELS_V2: Readonly<Record<string, string>> =
  Object.freeze({
    EMPLOYMENT_INCOME: "Rendimientos del trabajo",
    ECONOMIC_ACTIVITY_INCOME: "Rendimientos de actividades económicas",
    BANK_INTEREST: "Intereses bancarios",
    ECONOMIC_ACTIVITY_CENSUS: "Actividades económicas declaradas",
    ATTRIBUTED_ECONOMIC_ACTIVITY_INCOME:
      "Rendimientos atribuidos de actividades económicas",
    ATTRIBUTED_WITHHOLDINGS: "Retenciones atribuidas",
    DONATIONS: "Donativos",
    MORTGAGE_LOAN: "Préstamo hipotecario",
    INSTALLMENT_PAYMENTS: "Pagos fraccionados",
    SOCIAL_SECURITY_CONTRIBUTIONS:
      "Cotizaciones a la Seguridad Social",
    CADASTRAL_PROPERTY: "Inmuebles catastrales",
    ENTITY_PARTICIPATION: "Participaciones en entidades",
    MATERNITY_DEDUCTION_CONTRIBUTIONS:
      "Cotizaciones para deducción por maternidad",
    MATERNITY_DEDUCTION: "Deducción por maternidad",
  });

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
  if (fields.length === 0) return emptyReview();
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
