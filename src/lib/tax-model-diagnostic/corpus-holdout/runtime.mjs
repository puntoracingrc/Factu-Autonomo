const MANIFEST_VERSION = "tax-corpus-document.2026-07.v1";
const REPORT_VERSION = "tax-corpus-validation-report.2026-07.v1";
const SOURCE_CLASSES = [
  "SYNTHETIC",
  "OFFICIAL_GENERATED",
  "REAL_ANONYMIZED",
  "HOLDOUT",
];
const ADMISSION_STATUSES = ["PENDING", "ADMITTED", "REJECTED"];
const STORAGE_SCOPES = ["PUBLIC", "PRIVATE_HOLDOUT"];
const DELIVERY_MODES = ["NATIVE", "OCR"];
export const TAX_CORPUS_FAMILIES = Object.freeze([
  "MODEL_035",
  "MODEL_036",
  "MODEL_037",
  "MODEL_100",
  "MODEL_111",
  "MODEL_115",
  "MODEL_123",
  "MODEL_130",
  "MODEL_131",
  "MODEL_151",
  "MODEL_180",
  "MODEL_184",
  "MODEL_190",
  "MODEL_193",
  "MODEL_200",
  "MODEL_202",
  "MODEL_216",
  "MODEL_296",
  "MODEL_303",
  "MODEL_308",
  "MODEL_309",
  "MODEL_341",
  "MODEL_347",
  "MODEL_349",
  "MODEL_369",
  "MODEL_390",
  "MODEL_714",
  "MODEL_720",
  "MODEL_721",
  "MODEL_840",
  "CURRENT_CENSUS_CERTIFICATE",
  "AEAT_ECONOMIC_ACTIVITIES_VIEW",
  "AEAT_TAX_STATUS_VIEW",
  "AEAT_OBLIGATIONS_VIEW",
  "TGSS_CURRENT_STATUS_REPORT",
  "TGSS_EMPLOYMENT_HISTORY",
  "TGSS_SELF_EMPLOYED_ACTIVITIES",
  "ROI_CERTIFICATE",
  "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE",
]);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,159}$/;
const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{2,159}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const PDF_FILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{1,199}\.pdf$/;

const REVIEW_KEYS = [
  "visibleLayerChecked",
  "hiddenTextChecked",
  "metadataChecked",
  "acroFormChecked",
  "xfaChecked",
  "annotationsChecked",
  "attachmentsChecked",
  "qrChecked",
  "barcodeChecked",
  "fileNameChecked",
  "automatedScanPassed",
  "humanReviewCompleted",
];

const MANIFEST_KEYS = new Set([
  "manifestVersion",
  "fixtureId",
  "family",
  "fiscalYear",
  "layoutVersion",
  "sourceClass",
  "expectedFields",
  "forbiddenInferences",
  "sha256",
  "admissionStatus",
  "anonymizationVerified",
  "holdoutMembership",
  "completeDocument",
  "deliveryMode",
  "assetFile",
  "containsRealPersonalData",
  "authorizationRecorded",
  "officialGenerationVerified",
  "anonymizationReview",
  "missingFields",
]);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value) {
  if (value === null) return true;
  if (["string", "boolean"].includes(typeof value)) return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([key, nested]) => key.length > 0 && isJsonValue(nested),
    )
  );
}

function uniqueStrings(value) {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.length > 0) &&
    new Set(value).size === value.length
  );
}

function allAnonymizationChecksPass(review) {
  return isRecord(review) && REVIEW_KEYS.every((key) => review[key] === true);
}

function cloneAndFreeze(value) {
  const clone = structuredClone(value);
  const freeze = (candidate) => {
    if (!candidate || typeof candidate !== "object") return;
    for (const nested of Object.values(candidate)) freeze(nested);
    Object.freeze(candidate);
  };
  freeze(clone);
  return clone;
}

