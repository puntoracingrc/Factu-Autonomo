import { describe, expect, it } from "vitest";
import { evaluateExpense } from "./engine";
import type {
  EvaluationMetadata,
  ExpenseAnswers,
  ExpenseInput,
  TaxContext,
} from "./types";

const METADATA: EvaluationMetadata = {
  evaluationId: "evaluation-meal-test",
  evaluatedAt: "2026-07-10T10:00:00.000Z",
};

const BASE_CONTEXT: TaxContext = {
  jurisdiction: "ES_COMMON",
  taxpayerType: "SELF_EMPLOYED_IRPF",
  directTaxRegime: "DIRECT_ESTIMATION_SIMPLIFIED",
  vatRegime: "GENERAL",
  hasFullVatDeductionRight: true,
  activityDescription: "Consultoría de software",
  fiscalYear: 2026,
};

const BASE_INPUT: ExpenseInput = {
  concept: "comida",
  supplierName: "Restaurante Ejemplo",
  expenseDate: "2026-07-10",
  netAmountCents: 2_000,
  vatAmountCents: 200,
  totalAmountCents: 2_200,
  currency: "EUR",
  paymentMethod: "CARD",
  invoiceType: "FULL_INVOICE",
};

const SELF_MAINTENANCE_ANSWERS: ExpenseAnswers = {
  "meal.purpose": "SELF_MAINTENANCE",
  "meal.businessRelated": true,
  "meal.hospitalityEstablishment": true,
  "meal.location": "SPAIN",
  "meal.overnightDifferentMunicipality": false,
  "meal.sameDayAlreadyDeductedCents": 0,
  "meal.activityEvidence": "Agenda profesional y parte del proyecto cliente-42",
};

const CLIENT_ATTENTION_ANSWERS: ExpenseAnswers = {
  "meal.purpose": "CLIENT_OR_SUPPLIER",
  "client.identified": true,
  "client.commercialRelationship": true,
  "client.relationshipEvidence": "Presupuesto P-2026-0042 y correo de reunión",
  "client.netTurnoverCents": 10_000_000,
  "client.alreadyDeductedCents": 20_000,
};

function evaluateMeal(options: {
  input?: Partial<ExpenseInput>;
  context?: Partial<TaxContext>;
  answers?: ExpenseAnswers;
} = {}) {
  return evaluateExpense(
    { ...BASE_INPUT, ...options.input },
    { ...BASE_CONTEXT, ...options.context },
    options.answers ?? {},
    METADATA,
  );
}

function requiredQuestionIds(
  result: ReturnType<typeof evaluateMeal>,
): string[] {
  return result.requiredQuestions.map((question) => question.id);
}

describe("restauración: selección de finalidad", () => {
  it.each(["Comida", "Cena de empresa"])(
    "%s no se clasifica fiscalmente sin preguntar la finalidad",
    (concept) => {
      const result = evaluateMeal({ input: { concept } });

      expect(result).toMatchObject({
        status: "NEEDS_INPUT",
        risk: "UNDETERMINED",
        matchedRuleId: "es-common.irpf-vat.meals-hospitality",
        directTax: null,
        indirectTax: null,
      });
      expect(requiredQuestionIds(result)).toEqual(["meal.purpose"]);
    },
  );

  it.each(["EMPLOYEE_TRAVEL", "INTERNAL_EVENT", "OTHER_UNSURE"])(
    "mantiene %s en revisión porque la finalidad no está implementada",
    (purpose) => {
      const result = evaluateMeal({
        answers: { "meal.purpose": purpose },
      });

      expect(result).toMatchObject({
        status: "NEEDS_REVIEW",
        risk: "UNDETERMINED",
        directTax: null,
        indirectTax: null,
        requiresHumanReview: true,
      });
    },
  );

  it("resuelve un gasto declarado personal con IRPF e IVA a cero", () => {
    const result = evaluateMeal({
      answers: { "meal.purpose": "PERSONAL" },
    });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      risk: "RED",
      directTax: {
        taxType: "IRPF",
        eligibility: "NONE",
        theoreticalPercentage: 0,
        deductibleAmountCents: 0,
      },
      indirectTax: {
        taxType: "IVA",
        eligibility: "NONE",
        theoreticalPercentage: 0,
        deductibleAmountCents: 0,
      },
    });
    expect(result.calculationTrace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "personal-purpose", amountCents: 0 }),
      ]),
    );
  });
});

