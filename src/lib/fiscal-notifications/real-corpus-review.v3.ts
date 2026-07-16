import type { BaseExtractorIdV1 } from "./extractor-core/extractor-contract.v1";
import { resolveFamilyRuleV2 } from "./extractor-core/family-rule-registry.v2";
import type { RealCorpusFieldV2 } from "./extractor-core/real-corpus-extractor.v2";
import type {
  RealCorpusExplanationV3,
  RealCorpusExtractorOutcomeV3,
  RealCorpusInstallmentV3,
} from "./extractor-core/real-corpus-extractor.v3";
import {
  parseFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewFieldV1,
  type FiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";

export const REAL_CORPUS_REVIEW_PROJECTION_VERSION_V3 =
  "real-corpus-review.2026-07-17.v3" as const;

function formatMoney(amountCents: number): string {
  const absolute = Math.abs(amountCents);
  const integer = String(Math.floor(absolute / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/gu,
    ".",
  );
  return `${amountCents < 0 ? "-" : ""}${integer},${String(absolute % 100).padStart(2, "0")}\u00a0€`;
}

function field(input: {
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

function canonicalDateType(
  fieldCode: string,
): FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"] {
  switch (fieldCode) {
    case "ISSUE_DATE":
      return "ISSUE_DATE";
    case "SIGNING_DATE":
      return "SIGNING_DATE";
    case "VOLUNTARY_PAYMENT_DEADLINE":
      return "VOLUNTARY_PAYMENT_DEADLINE";
    case "PAYMENT_DATE":
      return "PAYMENT_DATE";
    case "SEIZURE_DATE":
    case "SOURCE_SEIZURE_DATE":
      return "SEIZURE_DATE";
    case "RELEASE_DATE":
      return "RELEASE_DATE";
    default:
      return "ACTION_DATE";
  }
}

function projectField(
  item: RealCorpusFieldV2,
  index: number,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  if (item.kind === "MONEY") {
    return field({
      fieldId: `real-corpus-v3:${item.fieldCode}:${index}`,
      semantic: "MONEY",
      canonicalType: "OTHER",
      label: item.label,
      displayValue: formatMoney(item.amountCents),
      normalizedValue: String(item.amountCents),
      amountCents: item.amountCents,
      sourcePageNumbers: item.evidence.pageNumbers,
    });
  }
  if (item.kind === "REFERENCE") {
    return field({
      fieldId: `real-corpus-v3:${item.fieldCode}:${index}`,
      semantic: "REFERENCE",
      canonicalType: "OTHER_OFFICIAL_REFERENCE",
      label: item.label,
      displayValue: item.value,
      normalizedValue: item.value,
      sourcePageNumbers: item.evidence.pageNumbers,
    });
  }
  if (item.kind === "DATE") {
    return field({
      fieldId: `real-corpus-v3:${item.fieldCode}:${index}`,
      semantic: "DATE",
      canonicalType: canonicalDateType(item.fieldCode),
      label: item.label,
      displayValue: item.value.split("-").reverse().join("/"),
      normalizedValue: item.value,
      sourcePageNumbers: item.evidence.pageNumbers,
    });
  }
  const displayValue =
    item.kind === "BOOLEAN" ? (item.value ? "Sí" : "No") : String(item.value);
  return field({
    fieldId: `real-corpus-v3:${item.fieldCode}:${index}`,
    semantic: "DETAIL",
    canonicalType: "FACT_OR_GROUND",
    label: item.label,
    displayValue,
    normalizedValue: `V3:${item.kind}:${item.fieldCode}:${String(item.value).toUpperCase()}`,
    sourcePageNumbers: item.evidence.pageNumbers,
  });
}

function projectInstallment(
  item: RealCorpusInstallmentV3,
  index: number,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  return field({
    fieldId: `real-corpus-v3:installment:${index}`,
    semantic: "DETAIL",
    canonicalType: "FACT_OR_GROUND",
    label: `Cuota ${item.sequence}`,
    displayValue: `Vence ${item.dueDate.split("-").reverse().join("/")} · base ${formatMoney(item.baseCents)} · interés ${formatMoney(item.interestCents)} · total ${formatMoney(item.totalCents)}`,
    normalizedValue: `V3:INSTALLMENT:${item.sequence}:${item.dueDate}:${item.baseCents}:${item.interestCents}:${item.totalCents}`,
    sourcePageNumbers: Object.freeze([item.pageNumber]),
  });
}

function projectExplanation(
  familyId: string,
  explanation: RealCorpusExplanationV3,
): readonly FiscalNotificationVerticalSliceReviewFieldV1[] {
  const entries = [
    ["WHAT_IS", "Qué es", explanation.whatIs],
    ["RESULT", "Qué resultado muestra", explanation.result],
    ["ACTION", "Qué conviene hacer", explanation.action],
    ["DEADLINE", "Cómo se cuenta el plazo", explanation.deadline],
    ["CONSEQUENCE", "Qué puede ocurrir", explanation.consequence],
  ] as const;
  return Object.freeze(
    entries.map(([code, label, displayValue]) =>
      field({
        fieldId: `real-corpus-v3:explanation:${code.toLowerCase()}`,
        semantic: "DETAIL",
        canonicalType: "EXPLICIT_CONSEQUENCE",
        label,
        displayValue,
        normalizedValue: `V3:EXPLANATION:${familyId}:${code}`,
        sourcePageNumbers: Object.freeze([1]),
      }),
    ),
  );
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

/** Projects V3 facts into the existing private, review-only persistence model. */
export function projectRealCorpusReviewV3(
  outcome: RealCorpusExtractorOutcomeV3,
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
    field({
      fieldId: "real-corpus-v3:recognized-family",
      semantic: "DETAIL",
      canonicalType: "FACT_OR_GROUND",
      label: "Reconocimiento documental",
      displayValue: "Título, autoridad y estructura coinciden",
      normalizedValue: "V3:EXACT_TITLE_AUTHORITY_STRUCTURE",
      sourcePageNumbers: Object.freeze([1]),
    }),
    ...outcome.fields.map(projectField),
    ...outcome.installments.map(projectInstallment),
    ...(outcome.paymentFormStatus === "PAYMENT_FORM_ONLY"
      ? [
          field({
            fieldId: "real-corpus-v3:payment-form-status",
            semantic: "DETAIL",
            canonicalType: "FACT_OR_GROUND",
            label: "Carta de pago adjunta",
            displayValue:
              "Sirve para pagar; no acredita que el pago se haya realizado",
            normalizedValue: "V3:PAYMENT_FORM_ONLY",
            sourcePageNumbers: Object.freeze([7]),
          }),
        ]
      : []),
    ...projectExplanation(outcome.familyId, outcome.explanation),
  ];
  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: "1.0.0",
    status: "REVIEW_REQUIRED",
    documents: [
      {
        reviewDocumentId: `review-document:real-corpus-v3:${outcome.familyId}`,
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
