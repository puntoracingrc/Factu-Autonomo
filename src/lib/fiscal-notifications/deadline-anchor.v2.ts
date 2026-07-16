import {
  AEAT_DOCUMENT_PROFILES_V1,
  resolveAeatDocumentProfileV1,
  type AeatDocumentProfileV1,
} from "./knowledge/aeat-document-knowledge.v1";
import type { FiscalNotificationDocumentFamilyIdV3 } from "./knowledge/document-families.v3";

export const FISCAL_NOTIFICATION_DEADLINE_ANCHOR_SCHEMA_VERSION_V2 = 2 as const;
export const FISCAL_NOTIFICATION_DEADLINE_ANCHOR_VERSION_V2 =
  "fiscal-notification-deadline-anchor.2026-07-16.v2" as const;

export type FiscalNotificationDeadlineTriggerV2 =
  AeatDocumentProfileV1["plainLanguage"]["deadlineRule"]["trigger"];
export type FiscalNotificationDeadlineDateTypeV2 =
  AeatDocumentProfileV1["mustExtract"]["dates"][number];

export const FISCAL_NOTIFICATION_DEADLINE_PURPOSES_V2 = Object.freeze([
  "APPEAL",
  "RESPONSE",
  "PAYMENT",
  "INSTALLMENT",
  "EXPIRATION",
] as const);

export type FiscalNotificationDeadlinePurposeV2 =
  (typeof FISCAL_NOTIFICATION_DEADLINE_PURPOSES_V2)[number];

export type FiscalNotificationExplicitDeadlineDateTypeV2 =
  | "APPEAL_DEADLINE"
  | "RESPONSE_DEADLINE"
  | "VOLUNTARY_PAYMENT_DEADLINE"
  | "INSTALLMENT_DUE_DATE"
  | "EXPIRATION_DATE";

export interface FiscalNotificationDeadlineEvidenceV2 {
  readonly evidenceId: string;
  readonly sourceRole: "THIS_DOCUMENT" | "LINKED_ACT";
  readonly pageNumber: number;
  readonly extractionMethod: "TEXT_LAYER" | "OCR" | "RULE" | "USER_CONFIRMED";
  readonly confidence: number;
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly ruleId: string;
  readonly ruleVersion: string;
}

export interface FiscalNotificationTypedDateV2 {
  readonly dateType: FiscalNotificationDeadlineDateTypeV2;
  readonly dateIso: string;
  readonly evidenceId: string;
}

export interface FiscalNotificationExplicitDeadlineCandidateV2 {
  readonly purpose: FiscalNotificationDeadlinePurposeV2;
  readonly dateType: FiscalNotificationExplicitDeadlineDateTypeV2;
  readonly dateIso: string;
  readonly evidenceId: string;
}

export interface FiscalNotificationDeadlineAnchorInputV2 {
  readonly familyId: FiscalNotificationDocumentFamilyIdV3;
  readonly evidence: readonly FiscalNotificationDeadlineEvidenceV2[];
  readonly documentDates: readonly FiscalNotificationTypedDateV2[];
  readonly linkedActDates?: readonly FiscalNotificationTypedDateV2[] | null;
  readonly deadlineCandidates: readonly FiscalNotificationExplicitDeadlineCandidateV2[];
  /** True when the document contains deadline wording that still needs structuring. */
  readonly rawDeadlinePresent: boolean;
}

export type FiscalNotificationDeadlineAnchorStatusV2 =
  | "EXPLICIT_DEADLINE_CAPTURED"
  | "ANCHOR_IDENTIFIED_NO_CALCULATION"
  | "PENDING_REQUIRED_DATE"
  | "REVIEW_REQUIRED"
  | "NO_DEADLINE_APPLICABLE";

export interface FiscalNotificationDeadlineAnchorV2 {
  readonly schemaVersion: typeof FISCAL_NOTIFICATION_DEADLINE_ANCHOR_SCHEMA_VERSION_V2;
  readonly anchorVersion: typeof FISCAL_NOTIFICATION_DEADLINE_ANCHOR_VERSION_V2;
  readonly familyId: FiscalNotificationDocumentFamilyIdV3;
  readonly trigger: FiscalNotificationDeadlineTriggerV2;
  readonly anchorRole: "THIS_DOCUMENT" | "LINKED_ACT" | "FUTURE_EVENT" | "NONE";
  readonly anchorDate: string | null;
  readonly anchorDateType: FiscalNotificationDeadlineDateTypeV2 | null;
  readonly anchorEvidenceId: string | null;
  readonly deadlineCandidates: readonly FiscalNotificationExplicitDeadlineCandidateV2[];
  readonly status: FiscalNotificationDeadlineAnchorStatusV2;
  readonly profileText: Readonly<{
    readonly text: string;
    readonly fallback: string;
  }>;
  readonly assertionType: "EXPLICIT_IN_DOCUMENT" | "NOT_PROVEN_BY_DOCUMENT";
  readonly rawDeadlinePresent: boolean;
  readonly calculatedDeadline: null;
  readonly calculationPolicy: "PROHIBITED";
  readonly permitsDeadlineMaterialization: false;
  readonly requiresHumanReview: true;
}

