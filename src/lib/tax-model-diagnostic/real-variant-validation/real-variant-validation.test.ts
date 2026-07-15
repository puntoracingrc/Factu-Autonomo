import { describe, expect, it } from "vitest";
import { isTaxObligationExclusionAuthorized } from "@/lib/tax-obligations";
import {
  buildDeterministicDegradationPlan,
  CLASSIFICATION_CONFUSION_GROUPS,
  CURRENT_CORPUS_INVENTORY,
  DOCUMENT_LAYOUT_REGISTRY,
  evaluateClassificationRegression,
  evaluateCorpusAdmission,
  findForbiddenInferenceViolations,
  GLOBAL_FORBIDDEN_INFERENCES,
  isQuestionSkipSafe,
  readCorpusInventory,
  readDocumentLayoutRegistry,
  REAL_VARIANT_FAMILIES,
  REAL_VARIANT_MANIFEST_VERSION,
  resolveDocumentLayout,
  scanPdfLayersForPii,
  summarizeRealVariantMetrics,
  summarizeRealVariantMetricsByGroup,
  technicalValidationPreservesRuleReviewState,
  temporalEvidenceNeedsConfirmation,
  validateRealVariantManifest,
  type PdfInspectionSnapshot,
  type PdfLayerSnapshot,
  type RealVariantManifest,
  type RealVariantMetricsInput,
} from ".";

const SHA = "a".repeat(64);

function privacyReview(): RealVariantManifest["privacyReview"] {
  return {
    automatedScanVersion: "tax-pii-scan.2026-07.v1",
    automatedScanPassed: true,
    humanVisualReviewCompleted: true,
    humanReviewerId: "reviewer-a",
    reviewedAt: "2026-07-15",
    textLayerChecked: true,
    ocrLayerChecked: true,
    metadataChecked: true,
    acroFormChecked: true,
    xfaChecked: true,
    annotationsChecked: true,
    embeddedFilesChecked: true,
    qrAndBarcodeChecked: true,
    fileNameChecked: true,
    hiddenContentChecked: true,
  };
}

function manifest(
  overrides: Partial<RealVariantManifest> = {},
): RealVariantManifest {
  return {
    manifestVersion: REAL_VARIANT_MANIFEST_VERSION,
    fixtureId: "synthetic-model-303-native",
    family: "MODEL_303",
    authority: "AEAT",
    territory: "ES_COMMON",
    modelNumber: "303",
    documentName: "Modelo 303 sintético",
    fiscalYear: 2026,
    period: "1T",
    layoutVersion: "SYNTHETIC_PENDING29_2_0_2026",
    extractorVersionExpected: "MODEL_303_EXTRACTOR_V1",
    sourceClass: "SYNTHETIC",
    sourceGenerationMethod: "Fixture generado sin datos de contribuyentes",
    authorizationRecorded: false,
    officialSourceReferences: [
      "https://sede.agenciatributaria.gob.es/Sede/iva.html",
    ],
    documentKind: "DRAFT",
    filingStatus: "DRAFT",
    temporalScope: "PERIOD",
    completeDocument: true,
    expectedPageCount: 1,
    observedPageCount: 1,
    visualVariant: "NATIVE",
    fileCharacteristics: {
      nativeText: true,
      acroForm: false,
      xfa: false,
      embeddedFonts: true,
      digitalSignature: false,
      qrOrBarcode: false,
      rotation: 0,
      pageSizes: ["A4"],
      encrypted: false,
    },
    expectedClassification: {
      family: "MODEL_303",
      authority: "AEAT",
      fiscalYear: 2026,
      period: "1T",
      layoutVersion: "SYNTHETIC_PENDING29_2_0_2026",
    },
    expectedFields: [
      {
        fieldId: "model",
        page: 1,
        label: "Modelo",
        boxNumber: null,
        coordinates: null,
        expectedRawValue: "303",
        expectedNormalizedValue: "303",
        critical: true,
      },
    ],
    expectedQuestionMappings: [
      {
        questionId: "has-periodic-vat",
        proposedAnswer: null,
        canSkipQuestion: false,
        confirmationRequired: true,
      },
    ],
    fieldEvidence: [
      {
        fieldId: "model",
        page: 1,
        label: "Modelo",
        boxNumber: null,
        coordinates: null,
        expectedRawValue: "303",
        expectedNormalizedValue: "303",
        critical: true,
      },
    ],
    forbiddenInferences: ["MODEL_303_MEANS_MODEL_390_OBLIGATION"],
    expectedWarnings: ["SYNTHETIC_SOURCE_NOT_REAL_COMPATIBILITY_EVIDENCE"],
    expectedOutcome: "ACCEPT_WITH_REVIEW",
    privacyReview: privacyReview(),
    sha256: SHA,
    sourceReviewedAt: "2026-07-15",
    reviewers: ["reviewer-a"],
    notes: ["No representa una declaración real."],
    ...overrides,
  };
}

