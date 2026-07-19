import {
  canonicalFiscalNotificationOwnerScopeV2,
  isSensitiveReferenceV2,
  snapshotSensitiveReferenceV2,
  SENSITIVE_REFERENCE_TYPES_V2,
  type SensitiveReferenceV2,
} from "./sensitive-reference.v2";
import {
  AEAT_DOCUMENT_RELATION_TYPE_IDS_V1,
  resolveAeatDocumentProfileV1,
} from "./knowledge/aeat-document-knowledge.v1";
import type { FiscalNotificationDocumentFamilyIdV3 } from "./knowledge/document-families.v3";
import {
  resolveAeatOfficialCatalogProfileV9,
  type AeatOfficialCatalogProfileIdV9,
} from "./knowledge/official-catalog-expansion.v9";
import type { DocumentRelationReconciliationRecordV8 } from "./types";

export const LEGACY_ONLY_DOCUMENT_RELATION_TYPES_V2 = [
  "BELONGS_TO_CASE",
  "DUPLICATE_COPY_OF",
  "RELATED_TO_PAYMENT_PLAN",
  "RELATED_TO_INSTALLMENT",
  "POSSIBLY_RELATED",
] as const;

export const PERSISTED_DOCUMENT_RELATION_TYPES_V2 = [
  ...AEAT_DOCUMENT_RELATION_TYPE_IDS_V1,
  ...LEGACY_ONLY_DOCUMENT_RELATION_TYPES_V2,
] as const;

export const FISCAL_NOTIFICATIONS_PERSISTED_WORKSPACE_SCHEMA_V2 = 2 as const;
export const FISCAL_NOTIFICATIONS_WORKSPACE_MAX_SERIALIZED_BYTES_V2 =
  4 * 1024 * 1024;
export const FISCAL_NOTIFICATIONS_WORKSPACE_MAX_ENTITIES_V2 = 25_000;
export const FISCAL_NOTIFICATIONS_WORKSPACE_MAX_COLLECTION_ITEMS_V2 = 5_000;

export const CHRONOLOGY_BASES_V2 = [
  "ISSUE_DATE",
  "SIGNING_DATE",
  "ACTION_DATE",
  "EFFECTIVE_NOTIFICATION_DATE",
] as const;
export type ChronologyBasisV2 = (typeof CHRONOLOGY_BASES_V2)[number];

export const DOCUMENT_DATE_KINDS_V2 = [
  "ISSUE_DATE",
  "SIGNING_DATE",
  "ACTION_DATE",
  "EFFECTIVE_NOTIFICATION_DATE",
  "AVAILABILITY_DATE",
  "ACCESS_DATE",
  "REJECTION_DATE",
  "APPEAL_DEADLINE",
  "END_DATE",
  "EXPIRATION_DATE",
  "FILING_DATE",
  "INSTALLMENT_DUE_DATE",
  "INTEREST_END_DATE",
  "INTEREST_START_DATE",
  "PAYMENT_DATE",
  "RELEASE_DATE",
  "RESPONSE_DEADLINE",
  "SEIZURE_DATE",
  "START_DATE",
  "VOLUNTARY_PAYMENT_DEADLINE",
  "OTHER_OFFICIAL_DATE",
] as const;
export type DocumentDateKindV2 = (typeof DOCUMENT_DATE_KINDS_V2)[number];

export const ASSERTION_TYPES_V2 = [
  "EXPLICIT_IN_DOCUMENT",
  "CALCULATED_FROM_PRINTED_VALUES",
  "OFFICIAL_CONTEXT",
  "NOT_PROVEN_BY_DOCUMENT",
] as const;
export type AssertionTypeV2 = (typeof ASSERTION_TYPES_V2)[number];

export const PERSISTED_STATE_VALUES_V2 = [
  "UNKNOWN",
  "DRAFT",
  "PENDING_CONFIRMATION",
  "PENDING",
  "ACTIVE",
  "CLOSED",
  "REPLACED",
  "PROPOSED",
  "CONFIRMED",
  "GRANTED",
  "DENIED",
  "CANCELLED",
  "COMPLETED",
  "VOLUNTARY",
  "ENFORCEMENT",
  "DEFERRAL",
  "SEIZURE",
  "IN_PAYMENT_PLAN",
  "PAID_UNCONFIRMED",
  "PAID",
  "RECONCILED",
  "PAYMENT_REJECTED",
  "OVERDUE_NO_PAYMENT_RECORDED",
  "UNPAID_CONFIRMED",
  "UNPAID",
  "EXTINGUISHED",
  "SCHEDULED",
  "OVERDUE",
  "IN_ENFORCEMENT",
  "UNDER_REVIEW",
  "SUSPENDED",
  "REVIEW_REQUIRED",
] as const;
export type PersistedStateValueV2 =
  (typeof PERSISTED_STATE_VALUES_V2)[number];

export const ISSUER_CODES_V2 = [
  "AEAT",
  "TGSS",
  "LOCAL",
  "REGIONAL",
  "STATE_OTHER",
  "OTHER",
] as const;
export type IssuerCodeV2 = (typeof ISSUER_CODES_V2)[number];

export const REFERENCE_TYPES_V2 = [
  "DOCUMENT_REFERENCE",
  "EXPEDIENT_NUMBER",
  "LIQUIDATION_KEY",
  "DEBT_KEY",
  "PROCEDURE_NUMBER",
  "PAYMENT_JUSTIFICANTE",
  "CSV",
  "NRC",
  "BANK_REFERENCE",
  "TAX_MODEL",
  "TAX_EXERCISE",
  "TAX_PERIOD",
  "PAYMENT_MODEL",
  "VTO_RAW",
  "NOTIFICATION_ID",
  "DISTRIBUTION_BARCODE",
  "PAYMENT_BARCODE",
  "ISSUING_BODY_CODE",
  "DEBT_ORIGIN",
  "REQUEST_NUMBER",
  "OFFICIAL_REGISTRY_NUMBER",
  "VEHICLE_OR_FINE_REFERENCE",
  "SOCIAL_SECURITY_REFERENCE",
  "MUNICIPAL_REFERENCE",
  "OTHER",
] as const;
export type ReferenceTypeV2 = (typeof REFERENCE_TYPES_V2)[number];

export interface NormalizedReferenceValueV2 {
  storage: "NORMALIZED_REFERENCE";
  normalizedValue: string;
}

