import {
  REAL_VARIANT_MANIFEST_VERSION,
  type RealVariantManifest,
} from "./contracts";
import { isRealVariantFamily } from "./family-registry";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const CANONICAL_ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,127}$/;
const VERSION_PATTERN = /^[A-Z0-9][A-Z0-9_.-]{2,127}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD_PATTERN = /^(0A|ANUAL|[1-4]T|0[1-9]|1[0-2])$/;

const ALLOWED_AUTHORITIES = new Set(["AEAT", "TGSS"]);
const ALLOWED_TERRITORIES = new Set(["ES_COMMON"]);
const ALLOWED_SOURCE_CLASSES = new Set([
  "SYNTHETIC",
  "OFFICIAL_SYNTHETIC",
  "REAL_ANONYMIZED",
  "HOLDOUT",
]);
const ALLOWED_DOCUMENT_KINDS = new Set([
  "FILED_COPY",
  "DRAFT",
  "PREDECLARATION",
  "CERTIFICATE",
  "CURRENT_SCREEN",
  "FULL_SCREEN_CAPTURE",
  "PARTIAL_SCREEN_CAPTURE",
  "SUPPORTING_DOCUMENT",
]);
const ALLOWED_FILING_STATUSES = new Set([
  "FILED",
  "DRAFT",
  "NOT_APPLICABLE",
  "UNKNOWN",
]);
const ALLOWED_TEMPORAL_SCOPES = new Set([
  "CURRENT_AS_OF_DATE",
  "FISCAL_YEAR",
  "PERIOD",
  "HISTORICAL",
]);
const ALLOWED_OUTCOMES = new Set(["ACCEPT", "ACCEPT_WITH_REVIEW", "REJECT"]);
const ALLOWED_VISUAL_VARIANTS = new Set([
  "NATIVE",
  "SCAN_300_DPI",
  "SCAN_200_DPI",
  "SCAN_150_DPI",
  "COMPRESSION_MODERATE",
  "COMPRESSION_STRONG",
  "ROTATION_SMALL",
  "ROTATION_90",
  "PHOTOGRAPHED_PERSPECTIVE",
  "UNEVEN_LIGHTING",
  "PARTIAL_CROP",
  "GRAYSCALE",
  "MONOCHROME",
]);
const OFFICIAL_HOSTS = new Set([
  "sede.agenciatributaria.gob.es",
  "www.agenciatributaria.es",
  "agenciatributaria.es",
  "www.boe.es",
  "boe.es",
  "sede.seg-social.gob.es",
  "www.seg-social.es",
  "seg-social.es",
]);

const TOP_LEVEL_KEYS = new Set([
  "manifestVersion",
  "fixtureId",
  "family",
  "authority",
  "territory",
  "modelNumber",
  "documentName",
  "fiscalYear",
  "period",
  "layoutVersion",
  "extractorVersionExpected",
  "sourceClass",
  "sourceGenerationMethod",
  "authorizationRecorded",
  "officialSourceReferences",
  "documentKind",
  "filingStatus",
  "temporalScope",
  "completeDocument",
  "expectedPageCount",
  "observedPageCount",
  "visualVariant",
  "fileCharacteristics",
  "expectedClassification",
  "expectedFields",
  "expectedQuestionMappings",
  "fieldEvidence",
  "forbiddenInferences",
  "expectedWarnings",
  "expectedOutcome",
  "privacyReview",
  "sha256",
  "sourceReviewedAt",
  "reviewers",
  "notes",
]);