export function validateTaxCorpusManifest(input, storageScope) {
  const errors = [];
  if (!isRecord(input)) return { ok: false, errors: ["MANIFEST_NOT_OBJECT"] };
  if (!STORAGE_SCOPES.includes(storageScope)) errors.push("INVALID_STORAGE_SCOPE");
  for (const key of Object.keys(input)) {
    if (!MANIFEST_KEYS.has(key)) errors.push(`UNKNOWN_FIELD:${key}`);
  }
  for (const key of MANIFEST_KEYS) {
    if (!(key in input)) errors.push(`MISSING_FIELD:${key}`);
  }
  if (input.manifestVersion !== MANIFEST_VERSION) {
    errors.push("INCOMPATIBLE_MANIFEST_VERSION");
  }
  if (typeof input.fixtureId !== "string" || !ID_PATTERN.test(input.fixtureId)) {
    errors.push("INVALID_FIXTURE_ID");
  }
  if (!TAX_CORPUS_FAMILIES.includes(input.family)) {
    errors.push("INVALID_FAMILY");
  }
  if (
    !Number.isInteger(input.fiscalYear) ||
    input.fiscalYear < 2000 ||
    input.fiscalYear > 2100
  ) {
    errors.push("INVALID_FISCAL_YEAR");
  }
  if (
    typeof input.layoutVersion !== "string" ||
    !VERSION_PATTERN.test(input.layoutVersion)
  ) {
    errors.push("INVALID_LAYOUT_VERSION");
  }
  if (!SOURCE_CLASSES.includes(input.sourceClass)) {
    errors.push("INVALID_SOURCE_CLASS");
  }
  if (
    !Array.isArray(input.expectedFields) ||
    !input.expectedFields.every(
      (field) =>
        isRecord(field) &&
        typeof field.fieldId === "string" &&
        field.fieldId.length > 0 &&
        isJsonValue(field.expectedValue),
    )
  ) {
    errors.push("INVALID_EXPECTED_FIELDS");
  } else if (
    new Set(input.expectedFields.map((field) => field.fieldId)).size !==
    input.expectedFields.length
  ) {
    errors.push("DUPLICATE_EXPECTED_FIELD");
  }
  if (!uniqueStrings(input.forbiddenInferences)) {
    errors.push("INVALID_FORBIDDEN_INFERENCES");
  }
  if (!uniqueStrings(input.missingFields)) errors.push("INVALID_MISSING_FIELDS");
  if (typeof input.sha256 !== "string" || !SHA256_PATTERN.test(input.sha256)) {
    errors.push("INVALID_SHA256");
  }
  if (!ADMISSION_STATUSES.includes(input.admissionStatus)) {
    errors.push("INVALID_ADMISSION_STATUS");
  }
  if (!DELIVERY_MODES.includes(input.deliveryMode)) {
    errors.push("INVALID_DELIVERY_MODE");
  }
  if (typeof input.assetFile !== "string" || !PDF_FILE_PATTERN.test(input.assetFile)) {
    errors.push("INVALID_ASSET_FILE");
  }
  for (const key of [
    "anonymizationVerified",
    "holdoutMembership",
    "completeDocument",
    "containsRealPersonalData",
    "authorizationRecorded",
    "officialGenerationVerified",
  ]) {
    if (typeof input[key] !== "boolean") errors.push(`INVALID_BOOLEAN:${key}`);
  }
  if (input.containsRealPersonalData === true) {
    errors.push("PERSONAL_DATA_PRESENT");
  }
  if (
    input.completeDocument === true &&
    Array.isArray(input.missingFields) &&
    input.missingFields.length > 0
  ) {
    errors.push("COMPLETE_DOCUMENT_HAS_MISSING_FIELDS");
  }
  if (
    input.completeDocument === false &&
    Array.isArray(input.missingFields) &&
    input.missingFields.length === 0
  ) {
    errors.push("INCOMPLETE_DOCUMENT_MISSING_GAPS");
  }

  const isPrivate = storageScope === "PRIVATE_HOLDOUT";
  if (input.sourceClass === "HOLDOUT") {
    if (!isPrivate || input.holdoutMembership !== true) {
      errors.push("HOLDOUT_STORAGE_CONTAMINATION");
    }
  } else if (isPrivate || input.holdoutMembership === true) {
    errors.push("HOLDOUT_STORAGE_CONTAMINATION");
  }

  if (input.sourceClass === "SYNTHETIC") {
    if (input.containsRealPersonalData !== false) {
      errors.push("SYNTHETIC_CONTAINS_REAL_PERSONAL_DATA");
    }
    if (input.anonymizationVerified !== false) {
      errors.push("SYNTHETIC_CANNOT_CLAIM_ANONYMIZATION");
    }
    if (input.officialGenerationVerified !== false) {
      errors.push("SYNTHETIC_CANNOT_CLAIM_OFFICIAL_GENERATION");
    }
    if (input.anonymizationReview !== null) {
      errors.push("SYNTHETIC_ANONYMIZATION_REVIEW_MUST_BE_NULL");
    }
  }
  if (input.sourceClass === "OFFICIAL_GENERATED") {
    if (input.officialGenerationVerified !== true) {
      errors.push("OFFICIAL_GENERATION_NOT_VERIFIED");
    }
    if (input.holdoutMembership !== false) {
      errors.push("OFFICIAL_GENERATED_CANNOT_BE_HOLDOUT");
    }
  }
  if (["REAL_ANONYMIZED", "HOLDOUT"].includes(input.sourceClass)) {
    if (input.authorizationRecorded !== true) {
      errors.push("REAL_SOURCE_WITHOUT_AUTHORIZATION");
    }
    if (input.containsRealPersonalData !== false) {
      errors.push("REAL_SOURCE_STILL_CONTAINS_PERSONAL_DATA");
    }
    if (
      input.anonymizationVerified !== true ||
      !allAnonymizationChecksPass(input.anonymizationReview)
    ) {
      errors.push("ANONYMIZATION_NOT_VERIFIED");
    }
  }
  if (
    input.admissionStatus === "ADMITTED" &&
    ["REAL_ANONYMIZED", "HOLDOUT"].includes(input.sourceClass) &&
    !allAnonymizationChecksPass(input.anonymizationReview)
  ) {
    errors.push("ADMITTED_REAL_SOURCE_WITHOUT_COMPLETE_REVIEW");
  }
  return errors.length > 0
    ? { ok: false, errors: Object.freeze([...new Set(errors)].sort()) }
    : { ok: true, value: cloneAndFreeze(input) };
}