export const LEGACY_ADMINISTRATIVE_DOCUMENT_TYPES_V2 = [
  "AEAT_ENFORCEMENT_ORDER",
  "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
  "AEAT_INSTALLMENT_OR_DEFERRAL_DENIAL",
  "AEAT_OFFSET_AGREEMENT",
  "AEAT_PAYMENT_FORM",
  "AEAT_INFORMATION_REQUEST",
  "AEAT_ASSESSMENT_PROPOSAL",
  "AEAT_ASSESSMENT",
  "AEAT_SANCTION_PROPOSAL",
  "AEAT_SANCTION_DECISION",
  "AEAT_SEIZURE_ORDER",
  "TGSS_DEBT_NOTICE",
  "TGSS_ENFORCEMENT_NOTICE",
  "MUNICIPAL_FINE",
  "MUNICIPAL_TAX_NOTICE",
  "REGIONAL_AUTHORITY_NOTICE",
  "GENERIC_ADMINISTRATIVE_NOTICE",
  "UNKNOWN",
] as const;
export type LegacyAdministrativeDocumentTypeV2 =
  (typeof LEGACY_ADMINISTRATIVE_DOCUMENT_TYPES_V2)[number];

export type PersistedDocumentFamilyIdV2 =
  | FiscalNotificationDocumentFamilyIdV3
  | AeatOfficialCatalogProfileIdV9;

export interface AccountHolderIdentityV2 {
  ownerScope: string;
  role: "ACCOUNT_HOLDER";
  identityMatchStatus: "MATCH" | "MISMATCH" | "UNKNOWN";
  identityMatchMethod: "TAX_ID" | "STRUCTURAL_ROLE" | "NOT_AVAILABLE";
}

export interface PersistedDocumentV2 {
  id: string;
  ownerScope: string;
  familyId: PersistedDocumentFamilyIdV2 | null;
  legacyDocumentType: LegacyAdministrativeDocumentTypeV2 | null;
  recognitionStatus: "EXACT_FAMILY" | "LEGACY_TYPE_ONLY" | "UNKNOWN";
  issuerCode: IssuerCodeV2;
  reviewStatus: "PENDING" | "CONFIRMED" | "CORRECTED";
  chronologyDate: string | null;
  chronologyBasis: ChronologyBasisV2 | null;
  dateFactIds: string[];
  referenceIds: string[];
  amountFactIds: string[];
  factIds: string[];
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PersistedReferenceV2 {
  id: string;
  ownerScope: string;
  documentId: string;
  referenceType: ReferenceTypeV2;
  issuerCode: IssuerCodeV2;
  value: NormalizedReferenceValueV2 | SensitiveReferenceV2;
  assertionType: AssertionTypeV2;
  evidenceIds: string[];
}

export interface PersistedDateFactV2 {
  id: string;
  ownerScope: string;
  documentId: string;
  fieldId: string;
  kind: DocumentDateKindV2;
  value: string;
  assertionType: AssertionTypeV2;
  evidenceIds: string[];
}

export interface PersistedAmountFactV2 {
  id: string;
  ownerScope: string;
  documentId: string;
  fieldId: string;
  componentType: string;
  amountCents: number;
  currency: "EUR";
  assertionType: AssertionTypeV2;
  evidenceIds: string[];
}

export type PersistedTypedFactV2 =
  | {
      id: string;
      ownerScope: string;
      documentId: string;
      fieldId: string;
      valueType: "BOOLEAN";
      booleanValue: boolean;
      assertionType: AssertionTypeV2;
      evidenceIds: string[];
    }
  | {
      id: string;
      ownerScope: string;
      documentId: string;
      fieldId: string;
      valueType: "INTEGER";
      integerValue: number;
      assertionType: AssertionTypeV2;
      evidenceIds: string[];
    }
  | {
      id: string;
      ownerScope: string;
      documentId: string;
      fieldId: string;
      valueType: "STATE";
      stateValue: PersistedStateValueV2;
      assertionType: AssertionTypeV2;
      evidenceIds: string[];
    };

export type EvidenceLocatorV2 =
  | { kind: "PAGE" }
  | {
      kind: "BOUNDING_BOX";
      x: number;
      y: number;
      width: number;
      height: number;
      pageWidth?: number;
      pageHeight?: number;
    };

export interface PersistedEvidenceV2 {
  id: string;
  ownerScope: string;
  documentId: string;
  fieldId: string;
  page: number;
  locator: EvidenceLocatorV2;
  extractionMethod: "TEXT_LAYER" | "OCR" | "RULE" | "AI" | "USER";
  confidence: "LOW" | "MEDIUM" | "HIGH" | "EXACT";
  rule: { id: string; version: string };
  assertionType: AssertionTypeV2;
}

export interface PersistedThirdPartyV2 {
  id: string;
  ownerScope: string;
  documentId: string;
  kind: "PERSON" | "COMPANY" | "PUBLIC_BODY" | "UNKNOWN";
  role:
    | "RECIPIENT"
    | "PAYER"
    | "WITHHOLDER"
    | "GARNISHEE"
    | "GUARANTOR"
    | "REPRESENTATIVE"
    | "OTHER";
  ordinal: number;
  obligationDirection:
    "OWES" | "IS_OWED" | "WITHHOLDS" | "RECEIVES" | "UNKNOWN";
  amountCents?: number;
  relevantDate?: string;
  state: "UNKNOWN" | "PENDING" | "COMPLETED" | "RELEASED" | "CANCELLED";
  consequence:
    | "NONE_STATED"
    | "PAYMENT_EXPECTED"
    | "RETENTION_EXPECTED"
    | "FUNDS_TRANSFER_EXPECTED"
    | "RESPONSE_EXPECTED"
    | "RELEASE_RECORDED"
    | "REVIEW_REQUIRED";
  masterRecordId?: string;
  evidenceIds: string[];
}

export interface PersistedDocumentRelationV2 {
  id: string;
  ownerScope: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  relationType: string;
  status:
    "SUGGESTED" | "USER_CONFIRMED" | "USER_REJECTED" | "SYSTEM_CONFIRMED_EXACT";
  exactReferenceIds: string[];
  contextualDateFactIds: string[];
  contextualAmountFactIds: string[];
  algorithmVersion: string;
  createdAt: string;
  reconciliationHistory?: DocumentRelationReconciliationRecordV8[];
}

export interface PersistedDriveArchiveV2 {
  id: string;
  ownerScope: string;
  documentIds: string[];
  sourceSha256: string;
  driveFileId: string;
  driveFolderId: string;
  documentDate: string | null;
  archiveStatus: "ARCHIVED_VERIFIED";
  reviewStatus: "USER_CONFIRMED";
  verificationMethod: "SHA256_READBACK_MATCH";
  archivedAt: string;
}

export interface FiscalNotificationsPersistedWorkspaceV2 {
  schemaVersion: 2;
  workspaceId: string;
  ownerScope: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  accountHolder: AccountHolderIdentityV2;
  documents: PersistedDocumentV2[];
  references: PersistedReferenceV2[];
  dates: PersistedDateFactV2[];
  amounts: PersistedAmountFactV2[];
  facts: PersistedTypedFactV2[];
  evidence: PersistedEvidenceV2[];
  thirdParties: PersistedThirdPartyV2[];
  relations: PersistedDocumentRelationV2[];
  driveArchives: PersistedDriveArchiveV2[];
}

type JsonRecord = Record<string, unknown>;
const INVALID = Symbol("invalid-workspace-v2");
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:/\-]{0,159}$/u;
const TECHNICAL_PATTERN = /^[A-Z0-9][A-Z0-9_.:\-]{0,95}$/u;
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const NORMALIZED_REFERENCE_PATTERN = /^[\p{L}\p{N}]+$/u;
const TAX_ID_TOKEN =
  /(?:^|[^A-Z0-9])(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J])(?=$|[^A-Z0-9])/iu;
