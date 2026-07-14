import type {
  DocumentKind,
  FiscalDocumentExtractionResult,
  FiscalDocumentType,
  FilingStatus,
  JsonValue,
  TemporalScope,
} from "./extractors/contracts";

export const FISCAL_CORPUS_CONTRACT_VERSION =
  "fiscal-extractor-corpus.2026-07.v1" as const;

export type CorpusVisualVariant =
  | "NATIVE_PDF"
  | "SCANNED_PDF"
  | "LOW_RESOLUTION_SCAN"
  | "ROTATED_SCAN"
  | "PHOTOGRAPHED_PDF"
  | "SCREENSHOT"
  | "COMPRESSED_SCREENSHOT"
  | "CROPPED_SCREENSHOT";

export type CorpusStateCoverage =
  | "FULL_CURRENT_STATE"
  | "PARTIAL_CURRENT_STATE"
  | "PERIOD_ONLY"
  | "HISTORICAL_ONLY";

export type CorpusLifecycleLabel =
  "CURRENT_EVIDENCE" | "HISTORICAL_DOCUMENT" | "NOT_CURRENT_CENSUS_STATUS";

export type ForbiddenInferenceCode =
  | "CURRENT_CENSUS_STATUS"
  | "FUTURE_OBLIGATION"
  | "CURRENT_ROI_STATUS"
  | "CURRENT_VAT_REGIME"
  | "ABSENCE_OUTSIDE_CAPTURE"
  | "EMPLOYEES_FROM_MODEL_111"
  | "PROFESSIONALS_FROM_MODEL_111";

export interface FiscalCorpusExpectedField {
  factType: string;
  value: JsonValue;
  normalizedValue: JsonValue;
  page: number;
  sourceLabel: string;
}

export interface FiscalCorpusExpectedQuestionMapping {
  questionId: string;
  proposedAnswer: JsonValue;
  canSkipQuestion: boolean;
  confirmationRequired: boolean;
}

export interface FiscalCorpusForbiddenInference {
  code: ForbiddenInferenceCode;
  questionId?: string;
  reason: string;
}

export interface FiscalCorpusAnonymizationAudit {
  textLayerChecked: boolean;
  acroFormChecked: boolean;
  metadataChecked: boolean;
  annotationsChecked: boolean;
  hiddenPagesChecked: boolean;
  qrAndBarcodeChecked: boolean;
  embeddedFilesChecked: boolean;
  originalFileNameStored: false;
}

export interface FiscalCorpusManifest {
  corpusVersion: typeof FISCAL_CORPUS_CONTRACT_VERSION;
  fixtureId: string;
  semanticCaseId: string;
  parentFixtureId: string | null;
  documentType: FiscalDocumentType;
  formVersion: string;
  fiscalYear: number;
  period: string | null;
  documentKind: DocumentKind;
  filingStatus: FilingStatus;
  temporalScope: TemporalScope;
  lifecycleLabels: readonly CorpusLifecycleLabel[];
  stateCoverage: CorpusStateCoverage;
  visualVariant: CorpusVisualVariant;
  expectedEnvelope: {
    isComplete: boolean;
  };
  expectedFields: readonly FiscalCorpusExpectedField[];
  expectedQuestionMappings: readonly FiscalCorpusExpectedQuestionMapping[];
  mustNotInfer: readonly FiscalCorpusForbiddenInference[];
  allowAdditionalFactTypes: readonly string[];
  source: {
    kind: "SYNTHETIC_OFFICIAL_FORM" | "IRREVERSIBLY_ANONYMIZED_REAL";
    authorizationRecorded: boolean;
    sha256: string;
    officialReference: {
      url: string;
      capturedOn: string;
      sha256: string | null;
    } | null;
    anonymizationAudit: FiscalCorpusAnonymizationAudit;
  };
  asset: {
    pdfPath: string;
    extractedTextPath: string | null;
  };
  extractor: {
    contractVersion: string;
    catalogVersion: string;
    extractorVersion: string;
  };
}