export function evaluateTaxCorpusAdmission(
  manifest,
  inspection,
  knownHashes = [],
) {
  const blockingCodes = [];
  const warningCodes = [];
  const validation = validateTaxCorpusManifest(
    manifest,
    manifest.sourceClass === "HOLDOUT" ? "PRIVATE_HOLDOUT" : "PUBLIC",
  );
  if (!validation.ok) blockingCodes.push("INVALID_MANIFEST");
  if (!inspection.parseable) blockingCodes.push("UNPARSEABLE_DOCUMENT");
  if (inspection.encrypted) blockingCodes.push("ENCRYPTED_DOCUMENT");
  if (inspection.hasJavaScript) blockingCodes.push("ACTIVE_CONTENT_PRESENT");
  if (inspection.embeddedFileCount > 0) blockingCodes.push("ATTACHMENTS_PRESENT");
  if (inspection.unexpectedHiddenLayerCount > 0) {
    blockingCodes.push("UNEXPECTED_HIDDEN_CONTENT");
  }
  if (inspection.piiFindingCount > 0) blockingCodes.push("PII_FINDINGS_PRESENT");
  if (inspection.actualSha256 !== manifest.sha256) {
    blockingCodes.push("SHA256_MISMATCH");
  }
  if (knownHashes.includes(inspection.actualSha256)) {
    blockingCodes.push("DUPLICATE_SHA256");
  }
  if (!manifest.completeDocument) warningCodes.push("KNOWN_INCOMPLETE_DOCUMENT");
  if (manifest.sourceClass === "SYNTHETIC") {
    warningCodes.push("SYNTHETIC_NOT_REAL_COMPATIBILITY_EVIDENCE");
  }
  const outcome =
    blockingCodes.length > 0
      ? "REJECT"
      : warningCodes.length > 0
        ? "QUARANTINE"
        : "ADMIT";
  return Object.freeze({
    outcome,
    blockingCodes: Object.freeze([...new Set(blockingCodes)].sort()),
    warningCodes: Object.freeze([...new Set(warningCodes)].sort()),
  });
}