const IBAN_TOKEN = /(?:^|[^A-Z0-9])ES\d{22}(?=$|[^A-Z0-9])/iu;
const PHONE_TOKEN =
  /(?:^|[^A-Z0-9])(?:34)?[6789]\d{8}(?=$|[^A-Z0-9])/iu;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u;

function fail(): never {
  throw INVALID;
}

function record(value: unknown, allowedKeys: readonly string[]): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail();
  if (Object.getOwnPropertySymbols(value).length > 0) fail();
  const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
    string,
    PropertyDescriptor
  >;
  const keys = Object.keys(descriptors);
  if (keys.some((key) => !allowedKeys.includes(key))) fail();
  if (
    Object.values(descriptors).some(
      (descriptor) => !("value" in descriptor) || !descriptor.enumerable,
    )
  ) {
    fail();
  }
  return Object.fromEntries(
    keys.map((key) => [key, descriptors[key]!.value]),
  ) as JsonRecord;
}

function required(value: JsonRecord, key: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(value, key)) fail();
  return value[key];
}

function enumValue<T extends string>(value: unknown, values: readonly T[]): T {
  if (typeof value !== "string" || !values.includes(value as T)) fail();
  return value as T;
}

function safeString(value: unknown, max: number, pattern?: RegExp): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > max ||
    CONTROL_CHARACTERS.test(value) ||
    value.trim() !== value ||
    (pattern && !pattern.test(value))
  ) {
    fail();
  }
  return value;
}

function id(value: unknown): string {
  const parsed = safeString(value, 160, ID_PATTERN);
  if (
    TAX_ID_TOKEN.test(parsed) ||
    IBAN_TOKEN.test(parsed) ||
    PHONE_TOKEN.test(parsed)
  ) {
    fail();
  }
  return parsed;
}

function owner(value: unknown, expected: string): string {
  const parsed = canonicalFiscalNotificationOwnerScopeV2(value);
  if (!parsed) fail();
  if (parsed !== expected) fail();
  return parsed;
}

function technical(value: unknown): string {
  const parsed = safeString(value, 96, TECHNICAL_PATTERN);
  if (
    TAX_ID_TOKEN.test(parsed) ||
    IBAN_TOKEN.test(parsed) ||
    PHONE_TOKEN.test(parsed)
  ) {
    fail();
  }
  return parsed;
}

function familyId(value: unknown): PersistedDocumentFamilyIdV2 {
  const profile =
    resolveAeatDocumentProfileV1(value) ??
    resolveAeatOfficialCatalogProfileV9(value);
  if (!profile) fail();
  return profile.id;
}

function normalizedReference(value: unknown): string {
  const parsed = safeString(value, 160, NORMALIZED_REFERENCE_PATTERN);
  if (
    TAX_ID_TOKEN.test(parsed) ||
    IBAN_TOKEN.test(parsed) ||
    PHONE_TOKEN.test(parsed)
  ) {
    fail();
  }
  return parsed;
}

function safeInteger(value: unknown, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) fail();
  return value as number;
}

function finiteNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail();
  return value;
}

function isRealCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined)
    return false;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function temporal(value: unknown): string {
  const parsed = safeString(value, 35);
  const datePart = parsed.slice(0, 10);
  const timeMatch = parsed.match(/T(\d{2}):(\d{2}):(\d{2})/u);
  if (
    !(DATE_PATTERN.test(parsed) || DATE_TIME_PATTERN.test(parsed)) ||
    !isRealCalendarDate(datePart) ||
    (timeMatch !== null &&
      (Number(timeMatch[1]) > 23 ||
        Number(timeMatch[2]) > 59 ||
        Number(timeMatch[3]) > 59)) ||
    Number.isNaN(
      Date.parse(parsed.length === 10 ? `${parsed}T00:00:00Z` : parsed),
    )
  ) {
    fail();
  }
  return parsed;
}

function timestamp(value: unknown): string {
  const parsed = temporal(value);
  if (!DATE_TIME_PATTERN.test(parsed)) fail();
  return parsed;
}

function array(
  value: unknown,
  max = FISCAL_NOTIFICATIONS_WORKSPACE_MAX_COLLECTION_ITEMS_V2,
): unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length > 0
  ) {
    fail();
  }
  const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
    string,
    PropertyDescriptor
  >;
  const lengthDescriptor = descriptors.length;
  const rawLength =
    lengthDescriptor && "value" in lengthDescriptor
      ? lengthDescriptor.value
      : null;
  if (
    !lengthDescriptor ||
    typeof rawLength !== "number" ||
    !Number.isSafeInteger(rawLength) ||
    rawLength < 0 ||
    rawLength > max
  ) {
    fail();
  }
  const length = rawLength;
  const result: unknown[] = [];
  for (const key of Object.keys(descriptors)) {
    if (key === "length") continue;
    if (!/^(?:0|[1-9]\d*)$/u.test(key)) fail();
    const index = Number(key);
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      index >= length ||
      !("value" in descriptor) ||
      !descriptor.enumerable
    ) {
      fail();
    }
  }
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      fail();
    result.push(descriptor.value);
  }
  return result;
}

