import {
  AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1,
  type AeatDocumentOfficialSourceIdV1,
} from "../knowledge/aeat-document-knowledge.v1";
import {
  FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3,
  type FiscalNotificationDocumentFamilyIdV3,
} from "../knowledge/document-families.v3";
import {
  BASE_EXTRACTOR_IDS_V1,
  type BaseExtractorIdV1,
} from "./extractor-contract.v1";

export const FAMILY_RULE_CONTRACT_VERSION_V2 = "2.0.0" as const;
export const FAMILY_RULE_RELEASE_ID_V2 =
  "fiscal-notification-family-rules.2026-07-16.v2" as const;

export type FamilyRuleAnchorMatchModeV2 =
  | "LINE_EXACT"
  | "LINE_PREFIX"
  | "TOKEN_SEQUENCE"
  | "HEADER_TOKEN_SEQUENCE"
  | "HEADER_LINE_PREFIX"
  | "HOST_EXACT";

export type FamilyRuleAuthorityIdV2 =
  "AEAT_COMMON_TERRITORY" | "DEHU_GENERAL_STATE" | "GOBIERNO_DE_ESPANA_CLAVE";

export type FamilyRuleConflictIdV2 =
  | "CONFLICTING_AUTHORITY_TGSS"
  | "CONFLICTING_TERRITORY_FORAL"
  | "CONFLICTING_TERRITORY_CANARY"
  | "CONFLICTING_TERRITORY_REGIONAL"
  | "CONFLICTING_TERRITORY_CEUTA_MELILLA"
  | "CONFLICTING_NON_DOCUMENT_GUIDE";

export type FamilyRuleIdV2 =
  `family-rule.${FiscalNotificationDocumentFamilyIdV3}.v2`;

export interface FamilyRuleAnchorV2 {
  readonly anchorId: string;
  readonly matchMode: FamilyRuleAnchorMatchModeV2;
  /** Source-controlled literals. Document text can never extend this list. */
  readonly literals: readonly string[];
}

export interface FamilyRuleAuthorityV2 {
  readonly authorityId: FamilyRuleAuthorityIdV2;
  readonly anchors: readonly FamilyRuleAnchorV2[];
}

export interface FamilyRuleConflictV2 {
  readonly conflictId: FamilyRuleConflictIdV2;
  readonly matchMode: FamilyRuleAnchorMatchModeV2;
  /** Any literal match blocks a positive family decision. */
  readonly literals: readonly string[];
}

export interface FamilyRecognitionRuleV2 {
  readonly familyId: FiscalNotificationDocumentFamilyIdV3;
  readonly extractorId: BaseExtractorIdV1;
  readonly ruleId: FamilyRuleIdV2;
  readonly ruleVersion: typeof FAMILY_RULE_CONTRACT_VERSION_V2;
  readonly canonicalTitle: string;
  readonly titleAnchors: readonly FamilyRuleAnchorV2[];
  readonly requiredAnchors: readonly FamilyRuleAnchorV2[];
  readonly allowedAuthorities: readonly FamilyRuleAuthorityV2[];
  readonly conflicts: readonly FamilyRuleConflictV2[];
  readonly sourceIds: readonly AeatDocumentOfficialSourceIdV1[];
  readonly classificationPolicy: "REVIEW_REQUIRED_ONLY";
  readonly permitsAutomaticFamilyConfirmation: false;
}

type FamilyRecognitionRuleInputV2 = Omit<
  FamilyRecognitionRuleV2,
  "ruleVersion" | "classificationPolicy" | "permitsAutomaticFamilyConfirmation"
>;

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const IDENTIFIER_PATTERN = /^[A-Z0-9][A-Z0-9_.:-]*$/u;
const PERSONAL_TAX_ID_PATTERN =
  /(?:^|[^A-Z0-9])(?:\d{8}[\s._-]?[A-Z]|[XYZ][\s._-]?\d{7}[\s._-]?[A-Z]|[ABCDEFGHJNPQRSUVW][\s._-]?\d{7}[\s._-]?[0-9A-J])(?=$|[^A-Z0-9])/iu;
const PERSONAL_IBAN_PATTERN =
  /(?:^|[^A-Z0-9])ES(?:[\s._-]?\d){22}(?=$|[^A-Z0-9])/iu;
const PERSONAL_EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu;
const PERSONAL_PHONE_PATTERN =
  /(?:^|\D)(?:\+?34[\s._-]?)?[6789](?:[\s._-]?\d){8}(?:$|\D)/u;
