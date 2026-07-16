import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  assertBoundedId,
  assertBoundedOwnerScope,
  assertNonNegativeIntegerCents,
} from "../input-contract";
import {
  AEAT_DOCUMENT_PROFILES_V1,
  resolveAeatDocumentProfileV1,
  type AeatDocumentProfileV1,
} from "../knowledge/aeat-document-knowledge.v1";
import type { FiscalNotificationDocumentFamilyIdV3 } from "../knowledge/document-families.v3";
import {
  resolveFiscalNotificationChronologyV2,
  type FiscalNotificationChronologyV2,
} from "../chronology-date.v2";
import {
  snapshotSensitiveReferenceV2,
  type SensitiveReferenceV2,
} from "../sensitive-reference.v2";

export const PROFILE_FIELD_ADAPTER_SCHEMA_VERSION_V2 = 2 as const;
export const PROFILE_FIELD_ADAPTER_VERSION_V2 =
  "profile-field-adapter.2026-07-16.v2" as const;

export const PROFILE_FIELD_ADAPTER_LIMITS_V2 = Object.freeze({
  maxCandidates: 512,
  maxCandidatesPerKind: 128,
  maxEvidenceItems: 512,
  maxOrdinal: 1_000,
  maxNormalizedReferenceChars: 200,
} as const);

export type ProfileReferenceFieldCodeV2 =
  AeatDocumentProfileV1["mustExtract"]["references"][number];
export type ProfileDateFieldCodeV2 =
  AeatDocumentProfileV1["mustExtract"]["dates"][number];
export type ProfileMoneyFieldCodeV2 =
  AeatDocumentProfileV1["mustExtract"]["money"][number];
export type ProfileFactFieldCodeV2 =
  AeatDocumentProfileV1["mustExtract"]["facts"][number];
export type ProfileParticipantRoleCodeV2 =
  AeatDocumentProfileV1["mustExtract"]["participantRoles"][number];

export type ProfileFieldSelectionV2 =
  | Readonly<{
      selectionStatus: "SELECTED";
      familyId: FiscalNotificationDocumentFamilyIdV3;
      basis: "SYSTEM_EXACT" | "USER_SELECTED";
    }>
  | Readonly<{
      selectionStatus: "UNKNOWN" | "AMBIGUOUS" | "NON_EXACT";
      familyId: null;
      basis: null;
    }>;

export interface ProfileFieldEvidenceV2 {
  readonly evidenceId: string;
  readonly pageNumber: number;
  readonly evidenceBasis:
    | "EXPLICIT_DOCUMENT_FIELD"
    | "NORMALIZED_OFFICIAL_EVIDENCE"
    | "USER_PROVIDED_STRUCTURED_VALUE";
  readonly assertionType:
    | "EXPLICIT_IN_DOCUMENT"
    | "CALCULATED_FROM_PRINTED_VALUES"
    | "USER_CONFIRMED";
  readonly confidence: number;
}

interface ProfileFieldCandidateBaseV2 {
  readonly candidateId: string;
  readonly candidateStatus: "EXACT" | "AMBIGUOUS";
  readonly evidence: ProfileFieldEvidenceV2;
}

export interface ProfileReferenceFieldCandidateV2 extends ProfileFieldCandidateBaseV2 {
  readonly kind: "REFERENCE";
  readonly fieldCode: ProfileReferenceFieldCodeV2;
  readonly normalizedValue: string | null;
  readonly sensitiveReference: Readonly<SensitiveReferenceV2> | null;
}

export interface ProfileDateFieldCandidateV2 extends ProfileFieldCandidateBaseV2 {
  readonly kind: "DATE";
  readonly fieldCode: ProfileDateFieldCodeV2;
  readonly valueIso: string;
}

export interface ProfileMoneyFieldCandidateV2 extends ProfileFieldCandidateBaseV2 {
  readonly kind: "MONEY";
  readonly fieldCode: ProfileMoneyFieldCodeV2;
  readonly amountCents: number;
  readonly currency: "EUR";
}

export interface ProfileFactFieldCandidateV2 extends ProfileFieldCandidateBaseV2 {
  readonly kind: "FACT";
  readonly fieldCode: ProfileFactFieldCodeV2;
  readonly observed: true;
}

export interface ProfileParticipantFieldCandidateV2 extends ProfileFieldCandidateBaseV2 {
  readonly kind: "PARTICIPANT_ROLE";
  readonly fieldCode: ProfileParticipantRoleCodeV2;
  readonly ordinal: number;
}