function idArray(value: unknown, max = 256): string[] {
  const result = array(value, max).map(id);
  if (new Set(result).size !== result.length) fail();
  return result;
}

function assertion(value: unknown): AssertionTypeV2 {
  return enumValue(value, ASSERTION_TYPES_V2);
}

function issuer(value: unknown): IssuerCodeV2 {
  return enumValue(value, ISSUER_CODES_V2);
}

function parseAccountHolder(
  value: unknown,
  expectedOwner: string,
): AccountHolderIdentityV2 {
  const source = record(value, [
    "ownerScope",
    "role",
    "identityMatchStatus",
    "identityMatchMethod",
  ]);
  return {
    ownerScope: owner(required(source, "ownerScope"), expectedOwner),
    role: enumValue(required(source, "role"), ["ACCOUNT_HOLDER"] as const),
    identityMatchStatus: enumValue(required(source, "identityMatchStatus"), [
      "MATCH",
      "MISMATCH",
      "UNKNOWN",
    ] as const),
    identityMatchMethod: enumValue(required(source, "identityMatchMethod"), [
      "TAX_ID",
      "STRUCTURAL_ROLE",
      "NOT_AVAILABLE",
    ] as const),
  };
}

function parseDocument(
  value: unknown,
  expectedOwner: string,
): PersistedDocumentV2 {
  const source = record(value, [
    "id",
    "ownerScope",
    "familyId",
    "legacyDocumentType",
    "recognitionStatus",
    "issuerCode",
    "reviewStatus",
    "chronologyDate",
    "chronologyBasis",
    "dateFactIds",
    "referenceIds",
    "amountFactIds",
    "factIds",
    "evidenceIds",
    "createdAt",
    "updatedAt",
  ]);
  const chronologyDateValue = required(source, "chronologyDate");
  const chronologyDate =
    chronologyDateValue === null ? null : temporal(chronologyDateValue);
  const chronologyBasisValue = required(source, "chronologyBasis");
  const chronologyBasis =
    chronologyBasisValue === null
      ? null
      : enumValue(chronologyBasisValue, CHRONOLOGY_BASES_V2);
  if ((chronologyDate === null) !== (chronologyBasis === null)) fail();
  const rawFamilyId = required(source, "familyId");
  const parsedFamilyId = rawFamilyId === null ? null : familyId(rawFamilyId);
  const rawLegacyType = required(source, "legacyDocumentType");
  const legacyDocumentType =
    rawLegacyType === null
      ? null
      : enumValue(rawLegacyType, LEGACY_ADMINISTRATIVE_DOCUMENT_TYPES_V2);
  const recognitionStatus = enumValue(required(source, "recognitionStatus"), [
    "EXACT_FAMILY",
    "LEGACY_TYPE_ONLY",
    "UNKNOWN",
  ] as const);
  if (
    (recognitionStatus === "EXACT_FAMILY" && parsedFamilyId === null) ||
    (recognitionStatus !== "EXACT_FAMILY" && parsedFamilyId !== null) ||
    (recognitionStatus === "LEGACY_TYPE_ONLY" &&
      (legacyDocumentType === null || legacyDocumentType === "UNKNOWN")) ||
    (recognitionStatus === "UNKNOWN" &&
      legacyDocumentType !== null &&
      legacyDocumentType !== "UNKNOWN")
  ) {
    fail();
  }
  return {
    id: id(required(source, "id")),
    ownerScope: owner(required(source, "ownerScope"), expectedOwner),
    familyId: parsedFamilyId,
    legacyDocumentType,
    recognitionStatus,
    issuerCode: issuer(required(source, "issuerCode")),
    reviewStatus: enumValue(required(source, "reviewStatus"), [
      "PENDING",
      "CONFIRMED",
      "CORRECTED",
    ] as const),
    chronologyDate,
    chronologyBasis,
    dateFactIds: idArray(required(source, "dateFactIds")),
    referenceIds: idArray(required(source, "referenceIds")),
    amountFactIds: idArray(required(source, "amountFactIds")),
    factIds: idArray(required(source, "factIds")),
    evidenceIds: idArray(required(source, "evidenceIds")),
    createdAt: timestamp(required(source, "createdAt")),
    updatedAt: timestamp(required(source, "updatedAt")),
  };
}

function parseReference(
  value: unknown,
  expectedOwner: string,
): PersistedReferenceV2 {
  const source = record(value, [
    "id",
    "ownerScope",
    "documentId",
    "referenceType",
    "issuerCode",
    "value",
    "assertionType",
    "evidenceIds",
  ]);
  const referenceType = enumValue(
    required(source, "referenceType"),
    REFERENCE_TYPES_V2,
  );
  const valueSource = required(source, "value");
  let parsedValue: NormalizedReferenceValueV2 | SensitiveReferenceV2;
  if (
    (SENSITIVE_REFERENCE_TYPES_V2 as readonly string[]).includes(referenceType)
  ) {
    if (!isSensitiveReferenceV2(valueSource)) fail();
    const snapshot = snapshotSensitiveReferenceV2(valueSource);
    if (!snapshot || snapshot.referenceType !== referenceType) fail();
    parsedValue = snapshot;
  } else {
    const normalized = record(valueSource, ["storage", "normalizedValue"]);
    parsedValue = {
      storage: enumValue(required(normalized, "storage"), [
        "NORMALIZED_REFERENCE",
      ] as const),
      normalizedValue: normalizedReference(
        required(normalized, "normalizedValue"),
      ),
    };
  }
  return {
    id: id(required(source, "id")),
    ownerScope: owner(required(source, "ownerScope"), expectedOwner),
    documentId: id(required(source, "documentId")),
    referenceType,
    issuerCode: issuer(required(source, "issuerCode")),
    value: parsedValue,
    assertionType: assertion(required(source, "assertionType")),
    evidenceIds: idArray(required(source, "evidenceIds")),
  };
}

function referenceEqualityKey(reference: PersistedReferenceV2): string {
  const value =
    reference.value.storage === "FINGERPRINT_ONLY"
      ? reference.value.fingerprintSha256
      : reference.value.normalizedValue;
  return [reference.issuerCode, reference.referenceType, value].join("|");
}

