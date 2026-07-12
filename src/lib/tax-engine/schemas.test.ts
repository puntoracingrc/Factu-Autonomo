import { describe, expect, it } from "vitest";
import { evaluateExpense } from "./engine";
import {
  TaxEngineConfigurationError,
  TaxEngineValidationError,
  type TaxEngineValidationIssue,
} from "./errors";
import { assertEvaluationResult, parseEvaluationRequest } from "./schemas";
import type { ExpenseInput, TaxContext } from "./types";

const BASE_INPUT: ExpenseInput = {
  concept: "comida",
  supplierName: "Restaurante Ejemplo",
  expenseDate: "2026-07-10",
  netAmountCents: 10_000,
  vatAmountCents: 2_100,
  totalAmountCents: 12_100,
  currency: "EUR",
  paymentMethod: "CARD",
  invoiceType: "FULL_INVOICE",
};

const BASE_CONTEXT: TaxContext = {
  jurisdiction: "ES_COMMON",
  taxpayerType: "SELF_EMPLOYED_IRPF",
  directTaxRegime: "DIRECT_ESTIMATION_NORMAL",
  vatRegime: "GENERAL",
  hasFullVatDeductionRight: true,
  activityDescription: "Consultoría",
  fiscalYear: 2026,
};

function request(options: {
  input?: Record<string, unknown>;
  context?: Record<string, unknown>;
  previousAnswers?: unknown;
} = {}) {
  return {
    input: { ...BASE_INPUT, ...options.input },
    context: { ...BASE_CONTEXT, ...options.context },
    previousAnswers: options.previousAnswers ?? {},
  };
}

