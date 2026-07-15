const MANIFEST_VERSION = "tax-corpus-document.2026-07.v2";
const REPORT_VERSION = "tax-corpus-validation-report.2026-07.v2";
const SOURCE_CLASSES = [
  "SYNTHETIC",
  "OFFICIAL_GENERATED",
  "REAL_ANONYMIZED",
  "ENGINEERING_HOLDOUT",
  "INDEPENDENT_HOLDOUT",
];
const STORAGE_SCOPES = [
  "PUBLIC",
  "ENGINEERING_HOLDOUT",
  "PRIVATE_INDEPENDENT_HOLDOUT",
];
const DELIVERY_MODES = ["NATIVE", "OCR"];
const GENERATION_CHANNELS = [
  "SYNTHETIC_FIXTURE",
  "OFFICIAL_SERVICE",
  "REAL_SUBMISSION",
  "ENGINEERING_PIPELINE",
  "INDEPENDENT_OFFICIAL",
  "INDEPENDENT_REAL",
];
const EXPECTED_DECISIONS = ["ADMIT", "MANUAL_REVIEW", "REJECT"];
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
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/;

const EVIDENCE_BOOLEAN_KEYS = [
  "consentRecorded",
  "provenanceRecorded",
  "officialGenerationVerified",
  "visibleLayerChecked",
  "hiddenTextChecked",
  "acroFormChecked",
  "xfaChecked",
  "metadataChecked",
  "annotationsChecked",
  "optionalLayersChecked",
  "attachmentsChecked",
  "scriptsChecked",
  "qrChecked",
  "barcodeChecked",
  "fileNameChecked",
  "piiScanPassed",
  "anonymizationReviewPassed",
  "layoutClassified",
  "automatedScanPassed",
  "humanReviewCompleted",
];
const EVIDENCE_KEYS = new Set([
  ...EVIDENCE_BOOLEAN_KEYS,
  "reviewerId",
  "reviewedAt",
]);
const EXTRACTION_KEYS = new Set([
  "classification",
  "deliveryMode",
  "fields",
  "missingFields",
]);
const MANIFEST_KEYS = new Set([
  "manifestVersion",
  "fixtureId",
  "family",
  "documentType",
  "fiscalYear",
  "period",
  "layoutVersion",
  "generationChannel",
  "sourceClass",
  "extractionExpected",
  "prohibitedInferences",
  "expectedDecision",
  "sha256",
  "admitted",
  "incomplete",
  "holdout",
  "anonymizationVerified",
  "verificationEvidence",
  "duplicateOf",
  "createdAt",
  "admittedAt",
  "assetFile",
  "containsRealPersonalData",
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

function exactKeys(candidate, allowed, prefix, errors) {
  if (!isRecord(candidate)) {
    errors.push(`INVALID_${prefix}`);
    return false;
  }
  for (const key of Object.keys(candidate)) {
    if (!allowed.has(key)) errors.push(`UNKNOWN_${prefix}_FIELD:${key}`);
  }
  for (const key of allowed) {
    if (!(key in candidate)) errors.push(`MISSING_${prefix}_FIELD:${key}`);
  }
  return true;
}

function allEvidenceTrue(evidence, keys = EVIDENCE_BOOLEAN_KEYS) {
  return isRecord(evidence) && keys.every((key) => evidence[key] === true);
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

function expectedScopeFor(manifest) {
  if (manifest.sourceClass === "ENGINEERING_HOLDOUT") {
    return "ENGINEERING_HOLDOUT";
  }
  if (manifest.sourceClass === "INDEPENDENT_HOLDOUT") {
    return "PRIVATE_INDEPENDENT_HOLDOUT";
  }
  return "PUBLIC";
}

function realEvidenceKeys(manifest) {
  const keys = [
    "provenanceRecorded",
    "visibleLayerChecked",
    "hiddenTextChecked",
    "acroFormChecked",
    "xfaChecked",
    "metadataChecked",
    "annotationsChecked",
    "optionalLayersChecked",
    "attachmentsChecked",
    "scriptsChecked",
    "qrChecked",
    "barcodeChecked",
    "fileNameChecked",
    "piiScanPassed",
    "anonymizationReviewPassed",
    "layoutClassified",
    "automatedScanPassed",
    "humanReviewCompleted",
  ];
  if (
    manifest.sourceClass === "REAL_ANONYMIZED" ||
    manifest.generationChannel === "INDEPENDENT_REAL"
  ) {
    keys.push("consentRecorded");
  }
  if (
    manifest.sourceClass === "OFFICIAL_GENERATED" ||
    manifest.generationChannel === "INDEPENDENT_OFFICIAL"
  ) {
    keys.push("officialGenerationVerified");
  }
  return keys;
}

export function validateTaxCorpusManifest(input, storageScope) {
  const errors = [];
  if (!isRecord(input)) return { ok: false, errors: ["MANIFEST_NOT_OBJECT"] };
  if (!STORAGE_SCOPES.includes(storageScope))
    errors.push("INVALID_STORAGE_SCOPE");
  for (const key of Object.keys(input)) {
    if (!MANIFEST_KEYS.has(key)) errors.push(`UNKNOWN_FIELD:${key}`);
  }
  for (const key of MANIFEST_KEYS) {
    if (!(key in input)) errors.push(`MISSING_FIELD:${key}`);
  }

  if (input.manifestVersion !== MANIFEST_VERSION) {
    errors.push("INCOMPATIBLE_MANIFEST_VERSION");
  }
  if (
    typeof input.fixtureId !== "string" ||
    !ID_PATTERN.test(input.fixtureId)
  ) {
    errors.push("INVALID_FIXTURE_ID");
  }
  if (!TAX_CORPUS_FAMILIES.includes(input.family))
    errors.push("INVALID_FAMILY");
  if (!TAX_CORPUS_FAMILIES.includes(input.documentType)) {
    errors.push("INVALID_DOCUMENT_TYPE");
  }
  if (input.family !== input.documentType) errors.push("FAMILY_TYPE_MISMATCH");
  if (
    !Number.isInteger(input.fiscalYear) ||
    input.fiscalYear < 2000 ||
    input.fiscalYear > 2100
  ) {
    errors.push("INVALID_FISCAL_YEAR");
  }
  if (
    input.period !== null &&
    (typeof input.period !== "string" || !input.period)
  ) {
    errors.push("INVALID_PERIOD");
  }
  if (
    typeof input.layoutVersion !== "string" ||
    !VERSION_PATTERN.test(input.layoutVersion)
  ) {
    errors.push("INVALID_LAYOUT_VERSION");
  }
  if (!GENERATION_CHANNELS.includes(input.generationChannel)) {
    errors.push("INVALID_GENERATION_CHANNEL");
  }
  if (!SOURCE_CLASSES.includes(input.sourceClass))
    errors.push("INVALID_SOURCE_CLASS");
  if (!EXPECTED_DECISIONS.includes(input.expectedDecision)) {
    errors.push("INVALID_EXPECTED_DECISION");
  }

  if (
    exactKeys(input.extractionExpected, EXTRACTION_KEYS, "EXTRACTION", errors)
  ) {
    const extraction = input.extractionExpected;
    if (extraction.classification !== input.family) {
      errors.push("EXPECTED_CLASSIFICATION_MISMATCH");
    }
    if (!DELIVERY_MODES.includes(extraction.deliveryMode)) {
      errors.push("INVALID_DELIVERY_MODE");
    }
    if (
      !Array.isArray(extraction.fields) ||
      !extraction.fields.every(
        (field) =>
          isRecord(field) &&
          typeof field.fieldId === "string" &&
          field.fieldId.length > 0 &&
          isJsonValue(field.expectedValue),
      )
    ) {
      errors.push("INVALID_EXPECTED_FIELDS");
    } else if (
      new Set(extraction.fields.map((field) => field.fieldId)).size !==
      extraction.fields.length
    ) {
      errors.push("DUPLICATE_EXPECTED_FIELD");
    }
    if (!uniqueStrings(extraction.missingFields)) {
      errors.push("INVALID_MISSING_FIELDS");
    }
  }
  if (!uniqueStrings(input.prohibitedInferences)) {
    errors.push("INVALID_PROHIBITED_INFERENCES");
  }
  if (typeof input.sha256 !== "string" || !SHA256_PATTERN.test(input.sha256)) {
    errors.push("INVALID_SHA256");
  }
  for (const key of [
    "admitted",
    "incomplete",
    "holdout",
    "anonymizationVerified",
    "containsRealPersonalData",
  ]) {
    if (typeof input[key] !== "boolean") errors.push(`INVALID_BOOLEAN:${key}`);
  }
  if (input.duplicateOf !== null && !ID_PATTERN.test(input.duplicateOf)) {
    errors.push("INVALID_DUPLICATE_REFERENCE");
  }
  if (input.duplicateOf === input.fixtureId)
    errors.push("SELF_DUPLICATE_REFERENCE");
  if (
    typeof input.createdAt !== "string" ||
    !DATE_PATTERN.test(input.createdAt)
  ) {
    errors.push("INVALID_CREATED_AT");
  }
  if (
    input.admittedAt !== null &&
    (typeof input.admittedAt !== "string" ||
      !DATE_PATTERN.test(input.admittedAt))
  ) {
    errors.push("INVALID_ADMITTED_AT");
  }
  if (input.admitted !== true && input.admittedAt !== null) {
    errors.push("NON_ADMITTED_HAS_ADMISSION_DATE");
  }
  if (input.admitted === true && input.expectedDecision === "REJECT") {
    errors.push("REJECTED_DOCUMENT_MARKED_ADMITTED");
  }
  if (
    typeof input.assetFile !== "string" ||
    !PDF_FILE_PATTERN.test(input.assetFile)
  ) {
    errors.push("INVALID_ASSET_FILE");
  }

  if (
    exactKeys(input.verificationEvidence, EVIDENCE_KEYS, "EVIDENCE", errors)
  ) {
    for (const key of EVIDENCE_BOOLEAN_KEYS) {
      if (![true, false, null].includes(input.verificationEvidence[key])) {
        errors.push(`INVALID_EVIDENCE_BOOLEAN:${key}`);
      }
    }
    for (const key of ["reviewerId", "reviewedAt"]) {
      if (
        input.verificationEvidence[key] !== null &&
        (typeof input.verificationEvidence[key] !== "string" ||
          input.verificationEvidence[key].length === 0)
      ) {
        errors.push(`INVALID_EVIDENCE_VALUE:${key}`);
      }
    }
  }

  const missingFields = isRecord(input.extractionExpected)
    ? input.extractionExpected.missingFields
    : null;
  if (
    input.incomplete === false &&
    Array.isArray(missingFields) &&
    missingFields.length
  ) {
    errors.push("COMPLETE_DOCUMENT_HAS_MISSING_FIELDS");
  }
  if (
    input.incomplete === true &&
    Array.isArray(missingFields) &&
    !missingFields.length
  ) {
    errors.push("INCOMPLETE_DOCUMENT_MISSING_GAPS");
  }
  if (input.containsRealPersonalData === true)
    errors.push("PERSONAL_DATA_PRESENT");

  if (storageScope !== expectedScopeFor(input)) {
    errors.push("HOLDOUT_STORAGE_CONTAMINATION");
  }
  if (
    ["ENGINEERING_HOLDOUT", "INDEPENDENT_HOLDOUT"].includes(
      input.sourceClass,
    ) !==
    (input.holdout === true)
  ) {
    errors.push("HOLDOUT_MEMBERSHIP_MISMATCH");
  }

  if (input.sourceClass === "SYNTHETIC") {
    if (input.generationChannel !== "SYNTHETIC_FIXTURE") {
      errors.push("SYNTHETIC_GENERATION_CHANNEL_MISMATCH");
    }
    if (input.anonymizationVerified !== false) {
      errors.push("SYNTHETIC_CANNOT_CLAIM_ANONYMIZATION");
    }
    if (
      isRecord(input.verificationEvidence) &&
      EVIDENCE_BOOLEAN_KEYS.some(
        (key) => input.verificationEvidence[key] === true,
      )
    ) {
      errors.push("SYNTHETIC_CANNOT_CLAIM_REAL_VERIFICATION");
    }
  }
  if (input.sourceClass === "OFFICIAL_GENERATED") {
    if (input.generationChannel !== "OFFICIAL_SERVICE") {
      errors.push("OFFICIAL_GENERATION_CHANNEL_MISMATCH");
    }
    if (!allEvidenceTrue(input.verificationEvidence, realEvidenceKeys(input))) {
      errors.push("OFFICIAL_GENERATION_NOT_VERIFIED");
    }
  }
  if (input.sourceClass === "REAL_ANONYMIZED") {
    if (input.generationChannel !== "REAL_SUBMISSION") {
      errors.push("REAL_GENERATION_CHANNEL_MISMATCH");
    }
    if (
      input.anonymizationVerified !== true ||
      !allEvidenceTrue(input.verificationEvidence, realEvidenceKeys(input))
    ) {
      errors.push("ANONYMIZATION_NOT_VERIFIED");
    }
  }
  if (input.sourceClass === "ENGINEERING_HOLDOUT") {
    if (input.generationChannel !== "ENGINEERING_PIPELINE") {
      errors.push("ENGINEERING_HOLDOUT_CHANNEL_MISMATCH");
    }
    if (input.anonymizationVerified !== false) {
      errors.push("ENGINEERING_HOLDOUT_CANNOT_CLAIM_ANONYMIZATION");
    }
  }
  if (input.sourceClass === "INDEPENDENT_HOLDOUT") {
    if (
      !["INDEPENDENT_OFFICIAL", "INDEPENDENT_REAL"].includes(
        input.generationChannel,
      )
    ) {
      errors.push("INDEPENDENT_HOLDOUT_CHANNEL_MISMATCH");
    }
    if (!allEvidenceTrue(input.verificationEvidence, realEvidenceKeys(input))) {
      errors.push("INDEPENDENT_HOLDOUT_NOT_VERIFIED");
    }
    if (
      input.generationChannel === "INDEPENDENT_REAL" &&
      input.anonymizationVerified !== true
    ) {
      errors.push("ANONYMIZATION_NOT_VERIFIED");
    }
  }

  return errors.length > 0
    ? { ok: false, errors: Object.freeze([...new Set(errors)].sort()) }
    : { ok: true, value: cloneAndFreeze(input) };
}

const INSPECTION_LAYER_CHECKS = [
  ["visibleLayerChecked", "VISIBLE_LAYER_NOT_CHECKED"],
  ["hiddenTextChecked", "HIDDEN_TEXT_NOT_CHECKED"],
  ["acroFormChecked", "ACROFORM_NOT_CHECKED"],
  ["xfaChecked", "XFA_NOT_CHECKED"],
  ["metadataChecked", "METADATA_NOT_CHECKED"],
  ["annotationsChecked", "ANNOTATIONS_NOT_CHECKED"],
  ["optionalLayersChecked", "OPTIONAL_LAYERS_NOT_CHECKED"],
  ["attachmentsChecked", "ATTACHMENTS_NOT_CHECKED"],
  ["scriptsChecked", "SCRIPTS_NOT_CHECKED"],
  ["qrChecked", "QR_NOT_CHECKED"],
  ["barcodeChecked", "BARCODE_NOT_CHECKED"],
  ["fileNameChecked", "FILENAME_NOT_CHECKED"],
  ["layoutClassified", "LAYOUT_NOT_CLASSIFIED"],
  ["manualReviewCompleted", "MANUAL_REVIEW_MISSING"],
];

export function evaluateTaxCorpusAdmission(
  manifest,
  inspection,
  knownHashes = [],
) {
  const blockingCodes = [];
  const warningCodes = [];
  const validation = validateTaxCorpusManifest(
    manifest,
    expectedScopeFor(manifest),
  );
  if (!validation.ok) blockingCodes.push("INVALID_MANIFEST");
  if (!inspection.parseable) blockingCodes.push("UNPARSEABLE_DOCUMENT");
  if (inspection.encrypted) blockingCodes.push("ENCRYPTED_DOCUMENT");
  if (inspection.hasJavaScript) blockingCodes.push("ACTIVE_CONTENT_PRESENT");
  if (inspection.embeddedFileCount > 0)
    blockingCodes.push("ATTACHMENTS_PRESENT");
  if (inspection.unexpectedHiddenLayerCount > 0) {
    blockingCodes.push("UNEXPECTED_HIDDEN_CONTENT");
  }
  if (inspection.piiFindingCount > 0)
    blockingCodes.push("PII_FINDINGS_PRESENT");
  if (inspection.actualSha256 !== manifest.sha256)
    blockingCodes.push("SHA256_MISMATCH");
  if (knownHashes.includes(inspection.actualSha256))
    blockingCodes.push("DUPLICATE_SHA256");
  if (manifest.duplicateOf !== null) blockingCodes.push("DUPLICATE_FIXTURE");

  const requiresFullInspection = [
    "OFFICIAL_GENERATED",
    "REAL_ANONYMIZED",
    "INDEPENDENT_HOLDOUT",
  ].includes(manifest.sourceClass);
  if (requiresFullInspection) {
    if (!inspection.provenanceRecorded)
      blockingCodes.push("PROVENANCE_MISSING");
    if (
      (manifest.sourceClass === "REAL_ANONYMIZED" ||
        manifest.generationChannel === "INDEPENDENT_REAL") &&
      !inspection.consentRecorded
    ) {
      blockingCodes.push("CONSENT_MISSING");
    }
    for (const [key, code] of INSPECTION_LAYER_CHECKS) {
      if (!inspection[key]) blockingCodes.push(code);
    }
    if (
      (manifest.sourceClass === "REAL_ANONYMIZED" ||
        manifest.generationChannel === "INDEPENDENT_REAL") &&
      !inspection.anonymizationVerified
    ) {
      blockingCodes.push("ANONYMIZATION_NOT_VERIFIED");
    }
  }
  if (manifest.incomplete) warningCodes.push("KNOWN_INCOMPLETE_DOCUMENT");
  if (manifest.sourceClass === "SYNTHETIC") {
    warningCodes.push("SYNTHETIC_NOT_REAL_COMPATIBILITY_EVIDENCE");
  }
  if (manifest.sourceClass === "ENGINEERING_HOLDOUT") {
    warningCodes.push("ENGINEERING_HOLDOUT_NOT_INDEPENDENT_EVIDENCE");
  }

  const outcome =
    blockingCodes.length > 0 || manifest.expectedDecision === "REJECT"
      ? "REJECT"
      : warningCodes.length > 0 || manifest.expectedDecision === "MANUAL_REVIEW"
        ? "MANUAL_REVIEW"
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
    keys.map((key) => [
      key,
      values.filter((value) => selector(value) === key).length,
    ]),
  );
}

export function summarizeTaxCorpusValidation(
  records,
  requiredFamilies,
  { independentHoldoutEvaluated = false } = {},
) {
  const validationResults = records.map((record) =>
    validateTaxCorpusManifest(record.manifest, record.storageScope),
  );
  const manifests = records.map((record) => record.manifest);
  const familySet = new Set(manifests.map((manifest) => manifest.family));
  const missingFamilies = requiredFamilies.filter(
    (family) => !familySet.has(family),
  );
  const invalidManifestCount = validationResults.filter(
    (result) => !result.ok,
  ).length;
  const errorsFor = (codes) =>
    validationResults.filter(
      (result) =>
        !result.ok && result.errors.some((error) => codes.includes(error)),
    ).length;
  const holdoutContaminationCount = errorsFor([
    "HOLDOUT_STORAGE_CONTAMINATION",
    "HOLDOUT_MEMBERSHIP_MISMATCH",
  ]);
  const anonymizationAnomalyCount = errorsFor([
    "ANONYMIZATION_NOT_VERIFIED",
    "INDEPENDENT_HOLDOUT_NOT_VERIFIED",
    "PERSONAL_DATA_PRESENT",
    "SYNTHETIC_CANNOT_CLAIM_ANONYMIZATION",
    "SYNTHETIC_CANNOT_CLAIM_REAL_VERIFICATION",
  ]);
  const admissionAnomalyCount = errorsFor([
    "NON_ADMITTED_HAS_ADMISSION_DATE",
    "REJECTED_DOCUMENT_MARKED_ADMITTED",
  ]);
  const duplicateFixtureIdCount = countDuplicates(
    manifests.map((manifest) => manifest.fixtureId),
  );
  const duplicateSha256Count = countDuplicates(
    manifests.map((manifest) => manifest.sha256),
  );
  const duplicateReferenceCount = manifests.filter(
    (manifest) => manifest.duplicateOf !== null,
  ).length;
  const hashMismatchCount = records.filter(
    (record) => record.actualSha256 !== record.manifest.sha256,
  ).length;
  const engineeringHoldoutCount = manifests.filter(
    (manifest) => manifest.sourceClass === "ENGINEERING_HOLDOUT",
  ).length;
  const independentHoldoutCount = manifests.filter(
    (manifest) => manifest.sourceClass === "INDEPENDENT_HOLDOUT",
  ).length;
  const realDocumentCount = manifests.filter(
    (manifest) =>
      manifest.sourceClass === "REAL_ANONYMIZED" ||
      manifest.generationChannel === "INDEPENDENT_REAL",
  ).length;
  const report = {
    reportVersion: REPORT_VERSION,
    valid:
      invalidManifestCount === 0 &&
      missingFamilies.length === 0 &&
      duplicateFixtureIdCount === 0 &&
      duplicateSha256Count === 0 &&
      duplicateReferenceCount === 0 &&
      holdoutContaminationCount === 0 &&
      anonymizationAnomalyCount === 0 &&
      admissionAnomalyCount === 0 &&
      hashMismatchCount === 0,
    manifestCount: manifests.length,
    familyCount: familySet.size,
    missingFamilies: [...missingFamilies].sort(),
    sourceClassCounts: countBy(
      manifests,
      SOURCE_CLASSES,
      (manifest) => manifest.sourceClass,
    ),
    fiscalYears: [
      ...new Set(manifests.map((manifest) => manifest.fiscalYear)),
    ].sort(),
    fiscalYearCount: new Set(manifests.map((manifest) => manifest.fiscalYear))
      .size,
    layoutCount: new Set(
      manifests.map(
        (manifest) =>
          `${manifest.family}\u0000${manifest.fiscalYear}\u0000${manifest.layoutVersion}`,
      ),
    ).size,
    nativeCount: manifests.filter(
      (manifest) => manifest.extractionExpected.deliveryMode === "NATIVE",
    ).length,
    ocrCount: manifests.filter(
      (manifest) => manifest.extractionExpected.deliveryMode === "OCR",
    ).length,
    incompleteCount: manifests.filter((manifest) => manifest.incomplete).length,
    expectedFieldCount: manifests.reduce(
      (total, manifest) => total + manifest.extractionExpected.fields.length,
      0,
    ),
    prohibitedInferenceCount: manifests.reduce(
      (total, manifest) => total + manifest.prohibitedInferences.length,
      0,
    ),
    duplicateFixtureIdCount,
    duplicateSha256Count,
    duplicateReferenceCount,
    invalidManifestCount,
    admissionAnomalyCount,
    holdoutContaminationCount,
    anonymizationAnomalyCount,
    hashMismatchCount,
    admittedCount: manifests.filter((manifest) => manifest.admitted).length,
    officialGeneratedCount: manifests.filter(
      (manifest) => manifest.sourceClass === "OFFICIAL_GENERATED",
    ).length,
    realDocumentCount,
    engineeringHoldoutCount,
    independentHoldoutCount,
    engineeringHoldoutAvailable: engineeringHoldoutCount > 0,
    independentHoldoutAvailable: independentHoldoutCount > 0,
    independentHoldoutEvaluated,
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
      classifications:
        summary.classifications +
        Number(sample.expectedClassification === sample.actualClassification),
      expectedFields: summary.expectedFields + sample.expectedFieldCount,
      correctFields: summary.correctFields + sample.correctFieldCount,
      falsePositives: summary.falsePositives + sample.falsePositiveCount,
      falseNegatives: summary.falseNegatives + sample.falseNegativeCount,
      prohibitedInferences:
        summary.prohibitedInferences + sample.prohibitedInferenceCount,
      sentToReview: summary.sentToReview + Number(sample.sentToReview),
    }),
    {
      classifications: 0,
      expectedFields: 0,
      correctFields: 0,
      falsePositives: 0,
      falseNegatives: 0,
      prohibitedInferences: 0,
      sentToReview: 0,
    },
  );
  return Object.freeze({
    sampleCount: samples.length,
    classificationAccuracy: ratio(totals.classifications, samples.length),
    fieldAccuracy: ratio(totals.correctFields, totals.expectedFields),
    falsePositiveCount: totals.falsePositives,
    falseNegativeCount: totals.falseNegatives,
    prohibitedInferenceCount: totals.prohibitedInferences,
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
      (sample) =>
        `${sample.family}:${sample.fiscalYear}:${sample.layoutVersion}`,
    ],
    ["SOURCE_CLASS", (sample) => sample.sourceClass],
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
      reports.push({ dimension, key, ...summarizeTaxCorpusMetrics(group) });
    }
  }
  return cloneAndFreeze(
    reports.sort((left, right) =>
      `${left.dimension}:${left.key}`.localeCompare(
        `${right.dimension}:${right.key}`,
      ),
    ),
  );
}

