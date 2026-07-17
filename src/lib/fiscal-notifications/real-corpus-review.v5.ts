import type { BaseExtractorIdV1 } from "./extractor-core/extractor-contract.v1";
import { resolveFamilyRuleV2 } from "./extractor-core/family-rule-registry.v2";
import type { RealCorpusFieldV2 } from "./extractor-core/real-corpus-extractor.v2";
import type {
  RealCorpusExplanationV5,
  RealCorpusExtractorOutcomeV5,
  RealCorpusInstallmentV5,
} from "./extractor-core/real-corpus-extractor.v5";
import {
  parseFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewFieldV1,
  type FiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";

export const REAL_CORPUS_REVIEW_PROJECTION_VERSION_V5 =
  "real-corpus-review.2026-07-17.v5" as const;

function formatMoney(amountCents: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  })
    .format(amountCents / 100)
    .replace(/\s?€/u, "\u00a0€");
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
  code: string,
): FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"] {
  if (code === "ISSUE_DATE" || code === "DOCUMENT_DATE") return "ISSUE_DATE";
  if (code === "VOLUNTARY_END_DATE" || code === "VOLUNTARY_PAYMENT_DEADLINE")
    return "VOLUNTARY_PAYMENT_DEADLINE";
  return "ACTION_DATE";
}

function projectField(
  item: RealCorpusFieldV2,
  index: number,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  if (item.kind === "MONEY") {
    return field({
      fieldId: `real-corpus-v5:${item.fieldCode}:${index}`,
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
      fieldId: `real-corpus-v5:${item.fieldCode}:${index}`,
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
      fieldId: `real-corpus-v5:${item.fieldCode}:${index}`,
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
    fieldId: `real-corpus-v5:${item.fieldCode}:${index}`,
    semantic: "DETAIL",
    canonicalType: "FACT_OR_GROUND",
    label: item.label,
    displayValue,
    normalizedValue: `V5:${item.kind}:${item.fieldCode}:${String(item.value).toUpperCase()}`,
    sourcePageNumbers: item.evidence.pageNumbers,
  });
}

function projectInstallment(
  item: RealCorpusInstallmentV5,
  index: number,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  return field({
    fieldId: `real-corpus-v5:installment:${index}`,
    semantic: "DETAIL",
    canonicalType: "FACT_OR_GROUND",
    label: `Cuota ${item.sequence}`,
    displayValue: `Vence ${item.dueDate
      .split("-")
      .reverse()
      .join("/")} · principal ${formatMoney(item.baseCents)} · interés ${formatMoney(
      item.deferralInterestCents,
    )} · total ${formatMoney(item.totalCents)}`,
    normalizedValue: `V5:INSTALLMENT:${item.sequence}:${item.dueDate}:${item.baseCents}:${item.deferralInterestCents}:${item.totalCents}`,
    sourcePageNumbers: Object.freeze([item.pageNumber]),
  });
}

function projectExplanation(
  familyId: string,
  explanation: RealCorpusExplanationV5,
): readonly FiscalNotificationVerticalSliceReviewFieldV1[] {
  const entries = [
    ["WHAT_IS", "Qué es", explanation.whatIs],
    ["ACTION", "Qué conviene hacer", explanation.action],
    ["DEADLINE", "Cómo se cuenta el plazo", explanation.deadline],
    ["CONSEQUENCE", "Qué puede ocurrir", explanation.consequence],
  ] as const;
  return Object.freeze(
    entries.map(([code, label, displayValue]) =>
      field({
        fieldId: `real-corpus-v5:explanation:${code.toLowerCase()}`,
        semantic: "DETAIL",
        canonicalType: "EXPLICIT_CONSEQUENCE",
        label,
        displayValue,
        normalizedValue: `V5:EXPLANATION:${familyId}:${code}`,
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

/** Projects V5 facts into the private review-only workspace. */
export function projectRealCorpusReviewV5(
  outcome: RealCorpusExtractorOutcomeV5,
): FiscalNotificationVerticalSliceReviewV1 {
  if (
    outcome.status !== "REVIEW_REQUIRED" ||
    !outcome.familyId ||
    !outcome.explanation
  ) {
    return emptyReview();
  }
  const rule = resolveFamilyRuleV2(outcome.familyId);
  if (!rule) return emptyReview();
  const paymentPage =
    outcome.segments.find((segment) => segment.type === "PAYMENT_FORM")
      ?.pageNumbers[0] ?? 1;
  const fields = [
    field({
      fieldId: "real-corpus-v5:recognized-family",
      semantic: "DETAIL",
      canonicalType: "FACT_OR_GROUND",
      label: "Reconocimiento documental",
      displayValue: "Título, autoridad y estructura coinciden",
      normalizedValue: "V5:EXACT_TITLE_AUTHORITY_STRUCTURE",
      sourcePageNumbers: Object.freeze([1]),
    }),
    ...outcome.fields.map(projectField),
    ...outcome.installments.map(projectInstallment),
    ...(outcome.paymentFormOperationCount > 0
      ? [
          field({
            fieldId: "real-corpus-v5:payment-form-status",
            semantic: "DETAIL",
            canonicalType: "FACT_OR_GROUND",
            label: "Carta de pago adjunta",
            displayValue:
              "Sirve para pagar; sus copias son una sola operación y no acreditan el pago",
            normalizedValue: "V5:PAYMENT_FORM_ONLY",
            sourcePageNumbers: Object.freeze([paymentPage]),
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
        reviewDocumentId: `review-document:real-corpus-v5:${outcome.sourceDocumentId}`,
        extractorId: rule.extractorId as BaseExtractorIdV1,
        familyId: outcome.familyId,
        title: rule.canonicalTitle,
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
