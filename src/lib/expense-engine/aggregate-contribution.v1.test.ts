import { describe, expect, it } from "vitest";
import {
  EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
  EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
  EXPENSE_ENGINE_PRIVACY_SCOPE,
  EXPENSE_ENGINE_VERSION,
} from "./contracts";
import {
  EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1,
  EXPENSE_AGGREGATE_CONTRIBUTION_MAX_METRICS_V1,
  createExpenseAggregateContributionV1,
  getExpenseAggregateCanonicalCardinalitiesV1,
  getExpenseAggregateCanonicalCoordinatesV1,
  isExpenseAggregateContributionBodySizeAllowedV1,
  normalizeExpenseAggregateContributionV1,
} from "./aggregate-contribution.v1";

function validObservation() {
  return {
    schemaVersion: EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
    engineVersion: EXPENSE_ENGINE_VERSION,
    policyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
    privacyScope: EXPENSE_ENGINE_PRIVACY_SCOPE,
    structuralArchetypeId: "LINE_TABLE",
    documentKind: "EXPENSE_INVOICE",
    sourceQualityBucket: "HIGH",
    routeMode: "SHADOW_AI",
    localOutcome: "CANDIDATE",
    localConfidence: "HIGH",
    abstentionReason: null,
    aiFallbackUsed: false,
    aiFallbackReason: null,
    aiUsageBucket: "ONE",
    localDurationBucket: "LT_1_S",
    humanReviewStatus: "CORRECTED",
    localVsHuman: [{ field: "TOTAL_AMOUNT", verdict: "MATCH" }],
    aiVsHuman: [{ field: "TOTAL_AMOUNT", verdict: "CORRECTED" }],
    localVsAi: [{ field: "TOTAL_AMOUNT", verdict: "CORRECTED" }],
    math: [{ check: "DOCUMENT_TOTAL", verdict: "MATCH", residual: "EXACT" }],
    criticalFlags: [],
    learningHints: null,
  };
}

function validLearningHints() {
  return {
    schemaVersion: "expense-learning-hints.v1",
    layout: {
      pageMode: "SINGLE",
      readingOrder: "ROW_MAJOR",
      regionOrder: ["HEADER", "LINE_ITEMS", "TOTALS"],
      tableCount: "ONE",
    },
    columns: [],
    labels: [],
    formulas: [],
  };
}

function validContribution() {
  const contribution = createExpenseAggregateContributionV1(validObservation());
  if (!contribution) throw new Error("Expected a valid synthetic contribution");
  return contribution;
}

