import type { BaseExtractorIdV1 } from "./extractor-core/extractor-contract.v1";
import type {
  ProfileFieldAdapterOutcomeV2,
  ProfileDateFieldCodeV2,
  ProfileFieldReviewFieldV2,
  ProfileMoneyFieldCodeV2,
  ProfileReferenceFieldCodeV2,
} from "./extractor-core/profile-field-adapter.v2";
import { resolveProfileFieldLabelV2 } from "./extractor-core/profile-field-labels.v2";
import {
  parseFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewDocumentV1,
  type FiscalNotificationVerticalSliceReviewFieldV1,
  type FiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";

export const FISCAL_NOTIFICATION_PROFILE_DRIVEN_REVIEW_VERSION_V2 =
  "2.0.0" as const;

export interface ProfileDrivenReviewProjectionInputV2 {
  readonly outcome: ProfileFieldAdapterOutcomeV2;
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
  REQUEST_NUMBER: "REQUEST_NUMBER",
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
  const projectedFields = outcome.fields
    .map((field, index) => projectField(field, index))
    .filter(
      (
        field,
      ): field is FiscalNotificationVerticalSliceReviewFieldV1 => field !== null,
  );
  if (projectedFields.length === 0) return emptyReview();
  const fields = Object.freeze(projectedFields);
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
      subtitle: "Datos observados en el documento",
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
  const profileDocuments = coalesceObservedDocuments(
    profileReviews.flatMap((review) => review.documents),
  );
  if (profileDocuments.length === 0) return legacyReview;
  const remainingLegacy = [...legacyReview.documents];
  const mergedProfiles = profileDocuments.map((profileDocument) => {
    const sameFamilyIndex = selectSameFamilyMergeCandidateIndex(
      remainingLegacy,
      profileDocument,
    );
    const matchingIndex =
      sameFamilyIndex >= 0
        ? sameFamilyIndex
        : remainingLegacy.findIndex(
            (document) =>
              document.extractorId === profileDocument.extractorId &&
              pageRangesOverlap(document, profileDocument) &&
              !haveConflictingExactDocumentIdentitiesV2(
                document,
                profileDocument,
              ),
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

function coalesceObservedDocuments(
  documents: readonly FiscalNotificationVerticalSliceReviewDocumentV1[],
): readonly FiscalNotificationVerticalSliceReviewDocumentV1[] {
  const result: FiscalNotificationVerticalSliceReviewDocumentV1[] = [];
  const anchoredDocuments = documents.filter(
    (document) => profileDocumentInstance(document) !== null,
  );
  const unanchoredDocuments = documents.filter(
    (document) => profileDocumentInstance(document) === null,
  );
  for (const document of [...anchoredDocuments, ...unanchoredDocuments]) {
    const matchingIndex = selectSameFamilyMergeCandidateIndex(
      result,
      document,
    );
    if (matchingIndex < 0) {
      result.push(document);
      continue;
    }
    const previous = result[matchingIndex]!;
    const merged = mergeDocumentFields(document, previous);
    const segmentedAnchor =
      profileDocumentInstance(previous) !== null
        ? previous
        : profileDocumentInstance(document) !== null
          ? document
          : null;
    result[matchingIndex] = segmentedAnchor
      ? Object.freeze({
          ...merged,
          reviewDocumentId: segmentedAnchor.reviewDocumentId,
        })
      : merged;
  }
  return Object.freeze(result);
}

function selectSameFamilyMergeCandidateIndex(
  candidates: readonly FiscalNotificationVerticalSliceReviewDocumentV1[],
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
): number {
  const eligible = candidates.flatMap((candidate, index) =>
    candidate.familyId === document.familyId &&
    (sharesExactDocumentIdentity(candidate, document) ||
      (pageRangesOverlap(candidate, document) &&
        canMergeSameFamilyExtractionLayersV2(candidate, document)))
      ? [index]
      : [],
  );
  if (eligible.length === 0) return -1;

  const exact = eligible.filter((index) =>
    sharesExactDocumentIdentity(candidates[index]!, document),
  );
  const exactByPage = selectCandidateByIdentityEvidencePages(
    candidates,
    exact,
    document,
  );
  if (exactByPage >= 0) return exactByPage;
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) return -1;

  const byPage = selectCandidateByIdentityEvidencePages(
    candidates,
    eligible,
    document,
  );
  if (byPage >= 0) return byPage;
  if (primaryIdentityEvidencePages(document).length > 0) return -1;
  return eligible.length === 1 ? eligible[0]! : -1;
}

function selectCandidateByIdentityEvidencePages(
  candidates: readonly FiscalNotificationVerticalSliceReviewDocumentV1[],
  indexes: readonly number[],
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
): number {
  if (indexes.length === 0) return -1;
  const pages = primaryIdentityEvidencePages(document);
  if (pages.length === 0) return -1;
  const matching = indexes.filter((index) => {
    const candidate = candidates[index]!;
    return pages.every(
      (pageNumber) =>
        pageNumber >= candidate.pageFrom && pageNumber <= candidate.pageTo,
    );
  });
  return matching.length === 1 ? matching[0]! : -1;
}

function primaryIdentityEvidencePages(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
): readonly number[] {
  return [
    ...new Set(
      document.fields.flatMap((field) =>
        field.semantic === "REFERENCE" &&
        PRIMARY_DOCUMENT_IDENTITY_TYPES.has(field.canonicalType) &&
        field.normalizedValue
          ? field.sourcePageNumbers
          : [],
      ),
    ),
  ].sort((left, right) => left - right);
}

const PRIMARY_DOCUMENT_IDENTITY_TYPES = new Set<
  FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"]
>([
  "ACT_ID",
  "DEBT_KEY",
  "EXPEDIENTE_ID",
  "LIQUIDATION_KEY",
  "NOTIFICATION_ID",
  "PROCEDURE_ID",
  "REQUEST_NUMBER",
  "SEIZURE_ORDER_ID",
]);

function exactDocumentIdentityKeys(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
): ReadonlySet<string> {
  return new Set(
    document.fields.flatMap((field) =>
      field.semantic === "REFERENCE" &&
      PRIMARY_DOCUMENT_IDENTITY_TYPES.has(field.canonicalType) &&
      field.normalizedValue
        ? [`${field.canonicalType}:${field.normalizedValue}`]
        : [],
    ),
  );
}

function sharesExactDocumentIdentity(
  left: FiscalNotificationVerticalSliceReviewDocumentV1,
  right: FiscalNotificationVerticalSliceReviewDocumentV1,
): boolean {
  const leftKeys = exactDocumentIdentityKeys(left);
  if (leftKeys.size === 0) return false;
  return [...exactDocumentIdentityKeys(right)].some((key) => leftKeys.has(key));
}

export function haveConflictingExactDocumentIdentitiesV2(
  left: FiscalNotificationVerticalSliceReviewDocumentV1,
  right: FiscalNotificationVerticalSliceReviewDocumentV1,
): boolean {
  const leftKeys = exactDocumentIdentityKeys(left);
  const rightKeys = exactDocumentIdentityKeys(right);
  return (
    leftKeys.size > 0 &&
    rightKeys.size > 0 &&
    ![...leftKeys].some((key) => rightKeys.has(key))
  );
}

function canMergeSameFamilyExtractionLayersV2(
  left: FiscalNotificationVerticalSliceReviewDocumentV1,
  right: FiscalNotificationVerticalSliceReviewDocumentV1,
): boolean {
  if (sharesExactDocumentIdentity(left, right)) return true;
  if (haveConflictingIdentityValuesOfSameType(left, right)) return false;
  const leftInstance = profileDocumentInstance(left);
  const rightInstance = profileDocumentInstance(right);
  return !(
    leftInstance !== null &&
    rightInstance !== null &&
    leftInstance !== rightInstance
  );
}

function haveConflictingIdentityValuesOfSameType(
  left: FiscalNotificationVerticalSliceReviewDocumentV1,
  right: FiscalNotificationVerticalSliceReviewDocumentV1,
): boolean {
  const leftByType = exactDocumentIdentityValuesByType(left);
  const rightByType = exactDocumentIdentityValuesByType(right);
  return [...leftByType.entries()].some(([type, leftValues]) => {
    const rightValues = rightByType.get(type);
    return (
      rightValues !== undefined &&
      ![...leftValues].some((value) => rightValues.has(value))
    );
  });
}

function exactDocumentIdentityValuesByType(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
): ReadonlyMap<string, ReadonlySet<string>> {
  const result = new Map<string, Set<string>>();
  for (const field of document.fields) {
    if (
      field.semantic !== "REFERENCE" ||
      !PRIMARY_DOCUMENT_IDENTITY_TYPES.has(field.canonicalType) ||
      !field.normalizedValue
    ) continue;
    const values = result.get(field.canonicalType) ?? new Set<string>();
    values.add(field.normalizedValue);
    result.set(field.canonicalType, values);
  }
  return result;
}

function profileDocumentInstance(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
): string | null {
  const prefix = `review-document:profile:${document.familyId}:`;
  return document.reviewDocumentId.startsWith(prefix)
    ? document.reviewDocumentId.slice(prefix.length) || null
    : null;
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
  const mergedFields = [...legacy.fields];
  const seen = new Map(
    mergedFields.map((field, index) => [observedFieldValueKey(field), index]),
  );
  const occupiedLayerSlots = new Set(
    legacy.fields.flatMap((field) => {
      const slot = closedLayerFieldSlot(field);
      return slot ? [slot] : [];
    }),
  );
  for (const field of profile.fields) {
    const key = observedFieldValueKey(field);
    const duplicateIndex = seen.get(key);
    if (duplicateIndex !== undefined) {
      const duplicate = mergedFields[duplicateIndex]!;
      mergedFields[duplicateIndex] = Object.freeze({
        ...duplicate,
        sourcePageNumbers: Object.freeze(
          [...new Set([...duplicate.sourcePageNumbers, ...field.sourcePageNumbers])]
            .sort((left, right) => left - right),
        ),
        confidence: Math.max(duplicate.confidence, field.confidence),
      });
      continue;
    }
    const slot = closedLayerFieldSlot(field);
    if (slot && occupiedLayerSlots.has(slot)) continue;
    seen.set(key, mergedFields.length);
    if (slot) occupiedLayerSlots.add(slot);
    mergedFields.push(field);
  }
  return Object.freeze({
    ...legacy,
    pageFrom: Math.min(legacy.pageFrom, profile.pageFrom),
    pageTo: Math.max(legacy.pageTo, profile.pageTo),
    fields: Object.freeze(mergedFields),
    warnings: Object.freeze([...new Set([...legacy.warnings, ...profile.warnings])]),
  });
}

function observedFieldValueKey(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
): string {
  const value =
    field.semantic === "MONEY" && field.amountCents !== null
      ? `${field.amountCents}:${field.currency ?? ""}`
      : field.normalizedValue ?? field.displayValue;
  return `${field.semantic}:${field.canonicalType}:${value}`;
}

function closedLayerFieldSlot(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
): string | null {
  const match = /^real-corpus-v[2-7]:([A-Z0-9_]+):\d+$/u.exec(field.fieldId);
  if (!match?.[1]) return null;
  const fieldCode = match[1];
  if (
    fieldCode === "MODEL_PERIOD" ||
    fieldCode === "REQUESTED_YEAR" ||
    /^DOCUMENT_CATEGORY_\d+$/u.test(fieldCode) ||
    /^(?:OFFSET|INSTALLMENT|ROW)_.*_\d+$/u.test(fieldCode)
  ) {
    return null;
  }
  return `${field.semantic}:${fieldCode}`;
}

function projectField(
  field: ProfileFieldReviewFieldV2,
  index: number,
): FiscalNotificationVerticalSliceReviewFieldV1 | null {
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
    case "PARTICIPANT_ROLE":
      return null;
  }
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
