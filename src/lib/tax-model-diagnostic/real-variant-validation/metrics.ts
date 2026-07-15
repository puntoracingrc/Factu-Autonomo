import type {
  RealVariantMetricsInput,
  RealVariantMetricsGroupReport,
  RealVariantMetricsReport,
} from "./contracts";

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

export function summarizeRealVariantMetricsByGroup(
  samples: readonly RealVariantMetricsInput[],
): readonly RealVariantMetricsGroupReport[] {
  const groups = new Map<string, RealVariantMetricsInput[]>();
  for (const sample of samples) {
    const key = `${sample.family}\u0000${sample.layoutId}\u0000${sample.fiscalYear}`;
    const group = groups.get(key) ?? [];
    group.push(sample);
    groups.set(key, group);
  }
  return Object.freeze(
    [...groups.values()]
      .map((group) => {
        const first = group[0];
        if (!first) throw new Error("EMPTY_METRICS_GROUP");
        return Object.freeze({
          family: first.family,
          layoutId: first.layoutId,
          fiscalYear: first.fiscalYear,
          ...summarizeRealVariantMetrics(group),
        });
      })
      .sort((left, right) =>
        `${left.family}:${left.fiscalYear}:${left.layoutId}`.localeCompare(
          `${right.family}:${right.fiscalYear}:${right.layoutId}`,
        ),
      ),
  );
}

export function summarizeRealVariantMetrics(
  samples: readonly RealVariantMetricsInput[],
): RealVariantMetricsReport {
  const totals = samples.reduce(
    (summary, sample) => ({
      classificationCorrect:
        summary.classificationCorrect +
        Number(sample.expectedClassification === sample.actualClassification),
      criticalFieldTotal:
        summary.criticalFieldTotal + sample.criticalFieldTotal,
      criticalFieldCorrect:
        summary.criticalFieldCorrect + sample.criticalFieldCorrect,
      nonCriticalFieldTotal:
        summary.nonCriticalFieldTotal + sample.nonCriticalFieldTotal,
      nonCriticalFieldCorrect:
        summary.nonCriticalFieldCorrect + sample.nonCriticalFieldCorrect,
      reviewCount: summary.reviewCount + Number(sample.sentToReview),
      forbiddenInferenceCount:
        summary.forbiddenInferenceCount + sample.forbiddenInferenceCount,
      incorrectlySkippedCriticalQuestionCount:
        summary.incorrectlySkippedCriticalQuestionCount +
        sample.incorrectlySkippedCriticalQuestionCount,
      parserFailureCount:
        summary.parserFailureCount + Number(sample.parserFailed),
      ocrFailureCount: summary.ocrFailureCount + Number(sample.ocrFailed),
      processingTimeMs: summary.processingTimeMs + sample.processingTimeMs,
    }),
    {
      classificationCorrect: 0,
      criticalFieldTotal: 0,
      criticalFieldCorrect: 0,
      nonCriticalFieldTotal: 0,
      nonCriticalFieldCorrect: 0,
      reviewCount: 0,
      forbiddenInferenceCount: 0,
      incorrectlySkippedCriticalQuestionCount: 0,
      parserFailureCount: 0,
      ocrFailureCount: 0,
      processingTimeMs: 0,
    },
  );
  const classificationAccuracy = ratio(
    totals.classificationCorrect,
    samples.length,
  );
  const criticalFieldAccuracy = ratio(
    totals.criticalFieldCorrect,
    totals.criticalFieldTotal,
  );
  const report: RealVariantMetricsReport = {
    sampleCount: samples.length,
    classificationAccuracy,
    criticalFieldAccuracy,
    nonCriticalFieldAccuracy: ratio(
      totals.nonCriticalFieldCorrect,
      totals.nonCriticalFieldTotal,
    ),
    reviewRate: ratio(totals.reviewCount, samples.length),
    forbiddenInferenceCount: totals.forbiddenInferenceCount,
    incorrectlySkippedCriticalQuestionCount:
      totals.incorrectlySkippedCriticalQuestionCount,
    parserFailureCount: totals.parserFailureCount,
    ocrFailureCount: totals.ocrFailureCount,
    averageProcessingTimeMs: ratio(totals.processingTimeMs, samples.length),
    releaseGatePassed:
      samples.length > 0 &&
      classificationAccuracy === 1 &&
      criticalFieldAccuracy === 1 &&
      totals.forbiddenInferenceCount === 0 &&
      totals.incorrectlySkippedCriticalQuestionCount === 0,
  };
  return Object.freeze(report);
}
