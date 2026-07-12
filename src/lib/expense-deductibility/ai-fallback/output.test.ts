import { describe, expect, it } from "vitest";
import {
  buildFiscalAiContext,
  type FiscalAiContext,
} from "./legal-context";
import {
  FISCAL_AI_OUTPUT_SCHEMA_VERSION,
  validateFiscalAiOutput,
  type FiscalAiProposal,
  type FiscalAiValidatorErrorCode,
} from "./output";
import { OFFICIAL_SOURCES } from "@/lib/tax-engine/sources";
import type { ExpenseInput, TaxContext } from "@/lib/tax-engine/types";

const INPUT: ExpenseInput = {
  concept: "servicio profesional no clasificado",
  expenseDate: "2026-07-12",
  netAmountCents: 10_000,
  vatAmountCents: 2_100,
  totalAmountCents: 12_100,
  currency: "EUR",
  paymentMethod: "CARD",
  invoiceType: "FULL_INVOICE",
};

const CONTEXT: TaxContext = {
  jurisdiction: "ES_COMMON",
  taxpayerType: "SELF_EMPLOYED_IRPF",
  directTaxRegime: "DIRECT_ESTIMATION_SIMPLIFIED",
  vatRegime: "GENERAL",
  hasFullVatDeductionRight: true,
  activityDescription: "Consultoría de software",
  fiscalYear: 2026,
};

const LEGAL_CONTEXT = buildFiscalAiContext(INPUT, CONTEXT);
const MEAL_SOURCE_ID = OFFICIAL_SOURCES.IRPF_MAINTENANCE.id;

function validReviewOnlyOutput(
  overrides: Partial<FiscalAiProposal> = {},
): FiscalAiProposal {
  return {
    schemaVersion: FISCAL_AI_OUTPUT_SCHEMA_VERSION,
    classification: "MEALS_AND_HOSPITALITY",
    confidenceBand: "LOW",
    sourcesSufficient: false,
    summary: "Clasificación auxiliar pendiente de revisión profesional.",
    sourceIds: [MEAL_SOURCE_ID],
    missingInformation: [
      "Falta contrastar la relación concreta con la actividad.",
    ],
    evidenceRequired: ["Conserva el justificante y la prueba de pago."],
    directTax: {
      taxType: "IRPF",
      proposedPercentage: null,
      proposedDeductibleAmountCents: null,
      explanation: "El criterio directo debe revisarse sin fijar importe.",
    },
    indirectTax: {
      taxType: "IVA",
      proposedPercentage: null,
      proposedDeductibleAmountCents: null,
      explanation: "El criterio indirecto debe revisarse sin fijar importe.",
    },
    ...overrides,
  };
}

function errorCodes(
  value: unknown,
  options: {
    suppliedContext?: FiscalAiContext;
    input?: ExpenseInput;
    context?: TaxContext;
  } = {},
): readonly FiscalAiValidatorErrorCode[] {
  const result = validateFiscalAiOutput(
    value,
    options.suppliedContext ?? LEGAL_CONTEXT,
    options.input ?? INPUT,
    options.context ?? CONTEXT,
  );
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("La salida debía ser rechazada.");
  return result.errorCodes;
}