export class FiscalNotificationDeadlineAnchorValidationError extends Error {
  readonly code = "INVALID_DEADLINE_ANCHOR_INPUT" as const;

  constructor(path: string) {
    super(`Invalid deadline anchor input at ${path}`);
    this.name = "FiscalNotificationDeadlineAnchorValidationError";
  }
}

type UnknownRecord = Record<string, unknown>;
type DeadlineEvidenceSnapshot = Readonly<FiscalNotificationDeadlineEvidenceV2>;
type TypedDateSnapshot = Readonly<FiscalNotificationTypedDateV2>;
type DeadlineCandidateSnapshot =
  Readonly<FiscalNotificationExplicitDeadlineCandidateV2>;
type UniqueDateResult =
  | Readonly<{ status: "ABSENT" }>
  | Readonly<{ status: "AMBIGUOUS" }>
  | Readonly<{
      status: "FOUND";
      dateType: FiscalNotificationDeadlineDateTypeV2;
      dateIso: string;
      evidenceId: string;
    }>;

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const ISO_CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const MAX_ID_CHARS = 160;
const MAX_TYPED_DATES = 128;
const MAX_EVIDENCE_ITEMS = 384;
const MAX_PAGE_NUMBER = 10_000;
const DATE_TYPES = Object.freeze(
  Array.from(
    new Set(
      AEAT_DOCUMENT_PROFILES_V1.flatMap((profile) => profile.mustExtract.dates),
    ),
  ),
);
const dateTypeSet = new Set<string>(DATE_TYPES);
const NOTIFICATION_EVIDENCE_FAMILIES =
  new Set<FiscalNotificationDocumentFamilyIdV3>([
    "notification.delivery_attempt",
    "notification.dehu_envelope",
    "notification.publication_or_appearance",
  ]);
const PURPOSE_BY_DATE_TYPE = Object.freeze({
  APPEAL_DEADLINE: "APPEAL",
  RESPONSE_DEADLINE: "RESPONSE",
  VOLUNTARY_PAYMENT_DEADLINE: "PAYMENT",
  INSTALLMENT_DUE_DATE: "INSTALLMENT",
  EXPIRATION_DATE: "EXPIRATION",
} satisfies Readonly<
  Record<
    FiscalNotificationExplicitDeadlineDateTypeV2,
    FiscalNotificationDeadlinePurposeV2
  >
>);
const deadlineDateTypeSet = new Set<string>(Object.keys(PURPOSE_BY_DATE_TYPE));
const extractionMethodSet = new Set<string>([
  "TEXT_LAYER",
  "OCR",
  "RULE",
  "USER_CONFIRMED",
]);

function invalid(path: string): never {
  throw new FiscalNotificationDeadlineAnchorValidationError(path);
}

function snapshotRecord(value: unknown, path: string): UnknownRecord {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      invalid(path);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) invalid(path);
    const output: UnknownRecord = Object.create(null);
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
      output[key] = descriptor.value;
    }
    return output;
  } catch (error) {
    if (error instanceof FiscalNotificationDeadlineAnchorValidationError) {
      throw error;
    }
    invalid(path);
  }
}

function snapshotArray(
  value: unknown,
  path: string,
  maximumLength: number,
): readonly unknown[] {
  try {
    if (
      !Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Array.prototype
    ) {
      invalid(path);
    }
    const length = Object.getOwnPropertyDescriptor(value, "length")?.value;
    if (!Number.isSafeInteger(length) || length < 0 || length > maximumLength) {
      invalid(path);
    }
    const output: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (
        !descriptor ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        invalid(`${path}[${index}]`);
      }
      output.push(descriptor.value);
    }
    if (Reflect.ownKeys(value).length !== length + 1) invalid(`${path}.$shape`);
    return Object.freeze(output);
  } catch (error) {
    if (error instanceof FiscalNotificationDeadlineAnchorValidationError) {
      throw error;
    }
    invalid(path);
  }
}