function parseDate(value: unknown, expectedOwner: string): PersistedDateFactV2 {
  const source = record(value, [
    "id",
    "ownerScope",
    "documentId",
    "fieldId",
    "kind",
    "value",
    "assertionType",
    "evidenceIds",
  ]);
  return {
    id: id(required(source, "id")),
    ownerScope: owner(required(source, "ownerScope"), expectedOwner),
    documentId: id(required(source, "documentId")),
    fieldId: technical(required(source, "fieldId")),
    kind: enumValue(required(source, "kind"), DOCUMENT_DATE_KINDS_V2),
    value: temporal(required(source, "value")),
    assertionType: assertion(required(source, "assertionType")),
    evidenceIds: idArray(required(source, "evidenceIds")),
  };
}

function parseAmount(
  value: unknown,
  expectedOwner: string,
): PersistedAmountFactV2 {
  const source = record(value, [
    "id",
    "ownerScope",
    "documentId",
    "fieldId",
    "componentType",
    "amountCents",
    "currency",
    "assertionType",
    "evidenceIds",
  ]);
  return {
    id: id(required(source, "id")),
    ownerScope: owner(required(source, "ownerScope"), expectedOwner),
    documentId: id(required(source, "documentId")),
    fieldId: technical(required(source, "fieldId")),
    componentType: technical(required(source, "componentType")),
    amountCents: safeInteger(required(source, "amountCents")),
    currency: enumValue(required(source, "currency"), ["EUR"] as const),
    assertionType: assertion(required(source, "assertionType")),
    evidenceIds: idArray(required(source, "evidenceIds")),
  };
}

function parseFact(
  value: unknown,
  expectedOwner: string,
): PersistedTypedFactV2 {
  const discriminator = record(value, [
    "id",
    "ownerScope",
    "documentId",
    "fieldId",
    "valueType",
    "booleanValue",
    "integerValue",
    "stateValue",
    "assertionType",
    "evidenceIds",
  ]);
  const base = {
    id: id(required(discriminator, "id")),
    ownerScope: owner(required(discriminator, "ownerScope"), expectedOwner),
    documentId: id(required(discriminator, "documentId")),
    fieldId: technical(required(discriminator, "fieldId")),
    assertionType: assertion(required(discriminator, "assertionType")),
    evidenceIds: idArray(required(discriminator, "evidenceIds")),
  };
  const valueType = enumValue(required(discriminator, "valueType"), [
    "BOOLEAN",
    "INTEGER",
    "STATE",
  ] as const);
  if (valueType === "BOOLEAN") {
    if (
      Object.keys(discriminator).some(
        (key) => key === "integerValue" || key === "stateValue",
      )
    )
      fail();
    const booleanValue = required(discriminator, "booleanValue");
    if (typeof booleanValue !== "boolean") fail();
    return { ...base, valueType, booleanValue };
  }
  if (valueType === "INTEGER") {
    if (
      Object.keys(discriminator).some(
        (key) => key === "booleanValue" || key === "stateValue",
      )
    )
      fail();
    return {
      ...base,
      valueType,
      integerValue: safeInteger(required(discriminator, "integerValue")),
    };
  }
  if (
    Object.keys(discriminator).some(
      (key) => key === "booleanValue" || key === "integerValue",
    )
  )
    fail();
  return {
    ...base,
    valueType,
    stateValue: enumValue(
      required(discriminator, "stateValue"),
      PERSISTED_STATE_VALUES_V2,
    ),
  };
}

function parseLocator(value: unknown): EvidenceLocatorV2 {
  const source = record(value, [
    "kind",
    "x",
    "y",
    "width",
    "height",
    "pageWidth",
    "pageHeight",
  ]);
  const kind = enumValue(required(source, "kind"), [
    "PAGE",
    "BOUNDING_BOX",
  ] as const);
  if (kind === "PAGE") {
    if (Object.keys(source).length !== 1) fail();
    return { kind };
  }
  const result: EvidenceLocatorV2 = {
    kind,
    x: finiteNumber(required(source, "x")),
    y: finiteNumber(required(source, "y")),
    width: finiteNumber(required(source, "width")),
    height: finiteNumber(required(source, "height")),
  };
  if (result.x < 0 || result.y < 0 || result.width <= 0 || result.height <= 0)
    fail();
  if (source.pageWidth !== undefined) {
    result.pageWidth = finiteNumber(source.pageWidth);
    if (result.pageWidth <= 0) fail();
  }
  if (source.pageHeight !== undefined) {
    result.pageHeight = finiteNumber(source.pageHeight);
    if (result.pageHeight <= 0) fail();
  }
  return result;
}

function parseEvidence(
  value: unknown,
  expectedOwner: string,
): PersistedEvidenceV2 {
  const source = record(value, [
    "id",
    "ownerScope",
    "documentId",
    "fieldId",
    "page",
    "locator",
    "extractionMethod",
    "confidence",
    "rule",
    "assertionType",
  ]);
  const ruleSource = record(required(source, "rule"), ["id", "version"]);
  return {
    id: id(required(source, "id")),
    ownerScope: owner(required(source, "ownerScope"), expectedOwner),
    documentId: id(required(source, "documentId")),
    fieldId: technical(required(source, "fieldId")),
    page: safeInteger(required(source, "page"), 1),
    locator: parseLocator(required(source, "locator")),
    extractionMethod: enumValue(required(source, "extractionMethod"), [
      "TEXT_LAYER",
      "OCR",
      "RULE",
      "AI",
      "USER",
    ] as const),
    confidence: enumValue(required(source, "confidence"), [
      "LOW",
      "MEDIUM",
      "HIGH",
      "EXACT",
    ] as const),
    rule: {
      id: technical(required(ruleSource, "id")),
      version: safeString(
        required(ruleSource, "version"),
        32,
        /^[0-9]+(?:\.[0-9]+){0,3}$/u,
      ),
    },
    assertionType: assertion(required(source, "assertionType")),
  };
}

