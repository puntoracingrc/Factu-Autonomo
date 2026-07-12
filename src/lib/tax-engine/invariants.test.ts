import { describe, expect, it, vi } from "vitest";
import { evaluateExpense } from "./engine";
import { TaxEngineConfigurationError } from "./errors";
import { DisabledFallbackEvaluator } from "./fallback";
import { createRuleRegistry } from "./rule-registry";
import { OFFICIAL_SOURCES } from "./sources";
import type {
  EvaluationDecision,
  EvaluationMetadata,
  ExpenseAnswers,
  ExpenseInput,
  RuleDefinition,
  TaxContext,
} from "./types";

const METADATA: EvaluationMetadata = {
  evaluationId: "evaluation-invariant-test",
  evaluatedAt: "2026-07-10T10:00:00.000Z",
};

const BASE_INPUT: ExpenseInput = {
  concept: "comida",
  expenseDate: "2026-07-10",
  netAmountCents: 2_000,
  vatAmountCents: 200,
  totalAmountCents: 2_200,
  currency: "EUR",
  paymentMethod: "CARD",
  invoiceType: "FULL_INVOICE",
};

const BASE_CONTEXT: TaxContext = {
  jurisdiction: "ES_COMMON",
  taxpayerType: "SELF_EMPLOYED_IRPF",
  directTaxRegime: "DIRECT_ESTIMATION_SIMPLIFIED",
  vatRegime: "GENERAL",
  hasFullVatDeductionRight: true,
  activityDescription: "Consultoría",
  fiscalYear: 2026,
};

const SELF_MAINTENANCE_ANSWERS: ExpenseAnswers = {
  "meal.purpose": "SELF_MAINTENANCE",
  "meal.businessRelated": true,
  "meal.hospitalityEstablishment": true,
  "meal.location": "SPAIN",
  "meal.overnightDifferentMunicipality": false,
  "meal.sameDayAlreadyDeductedCents": 0,
  "meal.activityEvidence": "Agenda de visita y proyecto cliente-42",
};

const EMPTY_DECISION: EvaluationDecision = {
  status: "RESOLVED",
  risk: "GREEN",
  directTax: null,
  indirectTax: null,
  requiredQuestions: [],
  missingInformation: [],
  evidenceRequired: [],
  practicalAdvice: [],
  warnings: [],
  calculationTrace: [],
  requiresHumanReview: false,
};

function customRule(
  overrides: Partial<RuleDefinition> = {},
): RuleDefinition {
  return {
    id: "test.custom-rule",
    version: "1.0.0",
    effectiveFrom: "2020-01-01",
    supportedJurisdictions: ["ES_COMMON"],
    supportedTaxpayerTypes: ["SELF_EMPLOYED_IRPF"],
    category: "MEALS_AND_HOSPITALITY",
    canonicalConcept: "concepto de prueba",
    aliases: [],
    conditionalQuestions: [],
    evaluator: () => EMPTY_DECISION,
    officialSources: [OFFICIAL_SOURCES.IRPF_MAINTENANCE],
    legalReviewStatus: "APPROVED",
    ...overrides,
  };
}

