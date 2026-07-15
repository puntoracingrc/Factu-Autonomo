import { describe, expect, it } from "vitest";
import {
  evaluateFiscalCorpusResult,
  FISCAL_CORPUS_CONTRACT_VERSION,
  FISCAL_CORPUS_PLAN,
  summarizeFiscalCorpusMetrics,
  validateFiscalCorpusManifest,
  type FiscalCorpusManifest,
} from "./corpus";
import {
  FISCAL_DOCUMENT_EXTRACTION_CONTRACT_VERSION,
  FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION,
  type FiscalDocumentExtractionResult,
} from "./extractors/contracts";

function baseManifest(
  overrides: Partial<FiscalCorpusManifest> = {},
): FiscalCorpusManifest {
  return {
    corpusVersion: FISCAL_CORPUS_CONTRACT_VERSION,
    fixtureId: "m303-quarterly-intraeu-001-native",
    semanticCaseId: "m303-intraeu-reverse-charge-004",
    parentFixtureId: null,
    documentType: "MODEL_303",
    formVersion: "AEAT_MODEL_303_2025",
    fiscalYear: 2025,
    period: "2T",
    documentKind: "FILED_DECLARATION_COPY",
    filingStatus: "APPARENTLY_FILED",
    temporalScope: "SPECIFIC_PERIOD",
    lifecycleLabels: ["NOT_CURRENT_CENSUS_STATUS"],
    stateCoverage: "PERIOD_ONLY",
    visualVariant: "NATIVE_PDF",
    expectedEnvelope: { isComplete: true },
    expectedFields: [
      {
        factType: "vat.intraCommunityAcquisition",
        value: true,
        normalizedValue: true,
        page: 1,
        sourceLabel: "Adquisiciones intracomunitarias",
      },
    ],
    expectedQuestionMappings: [
      {
        questionId: "I_EU_GOODS_PURCHASES",
        proposedAnswer: "YES",
        canSkipQuestion: false,
        confirmationRequired: true,
      },
    ],
    mustNotInfer: [
      {
        code: "CURRENT_ROI_STATUS",
        questionId: "I_ROI",
        reason: "Un 303 histórico no acredita el alta actual en ROI.",
      },
      {
        code: "FUTURE_OBLIGATION",
        reason: "Una declaración presentada no acredita una obligación futura.",
      },
    ],
    allowAdditionalFactTypes: [],
    source: {
      kind: "SYNTHETIC_OFFICIAL_FORM",
      authorizationRecorded: true,
      sha256: "a".repeat(64),
      officialReference: {
        url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G414.shtml",
        capturedOn: "2026-07-14",
        sha256: null,
      },
      anonymizationAudit: {
        textLayerChecked: true,
        acroFormChecked: true,
        metadataChecked: true,
        annotationsChecked: true,
        hiddenPagesChecked: true,
        qrAndBarcodeChecked: true,
        embeddedFilesChecked: true,
        originalFileNameStored: false,
      },
    },
    asset: {
      pdfPath: "pdf/m303-quarterly-intraeu-001-native.pdf",
      extractedTextPath: "text/m303-quarterly-intraeu-001-native.txt",
    },
    extractor: {
      contractVersion: FISCAL_DOCUMENT_EXTRACTION_CONTRACT_VERSION,
      catalogVersion: FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION,
      extractorVersion: "model-303.2026-07.v2",
    },
    ...overrides,
  };
}