function parseThirdParty(
  value: unknown,
  expectedOwner: string,
): PersistedThirdPartyV2 {
  const source = record(value, [
    "id",
    "ownerScope",
    "documentId",
    "kind",
    "role",
    "ordinal",
    "obligationDirection",
    "amountCents",
    "relevantDate",
    "state",
    "consequence",
    "masterRecordId",
    "evidenceIds",
  ]);
  const result: PersistedThirdPartyV2 = {
    id: id(required(source, "id")),
    ownerScope: owner(required(source, "ownerScope"), expectedOwner),
    documentId: id(required(source, "documentId")),
    kind: enumValue(required(source, "kind"), [
      "PERSON",
      "COMPANY",
      "PUBLIC_BODY",
      "UNKNOWN",
    ] as const),
    role: enumValue(required(source, "role"), [
      "RECIPIENT",
      "PAYER",
      "WITHHOLDER",
      "GARNISHEE",
      "GUARANTOR",
      "REPRESENTATIVE",
      "OTHER",
    ] as const),
    ordinal: safeInteger(required(source, "ordinal"), 1),
    obligationDirection: enumValue(required(source, "obligationDirection"), [
      "OWES",
      "IS_OWED",
      "WITHHOLDS",
      "RECEIVES",
      "UNKNOWN",
    ] as const),
    state: enumValue(required(source, "state"), [
      "UNKNOWN",
      "PENDING",
      "COMPLETED",
      "RELEASED",
      "CANCELLED",
    ] as const),
    consequence: enumValue(required(source, "consequence"), [
      "NONE_STATED",
      "PAYMENT_EXPECTED",
      "RETENTION_EXPECTED",
      "FUNDS_TRANSFER_EXPECTED",
      "RESPONSE_EXPECTED",
      "RELEASE_RECORDED",
      "REVIEW_REQUIRED",
    ] as const),
    evidenceIds: idArray(required(source, "evidenceIds")),
  };
  if (source.amountCents !== undefined)
    result.amountCents = safeInteger(source.amountCents);
  if (source.relevantDate !== undefined)
    result.relevantDate = temporal(source.relevantDate);
  if (source.masterRecordId !== undefined)
    result.masterRecordId = id(source.masterRecordId);
  return result;
}

function parseRelation(
  value: unknown,
  expectedOwner: string,
): PersistedDocumentRelationV2 {
  const source = record(value, [
    "id",
    "ownerScope",
    "sourceDocumentId",
    "targetDocumentId",
    "relationType",
    "status",
    "exactReferenceIds",
    "contextualDateFactIds",
    "contextualAmountFactIds",
    "algorithmVersion",
    "createdAt",
    "reconciliationHistory",
  ]);
  const result: PersistedDocumentRelationV2 = {
    id: id(required(source, "id")),
    ownerScope: owner(required(source, "ownerScope"), expectedOwner),
    sourceDocumentId: id(required(source, "sourceDocumentId")),
    targetDocumentId: id(required(source, "targetDocumentId")),
    relationType: enumValue(
      required(source, "relationType"),
      PERSISTED_DOCUMENT_RELATION_TYPES_V2,
    ),
    status: enumValue(required(source, "status"), [
      "SUGGESTED",
      "USER_CONFIRMED",
      "USER_REJECTED",
      "SYSTEM_CONFIRMED_EXACT",
    ] as const),
    exactReferenceIds: idArray(required(source, "exactReferenceIds")),
    contextualDateFactIds: idArray(required(source, "contextualDateFactIds")),
    contextualAmountFactIds: idArray(
      required(source, "contextualAmountFactIds"),
    ),
    algorithmVersion: safeString(
      required(source, "algorithmVersion"),
      32,
      /^[A-Za-z0-9][A-Za-z0-9_.\-]{0,31}$/u,
    ),
    createdAt: timestamp(required(source, "createdAt")),
  };
  if (source.reconciliationHistory !== undefined) {
    result.reconciliationHistory = parseReconciliationHistory(
      source.reconciliationHistory,
    );
  }
  if (result.sourceDocumentId === result.targetDocumentId) fail();
  if (
    result.status === "SYSTEM_CONFIRMED_EXACT" &&
    result.exactReferenceIds.length === 0
  )
    fail();
  if (
    result.status === "SYSTEM_CONFIRMED_EXACT" &&
    LEGACY_ONLY_DOCUMENT_RELATION_TYPES_V2.includes(
      result.relationType as (typeof LEGACY_ONLY_DOCUMENT_RELATION_TYPES_V2)[number],
    )
  )
    fail();
  return result;
}

function parseReconciliationHistory(
  value: unknown,
): DocumentRelationReconciliationRecordV8[] {
  const entries = array(value, 32);
  return entries.map((entry) => {
    const source = record(entry, [
      "ruleVersion",
      "previousStatus",
      "newStatus",
      "resultClassification",
      "previousRelationType",
      "newRelationType",
      "globalRelationType",
      "evidenceKinds",
      "reasonCode",
      "reevaluatedAt",
      "rowAssignmentReviewRequired",
    ]);
    const previousRelationType = enumValue(
      required(source, "previousRelationType"),
      ["ABSENT", ...PERSISTED_DOCUMENT_RELATION_TYPES_V2] as const,
    );
    const rowAssignmentReviewRequired = required(
      source,
      "rowAssignmentReviewRequired",
    );
    if (typeof rowAssignmentReviewRequired !== "boolean") fail();
    const result: DocumentRelationReconciliationRecordV8 = {
      ruleVersion: enumValue(required(source, "ruleVersion"), [
        "global-reconcile-v8",
      ] as const),
      previousStatus: enumValue(required(source, "previousStatus"), [
        "ABSENT",
        "SUGGESTED",
        "USER_CONFIRMED",
        "USER_REJECTED",
        "SYSTEM_CONFIRMED_EXACT",
      ] as const),
      newStatus: enumValue(required(source, "newStatus"), [
        "SUGGESTED",
        "USER_CONFIRMED",
        "USER_REJECTED",
        "SYSTEM_CONFIRMED_EXACT",
      ] as const),
      resultClassification: enumValue(
        required(source, "resultClassification"),
        [
          "SUGGESTED",
          "SYSTEM_CONFIRMED_EXACT",
          "SYSTEM_CONFIRMED_EXACT_CASE_LEVEL",
          "SYSTEM_CONFIRMED_EXACT_ASSET",
        ] as const,
      ),
      previousRelationType: previousRelationType as DocumentRelationReconciliationRecordV8["previousRelationType"],
      newRelationType: enumValue(
        required(source, "newRelationType"),
        PERSISTED_DOCUMENT_RELATION_TYPES_V2,
      ),
      globalRelationType: enumValue(required(source, "globalRelationType"), [
        "RESOLUTION_ENFORCED",
        "ENFORCES_REMAINING_PLAN_PRINCIPAL",
        "ENFORCES",
        "CITED_AS_EXISTING_EXECUTIVE_DEBT",
        "OFFSET_APPLIES_TO_MODIFIED_PAYMENT_PLAN",
        "RELEASES_SEIZURE",
        "RELEASED_ASSET_LATER_RESEIZED",
        "POSSIBLY_PRECEDES_ASSESSMENT",
        "NOTIFICATION_EVIDENCE_FOR",
      ] as const),
      evidenceKinds: array(required(source, "evidenceKinds"), 16).map(
        (kind) => enumValue(kind, [
          "EXACT_REFERENCE",
          "PAYMENT_FORM_PART",
          "COMPATIBLE_AMOUNT",
          "REMAINING_PLAN_PRINCIPAL",
          "EXECUTIVE_DEBT_CITATION",
          "MODIFIED_PLAN_STRUCTURE",
          "RECALCULATED_OFFSET_ROWS",
          "EXACT_SEIZURE_REFERENCE",
          "OWNER_SCOPED_OPAQUE_ASSET",
          "MODEL_AND_FISCAL_YEAR",
          "NOTIFICATION_PROOF_REFERENCE",
        ] as const),
      ),
      reasonCode: enumValue(required(source, "reasonCode"), [
        "NEW_DIRECT_EDGE",
        "SUGGESTION_UPGRADED_BY_EXACT_EVIDENCE",
        "NEW_EVIDENCE_CHANGED_CLASSIFICATION",
      ] as const),
      reevaluatedAt: timestamp(required(source, "reevaluatedAt")),
      rowAssignmentReviewRequired,
    };
    if (new Set(result.evidenceKinds).size !== result.evidenceKinds.length) fail();
    return result;
  });
}