function expectKeys(
  record: UnknownRecord,
  path: string,
  required: readonly string[],
  optional: readonly string[] = [],
): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) invalid(`${path}.$unknown`);
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      invalid(`${path}.${key}`);
    }
  }
}

function expectBoundedId(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_ID_CHARS ||
    value !== value.trim() ||
    CONTROL_CHARACTERS.test(value)
  ) {
    invalid(path);
  }
  return value;
}

function isExactIsoCalendarDate(value: unknown): value is string {
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

function validateEvidence(
  value: unknown,
): ReadonlyMap<string, DeadlineEvidenceSnapshot> {
  const items = snapshotArray(value, "evidence", MAX_EVIDENCE_ITEMS);
  const registry = new Map<string, DeadlineEvidenceSnapshot>();
  items.forEach((itemValue, index) => {
    const path = `evidence[${index}]`;
    const item = snapshotRecord(itemValue, path);
    expectKeys(item, path, [
      "evidenceId",
      "sourceRole",
      "pageNumber",
      "extractionMethod",
      "confidence",
      "assertionType",
      "ruleId",
      "ruleVersion",
    ]);
    const evidenceId = expectBoundedId(item.evidenceId, `${path}.evidenceId`);
    if (registry.has(evidenceId)) invalid(`${path}.evidenceId`);
    if (
      item.sourceRole !== "THIS_DOCUMENT" &&
      item.sourceRole !== "LINKED_ACT"
    ) {
      invalid(`${path}.sourceRole`);
    }
    if (
      !Number.isSafeInteger(item.pageNumber) ||
      Number(item.pageNumber) < 1 ||
      Number(item.pageNumber) > MAX_PAGE_NUMBER
    ) {
      invalid(`${path}.pageNumber`);
    }
    if (
      typeof item.extractionMethod !== "string" ||
      !extractionMethodSet.has(item.extractionMethod)
    ) {
      invalid(`${path}.extractionMethod`);
    }
    if (
      typeof item.confidence !== "number" ||
      !Number.isFinite(item.confidence) ||
      item.confidence < 0 ||
      item.confidence > 1
    ) {
      invalid(`${path}.confidence`);
    }
    if (item.assertionType !== "EXPLICIT_IN_DOCUMENT") {
      invalid(`${path}.assertionType`);
    }
    const ruleId = expectBoundedId(item.ruleId, `${path}.ruleId`);
    const ruleVersion = expectBoundedId(
      item.ruleVersion,
      `${path}.ruleVersion`,
    );
    registry.set(
      evidenceId,
      Object.freeze({
        evidenceId,
        sourceRole: item.sourceRole,
        pageNumber: Number(item.pageNumber),
        extractionMethod: item.extractionMethod,
        confidence: item.confidence,
        assertionType: "EXPLICIT_IN_DOCUMENT",
        ruleId,
        ruleVersion,
      }) as DeadlineEvidenceSnapshot,
    );
  });
  return registry;
}

function evidenceFor(
  registry: ReadonlyMap<string, DeadlineEvidenceSnapshot>,
  evidenceIdValue: unknown,
  path: string,
  expectedSourceRole: DeadlineEvidenceSnapshot["sourceRole"],
): DeadlineEvidenceSnapshot {
  const evidenceId = expectBoundedId(evidenceIdValue, path);
  const evidence = registry.get(evidenceId);
  if (!evidence || evidence.sourceRole !== expectedSourceRole) invalid(path);
  return evidence;
}

function validateTypedDates(
  value: unknown,
  path: string,
  allowedDateTypes: ReadonlySet<string>,
  evidenceRegistry: ReadonlyMap<string, DeadlineEvidenceSnapshot>,
  expectedSourceRole: DeadlineEvidenceSnapshot["sourceRole"],
): readonly TypedDateSnapshot[] {
  const dates = snapshotArray(value, path, MAX_TYPED_DATES);
  const seen = new Set<string>();
  return Object.freeze(
    dates.map((dateValue, index) => {
      const datePath = `${path}[${index}]`;
      const date = snapshotRecord(dateValue, datePath);
      expectKeys(date, datePath, ["dateType", "dateIso", "evidenceId"]);
      const dateType = expectBoundedId(
        date.dateType,
        `${datePath}.dateType`,
      ) as FiscalNotificationDeadlineDateTypeV2;
      if (!dateTypeSet.has(dateType) || !allowedDateTypes.has(dateType)) {
        invalid(`${datePath}.dateType`);
      }
      if (!isExactIsoCalendarDate(date.dateIso)) {
        invalid(`${datePath}.dateIso`);
      }
      const evidence = evidenceFor(
        evidenceRegistry,
        date.evidenceId,
        `${datePath}.evidenceId`,
        expectedSourceRole,
      );
      const identity = `${dateType}\u0000${date.dateIso}`;
      if (seen.has(identity)) invalid(datePath);
      seen.add(identity);
      return Object.freeze({
        dateType,
        dateIso: date.dateIso,
        evidenceId: evidence.evidenceId,
      });
    }),
  );
}

function validateDeadlineCandidates(
  value: unknown,
  profile: AeatDocumentProfileV1,
  evidenceRegistry: ReadonlyMap<string, DeadlineEvidenceSnapshot>,
): readonly DeadlineCandidateSnapshot[] {
  const items = snapshotArray(value, "deadlineCandidates", MAX_TYPED_DATES);
  const profileDateTypes = new Set<string>(profile.mustExtract.dates);
  const seen = new Set<string>();
  return Object.freeze(
    items.map((itemValue, index) => {
      const path = `deadlineCandidates[${index}]`;
      const item = snapshotRecord(itemValue, path);
      expectKeys(item, path, ["purpose", "dateType", "dateIso", "evidenceId"]);
      const dateType = expectBoundedId(
        item.dateType,
        `${path}.dateType`,
      ) as FiscalNotificationExplicitDeadlineDateTypeV2;
      if (
        !deadlineDateTypeSet.has(dateType) ||
        !profileDateTypes.has(dateType)
      ) {
        invalid(`${path}.dateType`);
      }
      const purpose = expectBoundedId(
        item.purpose,
        `${path}.purpose`,
      ) as FiscalNotificationDeadlinePurposeV2;
      if (PURPOSE_BY_DATE_TYPE[dateType] !== purpose)
        invalid(`${path}.purpose`);
      if (!isExactIsoCalendarDate(item.dateIso)) invalid(`${path}.dateIso`);
      const evidence = evidenceFor(
        evidenceRegistry,
        item.evidenceId,
        `${path}.evidenceId`,
        "THIS_DOCUMENT",
      );
      const identity = `${dateType}\u0000${item.dateIso}`;
      if (seen.has(identity)) invalid(path);
      seen.add(identity);
      return Object.freeze({
        purpose,
        dateType,
        dateIso: item.dateIso,
        evidenceId: evidence.evidenceId,
      });
    }),
  );
}

function uniqueDate(
  dates: readonly TypedDateSnapshot[],
  dateType: FiscalNotificationDeadlineDateTypeV2,
): UniqueDateResult {
  const matches = dates.filter((date) => date.dateType === dateType);
  if (matches.length === 0) return Object.freeze({ status: "ABSENT" });
  if (new Set(matches.map((date) => date.dateIso)).size > 1) {
    return Object.freeze({ status: "AMBIGUOUS" });
  }
  const match = matches[0];
  return Object.freeze({
    status: "FOUND",
    dateType: match.dateType,
    dateIso: match.dateIso,
    evidenceId: match.evidenceId,
  });
}

function firstUnambiguousDate(
  dates: readonly TypedDateSnapshot[],
  dateTypes: readonly FiscalNotificationDeadlineDateTypeV2[],
): UniqueDateResult {
  for (const dateType of dateTypes) {
    const candidate = uniqueDate(dates, dateType);
    if (candidate.status !== "ABSENT") return candidate;
  }
  return Object.freeze({ status: "ABSENT" });
}

function baseOutput(
  profile: AeatDocumentProfileV1,
  rawDeadlinePresent: boolean,
  deadlineCandidates: readonly DeadlineCandidateSnapshot[],
): Pick<
  FiscalNotificationDeadlineAnchorV2,
  | "schemaVersion"
  | "anchorVersion"
  | "familyId"
  | "trigger"
  | "deadlineCandidates"
  | "profileText"
  | "rawDeadlinePresent"
  | "calculatedDeadline"
  | "calculationPolicy"
  | "permitsDeadlineMaterialization"
  | "requiresHumanReview"
> {
  return {
    schemaVersion: FISCAL_NOTIFICATION_DEADLINE_ANCHOR_SCHEMA_VERSION_V2,
    anchorVersion: FISCAL_NOTIFICATION_DEADLINE_ANCHOR_VERSION_V2,
    familyId: profile.id,
    trigger: profile.plainLanguage.deadlineRule.trigger,
    deadlineCandidates,
    profileText: Object.freeze({
      text: profile.plainLanguage.deadlineRule.text,
      fallback: profile.plainLanguage.deadlineRule.fallback,
    }),
    rawDeadlinePresent,
    calculatedDeadline: null,
    calculationPolicy: "PROHIBITED",
    permitsDeadlineMaterialization: false,
    requiresHumanReview: true,
  };
}

function unresolved(
  profile: AeatDocumentProfileV1,
  rawDeadlinePresent: boolean,
  deadlineCandidates: readonly DeadlineCandidateSnapshot[],
  anchorRole: FiscalNotificationDeadlineAnchorV2["anchorRole"],
  status: Extract<
    FiscalNotificationDeadlineAnchorStatusV2,
    "PENDING_REQUIRED_DATE" | "REVIEW_REQUIRED" | "NO_DEADLINE_APPLICABLE"
  >,
): FiscalNotificationDeadlineAnchorV2 {
  return Object.freeze({
    ...baseOutput(profile, rawDeadlinePresent, deadlineCandidates),
    anchorRole,
    anchorDate: null,
    anchorDateType: null,
    anchorEvidenceId: null,
    status,
    assertionType: "NOT_PROVEN_BY_DOCUMENT" as const,
  });
}

function explicitCandidates(
  profile: AeatDocumentProfileV1,
  rawDeadlinePresent: boolean,
  deadlineCandidates: readonly DeadlineCandidateSnapshot[],
): FiscalNotificationDeadlineAnchorV2 {
  return Object.freeze({
    ...baseOutput(profile, rawDeadlinePresent, deadlineCandidates),
    anchorRole: "THIS_DOCUMENT" as const,
    anchorDate: null,
    anchorDateType: null,
    anchorEvidenceId: null,
    status: "EXPLICIT_DEADLINE_CAPTURED" as const,
    assertionType: "EXPLICIT_IN_DOCUMENT" as const,
  });
}

function identifiedAnchor(
  profile: AeatDocumentProfileV1,
  rawDeadlinePresent: boolean,
  deadlineCandidates: readonly DeadlineCandidateSnapshot[],
  anchorRole: "THIS_DOCUMENT" | "LINKED_ACT",
  date: Extract<UniqueDateResult, { status: "FOUND" }>,
): FiscalNotificationDeadlineAnchorV2 {
  return Object.freeze({
    ...baseOutput(profile, rawDeadlinePresent, deadlineCandidates),
    anchorRole,
    anchorDate: date.dateIso,
    anchorDateType: date.dateType,
    anchorEvidenceId: date.evidenceId,
    status: "ANCHOR_IDENTIFIED_NO_CALCULATION" as const,
    assertionType: "EXPLICIT_IN_DOCUMENT" as const,
  });
}

export function resolveFiscalNotificationDeadlineAnchorV2(
  inputValue: unknown,
): FiscalNotificationDeadlineAnchorV2 {
  const input = snapshotRecord(inputValue, "root");
  expectKeys(
    input,
    "root",
    [
      "familyId",
      "evidence",
      "documentDates",
      "deadlineCandidates",
      "rawDeadlinePresent",
    ],
    ["linkedActDates"],
  );
  const familyId = expectBoundedId(input.familyId, "familyId");
  const profile = resolveAeatDocumentProfileV1(familyId);
  if (!profile) invalid("familyId");
  const trigger = profile.plainLanguage.deadlineRule.trigger;
  const allowedLinkedDateTypes =
    trigger === "EFFECTIVE_NOTIFICATION_DATE"
      ? new Set<string>(["EFFECTIVE_NOTIFICATION_DATE"])
      : trigger === "EFFECTIVE_NOTIFICATION_DATE_OR_RECEIPT"
        ? new Set<string>(["EFFECTIVE_NOTIFICATION_DATE", "ACCESS_DATE"])
        : new Set<string>();
  const evidenceRegistry = validateEvidence(input.evidence);
  const documentDates = validateTypedDates(
    input.documentDates,
    "documentDates",
    new Set(profile.mustExtract.dates),
    evidenceRegistry,
    "THIS_DOCUMENT",
  );
  const linkedActDates =
    input.linkedActDates === undefined || input.linkedActDates === null
      ? Object.freeze([])
      : validateTypedDates(
          input.linkedActDates,
          "linkedActDates",
          allowedLinkedDateTypes,
          evidenceRegistry,
          "LINKED_ACT",
        );
  const deadlineCandidates = validateDeadlineCandidates(
    input.deadlineCandidates,
    profile,
    evidenceRegistry,
  );
  if (typeof input.rawDeadlinePresent !== "boolean") {
    invalid("rawDeadlinePresent");
  }
  if (deadlineCandidates.length > 0 && input.rawDeadlinePresent !== true) {
    invalid("rawDeadlinePresent");
  }
  if (trigger === null) {
    return input.rawDeadlinePresent
      ? unresolved(profile, true, deadlineCandidates, "NONE", "REVIEW_REQUIRED")
      : unresolved(
          profile,
          false,
          deadlineCandidates,
          "NONE",
          "NO_DEADLINE_APPLICABLE",
        );
  }

  if (trigger === "FUTURE_EVENT") {
    return unresolved(
      profile,
      input.rawDeadlinePresent,
      deadlineCandidates,
      "FUTURE_EVENT",
      input.rawDeadlinePresent ? "REVIEW_REQUIRED" : "PENDING_REQUIRED_DATE",
    );
  }

  const notificationEvidence = NOTIFICATION_EVIDENCE_FAMILIES.has(profile.id);
  const normalAnchorRole = notificationEvidence
    ? ("LINKED_ACT" as const)
    : ("THIS_DOCUMENT" as const);

  if (trigger === "EXPLICIT_DUE_DATE") {
    if (deadlineCandidates.length > 0) {
      return explicitCandidates(
        profile,
        input.rawDeadlinePresent,
        deadlineCandidates,
      );
    }
    return unresolved(
      profile,
      input.rawDeadlinePresent,
      deadlineCandidates,
      normalAnchorRole,
      input.rawDeadlinePresent ? "REVIEW_REQUIRED" : "PENDING_REQUIRED_DATE",
    );
  }

  if (trigger === "INSTALLMENT_DUE_DATE") {
    const allInstallments = deadlineCandidates.every(
      (candidate) => candidate.dateType === "INSTALLMENT_DUE_DATE",
    );
    if (deadlineCandidates.length > 0 && allInstallments) {
      return explicitCandidates(
        profile,
        input.rawDeadlinePresent,
        deadlineCandidates,
      );
    }
    return unresolved(
      profile,
      input.rawDeadlinePresent,
      deadlineCandidates,
      "THIS_DOCUMENT",
      input.rawDeadlinePresent ? "REVIEW_REQUIRED" : "PENDING_REQUIRED_DATE",
    );
  }

  const acceptedDateTypes =
    trigger === "EFFECTIVE_NOTIFICATION_DATE"
      ? (["EFFECTIVE_NOTIFICATION_DATE"] as const)
      : (["EFFECTIVE_NOTIFICATION_DATE", "ACCESS_DATE"] as const);
  const documentAnchor = firstUnambiguousDate(documentDates, acceptedDateTypes);
  if (documentAnchor.status === "FOUND") {
    if (input.rawDeadlinePresent && deadlineCandidates.length === 0) {
      return unresolved(
        profile,
        true,
        deadlineCandidates,
        normalAnchorRole,
        "REVIEW_REQUIRED",
      );
    }
    return identifiedAnchor(
      profile,
      input.rawDeadlinePresent,
      deadlineCandidates,
      normalAnchorRole,
      documentAnchor,
    );
  }
  if (documentAnchor.status === "AMBIGUOUS") {
    return unresolved(
      profile,
      input.rawDeadlinePresent,
      deadlineCandidates,
      normalAnchorRole,
      "REVIEW_REQUIRED",
    );
  }
  const linkedAnchor = firstUnambiguousDate(linkedActDates, acceptedDateTypes);
  if (linkedAnchor.status === "FOUND") {
    if (input.rawDeadlinePresent && deadlineCandidates.length === 0) {
      return unresolved(
        profile,
        true,
        deadlineCandidates,
        "LINKED_ACT",
        "REVIEW_REQUIRED",
      );
    }
    return identifiedAnchor(
      profile,
      input.rawDeadlinePresent,
      deadlineCandidates,
      "LINKED_ACT",
      linkedAnchor,
    );
  }
  return unresolved(
    profile,
    input.rawDeadlinePresent,
    deadlineCandidates,
    normalAnchorRole,
    input.rawDeadlinePresent ? "REVIEW_REQUIRED" : "PENDING_REQUIRED_DATE",
  );
}
