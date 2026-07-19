import type { BaseExtractorIdV1 } from "./extractor-core/extractor-contract.v1";
import { resolveFamilyRuleV2 } from "./extractor-core/family-rule-registry.v2";
import type { RealCorpusFieldV2 } from "./extractor-core/real-corpus-extractor.v2";
import type { RealCorpusInstallmentV5 } from "./extractor-core/real-corpus-extractor.v5";
import type { RealCorpusExtractorOutcomeV6 } from "./extractor-core/real-corpus-extractor.v6";
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

export const REAL_CORPUS_REVIEW_PROJECTION_VERSION_V6 =
  "real-corpus-review.2026-07-17.v6" as const;

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

function canonicalReferenceType(
  code: string,
): FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"] {
  if (code === "PROCEDURE_ID") return "PROCEDURE_ID";
  if (code === "ACT_ID") return "ACT_ID";
  if (code === "AGREEMENT_ID") return "AGREEMENT_ID";
  if (code === "NOTIFICATION_ID" || code === "PREVIOUS_NOTIFICATION_ID") {
    return "NOTIFICATION_ID";
  }
  if (code === "SEIZURE_ORDER_ID") return "SEIZURE_ORDER_ID";
  if (code === "PAYMENT_FORM_REFERENCE") return "PAYMENT_FORM_REFERENCE";
  if (code === "PAYMENT_FORM_MODEL") return "PAYMENT_FORM_MODEL";
  if (code === "TAX_MODEL") return "MODEL";
  if (code === "FISCAL_YEAR") return "FISCAL_YEAR";
  if (code === "TAX_PERIOD") return "TAX_PERIOD";
  if (code === "INTEREST_LIQUIDATION_KEY") return "LIQUIDATION_KEY";
  if (
    code === "DEBT_KEY" ||
    code === "DENIED_DEBT_KEY" ||
    code === "SOURCE_DEBT_KEY" ||
    code === "SANCTION_DEBT_KEY" ||
    code === "ORIGIN_SANCTION_DEBT_KEY" ||
    code === "CLAWBACK_DEBT_KEY" ||
    code.startsWith("SEIZURE_DEBT_KEY_")
  ) {
    return "DEBT_KEY";
  }
  return canonicalRealCorpusReferenceType(code);
}

const HUMAN_VALUE: Readonly<Record<string, string>> = Object.freeze({
  DIRECT_DEBIT: "Domiciliación bancaria",
  NO_GUARANTEE: "Sin garantía",
  PRIMARY_DEBTOR: "Obligado al pago",
  HISTORICAL_PRINTED_VALUE: "Porcentaje indicado en el documento",
  REDUCTION_ONLY_NOT_FULL_SANCTION:
    "Solo se reclama la reducción perdida, no la sanción completa",
  SEPARATE_FROM_PRINCIPAL: "Importe separado de la deuda principal",
  COMMERCIAL_CREDITS: "Créditos comerciales o arrendaticios",
  MOVABLE_ASSET: "Bien mueble",
  REAL_ESTATE: "Inmueble",
  DISCREPANCY_PRESERVED_WITH_EVIDENCE:
    "Los importes de las partes del documento no coinciden y se muestran por separado",
  PRINTED_AMOUNTS_MATCH: "Los importes coinciden",
  DEPENDS_ON_EFFECTIVE_RECEIPT:
    "El plazo depende de la fecha efectiva de recepción",
});

function projectField(
  item: RealCorpusFieldV2,
  index: number,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  if (item.kind === "MONEY") {
    return field({
      fieldId: `real-corpus-v6:${item.fieldCode}:${index}`,
      semantic: "MONEY",
      canonicalType: canonicalRealCorpusMoneyType(item.fieldCode),
      label: item.label,
      displayValue: formatMoney(item.amountCents),
      normalizedValue: String(item.amountCents),
      amountCents: item.amountCents,
      sourcePageNumbers: item.evidence.pageNumbers,
    });
  }
  if (item.kind === "REFERENCE") {
    const canonicalType = canonicalReferenceType(item.fieldCode);
    const reference = serializableRealCorpusReference(canonicalType, item.value);
    return field({
      fieldId: `real-corpus-v6:${item.fieldCode}:${index}`,
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
      fieldId: `real-corpus-v6:${item.fieldCode}:${index}`,
      semantic: dateType === null ? "DETAIL" : "DATE",
      canonicalType: dateType ?? "FACT_OR_GROUND",
      label: item.label,
      displayValue: item.value.split("-").reverse().join("/"),
      normalizedValue: item.value,
      sourcePageNumbers: item.evidence.pageNumbers,
    });
  }
  const rawDisplayValue =
    item.kind === "BOOLEAN" ? (item.value ? "Sí" : "No") : String(item.value);
  const displayValue = HUMAN_VALUE[rawDisplayValue] ?? rawDisplayValue;
  return field({
    fieldId: `real-corpus-v6:${item.fieldCode}:${index}`,
    semantic: "DETAIL",
    canonicalType: "FACT_OR_GROUND",
    label: item.label,
    displayValue,
    normalizedValue: displayValue,
    sourcePageNumbers: item.evidence.pageNumbers,
  });
}

function projectInstallment(
  item: RealCorpusInstallmentV5,
  index: number,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  return field({
    fieldId: `real-corpus-v6:installment:${index}`,
    semantic: "DETAIL",
    canonicalType: "FACT_OR_GROUND",
    label: `Cuota ${item.sequence}`,
    displayValue: `Vence ${item.dueDate.split("-").reverse().join("/")} · principal ${formatMoney(
      item.baseCents,
    )} · interés ${formatMoney(item.deferralInterestCents)} · total ${formatMoney(item.totalCents)}`,
    normalizedValue: `Vence ${item.dueDate.split("-").reverse().join("/")} · principal ${formatMoney(item.baseCents)} · interés ${formatMoney(item.deferralInterestCents)} · total ${formatMoney(item.totalCents)}`,
    sourcePageNumbers: Object.freeze([item.pageNumber]),
  });
}

function documentPartsSummary(outcome: RealCorpusExtractorOutcomeV6): string {
  const parts: string[] = [];
  if (outcome.segments.some((segment) => segment.type === "SCHEDULE")) {
    parts.push("calendario");
  }
  if (
    outcome.segments.some(
      (segment) => segment.type === "ANNEX_INTEREST_CALCULATION",
    )
  ) {
    parts.push("anexo de intereses");
  }
  if (outcome.segments.some((segment) => segment.type === "PAYMENT_FORM")) {
    parts.push("carta de pago");
  }
  return parts.length === 0
    ? "1 documento reconocido"
    : `1 documento reconocido · incluye ${new Intl.ListFormat("es", {
        style: "long",
        type: "conjunction",
      }).format(parts)}`;
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

/** Projects V6 facts into the private, review-only workspace. */
export function projectRealCorpusReviewV6(
  outcome: RealCorpusExtractorOutcomeV6,
): FiscalNotificationVerticalSliceReviewV1 {
  if (
    outcome.status !== "REVIEW_REQUIRED" ||
    !outcome.familyId ||
    !outcome.explanation
  )
    return emptyReview();
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
    documents: [
      {
        reviewDocumentId: `review-document:real-corpus-v6:${outcome.sourceDocumentId}`,
        extractorId: rule.extractorId as BaseExtractorIdV1,
        familyId: outcome.familyId,
        title: rule.canonicalTitle,
        subtitle: documentPartsSummary(outcome),
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