export type ProfileFieldCandidateV2 =
  | ProfileReferenceFieldCandidateV2
  | ProfileDateFieldCandidateV2
  | ProfileMoneyFieldCandidateV2
  | ProfileFactFieldCandidateV2
  | ProfileParticipantFieldCandidateV2;

export interface ProfileFieldAdapterInputV2 {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly selection: ProfileFieldSelectionV2;
  readonly candidates: readonly ProfileFieldCandidateV2[];
}

type ReviewField<T extends ProfileFieldCandidateV2> = Readonly<
  T & {
    readonly reviewStatus: "REVIEW_REQUIRED";
  }
>;

export type ProfileFieldReviewFieldV2 =
  | ReviewField<ProfileReferenceFieldCandidateV2>
  | ReviewField<ProfileDateFieldCandidateV2>
  | ReviewField<ProfileMoneyFieldCandidateV2>
  | ReviewField<ProfileFactFieldCandidateV2>
  | ReviewField<ProfileParticipantFieldCandidateV2>;

export type ProfileFieldAdapterIssueV2 =
  | "FAMILY_SELECTION_UNKNOWN"
  | "FAMILY_SELECTION_AMBIGUOUS"
  | "FAMILY_SELECTION_NON_EXACT"
  | "FAMILY_NOT_REGISTERED"
  | "AMBIGUOUS_FIELD_CANDIDATE"
  | "CONFLICTING_EXACT_FIELD_VALUES"
  | "CANDIDATE_OUTSIDE_PROFILE_CONTRACT"
  | "INCOMPLETE_PROFILE_FIELDS";

export interface ProfileFieldContractV2 {
  readonly references: readonly ProfileReferenceFieldCodeV2[];
  readonly dates: readonly ProfileDateFieldCodeV2[];
  readonly money: readonly ProfileMoneyFieldCodeV2[];
  readonly facts: readonly ProfileFactFieldCodeV2[];
  readonly participantRoles: readonly ProfileParticipantRoleCodeV2[];
}

export interface ProfileFieldAdapterOutcomeV2 {
  readonly schemaVersion: typeof PROFILE_FIELD_ADAPTER_SCHEMA_VERSION_V2;
  readonly adapterVersion: typeof PROFILE_FIELD_ADAPTER_VERSION_V2;
  readonly status: "REVIEW_REQUIRED";
  readonly familyId: FiscalNotificationDocumentFamilyIdV3 | null;
  readonly selectionBasis: "SYSTEM_EXACT" | "USER_SELECTED" | null;
  readonly fields: readonly ProfileFieldReviewFieldV2[];
  readonly unobservedProfileFields: ProfileFieldContractV2;
  readonly chronology: FiscalNotificationChronologyV2;
  readonly issues: readonly ProfileFieldAdapterIssueV2[];
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED";
  readonly confirmsFamily: false;
  readonly confirmsObligation: false;
  readonly confirmsDebt: false;
  readonly confirmsPayment: false;
  readonly confirmsDeadline: false;
  readonly confirmsSeizure: false;
  readonly permitsAccountingAction: false;
}

export interface ProfileFieldAdapterContractV2 {
  readonly familyId: FiscalNotificationDocumentFamilyIdV3;
  readonly adapterVersion: typeof PROFILE_FIELD_ADAPTER_VERSION_V2;
  readonly fieldContract: ProfileFieldContractV2;
  readonly recognitionPolicy: "PRESELECTED_FAMILY_ONLY";
  readonly reviewPolicy: "ALWAYS_REVIEW_REQUIRED";
  readonly materializationPolicy: "PROHIBITED";
  readonly adapt: (input: unknown) => ProfileFieldAdapterOutcomeV2;
}

export class ProfileFieldAdapterValidationError extends Error {
  readonly code = "INVALID_PROFILE_FIELD_ADAPTER_INPUT" as const;

  constructor(path: string) {
    super(`Invalid profile field adapter input at ${path}`);
    this.name = "ProfileFieldAdapterValidationError";
  }
}

type UnknownRecord = Record<string, unknown>;
type CandidateSnapshot =
  | ProfileReferenceFieldCandidateV2
  | ProfileDateFieldCandidateV2
  | ProfileMoneyFieldCandidateV2
  | ProfileFactFieldCandidateV2
  | ProfileParticipantFieldCandidateV2;

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const CANONICAL_OWNER_SCOPE = /^user:[A-Za-z0-9_-]{1,128}$/u;
const CANONICAL_DOCUMENT_ID = /^[A-Za-z0-9][A-Za-z0-9_.:/\-]{0,159}$/u;
const NORMALIZED_REFERENCE = /^[A-Z0-9][A-Z0-9./:_-]{0,199}$/u;
const SPANISH_PERSONAL_TAX_ID =
  /(?:^|[./:_-])(?:\d{8}[./:_-]?[A-Z]|[XYZ][./:_-]?\d{7}[./:_-]?[A-Z]|[ABCDEFGHJKLMNPQRSUVW][./:_-]?\d{7}[./:_-]?[0-9A-J])(?=$|[./:_-])|^NIF[./:_-]?(?:\d{8}[./:_-]?[A-Z]|[XYZ][./:_-]?\d{7}[./:_-]?[A-Z]|[ABCDEFGHJKLMNPQRSUVW][./:_-]?\d{7}[./:_-]?[0-9A-J])$/u;