function baseResult(): FiscalDocumentExtractionResult {
  return {
    contractVersion: FISCAL_DOCUMENT_EXTRACTION_CONTRACT_VERSION,
    catalogVersion: FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION,
    status: "RESOLVED",
    envelope: {
      contractVersion: FISCAL_DOCUMENT_EXTRACTION_CONTRACT_VERSION,
      catalogVersion: FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION,
      documentId: "m303-quarterly-intraeu-001-native",
      authority: "AEAT",
      territory: "ES_COMMON",
      detectedModel: "303",
      detectedDocumentType: "MODEL_303",
      modelVersion: "model-303.2026-07.v2",
      fiscalYear: 2025,
      period: "2T",
      documentKind: "FILED_DECLARATION_COPY",
      filingStatus: "APPARENTLY_FILED",
      originalOrCorrection: "ORIGINAL",
      taxpayerNifMasked: null,
      taxpayerNameMasked: null,
      issueDate: null,
      filingDate: null,
      effectiveDate: null,
      receiptNumberMasked: null,
      csv: null,
      nrcDetected: false,
      totalPages: 1,
      detectedPages: [1],
      isComplete: true,
      extractionMethods: ["PDF_NATIVE_TEXT"],
      overallConfidence: 0.95,
      warnings: [],
    },
    facts: [
      {
        factId: "fact-intraeu",
        factType: "vat.intraCommunityAcquisition",
        value: true,
        normalizedValue: true,
        temporalScope: "SPECIFIC_PERIOD",
        effectiveFrom: null,
        effectiveTo: null,
        sourceDocumentId: "m303-quarterly-intraeu-001-native",
        sourcePage: 1,
        sourceField: "10",
        sourceLabel: "Adquisiciones intracomunitarias",
        sourceCoordinates: null,
        extractionMethod: "PDF_NATIVE_TEXT",
        extractionConfidence: 0.95,
        filingVerified: false,
        userConfirmed: false,
        status: "PREFILLED_NEEDS_CONFIRMATION",
        conflictsWith: [],
        supersededBy: null,
        warnings: [],
      },
    ],
    questionResolutions: [
      {
        questionId: "I_EU_GOODS_PURCHASES",
        proposedAnswer: "YES",
        status: "PREFILLED_NEEDS_CONFIRMATION",
        temporalScope: "SPECIFIC_PERIOD",
        evidenceIds: ["fact-intraeu"],
        explanation: "Operación intracomunitaria declarada en el período.",
        canSkipQuestion: false,
        confirmationRequired: true,
        missingInformation: [],
        conflictingInformation: [],
      },
    ],
    warnings: [],
  };
}

