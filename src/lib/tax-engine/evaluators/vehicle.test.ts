import { describe, expect, it } from "vitest";
import { evaluateExpense } from "../engine";
import type {
  ExpenseAnswers,
  ExpenseInput,
  TaxContext,
} from "../types";

const METADATA = {
  evaluationId: "evaluation-vehicle-test",
  evaluatedAt: "2026-07-12T10:00:00.000Z",
} as const;

const BASE_INPUT: ExpenseInput = {
  concept: "gasolina",
  supplierName: "Estación de servicio",
  expenseDate: "2026-07-12",
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
  directTaxRegime: "DIRECT_ESTIMATION_SIMPLIFIED",
  vatRegime: "GENERAL",
  hasFullVatDeductionRight: true,
  activityDescription: "Servicios profesionales",
  fiscalYear: 2026,
};

const ORDINARY_MIXED_USE_ANSWERS: ExpenseAnswers = {
  "vehicle.identifier": "1234-TEST",
  "vehicle.type": "ORDINARY_PASSENGER",
  "vehicle.usedInBusiness": true,
  "vehicle.professionalUseProven": true,
  "vehicle.evidenceDescription":
    "Matrícula, agenda de visitas y registro de desplazamientos.",
  "vehicle.privateUse": true,
  "vehicle.exclusiveProfessionalUse": false,
  "vehicle.expenseLinked": true,
  "vehicle.higherVatUseProven": false,
  "vehicle.marked": false,
};

function evaluateVehicle(options: {
  concept?: string;
  input?: Partial<ExpenseInput>;
  context?: Partial<TaxContext>;
  answers?: ExpenseAnswers;
} = {}) {
  return evaluateExpense(
    {
      ...BASE_INPUT,
      ...options.input,
      concept: options.concept ?? options.input?.concept ?? BASE_INPUT.concept,
    },
    { ...BASE_CONTEXT, ...options.context },
    options.answers ?? ORDINARY_MIXED_USE_ANSWERS,
    METADATA,
  );
}