const SPANISH_IBAN =
  /(?:^|[./:_-])(?:IBAN[./:_-]?)?ES(?:[./:_-]?\d){22}(?=$|[./:_-])/u;
const SPANISH_PHONE =
  /(?:^|[./:_-])(?:34[./:_-]?)?[6789](?:[./:_-]?\d){8}(?=$|[./:_-])/u;
const ISO_CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const SENSITIVE_REFERENCE_CODES = new Set<ProfileReferenceFieldCodeV2>([
  "CSV",
  "NRC",
  "BANK_REFERENCE",
]);
const CANDIDATE_KINDS = [
  "REFERENCE",
  "DATE",
  "MONEY",
  "FACT",
  "PARTICIPANT_ROLE",
] as const;
const EVIDENCE_BASES = [
  "EXPLICIT_DOCUMENT_FIELD",
  "NORMALIZED_OFFICIAL_EVIDENCE",
  "USER_PROVIDED_STRUCTURED_VALUE",
] as const;
const ASSERTION_TYPES = [
  "EXPLICIT_IN_DOCUMENT",
  "CALCULATED_FROM_PRINTED_VALUES",
  "USER_CONFIRMED",
] as const;

function uniqueProfileCodes<T extends string>(
  getCodes: (profile: AeatDocumentProfileV1) => readonly T[],
): readonly T[] {
  return Object.freeze(
    Array.from(new Set(AEAT_DOCUMENT_PROFILES_V1.flatMap(getCodes))),
  );
}

export const PROFILE_REFERENCE_FIELD_CODES_V2 = uniqueProfileCodes(
  (profile) => profile.mustExtract.references,
);
export const PROFILE_DATE_FIELD_CODES_V2 = uniqueProfileCodes(
  (profile) => profile.mustExtract.dates,
);
export const PROFILE_MONEY_FIELD_CODES_V2 = uniqueProfileCodes(
  (profile) => profile.mustExtract.money,
);
export const PROFILE_FACT_FIELD_CODES_V2 = uniqueProfileCodes(
  (profile) => profile.mustExtract.facts,
);
export const PROFILE_PARTICIPANT_ROLE_CODES_V2 = uniqueProfileCodes(
  (profile) => profile.mustExtract.participantRoles,
);

const referenceCodeSet = new Set<string>(PROFILE_REFERENCE_FIELD_CODES_V2);
const dateCodeSet = new Set<string>(PROFILE_DATE_FIELD_CODES_V2);
const moneyCodeSet = new Set<string>(PROFILE_MONEY_FIELD_CODES_V2);
const factCodeSet = new Set<string>(PROFILE_FACT_FIELD_CODES_V2);
const participantCodeSet = new Set<string>(PROFILE_PARTICIPANT_ROLE_CODES_V2);

function invalid(path: string): never {
  throw new ProfileFieldAdapterValidationError(path);
}

function snapshotRecord(value: unknown, path: string): UnknownRecord {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      invalid(path);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) invalid(path);
    const snapshot: UnknownRecord = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") invalid(`${path}.$shape`);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        !descriptor ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        invalid(`${path}.$shape`);
      }
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch (error) {
    if (error instanceof ProfileFieldAdapterValidationError) throw error;
    invalid(path);
  }
}

function snapshotArray(
  value: unknown,
  path: string,
  maximum: number,
): readonly unknown[] {
  try {
    if (
      !Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Array.prototype
    ) {
      invalid(path);
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    const length = lengthDescriptor?.value;
    if (!Number.isSafeInteger(length) || length < 0 || length > maximum) {
      invalid(path);
    }
    const snapshot: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (
        !descriptor ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        invalid(`${path}[${index}]`);
      }
      snapshot.push(descriptor.value);
    }
    if (Reflect.ownKeys(value).length !== length + 1) invalid(`${path}.$shape`);
    return snapshot;
  } catch (error) {
    if (error instanceof ProfileFieldAdapterValidationError) throw error;
    invalid(path);
  }
}