describe("fiscal extractor corpus contract", () => {
  it("reserves exactly the requested 41 semantic cases", () => {
    expect(FISCAL_CORPUS_PLAN).toHaveLength(41);
    expect(
      new Set(FISCAL_CORPUS_PLAN.map((item) => item.semanticCaseId)).size,
    ).toBe(41);

    const counts = Object.fromEntries(
      [...new Set(FISCAL_CORPUS_PLAN.map((item) => item.documentType))].map(
        (documentType) => [
          documentType,
          FISCAL_CORPUS_PLAN.filter(
            (item) => item.documentType === documentType,
          ).length,
        ],
      ),
    );
    expect(counts).toEqual({
      MODEL_036: 5,
      MODEL_037: 3,
      MODEL_130: 4,
      MODEL_303: 5,
      MODEL_390: 4,
      MODEL_111: 4,
      MODEL_115: 4,
      AEAT_ECONOMIC_ACTIVITIES_VIEW: 4,
      AEAT_TAX_STATUS_VIEW: 4,
      AEAT_OBLIGATIONS_VIEW: 4,
    });
    expect(
      FISCAL_CORPUS_PLAN.reduce(
        (total, item) => total + item.requiredVisualVariants.length,
        0,
      ),
    ).toBeGreaterThan(100);
  });

  it("locks model 037 to historical-only evidence", () => {
    const cases = FISCAL_CORPUS_PLAN.filter(
      (item) => item.documentType === "MODEL_037",
    );
    for (const item of cases) {
      expect(item.stateCoverage).toBe("HISTORICAL_ONLY");
      expect(item.lifecycleLabels).toContain("HISTORICAL_DOCUMENT");
      expect(item.lifecycleLabels).toContain("NOT_CURRENT_CENSUS_STATUS");
      expect(item.requiredForbiddenInferences).toContain(
        "CURRENT_CENSUS_STATUS",
      );
    }
  });

  it("rejects real files without the complete irreversible anonymization audit", () => {
    const manifest = baseManifest({
      source: {
        ...baseManifest().source,
        kind: "IRREVERSIBLY_ANONYMIZED_REAL",
        authorizationRecorded: false,
        officialReference: null,
        anonymizationAudit: {
          ...baseManifest().source.anonymizationAudit,
          metadataChecked: false,
        },
      },
    });
    expect(validateFiscalCorpusManifest(manifest)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ANONYMIZATION_AUDIT" }),
      ]),
    );
  });

  it("requires a dated official reference for synthetic official forms", () => {
    const manifest = baseManifest({
      source: {
        ...baseManifest().source,
        officialReference: null,
      },
    });
    expect(validateFiscalCorpusManifest(manifest)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "OFFICIAL_REFERENCE" }),
      ]),
    );
  });

  it("keeps synthetic functional views distinct from official screenshots", () => {
    const manifest = baseManifest({
      documentType: "AEAT_TAX_STATUS_VIEW",
      formVersion: "SYNTHETIC_AEAT_INSPIRED_VIEW_V1",
      source: {
        ...baseManifest().source,
        kind: "SYNTHETIC_FUNCTIONAL_VIEW",
      },
    });
    expect(validateFiscalCorpusManifest(manifest)).toEqual([]);
  });

  it("requires partial captures to fail closed", () => {
    const manifest = baseManifest({
      documentType: "AEAT_ECONOMIC_ACTIVITIES_VIEW",
      stateCoverage: "PARTIAL_CURRENT_STATE",
      expectedEnvelope: { isComplete: true },
      mustNotInfer: [],
    });
    expect(validateFiscalCorpusManifest(manifest)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "PARTIAL_CAPTURE" }),
      ]),
    );
  });

  it("measures classification, extraction, normalization, mapping and forbidden inference separately", () => {
    const evaluation = evaluateFiscalCorpusResult(baseManifest(), baseResult());
    expect(evaluation).toEqual(
      expect.objectContaining({
        passed: true,
        dimensions: {
          classificationCorrect: true,
          expectedFieldCount: 1,
          matchedFieldCount: 1,
          extractionMismatchCount: 0,
          normalizationMismatchCount: 0,
          expectedMappingCount: 1,
          mappingMismatchCount: 0,
          falsePositiveCount: 0,
          forbiddenInferenceCount: 0,
        },
      }),
    );
  });

  it("fails when low-confidence OCR is allowed to skip a question", () => {
    const result = baseResult();
    const evaluation = evaluateFiscalCorpusResult(baseManifest(), {
      ...result,
      facts: result.facts.map((fact) => ({
        ...fact,
        extractionMethod: "OCR_LOCAL",
        extractionConfidence: 0.55,
      })),
      questionResolutions: result.questionResolutions.map((resolution) => ({
        ...resolution,
        canSkipQuestion: true,
      })),
    });
    expect(evaluation.passed).toBe(false);
    expect(evaluation.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "LOW_CONFIDENCE_SKIP" }),
      ]),
    );
  });

  it("reports native PDF and OCR quality separately", () => {
    const nativeManifest = baseManifest();
    const nativeEvaluation = evaluateFiscalCorpusResult(
      nativeManifest,
      baseResult(),
    );
    const ocrManifest = baseManifest({
      fixtureId: "m303-quarterly-intraeu-001-scanned",
      parentFixtureId: nativeManifest.fixtureId,
      visualVariant: "SCANNED_PDF",
    });
    const ocrResult = baseResult();
    const ocrEvaluation = evaluateFiscalCorpusResult(ocrManifest, {
      ...ocrResult,
      facts: [],
      questionResolutions: [],
    });
    const metrics = summarizeFiscalCorpusMetrics([
      { manifest: nativeManifest, evaluation: nativeEvaluation },
      { manifest: ocrManifest, evaluation: ocrEvaluation },
    ]);

    expect(metrics.nativePdf.fieldRecall).toBe(1);
    expect(metrics.ocrVisualVariants.fieldRecall).toBe(0);
    expect(metrics.nativeMinusOcr.fieldRecall).toBe(1);
  });
});
