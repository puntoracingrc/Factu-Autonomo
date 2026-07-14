import type {
  FiscalNotificationAnchorId,
  FiscalNotificationSupportedFamilyId,
} from "./extraction-contract";

export type FiscalNotificationExtractionEngineVersion =
  | "1.0.0"
  | "1.1.0"
  | "1.2.0"
  | "1.3.0"
  | "1.4.0";

const LEGACY_REQUIRED_ANCHORS = Object.freeze({
  AEAT_ENFORCEMENT_ORDER_CANDIDATE: Object.freeze([
    "AEAT_OFFICIAL_DOMAIN_LABEL",
    "ENFORCEMENT_ORDER_TITLE",
    "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
    "ENFORCEMENT_DEBT_AMOUNT_SECTION",
    "STRUCTURAL_FIRST_PAGE_HEADER",
  ] as const),
  AEAT_DEFERRAL_GRANT_CANDIDATE: Object.freeze([
    "AEAT_OFFICIAL_DOMAIN_LABEL",
    "DEFERRAL_GRANT_TITLE",
    "DEFERRAL_INSTALLMENT_ANNEX",
    "DEFERRAL_INTEREST_CALCULATION",
    "STRUCTURAL_FIRST_PAGE_HEADER",
  ] as const),
  AEAT_OFFSET_AGREEMENT_CANDIDATE: Object.freeze([
    "AEAT_OFFICIAL_DOMAIN_LABEL",
    "OFFSET_AGREEMENT_TITLE",
    "OFFSET_CREDIT_AND_DEBT_ANNEX",
    "OFFSET_AGREEMENT_NUMBER",
    "STRUCTURAL_FIRST_PAGE_HEADER",
  ] as const),
  AEAT_REAL_ESTATE_SEIZURE_CANDIDATE: Object.freeze([
    "AEAT_OFFICIAL_DOMAIN_LABEL",
    "REAL_ESTATE_SEIZURE_TITLE",
    "STRUCTURAL_FIRST_PAGE_HEADER",
  ] as const),
  AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE: Object.freeze([
    "AEAT_OFFICIAL_DOMAIN_LABEL",
    "FORMAL_FILING_REQUIREMENT_TITLE",
    "FORMAL_FILING_OMITTED_RETURNS_MARKER",
    "STRUCTURAL_FIRST_PAGE_HEADER",
  ] as const),
  AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE: Object.freeze([
    "AEAT_OFFICIAL_DOMAIN_LABEL",
    "ROI_REGISTRATION_AGREEMENT_TITLE",
    "STRUCTURAL_FIRST_PAGE_HEADER",
  ] as const),
} satisfies Record<
  FiscalNotificationSupportedFamilyId,
  readonly FiscalNotificationAnchorId[]
>);

const STRUCTURAL_REQUIRED_ANCHORS = Object.freeze({
  AEAT_ENFORCEMENT_ORDER_CANDIDATE: Object.freeze([
    "ENFORCEMENT_ORDER_TITLE",
    "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
    "ENFORCEMENT_DEBT_AMOUNT_SECTION",
    "STRUCTURAL_PRIMARY_ACT_HEADER",
  ] as const),
  AEAT_DEFERRAL_GRANT_CANDIDATE: Object.freeze([
    "DEFERRAL_GRANT_TITLE",
    "DEFERRAL_INSTALLMENT_ANNEX",
    "DEFERRAL_INTEREST_CALCULATION",
    "STRUCTURAL_PRIMARY_ACT_HEADER",
  ] as const),
  AEAT_OFFSET_AGREEMENT_CANDIDATE: Object.freeze([
    "OFFSET_AGREEMENT_TITLE",
    "OFFSET_CREDIT_AND_DEBT_ANNEX",
    "OFFSET_AGREEMENT_NUMBER",
    "STRUCTURAL_PRIMARY_ACT_HEADER",
  ] as const),
  AEAT_REAL_ESTATE_SEIZURE_CANDIDATE: Object.freeze([
    "REAL_ESTATE_SEIZURE_TITLE",
    "DOCUMENT_IDENTIFICATION_SECTION",
    "STRUCTURAL_PRIMARY_ACT_HEADER",
  ] as const),
  AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE: Object.freeze([
    "FORMAL_FILING_REQUIREMENT_TITLE",
    "FORMAL_FILING_OMITTED_RETURNS_MARKER",
    "STRUCTURAL_PRIMARY_ACT_HEADER",
  ] as const),
  AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE: Object.freeze([
    "ROI_REGISTRATION_AGREEMENT_TITLE",
    "DOCUMENT_IDENTIFICATION_SECTION",
    "STRUCTURAL_PRIMARY_ACT_HEADER",
  ] as const),
} satisfies Record<
  FiscalNotificationSupportedFamilyId,
  readonly FiscalNotificationAnchorId[]
>);

export const FISCAL_NOTIFICATION_V13_ONLY_ANCHOR_IDS = Object.freeze([
  "STRUCTURAL_PRIMARY_ACT_HEADER",
  "CONFLICTING_AEAT_HOST_LINE",
] as const satisfies readonly FiscalNotificationAnchorId[]);

export function requiredAnchorAlternativesForEngine(
  familyId: FiscalNotificationSupportedFamilyId,
  engineVersion: FiscalNotificationExtractionEngineVersion,
): readonly (readonly FiscalNotificationAnchorId[])[] {
  return engineVersion === "1.3.0" || engineVersion === "1.4.0"
    ? Object.freeze([
        LEGACY_REQUIRED_ANCHORS[familyId],
        STRUCTURAL_REQUIRED_ANCHORS[familyId],
      ])
    : Object.freeze([LEGACY_REQUIRED_ANCHORS[familyId]]);
}

export function expectedMissingRecognitionAnchors(
  familyId: FiscalNotificationSupportedFamilyId,
  engineVersion: FiscalNotificationExtractionEngineVersion,
  matchedIds: ReadonlySet<FiscalNotificationAnchorId>,
): readonly FiscalNotificationAnchorId[] {
  const alternatives = requiredAnchorAlternativesForEngine(
    familyId,
    engineVersion,
  );
  let selected: readonly FiscalNotificationAnchorId[] | null = null;
  for (const required of alternatives) {
    const missing = required.filter((anchorId) => !matchedIds.has(anchorId));
    if (missing.length === 0) return Object.freeze([]);
    if (!selected || missing.length < selected.length) selected = missing;
  }
  return Object.freeze([...(selected ?? [])]);
}

export function recognitionAnchorIdsForEngine(
  familyId: FiscalNotificationSupportedFamilyId,
  engineVersion: FiscalNotificationExtractionEngineVersion,
): ReadonlySet<FiscalNotificationAnchorId> {
  return new Set(
    requiredAnchorAlternativesForEngine(familyId, engineVersion).flat(),
  );
}