function expectKeys(
  record: UnknownRecord,
  path: string,
  expected: readonly string[],
): void {
  const keys = Object.keys(record);
  const expectedSet = new Set(expected);
  for (const key of keys) {
    if (!expectedSet.has(key)) invalid(`${path}.$unknown`);
  }
  for (const key of expected) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      invalid(`${path}.${key}`);
    }
  }
}

function expectBoundedString(
  value: unknown,
  path: string,
  maximum: number = FISCAL_NOTIFICATION_INPUT_LIMITS.maxIdChars,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum ||
    value !== value.trim() ||
    CONTROL_CHARACTERS.test(value)
  ) {
    invalid(path);
  }
  return value;
}

function expectEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  path: string,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) invalid(path);
  return value as T[number];
}

function expectFiniteConfidence(value: unknown, path: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    invalid(path);
  }
  return value;
}

function expectPageNumber(value: unknown, path: string): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages
  ) {
    invalid(path);
  }
  return Number(value);
}

function expectOrdinal(value: unknown, path: string): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > PROFILE_FIELD_ADAPTER_LIMITS_V2.maxOrdinal
  ) {
    invalid(path);
  }
  return Number(value);
}

function isExactIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || value.length !== 10) return false;
  const match = ISO_CALENDAR_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateSelection(value: unknown): ProfileFieldSelectionV2 {
  const selection = snapshotRecord(value, "selection");
  expectKeys(selection, "selection", ["selectionStatus", "familyId", "basis"]);
  const status = expectEnum(
    selection.selectionStatus,
    ["SELECTED", "UNKNOWN", "AMBIGUOUS", "NON_EXACT"] as const,
    "selection.selectionStatus",
  );
  if (status === "SELECTED") {
    const familyId = expectBoundedString(
      selection.familyId,
      "selection.familyId",
    );
    const basis = expectEnum(
      selection.basis,
      ["SYSTEM_EXACT", "USER_SELECTED"] as const,
      "selection.basis",
    );
    return Object.freeze({
      selectionStatus: status,
      familyId,
      basis,
    }) as ProfileFieldSelectionV2;
  }
  if (selection.familyId !== null) invalid("selection.familyId");
  if (selection.basis !== null) invalid("selection.basis");
  return Object.freeze({
    selectionStatus: status,
    familyId: null,
    basis: null,
  });
}

function validateEvidence(
  value: unknown,
  path: string,
): ProfileFieldEvidenceV2 {
  const evidence = snapshotRecord(value, path);
  expectKeys(evidence, path, [
    "evidenceId",
    "pageNumber",
    "evidenceBasis",
    "assertionType",
    "confidence",
  ]);
  return Object.freeze({
    evidenceId: expectBoundedString(evidence.evidenceId, `${path}.evidenceId`),
    pageNumber: expectPageNumber(evidence.pageNumber, `${path}.pageNumber`),
    evidenceBasis: expectEnum(
      evidence.evidenceBasis,
      EVIDENCE_BASES,
      `${path}.evidenceBasis`,
    ),
    assertionType: expectEnum(
      evidence.assertionType,
      ASSERTION_TYPES,
      `${path}.assertionType`,
    ),
    confidence: expectFiniteConfidence(
      evidence.confidence,
      `${path}.confidence`,
    ),
  });
}

function validateNormalizedReference(
  value: unknown,
  fieldCode: ProfileReferenceFieldCodeV2,
  path: string,
): string {
  const normalized = expectBoundedString(
    value,
    path,
    PROFILE_FIELD_ADAPTER_LIMITS_V2.maxNormalizedReferenceChars,
  );
  if (
    normalized !== normalized.normalize("NFKC").toUpperCase() ||
    !NORMALIZED_REFERENCE.test(normalized) ||
    !/\d/u.test(normalized) ||
    SPANISH_PERSONAL_TAX_ID.test(normalized) ||
    SPANISH_IBAN.test(normalized) ||
    SPANISH_PHONE.test(normalized)
  ) {
    invalid(path);
  }
  if (fieldCode === "MODEL" && !/^\d{3}$/u.test(normalized)) invalid(path);
  if (fieldCode === "FISCAL_YEAR" && !/^(?:19|20)\d{2}$/u.test(normalized)) {
    invalid(path);
  }
  if (
    fieldCode === "TAX_PERIOD" &&
    !/^(?:0A|[1-4]T|0[1-9]|1[0-2])$/u.test(normalized)
  ) {
    invalid(path);
  }
  return normalized;
}