describe("alcance y ausencia de conclusiones inventadas", () => {
  it.each([
    "ES_CANARY_IGIC",
    "ES_NAVARRA",
    "ES_BASQUE_COUNTRY",
    "ES_CEUTA_MELILLA",
  ] as const)("devuelve UNSUPPORTED para el territorio %s", (jurisdiction) => {
    const result = evaluateExpense(
      BASE_INPUT,
      { ...BASE_CONTEXT, jurisdiction },
      {},
      METADATA,
    );

    expect(result).toMatchObject({
      status: "UNSUPPORTED",
      risk: "UNDETERMINED",
      matchedRuleId: null,
      matchedBy: "NONE",
      directTax: null,
      indirectTax: null,
      officialSources: [],
      requiresHumanReview: true,
    });
  });

  it("no aplica una regla de IRPF de autónomo a una sociedad", () => {
    const result = evaluateExpense(
      BASE_INPUT,
      { ...BASE_CONTEXT, taxpayerType: "COMPANY_IS" },
      {},
      METADATA,
    );

    expect(result).toMatchObject({
      status: "UNSUPPORTED",
      matchedRuleId: null,
      directTax: null,
      indirectTax: null,
    });
    expect(result.missingInformation.join(" ")).toMatch(/sociedades/i);
  });

  it("rechaza una sociedad sin pedirle un régimen de IRPF irrelevante", () => {
    const result = evaluateExpense(
      BASE_INPUT,
      {
        ...BASE_CONTEXT,
        taxpayerType: "COMPANY_IS",
        directTaxRegime: "UNKNOWN",
        vatRegime: "UNKNOWN",
        activityDescription: "",
      },
      {},
      METADATA,
    );

    expect(result.status).toBe("UNSUPPORTED");
    expect(result.missingInformation.join(" ")).toMatch(/sociedades/i);
    expect(result.missingInformation.join(" ")).not.toMatch(/régimen del impuesto/i);
  });

  it("devuelve UNSUPPORTED para una moneda distinta de EUR", () => {
    const result = evaluateExpense(
      { ...BASE_INPUT, currency: "USD" },
      BASE_CONTEXT,
      {},
      METADATA,
    );

    expect(result.status).toBe("UNSUPPORTED");
    expect(result.directTax).toBeNull();
    expect(result.indirectTax).toBeNull();
  });

  it("devuelve NEEDS_INPUT, sin conclusión negativa, cuando falta contexto fiscal", () => {
    const result = evaluateExpense(
      BASE_INPUT,
      {
        ...BASE_CONTEXT,
        jurisdiction: "UNKNOWN",
        taxpayerType: "UNKNOWN",
        directTaxRegime: "UNKNOWN",
        vatRegime: "UNKNOWN",
        activityDescription: "",
      },
      {},
      METADATA,
    );

    expect(result).toMatchObject({
      status: "NEEDS_INPUT",
      risk: "UNDETERMINED",
      matchedRuleId: null,
      directTax: null,
      indirectTax: null,
      officialSources: [],
      requiresHumanReview: true,
    });
    expect(result.missingInformation).toHaveLength(4);
    expect(result.missingInformation.join(" ")).not.toMatch(
      /régimen del impuesto directo/i,
    );
    expect(result.warnings.join(" ")).toMatch(/no se ha convertido/i);
  });

  it("devuelve NO_MATCH sin fabricar resultados fiscales", () => {
    const result = evaluateExpense(
      { ...BASE_INPUT, concept: "suscripción de alojamiento web" },
      BASE_CONTEXT,
      {},
      METADATA,
    );

    expect(result).toMatchObject({
      status: "NO_MATCH",
      risk: "UNDETERMINED",
      matchedRuleId: null,
      matchedRuleVersion: null,
      matchedBy: "NONE",
      matchScore: 0,
      directTax: null,
      indirectTax: null,
      officialSources: [],
    });
    expect(result.calculationTrace).toEqual([]);
  });

  it("permite una orientación inicial sin convertir importes ausentes en cero", () => {
    const result = evaluateExpense(
      {
        ...BASE_INPUT,
        amountsKnown: false,
        netAmountCents: 0,
        vatAmountCents: 0,
        totalAmountCents: 0,
      },
      BASE_CONTEXT,
      SELF_MAINTENANCE_ANSWERS,
      METADATA,
    );

    expect(result.status).toBe("NEEDS_REVIEW");
    expect(result.matchedRuleId).not.toBeNull();
    expect(result.directTax).toMatchObject({
      eligibility: "POTENTIALLY_DEDUCTIBLE",
      amountStatus: "NOT_CALCULATED",
      deductibleAmountCents: 0,
    });
    expect(result.missingInformation.join(" ")).not.toMatch(/base, IVA y total/i);
    expect(result.practicalAdvice.join(" ")).toMatch(/solo si quieres/i);
    expect(result.warnings.join(" ")).toMatch(/no se han convertido en ceros/i);
  });

  it("resuelve un gasto personal sin exigir importes innecesarios", () => {
    const result = evaluateExpense(
      {
        ...BASE_INPUT,
        amountsKnown: false,
        netAmountCents: 0,
        vatAmountCents: 0,
        totalAmountCents: 0,
      },
      BASE_CONTEXT,
      { "meal.purpose": "PERSONAL" },
      METADATA,
    );

    expect(result.status).toBe("NEEDS_REVIEW");
    expect(result.directTax?.eligibility).toBe("NONE");
    expect(result.indirectTax?.eligibility).toBe("NONE");
  });

  it("el fallback deshabilitado tampoco inventa una conclusión ni llama fuera", async () => {
    const localResult = evaluateExpense(
      { ...BASE_INPUT, concept: "suscripción de alojamiento web" },
      BASE_CONTEXT,
      {},
      METADATA,
    );
    const result = await new DisabledFallbackEvaluator().evaluate({
      localResult,
      verifiedSources: [OFFICIAL_SOURCES.IRPF_MAINTENANCE],
    });

    expect(result).toMatchObject({
      status: "NO_MATCH",
      matchedRuleId: null,
      directTax: null,
      indirectTax: null,
      matchReason: localResult.matchReason,
    });
  });

  it("rechaza una regla inyectada que intente saltarse la verificación de fuentes", () => {
    expect(() =>
      evaluateExpense(
        { ...BASE_INPUT, concept: "concepto de prueba" },
        BASE_CONTEXT,
        {},
        METADATA,
        [
          customRule({
            officialSources: [OFFICIAL_SOURCES.DGT_VEHICLE_RUNNING_COSTS],
          }),
        ],
      ),
    ).toThrow(/regla ejecutable.*fuente sin verificar/i);
  });
});

