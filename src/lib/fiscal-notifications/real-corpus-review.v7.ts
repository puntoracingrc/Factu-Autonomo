import type { BaseExtractorIdV1 } from "./extractor-core/extractor-contract.v1";
import { resolveFamilyRuleV2 } from "./extractor-core/family-rule-registry.v2";
import type { RealCorpusFieldV2 } from "./extractor-core/real-corpus-extractor.v2";
import type {
  RealCorpusExtractorOutcomeV7,
  RealCorpusInstallmentV7,
} from "./extractor-core/real-corpus-extractor.v7";
import {
  canonicalRealCorpusDateType,
  canonicalRealCorpusMoneyType,
  canonicalRealCorpusReferenceType,
  serializableRealCorpusReference,
} from "./real-corpus-review-observation.v1";
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

function projectField(item: RealCorpusFieldV2, index: number): FiscalNotificationVerticalSliceReviewFieldV1 {
  if (item.kind === "MONEY") return field({
    fieldId: `real-corpus-v7:${item.fieldCode}:${index}`,
    semantic: "MONEY",
    canonicalType: canonicalRealCorpusMoneyType(item.fieldCode),
    label: item.label,
    displayValue: formatMoney(item.amountCents),
    normalizedValue: String(item.amountCents),
    amountCents: item.amountCents,
    sourcePageNumbers: item.evidence.pageNumbers,
  });
  if (item.kind === "REFERENCE") {
    const canonicalType = canonicalRealCorpusReferenceType(item.fieldCode);
    const reference = serializableRealCorpusReference(canonicalType, item.value);
    return field({
      fieldId: `real-corpus-v7:${item.fieldCode}:${index}`,
      semantic: "REFERENCE",
      canonicalType,
      label: item.label,
      displayValue: reference.displayValue,
      normalizedValue: reference.normalizedValue,
      sourcePageNumbers: item.evidence.pageNumbers,
    });
  }
  if (item.kind === "DATE") {
    const dateType = canonicalRealCorpusDateType(item.fieldCode);
    return field({
      fieldId: `real-corpus-v7:${item.fieldCode}:${index}`,
      semantic: dateType === null ? "DETAIL" : "DATE",
      canonicalType: dateType ?? "FACT_OR_GROUND",
      label: item.label,
      displayValue: item.value.split("-").reverse().join("/"),
      normalizedValue: item.value,
      sourcePageNumbers: item.evidence.pageNumbers,
    });
  }
  const displayValue = item.kind === "BOOLEAN" ? (item.value ? "Sí" : "No") : String(item.value);
  return field({
    fieldId: `real-corpus-v7:${item.fieldCode}:${index}`,
    semantic: "DETAIL",
    canonicalType: "FACT_OR_GROUND",
    label: item.label,
    displayValue,
    normalizedValue: displayValue,
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
    normalizedValue: `Vence ${item.dueDate.split("-").reverse().join("/")} · principal ${formatMoney(item.baseCents)} · interés ${formatMoney(item.deferralInterestCents)} · total ${formatMoney(item.totalCents)}`,
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

/** Projects V7 facts through the closed, private, review-only boundary. */
export function projectRealCorpusReviewV7(outcome: RealCorpusExtractorOutcomeV7): FiscalNotificationVerticalSliceReviewV1 {
  if (outcome.status !== "REVIEW_REQUIRED" || !outcome.familyId || !outcome.explanation) return emptyReview();
  const rule = resolveFamilyRuleV2(outcome.familyId);
  if (!rule) return emptyReview();
  const fields = [
    ...outcome.fields.map(projectField),
    ...outcome.installments.map(projectInstallment),
  ];
  if (fields.length === 0) return emptyReview();
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