function validateCandidate(value: unknown, index: number): CandidateSnapshot {
  const path = `candidates[${index}]`;
  const candidate = snapshotRecord(value, path);
  const kind = expectEnum(candidate.kind, CANDIDATE_KINDS, `${path}.kind`);
  const common = {
    candidateId: expectBoundedString(
      candidate.candidateId,
      `${path}.candidateId`,
    ),
    candidateStatus: expectEnum(
      candidate.candidateStatus,
      ["EXACT", "AMBIGUOUS"] as const,
      `${path}.candidateStatus`,
    ),
    evidence: validateEvidence(candidate.evidence, `${path}.evidence`),
  } as const;
  if (
    common.evidence.assertionType === "CALCULATED_FROM_PRINTED_VALUES" &&
    kind !== "MONEY"
  ) {
    invalid(`${path}.evidence.assertionType`);
  }

  if (kind === "REFERENCE") {
    expectKeys(candidate, path, [
      "candidateId",
      "candidateStatus",
      "evidence",
      "kind",
      "fieldCode",
      "normalizedValue",
      "sensitiveReference",
    ]);
    const fieldCode = expectBoundedString(
      candidate.fieldCode,
      `${path}.fieldCode`,
    ) as ProfileReferenceFieldCodeV2;
    if (!referenceCodeSet.has(fieldCode)) invalid(`${path}.fieldCode`);
    const sensitive = SENSITIVE_REFERENCE_CODES.has(fieldCode);
    if (sensitive) {
      if (candidate.normalizedValue !== null)
        invalid(`${path}.normalizedValue`);
      const sensitiveReference = snapshotSensitiveReferenceV2(
        candidate.sensitiveReference,
      );
      if (!sensitiveReference || sensitiveReference.referenceType !== fieldCode) {
        invalid(`${path}.sensitiveReference`);
      }
      return Object.freeze({
        ...common,
        kind,
        fieldCode,
        normalizedValue: null,
        sensitiveReference,
      });
    }
    if (candidate.sensitiveReference !== null) {
      invalid(`${path}.sensitiveReference`);
    }
    return Object.freeze({
      ...common,
      kind,
      fieldCode,
      normalizedValue: validateNormalizedReference(
        candidate.normalizedValue,
        fieldCode,
        `${path}.normalizedValue`,
      ),
      sensitiveReference: null,
    });
  }

  if (kind === "DATE") {
    expectKeys(candidate, path, [
      "candidateId",
      "candidateStatus",
      "evidence",
      "kind",
      "fieldCode",
      "valueIso",
    ]);
    const fieldCode = expectBoundedString(
      candidate.fieldCode,
      `${path}.fieldCode`,
    ) as ProfileDateFieldCodeV2;
    if (!dateCodeSet.has(fieldCode)) invalid(`${path}.fieldCode`);
    if (!isExactIsoDate(candidate.valueIso)) invalid(`${path}.valueIso`);
    return Object.freeze({
      ...common,
      kind,
      fieldCode,
      valueIso: candidate.valueIso,
    });
  }

  if (kind === "MONEY") {
    expectKeys(candidate, path, [
      "candidateId",
      "candidateStatus",
      "evidence",
      "kind",
      "fieldCode",
      "amountCents",
      "currency",
    ]);
    const fieldCode = expectBoundedString(
      candidate.fieldCode,
      `${path}.fieldCode`,
    ) as ProfileMoneyFieldCodeV2;
    if (!moneyCodeSet.has(fieldCode)) invalid(`${path}.fieldCode`);
    try {
      assertNonNegativeIntegerCents(
        candidate.amountCents,
        `${path}.amountCents`,
      );
    } catch {
      invalid(`${path}.amountCents`);
    }
    if (candidate.currency !== "EUR") invalid(`${path}.currency`);
    return Object.freeze({
      ...common,
      kind,
      fieldCode,
      amountCents: candidate.amountCents,
      currency: "EUR",
    });
  }

  if (kind === "FACT") {
    expectKeys(candidate, path, [
      "candidateId",
      "candidateStatus",
      "evidence",
      "kind",
      "fieldCode",
      "observed",
    ]);
    const fieldCode = expectBoundedString(
      candidate.fieldCode,
      `${path}.fieldCode`,
    ) as ProfileFactFieldCodeV2;
    if (!factCodeSet.has(fieldCode)) invalid(`${path}.fieldCode`);
    if (candidate.observed !== true) invalid(`${path}.observed`);
    return Object.freeze({
      ...common,
      kind,
      fieldCode,
      observed: true,
    });
  }

  expectKeys(candidate, path, [
    "candidateId",
    "candidateStatus",
    "evidence",
    "kind",
    "fieldCode",
    "ordinal",
  ]);
  const fieldCode = expectBoundedString(
    candidate.fieldCode,
    `${path}.fieldCode`,
  ) as ProfileParticipantRoleCodeV2;
  if (!participantCodeSet.has(fieldCode)) invalid(`${path}.fieldCode`);
  return Object.freeze({
    ...common,
    kind: "PARTICIPANT_ROLE",
    fieldCode,
    ordinal: expectOrdinal(candidate.ordinal, `${path}.ordinal`),
  });
}