describe("vigencia, retirada y ambigüedad de reglas", () => {
  it.each([
    {
      label: "aún no vigente",
      overrides: { effectiveFrom: "2027-01-01" },
    },
    {
      label: "fuera de vigencia",
      overrides: { effectiveTo: "2025-12-31" },
    },
    {
      label: "retirada",
      overrides: { legalReviewStatus: "RETIRED" as const },
    },
    {
      label: "borrador",
      overrides: { legalReviewStatus: "DRAFT" as const },
    },
  ])("no ejecuta una regla $label", ({ overrides }) => {
    const evaluator = vi.fn(() => EMPTY_DECISION);
    const rule = customRule({ ...overrides, evaluator });
    const result = evaluateExpense(
      { ...BASE_INPUT, concept: "concepto de prueba" },
      BASE_CONTEXT,
      {},
      METADATA,
      [rule],
    );

    expect(result.status).toBe("NO_MATCH");
    expect(evaluator).not.toHaveBeenCalled();
  });

  it("pide categoría manual ante dos coincidencias con igual puntuación", () => {
    const mealEvaluator = vi.fn(() => EMPTY_DECISION);
    const vehicleEvaluator = vi.fn(() => EMPTY_DECISION);
    const rules = [
      customRule({
        id: "test.ambiguous-meal",
        category: "MEALS_AND_HOSPITALITY",
        canonicalConcept: "concepto ambiguo",
        evaluator: mealEvaluator,
      }),
      customRule({
        id: "test.ambiguous-vehicle",
        category: "VEHICLE_RUNNING_COSTS",
        canonicalConcept: "concepto ambiguo",
        evaluator: vehicleEvaluator,
      }),
    ];

    const result = evaluateExpense(
      { ...BASE_INPUT, concept: "concepto ambiguo" },
      BASE_CONTEXT,
      {},
      METADATA,
      rules,
    );

    expect(result).toMatchObject({
      status: "NEEDS_INPUT",
      risk: "UNDETERMINED",
      matchedRuleId: null,
      directTax: null,
      indirectTax: null,
      requiredQuestions: [
        {
          id: "expense.manualCategory",
          options: expect.arrayContaining([
            expect.objectContaining({ value: "MEALS_AND_HOSPITALITY" }),
            expect.objectContaining({ value: "VEHICLE_RUNNING_COSTS" }),
          ]),
        },
      ],
    });
    expect(mealEvaluator).not.toHaveBeenCalled();
    expect(vehicleEvaluator).not.toHaveBeenCalled();
  });

  it("rechaza IDs y versiones duplicadas en el registro", () => {
    expect(() =>
      createRuleRegistry([customRule(), customRule()]),
    ).toThrow(TaxEngineConfigurationError);
  });

  it("rechaza versiones activas de una misma regla con vigencias solapadas", () => {
    expect(() =>
      createRuleRegistry([
        customRule({ version: "1.0.0", effectiveTo: "2026-12-31" }),
        customRule({ version: "2.0.0", effectiveFrom: "2026-01-01" }),
      ]),
    ).toThrow(/versiones solapadas/i);
  });

  it("admite versiones activas consecutivas sin solapamiento", () => {
    const registry = createRuleRegistry([
      customRule({ version: "2.0.0", effectiveFrom: "2026-01-01" }),
      customRule({
        version: "1.0.0",
        effectiveFrom: "2020-01-01",
        effectiveTo: "2025-12-31",
      }),
    ]);

    expect(registry.map((rule) => rule.version)).toEqual(["1.0.0", "2.0.0"]);
  });
});

