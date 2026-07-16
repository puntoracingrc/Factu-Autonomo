import type { BaseExtractorIdV1 } from "./extractor-core/extractor-contract.v1";
import type {
  ProfileFieldAdapterOutcomeV2,
  ProfileDateFieldCodeV2,
  ProfileFieldReviewFieldV2,
  ProfileMoneyFieldCodeV2,
  ProfileReferenceFieldCodeV2,
} from "./extractor-core/profile-field-adapter.v2";
import type { ProfileDrivenPrintedEffectV2 } from "./extractor-core/profile-driven-extractor.v2";
import { resolveProfileFieldLabelV2 } from "./extractor-core/profile-field-labels.v2";
import {
  resolveAllowedPrintedEffectCodesV2,
  type FiscalNotificationDocumentFamilyIdV2,
} from "./structured-document-explanation.v2";
import {
  parseFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewDocumentV1,
  type FiscalNotificationVerticalSliceReviewFieldV1,
  type FiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";

export const FISCAL_NOTIFICATION_PROFILE_DRIVEN_REVIEW_VERSION_V2 =
  "2.0.0" as const;

export interface ProfileDrivenReviewProjectionInputV2 {
  readonly outcome: ProfileFieldAdapterOutcomeV2 &
    Readonly<{
      readonly printedEffects?: readonly ProfileDrivenPrintedEffectV2[];
    }>;
  readonly extractorId: BaseExtractorIdV1;
  readonly canonicalTitle: string;
  readonly titlePageNumbers: readonly number[];
  readonly pageCount: number;
  /** Closed, generated identifier for a distinct act inside one source PDF. */
  readonly documentInstanceId?: string;
}

const REFERENCE_TYPE_MAP: Readonly<
  Record<ProfileReferenceFieldCodeV2, FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"]>
> = Object.freeze({
  PROCEDURE_ID: "PROCEDURE_ID",
  EXPEDIENTE_ID: "EXPEDIENTE_ID",
  ACT_ID: "ACT_ID",
  NOTIFICATION_ID: "NOTIFICATION_ID",
  LIQUIDATION_KEY: "LIQUIDATION_KEY",
  DEBT_KEY: "DEBT_KEY",
  SEIZURE_ORDER_ID: "SEIZURE_ORDER_ID",
  AGREEMENT_ID: "AGREEMENT_ID",
  REGISTRY_ID: "REGISTRY_ID",
  FILING_RECEIPT_ID: "FILING_RECEIPT_ID",
  PAYMENT_RECEIPT_ID: "PAYMENT_RECEIPT_ID",
  NRC: "NRC",
  CSV: "CSV",
  MODEL: "MODEL",
  FISCAL_YEAR: "FISCAL_YEAR",
  TAX_PERIOD: "TAX_PERIOD",
  BANK_REFERENCE: "BANK_REFERENCE",
  THIRD_PARTY_RESPONSE_ID: "THIRD_PARTY_RESPONSE_ID",
  OTHER_OFFICIAL_REFERENCE: "OTHER_OFFICIAL_REFERENCE",
  REQUEST_NUMBER: "OTHER_OFFICIAL_REFERENCE",
});

const MONEY_TYPE_MAP: Readonly<
  Record<ProfileMoneyFieldCodeV2, FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"]>
> = Object.freeze({
  DOCUMENT_TOTAL: "OTHER",
  PAYMENT_ON_ACCOUNT: "PAYMENT_ON_ACCOUNT",
  RETAINED_AMOUNT: "RETAINED_AMOUNT",
  PROPOSED_QUOTA: "TAX_QUOTA",
  LATE_PAYMENT_INTEREST: "LATE_INTEREST",
  FINAL_QUOTA: "TAX_QUOTA",
  OUTSTANDING_PRINCIPAL: "PRINCIPAL",
  VALUATION: "OTHER",
  SANCTION_INITIAL: "PENALTY",
  SANCTION_REDUCTION: "OTHER",
  SANCTION_REDUCED: "PENALTY",
  ORIGINAL_TAX_PRINCIPAL: "PRINCIPAL",
  DEFERRAL_INTEREST: "LATE_INTEREST",
  EXECUTIVE_SURCHARGE_5: "EXECUTIVE_SURCHARGE",
  EXECUTIVE_SURCHARGE_10: "EXECUTIVE_SURCHARGE",
  EXECUTIVE_SURCHARGE_20: "EXECUTIVE_SURCHARGE",
  EXECUTIVE_SURCHARGE_PRINTED: "EXECUTIVE_SURCHARGE",
  COSTS: "COSTS",
  SEIZED_AMOUNT: "SEIZED_AMOUNT",
  CHARGES: "OTHER",
  REMITTED_AMOUNT: "THIRD_PARTY_TRANSFERRED",
  REFUND_CREDIT: "REFUND_RECOGNIZED",
  CREDIT_TOTAL: "REFUND_RECOGNIZED",
  OFFSET_APPLIED: "COMPENSATED_AMOUNT",
  TOTAL_BEFORE_OFFSET: "TOTAL_CLAIMED",
  REMAINING_AFTER_OFFSET: "TOTAL_PENDING",
  NET_REFUND_PAYMENT: "REFUND_PAID",
  PAYMENT_CONFIRMED: "TOTAL_PAID",
  RELEASED_AMOUNT: "RELEASED_AMOUNT",
});

const DATE_STORAGE_TYPE_MAP: Readonly<
  Record<
    ProfileDateFieldCodeV2,
    FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"]
  >
> = Object.freeze({
  ISSUE_DATE: "ISSUE_DATE",
  SIGNING_DATE: "SIGNING_DATE",
  AVAILABILITY_DATE: "AVAILABILITY_DATE",
  ACCESS_DATE: "ACCESS_DATE",
  REJECTION_DATE: "REJECTION_DATE",
  EXPIRATION_DATE: "EXPIRATION_DATE",
  EFFECTIVE_NOTIFICATION_DATE: "EFFECTIVE_NOTIFICATION_DATE",
  ACTION_DATE: "ACTION_DATE",
  RESPONSE_DEADLINE: "RESPONSE_DEADLINE",
  VOLUNTARY_PAYMENT_DEADLINE: "VOLUNTARY_PAYMENT_DEADLINE",
  APPEAL_DEADLINE: "APPEAL_DEADLINE",
  INSTALLMENT_DUE_DATE: "INSTALLMENT_DUE_DATE",
  PAYMENT_DATE: "PAYMENT_DATE",
  SEIZURE_DATE: "SEIZURE_DATE",
  RELEASE_DATE: "RELEASE_DATE",
  FILING_DATE: "ACTION_DATE",
  START_DATE: "ACTION_DATE",
  END_DATE: "ACTION_DATE",
  INTEREST_START_DATE: "ACTION_DATE",
  INTEREST_END_DATE: "ACTION_DATE",
});

/**
 * VSR1 predates profile dates such as START_DATE, END_DATE, FILING_DATE and
 * INTEREST_*_DATE. Its canonical type is therefore only a storage carrier for
 * those values; the exact profile date type remains in fieldId and is the
 * authority used by chronology consumers. Keeping this resolution closed also
 * prevents a newly introduced profile date from silently becoming ACTION_DATE.
 */
function resolveProfileDateStorageType(
  fieldCode: ProfileDateFieldCodeV2,
): FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"] {
  const canonicalType = DATE_STORAGE_TYPE_MAP[fieldCode];
  if (!canonicalType) throw new Error("UNSUPPORTED_PROFILE_DATE_FIELD_CODE_V2");
  return canonicalType;
}

