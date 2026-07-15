import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  TaxCorpusAdmissionInspection,
  TaxCorpusDocumentManifest,
  TaxCorpusMetricSample,
  TaxCorpusVerificationEvidence,
} from "./contracts";
import {
  REQUIRED_TAX_CORPUS_FAMILIES,
  loadEngineeringHoldoutCorpus,
  loadPublicTaxCorpus,
} from "./current-corpus.mjs";
import {
  assertIndependentHoldoutExecutionPolicy,
  evaluateTaxCorpusAdmission,
  summarizeTaxCorpusMetrics,
  summarizeTaxCorpusMetricsByDimension,
  summarizeTaxCorpusValidation,
  TAX_CORPUS_RUNTIME_CONSTANTS,
  validateTaxCorpusManifest,
} from "./runtime.mjs";

const EMPTY_EVIDENCE: TaxCorpusVerificationEvidence = {
  consentRecorded: null,
  provenanceRecorded: null,
  officialGenerationVerified: null,
  visibleLayerChecked: null,
  hiddenTextChecked: null,
  acroFormChecked: null,
  xfaChecked: null,
  metadataChecked: null,
  annotationsChecked: null,
  optionalLayersChecked: null,
  attachmentsChecked: null,
  scriptsChecked: null,
  qrChecked: null,
  barcodeChecked: null,
  fileNameChecked: null,
  piiScanPassed: null,
  anonymizationReviewPassed: null,
  layoutClassified: null,
  automatedScanPassed: null,
  humanReviewCompleted: null,
  reviewerId: null,
  reviewedAt: null,
};

const COMPLETE_EVIDENCE: TaxCorpusVerificationEvidence = {
  consentRecorded: true,
  provenanceRecorded: true,
  officialGenerationVerified: true,
  visibleLayerChecked: true,
  hiddenTextChecked: true,
  acroFormChecked: true,
  xfaChecked: true,
  metadataChecked: true,
  annotationsChecked: true,
  optionalLayersChecked: true,
  attachmentsChecked: true,
  scriptsChecked: true,
  qrChecked: true,
  barcodeChecked: true,
  fileNameChecked: true,
  piiScanPassed: true,
  anonymizationReviewPassed: true,
  layoutClassified: true,
  automatedScanPassed: true,
  humanReviewCompleted: true,
  reviewerId: "fiscal-reviewer-001",
  reviewedAt: "2026-07-15T08:00:00Z",
};

const COMPLETE_INSPECTION: TaxCorpusAdmissionInspection = {
  parseable: true,
  encrypted: false,
  hasJavaScript: false,
  embeddedFileCount: 0,
  unexpectedHiddenLayerCount: 0,
  piiFindingCount: 0,
  actualSha256: "a".repeat(64),
  consentRecorded: true,
  provenanceRecorded: true,
  visibleLayerChecked: true,
  hiddenTextChecked: true,
  acroFormChecked: true,
  xfaChecked: true,
  metadataChecked: true,
  annotationsChecked: true,
  optionalLayersChecked: true,
  attachmentsChecked: true,
  scriptsChecked: true,
  qrChecked: true,
  barcodeChecked: true,
  fileNameChecked: true,
  anonymizationVerified: true,
  layoutClassified: true,
  manualReviewCompleted: true,
};