const RULE_INPUT_KEYS = Object.freeze([
  "familyId",
  "extractorId",
  "ruleId",
  "canonicalTitle",
  "titleAnchors",
  "requiredAnchors",
  "allowedAuthorities",
  "conflicts",
  "sourceIds",
] as const);
const ANCHOR_KEYS = Object.freeze([
  "anchorId",
  "matchMode",
  "literals",
] as const);
const AUTHORITY_KEYS = Object.freeze(["authorityId", "anchors"] as const);
const CONFLICT_KEYS = Object.freeze([
  "conflictId",
  "matchMode",
  "literals",
] as const);
const ANCHOR_MATCH_MODES = new Set<FamilyRuleAnchorMatchModeV2>([
  "LINE_EXACT",
  "LINE_PREFIX",
  "TOKEN_SEQUENCE",
  "HEADER_TOKEN_SEQUENCE",
  "HEADER_LINE_PREFIX",
  "HOST_EXACT",
]);
const AUTHORITY_IDS = new Set<FamilyRuleAuthorityIdV2>([
  "AEAT_COMMON_TERRITORY",
  "DEHU_GENERAL_STATE",
  "GOBIERNO_DE_ESPANA_CLAVE",
]);
const CONFLICT_IDS = new Set<FamilyRuleConflictIdV2>([
  "CONFLICTING_AUTHORITY_TGSS",
  "CONFLICTING_TERRITORY_FORAL",
  "CONFLICTING_TERRITORY_CANARY",
  "CONFLICTING_TERRITORY_REGIONAL",
  "CONFLICTING_TERRITORY_CEUTA_MELILLA",
  "CONFLICTING_NON_DOCUMENT_GUIDE",
]);
const FAMILY_IDS = new Set(FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3);
const EXTRACTOR_IDS = new Set(BASE_EXTRACTOR_IDS_V1);
const OFFICIAL_SOURCE_IDS = new Set(AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1);

function invalid(path: string): never {
  throw new Error(`INVALID_FAMILY_RULE_V2:${path}`);
}

function assertExactDataRecord(
  value: unknown,
  path: string,
  keys: readonly string[],
): void {
  if (typeof value !== "object" || value === null) invalid(path);
  if (Object.getPrototypeOf(value) !== Object.prototype) invalid(path);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string" || !keys.includes(key)) ||
    Object.values(descriptors).some(
      (descriptor) =>
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        descriptor.enumerable !== true,
    )
  ) {
    invalid(path);
  }
}

function assertSafeText(value: string, path: string, maxLength = 240): void {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength ||
    value.trim() !== value ||
    CONTROL_CHARACTER_PATTERN.test(value) ||
    PERSONAL_TAX_ID_PATTERN.test(value) ||
    PERSONAL_IBAN_PATTERN.test(value) ||
    PERSONAL_EMAIL_PATTERN.test(value) ||
    PERSONAL_PHONE_PATTERN.test(value)
  ) {
    invalid(path);
  }
}

function assertUniqueStrings(values: readonly string[], path: string): void {
  if (new Set(values).size !== values.length) invalid(path);
}

function freezeAnchor(
  anchor: FamilyRuleAnchorV2,
  path: string,
): FamilyRuleAnchorV2 {
  assertExactDataRecord(anchor, path, ANCHOR_KEYS);
  assertSafeText(anchor.anchorId, `${path}.anchorId`, 160);
  if (!IDENTIFIER_PATTERN.test(anchor.anchorId)) invalid(`${path}.anchorId`);
  if (!ANCHOR_MATCH_MODES.has(anchor.matchMode)) invalid(`${path}.matchMode`);
  if (
    !Array.isArray(anchor.literals) ||
    anchor.literals.length === 0 ||
    anchor.literals.length > 24
  ) {
    invalid(`${path}.literals`);
  }
  anchor.literals.forEach((literal, index) =>
    assertSafeText(literal, `${path}.literals[${index}]`),
  );
  assertUniqueStrings(anchor.literals, `${path}.literals`);
  return Object.freeze({
    anchorId: anchor.anchorId,
    matchMode: anchor.matchMode,
    literals: Object.freeze([...anchor.literals]),
  });
}

function freezeAuthority(
  authority: FamilyRuleAuthorityV2,
  path: string,
): FamilyRuleAuthorityV2 {
  assertExactDataRecord(authority, path, AUTHORITY_KEYS);
  if (!AUTHORITY_IDS.has(authority.authorityId)) {
    invalid(`${path}.authorityId`);
  }
  if (
    !Array.isArray(authority.anchors) ||
    authority.anchors.length === 0 ||
    authority.anchors.length > 8
  ) {
    invalid(`${path}.anchors`);
  }
  return Object.freeze({
    authorityId: authority.authorityId,
    anchors: Object.freeze(
      authority.anchors.map((anchor, index) =>
        freezeAnchor(anchor, `${path}.anchors[${index}]`),
      ),
    ),
  });
}