export function projectProfileDrivenReviewV2(
  input: ProfileDrivenReviewProjectionInputV2,
): FiscalNotificationVerticalSliceReviewV1 {
  const { outcome } = input;
  if (
    outcome.familyId === null ||
    outcome.selectionBasis !== "SYSTEM_EXACT" ||
    input.titlePageNumbers.length === 0 ||
    !Number.isSafeInteger(input.pageCount) ||
    input.pageCount < 1
  ) {
    return emptyReview();
  }

  const titlePages = uniqueValidPages(input.titlePageNumbers, input.pageCount);
  if (titlePages.length === 0) return emptyReview();
  const instanceSuffix = input.documentInstanceId
    ? closedDocumentInstanceSuffix(input.documentInstanceId)
    : null;
  if (input.documentInstanceId && instanceSuffix === null) return emptyReview();
  const projectedFields = outcome.fields.map((field, index) =>
    projectField(field, index),
  );
  const projectedEffects = projectPrintedEffects(
    outcome.familyId as FiscalNotificationDocumentFamilyIdV2,
    outcome.printedEffects ?? Object.freeze([]),
    input.pageCount,
  );
  const fields = Object.freeze(
    [recognitionField(titlePages), ...projectedFields, ...projectedEffects],
  );
  const allPages = uniqueValidPages(
    [...titlePages, ...fields.flatMap((field) => field.sourcePageNumbers)],
    input.pageCount,
  );
  const document: FiscalNotificationVerticalSliceReviewDocumentV1 =
    Object.freeze({
      reviewDocumentId: `review-document:profile:${outcome.familyId}${
        instanceSuffix ? `:${instanceSuffix}` : ""
      }`,
      extractorId: input.extractorId,
      familyId: outcome.familyId,
      title: input.canonicalTitle,
      subtitle: "Título, autoridad y estructura coinciden",
      pageFrom: allPages[0]!,
      pageTo: allPages.at(-1)!,
      confidence: 1,
      fields,
      warnings: Object.freeze(
        outcome.issues.map((issue) => `profile.${issue}`),
      ),
      requiresHumanReview: true,
    });

  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: "1.0.0",
    status: "REVIEW_REQUIRED",
    documents: [document],
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

function projectPrintedEffects(
  familyId: FiscalNotificationDocumentFamilyIdV2,
  effects: readonly ProfileDrivenPrintedEffectV2[],
  pageCount: number,
): readonly FiscalNotificationVerticalSliceReviewFieldV1[] {
  const allowed = new Set(resolveAllowedPrintedEffectCodesV2(familyId));
  const seen = new Set<string>();
  const fields: FiscalNotificationVerticalSliceReviewFieldV1[] = [];
  for (const effect of effects) {
    if (
      effect.detectionBasis !== "CLOSED_PRINTED_PHRASE" ||
      !allowed.has(effect.effectCode) ||
      seen.has(effect.effectCode)
    ) {
      continue;
    }
    const pages = uniqueValidPages(effect.pageNumbers, pageCount);
    if (pages.length === 0) continue;
    seen.add(effect.effectCode);
    fields.push(
      Object.freeze({
        fieldId: `profile:effect:${effect.effectCode}:${fields.length}`,
        semantic: "DETAIL" as const,
        canonicalType: "FACT_OR_GROUND" as const,
        label: "Estado del documento",
        displayValue: "Detectado en el documento",
        normalizedValue: `EFFECT:${effect.effectCode}`,
        amountCents: null,
        currency: null,
        sourcePageNumbers: pages,
        sourceLabel: "Estado del documento",
        confidence: 1,
        reviewStatus: "REVIEW_REQUIRED" as const,
      }),
    );
  }
  return Object.freeze(fields);
}

export function mergeProfileDrivenReviewV2(
  legacyReview: FiscalNotificationVerticalSliceReviewV1,
  profileReview: FiscalNotificationVerticalSliceReviewV1,
): FiscalNotificationVerticalSliceReviewV1 {
  return mergeProfileDrivenReviewsV2(legacyReview, [profileReview]);
}

export function mergeProfileDrivenReviewsV2(
  legacyReview: FiscalNotificationVerticalSliceReviewV1,
  profileReviews: readonly FiscalNotificationVerticalSliceReviewV1[],
): FiscalNotificationVerticalSliceReviewV1 {
  const profileDocuments = profileReviews.flatMap((review) => review.documents);
  if (profileDocuments.length === 0) return legacyReview;
  const remainingLegacy = [...legacyReview.documents];
  const mergedProfiles = profileDocuments.map((profileDocument) => {
    const sameFamilyIndex = remainingLegacy.findIndex(
      (document) =>
        document.familyId === profileDocument.familyId &&
        pageRangesOverlap(document, profileDocument),
    );
    const matchingIndex =
      sameFamilyIndex >= 0
        ? sameFamilyIndex
        : remainingLegacy.findIndex(
            (document) =>
              document.extractorId === profileDocument.extractorId &&
              pageRangesOverlap(document, profileDocument),
          );
    if (matchingIndex < 0) return profileDocument;
    const legacy = remainingLegacy.splice(matchingIndex, 1)[0]!;
    return legacy.familyId === profileDocument.familyId
      ? mergeDocumentFields(legacy, profileDocument)
      : mergeExactProfileWithLegacyFields(profileDocument, legacy);
  });
  const documents = [...remainingLegacy, ...mergedProfiles].sort(
    (left, right) =>
      left.pageFrom - right.pageFrom ||
      left.pageTo - right.pageTo ||
      left.reviewDocumentId.localeCompare(right.reviewDocumentId),
  );

  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: "1.0.0",
    status: documents.length > 0 ? "REVIEW_REQUIRED" : legacyReview.status,
    documents,
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

function pageRangesOverlap(
  left: FiscalNotificationVerticalSliceReviewDocumentV1,
  right: FiscalNotificationVerticalSliceReviewDocumentV1,
): boolean {
  return left.pageFrom <= right.pageTo && right.pageFrom <= left.pageTo;
}

function closedDocumentInstanceSuffix(value: string): string | null {
  return /^[A-Za-z0-9][A-Za-z0-9:._-]{0,79}$/u.test(value) ? value : null;
}

/**
 * The V1 review contract permits one document per base extractor. When its
 * broad legacy recognizer and the closed V2 title rule disagree, the exact V2
 * family is the review identity while the legacy structured fields remain
 * visible. This is still review-only and never confirms an operative effect.
 */
function mergeExactProfileWithLegacyFields(
  profile: FiscalNotificationVerticalSliceReviewDocumentV1,
  legacy: FiscalNotificationVerticalSliceReviewDocumentV1,
): FiscalNotificationVerticalSliceReviewDocumentV1 {
  const merged = mergeDocumentFields(profile, legacy);
  return Object.freeze({
    ...merged,
    reviewDocumentId: profile.reviewDocumentId,
    extractorId: profile.extractorId,
    familyId: profile.familyId,
    title: profile.title,
    subtitle: profile.subtitle,
    confidence: profile.confidence,
  });
}

function mergeDocumentFields(
  legacy: FiscalNotificationVerticalSliceReviewDocumentV1,
  profile: FiscalNotificationVerticalSliceReviewDocumentV1,
): FiscalNotificationVerticalSliceReviewDocumentV1 {
  const seen = new Set(
    legacy.fields.map(
      (field) =>
        `${field.semantic}:${field.canonicalType}:${field.normalizedValue ?? field.displayValue}`,
    ),
  );
  const additions = profile.fields.filter((field) => {
    const key = `${field.semantic}:${field.canonicalType}:${field.normalizedValue ?? field.displayValue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return Object.freeze({
    ...legacy,
    pageFrom: Math.min(legacy.pageFrom, profile.pageFrom),
    pageTo: Math.max(legacy.pageTo, profile.pageTo),
    fields: Object.freeze([...legacy.fields, ...additions]),
    warnings: Object.freeze([...new Set([...legacy.warnings, ...profile.warnings])]),
  });
}

function projectField(
  field: ProfileFieldReviewFieldV2,
  index: number,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  const label = resolveProfileFieldLabelV2(field.kind, field.fieldCode);
  if (!label) throw new Error("MISSING_PROFILE_FIELD_LABEL_V2");
  const common = {
    fieldId: `profile:${field.kind.toLowerCase()}:${field.fieldCode}:${index}`,
    label: label.labelEs,
    sourcePageNumbers: Object.freeze([field.evidence.pageNumber]),
    sourceLabel: label.labelEs,
    confidence: field.evidence.confidence,
    reviewStatus: "REVIEW_REQUIRED" as const,
  };

  switch (field.kind) {
    case "REFERENCE": {
      const sensitive = field.sensitiveReference;
      const normalizedValue = sensitive
        ? sensitive.fingerprintSha256
        : field.normalizedValue;
      if (!normalizedValue) throw new Error("MISSING_PROFILE_REFERENCE_VALUE_V2");
      return Object.freeze({
        ...common,
        semantic: "REFERENCE" as const,
        canonicalType: REFERENCE_TYPE_MAP[field.fieldCode],
        displayValue: sensitive
          ? `Huella protegida ${sensitive.fingerprintSha256.slice(0, 12)}…`
          : normalizedValue,
        normalizedValue,
        amountCents: null,
        currency: null,
      });
    }
    case "DATE":
      return Object.freeze({
        ...common,
        semantic: "DATE" as const,
        canonicalType: resolveProfileDateStorageType(field.fieldCode),
        displayValue: formatDate(field.valueIso),
        normalizedValue: field.valueIso,
        amountCents: null,
        currency: null,
      });
    case "MONEY":
      return Object.freeze({
        ...common,
        semantic: "MONEY" as const,
        canonicalType: MONEY_TYPE_MAP[field.fieldCode],
        displayValue: formatMoney(field.amountCents),
        normalizedValue: String(field.amountCents),
        amountCents: field.amountCents,
        currency: "EUR" as const,
      });
    case "FACT":
      return Object.freeze({
        ...common,
        semantic: "DETAIL" as const,
        canonicalType: "FACT_OR_GROUND" as const,
        displayValue: "Detectado en el documento",
        normalizedValue: field.fieldCode,
        amountCents: null,
        currency: null,
      });
    case "PARTICIPANT_ROLE":
      return Object.freeze({
        ...common,
        semantic: "DETAIL" as const,
        canonicalType: "FACT_OR_GROUND" as const,
        displayValue: `Interviniente ${field.ordinal}`,
        normalizedValue: field.fieldCode,
        amountCents: null,
        currency: null,
      });
  }
}

function recognitionField(
  titlePages: readonly number[],
): FiscalNotificationVerticalSliceReviewFieldV1 {
  return Object.freeze({
    fieldId: "profile:recognition:document-type:0",
    semantic: "DETAIL",
    canonicalType: "FACT_OR_GROUND",
    label: "Reconocimiento documental",
    displayValue: "Título y autoridad coinciden",
    normalizedValue: "EXACT_TITLE_AND_AUTHORITY",
    amountCents: null,
    currency: null,
    sourcePageNumbers: Object.freeze([...titlePages]),
    sourceLabel: "Título del documento",
    confidence: 1,
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function uniqueValidPages(
  values: readonly number[],
  pageCount: number,
): readonly number[] {
  return Object.freeze(
    [...new Set(values)]
      .filter(
        (page) =>
          Number.isSafeInteger(page) && page >= 1 && page <= pageCount,
      )
      .sort((left, right) => left - right),
  );
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatMoney(amountCents: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100);
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