export interface FiscalCorpusPlanCase {
  semanticCaseId: string;
  documentType: FiscalDocumentType;
  description: string;
  stateCoverage: CorpusStateCoverage;
  lifecycleLabels: readonly CorpusLifecycleLabel[];
  requiredVisualVariants: readonly CorpusVisualVariant[];
  requiredForbiddenInferences: readonly ForbiddenInferenceCode[];
}

const PDF_VARIANTS = [
  "NATIVE_PDF",
  "SCANNED_PDF",
  "LOW_RESOLUTION_SCAN",
  "ROTATED_SCAN",
] as const satisfies readonly CorpusVisualVariant[];

const SCREEN_VARIANTS = [
  "SCREENSHOT",
  "COMPRESSED_SCREENSHOT",
  "CROPPED_SCREENSHOT",
] as const satisfies readonly CorpusVisualVariant[];

function periodCase(
  semanticCaseId: string,
  documentType: FiscalDocumentType,
  description: string,
  requiredForbiddenInferences: readonly ForbiddenInferenceCode[] = [
    "CURRENT_CENSUS_STATUS",
    "FUTURE_OBLIGATION",
  ],
): FiscalCorpusPlanCase {
  return {
    semanticCaseId,
    documentType,
    description,
    stateCoverage: "PERIOD_ONLY",
    lifecycleLabels: ["NOT_CURRENT_CENSUS_STATUS"],
    requiredVisualVariants: PDF_VARIANTS,
    requiredForbiddenInferences,
  };
}

function currentViewCase(
  semanticCaseId: string,
  documentType: FiscalDocumentType,
  description: string,
  stateCoverage: Extract<
    CorpusStateCoverage,
    "FULL_CURRENT_STATE" | "PARTIAL_CURRENT_STATE"
  > = "FULL_CURRENT_STATE",
): FiscalCorpusPlanCase {
  return {
    semanticCaseId,
    documentType,
    description,
    stateCoverage,
    lifecycleLabels: ["CURRENT_EVIDENCE"],
    requiredVisualVariants: SCREEN_VARIANTS,
    requiredForbiddenInferences:
      stateCoverage === "PARTIAL_CURRENT_STATE"
        ? ["ABSENCE_OUTSIDE_CAPTURE"]
        : [],
  };
}