function manifest(
  override: Partial<TaxCorpusDocumentManifest> = {},
): TaxCorpusDocumentManifest {
  return {
    manifestVersion: "tax-corpus-document.2026-07.v2",
    fixtureId: "synthetic-model-303-001",
    family: "MODEL_303",
    documentType: "MODEL_303",
    fiscalYear: 2026,
    period: "1T",
    layoutVersion: "SYNTHETIC_LAYOUT_2026",
    generationChannel: "SYNTHETIC_FIXTURE",
    sourceClass: "SYNTHETIC",
    extractionExpected: {
      classification: "MODEL_303",
      deliveryMode: "NATIVE",
      fields: [{ fieldId: "document.model", expectedValue: "303" }],
      missingFields: [],
    },
    prohibitedInferences: ["CURRENT_CENSUS_STATUS"],
    expectedDecision: "ADMIT",
    sha256: "a".repeat(64),
    admitted: true,
    incomplete: false,
    holdout: false,
    anonymizationVerified: false,
    verificationEvidence: EMPTY_EVIDENCE,
    duplicateOf: null,
    createdAt: "2026-07-15",
    admittedAt: null,
    assetFile: "synthetic-model-303-001.pdf",
    containsRealPersonalData: false,
    ...override,
  };
}

function realManifest(
  override: Partial<TaxCorpusDocumentManifest> = {},
): TaxCorpusDocumentManifest {
  return manifest({
    fixtureId: "real-anonymized-model-303-001",
    generationChannel: "REAL_SUBMISSION",
    sourceClass: "REAL_ANONYMIZED",
    anonymizationVerified: true,
    verificationEvidence: COMPLETE_EVIDENCE,
    admitted: false,
    ...override,
  });
}