function freezeFieldContract(
  profile: AeatDocumentProfileV1,
): ProfileFieldContractV2 {
  return Object.freeze({
    references: Object.freeze([...profile.mustExtract.references]),
    dates: Object.freeze([...profile.mustExtract.dates]),
    money: Object.freeze([...profile.mustExtract.money]),
    facts: Object.freeze([...profile.mustExtract.facts]),
    participantRoles: Object.freeze([...profile.mustExtract.participantRoles]),
  });
}

function emptyFieldContract(
  contract: ProfileFieldContractV2 | null,
): ProfileFieldContractV2 {
  return (
    contract ??
    Object.freeze({
      references: Object.freeze([]),
      dates: Object.freeze([]),
      money: Object.freeze([]),
      facts: Object.freeze([]),
      participantRoles: Object.freeze([]),
    })
  );
}

function issueForSelection(
  status: Exclude<ProfileFieldSelectionV2["selectionStatus"], "SELECTED">,
): ProfileFieldAdapterIssueV2 {
  return status === "UNKNOWN"
    ? "FAMILY_SELECTION_UNKNOWN"
    : status === "AMBIGUOUS"
      ? "FAMILY_SELECTION_AMBIGUOUS"
      : "FAMILY_SELECTION_NON_EXACT";
}

function fieldBelongsToContract(
  candidate: CandidateSnapshot,
  contract: ProfileFieldContractV2,
): boolean {
  switch (candidate.kind) {
    case "REFERENCE":
      return contract.references.includes(candidate.fieldCode);
    case "DATE":
      return contract.dates.includes(candidate.fieldCode);
    case "MONEY":
      return contract.money.includes(candidate.fieldCode);
    case "FACT":
      return contract.facts.includes(candidate.fieldCode);
    case "PARTICIPANT_ROLE":
      return contract.participantRoles.includes(candidate.fieldCode);
  }
}

function candidateComparableValue(candidate: CandidateSnapshot): string {
  switch (candidate.kind) {
    case "REFERENCE":
      return candidate.sensitiveReference
        ? candidate.sensitiveReference.fingerprintSha256
        : candidate.normalizedValue ?? "";
    case "DATE":
      return candidate.valueIso;
    case "MONEY":
      return `${candidate.currency}:${candidate.amountCents}`;
    case "FACT":
      return String(candidate.observed);
    case "PARTICIPANT_ROLE":
      return String(candidate.ordinal);
  }
}

function hasConflictingExactFieldValues(
  candidates: readonly CandidateSnapshot[],
): boolean {
  const byField = new Map<string, Set<string>>();
  for (const candidate of candidates) {
    if (
      candidate.kind === "PARTICIPANT_ROLE" ||
      candidate.candidateStatus !== "EXACT"
    ) {
      continue;
    }
    const key = `${candidate.kind}:${candidate.fieldCode}`;
    const values = byField.get(key) ?? new Set<string>();
    values.add(candidateComparableValue(candidate));
    if (values.size > 1) return true;
    byField.set(key, values);
  }
  return false;
}

function chronologyFromFields(
  fields: readonly ProfileFieldReviewFieldV2[],
): FiscalNotificationChronologyV2 {
  const dates = fields.filter(
    (field): field is ReviewField<ProfileDateFieldCandidateV2> =>
      field.kind === "DATE",
  );
  const singleUnambiguous = (
    fieldCode: ProfileDateFieldCodeV2,
  ): string | null => {
    const values = new Set(
      dates
        .filter((date) => date.fieldCode === fieldCode)
        .map((date) => date.valueIso),
    );
    return values.size === 1 ? [...values][0]! : null;
  };
  return resolveFiscalNotificationChronologyV2({
    issueDate: singleUnambiguous("ISSUE_DATE"),
    signingDate: singleUnambiguous("SIGNING_DATE"),
    actionDate: singleUnambiguous("ACTION_DATE"),
    effectiveNotificationDate: singleUnambiguous(
      "EFFECTIVE_NOTIFICATION_DATE",
    ),
  });
}