export const FISCAL_CORPUS_PLAN: readonly FiscalCorpusPlanCase[] = [
  periodCase(
    "m036-initial-natural-person-001",
    "MODEL_036",
    "Alta inicial de persona física con estimación directa simplificada, IVA general, 130 y 303.",
  ),
  {
    ...periodCase(
      "m036-activity-modification-002",
      "MODEL_036",
      "Modificación con nueva actividad, actividad anterior mantenida, nuevo local y fecha de efecto.",
    ),
    stateCoverage: "PARTIAL_CURRENT_STATE",
  },
  periodCase(
    "m036-roi-registration-003",
    "MODEL_036",
    "Alta o solicitud en ROI sin otros cambios censales.",
    ["CURRENT_CENSUS_STATUS", "CURRENT_ROI_STATUS"],
  ),
  periodCase(
    "m036-withholding-registration-004",
    "MODEL_036",
    "Altas en 111 y 115 con fechas de efecto diferentes.",
  ),
  {
    ...periodCase(
      "m036-complex-deregistration-005",
      "MODEL_036",
      "Baja de actividad, local y obligación con otra actividad mantenida.",
    ),
    stateCoverage: "PARTIAL_CURRENT_STATE",
  },
  ...[
    ["m037-historical-initial-001", "Alta inicial simplificada histórica."],
    [
      "m037-historical-modification-002",
      "Modificación histórica de actividad, IVA o retenciones.",
    ],
    ["m037-historical-cessation-003", "Baja censal histórica."],
  ].map(([semanticCaseId, description]): FiscalCorpusPlanCase => ({
    semanticCaseId,
    documentType: "MODEL_037",
    description,
    stateCoverage: "HISTORICAL_ONLY",
    lifecycleLabels: ["HISTORICAL_DOCUMENT", "NOT_CURRENT_CENSUS_STATUS"],
    requiredVisualVariants: PDF_VARIANTS,
    requiredForbiddenInferences: ["CURRENT_CENSUS_STATUS", "FUTURE_OBLIGATION"],
  })),
  periodCase("m130-to-pay-001", "MODEL_130", "Resultado positivo a ingresar."),
  periodCase(
    "m130-zero-negative-002",
    "MODEL_130",
    "Resultado negativo o cero.",
  ),
  periodCase(
    "m130-with-withholdings-003",
    "MODEL_130",
    "Declaración con retenciones soportadas.",
  ),
  periodCase(
    "m130-complementary-004",
    "MODEL_130",
    "Declaración complementaria o con pagos anteriores.",
  ),
  periodCase(
    "m303-quarterly-to-pay-001",
    "MODEL_303",
    "IVA trimestral a ingresar.",
  ),
  periodCase("m303-compensate-002", "MODEL_303", "Resultado a compensar."),
  periodCase(
    "m303-no-activity-zero-003",
    "MODEL_303",
    "Sin actividad o resultado cero.",
  ),
  periodCase(
    "m303-intraeu-reverse-charge-004",
    "MODEL_303",
    "Adquisición intracomunitaria o inversión del sujeto pasivo.",
    [
      "CURRENT_CENSUS_STATUS",
      "CURRENT_ROI_STATUS",
      "CURRENT_VAT_REGIME",
      "FUTURE_OBLIGATION",
    ],
  ),
  periodCase(
    "m303-complementary-monthly-mixed-005",
    "MODEL_303",
    "Complementaria, mensual o con varias clases de operaciones.",
  ),
  periodCase(
    "m390-general-single-001",
    "MODEL_390",
    "Una actividad en régimen general.",
  ),
  periodCase(
    "m390-multiple-activities-002",
    "MODEL_390",
    "Varias actividades.",
  ),
  periodCase(
    "m390-intraeu-exports-003",
    "MODEL_390",
    "Operaciones intracomunitarias o exportaciones.",
  ),
  periodCase(
    "m390-differentiated-prorata-004",
    "MODEL_390",
    "Sectores diferenciados, prorrata o estructura anual compleja.",
  ),
  periodCase(
    "m111-employees-only-001",
    "MODEL_111",
    "Solo rendimientos del trabajo.",
    [
      "CURRENT_CENSUS_STATUS",
      "FUTURE_OBLIGATION",
      "PROFESSIONALS_FROM_MODEL_111",
    ],
  ),
  periodCase(
    "m111-professionals-only-002",
    "MODEL_111",
    "Solo rendimientos de actividades profesionales.",
    ["CURRENT_CENSUS_STATUS", "FUTURE_OBLIGATION", "EMPLOYEES_FROM_MODEL_111"],
  ),
  periodCase(
    "m111-employees-professionals-003",
    "MODEL_111",
    "Trabajo y profesionales.",
  ),
  periodCase(
    "m111-negative-complementary-004",
    "MODEL_111",
    "Negativa, complementaria o con varias categorías.",
    [
      "CURRENT_CENSUS_STATUS",
      "FUTURE_OBLIGATION",
      "EMPLOYEES_FROM_MODEL_111",
      "PROFESSIONALS_FROM_MODEL_111",
    ],
  ),
  periodCase("m115-single-landlord-001", "MODEL_115", "Un arrendador."),
  periodCase(
    "m115-multiple-landlords-002",
    "MODEL_115",
    "Varios perceptores o arrendadores.",
  ),
  periodCase("m115-monthly-003", "MODEL_115", "Declaración mensual."),
  periodCase(
    "m115-complementary-negative-004",
    "MODEL_115",
    "Complementaria, negativa o con corrección de datos.",
  ),
  currentViewCase(
    "aeat-activities-single-active-no-premises-001",
    "AEAT_ECONOMIC_ACTIVITIES_VIEW",
    "Una actividad activa sin local.",
  ),
  currentViewCase(
    "aeat-activities-multiple-active-002",
    "AEAT_ECONOMIC_ACTIVITIES_VIEW",
    "Varias actividades activas.",
  ),
  currentViewCase(
    "aeat-activities-with-premises-003",
    "AEAT_ECONOMIC_ACTIVITIES_VIEW",
    "Actividad con uno o varios locales.",
  ),
  currentViewCase(
    "aeat-activities-inactive-partial-004",
    "AEAT_ECONOMIC_ACTIVITIES_VIEW",
    "Actividad con baja visible en una captura parcial.",
    "PARTIAL_CURRENT_STATE",
  ),
  currentViewCase(
    "aeat-tax-status-direct-general-001",
    "AEAT_TAX_STATUS_VIEW",
    "Estimación directa y régimen general de IVA.",
  ),
  currentViewCase(
    "aeat-tax-status-objective-simplified-002",
    "AEAT_TAX_STATUS_VIEW",
    "Estimación objetiva y régimen simplificado.",
  ),
  currentViewCase(
    "aeat-tax-status-equivalence-exempt-003",
    "AEAT_TAX_STATUS_VIEW",
    "Recargo de equivalencia o actividad exenta.",
  ),
  currentViewCase(
    "aeat-tax-status-special-registers-004",
    "AEAT_TAX_STATUS_VIEW",
    "ROI, REDEME, SII u otro registro especial.",
  ),
  currentViewCase(
    "aeat-obligations-130-303-001",
    "AEAT_OBLIGATIONS_VIEW",
    "Modelos 130 y 303 trimestrales.",
  ),
  currentViewCase(
    "aeat-obligations-303-111-115-002",
    "AEAT_OBLIGATIONS_VIEW",
    "Modelos 303, 111 y 115.",
  ),
  currentViewCase(
    "aeat-obligations-active-inactive-003",
    "AEAT_OBLIGATIONS_VIEW",
    "Obligaciones con fechas de alta y baja.",
  ),
  currentViewCase(
    "aeat-obligations-mixed-periodicity-004",
    "AEAT_OBLIGATIONS_VIEW",
    "Presentación mensual y obligaciones activas e inactivas.",
  ),
] as const;