function parseDriveArchive(
  value: unknown,
  expectedOwner: string,
): PersistedDriveArchiveV2 {
  const source = record(value, [
    "id",
    "ownerScope",
    "documentIds",
    "sourceSha256",
    "driveFileId",
    "driveFolderId",
    "documentDate",
    "archiveStatus",
    "reviewStatus",
    "verificationMethod",
    "archivedAt",
  ]);
  const documentDateValue = required(source, "documentDate");
  return {
    id: id(required(source, "id")),
    ownerScope: owner(required(source, "ownerScope"), expectedOwner),
    documentIds: idArray(required(source, "documentIds")),
    sourceSha256: safeString(
      required(source, "sourceSha256"),
      64,
      HASH_PATTERN,
    ),
    driveFileId: id(required(source, "driveFileId")),
    driveFolderId: id(required(source, "driveFolderId")),
    documentDate:
      documentDateValue === null ? null : temporal(documentDateValue),
    archiveStatus: enumValue(required(source, "archiveStatus"), [
      "ARCHIVED_VERIFIED",
    ] as const),
    reviewStatus: enumValue(required(source, "reviewStatus"), [
      "USER_CONFIRMED",
    ] as const),
    verificationMethod: enumValue(required(source, "verificationMethod"), [
      "SHA256_READBACK_MATCH",
    ] as const),
    archivedAt: timestamp(required(source, "archivedAt")),
  };
}

function requireUniqueIds(
  entities: readonly { id: string }[],
  global: Set<string>,
): void {
  for (const entity of entities) {
    if (global.has(entity.id)) fail();
    global.add(entity.id);
  }
}