function validationIssues(value: unknown): readonly TaxEngineValidationIssue[] {
  let caught: unknown;
  try {
    parseEvaluationRequest(value);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(TaxEngineValidationError);
  return (caught as TaxEngineValidationError).issues;
}

function expectIssue(value: unknown, field: string): void {
  expect(validationIssues(value).map((issue) => issue.field)).toContain(field);
}

describe("parseEvaluationRequest", () => {
  it("valida, recorta y normaliza una petición completa", () => {
    const result = parseEvaluationRequest(
      request({
        input: {
          concept: "  comida cliente  ",
          supplierName: "  Restaurante Centro  ",
          currency: "eur",
          extractedText: "  texto local  ",
          answers: {
            "meal.purpose": "  CLIENT_OR_SUPPLIER  ",
            "client.identified": true,
          },
          annualContext: {
            netTurnoverCents: 1_000_000,
            clientAttentionDeductedCents: 2_000,
            maintenanceDeductedSameDayCents: 300,
          },
          manualCategory: "MEALS_AND_HOSPITALITY",
        },
        context: {
          activityDescription: "  Consultoría fiscal  ",
          activityCode: "  763  ",
        },
        previousAnswers: {
          "client.relationshipEvidence": "  contrato C-42  ",
          "client.tags": ["  reunión  ", "", "proyecto"],
        },
      }),
    );

    expect(result).toMatchObject({
      input: {
        concept: "comida cliente",
        supplierName: "Restaurante Centro",
        currency: "EUR",
        extractedText: "texto local",
        answers: {
          "meal.purpose": "CLIENT_OR_SUPPLIER",
          "client.identified": true,
        },
        annualContext: {
          netTurnoverCents: 1_000_000,
          clientAttentionDeductedCents: 2_000,
          maintenanceDeductedSameDayCents: 300,
        },
        manualCategory: "MEALS_AND_HOSPITALITY",
      },
      context: {
        activityDescription: "Consultoría fiscal",
        activityCode: "763",
      },
      previousAnswers: {
        "client.relationshipEvidence": "contrato C-42",
        "client.tags": ["reunión", "proyecto"],
      },
    });
  });

  it.each([
    ["input.netAmountCents", { netAmountCents: -1 }],
    ["input.vatAmountCents", { vatAmountCents: -1 }],
    ["input.totalAmountCents", { totalAmountCents: -1 }],
    ["input.netAmountCents", { netAmountCents: 10.5 }],
    ["input.vatAmountCents", { vatAmountCents: Number.NaN }],
    ["input.totalAmountCents", { totalAmountCents: Number.POSITIVE_INFINITY }],
    ["input.netAmountCents", { netAmountCents: 100_000_000_001 }],
  ])("rechaza el importe inválido en %s", (field, input) => {
    expectIssue(request({ input }), field);
  });

  it("rechaza un IVA superior al total", () => {
    const issues = validationIssues(
      request({ input: { vatAmountCents: 12_101 } }),
    );

    expect(issues).toContainEqual({
      field: "input.vatAmountCents",
      message: "El IVA no puede superar el total.",
    });
  });

  it("rechaza una base superior al total en vez de provocar un error interno", () => {
    const issues = validationIssues(
      request({
        input: {
          netAmountCents: 20_000,
          vatAmountCents: 0,
          totalAmountCents: 10_000,
        },
      }),
    );

    expect(issues).toContainEqual({
      field: "input.netAmountCents",
      message:
        "La base no puede superar el total en esta versión, que todavía no modela retenciones superiores al IVA.",
    });
  });

  it("rechaza un desglose que no coincide con el total", () => {
    const issues = validationIssues(
      request({
        input: {
          netAmountCents: 10_000,
          vatAmountCents: 2_100,
          totalAmountCents: 15_000,
        },
      }),
    );

    expect(issues).toContainEqual({
      field: "input.totalAmountCents",
      message:
        "La base y el IVA deben coincidir con el total (se admite un céntimo de ajuste por redondeo). Esta versión no modela retenciones en gastos.",
    });
  });

  it("admite un céntimo de ajuste por redondeo", () => {
    const parsed = parseEvaluationRequest(
      request({ input: { totalAmountCents: 12_101 } }),
    );

    expect(parsed.input.totalAmountCents).toBe(12_101);
  });

  it("conserva explícitamente que los importes no se han facilitado", () => {
    const parsed = parseEvaluationRequest(
      request({
        input: {
          amountsKnown: false,
          netAmountCents: 0,
          vatAmountCents: 0,
          totalAmountCents: 0,
        },
      }),
    );

    expect(parsed.input.amountsKnown).toBe(false);
  });

  it("rechaza importes no nulos marcados simultáneamente como desconocidos", () => {
    expectIssue(
      request({ input: { amountsKnown: false } }),
      "input.amountsKnown",
    );
  });

  it.each([
    "2026-02-29",
    "2026-13-01",
    "2026-00-10",
    "2026-04-31",
    "10/07/2026",
  ])("rechaza la fecha de gasto inválida %s", (expenseDate) => {
    expectIssue(request({ input: { expenseDate } }), "input.expenseDate");
  });

  it("acepta una fecha bisiesta real", () => {
    const parsed = parseEvaluationRequest(
      request({
        input: { expenseDate: "2024-02-29" },
        context: { fiscalYear: 2024 },
      }),
    );

    expect(parsed.input.expenseDate).toBe("2024-02-29");
  });

  it("exige que el ejercicio coincida con la fecha del gasto", () => {
    expectIssue(request({ context: { fiscalYear: 2025 } }), "context.fiscalYear");
  });

  it.each([
    ["input.concept", { concept: "" }],
    ["input.currency", { currency: "EU" }],
    ["input.paymentMethod", { paymentMethod: "BITCOIN" }],
    ["input.invoiceType", { invoiceType: "PDF" }],
    ["input.manualCategory", { manualCategory: "OTHER" }],
  ])("rechaza el campo de gasto inválido %s", (field, input) => {
    expectIssue(request({ input }), field);
  });

  it.each([
    ["context.jurisdiction", { jurisdiction: "ES_UNKNOWN" }],
    ["context.taxpayerType", { taxpayerType: "PERSON" }],
    ["context.directTaxRegime", { directTaxRegime: "MODULES" }],
    ["context.vatRegime", { vatRegime: "IGIC" }],
    ["context.hasFullVatDeductionRight", { hasFullVatDeductionRight: "yes" }],
    ["context.fiscalYear", { fiscalYear: 1999 }],
    ["context.fiscalYear", { fiscalYear: 2101 }],
  ])("rechaza el contexto fiscal inválido %s", (field, context) => {
    expectIssue(request({ context }), field);
  });

  it("conserva la actividad ausente para que el motor solicite información", () => {
    const parsed = parseEvaluationRequest(
      request({ context: { activityDescription: "" } }),
    );

    expect(parsed.context.activityDescription).toBe("");
  });

  it.each([
    ["previousAnswers.bad key", { "bad key": true }],
    ["previousAnswers.amount", { amount: -1 }],
    ["previousAnswers.amount", { amount: 1.25 }],
    ["previousAnswers.answer", { answer: "x".repeat(1_001) }],
    ["previousAnswers.tags", { tags: Array.from({ length: 31 }, () => "x") }],
    ["previousAnswers.object", { object: { nested: true } }],
  ])("rechaza respuestas con formato inválido en %s", (field, previousAnswers) => {
    expectIssue(request({ previousAnswers }), field);
  });

  it("rechaza contexto anual negativo", () => {
    expectIssue(
      request({ input: { annualContext: { netTurnoverCents: -1 } } }),
      "input.annualContext.netTurnoverCents",
    );
  });

  it.each([null, [], "request"])(
    "rechaza una petición raíz no estructurada (%j)",
    (value) => {
      expectIssue(value, "request");
    },
  );
});

describe("assertEvaluationResult", () => {
  const resolved = evaluateExpense(
    BASE_INPUT,
    BASE_CONTEXT,
    { "meal.purpose": "PERSONAL" },
    {
      evaluationId: "evaluation-schema-test",
      evaluatedAt: "2026-07-10T10:00:00.000Z",
    },
  );

  it("rechaza impuestos directos e indirectos intercambiados", () => {
    expect(() =>
      assertEvaluationResult(
        {
          ...resolved,
          directTax: resolved.indirectTax,
          indirectTax: resolved.directTax,
        },
        BASE_INPUT,
      ),
    ).toThrow(TaxEngineConfigurationError);
  });

  it("acepta un resultado generado por el motor", () => {
    expect(assertEvaluationResult(resolved, BASE_INPUT)).toBe(resolved);
  });

  it("impide que NEEDS_INPUT anticipe riesgo o importes fiscales", () => {
    expect(() =>
      assertEvaluationResult(
        {
          ...resolved,
          status: "NEEDS_INPUT",
          risk: "RED",
        },
        BASE_INPUT,
      ),
    ).toThrow(/NEEDS_INPUT/);
  });

  it.each([-1, 101, 1.5])(
    "rechaza el porcentaje directo fuera del contrato: %s",
    (theoreticalPercentage) => {
      expect(() =>
        assertEvaluationResult(
          {
            ...resolved,
            directTax: {
              ...resolved.directTax!,
              theoreticalPercentage,
            },
          },
          BASE_INPUT,
        ),
      ).toThrow(TaxEngineConfigurationError);
    },
  );

  it("rechaza deducciones superiores a los importes introducidos", () => {
    expect(() =>
      assertEvaluationResult(
        {
          ...resolved,
          directTax: {
            ...resolved.directTax!,
            deductibleAmountCents: BASE_INPUT.totalAmountCents + 1,
          },
        },
        BASE_INPUT,
      ),
    ).toThrow(/importe deducible no válido/i);

    expect(() =>
      assertEvaluationResult(
        {
          ...resolved,
          indirectTax: {
            ...resolved.indirectTax!,
            deductibleAmountCents: BASE_INPUT.vatAmountCents + 1,
          },
        },
        BASE_INPUT,
      ),
    ).toThrow(/importe deducible no válido/i);
  });

  it("impide que NO_MATCH contenga una conclusión fiscal", () => {
    const noMatch = evaluateExpense(
      { ...BASE_INPUT, concept: "ordenador portátil" },
      BASE_CONTEXT,
      {},
      {
        evaluationId: "evaluation-no-match",
        evaluatedAt: "2026-07-10T10:00:00.000Z",
      },
    );

    expect(() =>
      assertEvaluationResult(
        { ...noMatch, directTax: resolved.directTax },
        BASE_INPUT,
      ),
    ).toThrow(/NO_MATCH no puede inventar/i);
  });

  it("rechaza identidad o puntuación de matching inválidas", () => {
    expect(() =>
      assertEvaluationResult({ ...resolved, evaluationId: "" }, BASE_INPUT),
    ).toThrow(/identidad/i);
    expect(() =>
      assertEvaluationResult({ ...resolved, matchScore: 101 }, BASE_INPUT),
    ).toThrow(/puntuación/i);
  });
});