export interface CorpusManifestIssue {
  code: string;
  message: string;
}

function hasForbiddenInference(
  manifest: FiscalCorpusManifest,
  code: ForbiddenInferenceCode,
): boolean {
  return manifest.mustNotInfer.some((item) => item.code === code);
}

export function validateFiscalCorpusManifest(
  manifest: FiscalCorpusManifest,
): readonly CorpusManifestIssue[] {
  const issues: CorpusManifestIssue[] = [];
  if (manifest.corpusVersion !== FISCAL_CORPUS_CONTRACT_VERSION) {
    issues.push({
      code: "CONTRACT_VERSION",
      message: "Versión de corpus incompatible.",
    });
  }
  if (!/^[a-z0-9][a-z0-9-]{2,127}$/.test(manifest.fixtureId)) {
    issues.push({ code: "FIXTURE_ID", message: "fixtureId no canónico." });
  }
  if (!/^[a-f0-9]{64}$/.test(manifest.source.sha256)) {
    issues.push({ code: "SHA256", message: "La huella SHA-256 no es válida." });
  }
  if (!manifest.formVersion.trim()) {
    issues.push({
      code: "FORM_VERSION",
      message:
        "El manifiesto debe identificar la versión del formulario o vista.",
    });
  }
  if (
    manifest.source.kind === "SYNTHETIC_OFFICIAL_FORM" &&
    (!manifest.source.officialReference ||
      !/^https:\/\//.test(manifest.source.officialReference.url) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(
        manifest.source.officialReference.capturedOn,
      ) ||
      (manifest.source.officialReference.sha256 !== null &&
        !/^[a-f0-9]{64}$/.test(manifest.source.officialReference.sha256)))
  ) {
    issues.push({
      code: "OFFICIAL_REFERENCE",
      message:
        "Un formulario sintético necesita una referencia oficial contrastable y fechada.",
    });
  }
  if (manifest.source.kind === "IRREVERSIBLY_ANONYMIZED_REAL") {
    const audit = manifest.source.anonymizationAudit;
    const completeAudit =
      manifest.source.authorizationRecorded &&
      audit.textLayerChecked &&
      audit.acroFormChecked &&
      audit.metadataChecked &&
      audit.annotationsChecked &&
      audit.hiddenPagesChecked &&
      audit.qrAndBarcodeChecked &&
      audit.embeddedFilesChecked &&
      audit.originalFileNameStored === false;
    if (!completeAudit) {
      issues.push({
        code: "ANONYMIZATION_AUDIT",
        message:
          "Un documento real necesita autorización y auditoría irreversible completa.",
      });
    }
  }
  if (manifest.documentType === "MODEL_037") {
    if (
      !manifest.lifecycleLabels.includes("HISTORICAL_DOCUMENT") ||
      !manifest.lifecycleLabels.includes("NOT_CURRENT_CENSUS_STATUS") ||
      manifest.stateCoverage !== "HISTORICAL_ONLY" ||
      !hasForbiddenInference(manifest, "CURRENT_CENSUS_STATUS")
    ) {
      issues.push({
        code: "MODEL_037_HISTORICAL_ONLY",
        message:
          "El 037 debe quedar aislado como histórico y nunca como situación censal actual.",
      });
    }
  }
  if (
    manifest.documentType === "MODEL_036" &&
    manifest.stateCoverage === "PARTIAL_CURRENT_STATE" &&
    !hasForbiddenInference(manifest, "CURRENT_CENSUS_STATUS")
  ) {
    issues.push({
      code: "MODEL_036_PARTIAL_STATE",
      message:
        "Un 036 de modificación no puede convertirse en fotografía censal completa.",
    });
  }
  if (manifest.stateCoverage === "PARTIAL_CURRENT_STATE") {
    if (
      manifest.expectedEnvelope.isComplete ||
      (!hasForbiddenInference(manifest, "ABSENCE_OUTSIDE_CAPTURE") &&
        manifest.documentType !== "MODEL_036")
    ) {
      issues.push({
        code: "PARTIAL_CAPTURE",
        message:
          "Una captura parcial debe declararse incompleta y prohibir inferencias por ausencia.",
      });
    }
  }
  for (const field of manifest.expectedFields) {
    if (
      !Number.isInteger(field.page) ||
      field.page < 1 ||
      !field.sourceLabel.trim()
    ) {
      issues.push({
        code: "FIELD_PROVENANCE",
        message: `El campo ${field.factType} necesita página y etiqueta esperadas.`,
      });
    }
  }
  return issues;
}