describe("expense aggregate contribution v1", () => {
  it("proyecta una observacion a categorias cerradas y gruesas", () => {
    const contribution = validContribution();

    expect(contribution.structuralArchetypeGroup).toBe("TABLE");
    expect(contribution.learningHints).toBeNull();
    expect(contribution.metrics).toHaveLength(
      EXPENSE_AGGREGATE_CONTRIBUTION_MAX_METRICS_V1,
    );
    const coordinates = getExpenseAggregateCanonicalCoordinatesV1();
    expect(coordinates).toHaveLength(67);
    expect(getExpenseAggregateCanonicalCardinalitiesV1()).toEqual({
      singleton: 9,
      fieldVerdict: 42,
      math: 12,
      criticalFlag: 4,
      total: 67,
    });
    expect(Object.isFrozen(coordinates)).toBe(true);
    expect(coordinates.every((coordinate) => Object.isFrozen(coordinate))).toBe(
      true,
    );
    expect(contribution.metrics).toContainEqual({
      family: "FIELD_VERDICT",
      comparisonScope: "LOCAL_VS_HUMAN",
      key: "TOTAL_AMOUNT",
      value: "MATCH",
    });
    expect(contribution.metrics).toContainEqual({
      family: "MATH_RESIDUAL",
      comparisonScope: "NONE",
      key: "DOCUMENT_TOTAL",
      value: "EXACT",
    });
    expect(Object.isFrozen(contribution)).toBe(true);
    expect(Object.isFrozen(contribution.metrics)).toBe(true);
    expect(
      contribution.metrics.every((metric) => Object.isFrozen(metric)),
    ).toBe(true);
  });

  it("reduce los arquetipos a cuatro grupos de baja cardinalidad", () => {
    const expected = new Map([
      ["LINE_TABLE", "TABLE"],
      ["DIMENSION_TABLE", "TABLE"],
      ["MIXED_TAX_TABLE", "TABLE"],
      ["SUMMARY_ONLY", "SUMMARY"],
      ["RECURRING_RECEIPT", "SUMMARY"],
      ["QUICK_TICKET", "SUMMARY"],
      ["CREDIT_NOTE", "OTHER"],
      ["NON_EXPENSE", "OTHER"],
      ["UNKNOWN", "UNKNOWN"],
    ]);

    for (const [structuralArchetypeId, group] of expected) {
      const contribution = createExpenseAggregateContributionV1({
        ...validObservation(),
        structuralArchetypeId,
      });
      expect(contribution?.structuralArchetypeGroup).toBe(group);
    }
  });

  it("deriva flags criticos desde un shadow corregido sin confiar en flags redundantes", () => {
    const observation = {
      ...validObservation(),
      localVsHuman: [
        { field: "TOTAL_AMOUNT", verdict: "MATCH" },
        { field: "TAX_BASE", verdict: "MISSING" },
      ],
      aiVsHuman: [
        { field: "TOTAL_AMOUNT", verdict: "CORRECTED" },
        { field: "TAX_BASE", verdict: "CORRECTED" },
      ],
      localVsAi: [
        { field: "TOTAL_AMOUNT", verdict: "CORRECTED" },
        { field: "TAX_BASE", verdict: "MISSING" },
      ],
      criticalFlags: [],
    };
    const snapshot = JSON.stringify(observation);
    const contribution = createExpenseAggregateContributionV1(observation);

    expect(contribution).not.toBeNull();
    expect(JSON.stringify(observation)).toBe(snapshot);
    expect(normalizeExpenseAggregateContributionV1(contribution)).toEqual(
      contribution,
    );
    expect(contribution?.metrics).toContainEqual({
      family: "CRITICAL_FLAG",
      comparisonScope: "NONE",
      key: "TAX_TREATMENT_CORRECTED",
      value: "PRESENT",
    });
    expect(validContribution().metrics).toContainEqual({
      family: "CRITICAL_FLAG",
      comparisonScope: "NONE",
      key: "TAX_TREATMENT_CORRECTED",
      value: "NOT_OBSERVED",
    });
  });

  it("mantiene la correccion de signo no agregable sin evidencia dedicada", () => {
    const contribution = createExpenseAggregateContributionV1({
      ...validObservation(),
      localOutcome: "ABSTAINED",
      localConfidence: "LOW",
      abstentionReason: "MATH_UNRECONCILED",
      aiFallbackUsed: true,
      aiFallbackReason: "MATH_UNRECONCILED",
      humanReviewStatus: "CONFIRMED",
      localVsHuman: [{ field: "TOTAL_AMOUNT", verdict: "MISSING" }],
      aiVsHuman: [{ field: "TOTAL_AMOUNT", verdict: "MATCH" }],
      localVsAi: [{ field: "TOTAL_AMOUNT", verdict: "MISSING" }],
      math: [
        {
          check: "SIGN_CONSISTENCY",
          verdict: "MISMATCH",
          residual: "MATERIAL",
        },
      ],
      criticalFlags: [],
    });

    expect(contribution).not.toBeNull();
    expect(contribution?.metrics).toContainEqual({
      family: "CRITICAL_FLAG",
      comparisonScope: "NONE",
      key: "CREDIT_SIGN_CORRECTED",
      value: "NOT_OBSERVED",
    });

    for (const verdict of ["CORRECTED", "EXTRA"] as const) {
      const documentKindOnly = createExpenseAggregateContributionV1({
        ...validObservation(),
        localVsHuman: [{ field: "DOCUMENT_KIND", verdict }],
        aiVsHuman: [{ field: "DOCUMENT_KIND", verdict }],
        localVsAi: [{ field: "DOCUMENT_KIND", verdict: "MATCH" }],
        criticalFlags: [],
      });
      expect(documentKindOnly?.metrics).toContainEqual({
        family: "CRITICAL_FLAG",
        comparisonScope: "NONE",
        key: "CREDIT_SIGN_CORRECTED",
        value: "NOT_OBSERVED",
      });
    }

    expect(
      createExpenseAggregateContributionV1({
        ...validObservation(),
        criticalFlags: ["CREDIT_SIGN_CORRECTED"],
      }),
    ).toBeNull();

    if (!contribution) throw new Error("Expected a canonical contribution");
    expect(
      normalizeExpenseAggregateContributionV1({
        ...contribution,
        metrics: contribution.metrics.map((metric) =>
          metric.family === "CRITICAL_FLAG" &&
          metric.key === "CREDIT_SIGN_CORRECTED"
            ? { ...metric, value: "PRESENT" }
            : metric,
        ),
      }),
    ).toBeNull();
  });

  it("proyecta EXTRA como correccion explicita para cada campo canonico", () => {
    const fields = getExpenseAggregateCanonicalCoordinatesV1()
      .filter(
        (coordinate) =>
          coordinate.family === "FIELD_VERDICT" &&
          coordinate.comparisonScope === "LOCAL_VS_HUMAN",
      )
      .map((coordinate) => coordinate.key);

    expect(fields).toHaveLength(14);
    for (const field of fields) {
      const contribution = createExpenseAggregateContributionV1({
        ...validObservation(),
        localVsHuman: [{ field, verdict: "EXTRA" }],
        aiVsHuman: [{ field, verdict: "EXTRA" }],
        localVsAi: [{ field, verdict: "MATCH" }],
        humanReviewStatus: "CORRECTED",
        criticalFlags: [],
      });

      expect(contribution, field).not.toBeNull();
      expect(contribution?.metrics).toContainEqual({
        family: "FIELD_VERDICT",
        comparisonScope: "AI_VS_HUMAN",
        key: field,
        value: "EXTRA",
      });
    }
  });

  it("rechaza EXTRA cuando contradice pareja, outcome, uso IA o revision", () => {
    const contribution = createExpenseAggregateContributionV1({
      ...validObservation(),
      localVsHuman: [{ field: "TOTAL_AMOUNT", verdict: "EXTRA" }],
      aiVsHuman: [{ field: "TOTAL_AMOUNT", verdict: "EXTRA" }],
      localVsAi: [{ field: "TOTAL_AMOUNT", verdict: "MATCH" }],
      humanReviewStatus: "CORRECTED",
    });
    if (!contribution)
      throw new Error("Expected a canonical EXTRA contribution");
    const impossiblePair = contribution.metrics.map((metric) =>
      metric.family === "FIELD_VERDICT" &&
      metric.comparisonScope === "LOCAL_VS_AI" &&
      metric.key === "TOTAL_AMOUNT"
        ? { ...metric, value: "MISSING" }
        : metric,
    );

    for (const metrics of [
      impossiblePair,
      replaceSingletons(contribution.metrics, [["HUMAN_REVIEW", "CONFIRMED"]]),
      replaceSingletons(contribution.metrics, [["AI_USAGE", "NONE"]]),
      replaceSingletons(contribution.metrics, [
        ["LOCAL_OUTCOME", "ABSTAINED"],
        ["ABSTENTION_REASON", "LOW_CONFIDENCE"],
        ["AI_FALLBACK_REASON", "LOW_CONFIDENCE"],
      ]),
    ]) {
      expect(
        normalizeExpenseAggregateContributionV1({
          ...contribution,
          metrics,
        }),
      ).toBeNull();
    }

    const validAbstainedObservation = {
      ...validObservation(),
      localOutcome: "ABSTAINED",
      localConfidence: "LOW",
      abstentionReason: "LOW_CONFIDENCE",
      aiFallbackUsed: true,
      aiFallbackReason: "LOW_CONFIDENCE",
      humanReviewStatus: "CONFIRMED",
      localVsHuman: [{ field: "EXPENSE_DATE", verdict: "MISSING" }],
      aiVsHuman: [{ field: "EXPENSE_DATE", verdict: "MATCH" }],
      localVsAi: [{ field: "EXPENSE_DATE", verdict: "MISSING" }],
      math: [],
    };
    expect(
      createExpenseAggregateContributionV1(validAbstainedObservation),
    ).not.toBeNull();
    expect(
      createExpenseAggregateContributionV1({
        ...validAbstainedObservation,
        localVsHuman: [
          { field: "TOTAL_AMOUNT", verdict: "EXTRA" },
          ...validAbstainedObservation.localVsHuman,
        ],
        aiVsHuman: [
          { field: "TOTAL_AMOUNT", verdict: "ABSTAINED" },
          ...validAbstainedObservation.aiVsHuman,
        ],
        localVsAi: [
          { field: "TOTAL_AMOUNT", verdict: "EXTRA" },
          ...validAbstainedObservation.localVsAi,
        ],
      }),
    ).toBeNull();
  });

  it("acepta solo versiones allowlisted y learningHints desactivado", () => {
    const contribution = validContribution();

    for (const mutation of [
      { schemaVersion: "expense-engine-aggregate-contribution.v2" },
      { observationSchemaVersion: "custom-observation" },
      { engineVersion: "custom-engine" },
      { privacyPolicyVersion: "custom-policy" },
      { structuralArchetypeGroup: "supplier-template-42" },
      { learningHints: {} },
      { learningHints: { formulas: ["BASE_X_TAX_RATE"] } },
    ]) {
      expect(
        normalizeExpenseAggregateContributionV1({
          ...contribution,
          ...mutation,
        }),
      ).toBeNull();
    }
    expect(
      createExpenseAggregateContributionV1({
        ...validObservation(),
        learningHints: validLearningHints(),
      }),
    ).toBeNull();
  });

  it("rechaza metricas libres, incoherentes o duplicadas", () => {
    const contribution = validContribution();
    const first = contribution.metrics[0]!;

    for (const metric of [
      { ...first, family: "FREE_TEXT" },
      { ...first, comparisonScope: "LOCAL_VS_HUMAN" },
      { ...first, key: "supplierName" },
      { ...first, value: "Proveedor privado" },
      { ...first, exactAmount: 121.25 },
    ]) {
      expect(
        normalizeExpenseAggregateContributionV1({
          ...contribution,
          metrics: [metric, ...contribution.metrics.slice(1)],
        }),
      ).toBeNull();
    }

    expect(
      normalizeExpenseAggregateContributionV1({
        ...contribution,
        metrics: [...contribution.metrics, first],
      }),
    ).toBeNull();

    expect(
      normalizeExpenseAggregateContributionV1({
        ...contribution,
        metrics: contribution.metrics.map((metric) =>
          metric.family === "ABSTENTION_REASON"
            ? { ...metric, value: "LOW_CONFIDENCE" }
            : metric,
        ),
      }),
    ).toBeNull();
    expect(
      normalizeExpenseAggregateContributionV1({
        ...contribution,
        metrics: contribution.metrics.filter(
          (metric) => metric.family !== "MATH_RESIDUAL",
        ),
      }),
    ).toBeNull();
  });

  it("exige todas las coordenadas canonicas y rechaza coordenadas fabricadas", () => {
    const contribution = validContribution();
    const missing = contribution.metrics.slice(1);
    const fabricated = {
      family: "FIELD_VERDICT",
      comparisonScope: "NONE",
      key: "TOTAL_AMOUNT",
      value: "MATCH",
    };

    expect(
      normalizeExpenseAggregateContributionV1({
        ...contribution,
        metrics: missing,
      }),
    ).toBeNull();
    expect(
      normalizeExpenseAggregateContributionV1({
        ...contribution,
        metrics: [...contribution.metrics.slice(1), fabricated],
      }),
    ).toBeNull();
    expect(
      normalizeExpenseAggregateContributionV1({
        ...contribution,
        metrics: [
          contribution.metrics[0],
          ...contribution.metrics.slice(0, -1),
        ],
      }),
    ).toBeNull();
  });

  it("ordena de forma determinista una matriz canonica barajada", () => {
    const contribution = validContribution();
    const shuffled = [...contribution.metrics].reverse();
    const normalized = normalizeExpenseAggregateContributionV1({
      ...contribution,
      metrics: shuffled,
    });

    expect(normalized).toEqual(contribution);
    expect(normalized?.metrics).not.toBe(shuffled);
    expect(normalized?.metrics.map((metric) => metric.family)).toEqual(
      contribution.metrics.map((metric) => metric.family),
    );
  });

  it("falla cerrado ante incoherencias cruzadas de ruta, calidad y revision", () => {
    const contribution = validContribution();

    for (const replacements of [
      [["ROUTE_MODE", "LOCAL_ONLY"]],
      [["AI_USAGE", "NONE"]],
      [["AI_FALLBACK_REASON", "LOW_CONFIDENCE"]],
      [["SOURCE_QUALITY", "UNREADABLE"]],
      [["LOCAL_CONFIDENCE", "LOW"]],
      [["HUMAN_REVIEW", "CONFIRMED"]],
      [["HUMAN_REVIEW", "NOT_REVIEWED"]],
    ] as const) {
      expect(
        normalizeExpenseAggregateContributionV1({
          ...contribution,
          metrics: replaceSingletons(contribution.metrics, replacements),
        }),
      ).toBeNull();
    }
  });

  it("falla cerrado ante parejas de campos, matematica y flags incompatibles", () => {
    const contribution = validContribution();
    const impossibleFieldPair = contribution.metrics.map((metric) =>
      metric.family === "FIELD_VERDICT" &&
      metric.comparisonScope === "LOCAL_VS_AI" &&
      metric.key === "TOTAL_AMOUNT"
        ? { ...metric, value: "MATCH" }
        : metric,
    );
    const candidateWithMismatch = contribution.metrics.map((metric) => {
      if (metric.key !== "DOCUMENT_TOTAL") return metric;
      if (metric.family === "MATH_VERDICT") {
        return { ...metric, value: "MISMATCH" };
      }
      if (metric.family === "MATH_RESIDUAL") {
        return { ...metric, value: "MATERIAL" };
      }
      return metric;
    });
    const inventedCriticalFlag = contribution.metrics.map((metric) =>
      metric.family === "CRITICAL_FLAG" &&
      metric.key === "TAX_TREATMENT_CORRECTED"
        ? { ...metric, value: "PRESENT" }
        : metric,
    );

    for (const metrics of [
      impossibleFieldPair,
      candidateWithMismatch,
      inventedCriticalFlag,
    ]) {
      expect(
        normalizeExpenseAggregateContributionV1({
          ...contribution,
          metrics,
        }),
      ).toBeNull();
    }
  });

  it("no comparte referencias mutables entre contribuciones", () => {
    const first = validContribution();
    const second = validContribution();
    const mutableInput = JSON.parse(JSON.stringify(first));
    const normalized = normalizeExpenseAggregateContributionV1(mutableInput);

    mutableInput.metrics[0].value = "LOW";
    expect(normalized).toEqual(first);
    expect(second).toEqual(first);
    expect(() => {
      (first.metrics[0] as { value: string }).value = "LOW";
    }).toThrow();
    expect(second.metrics[0]?.value).toBe("HIGH");
  });

  it("rechaza arrays y bodies por encima de sus limites", () => {
    const contribution = validContribution();
    const oversized = Array.from(
      { length: EXPENSE_AGGREGATE_CONTRIBUTION_MAX_METRICS_V1 + 1 },
      () => contribution.metrics[0],
    );

    expect(
      normalizeExpenseAggregateContributionV1({
        ...contribution,
        metrics: oversized,
      }),
    ).toBeNull();
    expect(
      isExpenseAggregateContributionBodySizeAllowedV1(
        EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1,
      ),
    ).toBe(true);
    expect(
      isExpenseAggregateContributionBodySizeAllowedV1(
        EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1 + 1,
      ),
    ).toBe(false);
  });

  it("rechaza getters, arrays dispersos y propiedades de array ajenas", () => {
    const contribution = validContribution();
    const getterMetric = { ...contribution.metrics[0] };
    Object.defineProperty(getterMetric, "value", {
      enumerable: true,
      get: () => "HIGH",
    });
    const sparse = new Array(10);
    sparse[0] = contribution.metrics[0];
    const decorated = [
      ...contribution.metrics,
    ] as typeof contribution.metrics & {
      rawText?: string;
    };
    decorated.rawText = "contenido privado";

    for (const metrics of [
      [getterMetric, ...contribution.metrics.slice(1)],
      sparse,
      decorated,
    ]) {
      expect(
        normalizeExpenseAggregateContributionV1({
          ...contribution,
          metrics,
        }),
      ).toBeNull();
    }
  });
});

function replaceSingletons(
  metrics: readonly object[],
  replacements: readonly (readonly [string, string])[],
) {
  const values = new Map(replacements);
  return metrics.map((metric) => {
    const value = values.get(Reflect.get(metric, "family"));
    return value === undefined ? metric : { ...metric, value };
  });
}