function freezeConflict(
  conflict: FamilyRuleConflictV2,
  path: string,
): FamilyRuleConflictV2 {
  assertExactDataRecord(conflict, path, CONFLICT_KEYS);
  if (!CONFLICT_IDS.has(conflict.conflictId)) invalid(`${path}.conflictId`);
  if (!ANCHOR_MATCH_MODES.has(conflict.matchMode)) invalid(`${path}.matchMode`);
  if (
    !Array.isArray(conflict.literals) ||
    conflict.literals.length === 0 ||
    conflict.literals.length > 24
  ) {
    invalid(`${path}.literals`);
  }
  conflict.literals.forEach((literal, index) =>
    assertSafeText(literal, `${path}.literals[${index}]`),
  );
  assertUniqueStrings(conflict.literals, `${path}.literals`);
  return Object.freeze({
    conflictId: conflict.conflictId,
    matchMode: conflict.matchMode,
    literals: Object.freeze([...conflict.literals]),
  });
}

/**
 * Snapshots a source-controlled rule. It never accepts document data and it
 * keeps every recognition decision review-only.
 */
export function defineFamilyRecognitionRuleV2(
  input: FamilyRecognitionRuleInputV2,
): FamilyRecognitionRuleV2 {
  assertExactDataRecord(input, "rule", RULE_INPUT_KEYS);
  assertSafeText(input.familyId, "familyId", 160);
  assertSafeText(input.ruleId, "ruleId", 200);
  assertSafeText(input.canonicalTitle, "canonicalTitle");
  if (!FAMILY_IDS.has(input.familyId)) invalid("familyId");
  if (!EXTRACTOR_IDS.has(input.extractorId)) invalid("extractorId");
  if (input.ruleId !== `family-rule.${input.familyId}.v2`) invalid("ruleId");
  if (
    !Array.isArray(input.titleAnchors) ||
    input.titleAnchors.length === 0 ||
    input.titleAnchors.length > 8
  ) {
    invalid("titleAnchors");
  }
  if (
    !Array.isArray(input.requiredAnchors) ||
    input.requiredAnchors.length > 16
  ) {
    invalid("requiredAnchors");
  }
  if (
    !Array.isArray(input.allowedAuthorities) ||
    input.allowedAuthorities.length === 0 ||
    input.allowedAuthorities.length > 4
  ) {
    invalid("allowedAuthorities");
  }
  if (
    !Array.isArray(input.conflicts) ||
    input.conflicts.length === 0 ||
    input.conflicts.length > 16
  ) {
    invalid("conflicts");
  }
  if (
    !Array.isArray(input.sourceIds) ||
    input.sourceIds.length === 0 ||
    input.sourceIds.length > 16
  ) {
    invalid("sourceIds");
  }

  const titleAnchors = Object.freeze(
    input.titleAnchors.map((anchor, index) =>
      freezeAnchor(anchor, `titleAnchors[${index}]`),
    ),
  );
  const titleLiterals = titleAnchors.flatMap((anchor) => anchor.literals);
  if (!titleLiterals.includes(input.canonicalTitle)) invalid("canonicalTitle");

  const requiredAnchors = Object.freeze(
    input.requiredAnchors.map((anchor, index) =>
      freezeAnchor(anchor, `requiredAnchors[${index}]`),
    ),
  );
  const allowedAuthorities = Object.freeze(
    input.allowedAuthorities.map((authority, index) =>
      freezeAuthority(authority, `allowedAuthorities[${index}]`),
    ),
  );
  const conflicts = Object.freeze(
    input.conflicts.map((conflict, index) =>
      freezeConflict(conflict, `conflicts[${index}]`),
    ),
  );
  const sourceIds = Object.freeze([...input.sourceIds]);
  assertUniqueStrings(sourceIds, "sourceIds");
  if (!sourceIds.every((sourceId) => OFFICIAL_SOURCE_IDS.has(sourceId))) {
    invalid("sourceIds");
  }
  assertUniqueStrings(
    allowedAuthorities.map(({ authorityId }) => authorityId),
    "allowedAuthorities",
  );
  assertUniqueStrings(
    conflicts.map(({ conflictId }) => conflictId),
    "conflicts",
  );

  return Object.freeze({
    familyId: input.familyId,
    extractorId: input.extractorId,
    ruleId: input.ruleId,
    ruleVersion: FAMILY_RULE_CONTRACT_VERSION_V2,
    canonicalTitle: input.canonicalTitle,
    titleAnchors,
    requiredAnchors,
    allowedAuthorities,
    conflicts,
    sourceIds,
    classificationPolicy: "REVIEW_REQUIRED_ONLY",
    permitsAutomaticFamilyConfirmation: false,
  });
}