function inspection(
  overrides: Partial<PdfInspectionSnapshot> = {},
): PdfInspectionSnapshot {
  return {
    byteLength: 10_000,
    hasPdfHeader: true,
    parseable: true,
    unexpectedlyTruncated: false,
    encrypted: false,
    pageCount: 1,
    declaredPageCount: 1,
    pageSizes: [{ width: 595, height: 842 }],
    hasJavaScript: false,
    externalLinkCount: 0,
    embeddedFileCount: 0,
    malformedCriticalObjectCount: 0,
    sha256: SHA,
    ...overrides,
  };
}

function emptyLayers(
  overrides: Partial<PdfLayerSnapshot> = {},
): PdfLayerSnapshot {
  return {
    fileName: "fixture.pdf",
    nativeText: [],
    ocrText: [],
    xmpValues: [],
    documentProperties: [],
    acroFormValues: [],
    xfaValues: [],
    annotationValues: [],
    embeddedFileNames: [],
    embeddedTextValues: [],
    optionalContentLayerNames: [],
    qrAndBarcodeValues: [],
    internalPathValues: [],
    ...overrides,
  };
}

describe("real variant corpus inventory", () => {
  it("lists the 39 exact families once and exposes the real evidence gap", () => {
    expect(REAL_VARIANT_FAMILIES).toHaveLength(39);
    expect(new Set(REAL_VARIANT_FAMILIES).size).toBe(39);
    expect(CURRENT_CORPUS_INVENTORY).toHaveLength(39);
    expect(
      CURRENT_CORPUS_INVENTORY.reduce(
        (total, row) => total + row.manifestCount,
        0,
      ),
    ).toBe(389);
    expect(
      CURRENT_CORPUS_INVENTORY.every(
        (row) =>
          row.coverageStatus === "REAL_VARIANT_GAP" &&
          row.realAnonymizedCount === 0 &&
          row.holdoutCount === 0,
      ),
    ).toBe(true);
  });

  it("returns defensive copies", () => {
    const first = readCorpusInventory();
    const originalFamily = first[0]?.family;
    expect(originalFamily).toBeDefined();
    (first as unknown as { family: string }[])[0]!.family = "MODEL_999";
    expect(readCorpusInventory()[0]?.family).toBe(originalFamily);
  });
});

describe("layout registry", () => {
  it("has one pending synthetic layout for every family", () => {
    expect(DOCUMENT_LAYOUT_REGISTRY).toHaveLength(39);
    expect(
      DOCUMENT_LAYOUT_REGISTRY.every(
        (layout) =>
          layout.reviewStatus === "SYNTHETIC_ONLY" &&
          layout.sourceHash === "HASH_PENDING",
      ),
    ).toBe(true);
  });

  it("resolves exact values without coercion and blocks unknown layouts", () => {
    const known = DOCUMENT_LAYOUT_REGISTRY.find(
      (layout) => layout.family === "MODEL_303",
    );
    expect(known).toBeDefined();
    expect(
      resolveDocumentLayout({
        family: known!.family,
        fiscalYear: known!.fiscalYear,
        layoutId: known!.layoutId,
      }),
    ).toMatchObject({
      status: "KNOWN_LAYOUT",
      mayAutoConfirm: false,
      requiresManualReview: true,
    });
    expect(
      resolveDocumentLayout({
        family: "MODEL_303",
        fiscalYear: String(known!.fiscalYear),
        layoutId: known!.layoutId,
      }).status,
    ).toBe("KNOWN_FAMILY_UNKNOWN_LAYOUT");
    expect(
      resolveDocumentLayout({
        family: "MODEL_303",
        fiscalYear: known!.fiscalYear + 1,
        layoutId: "UNKNOWN_LAYOUT",
      }).status,
    ).toBe("UNSUPPORTED_LAYOUT_NEEDS_REVIEW");
    expect(
      resolveDocumentLayout({
        family: "MODEL_999",
        fiscalYear: 2026,
        layoutId: "UNKNOWN_LAYOUT",
      }).status,
    ).toBe("UNSUPPORTED_DOCUMENT");
  });

  it("does not let consumer mutation change the registry", () => {
    const copy = readDocumentLayoutRegistry();
    (copy[0]!.titleAnchors as string[]).push("MUTATED");
    expect(readDocumentLayoutRegistry()[0]!.titleAnchors).not.toContain(
      "MUTATED",
    );
  });
});