describe("regla de gastos corrientes de vehículo", () => {
  it("resuelve gasolina a cero y riesgo rojo sin uso profesional demostrado", () => {
    const result = evaluateVehicle({
      answers: {
        "vehicle.usedInBusiness": true,
        "vehicle.professionalUseProven": false,
      },
    });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      risk: "RED",
      matchedRuleId: "es-common.irpf-vat.vehicle-running-costs",
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
    expect(result.calculationTrace).toContainEqual(
      expect.objectContaining({ code: "professional-use-failed" }),
    );
  });

  it("aplica IRPF 0 % e IVA 50 % a un turismo con uso profesional y privado", () => {
    const result = evaluateVehicle();

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      risk: "YELLOW",
      directTax: {
        eligibility: "NONE",
        theoreticalPercentage: 0,
        deductibleAmountCents: 0,
      },
      indirectTax: {
        eligibility: "PARTIAL",
        theoreticalPercentage: 50,
        deductibleAmountCents: 1_050,
      },
    });
  });

  it("mantiene la presunción del 50 % de IVA si la exclusividad no acredita un porcentaje distinto", () => {
    const result = evaluateVehicle({
      answers: {
        ...ORDINARY_MIXED_USE_ANSWERS,
        "vehicle.privateUse": false,
        "vehicle.exclusiveProfessionalUse": true,
      },
    });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      risk: "YELLOW",
      directTax: {
        eligibility: "FULL",
        theoreticalPercentage: 100,
        deductibleAmountCents: 11_050,
      },
      indirectTax: {
        eligibility: "PARTIAL",
        theoreticalPercentage: 50,
        deductibleAmountCents: 1_050,
      },
    });
    expect(result.indirectTax?.explanation).toMatch(/50|porcentaje distinto/i);
    expect(result.directTax?.deductibleAmountCents).toBeLessThanOrEqual(
      BASE_INPUT.totalAmountCents,
    );
  });

  it("solo propone IVA al 100 % del turismo cuando se declara acreditado ese porcentaje", () => {
    const result = evaluateVehicle({
      answers: {
        ...ORDINARY_MIXED_USE_ANSWERS,
        "vehicle.privateUse": false,
        "vehicle.exclusiveProfessionalUse": true,
        "vehicle.higherVatUseProven": true,
        "vehicle.provenVatPercentage": 100,
      },
    });

    expect(result.indirectTax).toMatchObject({
      eligibility: "FULL",
      theoreticalPercentage: 100,
      deductibleAmountCents: 2_100,
    });
  });

  it.each([
    ["vehículo mixto para mercancías", "MIXED_GOODS"],
    ["vehículo de representante o agente comercial", "SALES_REP"],
  ] as const)(
    "aplica las presunciones específicas al %s con documentación suficiente",
    (_label, vehicleType) => {
      const result = evaluateVehicle({
        answers: {
          ...ORDINARY_MIXED_USE_ANSWERS,
          "vehicle.type": vehicleType,
          "vehicle.privateUseAccessory": true,
        },
      });

      expect(result).toMatchObject({
        status: "NEEDS_REVIEW",
        risk: "YELLOW",
        directTax: {
          eligibility: "FULL",
          theoreticalPercentage: 100,
          deductibleAmountCents: 10_000,
        },
        indirectTax: {
          eligibility: "FULL",
          theoreticalPercentage: 100,
          deductibleAmountCents: 2_100,
        },
      });
    },
  );

  it("no concede IRPF a una categoría especial con uso privado no accesorio", () => {
    const result = evaluateVehicle({
      answers: {
        ...ORDINARY_MIXED_USE_ANSWERS,
        "vehicle.type": "MIXED_GOODS",
        "vehicle.privateUseAccessory": false,
      },
    });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      risk: "YELLOW",
      directTax: {
        eligibility: "NONE",
        deductibleAmountCents: 0,
      },
      indirectTax: {
        eligibility: "FULL",
        deductibleAmountCents: 2_100,
      },
    });
  });

  it("solicita aclarar el carácter accesorio del uso privado especial", () => {
    const result = evaluateVehicle({
      answers: {
        ...ORDINARY_MIXED_USE_ANSWERS,
        "vehicle.type": "SALES_REP",
      },
    });

    expect(result).toMatchObject({
      status: "NEEDS_INPUT",
      risk: "UNDETERMINED",
      directTax: null,
      indirectTax: null,
    });
    expect(result.requiredQuestions.map((question) => question.id)).toContain(
      "vehicle.privateUseAccessory",
    );
  });

  it("no traslada a IRPF la presunción específica de IVA de un vehículo de vigilancia", () => {
    const result = evaluateVehicle({
      answers: {
        ...ORDINARY_MIXED_USE_ANSWERS,
        "vehicle.type": "SURVEILLANCE",
      },
    });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      directTax: {
        taxType: "IRPF",
        eligibility: "NONE",
        theoreticalPercentage: 0,
        deductibleAmountCents: 0,
      },
      indirectTax: {
        taxType: "IVA",
        eligibility: "FULL",
        theoreticalPercentage: 100,
        deductibleAmountCents: 2_100,
      },
    });
    expect(result.warnings.join(" ")).toMatch(/vigilancia.*IVA.*IRPF/i);
  });

  it("un turismo rotulado con uso mixto continúa en IRPF 0 % e IVA 50 %", () => {
    const result = evaluateVehicle({
      answers: {
        ...ORDINARY_MIXED_USE_ANSWERS,
        "vehicle.marked": true,
      },
    });

    expect(result.directTax).toMatchObject({
      theoreticalPercentage: 0,
      deductibleAmountCents: 0,
    });
    expect(result.indirectTax).toMatchObject({
      theoreticalPercentage: 50,
      deductibleAmountCents: 1_050,
    });
    expect(result.calculationTrace).toContainEqual(
      expect.objectContaining({
        code: "vehicle-marking",
        detail: expect.stringMatching(/evidencia complementaria/i),
      }),
    );
  });

  it("la rotulación por sí sola no altera ningún porcentaje ni cantidad", () => {
    const unmarked = evaluateVehicle();
    const marked = evaluateVehicle({
      answers: {
        ...ORDINARY_MIXED_USE_ANSWERS,
        "vehicle.marked": true,
      },
    });

    expect(marked.directTax).toEqual(unmarked.directTax);
    expect(marked.indirectTax).toEqual(unmarked.indirectTax);
    expect(marked.warnings.join(" ")).toMatch(/rotulación.*indicio complementario/i);
  });

  it("aplica el 50 % de IVA a un aparcamiento con uso empresarial demostrado", () => {
    const result = evaluateVehicle({ concept: "aparcamiento" });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      matchedBy: "ALIAS",
      indirectTax: {
        theoreticalPercentage: 50,
        deductibleAmountCents: 1_050,
      },
    });
  });

  it("utiliza un porcentaje de IVA superior al 50 % cuando se declara acreditado", () => {
    const result = evaluateVehicle({
      answers: {
        ...ORDINARY_MIXED_USE_ANSWERS,
        "vehicle.higherVatUseProven": true,
        "vehicle.provenVatPercentage": 80,
      },
    });

    expect(result.indirectTax).toMatchObject({
      eligibility: "PARTIAL",
      theoreticalPercentage: 80,
      deductibleAmountCents: 1_680,
    });
    expect(result.warnings.join(" ")).toMatch(/porcentaje.*acreditar/i);
  });

  it("deja en revisión un peaje que no está asociado a un vehículo identificado", () => {
    const result = evaluateVehicle({
      concept: "peaje",
      answers: {
        ...ORDINARY_MIXED_USE_ANSWERS,
        "vehicle.expenseLinked": false,
      },
    });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      risk: "UNDETERMINED",
      directTax: null,
      indirectTax: null,
    });
    expect(result.missingInformation.join(" ")).toMatch(
      /vincularse a un vehículo identificado/i,
    );
  });

  it("evalúa una factura de taller asociada al vehículo y conserva el vínculo en la traza", () => {
    const result = evaluateVehicle({ concept: "taller mecánico" });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      matchedRuleId: "es-common.irpf-vat.vehicle-running-costs",
      matchedBy: "ALIAS",
      indirectTax: {
        theoreticalPercentage: 50,
        deductibleAmountCents: 1_050,
      },
    });
    expect(result.calculationTrace).toContainEqual(
      expect.objectContaining({
        code: "vehicle-conditions",
        detail: expect.stringMatching(/gasto vinculado: sí/i),
      }),
    );
  });

  it("no aplica una regla de IRPF de autónomo a una sociedad mercantil", () => {
    const result = evaluateVehicle({
      context: { taxpayerType: "COMPANY_IS" },
    });

    expect(result).toMatchObject({
      status: "UNSUPPORTED",
      matchedRuleId: null,
      matchedRuleVersion: null,
      matchedBy: "NONE",
      directTax: null,
      indirectTax: null,
    });
    expect(result.warnings.join(" ")).toMatch(/ninguna regla fiscal/i);
  });
});