function countDuplicates(values) {
  const seen = new Set();
  const duplicated = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicated.add(value);
    seen.add(value);
  }
  return duplicated.size;
}

function countBy(values, keys, selector) {
  return Object.fromEntries(
    keys.map((key) => [key, values.filter((value) => selector(value) === key).length]),
  );
}

export function summarizeTaxCorpusValidation(
  records,
  requiredFamilies,
  { holdoutEvaluated = false } = {},
) {
  const validationResults = records.map((record) =>
    validateTaxCorpusManifest(record.manifest, record.storageScope),
  );
  const manifests = records.map((record) => record.manifest);
  const familySet = new Set(manifests.map((manifest) => manifest.family));
  const missingFamilies = requiredFamilies.filter((family) => !familySet.has(family));
  const invalidManifestCount = validationResults.filter((result) => !result.ok).length;
  const holdoutContaminationCount = validationResults.filter(
    (result) => !result.ok && result.errors.includes("HOLDOUT_STORAGE_CONTAMINATION"),
  ).length;
  const anonymizationFailureCount = validationResults.filter(
    (result) =>
      !result.ok &&
      result.errors.some((error) =>
        [
          "ANONYMIZATION_NOT_VERIFIED",
          "ADMITTED_REAL_SOURCE_WITHOUT_COMPLETE_REVIEW",
          "PERSONAL_DATA_PRESENT",
          "REAL_SOURCE_STILL_CONTAINS_PERSONAL_DATA",
        ].includes(error),
      ),
  ).length;
  const duplicateFixtureIdCount = countDuplicates(
    manifests.map((manifest) => manifest.fixtureId),
  );
  const duplicateSha256Count = countDuplicates(
    manifests.map((manifest) => manifest.sha256),
  );
  const hashMismatchCount = records.filter(
    (record) => record.actualSha256 !== record.manifest.sha256,
  ).length;
  const report = {
    reportVersion: REPORT_VERSION,
    valid:
      invalidManifestCount === 0 &&
      missingFamilies.length === 0 &&
      duplicateFixtureIdCount === 0 &&
      duplicateSha256Count === 0 &&
      holdoutContaminationCount === 0 &&
      anonymizationFailureCount === 0 &&
      hashMismatchCount === 0,
    manifestCount: manifests.length,
    familyCount: familySet.size,
    missingFamilies: [...missingFamilies].sort(),
    sourceClassCounts: countBy(
      manifests,
      SOURCE_CLASSES,
      (manifest) => manifest.sourceClass,
    ),
    admissionCounts: countBy(
      manifests,
      ADMISSION_STATUSES,
      (manifest) => manifest.admissionStatus,
    ),
    fiscalYears: [...new Set(manifests.map((manifest) => manifest.fiscalYear))].sort(),
    layoutCount: new Set(
      manifests.map(
        (manifest) =>
          `${manifest.family}\u0000${manifest.fiscalYear}\u0000${manifest.layoutVersion}`,
      ),
    ).size,
    nativeCount: manifests.filter((manifest) => manifest.deliveryMode === "NATIVE")
      .length,
    ocrCount: manifests.filter((manifest) => manifest.deliveryMode === "OCR").length,
    incompleteCount: manifests.filter((manifest) => !manifest.completeDocument).length,
    knownMissingFieldCount: manifests.reduce(
      (total, manifest) => total + manifest.missingFields.length,
      0,
    ),
    duplicateFixtureIdCount,
    duplicateSha256Count,
    invalidManifestCount,
    holdoutContaminationCount,
    anonymizationFailureCount,
    hashMismatchCount,
    officialGeneratedAvailable: manifests.some(
      (manifest) => manifest.sourceClass === "OFFICIAL_GENERATED",
    ),
    realAnonymizedAvailable: manifests.some(
      (manifest) => manifest.sourceClass === "REAL_ANONYMIZED",
    ),
    holdoutEvaluated,
    aggregateOnly: true,
  };
  return cloneAndFreeze(report);
}

