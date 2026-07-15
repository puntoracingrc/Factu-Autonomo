import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  TaxCorpusAnonymizationReview,
  TaxCorpusDocumentManifest,
  TaxCorpusMetricSample,
} from "./contracts";
import {
  REQUIRED_TAX_CORPUS_FAMILIES,
  loadPublicTaxCorpus,
} from "./current-corpus.mjs";
import {
  assertHoldoutExecutionPolicy,
  evaluateTaxCorpusAdmission,
  summarizeTaxCorpusMetrics,
  summarizeTaxCorpusMetricsByDimension,
  summarizeTaxCorpusValidation,
  validateTaxCorpusManifest,
} from "./runtime.mjs";

const COMPLETE_REVIEW: TaxCorpusAnonymizationReview = {
  visibleLayerChecked: true,
  hiddenTextChecked: true,
  metadataChecked: true,
  acroFormChecked: true,
  xfaChecked: true,
  annotationsChecked: true,
  attachmentsChecked: true,
  qrChecked: true,
  barcodeChecked: true,
  fileNameChecked: true,
  automatedScanPassed: true,
  humanReviewCompleted: true,
};

function manifest(
  override: Partial<TaxCorpusDocumentManifest> = {},
): TaxCorpusDocumentManifest {
  return {
    manifestVersion: "tax-corpus-document.2026-07.v1",
    fixtureId: "synthetic-model-303-001",
    family: "MODEL_303",
    fiscalYear: 2026,
    layoutVersion: "SYNTHETIC_LAYOUT_2026",
    sourceClass: "SYNTHETIC",
    expectedFields: [{ fieldId: "document.model", expectedValue: "303" }],
    forbiddenInferences: ["CURRENT_CENSUS_STATUS"],
    sha256: "a".repeat(64),
    admissionStatus: "ADMITTED",
    anonymizationVerified: false,
    holdoutMembership: false,
    completeDocument: true,
    deliveryMode: "NATIVE",
    assetFile: "synthetic-model-303-001.pdf",
    containsRealPersonalData: false,
    authorizationRecorded: false,
    officialGenerationVerified: false,
    anonymizationReview: null,
    missingFields: [],
    ...override,
  };
}