describe("manifest validation and admission", () => {
  it("accepts a fully explicit synthetic manifest but keeps it review-only", () => {
    const result = validateRealVariantManifest(manifest());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(result.value.sourceClass).toBe("SYNTHETIC");
    expect(
      evaluateCorpusAdmission(
        result.value,
        inspection(),
        scanPdfLayersForPii(emptyLayers()),
      ),
    ).toEqual({
      outcome: "ACCEPT_WITH_REVIEW",
      blockingCodes: [],
      warningCodes: ["SYNTHETIC_SOURCE_NOT_REAL_COMPATIBILITY_EVIDENCE"],
    });
  });

  it.each([
    [{ extra: true }, "UNKNOWN_FIELD:extra"],
    [{ fiscalYear: "2026" }, "INVALID_FISCAL_YEAR"],
    [{ modelNumber: 303 }, "MODEL_FAMILY_MISMATCH"],
    [
      { officialSourceReferences: ["https://aeat.example/modelo-303"] },
      "INVALID_OFFICIAL_SOURCE_REFERENCE",
    ],
    [
      {
        sourceClass: "REAL_ANONYMIZED",
        authorizationRecorded: false,
        reviewers: ["one"],
      },
      "REAL_SOURCE_WITHOUT_AUTHORIZATION",
    ],
    [
      { completeDocument: false, expectedOutcome: "ACCEPT" },
      "INCOMPLETE_DOCUMENT_CANNOT_ACCEPT",
    ],
    [
      { documentKind: "PARTIAL_SCREEN_CAPTURE", forbiddenInferences: [] },
      "PARTIAL_CAPTURE_MISSING_ABSENCE_GUARD",
    ],
  ])("rejects invalid or unsafe manifest data", (override, expectedError) => {
    const result = validateRealVariantManifest({ ...manifest(), ...override });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain(expectedError);
  });

  it("requires real evidence before allowing a question skip", () => {
    const rejected = validateRealVariantManifest(
      manifest({
        expectedQuestionMappings: [
          {
            questionId: "critical-question",
            proposedAnswer: true,
            canSkipQuestion: true,
            confirmationRequired: false,
          },
        ],
      }),
    );
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.errors).toContain(
        "UNSAFE_QUESTION_SKIP:critical-question",
      );
    }
  });

  it("rejects hostile PDFs, duplicates and mismatched hashes", () => {
    const decision = evaluateCorpusAdmission(
      manifest(),
      inspection({
        hasJavaScript: true,
        embeddedFileCount: 1,
        encrypted: true,
        sha256: "b".repeat(64),
      }),
      scanPdfLayersForPii(
        emptyLayers({ nativeText: ["ES9121000418450200051332"] }),
      ),
      ["b".repeat(64)],
    );
    expect(decision.outcome).toBe("REJECT");
    expect(decision.blockingCodes).toEqual(
      expect.arrayContaining([
        "ENCRYPTED_PDF",
        "PDF_JAVASCRIPT_PRESENT",
        "EMBEDDED_FILES_PRESENT",
        "SHA256_MISMATCH",
        "DUPLICATE_SHA256",
        "PII_SCAN_BLOCKED",
      ]),
    );
  });
});

describe("privacy and deterministic degradation", () => {
  it("scans all layers without returning raw PII", () => {
    const result = scanPdfLayersForPii(
      emptyLayers({
        fileName: "12345678Z-modelo.pdf",
        nativeText: ["persona@example.com"],
        acroFormValues: ["ES9121000418450200051332"],
        qrAndBarcodeValues: ["CSV:ABCDEF123456"],
      }),
    );
    expect(result.safeForCorpus).toBe(false);
    expect(result.scannedLayerCount).toBe(13);
    expect(result.rawValuesExposed).toBe(false);
    expect(JSON.stringify(result)).not.toContain("persona@example.com");
  });

  it("allows declared synthetic replacements but still finds known originals", () => {
    expect(
      scanPdfLayersForPii(
        emptyLayers({ nativeText: ["12345678Z"] }),
        [],
        ["12345678Z"],
      ).safeForCorpus,
    ).toBe(true);
    expect(
      scanPdfLayersForPii(emptyLayers({ nativeText: ["ORIGINAL SECRET"] }), [
        "ORIGINAL SECRET",
      ]).safeForCorpus,
    ).toBe(false);
  });

  it("builds the same twelve degradation recipes from the same parent", () => {
    const first = buildDeterministicDegradationPlan("fixture-303", SHA);
    const second = buildDeterministicDegradationPlan("fixture-303", SHA);
    expect(first).toEqual(second);
    expect(first.recipes).toHaveLength(12);
    expect(new Set(first.recipes.map((recipe) => recipe.id)).size).toBe(12);
  });
});