describe("canonical corpus contract and admission", () => {
  it("uses exactly the five source classes required by the operational order", () => {
    expect(TAX_CORPUS_RUNTIME_CONSTANTS.sourceClasses).toEqual([
      "SYNTHETIC",
      "OFFICIAL_GENERATED",
      "REAL_ANONYMIZED",
      "ENGINEERING_HOLDOUT",
      "INDEPENDENT_HOLDOUT",
    ]);
  });

  it("admits an explicitly synthetic manifest without claiming real verification", () => {
    const result = validateTaxCorpusManifest(manifest(), "PUBLIC");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sourceClass).toBe("SYNTHETIC");
    expect(result.value.anonymizationVerified).toBe(false);
    expect(Object.isFrozen(result.value)).toBe(true);
  });

  it("keeps known incomplete gaps explicit and requires manual review", () => {
    const incomplete = manifest({
      incomplete: true,
      expectedDecision: "MANUAL_REVIEW",
      extractionExpected: {
        classification: "MODEL_303",
        deliveryMode: "NATIVE",
        fields: [{ fieldId: "document.model", expectedValue: "303" }],
        missingFields: ["tax.period"],
      },
    });
    expect(validateTaxCorpusManifest(incomplete, "PUBLIC").ok).toBe(true);
    expect(evaluateTaxCorpusAdmission(incomplete, COMPLETE_INSPECTION)).toEqual(
      {
        outcome: "MANUAL_REVIEW",
        blockingCodes: [],
        warningCodes: [
          "KNOWN_INCOMPLETE_DOCUMENT",
          "SYNTHETIC_NOT_REAL_COMPATIBILITY_EVIDENCE",
        ],
      },
    );
  });

  it("rejects an incomplete document that hides its missing fields", () => {
    const result = validateTaxCorpusManifest(
      manifest({ incomplete: true, expectedDecision: "MANUAL_REVIEW" }),
      "PUBLIC",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("INCOMPLETE_DOCUMENT_MISSING_GAPS");
  });

  it("requires consent, provenance and every anonymization layer for real input", () => {
    expect(validateTaxCorpusManifest(realManifest(), "PUBLIC").ok).toBe(true);
    const unsafe = validateTaxCorpusManifest(
      realManifest({
        verificationEvidence: {
          ...COMPLETE_EVIDENCE,
          hiddenTextChecked: false,
        },
      }),
      "PUBLIC",
    );
    expect(unsafe.ok).toBe(false);
    if (unsafe.ok) return;
    expect(unsafe.errors).toContain("ANONYMIZATION_NOT_VERIFIED");
  });

  it("distinguishes an officially generated document from synthetic evidence", () => {
    const official = manifest({
      fixtureId: "official-generated-model-303-001",
      generationChannel: "OFFICIAL_SERVICE",
      sourceClass: "OFFICIAL_GENERATED",
      verificationEvidence: COMPLETE_EVIDENCE,
    });
    expect(validateTaxCorpusManifest(official, "PUBLIC").ok).toBe(true);
    const unverified = validateTaxCorpusManifest(
      {
        ...official,
        verificationEvidence: {
          ...COMPLETE_EVIDENCE,
          officialGenerationVerified: false,
        },
      },
      "PUBLIC",
    );
    expect(unverified.ok).toBe(false);
    if (unverified.ok) return;
    expect(unverified.errors).toContain("OFFICIAL_GENERATION_NOT_VERIFIED");
  });

  it("isolates engineering holdout and never treats it as independent evidence", () => {
    const engineering = manifest({
      fixtureId: "engineering-holdout-model-303-001",
      generationChannel: "ENGINEERING_PIPELINE",
      sourceClass: "ENGINEERING_HOLDOUT",
      holdout: true,
    });
    expect(
      validateTaxCorpusManifest(engineering, "ENGINEERING_HOLDOUT").ok,
    ).toBe(true);
    const publicResult = validateTaxCorpusManifest(engineering, "PUBLIC");
    expect(publicResult.ok).toBe(false);
    if (!publicResult.ok) {
      expect(publicResult.errors).toContain("HOLDOUT_STORAGE_CONTAMINATION");
    }
    expect(
      evaluateTaxCorpusAdmission(engineering, COMPLETE_INSPECTION),
    ).toMatchObject({
      outcome: "MANUAL_REVIEW",
      warningCodes: ["ENGINEERING_HOLDOUT_NOT_INDEPENDENT_EVIDENCE"],
    });
  });

  it("keeps independent holdout external, restricted and fully verified", () => {
    const independent = realManifest({
      fixtureId: "independent-holdout-model-303-001",
      generationChannel: "INDEPENDENT_REAL",
      sourceClass: "INDEPENDENT_HOLDOUT",
      holdout: true,
    });
    const publicResult = validateTaxCorpusManifest(independent, "PUBLIC");
    expect(publicResult.ok).toBe(false);
    if (!publicResult.ok) {
      expect(publicResult.errors).toContain("HOLDOUT_STORAGE_CONTAMINATION");
    }
    expect(
      validateTaxCorpusManifest(independent, "PRIVATE_INDEPENDENT_HOLDOUT").ok,
    ).toBe(true);
  });

  it.each([
    ["consentRecorded", "CONSENT_MISSING"],
    ["provenanceRecorded", "PROVENANCE_MISSING"],
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
    ["anonymizationVerified", "ANONYMIZATION_NOT_VERIFIED"],
    ["layoutClassified", "LAYOUT_NOT_CLASSIFIED"],
    ["manualReviewCompleted", "MANUAL_REVIEW_MISSING"],
  ] as const)(
    "blocks real admission when %s is missing",
    (key, expectedCode) => {
      const decision = evaluateTaxCorpusAdmission(realManifest(), {
        ...COMPLETE_INSPECTION,
        [key]: false,
      });
      expect(decision.outcome).toBe("REJECT");
      expect(decision.blockingCodes).toContain(expectedCode);
    },
  );

  it("blocks hash duplicates, residual PII, scripts, attachments and hidden content", () => {
    const decision = evaluateTaxCorpusAdmission(
      realManifest(),
      {
        ...COMPLETE_INSPECTION,
        actualSha256: "b".repeat(64),
        hasJavaScript: true,
        embeddedFileCount: 1,
        unexpectedHiddenLayerCount: 1,
        piiFindingCount: 1,
      },
      ["b".repeat(64)],
    );
    expect(decision).toMatchObject({
      outcome: "REJECT",
      blockingCodes: [
        "ACTIVE_CONTENT_PRESENT",
        "ATTACHMENTS_PRESENT",
        "DUPLICATE_SHA256",
        "PII_FINDINGS_PRESENT",
        "SHA256_MISMATCH",
        "UNEXPECTED_HIDDEN_CONTENT",
      ],
    });
  });
});

