import type { BaseExtractorIdV1 } from "./extractor-core/extractor-contract.v1";
import { resolveFamilyRuleV2 } from "./extractor-core/family-rule-registry.v2";
import type { RealCorpusFieldV2 } from "./extractor-core/real-corpus-extractor.v2";
import type {
  RealCorpusExplanationV7,
  RealCorpusExtractorOutcomeV7,
  RealCorpusInstallmentV7,
} from "./extractor-core/real-corpus-extractor.v7";
import {
  parseFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewFieldV1,
  type FiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";

export const REAL_CORPUS_REVIEW_PROJECTION_VERSION_V7 =
  "real-corpus-review.2026-07-17.v7" as const;

function formatMoney(amountCents: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 })
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
    currency: input.amountCents === undefined || input.amountCents === null ? null : "EUR",
    sourceLabel: input.label,
    confidence: 1,
    reviewStatus: "REVIEW_REQUIRED" as const,
  });
}

function canonicalDateType(code: string): FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"] {
  if (code === "ISSUE_DATE") return "ISSUE_DATE";
  if (code === "EFFECTIVE_NOTIFICATION_DATE") return "EFFECTIVE_NOTIFICATION_DATE";
  if (code === "VOLUNTARY_END_DATE") return "VOLUNTARY_PAYMENT_DEADLINE";
  return "ACTION_DATE";
}

function projectField(item: RealCorpusFieldV2, index: number): FiscalNotificationVerticalSliceReviewFieldV1 {
  if (item.kind === "MONEY") return field({
    fieldId: `real-corpus-v7:${item.fieldCode}:${index}`,
    semantic: "MONEY",
    canonicalType: "OTHER",
    label: item.label,
    displayValue: formatMoney(item.amountCents),
    normalizedValue: String(item.amountCents),
    amountCents: item.amountCents,
    sourcePageNumbers: item.evidence.pageNumbers,
  });
  if (item.kind === "REFERENCE") return field({
    fieldId: `real-corpus-v7:${item.fieldCode}:${index}`,
    semantic: /^SYN-[A-Z0-9-]+$/u.test(item.value) && !/\d/u.test(item.value) ? "DETAIL" : "REFERENCE",
    canonicalType: /^SYN-[A-Z0-9-]+$/u.test(item.value) && !/\d/u.test(item.value) ? "FACT_OR_GROUND" : "OTHER_OFFICIAL_REFERENCE",
    label: item.label,
    displayValue: item.value,
    normalizedValue: /^SYN-[A-Z0-9-]+$/u.test(item.value) && !/\d/u.test(item.value) ? `V7:SYNTHETIC_REFERENCE:${item.value}` : item.value,
    sourcePageNumbers: item.evidence.pageNumbers,
  });
  if (item.kind === "DATE") return field({
    fieldId: `real-corpus-v7:${item.fieldCode}:${index}`,
    semantic: "DATE",
    canonicalType: canonicalDateType(item.fieldCode),
    label: item.label,
    displayValue: item.value.split("-").reverse().join("/"),
    normalizedValue: item.value,
    sourcePageNumbers: item.evidence.pageNumbers,
  });
  const displayValue = item.kind === "BOOLEAN" ? (item.value ? "Sí" : "No") : String(item.value);
  return field({
    fieldId: `real-corpus-v7:${item.fieldCode}:${index}`,
    semantic: "DETAIL",
    canonicalType: "FACT_OR_GROUND",
    label: item.label,
    displayValue,
    normalizedValue: `V7:${item.kind}:${item.fieldCode}:${String(item.value).toUpperCase()}`,
    sourcePageNumbers: item.evidence.pageNumbers,
  });
}

function projectInstallment(item: RealCorpusInstallmentV7, index: number): FiscalNotificationVerticalSliceReviewFieldV1 {
  return field({
    fieldId: `real-corpus-v7:installment:${index}`,
    semantic: "DETAIL",
    canonicalType: "FACT_OR_GROUND",
    label: `Cuota ${item.sequence}`,
    displayValue: `Vence ${item.dueDate.split("-").reverse().join("/")} · principal ${formatMoney(item.baseCents)} · interés ${formatMoney(item.deferralInterestCents)} · total ${formatMoney(item.totalCents)}`,
    normalizedValue: `V7:INSTALLMENT:${item.sequence}:${item.dueDate}:${item.baseCents}:${item.deferralInterestCents}:${item.totalCents}`,
    sourcePageNumbers: Object.freeze([item.pageNumber]),
  });
}

function projectExplanation(familyId: string, explanation: RealCorpusExplanationV7): readonly FiscalNotificationVerticalSliceReviewFieldV1[] {
  const entries = [
    ["WHAT_IS", "Qué es", explanation.whatIs],
    ["ACTION", "Qué conviene hacer", explanation.action],
    ["DEADLINE", "Cómo se cuenta el plazo", explanation.deadline],
    ["CONSEQUENCE", "Qué puede ocurrir", explanation.consequence],
  ] as const;
  return Object.freeze(entries.map(([code, label, displayValue]) => field({
    fieldId: `real-corpus-v7:explanation:${code.toLowerCase()}`,
    semantic: "DETAIL",
    canonicalType: "EXPLICIT_CONSEQUENCE",
    label,
    displayValue,
    normalizedValue: `V7:EXPLANATION:${familyId}:${code}`,
    sourcePageNumbers: Object.freeze([1]),
  })));
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

/** Projects V7 facts through the closed, private, review-only boundary. */
export function projectRealCorpusReviewV7(outcome: RealCorpusExtractorOutcomeV7): FiscalNotificationVerticalSliceReviewV1 {
  if (outcome.status !== "REVIEW_REQUIRED" || !outcome.familyId || !outcome.explanation) return emptyReview();
  const rule = resolveFamilyRuleV2(outcome.familyId);
  if (!rule) return emptyReview();
  const fields = [
    field({
      fieldId: "real-corpus-v7:recognized-family",
      semantic: "DETAIL",
      canonicalType: "FACT_OR_GROUND",
      label: "Reconocimiento documental",
      displayValue: "Título, autoridad y estructura coinciden",
      normalizedValue: "V7:EXACT_TITLE_AUTHORITY_STRUCTURE",
      sourcePageNumbers: Object.freeze([1]),
    }),
    ...outcome.fields.map(projectField),
    ...outcome.installments.map(projectInstallment),
    ...(outcome.paymentFormOperationCount > 0 ? [field({
      fieldId: "real-corpus-v7:payment-form-status",
      semantic: "DETAIL",
      canonicalType: "FACT_OR_GROUND",
      label: "Carta de pago adjunta",
      displayValue: "Las copias representan una sola operación y no acreditan el pago",
      normalizedValue: "V7:PAYMENT_FORM_ONE_OPERATION_NOT_PAYMENT",
      sourcePageNumbers: Object.freeze([1]),
    })] : []),
    ...projectExplanation(outcome.familyId, outcome.explanation),
  ];
  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: "1.0.0",
    status: "REVIEW_REQUIRED",
    documents: [{
      reviewDocumentId: `review-document:real-corpus-v7:${outcome.sourceDocumentId}`,
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
    }],
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
