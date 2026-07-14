import type { FiscalDocumentType } from "./contracts";

export interface SyntheticExtractionExpectation {
  expectedDocumentType: FiscalDocumentType | null;
  expectedFactTypes: readonly string[];
  actualDocumentType: FiscalDocumentType | null;
  actualFactTypes: readonly string[];
  userCorrectedFactTypes?: readonly string[];
  correctlySkippedQuestionCount?: number;
  proposedQuestionCount?: number;
}

export interface ExtractionQualityMetrics {
  sampleCount: number;
  classificationAccuracy: number;
  fieldPrecision: number;
  falsePositiveCount: number;
  falseNegativeCount: number;
  correctlySkippedQuestionRate: number;
  userCorrectionRate: number;
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Métricas sin contenido fiscal: solo tipos cerrados y contadores agregados.
 */
export function summarizeExtractionQuality(
  samples: readonly SyntheticExtractionExpectation[],
): ExtractionQualityMetrics {
  let classifications = 0;
  let truePositiveFields = 0;
  let falsePositiveCount = 0;
  let falseNegativeCount = 0;
  let correctedFields = 0;
  let proposedFields = 0;
  let correctlySkippedQuestions = 0;
  let proposedQuestions = 0;

  for (const sample of samples) {
    if (sample.expectedDocumentType === sample.actualDocumentType) {
      classifications += 1;
    }
    const expected = new Set(sample.expectedFactTypes);
    const actual = new Set(sample.actualFactTypes);
    for (const factType of actual) {
      if (expected.has(factType)) truePositiveFields += 1;
      else falsePositiveCount += 1;
    }
    for (const factType of expected) {
      if (!actual.has(factType)) falseNegativeCount += 1;
    }
    correctedFields += sample.userCorrectedFactTypes?.length ?? 0;
    proposedFields += actual.size;
    correctlySkippedQuestions += sample.correctlySkippedQuestionCount ?? 0;
    proposedQuestions += sample.proposedQuestionCount ?? 0;
  }

  return {
    sampleCount: samples.length,
    classificationAccuracy: ratio(classifications, samples.length),
    fieldPrecision: ratio(
      truePositiveFields,
      truePositiveFields + falsePositiveCount,
    ),
    falsePositiveCount,
    falseNegativeCount,
    correctlySkippedQuestionRate: ratio(
      correctlySkippedQuestions,
      proposedQuestions,
    ),
    userCorrectionRate: ratio(correctedFields, proposedFields),
  };
}