describe("restauración: manutención del propio autónomo", () => {
  it("deduce una manutención acreditada dentro del límite diario", () => {
    const result = evaluateMeal({ answers: SELF_MAINTENANCE_ANSWERS });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      risk: "YELLOW",
      directTax: {
        taxType: "IRPF",
        eligibility: "FULL",
        theoreticalPercentage: 100,
        deductibleAmountCents: 2_000,
        appliedLimit: {
          code: "SELF_MAINTENANCE_DAILY_LIMIT",
          limitAmountCents: 2_667,
          consumedAmountCents: 0,
          remainingBeforeExpenseCents: 2_667,
          excessAmountCents: 0,
        },
      },
      indirectTax: {
        taxType: "IVA",
        eligibility: "FULL",
        theoreticalPercentage: 100,
        deductibleAmountCents: 200,
      },
    });
    expect(result.evidenceRequired).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/factura/i),
        expect.stringMatching(/pago electr[oó]nico/i),
        expect.stringMatching(/proyecto/i),
      ]),
    );
  });

  it("limita la deducción y explica el exceso cuando supera el máximo diario", () => {
    const result = evaluateMeal({
      input: {
        netAmountCents: 4_000,
        vatAmountCents: 400,
        totalAmountCents: 4_400,
      },
      answers: SELF_MAINTENANCE_ANSWERS,
    });

    expect(result.directTax).toMatchObject({
      eligibility: "PARTIAL",
      theoreticalPercentage: 66,
      deductibleAmountCents: 2_667,
      appliedLimit: {
        limitAmountCents: 2_667,
        remainingBeforeExpenseCents: 2_667,
        excessAmountCents: 1_333,
      },
    });
    expect(result.indirectTax).toMatchObject({
      eligibility: "PARTIAL",
      theoreticalPercentage: 66,
      deductibleAmountCents: 266,
    });
    expect(result.calculationTrace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "daily-limit",
          amountCents: 2_667,
        }),
        expect.objectContaining({
          code: "direct-result",
          amountCents: 2_667,
        }),
      ]),
    );
  });

  it.each([
    { location: "SPAIN", overnight: false, expectedLimit: 2_667 },
    { location: "FOREIGN", overnight: false, expectedLimit: 4_808 },
    { location: "SPAIN", overnight: true, expectedLimit: 5_334 },
    { location: "FOREIGN", overnight: true, expectedLimit: 9_135 },
  ] as const)(
    "aplica el límite versionado $expectedLimit para $location / pernoctación=$overnight",
    ({ location, overnight, expectedLimit }) => {
      const result = evaluateMeal({
        input: {
          netAmountCents: 10_000,
          vatAmountCents: 1_000,
          totalAmountCents: 11_000,
        },
        answers: {
          ...SELF_MAINTENANCE_ANSWERS,
          "meal.location": location,
          "meal.overnightDifferentMunicipality": overnight,
        },
      });

      expect(result.directTax?.deductibleAmountCents).toBe(expectedLimit);
      expect(result.directTax?.appliedLimit?.limitAmountCents).toBe(
        expectedLimit,
      );
    },
  );

  it("descuenta del límite diario lo ya deducido en la misma fecha", () => {
    const result = evaluateMeal({
      input: {
        netAmountCents: 1_000,
        vatAmountCents: 100,
        totalAmountCents: 1_100,
        annualContext: { maintenanceDeductedSameDayCents: 2_500 },
      },
      answers: {
        ...SELF_MAINTENANCE_ANSWERS,
        "meal.sameDayAlreadyDeductedCents": 0,
      },
    });

    expect(result.directTax).toMatchObject({
      deductibleAmountCents: 167,
      appliedLimit: {
        consumedAmountCents: 2_500,
        remainingBeforeExpenseCents: 167,
        excessAmountCents: 833,
      },
    });
    expect(result.indirectTax?.deductibleAmountCents).toBe(16);
  });

  it("rechaza la deducción si el pago fue en efectivo", () => {
    const result = evaluateMeal({
      input: { paymentMethod: "CASH" },
      answers: SELF_MAINTENANCE_ANSWERS,
    });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      risk: "RED",
      directTax: { eligibility: "NONE", deductibleAmountCents: 0 },
      indirectTax: { eligibility: "NONE", deductibleAmountCents: 0 },
    });
    expect(result.calculationTrace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "maintenance-condition-failed" }),
      ]),
    );
  });

  it.each([
    ["meal.businessRelated", /actividad/i],
    ["meal.hospitalityEstablishment", /hostelería|restauración/i],
  ] as const)(
    "rechaza la deducción cuando %s es falso",
    (answerId, expectedText) => {
      const result = evaluateMeal({
        answers: { ...SELF_MAINTENANCE_ANSWERS, [answerId]: false },
      });

      expect(result).toMatchObject({
        status: "NEEDS_REVIEW",
        risk: "RED",
        directTax: { deductibleAmountCents: 0 },
        indirectTax: { deductibleAmountCents: 0 },
      });
      expect(result.directTax?.explanation).toMatch(expectedText);
    },
  );

  it("solicita el carácter electrónico cuando el medio de pago no lo determina", () => {
    const result = evaluateMeal({
      input: { paymentMethod: "UNKNOWN" },
      answers: SELF_MAINTENANCE_ANSWERS,
    });

    expect(result).toMatchObject({
      status: "NEEDS_INPUT",
      risk: "UNDETERMINED",
      directTax: null,
      indirectTax: null,
    });
    expect(requiredQuestionIds(result)).toContain("meal.electronicPayment");
  });

  it("no convierte las respuestas ausentes en riesgo rojo", () => {
    const result = evaluateMeal({
      answers: { "meal.purpose": "SELF_MAINTENANCE" },
    });

    expect(result).toMatchObject({
      status: "NEEDS_INPUT",
      risk: "UNDETERMINED",
      directTax: null,
      indirectTax: null,
    });
    expect(requiredQuestionIds(result)).toEqual(
      expect.arrayContaining([
        "meal.businessRelated",
        "meal.hospitalityEstablishment",
        "meal.location",
        "meal.overnightDifferentMunicipality",
        "meal.sameDayAlreadyDeductedCents",
        "meal.activityEvidence",
      ]),
    );
  });

  it.each([
    "día laborable",
    "DÍA DE TRABAJO",
    "laboral",
    "lunes laborable",
    "era un día laborable",
  ])(
    "no acepta «%s» como única prueba de afectación",
    (activityEvidence) => {
      const result = evaluateMeal({
        answers: {
          ...SELF_MAINTENANCE_ANSWERS,
          "meal.activityEvidence": activityEvidence,
        },
      });

      expect(result).toMatchObject({
        status: "NEEDS_INPUT",
        risk: "UNDETERMINED",
        directTax: null,
        indirectTax: null,
      });
      expect(requiredQuestionIds(result)).toEqual(["meal.activityEvidence"]);
      expect(result.missingInformation.join(" ")).toMatch(/día laborable/i);
    },
  );

  it("pide confirmar los datos fiscales de una factura simplificada", () => {
    const result = evaluateMeal({
      input: { invoiceType: "SIMPLIFIED_INVOICE" },
      answers: SELF_MAINTENANCE_ANSWERS,
    });

    expect(result).toMatchObject({
      status: "NEEDS_INPUT",
      directTax: null,
      indirectTax: null,
    });
    expect(requiredQuestionIds(result)).toEqual([
      "document.simplifiedInvoiceQualified",
    ]);
  });

  it("no deduce el IVA de una factura simplificada no cualificada", () => {
    const result = evaluateMeal({
      input: { invoiceType: "SIMPLIFIED_INVOICE" },
      answers: {
        ...SELF_MAINTENANCE_ANSWERS,
        "document.simplifiedInvoiceQualified": false,
      },
    });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      risk: "YELLOW",
      directTax: {
        eligibility: "FULL",
        deductibleAmountCents: 2_200,
      },
      indirectTax: {
        eligibility: "NONE",
        theoreticalPercentage: 0,
        deductibleAmountCents: 0,
      },
    });
  });

  it.each(["RECEIPT", "NO_DOCUMENT"] as const)(
    "nunca deduce IVA con justificante %s",
    (invoiceType) => {
      const result = evaluateMeal({
        input: { invoiceType },
        answers: SELF_MAINTENANCE_ANSWERS,
      });

      expect(result).toMatchObject({
        status: "NEEDS_REVIEW",
        directTax: {
          eligibility: "NEEDS_REVIEW",
          deductibleAmountCents: 0,
        },
        indirectTax: {
          eligibility: "NONE",
          theoreticalPercentage: 0,
          deductibleAmountCents: 0,
        },
      });
    },
  );

  it("mantiene el IVA en revisión cuando el régimen de prorrata no permite concluir", () => {
    const result = evaluateMeal({
      context: { vatRegime: "PRORATA", hasFullVatDeductionRight: false },
      answers: SELF_MAINTENANCE_ANSWERS,
    });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      risk: "YELLOW",
      directTax: { taxType: "IRPF", deductibleAmountCents: 2_200 },
      indirectTax: {
        taxType: "IVA",
        eligibility: "NEEDS_REVIEW",
        deductibleAmountCents: 0,
      },
    });
  });
});