describe("validateFiscalAiOutput", () => {
  it("acepta una clasificación completa de revisión sin porcentajes definitivos", () => {
    const result = validateFiscalAiOutput(
      validReviewOnlyOutput(),
      LEGAL_CONTEXT,
      INPUT,
      CONTEXT,
    );

    expect(result).toEqual({
      ok: true,
      proposal: validReviewOnlyOutput(),
    });
  });

  it("rechaza valores no estructurados, campos adicionales y respuestas incompletas", () => {
    expect(errorCodes("no-json")).toEqual(["OUTPUT_NOT_OBJECT"]);

    expect(
      errorCodes({ ...validReviewOnlyOutput(), unexpected: "field" }),
    ).toContain("OUTPUT_SCHEMA_MISMATCH");

    const incomplete: Record<string, unknown> = {
      ...validReviewOnlyOutput(),
    };
    delete incomplete.indirectTax;
    expect(errorCodes(incomplete)).toEqual(
      expect.arrayContaining(["OUTPUT_INCOMPLETE", "OUTPUT_SCHEMA_MISMATCH"]),
    );
  });

  it("rechaza versión, clasificación y confianza fuera del contrato", () => {
    expect(
      errorCodes({
        ...validReviewOnlyOutput(),
        schemaVersion: "fiscal-ai-proposal.v999",
        classification: "OFFICE_SUPPLIES",
        confidenceBand: "CERTAIN",
      }),
    ).toEqual(
      expect.arrayContaining([
        "OUTPUT_SCHEMA_MISMATCH",
        "CLASSIFICATION_UNSUPPORTED",
        "CONFIDENCE_BAND_INVALID",
      ]),
    );
  });

  it("obliga a confianza baja cuando las fuentes son insuficientes", () => {
    expect(
      errorCodes({
        ...validReviewOnlyOutput(),
        confidenceBand: "HIGH",
      }),
    ).toContain("CONFIDENCE_BAND_INVALID");
  });

  it.each([
    [101, 1_000, "PERCENTAGE_INVALID"],
    [-1, 1_000, "PERCENTAGE_INVALID"],
    [50, -1, "AMOUNT_INVALID"],
    [50, INPUT.totalAmountCents + 1, "AMOUNT_EXCEEDS_EXPENSE"],
  ] as const)(
    "rechaza porcentaje %s e importe directo %s con %s",
    (proposedPercentage, proposedDeductibleAmountCents, expectedCode) => {
      const errors = errorCodes({
        ...validReviewOnlyOutput(),
        directTax: {
          taxType: "IRPF",
          proposedPercentage,
          proposedDeductibleAmountCents,
          explanation: "Propuesta que debe rechazarse.",
        },
      });

      expect(errors).toContain(expectedCode);
      expect(errors).toContain("INSUFFICIENT_SOURCES_WITH_AMOUNTS");
    },
  );

  it("rechaza una cuota de IVA superior al IVA soportado", () => {
    expect(
      errorCodes({
        ...validReviewOnlyOutput(),
        indirectTax: {
          taxType: "IVA",
          proposedPercentage: 100,
          proposedDeductibleAmountCents: INPUT.vatAmountCents + 1,
          explanation: "Propuesta que debe rechazarse.",
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        "AMOUNT_EXCEEDS_EXPENSE",
        "INSUFFICIENT_SOURCES_WITH_AMOUNTS",
      ]),
    );
  });

  it("exige que porcentaje e importe queden ambos pendientes o ambos propuestos", () => {
    expect(
      errorCodes({
        ...validReviewOnlyOutput(),
        directTax: {
          taxType: "IRPF",
          proposedPercentage: 50,
          proposedDeductibleAmountCents: null,
          explanation: "Propuesta incompleta.",
        },
      }),
    ).toContain("TAX_PROPOSAL_INCOMPLETE");
  });

  it("mantiene IRPF e IVA separados y rechaza otros tipos de impuesto", () => {
    expect(
      errorCodes({
        ...validReviewOnlyOutput(),
        directTax: {
          ...validReviewOnlyOutput().directTax,
          taxType: "IS",
        },
        indirectTax: {
          ...validReviewOnlyOutput().indirectTax,
          taxType: "IGIC",
        },
      }),
    ).toContain("TAX_TYPE_UNSUPPORTED");
  });

  it("rechaza fuentes inventadas, no suministradas o ajenas a la clasificación", () => {
    expect(
      errorCodes({
        ...validReviewOnlyOutput(),
        sourceIds: ["dgt-fuente-inventada-999"],
      }),
    ).toEqual(
      expect.arrayContaining(["SOURCE_INVENTED", "SOURCE_NOT_SUPPLIED"]),
    );

    expect(
      errorCodes({
        ...validReviewOnlyOutput(),
        sourceIds: [OFFICIAL_SOURCES.IRPF_VEHICLE_AFFECTATION.id],
      }),
    ).toContain("SOURCE_NOT_RELEVANT_TO_CLASSIFICATION");
  });

  it("rechaza una fuente suministrada cuyo estado no sea VERIFIED", () => {
    const unverifiedContext = {
      ...LEGAL_CONTEXT,
      legalFragments: [
        {
          ...LEGAL_CONTEXT.legalFragments[0],
          sourceId: OFFICIAL_SOURCES.DGT_VEHICLE_RUNNING_COSTS.id,
          verificationStatus: "PENDING_VERIFICATION",
        },
      ],
    } as unknown as FiscalAiContext;

    expect(
      errorCodes(
        {
          ...validReviewOnlyOutput(),
          classification: "UNCLASSIFIED",
          sourceIds: [OFFICIAL_SOURCES.DGT_VEHICLE_RUNNING_COSTS.id],
        },
        { suppliedContext: unverifiedContext },
      ),
    ).toContain("SOURCE_NOT_VERIFIED");
  });

  it("rechaza referencias jurídicas libres y datos sensibles en cualquier texto", () => {
    expect(
      errorCodes({
        ...validReviewOnlyOutput(),
        summary: "La Ley 99/9999 permite esta deducción.",
      }),
    ).toContain("UNSUPPORTED_LEGAL_REFERENCE");

    expect(
      errorCodes({
        ...validReviewOnlyOutput(),
        evidenceRequired: ["Enviar factura a persona@example.test"],
      }),
    ).toContain("OUTPUT_SENSITIVE_DATA");
  });

  it("no admite importes cuando las fuentes son insuficientes ni silencio sobre lo pendiente", () => {
    const withAmount = validReviewOnlyOutput({
      directTax: {
        taxType: "IRPF",
        proposedPercentage: 50,
        proposedDeductibleAmountCents: 5_000,
        explanation: "Importe no autorizado por el contexto disponible.",
      },
    });
    expect(errorCodes(withAmount)).toContain(
      "INSUFFICIENT_SOURCES_WITH_AMOUNTS",
    );

    expect(
      errorCodes(
        validReviewOnlyOutput({
          missingInformation: [],
        }),
      ),
    ).toContain("INSUFFICIENT_SOURCES_NOT_EXPLAINED");
  });

  it("impide que resúmenes review-only se conviertan en fuentes suficientes", () => {
    expect(
      errorCodes(
        validReviewOnlyOutput({
          sourcesSufficient: true,
        }),
      ),
    ).toContain("LEGAL_CONTEXT_REVIEW_ONLY");
  });

  it.each([
    [{ jurisdiction: "ES_CANARY_IGIC" }, "UNSUPPORTED_JURISDICTION"],
    [{ taxpayerType: "COMPANY_IS" }, "UNSUPPORTED_TAXPAYER"],
    [{ directTaxRegime: "UNKNOWN" }, "UNSUPPORTED_TAX_CONTEXT"],
    [{ vatRegime: "UNKNOWN" }, "UNSUPPORTED_TAX_CONTEXT"],
  ] as const)(
    "rechaza el contexto fiscal no soportado %o",
    (contextOverride, expectedCode) => {
      expect(
        errorCodes(validReviewOnlyOutput(), {
          context: { ...CONTEXT, ...contextOverride },
        }),
      ).toContain(expectedCode);
    },
  );
});