describe("current corpus adapter", () => {
  it("keeps all 389 current fixtures honestly synthetic", async () => {
    const records = await loadPublicTaxCorpus(resolve(process.cwd()));
    const engineering = await loadEngineeringHoldoutCorpus(
      resolve(process.cwd()),
    );
    const report = summarizeTaxCorpusValidation(
      [...records, ...engineering],
      REQUIRED_TAX_CORPUS_FAMILIES,
    );
    expect(report).toMatchObject({
      valid: true,
      manifestCount: 389,
      familyCount: 39,
      sourceClassCounts: {
        SYNTHETIC: 389,
        OFFICIAL_GENERATED: 0,
        REAL_ANONYMIZED: 0,
        ENGINEERING_HOLDOUT: 0,
        INDEPENDENT_HOLDOUT: 0,
      },
      nativeCount: 157,
      ocrCount: 232,
      incompleteCount: 119,
      duplicateFixtureIdCount: 0,
      duplicateSha256Count: 0,
      duplicateReferenceCount: 0,
      invalidManifestCount: 0,
      admissionAnomalyCount: 0,
      holdoutContaminationCount: 0,
      anonymizationAnomalyCount: 0,
      hashMismatchCount: 0,
      admittedCount: 389,
      officialGeneratedCount: 0,
      realDocumentCount: 0,
      engineeringHoldoutCount: 0,
      independentHoldoutCount: 0,
      engineeringHoldoutAvailable: false,
      independentHoldoutAvailable: false,
      independentHoldoutEvaluated: false,
      aggregateOnly: true,
    });
    expect(report.expectedFieldCount).toBeGreaterThan(0);
    expect(report.prohibitedInferenceCount).toBeGreaterThan(0);
    expect(report.fiscalYears.length).toBeGreaterThan(0);
    expect(report.layoutCount).toBeGreaterThan(0);
    expect(
      records.every(
        ({ manifest: item }) =>
          item.sourceClass === "SYNTHETIC" &&
          item.admitted === true &&
          item.anonymizationVerified === false &&
          item.holdout === false,
      ),
    ).toBe(true);
  });

  it("fails the aggregate validator on duplicate manifests", () => {
    const shared = manifest();
    const report = summarizeTaxCorpusValidation(
      [
        {
          manifest: shared,
          storageScope: "PUBLIC",
          actualSha256: shared.sha256,
        },
        {
          manifest: shared,
          storageScope: "PUBLIC",
          actualSha256: shared.sha256,
        },
      ],
      ["MODEL_303"],
    );
    expect(report.valid).toBe(false);
    expect(report.duplicateFixtureIdCount).toBe(1);
    expect(report.duplicateSha256Count).toBe(1);
  });

  it("reports an engineering holdout separately without inflating real or independent evidence", () => {
    const engineering = manifest({
      fixtureId: "engineering-holdout-model-303-002",
      generationChannel: "ENGINEERING_PIPELINE",
      sourceClass: "ENGINEERING_HOLDOUT",
      holdout: true,
    });
    const report = summarizeTaxCorpusValidation(
      [
        {
          manifest: engineering,
          storageScope: "ENGINEERING_HOLDOUT",
          actualSha256: engineering.sha256,
        },
      ],
      ["MODEL_303"],
    );
    expect(report).toMatchObject({
      valid: true,
      engineeringHoldoutCount: 1,
      independentHoldoutCount: 0,
      realDocumentCount: 0,
      engineeringHoldoutAvailable: true,
      independentHoldoutAvailable: false,
      independentHoldoutEvaluated: false,
    });
  });
});