describe("restauración: atenciones a clientes y proveedores", () => {
  it("calcula el límite anual, lo consumido y el saldo disponible", () => {
    const result = evaluateMeal({
      input: {
        netAmountCents: 10_000,
        vatAmountCents: 2_100,
        totalAmountCents: 12_100,
      },
      answers: CLIENT_ATTENTION_ANSWERS,
    });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      risk: "YELLOW",
      directTax: {
        taxType: "IRPF",
        eligibility: "FULL",
        theoreticalPercentage: 100,
        deductibleAmountCents: 12_100,
        appliedLimit: {
          code: "CLIENT_ATTENTION_ANNUAL_ONE_PERCENT",
          limitAmountCents: 100_000,
          consumedAmountCents: 20_000,
          remainingBeforeExpenseCents: 80_000,
          excessAmountCents: 0,
        },
      },
      indirectTax: {
        taxType: "IVA",
        eligibility: "NONE",
        theoreticalPercentage: 0,
        deductibleAmountCents: 0,
      },
    });
    expect(result.calculationTrace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "annual-limit",
          amountCents: 100_000,
          percentage: 1,
        }),
        expect.objectContaining({
          code: "annual-consumed",
          amountCents: 20_000,
        }),
      ]),
    );
  });

  it("solicita la cifra de negocios si no se ha informado", () => {
    const answersWithoutTurnover = Object.fromEntries(
      Object.entries(CLIENT_ATTENTION_ANSWERS).filter(
        ([id]) => id !== "client.netTurnoverCents",
      ),
    );
    const result = evaluateMeal({ answers: answersWithoutTurnover });

    expect(result).toMatchObject({
      status: "NEEDS_INPUT",
      risk: "UNDETERMINED",
      directTax: null,
      indirectTax: null,
    });
    expect(requiredQuestionIds(result)).toContain("client.netTurnoverCents");
  });

  it("solicita el acumulado anual si no se ha informado", () => {
    const answersWithoutAccumulated = Object.fromEntries(
      Object.entries(CLIENT_ATTENTION_ANSWERS).filter(
        ([id]) => id !== "client.alreadyDeductedCents",
      ),
    );
    const result = evaluateMeal({ answers: answersWithoutAccumulated });

    expect(result.status).toBe("NEEDS_INPUT");
    expect(requiredQuestionIds(result)).toContain(
      "client.alreadyDeductedCents",
    );
  });

  it("limita el gasto al saldo anual restante", () => {
    const result = evaluateMeal({
      input: {
        netAmountCents: 10_000,
        vatAmountCents: 2_100,
        totalAmountCents: 12_100,
      },
      answers: {
        ...CLIENT_ATTENTION_ANSWERS,
        "client.netTurnoverCents": 1_000_000,
        "client.alreadyDeductedCents": 9_000,
      },
    });

    expect(result.directTax).toMatchObject({
      eligibility: "PARTIAL",
      theoreticalPercentage: 8,
      deductibleAmountCents: 1_000,
      appliedLimit: {
        limitAmountCents: 10_000,
        consumedAmountCents: 9_000,
        remainingBeforeExpenseCents: 1_000,
        excessAmountCents: 11_100,
      },
    });
    expect(result.indirectTax?.deductibleAmountCents).toBe(0);
  });

  it("fija el saldo a cero si lo ya deducido supera el límite", () => {
    const result = evaluateMeal({
      answers: {
        ...CLIENT_ATTENTION_ANSWERS,
        "client.netTurnoverCents": 1_000_000,
        "client.alreadyDeductedCents": 10_001,
      },
    });

    expect(result.directTax).toMatchObject({
      eligibility: "NONE",
      theoreticalPercentage: 0,
      deductibleAmountCents: 0,
      appliedLimit: { remainingBeforeExpenseCents: 0 },
    });
    expect(result.warnings.join(" ")).toMatch(/supera el límite/i);
  });

  it("no propone deducción si no existe relación comercial", () => {
    const result = evaluateMeal({
      answers: {
        ...CLIENT_ATTENTION_ANSWERS,
        "client.commercialRelationship": false,
      },
    });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      risk: "RED",
      directTax: { eligibility: "NONE", deductibleAmountCents: 0 },
      indirectTax: { eligibility: "NONE", deductibleAmountCents: 0 },
    });
  });

  it("requiere revisión cuando no puede identificarse la contraparte", () => {
    const result = evaluateMeal({
      answers: {
        ...CLIENT_ATTENTION_ANSWERS,
        "client.identified": false,
      },
    });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      risk: "RED",
      directTax: {
        eligibility: "NEEDS_REVIEW",
        deductibleAmountCents: 0,
      },
      indirectTax: { eligibility: "NONE", deductibleAmountCents: 0 },
    });
  });

  it.each(["RECEIPT", "NO_DOCUMENT"] as const)(
    "requiere revisión fiscal y mantiene IVA a cero con %s",
    (invoiceType) => {
      const result = evaluateMeal({
        input: { invoiceType },
        answers: CLIENT_ATTENTION_ANSWERS,
      });

      expect(result).toMatchObject({
        status: "NEEDS_REVIEW",
        risk: "YELLOW",
        directTax: {
          eligibility: "NEEDS_REVIEW",
          deductibleAmountCents: 0,
        },
        indirectTax: { eligibility: "NONE", deductibleAmountCents: 0 },
      });
    },
  );

  it("usa el contexto anual canónico antes que respuestas duplicadas", () => {
    const result = evaluateMeal({
      input: {
        annualContext: {
          netTurnoverCents: 1_000_000,
          clientAttentionDeductedCents: 9_500,
        },
      },
      answers: {
        ...CLIENT_ATTENTION_ANSWERS,
        "client.netTurnoverCents": 90_000_000,
        "client.alreadyDeductedCents": 0,
      },
    });

    expect(result.directTax?.appliedLimit).toMatchObject({
      limitAmountCents: 10_000,
      consumedAmountCents: 9_500,
      remainingBeforeExpenseCents: 500,
    });
    expect(result.directTax?.deductibleAmountCents).toBe(500);
  });
});