export function assertIndependentHoldoutExecutionPolicy({
  requested,
  aggregateOnly,
  jobEnabled,
  accessToken,
  repositoryRoot,
  holdoutRoot,
}) {
  if (!requested)
    return Object.freeze({ allowed: false, code: "NOT_REQUESTED" });
  if (!aggregateOnly)
    throw new Error("INDEPENDENT_HOLDOUT_REQUIRES_AGGREGATE_ONLY");
  if (jobEnabled !== "1")
    throw new Error("INDEPENDENT_HOLDOUT_JOB_NOT_AUTHORIZED");
  if (typeof accessToken !== "string" || accessToken.length < 32) {
    throw new Error("INDEPENDENT_HOLDOUT_ACCESS_TOKEN_MISSING");
  }
  if (
    typeof holdoutRoot !== "string" ||
    !holdoutRoot.startsWith("/") ||
    holdoutRoot === repositoryRoot ||
    holdoutRoot.startsWith(`${repositoryRoot}/`)
  ) {
    throw new Error("INDEPENDENT_HOLDOUT_ROOT_MUST_BE_EXTERNAL");
  }
  return Object.freeze({
    allowed: true,
    code: "AUTHORIZED_AGGREGATE_INDEPENDENT_HOLDOUT_JOB",
  });
}

export const assertHoldoutExecutionPolicy =
  assertIndependentHoldoutExecutionPolicy;

export const TAX_CORPUS_RUNTIME_CONSTANTS = Object.freeze({
  manifestVersion: MANIFEST_VERSION,
  reportVersion: REPORT_VERSION,
  sourceClasses: Object.freeze([...SOURCE_CLASSES]),
});