describe("aggregate-only metrics", () => {
  const samples: TaxCorpusMetricSample[] = [
    {
      family: "MODEL_303",
      fiscalYear: 2026,
      layoutVersion: "LAYOUT_2026",
      sourceClass: "SYNTHETIC",
      deliveryMode: "NATIVE",
      expectedClassification: "MODEL_303",
      actualClassification: "MODEL_303",
      expectedFieldCount: 3,
      correctFieldCount: 3,
      falsePositiveCount: 0,
      falseNegativeCount: 0,
      prohibitedInferenceCount: 0,
      sentToReview: false,
    },
    {
      family: "MODEL_303",
      fiscalYear: 2026,
      layoutVersion: "LAYOUT_2026",
      sourceClass: "SYNTHETIC",
      deliveryMode: "OCR",
      expectedClassification: "MODEL_303",
      actualClassification: null,
      expectedFieldCount: 3,
      correctFieldCount: 2,
      falsePositiveCount: 1,
      falseNegativeCount: 1,
      prohibitedInferenceCount: 1,
      sentToReview: true,
    },
  ];

  it("reports every required metric by family, year, layout, source and delivery", () => {
    expect(summarizeTaxCorpusMetrics(samples)).toEqual({
      sampleCount: 2,
      classificationAccuracy: 0.5,
      fieldAccuracy: 5 / 6,
      falsePositiveCount: 1,
      falseNegativeCount: 1,
      prohibitedInferenceCount: 1,
      reviewRate: 0.5,
    });
    const groups = summarizeTaxCorpusMetricsByDimension(samples);
    expect(new Set(groups.map((group) => group.dimension))).toEqual(
      new Set([
        "FAMILY",
        "DELIVERY_MODE",
        "FISCAL_YEAR",
        "LAYOUT",
        "SOURCE_CLASS",
      ]),
    );
    expect(groups.every((group) => !("fixtureId" in group))).toBe(true);
  });
});

describe("independent holdout execution policy", () => {
  it("does not run in ordinary development", () => {
    expect(
      assertIndependentHoldoutExecutionPolicy({
        requested: false,
        aggregateOnly: false,
        jobEnabled: undefined,
        accessToken: undefined,
        repositoryRoot: "/repo",
        holdoutRoot: undefined,
      }),
    ).toEqual({ allowed: false, code: "NOT_REQUESTED" });
  });

  it("requires aggregate-only protected execution outside the repository", () => {
    expect(() =>
      assertIndependentHoldoutExecutionPolicy({
        requested: true,
        aggregateOnly: true,
        jobEnabled: "1",
        accessToken: "x".repeat(32),
        repositoryRoot: "/repo",
        holdoutRoot: "/repo/private-holdout",
      }),
    ).toThrow("INDEPENDENT_HOLDOUT_ROOT_MUST_BE_EXTERNAL");
    expect(
      assertIndependentHoldoutExecutionPolicy({
        requested: true,
        aggregateOnly: true,
        jobEnabled: "1",
        accessToken: "x".repeat(32),
        repositoryRoot: "/repo",
        holdoutRoot: "/secure/fiscal-independent-holdout",
      }),
    ).toEqual({
      allowed: true,
      code: "AUTHORIZED_AGGREGATE_INDEPENDENT_HOLDOUT_JOB",
    });
  });
});

describe("protected independent holdout workflow", () => {
  it("keeps independent evaluation opt-in, self-hosted and artifact-free", async () => {
    const workflow = await readFile(
      resolve(".github/workflows/tax-corpus-holdout-validation.yml"),
      "utf8",
    );
    expect(workflow).toContain("environment: fiscal-independent-holdout");
    expect(workflow).toContain(
      "runs-on: [self-hosted, fiscal-independent-holdout]",
    );
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("--independent-holdout --aggregate-only");
    expect(workflow).not.toContain("upload-artifact");
    expect(workflow).not.toContain("pull_request_target");
  });
});