export interface FiscalCorpusEvaluation {
  passed: boolean;
  failures: readonly CorpusManifestIssue[];
  dimensions: {
    classificationCorrect: boolean;
    expectedFieldCount: number;
    matchedFieldCount: number;
    extractionMismatchCount: number;
    normalizationMismatchCount: number;
    expectedMappingCount: number;
    mappingMismatchCount: number;
    falsePositiveCount: number;
    forbiddenInferenceCount: number;
  };
}

function sameJson(left: JsonValue, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function evaluateFiscalCorpusResult(
  manifest: FiscalCorpusManifest,
  result: FiscalDocumentExtractionResult,
): FiscalCorpusEvaluation {
  const failures = [...validateFiscalCorpusManifest(manifest)];
  const classificationCorrect =
    result.envelope.detectedDocumentType === manifest.documentType;
  if (!classificationCorrect) {
    failures.push({
      code: "CLASSIFICATION",
      message: "Tipo documental incorrecto.",
    });
  }
  if (result.envelope.isComplete !== manifest.expectedEnvelope.isComplete) {
    failures.push({
      code: "COMPLETENESS",
      message: "Completitud documental incorrecta.",
    });
  }

  let matchedFieldCount = 0;
  let extractionMismatchCount = 0;
  let normalizationMismatchCount = 0;
  for (const expected of manifest.expectedFields) {
    const actual = result.facts.find(
      (fact) => fact.factType === expected.factType,
    );
    if (!actual) {
      failures.push({
        code: "MISSING_FIELD",
        message: `No se extrajo ${expected.factType}.`,
      });
      continue;
    }
    const extractionMatches = sameJson(actual.value, expected.value);
    const normalizationMatches = sameJson(
      actual.normalizedValue,
      expected.normalizedValue,
    );
    const provenanceMatches =
      actual.sourcePage === expected.page &&
      actual.sourceLabel === expected.sourceLabel;
    if (!extractionMatches) {
      extractionMismatchCount += 1;
      failures.push({
        code: "EXTRACTION",
        message: `Valor extraído incorrecto para ${expected.factType}.`,
      });
    }
    if (!normalizationMatches) {
      normalizationMismatchCount += 1;
      failures.push({
        code: "NORMALIZATION",
        message: `Normalización incorrecta para ${expected.factType}.`,
      });
    }
    if (!provenanceMatches) {
      failures.push({
        code: "PROVENANCE",
        message: `Página o etiqueta incorrecta para ${expected.factType}.`,
      });
    }
    if (extractionMatches && normalizationMatches && provenanceMatches) {
      matchedFieldCount += 1;
    }
  }

  const expectedFactTypes = new Set(
    manifest.expectedFields.map((field) => field.factType),
  );
  const allowedAdditional = new Set(manifest.allowAdditionalFactTypes);
  const falsePositiveFacts = result.facts.filter(
    (fact) =>
      !expectedFactTypes.has(fact.factType) &&
      !allowedAdditional.has(fact.factType),
  );
  for (const fact of falsePositiveFacts) {
    failures.push({
      code: "FALSE_POSITIVE",
      message: `Se extrajo un valor inexistente: ${fact.factType}.`,
    });
  }

  let mappingMismatchCount = 0;
  for (const expected of manifest.expectedQuestionMappings) {
    const actual = result.questionResolutions.find(
      (resolution) => resolution.questionId === expected.questionId,
    );
    if (
      !actual ||
      !sameJson(actual.proposedAnswer, expected.proposedAnswer) ||
      actual.canSkipQuestion !== expected.canSkipQuestion ||
      actual.confirmationRequired !== expected.confirmationRequired
    ) {
      mappingMismatchCount += 1;
      failures.push({
        code: "QUESTION_MAPPING",
        message: `Mapeo incorrecto para ${expected.questionId}.`,
      });
    }
  }

  let forbiddenInferenceCount = 0;
  for (const forbidden of manifest.mustNotInfer) {
    const explicitQuestion = forbidden.questionId
      ? result.questionResolutions.find(
          (resolution) => resolution.questionId === forbidden.questionId,
        )
      : null;
    const inferredByAbsence =
      forbidden.code === "ABSENCE_OUTSIDE_CAPTURE" &&
      result.questionResolutions.some(
        (resolution) =>
          resolution.canSkipQuestion &&
          (resolution.proposedAnswer === "NO" ||
            sameJson(resolution.proposedAnswer, [])),
      );
    const inferredAsCurrent =
      forbidden.code === "CURRENT_CENSUS_STATUS" &&
      result.questionResolutions.some(
        (resolution) =>
          resolution.canSkipQuestion &&
          resolution.temporalScope === "CURRENT_AS_OF_DATE",
      );
    if (explicitQuestion || inferredByAbsence || inferredAsCurrent) {
      forbiddenInferenceCount += 1;
      failures.push({
        code: "FORBIDDEN_INFERENCE",
        message: forbidden.reason,
      });
    }
  }

  const factsById = new Map(result.facts.map((fact) => [fact.factId, fact]));
  for (const resolution of result.questionResolutions) {
    const lowConfidenceEvidence = resolution.evidenceIds.some(
      (evidenceId) =>
        (factsById.get(evidenceId)?.extractionConfidence ?? 1) < 0.7,
    );
    if (resolution.canSkipQuestion && lowConfidenceEvidence) {
      failures.push({
        code: "LOW_CONFIDENCE_SKIP",
        message: `OCR de baja confianza intentó omitir ${resolution.questionId}.`,
      });
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    dimensions: {
      classificationCorrect,
      expectedFieldCount: manifest.expectedFields.length,
      matchedFieldCount,
      extractionMismatchCount,
      normalizationMismatchCount,
      expectedMappingCount: manifest.expectedQuestionMappings.length,
      mappingMismatchCount,
      falsePositiveCount: falsePositiveFacts.length,
      forbiddenInferenceCount,
    },
  };
}

export interface FiscalCorpusMetricSlice {
  sampleCount: number;
  classificationAccuracy: number;
  fieldRecall: number;
  extractionAccuracy: number;
  normalizationAccuracy: number;
  mappingAccuracy: number;
  falsePositiveCount: number;
  forbiddenInferenceCount: number;
}

export interface FiscalCorpusMetrics {
  overall: FiscalCorpusMetricSlice;
  nativePdf: FiscalCorpusMetricSlice;
  ocrVisualVariants: FiscalCorpusMetricSlice;
  nativeMinusOcr: {
    classificationAccuracy: number;
    fieldRecall: number;
    extractionAccuracy: number;
    normalizationAccuracy: number;
    mappingAccuracy: number;
  };
}

function safeRatio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function metricSlice(
  evaluations: readonly FiscalCorpusEvaluation[],
): FiscalCorpusMetricSlice {
  const expectedFields = evaluations.reduce(
    (total, item) => total + item.dimensions.expectedFieldCount,
    0,
  );
  const expectedMappings = evaluations.reduce(
    (total, item) => total + item.dimensions.expectedMappingCount,
    0,
  );
  const extractionMismatches = evaluations.reduce(
    (total, item) => total + item.dimensions.extractionMismatchCount,
    0,
  );
  const normalizationMismatches = evaluations.reduce(
    (total, item) => total + item.dimensions.normalizationMismatchCount,
    0,
  );
  const mappingMismatches = evaluations.reduce(
    (total, item) => total + item.dimensions.mappingMismatchCount,
    0,
  );
  return {
    sampleCount: evaluations.length,
    classificationAccuracy: safeRatio(
      evaluations.filter((item) => item.dimensions.classificationCorrect)
        .length,
      evaluations.length,
    ),
    fieldRecall: safeRatio(
      evaluations.reduce(
        (total, item) => total + item.dimensions.matchedFieldCount,
        0,
      ),
      expectedFields,
    ),
    extractionAccuracy: safeRatio(
      expectedFields - extractionMismatches,
      expectedFields,
    ),
    normalizationAccuracy: safeRatio(
      expectedFields - normalizationMismatches,
      expectedFields,
    ),
    mappingAccuracy: safeRatio(
      expectedMappings - mappingMismatches,
      expectedMappings,
    ),
    falsePositiveCount: evaluations.reduce(
      (total, item) => total + item.dimensions.falsePositiveCount,
      0,
    ),
    forbiddenInferenceCount: evaluations.reduce(
      (total, item) => total + item.dimensions.forbiddenInferenceCount,
      0,
    ),
  };
}

export function summarizeFiscalCorpusMetrics(
  samples: readonly {
    manifest: FiscalCorpusManifest;
    evaluation: FiscalCorpusEvaluation;
  }[],
): FiscalCorpusMetrics {
  const nativePdfEvaluations = samples
    .filter((sample) => sample.manifest.visualVariant === "NATIVE_PDF")
    .map((sample) => sample.evaluation);
  const ocrEvaluations = samples
    .filter((sample) => sample.manifest.visualVariant !== "NATIVE_PDF")
    .map((sample) => sample.evaluation);
  const overall = metricSlice(samples.map((sample) => sample.evaluation));
  const nativePdf = metricSlice(nativePdfEvaluations);
  const ocrVisualVariants = metricSlice(ocrEvaluations);
  return {
    overall,
    nativePdf,
    ocrVisualVariants,
    nativeMinusOcr: {
      classificationAccuracy:
        nativePdf.classificationAccuracy -
        ocrVisualVariants.classificationAccuracy,
      fieldRecall: nativePdf.fieldRecall - ocrVisualVariants.fieldRecall,
      extractionAccuracy:
        nativePdf.extractionAccuracy - ocrVisualVariants.extractionAccuracy,
      normalizationAccuracy:
        nativePdf.normalizationAccuracy -
        ocrVisualVariants.normalizationAccuracy,
      mappingAccuracy:
        nativePdf.mappingAccuracy - ocrVisualVariants.mappingAccuracy,
    },
  };
}