function unobservedFields(
  contract: ProfileFieldContractV2,
  fields: readonly ProfileFieldReviewFieldV2[],
): ProfileFieldContractV2 {
  const observed = {
    references: new Set(
      fields
        .filter((field) => field.kind === "REFERENCE")
        .map((field) => field.fieldCode),
    ),
    dates: new Set(
      fields
        .filter((field) => field.kind === "DATE")
        .map((field) => field.fieldCode),
    ),
    money: new Set(
      fields
        .filter((field) => field.kind === "MONEY")
        .map((field) => field.fieldCode),
    ),
    facts: new Set(
      fields
        .filter((field) => field.kind === "FACT")
        .map((field) => field.fieldCode),
    ),
    participantRoles: new Set(
      fields
        .filter((field) => field.kind === "PARTICIPANT_ROLE")
        .map((field) => field.fieldCode),
    ),
  };
  return Object.freeze({
    references: Object.freeze(
      contract.references.filter((code) => !observed.references.has(code)),
    ),
    dates: Object.freeze(
      contract.dates.filter((code) => !observed.dates.has(code)),
    ),
    money: Object.freeze(
      contract.money.filter((code) => !observed.money.has(code)),
    ),
    facts: Object.freeze(
      contract.facts.filter((code) => !observed.facts.has(code)),
    ),
    participantRoles: Object.freeze(
      contract.participantRoles.filter(
        (code) => !observed.participantRoles.has(code),
      ),
    ),
  });
}

function hasUnobservedFields(contract: ProfileFieldContractV2): boolean {
  return (
    contract.references.length > 0 ||
    contract.dates.length > 0 ||
    contract.money.length > 0 ||
    contract.facts.length > 0 ||
    contract.participantRoles.length > 0
  );
}

function freezeReviewField(
  candidate: CandidateSnapshot,
): ProfileFieldReviewFieldV2 {
  return Object.freeze({
    ...candidate,
    evidence: Object.freeze({ ...candidate.evidence }),
    ...(candidate.kind === "REFERENCE" && candidate.sensitiveReference
      ? {
          sensitiveReference: Object.freeze({
            ...candidate.sensitiveReference,
          }),
        }
      : {}),
    reviewStatus: "REVIEW_REQUIRED" as const,
  }) as ProfileFieldReviewFieldV2;
}

function buildOutcome(input: {
  familyId: FiscalNotificationDocumentFamilyIdV3 | null;
  selectionBasis: "SYSTEM_EXACT" | "USER_SELECTED" | null;
  fields: readonly ProfileFieldReviewFieldV2[];
  unobservedProfileFields: ProfileFieldContractV2;
  issues: readonly ProfileFieldAdapterIssueV2[];
}): ProfileFieldAdapterOutcomeV2 {
  return Object.freeze({
    schemaVersion: PROFILE_FIELD_ADAPTER_SCHEMA_VERSION_V2,
    adapterVersion: PROFILE_FIELD_ADAPTER_VERSION_V2,
    status: "REVIEW_REQUIRED" as const,
    familyId: input.familyId,
    selectionBasis: input.selectionBasis,
    fields: Object.freeze([...input.fields]),
    unobservedProfileFields: input.unobservedProfileFields,
    chronology: chronologyFromFields(input.fields),
    issues: Object.freeze([...input.issues]),
    requiresHumanReview: true as const,
    materializationPolicy: "PROHIBITED" as const,
    confirmsFamily: false as const,
    confirmsObligation: false as const,
    confirmsDebt: false as const,
    confirmsPayment: false as const,
    confirmsDeadline: false as const,
    confirmsSeizure: false as const,
    permitsAccountingAction: false as const,
  });
}