describe("regression, temporal and release guards", () => {
  it("keeps confusion tests explicit and unknown documents unsupported", () => {
    expect(CLASSIFICATION_CONFUSION_GROUPS).toHaveLength(12);
    expect(evaluateClassificationRegression("MODEL_303", "MODEL_390")).toEqual({
      accepted: false,
      status: "CONFUSION_FALSE_POSITIVE",
    });
    expect(evaluateClassificationRegression(null, null)).toEqual({
      accepted: true,
      status: "UNSUPPORTED_DOCUMENT",
    });
    expect(evaluateClassificationRegression(null, "MODEL_303").accepted).toBe(
      false,
    );
  });

  it("blocks forbidden inferences, unsafe skips and temporal extrapolation", () => {
    expect(
      findForbiddenInferenceViolations(GLOBAL_FORBIDDEN_INFERENCES, [
        "MODEL_303_MEANS_MODEL_390_OBLIGATION",
        "UNRELATED_TRACE",
      ]),
    ).toEqual(["MODEL_303_MEANS_MODEL_390_OBLIGATION"]);
    expect(
      isQuestionSkipSafe({
        critical: true,
        extractionConfidence: 0.99,
        completeDocument: true,
        layoutKnown: true,
        ocrAmbiguous: false,
        canSkipQuestion: true,
      }),
    ).toBe(false);
    expect(temporalEvidenceNeedsConfirmation("HISTORICAL", "CURRENT")).toBe(
      true,
    );
    expect(temporalEvidenceNeedsConfirmation("SPECIFIC_PERIOD", "FUTURE")).toBe(
      true,
    );
  });

  it("requires perfect critical gates and never changes fiscal review state", () => {
    const sample: RealVariantMetricsInput = {
      family: "MODEL_303",
      layoutId: "SYNTHETIC_PENDING29_2_0_2026",
      fiscalYear: 2026,
      expectedClassification: "MODEL_303",
      actualClassification: "MODEL_303",
      criticalFieldTotal: 2,
      criticalFieldCorrect: 2,
      nonCriticalFieldTotal: 1,
      nonCriticalFieldCorrect: 1,
      forbiddenInferenceCount: 0,
      incorrectlySkippedCriticalQuestionCount: 0,
      sentToReview: true,
      parserFailed: false,
      ocrFailed: false,
      processingTimeMs: 40,
    };
    expect(summarizeRealVariantMetrics([sample]).releaseGatePassed).toBe(true);
    expect(summarizeRealVariantMetricsByGroup([sample])).toEqual([
      expect.objectContaining({
        family: "MODEL_303",
        fiscalYear: 2026,
        sampleCount: 1,
        releaseGatePassed: true,
      }),
    ]);
    expect(
      summarizeRealVariantMetrics([{ ...sample, forbiddenInferenceCount: 1 }])
        .releaseGatePassed,
    ).toBe(false);
    expect(
      technicalValidationPreservesRuleReviewState(
        "PENDING_FISCAL_REVIEW",
        "APPROVED",
      ),
    ).toBe(false);
  });

  it("uses the central guard and treats global approval as insufficient", () => {
    expect(
      isTaxObligationExclusionAuthorized({
        ruleReviewState: "PENDING_FISCAL_REVIEW",
        resolutionState: "RESOLVED",
      }),
    ).toBe(false);
    expect(
      isTaxObligationExclusionAuthorized({
        ruleReviewState: "APPROVED",
        resolutionState: "MANUAL_REVIEW",
      }),
    ).toBe(false);
    expect(
      isTaxObligationExclusionAuthorized({
        ruleReviewState: "APPROVED",
        resolutionState: "RESOLVED",
      }),
    ).toBe(false);
  });
});
