import {
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2,
  type FiscalNotificationDocumentFamilyIdV2,
  type FiscalNotificationDocumentFamilyV2,
} from "./document-families.v2";
import {
  FISCAL_NOTIFICATION_ROI_OFFICIAL_SOURCE_IDS_V3,
  type FiscalNotificationOfficialSourceIdV3,
} from "./official-sources.v3";

export const FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_SCHEMA_VERSION_V3 =
  3 as const;
export const FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_RELEASE_ID_V3 =
  "fiscal-notification-document-families.2026-07-13.v3" as const;

export type FiscalNotificationDocumentFamilyIdV3 =
  FiscalNotificationDocumentFamilyIdV2;

export type FiscalNotificationDocumentFamilyV3 = Omit<
  FiscalNotificationDocumentFamilyV2,
  "schemaVersion" | "releaseId" | "sourceIds"
> & {
  readonly schemaVersion: 3;
  readonly releaseId: typeof FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_RELEASE_ID_V3;
  readonly sourceIds: readonly FiscalNotificationOfficialSourceIdV3[];
  readonly currentRoiStatusInferencePolicy: "PROHIBITED";
  readonly viesStatusInferencePolicy: "PROHIBITED";
  readonly agreementInterpretationPolicy: "DOCUMENT_EVIDENCE_AND_HUMAN_REVIEW_REQUIRED";
};

const ROI_CONTEXT_FAMILY_ID =
  "registry.tax_registration_resolution" as const satisfies FiscalNotificationDocumentFamilyIdV3;

function freezeFamily(
  family: FiscalNotificationDocumentFamilyV2,
): FiscalNotificationDocumentFamilyV3 {
  const sourceIds =
    family.id === ROI_CONTEXT_FAMILY_ID
      ? [...family.sourceIds, ...FISCAL_NOTIFICATION_ROI_OFFICIAL_SOURCE_IDS_V3]
      : [...family.sourceIds];

  return Object.freeze({
    ...family,
    schemaVersion: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_SCHEMA_VERSION_V3,
    releaseId: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_RELEASE_ID_V3,
    sourceIds: Object.freeze(sourceIds),
    currentRoiStatusInferencePolicy: "PROHIBITED",
    viesStatusInferencePolicy: "PROHIBITED",
    agreementInterpretationPolicy:
      "DOCUMENT_EVIDENCE_AND_HUMAN_REVIEW_REQUIRED",
  });
}

export const FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V3 = Object.freeze(
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.map(freezeFamily),
) satisfies readonly FiscalNotificationDocumentFamilyV3[];

export const FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3 = Object.freeze(
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V3.map((family) => family.id),
);

const familyById = new Map(
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V3.map(
    (family) => [family.id, family] as const,
  ),
);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export function resolveFiscalNotificationDocumentFamilyV3(
  id: unknown,
): FiscalNotificationDocumentFamilyV3 | null {
  return typeof id === "string" &&
    id.length > 0 &&
    id.length <= 160 &&
    !CONTROL_CHARACTER_PATTERN.test(id)
    ? (familyById.get(id as FiscalNotificationDocumentFamilyIdV3) ?? null)
    : null;
}