function assertLinkedIds(
  ids: readonly string[],
  allowed: ReadonlySet<string>,
): void {
  if (ids.some((entry) => !allowed.has(entry))) fail();
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * Strict fail-closed persistence boundary for the privacy-minimized workspace.
 * It never reports offending values and returns a fresh, deeply frozen graph.
 */
export function parseFiscalNotificationsWorkspaceForPersistenceV2(
  value: unknown,
  expectedOwnerScope: string,
): Readonly<FiscalNotificationsPersistedWorkspaceV2> | null {
  try {
    const expectedOwner = canonicalFiscalNotificationOwnerScopeV2(
      expectedOwnerScope,
    );
    if (!expectedOwner) fail();
    const source = record(value, [
      "schemaVersion",
      "workspaceId",
      "ownerScope",
      "revision",
      "createdAt",
      "updatedAt",
      "accountHolder",
      "documents",
      "references",
      "dates",
      "amounts",
      "facts",
      "evidence",
      "thirdParties",
      "relations",
      "driveArchives",
    ]);
    if (required(source, "schemaVersion") !== 2) fail();

    const collections = [
      "documents",
      "references",
      "dates",
      "amounts",
      "facts",
      "evidence",
      "thirdParties",
      "relations",
      "driveArchives",
    ] as const;
    const rawCollections = Object.fromEntries(
      collections.map((key) => [key, array(required(source, key))]),
    ) as Record<(typeof collections)[number], unknown[]>;
    const total = collections.reduce(
      (sum, key) => sum + rawCollections[key].length,
      0,
    );
    if (total > FISCAL_NOTIFICATIONS_WORKSPACE_MAX_ENTITIES_V2) fail();

    const parsed: FiscalNotificationsPersistedWorkspaceV2 = {
      schemaVersion: 2,
      workspaceId: id(required(source, "workspaceId")),
      ownerScope: owner(required(source, "ownerScope"), expectedOwner),
      revision: safeInteger(required(source, "revision")),
      createdAt: timestamp(required(source, "createdAt")),
      updatedAt: timestamp(required(source, "updatedAt")),
      accountHolder: parseAccountHolder(
        required(source, "accountHolder"),
        expectedOwner,
      ),
      documents: rawCollections.documents.map((entry) =>
        parseDocument(entry, expectedOwner),
      ),
      references: rawCollections.references.map((entry) =>
        parseReference(entry, expectedOwner),
      ),
      dates: rawCollections.dates.map((entry) =>
        parseDate(entry, expectedOwner),
      ),
      amounts: rawCollections.amounts.map((entry) =>
        parseAmount(entry, expectedOwner),
      ),
      facts: rawCollections.facts.map((entry) =>
        parseFact(entry, expectedOwner),
      ),
      evidence: rawCollections.evidence.map((entry) =>
        parseEvidence(entry, expectedOwner),
      ),
      thirdParties: rawCollections.thirdParties.map((entry) =>
        parseThirdParty(entry, expectedOwner),
      ),
      relations: rawCollections.relations.map((entry) =>
        parseRelation(entry, expectedOwner),
      ),
      driveArchives: rawCollections.driveArchives.map((entry) =>
        parseDriveArchive(entry, expectedOwner),
      ),
    };

    const globalIds = new Set<string>();
    for (const collection of collections)
      requireUniqueIds(parsed[collection], globalIds);
    const documentsById = new Map(
      parsed.documents.map((entry) => [entry.id, entry] as const),
    );
    const documents = new Set(documentsById.keys());
    const references = new Map(
      parsed.references.map((entry) => [entry.id, entry]),
    );
    const dates = new Map(parsed.dates.map((entry) => [entry.id, entry]));
    const amounts = new Map(parsed.amounts.map((entry) => [entry.id, entry]));
    const facts = new Map(parsed.facts.map((entry) => [entry.id, entry]));
    const evidence = new Map(parsed.evidence.map((entry) => [entry.id, entry]));
    const referenceIds = new Set(references.keys());
    const dateIds = new Set(dates.keys());
    const amountIds = new Set(amounts.keys());
    const factIds = new Set(facts.keys());
    const evidenceIds = new Set(evidence.keys());
    const documentMembership = new Map(
      parsed.documents.map((document) => [
        document.id,
        {
          references: new Set(document.referenceIds),
          dates: new Set(document.dateFactIds),
          amounts: new Set(document.amountFactIds),
          facts: new Set(document.factIds),
          evidence: new Set(document.evidenceIds),
        },
      ] as const),
    );

    for (const entity of [
      ...parsed.references,
      ...parsed.dates,
      ...parsed.amounts,
      ...parsed.facts,
      ...parsed.evidence,
      ...parsed.thirdParties,
    ]) {
      if (!documents.has(entity.documentId)) fail();
    }
    for (const document of parsed.documents) {
      assertLinkedIds(document.referenceIds, referenceIds);
      assertLinkedIds(document.dateFactIds, dateIds);
      assertLinkedIds(document.amountFactIds, amountIds);
      assertLinkedIds(document.factIds, factIds);
      assertLinkedIds(document.evidenceIds, evidenceIds);
      if (
        document.referenceIds.some(
          (entry) => references.get(entry)!.documentId !== document.id,
        )
      )
        fail();
      if (
        document.dateFactIds.some(
          (entry) => dates.get(entry)!.documentId !== document.id,
        )
      )
        fail();
      if (
        document.amountFactIds.some(
          (entry) => amounts.get(entry)!.documentId !== document.id,
        )
      )
        fail();
      if (
        document.factIds.some(
          (entry) => facts.get(entry)!.documentId !== document.id,
        )
      )
        fail();
      if (
        document.evidenceIds.some(
          (entry) => evidence.get(entry)!.documentId !== document.id,
        )
      )
        fail();
      if (document.chronologyDate !== null) {
        const expectedKind = document.chronologyBasis as Exclude<
          ChronologyBasisV2,
          "UNKNOWN"
        >;
        if (
          !document.dateFactIds.some(
            (entry) =>
              dates.get(entry)!.kind === expectedKind &&
              dates.get(entry)!.value === document.chronologyDate,
          )
        )
          fail();
      }
    }
    for (const reference of parsed.references) {
      if (!documentMembership.get(reference.documentId)?.references.has(reference.id))
        fail();
    }
    for (const date of parsed.dates) {
      if (!documentMembership.get(date.documentId)?.dates.has(date.id)) fail();
    }
    for (const amount of parsed.amounts) {
      if (!documentMembership.get(amount.documentId)?.amounts.has(amount.id))
        fail();
    }
    for (const fact of parsed.facts) {
      if (!documentMembership.get(fact.documentId)?.facts.has(fact.id)) fail();
    }
    for (const evidenceItem of parsed.evidence) {
      if (!documentMembership.get(evidenceItem.documentId)?.evidence.has(evidenceItem.id))
        fail();
    }
    for (const entity of [
      ...parsed.references,
      ...parsed.dates,
      ...parsed.amounts,
      ...parsed.facts,
      ...parsed.thirdParties,
    ]) {
      assertLinkedIds(entity.evidenceIds, evidenceIds);
      if (
        entity.evidenceIds.some(
          (entry) => evidence.get(entry)!.documentId !== entity.documentId,
        )
      )
        fail();
    }
    for (const relation of parsed.relations) {
      if (
        !documents.has(relation.sourceDocumentId) ||
        !documents.has(relation.targetDocumentId)
      )
        fail();
      assertLinkedIds(relation.exactReferenceIds, referenceIds);
      assertLinkedIds(relation.contextualDateFactIds, dateIds);
      assertLinkedIds(relation.contextualAmountFactIds, amountIds);
      const linkedDocuments = new Set([
        relation.sourceDocumentId,
        relation.targetDocumentId,
      ]);
      if (
        relation.exactReferenceIds.some(
          (entry) => !linkedDocuments.has(references.get(entry)!.documentId),
        )
      )
        fail();
      if (relation.status === "SYSTEM_CONFIRMED_EXACT") {
        const sourceKeys = new Set(
          relation.exactReferenceIds
            .map((entry) => references.get(entry)!)
            .filter((entry) => entry.documentId === relation.sourceDocumentId)
            .map(referenceEqualityKey),
        );
        const targetHasMatchingKey = relation.exactReferenceIds
          .map((entry) => references.get(entry)!)
          .filter((entry) => entry.documentId === relation.targetDocumentId)
          .some((entry) => sourceKeys.has(referenceEqualityKey(entry)));
        if (!targetHasMatchingKey) fail();
      }
      if (
        relation.contextualDateFactIds.some(
          (entry) => !linkedDocuments.has(dates.get(entry)!.documentId),
        )
      )
        fail();
      if (
        relation.contextualAmountFactIds.some(
          (entry) => !linkedDocuments.has(amounts.get(entry)!.documentId),
        )
      )
        fail();
    }
    for (const archive of parsed.driveArchives) {
      if (archive.documentIds.length === 0) fail();
      assertLinkedIds(archive.documentIds, documents);
    }

    const serialized = JSON.stringify(parsed);
    if (
      new TextEncoder().encode(serialized).byteLength >
      FISCAL_NOTIFICATIONS_WORKSPACE_MAX_SERIALIZED_BYTES_V2
    )
      fail();
    return deepFreeze(parsed);
  } catch {
    return null;
  }
}