describe("determinismo e invariantes monetarios", () => {
  it("produce exactamente el mismo resultado y no muta las entradas", () => {
    const input: ExpenseInput = Object.freeze({
      ...BASE_INPUT,
      answers: Object.freeze({ "meal.purpose": "PERSONAL" }),
    });
    const context: TaxContext = Object.freeze({ ...BASE_CONTEXT });
    const previousAnswers: ExpenseAnswers = Object.freeze({});
    const before = JSON.stringify({ input, context, previousAnswers });

    const first = evaluateExpense(
      input,
      context,
      previousAnswers,
      METADATA,
    );
    const second = evaluateExpense(
      input,
      context,
      previousAnswers,
      METADATA,
    );

    expect(second).toStrictEqual(first);
    expect(JSON.stringify({ input, context, previousAnswers })).toBe(before);
  });

  const invariantCases: readonly {
    label: string;
    input: ExpenseInput;
    answers: ExpenseAnswers;
  }[] = [
    {
      label: "manutención dentro del límite",
      input: BASE_INPUT,
      answers: SELF_MAINTENANCE_ANSWERS,
    },
    {
      label: "manutención por encima del límite",
      input: {
        ...BASE_INPUT,
        netAmountCents: 10_000,
        vatAmountCents: 1_000,
        totalAmountCents: 11_000,
      },
      answers: SELF_MAINTENANCE_ANSWERS,
    },
    {
      label: "manutención en efectivo",
      input: { ...BASE_INPUT, paymentMethod: "CASH" },
      answers: SELF_MAINTENANCE_ANSWERS,
    },
    {
      label: "gasto personal",
      input: BASE_INPUT,
      answers: { "meal.purpose": "PERSONAL" },
    },
    {
      label: "atención con saldo parcial",
      input: BASE_INPUT,
      answers: {
        "meal.purpose": "CLIENT_OR_SUPPLIER",
        "client.identified": true,
        "client.commercialRelationship": true,
        "client.relationshipEvidence": "Contrato y presupuesto",
        "client.netTurnoverCents": 100_000,
        "client.alreadyDeductedCents": 500,
      },
    },
  ];

  it.each(invariantCases)(
    "mantiene porcentajes e importes acotados en $label",
    ({ input, answers }) => {
      const result = evaluateExpense(
        input,
        BASE_CONTEXT,
        answers,
        METADATA,
      );

      expect(result.matchScore).toBeGreaterThanOrEqual(0);
      expect(result.matchScore).toBeLessThanOrEqual(100);
      for (const outcome of [result.directTax, result.indirectTax]) {
        if (!outcome) continue;
        expect(Number.isInteger(outcome.theoreticalPercentage)).toBe(true);
        expect(outcome.theoreticalPercentage).toBeGreaterThanOrEqual(0);
        expect(outcome.theoreticalPercentage).toBeLessThanOrEqual(100);
        expect(Number.isSafeInteger(outcome.deductibleAmountCents)).toBe(true);
        expect(outcome.deductibleAmountCents).toBeGreaterThanOrEqual(0);
      }
      expect(result.directTax?.deductibleAmountCents ?? 0).toBeLessThanOrEqual(
        input.totalAmountCents,
      );
      expect(
        result.indirectTax?.deductibleAmountCents ?? 0,
      ).toBeLessThanOrEqual(input.vatAmountCents);
    },
  );

  it.each([0, 1, 2_666, 2_667, 2_668, 10_000, 100_000_000_000])(
    "mantiene la aritmética entera y el límite con una base de %i céntimos",
    (netAmountCents) => {
      const input: ExpenseInput = {
        ...BASE_INPUT,
        netAmountCents,
        vatAmountCents: 0,
        totalAmountCents: netAmountCents,
      };
      const result = evaluateExpense(
        input,
        BASE_CONTEXT,
        SELF_MAINTENANCE_ANSWERS,
        METADATA,
      );

      expect(Number.isSafeInteger(result.directTax?.deductibleAmountCents)).toBe(
        true,
      );
      expect(result.directTax?.deductibleAmountCents).toBe(
        Math.min(netAmountCents, 2_667),
      );
      expect(result.directTax?.deductibleAmountCents ?? 0).toBeLessThanOrEqual(
        netAmountCents,
      );
      expect(result.indirectTax?.deductibleAmountCents).toBe(0);
    },
  );
});