function ratio(numerator, denominator) {
  return denominator === 0 ? 0 : numerator / denominator;
}

export function summarizeTaxCorpusMetrics(samples) {
  const totals = samples.reduce(
    (summary, sample) => ({
      recognized: summary.recognized + Number(sample.recognized),
      expectedFields: summary.expectedFields + sample.expectedFieldCount,
      correctFields: summary.correctFields + sample.correctFieldCount,
      falsePositives: summary.falsePositives + sample.falsePositiveCount,
      forbiddenInferences:
        summary.forbiddenInferences + sample.forbiddenInferenceCount,
      sentToReview: summary.sentToReview + Number(sample.sentToReview),
    }),
    {
      recognized: 0,
      expectedFields: 0,
      correctFields: 0,
      falsePositives: 0,
      forbiddenInferences: 0,
      sentToReview: 0,
    },
  );
  return Object.freeze({
    sampleCount: samples.length,
    recognitionRate: ratio(totals.recognized, samples.length),
    fieldPrecision: ratio(
      totals.correctFields,
      totals.correctFields + totals.falsePositives,
    ),
    falsePositiveCount: totals.falsePositives,
    forbiddenInferenceCount: totals.forbiddenInferences,
    reviewRate: ratio(totals.sentToReview, samples.length),
  });
}

export function summarizeTaxCorpusMetricsByDimension(samples) {
  const dimensions = [
    ["FAMILY", (sample) => sample.family],
    ["DELIVERY_MODE", (sample) => sample.deliveryMode],
    ["FISCAL_YEAR", (sample) => String(sample.fiscalYear)],
    [
      "LAYOUT",
      (sample) => `${sample.family}:${sample.fiscalYear}:${sample.layoutVersion}`,
    ],
  ];
  const reports = [];
  for (const [dimension, keyFor] of dimensions) {
    const groups = new Map();
    for (const sample of samples) {
      const key = keyFor(sample);
      const group = groups.get(key) ?? [];
      group.push(sample);
      groups.set(key, group);
    }
    for (const [key, group] of groups) {
      reports.push({
        dimension,
        key,
        ...summarizeTaxCorpusMetrics(group),
      });
    }
  }
  return cloneAndFreeze(
    reports.sort((left, right) =>
      `${left.dimension}:${left.key}`.localeCompare(`${right.dimension}:${right.key}`),
    ),
  );
}

export function assertHoldoutExecutionPolicy({
  requested,
  aggregateOnly,
  jobEnabled,
  accessToken,
  repositoryRoot,
  holdoutRoot,
}) {
  if (!requested) return Object.freeze({ allowed: false, code: "NOT_REQUESTED" });
  if (!aggregateOnly) throw new Error("HOLDOUT_REQUIRES_AGGREGATE_ONLY");
  if (jobEnabled !== "1") throw new Error("HOLDOUT_JOB_NOT_AUTHORIZED");
  if (typeof accessToken !== "string" || accessToken.length < 32) {
    throw new Error("HOLDOUT_ACCESS_TOKEN_MISSING");
  }
  if (
    typeof holdoutRoot !== "string" ||
    !holdoutRoot.startsWith("/") ||
    holdoutRoot === repositoryRoot ||
    holdoutRoot.startsWith(`${repositoryRoot}/`)
  ) {
    throw new Error("HOLDOUT_ROOT_MUST_BE_EXTERNAL");
  }
  return Object.freeze({ allowed: true, code: "AUTHORIZED_AGGREGATE_JOB" });
}

export const TAX_CORPUS_RUNTIME_CONSTANTS = Object.freeze({
  manifestVersion: MANIFEST_VERSION,
  reportVersion: REPORT_VERSION,
  sourceClasses: Object.freeze([...SOURCE_CLASSES]),
});