export type ManifestValidationResult =
  | { ok: true; value: RealVariantManifest }
  | { ok: false; errors: readonly string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isOfficialUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.port === "" &&
      OFFICIAL_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

function allPrivacyChecksPass(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return [
    "automatedScanPassed",
    "humanVisualReviewCompleted",
    "textLayerChecked",
    "ocrLayerChecked",
    "metadataChecked",
    "acroFormChecked",
    "xfaChecked",
    "annotationsChecked",
    "embeddedFilesChecked",
    "qrAndBarcodeChecked",
    "fileNameChecked",
    "hiddenContentChecked",
  ].every((key) => value[key] === true);
}

function jsonCloneAndFreeze<T>(value: T): T {
  const clone = JSON.parse(JSON.stringify(value)) as T;
  const freeze = (candidate: unknown): void => {
    if (candidate && typeof candidate === "object") {
      Object.freeze(candidate);
      for (const nested of Object.values(candidate)) freeze(nested);
    }
  };
  freeze(clone);
  return clone;
}

export function validateRealVariantManifest(
  input: unknown,
): ManifestValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["MANIFEST_NOT_OBJECT"] };
  }
  for (const key of Object.keys(input)) {
    if (!TOP_LEVEL_KEYS.has(key)) errors.push(`UNKNOWN_FIELD:${key}`);
  }
  for (const key of TOP_LEVEL_KEYS) {
    if (!(key in input)) errors.push(`MISSING_FIELD:${key}`);
  }
  if (input.manifestVersion !== REAL_VARIANT_MANIFEST_VERSION) {
    errors.push("INCOMPATIBLE_MANIFEST_VERSION");
  }
  if (
    typeof input.fixtureId !== "string" ||
    !CANONICAL_ID_PATTERN.test(input.fixtureId)
  ) {
    errors.push("INVALID_FIXTURE_ID");
  }
  if (!isRealVariantFamily(input.family)) errors.push("UNKNOWN_FAMILY");
  if (!ALLOWED_AUTHORITIES.has(String(input.authority))) {
    errors.push("UNSUPPORTED_AUTHORITY");
  }
  if (!ALLOWED_TERRITORIES.has(String(input.territory))) {
    errors.push("UNSUPPORTED_TERRITORY");
  }
  const expectedModel =
    typeof input.family === "string" && input.family.startsWith("MODEL_")
      ? input.family.slice("MODEL_".length)
      : null;
  if (input.modelNumber !== expectedModel) errors.push("MODEL_FAMILY_MISMATCH");
  if (
    typeof input.documentName !== "string" ||
    input.documentName.trim().length < 3
  ) {
    errors.push("INVALID_DOCUMENT_NAME");
  }
  if (
    input.fiscalYear !== null &&
    (!Number.isInteger(input.fiscalYear) ||
      Number(input.fiscalYear) < 2000 ||
      Number(input.fiscalYear) > 2100)
  ) {
    errors.push("INVALID_FISCAL_YEAR");
  }
  if (
    input.period !== null &&
    (typeof input.period !== "string" || !PERIOD_PATTERN.test(input.period))
  ) {
    errors.push("INVALID_PERIOD");
  }
  if (
    typeof input.layoutVersion !== "string" ||
    !VERSION_PATTERN.test(input.layoutVersion)
  ) {
    errors.push("INVALID_LAYOUT_VERSION");
  }
  if (
    typeof input.extractorVersionExpected !== "string" ||
    input.extractorVersionExpected.length < 3
  ) {
    errors.push("INVALID_EXTRACTOR_VERSION");
  }
  if (!ALLOWED_SOURCE_CLASSES.has(String(input.sourceClass))) {
    errors.push("INVALID_SOURCE_CLASS");
  }
  if (
    typeof input.sourceGenerationMethod !== "string" ||
    input.sourceGenerationMethod.trim().length < 3
  ) {
    errors.push("INVALID_SOURCE_GENERATION_METHOD");
  }
  if (typeof input.authorizationRecorded !== "boolean") {
    errors.push("INVALID_AUTHORIZATION_FLAG");
  }
  if (
    !isStringArray(input.officialSourceReferences) ||
    input.officialSourceReferences.length === 0 ||
    !input.officialSourceReferences.every(isOfficialUrl)
  ) {
    errors.push("INVALID_OFFICIAL_SOURCE_REFERENCE");
  }
  if (!ALLOWED_DOCUMENT_KINDS.has(String(input.documentKind))) {
    errors.push("INVALID_DOCUMENT_KIND");
  }
  if (!ALLOWED_FILING_STATUSES.has(String(input.filingStatus))) {
    errors.push("INVALID_FILING_STATUS");
  }
  if (!ALLOWED_TEMPORAL_SCOPES.has(String(input.temporalScope))) {
    errors.push("INVALID_TEMPORAL_SCOPE");
  }
  if (typeof input.completeDocument !== "boolean") {
    errors.push("INVALID_COMPLETENESS");
  }
  if (
    !Number.isInteger(input.expectedPageCount) ||
    Number(input.expectedPageCount) < 1 ||
    !Number.isInteger(input.observedPageCount) ||
    Number(input.observedPageCount) < 1
  ) {
    errors.push("INVALID_PAGE_COUNT");
  } else if (
    input.completeDocument === true &&
    input.expectedPageCount !== input.observedPageCount
  ) {
    errors.push("COMPLETE_PAGE_COUNT_MISMATCH");
  }
  if (!ALLOWED_VISUAL_VARIANTS.has(String(input.visualVariant))) {
    errors.push("INVALID_VISUAL_VARIANT");
  }
  if (!isRecord(input.fileCharacteristics)) {
    errors.push("INVALID_FILE_CHARACTERISTICS");
  } else if (input.fileCharacteristics.encrypted !== false) {
    errors.push("ENCRYPTED_DOCUMENT_NOT_ADMISSIBLE");
  }
  if (!isRecord(input.expectedClassification)) {
    errors.push("INVALID_EXPECTED_CLASSIFICATION");
  } else {
    if (input.expectedClassification.family !== input.family) {
      errors.push("CLASSIFICATION_FAMILY_MISMATCH");
    }
    if (input.expectedClassification.layoutVersion !== input.layoutVersion) {
      errors.push("CLASSIFICATION_LAYOUT_MISMATCH");
    }
  }
  if (!Array.isArray(input.expectedFields)) {
    errors.push("INVALID_EXPECTED_FIELDS");
  } else {
    for (const [index, field] of input.expectedFields.entries()) {
      if (!isRecord(field) || typeof field.fieldId !== "string") {
        errors.push(`INVALID_EXPECTED_FIELD:${index}`);
        continue;
      }
      if (
        !Number.isInteger(field.page) ||
        Number(field.page) < 1 ||
        Number(field.page) > Number(input.observedPageCount)
      ) {
        errors.push(`INVALID_FIELD_PAGE:${field.fieldId}`);
      }
      if (typeof field.critical !== "boolean") {
        errors.push(`INVALID_FIELD_CRITICAL_FLAG:${field.fieldId}`);
      }
    }
  }
  if (!Array.isArray(input.expectedQuestionMappings)) {
    errors.push("INVALID_QUESTION_MAPPINGS");
  } else {
    for (const [index, mapping] of input.expectedQuestionMappings.entries()) {
      if (!isRecord(mapping) || typeof mapping.questionId !== "string") {
        errors.push(`INVALID_QUESTION_MAPPING:${index}`);
        continue;
      }
      if (mapping.canSkipQuestion === true) {
        const sourceIsReal =
          input.sourceClass === "REAL_ANONYMIZED" ||
          input.sourceClass === "HOLDOUT";
        if (
          !sourceIsReal ||
          input.expectedOutcome !== "ACCEPT" ||
          input.completeDocument !== true ||
          !allPrivacyChecksPass(input.privacyReview)
        ) {
          errors.push(`UNSAFE_QUESTION_SKIP:${mapping.questionId}`);
        }
      }
    }
  }
  if (!Array.isArray(input.fieldEvidence)) {
    errors.push("INVALID_FIELD_EVIDENCE");
  } else {
    for (const [index, evidence] of input.fieldEvidence.entries()) {
      if (!isRecord(evidence) || typeof evidence.fieldId !== "string") {
        errors.push(`INVALID_FIELD_EVIDENCE:${index}`);
        continue;
      }
      if (
        !Number.isInteger(evidence.page) ||
        Number(evidence.page) < 1 ||
        Number(evidence.page) > Number(input.observedPageCount)
      ) {
        errors.push(`INVALID_EVIDENCE_PAGE:${evidence.fieldId}`);
      }
    }
  }
  if (!isStringArray(input.forbiddenInferences)) {
    errors.push("INVALID_FORBIDDEN_INFERENCES");
  }
  if (!isStringArray(input.expectedWarnings)) {
    errors.push("INVALID_EXPECTED_WARNINGS");
  }
  if (!ALLOWED_OUTCOMES.has(String(input.expectedOutcome))) {
    errors.push("INVALID_EXPECTED_OUTCOME");
  }
  if (input.completeDocument === false && input.expectedOutcome === "ACCEPT") {
    errors.push("INCOMPLETE_DOCUMENT_CANNOT_ACCEPT");
  }
  if (
    input.documentKind === "PARTIAL_SCREEN_CAPTURE" &&
    (!isStringArray(input.forbiddenInferences) ||
      !input.forbiddenInferences.includes("ABSENCE_OUTSIDE_CAPTURE"))
  ) {
    errors.push("PARTIAL_CAPTURE_MISSING_ABSENCE_GUARD");
  }
  if (!isRecord(input.privacyReview)) {
    errors.push("INVALID_PRIVACY_REVIEW");
  }
  const isReal =
    input.sourceClass === "REAL_ANONYMIZED" || input.sourceClass === "HOLDOUT";
  if (isReal) {
    if (input.authorizationRecorded !== true) {
      errors.push("REAL_SOURCE_WITHOUT_AUTHORIZATION");
    }
    if (!allPrivacyChecksPass(input.privacyReview)) {
      errors.push("REAL_SOURCE_PRIVACY_REVIEW_INCOMPLETE");
    }
    if (!isStringArray(input.reviewers) || input.reviewers.length < 2) {
      errors.push("REAL_SOURCE_REQUIRES_TWO_REVIEWERS");
    }
  }
  if (typeof input.sha256 !== "string" || !SHA256_PATTERN.test(input.sha256)) {
    errors.push("INVALID_SHA256");
  }
  if (
    typeof input.sourceReviewedAt !== "string" ||
    !DATE_PATTERN.test(input.sourceReviewedAt)
  ) {
    errors.push("INVALID_SOURCE_REVIEW_DATE");
  }
  if (!isStringArray(input.reviewers)) errors.push("INVALID_REVIEWERS");
  if (!isStringArray(input.notes)) errors.push("INVALID_NOTES");

  if (errors.length > 0) {
    return { ok: false, errors: Object.freeze([...new Set(errors)]) };
  }
  return {
    ok: true,
    value: jsonCloneAndFreeze(input) as unknown as RealVariantManifest,
  };
}