describe("entradas pendientes o contradictorias de vehículo", () => {
  it("solicita datos sin convertir su ausencia en riesgo rojo", () => {
    const result = evaluateVehicle({ answers: {} });

    expect(result.status).toBe("NEEDS_INPUT");
    expect(result.risk).toBe("UNDETERMINED");
    expect(result.directTax).toBeNull();
    expect(result.indirectTax).toBeNull();
    expect(result.requiredQuestions.map((question) => question.id)).toEqual(
      expect.arrayContaining([
        "vehicle.type",
        "vehicle.usedInBusiness",
        "vehicle.professionalUseProven",
        "vehicle.expenseLinked",
      ]),
    );
  });

  it("pide un porcentaje entero entre 0 y 100 si se alega una utilización distinta", () => {
    const result = evaluateVehicle({
      answers: {
        ...ORDINARY_MIXED_USE_ANSWERS,
        "vehicle.higherVatUseProven": true,
        "vehicle.provenVatPercentage": 101,
      },
    });

    expect(result.status).toBe("NEEDS_INPUT");
    expect(result.requiredQuestions.map((question) => question.id)).toContain(
      "vehicle.provenVatPercentage",
    );
  });

  it("no resuelve respuestas incompatibles de uso privado y exclusividad", () => {
    const result = evaluateVehicle({
      answers: {
        ...ORDINARY_MIXED_USE_ANSWERS,
        "vehicle.exclusiveProfessionalUse": true,
      },
    });

    expect(result.status).toBe("NEEDS_REVIEW");
    expect(result.missingInformation.join(" ")).toMatch(/incompatibles/i);
  });

  it("remite a revisión una categoría no implementada", () => {
    const result = evaluateVehicle({
      answers: {
        ...ORDINARY_MIXED_USE_ANSWERS,
        "vehicle.type": "OTHER",
      },
    });

    expect(result.status).toBe("NEEDS_REVIEW");
    expect(result.directTax).toBeNull();
    expect(result.indirectTax).toBeNull();
  });

  it("no presenta un recibo de vehículo como IVA deducible", () => {
    const result = evaluateVehicle({
      input: { invoiceType: "RECEIPT" },
    });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      directTax: { eligibility: "NEEDS_REVIEW" },
      indirectTax: {
        eligibility: "NONE",
        theoreticalPercentage: 0,
        deductibleAmountCents: 0,
      },
    });
  });
});