describe("tax corpus manifest and admission", () => {
  it("admits an explicitly synthetic manifest without claiming anonymization", () => {
    const result = validateTaxCorpusManifest(manifest(), "PUBLIC");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sourceClass).toBe("SYNTHETIC");
    expect(result.value.anonymizationVerified).toBe(false);
    expect(Object.isFrozen(result.value)).toBe(true);
  });

  it("keeps known incomplete gaps explicit but non-blocking", () => {
    const incomplete = manifest({
      completeDocument: false,
      missingFields: ["UNKNOWN_FIELDS_OUTSIDE_DOCUMENT_SCOPE"],
    });
    expect(validateTaxCorpusManifest(incomplete, "PUBLIC").ok).toBe(true);
    expect(
      evaluateTaxCorpusAdmission(incomplete, {
        parseable: true,
        encrypted: false,
        hasJavaScript: false,
        embeddedFileCount: 0,
        unexpectedHiddenLayerCount: 0,
        piiFindingCount: 0,
        actualSha256: incomplete.sha256,
      }),
    ).toEqual({
      outcome: "QUARANTINE",
      blockingCodes: [],
      warningCodes: [
        "KNOWN_INCOMPLETE_DOCUMENT",
        "SYNTHETIC_NOT_REAL_COMPATIBILITY_EVIDENCE",
      ],
    });
  });

  it("rejects an incomplete document that hides its missing fields", () => {
    const result = validateTaxCorpusManifest(
      manifest({ completeDocument: false, missingFields: [] }),
      "PUBLIC",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("INCOMPLETE_DOCUMENT_MISSING_GAPS");
  });

  it("requires authorization and every anonymization layer for real input", () => {
    const real = manifest({
      fixtureId: "real-anonymized-model-303-001",
      sourceClass: "REAL_ANONYMIZED",
      anonymizationVerified: true,
      authorizationRecorded: true,
      anonymizationReview: COMPLETE_REVIEW,
    });
    expect(validateTaxCorpusManifest(real, "PUBLIC").ok).toBe(true);
    const unsafe = validateTaxCorpusManifest(
      {
        ...real,
        anonymizationReview: { ...COMPLETE_REVIEW, hiddenTextChecked: false },
      },
      "PUBLIC",
    );
    expect(unsafe.ok).toBe(false);
    if (unsafe.ok) return;
    expect(unsafe.errors).toContain("ANONYMIZATION_NOT_VERIFIED");
  });

  it("distinguishes an officially generated document from a synthetic fixture", () => {
    const official = manifest({
      fixtureId: "official-generated-model-303-001",
      sourceClass: "OFFICIAL_GENERATED",
      officialGenerationVerified: true,
    });
    expect(validateTaxCorpusManifest(official, "PUBLIC").ok).toBe(true);
    const unverified = validateTaxCorpusManifest(
      { ...official, officialGenerationVerified: false },
      "PUBLIC",
    );
    expect(unverified.ok).toBe(false);
    if (unverified.ok) return;
    expect(unverified.errors).toContain("OFFICIAL_GENERATION_NOT_VERIFIED");
  });

  it("rejects a holdout placed in the public corpus", () => {
    const holdout = manifest({
      fixtureId: "holdout-model-303-001",
      sourceClass: "HOLDOUT",
      anonymizationVerified: true,
      holdoutMembership: true,
      authorizationRecorded: true,
      anonymizationReview: COMPLETE_REVIEW,
    });
    const publicResult = validateTaxCorpusManifest(holdout, "PUBLIC");
    expect(publicResult.ok).toBe(false);
    if (publicResult.ok) return;
    expect(publicResult.errors).toContain("HOLDOUT_STORAGE_CONTAMINATION");
    expect(validateTaxCorpusManifest(holdout, "PRIVATE_HOLDOUT").ok).toBe(true);
  });

  it("blocks duplicates, residual PII and hash mismatches at admission", () => {
    const candidate = manifest({
      fixtureId: "real-anonymized-model-303-002",
      sourceClass: "REAL_ANONYMIZED",
      anonymizationVerified: true,
      authorizationRecorded: true,
      anonymizationReview: COMPLETE_REVIEW,
    });
    expect(
      evaluateTaxCorpusAdmission(
        candidate,
        {
          parseable: true,
          encrypted: false,
          hasJavaScript: false,
          embeddedFileCount: 0,
          unexpectedHiddenLayerCount: 1,
          piiFindingCount: 1,
          actualSha256: "b".repeat(64),
        },
        ["b".repeat(64)],
      ),
    ).toMatchObject({
      outcome: "REJECT",
      blockingCodes: [
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
    const report = summarizeTaxCorpusValidation(
      records,
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
        HOLDOUT: 0,
      },
      admissionCounts: { PENDING: 0, ADMITTED: 389, REJECTED: 0 },
      nativeCount: 157,
      ocrCount: 232,
      incompleteCount: 119,
      duplicateFixtureIdCount: 0,
      duplicateSha256Count: 0,
      holdoutContaminationCount: 0,
      anonymizationFailureCount: 0,
      hashMismatchCount: 0,
      officialGeneratedAvailable: false,
      realAnonymizedAvailable: false,
      holdoutEvaluated: false,
      aggregateOnly: true,
    });
    expect(report.knownMissingFieldCount).toBeGreaterThanOrEqual(119);
    expect(
      records.every(
        ({ manifest: item }) =>
          item.sourceClass === "SYNTHETIC" &&
          item.admissionStatus === "ADMITTED" &&
          item.anonymizationVerified === false &&
          item.holdoutMembership === false,
      ),
    ).toBe(true);
  });

  it("fails the aggregate validator on duplicate manifests", () => {
    const shared = manifest();
    const report = summarizeTaxCorpusValidation(
      [
        { manifest: shared, storageScope: "PUBLIC", actualSha256: shared.sha256 },
        { manifest: shared, storageScope: "PUBLIC", actualSha256: shared.sha256 },
      ],
      ["MODEL_303"],
    );
    expect(report.valid).toBe(false);
    expect(report.duplicateFixtureIdCount).toBe(1);
    expect(report.duplicateSha256Count).toBe(1);
  });
});

describe("aggregate-only metrics", () => {
  const samples: TaxCorpusMetricSample[] = [
    {
      family: "MODEL_303",
      fiscalYear: 2026,
      layoutVersion: "LAYOUT_2026",
      deliveryMode: "NATIVE",
      recognized: true,
      expectedFieldCount: 3,
      correctFieldCount: 3,
      falsePositiveCount: 0,
      forbiddenInferenceCount: 0,
      sentToReview: false,
    },
    {
      family: "MODEL_303",
      fiscalYear: 2026,
      layoutVersion: "LAYOUT_2026",
      deliveryMode: "OCR",
      recognized: false,
      expectedFieldCount: 3,
      correctFieldCount: 2,
      falsePositiveCount: 1,
      forbiddenInferenceCount: 1,
      sentToReview: true,
    },
  ];

  it("reports recognition, field precision, false positives, inferences and review", () => {
    expect(summarizeTaxCorpusMetrics(samples)).toEqual({
      sampleCount: 2,
      recognitionRate: 0.5,
      fieldPrecision: 5 / 6,
      falsePositiveCount: 1,
      forbiddenInferenceCount: 1,
      reviewRate: 0.5,
    });
    const groups = summarizeTaxCorpusMetricsByDimension(samples);
    expect(groups.some((group) => group.dimension === "FAMILY")).toBe(true);
    expect(
      groups.filter((group) => group.dimension === "DELIVERY_MODE"),
    ).toHaveLength(2);
    expect(groups.every((group) => !("fixtureId" in group))).toBe(true);
  });
});

describe("holdout execution policy", () => {
  it("does not run in ordinary development", () => {
    expect(
      assertHoldoutExecutionPolicy({
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
      assertHoldoutExecutionPolicy({
        requested: true,
        aggregateOnly: true,
        jobEnabled: "1",
        accessToken: "x".repeat(32),
        repositoryRoot: "/repo",
        holdoutRoot: "/repo/private-holdout",
      }),
    ).toThrow("HOLDOUT_ROOT_MUST_BE_EXTERNAL");
    expect(
      assertHoldoutExecutionPolicy({
        requested: true,
        aggregateOnly: true,
        jobEnabled: "1",
        accessToken: "x".repeat(32),
        repositoryRoot: "/repo",
        holdoutRoot: "/secure/fiscal-holdout",
      }),
    ).toEqual({ allowed: true, code: "AUTHORIZED_AGGREGATE_JOB" });
  });
});

describe("protected holdout workflow", () => {
  it("keeps private evaluation opt-in, self-hosted and artifact-free", async () => {
    const workflow = await readFile(
      resolve(".github/workflows/tax-corpus-holdout-validation.yml"),
      "utf8",
    );
    expect(workflow).toContain("environment: fiscal-holdout");
    expect(workflow).toContain("runs-on: [self-hosted, fiscal-holdout]");
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("--holdout --aggregate-only");
    expect(workflow).not.toContain("upload-artifact");
    expect(workflow).not.toContain("pull_request_target");
  });
});