function adaptForExpectedFamily(
  expectedFamilyId: FiscalNotificationDocumentFamilyIdV3 | null,
  inputValue: unknown,
): ProfileFieldAdapterOutcomeV2 {
  const input = snapshotRecord(inputValue, "root");
  expectKeys(input, "root", [
    "ownerScope",
    "documentId",
    "selection",
    "candidates",
  ]);
  try {
    assertBoundedOwnerScope(input.ownerScope, "ownerScope");
    assertBoundedId(input.documentId, "documentId");
    if (
      !CANONICAL_OWNER_SCOPE.test(input.ownerScope) ||
      !CANONICAL_DOCUMENT_ID.test(input.documentId)
    ) {
      invalid("identity");
    }
  } catch {
    invalid("identity");
  }
  const selection = validateSelection(input.selection);
  const candidateValues = snapshotArray(
    input.candidates,
    "candidates",
    PROFILE_FIELD_ADAPTER_LIMITS_V2.maxCandidates,
  );
  const candidates = candidateValues.map(validateCandidate);

  const candidateIds = new Set<string>();
  const evidenceIds = new Set<string>();
  const kindCounts = new Map<ProfileFieldCandidateV2["kind"], number>();
  candidates.forEach((candidate, index) => {
    if (candidateIds.has(candidate.candidateId)) {
      invalid(`candidates[${index}].candidateId`);
    }
    candidateIds.add(candidate.candidateId);
    if (evidenceIds.has(candidate.evidence.evidenceId)) {
      invalid(`candidates[${index}].evidence.evidenceId`);
    }
    evidenceIds.add(candidate.evidence.evidenceId);
    const nextCount = (kindCounts.get(candidate.kind) ?? 0) + 1;
    if (nextCount > PROFILE_FIELD_ADAPTER_LIMITS_V2.maxCandidatesPerKind) {
      invalid("candidates");
    }
    kindCounts.set(candidate.kind, nextCount);
  });
  if (evidenceIds.size > PROFILE_FIELD_ADAPTER_LIMITS_V2.maxEvidenceItems) {
    invalid("candidates");
  }

  if (selection.selectionStatus !== "SELECTED") {
    return buildOutcome({
      familyId: null,
      selectionBasis: null,
      fields: [],
      unobservedProfileFields: emptyFieldContract(null),
      issues: [issueForSelection(selection.selectionStatus)],
    });
  }

  const profile = resolveAeatDocumentProfileV1(selection.familyId);
  if (!profile) {
    return buildOutcome({
      familyId: null,
      selectionBasis: null,
      fields: [],
      unobservedProfileFields: emptyFieldContract(null),
      issues: ["FAMILY_NOT_REGISTERED"],
    });
  }
  if (expectedFamilyId !== null && profile.id !== expectedFamilyId) {
    invalid("selection.familyId");
  }
  const contract = freezeFieldContract(profile);
  if (
    candidates.some((candidate) => candidate.candidateStatus === "AMBIGUOUS")
  ) {
    return buildOutcome({
      familyId: profile.id,
      selectionBasis: selection.basis,
      fields: [],
      unobservedProfileFields: contract,
      issues: ["AMBIGUOUS_FIELD_CANDIDATE"],
    });
  }
  if (
    candidates.some((candidate) => !fieldBelongsToContract(candidate, contract))
  ) {
    return buildOutcome({
      familyId: profile.id,
      selectionBasis: selection.basis,
      fields: [],
      unobservedProfileFields: contract,
      issues: ["CANDIDATE_OUTSIDE_PROFILE_CONTRACT"],
    });
  }
  const hasConflictingValues = hasConflictingExactFieldValues(candidates);
  const fields = Object.freeze(candidates.map(freezeReviewField));
  const missing = unobservedFields(contract, fields);
  const issues: ProfileFieldAdapterIssueV2[] = [];
  if (hasConflictingValues) issues.push("CONFLICTING_EXACT_FIELD_VALUES");
  if (hasUnobservedFields(missing)) issues.push("INCOMPLETE_PROFILE_FIELDS");
  return buildOutcome({
    familyId: profile.id,
    selectionBasis: selection.basis,
    fields,
    unobservedProfileFields: missing,
    issues,
  });
}

export const PROFILE_FIELD_ADAPTERS_V2 = Object.freeze(
  AEAT_DOCUMENT_PROFILES_V1.map((profile): ProfileFieldAdapterContractV2 => {
    const familyId = profile.id;
    return Object.freeze({
      familyId,
      adapterVersion: PROFILE_FIELD_ADAPTER_VERSION_V2,
      fieldContract: freezeFieldContract(profile),
      recognitionPolicy: "PRESELECTED_FAMILY_ONLY" as const,
      reviewPolicy: "ALWAYS_REVIEW_REQUIRED" as const,
      materializationPolicy: "PROHIBITED" as const,
      adapt: (input: unknown) => adaptForExpectedFamily(familyId, input),
    });
  }),
);

const adapterByFamilyId = new Map(
  PROFILE_FIELD_ADAPTERS_V2.map(
    (adapter) => [adapter.familyId, adapter] as const,
  ),
);

export function resolveProfileFieldAdapterV2(
  familyId: unknown,
): ProfileFieldAdapterContractV2 | null {
  if (
    typeof familyId !== "string" ||
    familyId.length === 0 ||
    familyId.length > FISCAL_NOTIFICATION_INPUT_LIMITS.maxIdChars ||
    CONTROL_CHARACTERS.test(familyId)
  ) {
    return null;
  }
  return (
    adapterByFamilyId.get(familyId as FiscalNotificationDocumentFamilyIdV3) ??
    null
  );
}

export function adaptProfileFieldCandidatesV2(
  input: unknown,
): ProfileFieldAdapterOutcomeV2 {
  return adaptForExpectedFamily(null, input);
}
