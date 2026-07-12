import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateExpense } from "./engine";
import { TaxEngineConfigurationError } from "./errors";
import {
  DisabledFallbackEvaluator,
  type DisabledFallbackRequest,
} from "./fallback";
import { isRuleEffective, matchExpenseRule } from "./matcher";
import { normalizeComparableText, normalizeConcept } from "./normalizers";
import { createRuleRegistry } from "./rule-registry";
import { OFFICIAL_SOURCES } from "./sources";
import type {
  EvaluationDecision,
  ExpenseInput,
  RuleDefinition,
  RuleEvaluator,
  TaxContext,
} from "./types";

const METADATA = {
  evaluationId: "evaluation-matcher-test",
  evaluatedAt: "2026-07-12T11:00:00.000Z",
} as const;

const BASE_INPUT: ExpenseInput = {
  concept: "combustible",
  expenseDate: "2026-07-12",
  netAmountCents: 1_000,
  vatAmountCents: 210,
  totalAmountCents: 1_210,
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
  activityDescription: "Actividad de prueba",
  fiscalYear: 2026,
};

const RESOLVED_DECISION: EvaluationDecision = {
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

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeRule(overrides: Partial<RuleDefinition> = {}): RuleDefinition {
  return {
    id: "test.vehicle-running-costs",
    version: "1.0.0",
    effectiveFrom: "2026-01-01",
    supportedJurisdictions: ["ES_COMMON"],
    supportedTaxpayerTypes: ["SELF_EMPLOYED_IRPF"],
    category: "VEHICLE_RUNNING_COSTS",
    canonicalConcept: "combustible",
    aliases: ["gasolina", "diésel", "repostaje"],
    conditionalQuestions: [],
    evaluator: () => RESOLVED_DECISION,
    officialSources: [OFFICIAL_SOURCES.IRPF_VEHICLE_AFFECTATION],
    legalReviewStatus: "APPROVED",
    ...overrides,
  };
}

describe("normalización fiscal del concepto", () => {
  it("conserva el original y normaliza mayúsculas, acentos, puntuación y espacios", () => {
    const original = "  DIÉSEL,  estación-de servicio!!! ";
    const normalized = normalizeConcept(original);

    expect(normalized).toEqual({
      original,
      comparable: "diesel estacion de servicio",
      tokens: ["diesel", "estacion", "de", "servicio"],
    });
    expect(normalizeComparableText("Menú\tdiario")).toBe("menu diario");
  });

  it("trabaja por palabras completas y no confunde «bar» con «barco»", () => {
    const rule = makeRule({
      canonicalConcept: "restauración",
      aliases: ["bar"],
      category: "MEALS_AND_HOSPITALITY",
    });

    expect(
      matchExpenseRule(
        { ...BASE_INPUT, concept: "reparación de barco" },
        BASE_CONTEXT,
        [rule],
      ),
    ).toEqual({ status: "NO_MATCH", selected: null, candidates: [] });
  });
});

describe("matcher determinista", () => {
  it.each([
    ["COMBUSTÍBLE", "EXACT", 100],
    ["Gasolina", "ALIAS", 95],
    ["repostaje urgente", "TOKEN", 79],
  ] as const)(
    "clasifica «%s» como %s con su puntuación auditable",
    (concept, matchedBy, score) => {
      const match = matchExpenseRule(
        { ...BASE_INPUT, concept },
        BASE_CONTEXT,
        [makeRule()],
      );

      expect(match.status).toBe("MATCH");
      expect(match.selected).toMatchObject({ matchedBy, score });
      expect(match.selected?.reason).not.toBe("");
    },
  );

  it("permite una categoría manual aun cuando el texto no coincide", () => {
    const match = matchExpenseRule(
      {
        ...BASE_INPUT,
        concept: "concepto deliberadamente desconocido",
        manualCategory: "VEHICLE_RUNNING_COSTS",
      },
      BASE_CONTEXT,
      [makeRule()],
    );

    expect(match).toMatchObject({
      status: "MATCH",
      selected: {
        matchedBy: "MANUAL_CATEGORY",
        score: 100,
      },
    });
  });

  it("convierte dos coincidencias equivalentes en NEEDS_INPUT para elegir categoría", () => {
    const vehicleEvaluator = vi.fn(() => RESOLVED_DECISION);
    const mealEvaluator = vi.fn(() => RESOLVED_DECISION);
    const rules = [
      makeRule({
        id: "test.vehicle",
        canonicalConcept: "servicio compartido",
        aliases: ["servicio"],
        evaluator: vehicleEvaluator,
      }),
      makeRule({
        id: "test.meal",
        category: "MEALS_AND_HOSPITALITY",
        canonicalConcept: "servicio compartido",
        aliases: ["servicio"],
        evaluator: mealEvaluator,
      }),
    ];

    const result = evaluateExpense(
      { ...BASE_INPUT, concept: "servicio" },
      BASE_CONTEXT,
      {},
      METADATA,
      rules,
    );

    expect(result).toMatchObject({
      status: "NEEDS_INPUT",
      risk: "UNDETERMINED",
      matchedRuleId: null,
      matchedRuleVersion: null,
      matchedBy: "NONE",
      directTax: null,
      indirectTax: null,
    });
    expect(result.requiredQuestions).toContainEqual(
      expect.objectContaining({
        id: "expense.manualCategory",
        options: expect.arrayContaining([
          expect.objectContaining({ value: "MEALS_AND_HOSPITALITY" }),
          expect.objectContaining({ value: "VEHICLE_RUNNING_COSTS" }),
        ]),
      }),
    );
    expect(vehicleEvaluator).not.toHaveBeenCalled();
    expect(mealEvaluator).not.toHaveBeenCalled();
  });

  it("devuelve NO_MATCH sin inventar resultados fiscales", () => {
    const result = evaluateExpense(
      { ...BASE_INPUT, concept: "licencia tipográfica" },
      BASE_CONTEXT,
      {},
      METADATA,
      [],
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
      calculationTrace: [],
    });
    expect(result.warnings.join(" ")).toMatch(/no se ha inventado/i);
  });
});

describe("vigencia y retirada de reglas", () => {
  it.each([
    ["inicio inclusivo", "2026-01-01", "PENDING_REVIEW", true],
    ["fin inclusivo", "2026-12-31", "APPROVED", true],
    ["antes del inicio", "2025-12-31", "APPROVED", false],
    ["después del fin", "2027-01-01", "APPROVED", false],
    ["borrador", "2026-06-01", "DRAFT", false],
    ["retirada", "2026-06-01", "RETIRED", false],
  ] as const)("calcula correctamente la vigencia: %s", (_label, date, status, expected) => {
    const rule = makeRule({
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      legalReviewStatus: status,
    });

    expect(isRuleEffective(rule, date)).toBe(expected);
  });

  it.each([
    {
      label: "fuera de vigencia",
      rule: { effectiveFrom: "2025-01-01", effectiveTo: "2025-12-31" },
    },
    {
      label: "RETIRED",
      rule: { legalReviewStatus: "RETIRED" as const },
    },
  ])("no ejecuta una regla $label", ({ rule: overrides }) => {
    const evaluator: RuleEvaluator = vi.fn(() => RESOLVED_DECISION);
    const result = evaluateExpense(
      BASE_INPUT,
      BASE_CONTEXT,
      {},
      METADATA,
      [makeRule({ ...overrides, evaluator })],
    );

    expect(result.status).toBe("NO_MATCH");
    expect(evaluator).not.toHaveBeenCalled();
  });
});

describe("registro versionado de reglas", () => {
  it("rechaza reglas sin fuentes oficiales", () => {
    expect(() =>
      createRuleRegistry([makeRule({ officialSources: [] })]),
    ).toThrow(/fuentes oficiales/i);
  });

  it.each(["APPROVED", "PENDING_REVIEW"] as const)(
    "rechaza fuentes pendientes en una regla ejecutable %s",
    (legalReviewStatus) => {
      expect(() =>
        createRuleRegistry([
          makeRule({
            legalReviewStatus,
            officialSources: [
              OFFICIAL_SOURCES.DGT_VEHICLE_RUNNING_COSTS,
            ],
          }),
        ]),
      ).toThrow(/regla ejecutable.*fuente sin verificar/i);
    },
  );

  it.each(["DRAFT", "RETIRED"] as const)(
    "permite documentar fuentes pendientes en una regla no ejecutable %s",
    (legalReviewStatus) => {
      const registry = createRuleRegistry([
        makeRule({
          legalReviewStatus,
          officialSources: [OFFICIAL_SOURCES.DGT_VEHICLE_RUNNING_COSTS],
        }),
      ]);

      expect(registry).toHaveLength(1);
      expect(registry[0].officialSources[0].verificationStatus).toBe(
        "PENDING_VERIFICATION",
      );
    },
  );

  it("rechaza el mismo id y versión duplicados", () => {
    const rule = makeRule();

    expect(() => createRuleRegistry([rule, { ...rule }])).toThrowError(
      new TaxEngineConfigurationError(
        "Regla duplicada: test.vehicle-running-costs@1.0.0.",
      ),
    );
  });

  it("rechaza versiones activas con intervalos de vigencia solapados", () => {
    expect(() =>
      createRuleRegistry([
        makeRule({
          version: "1.0.0",
          effectiveFrom: "2026-01-01",
          effectiveTo: "2026-12-31",
        }),
        makeRule({
          version: "2.0.0",
          effectiveFrom: "2026-07-01",
        }),
      ]),
    ).toThrowError(/Versiones solapadas/);
  });

  it("acepta versiones no solapadas y las ordena por fecha efectiva", () => {
    const registry = createRuleRegistry([
      makeRule({ version: "2.0.0", effectiveFrom: "2026-01-01" }),
      makeRule({
        version: "1.0.0",
        effectiveFrom: "2025-01-01",
        effectiveTo: "2025-12-31",
      }),
    ]);

    expect(registry.map((rule) => rule.version)).toEqual(["1.0.0", "2.0.0"]);
  });

  it("permite conservar una versión RETIRED solapada en el historial", () => {
    const registry = createRuleRegistry([
      makeRule({ version: "1.0.0", legalReviewStatus: "RETIRED" }),
      makeRule({ version: "2.0.0" }),
    ]);

    expect(registry).toHaveLength(2);
  });
});

describe("fallback deshabilitado", () => {
  function fallbackRequest(): DisabledFallbackRequest {
    const localResult = evaluateExpense(
      { ...BASE_INPUT, concept: "licencia tipográfica" },
      BASE_CONTEXT,
      {},
      METADATA,
      [],
    );
    return {
      localResult,
      verifiedSources: [OFFICIAL_SOURCES.IRPF_VEHICLE_AFFECTATION],
    };
  }

  it("conserva el resultado local y no realiza ninguna llamada externa", async () => {
    const fallback = new DisabledFallbackEvaluator();
    const externalCall = vi.fn();
    vi.stubGlobal("fetch", externalCall);
    const request = fallbackRequest();

    const result = await fallback.evaluate(request);

    expect(result).toMatchObject({
      ...METADATA,
      status: "NO_MATCH",
      risk: "UNDETERMINED",
      matchedRuleId: null,
      matchedRuleVersion: null,
      matchedBy: "NONE",
      matchScore: 0,
      directTax: null,
      indirectTax: null,
      officialSources: [],
      requiresHumanReview: true,
    });
    expect(result.matchReason).toBe(request.localResult.matchReason);
    expect(result.calculationTrace).toEqual(
      request.localResult.calculationTrace,
    );
    expect(result.warnings.join(" ")).toMatch(/resultado del motor local/i);
    expect(result.warnings.join(" ")).toMatch(/ninguna llamada externa/i);
    expect(request.localResult.warnings).not.toEqual(result.warnings);
    expect(externalCall).not.toHaveBeenCalled();
  });

  it("rechaza fuentes no verificadas tanto en el corpus como en el resultado local", async () => {
    const fallback = new DisabledFallbackEvaluator();
    const baseRequest = fallbackRequest();
    const pendingCorpus = {
      ...baseRequest,
      verifiedSources: [OFFICIAL_SOURCES.DGT_VEHICLE_RUNNING_COSTS],
    } as unknown as DisabledFallbackRequest;
    const pendingLocalResult = {
      ...baseRequest,
      localResult: {
        ...baseRequest.localResult,
        officialSources: [OFFICIAL_SOURCES.DGT_VEHICLE_RUNNING_COSTS],
      },
    } as DisabledFallbackRequest;

    await expect(fallback.evaluate(pendingCorpus)).rejects.toThrow(
      /fuente sin verificar/i,
    );
    await expect(fallback.evaluate(pendingLocalResult)).rejects.toThrow(
      /fuente sin verificar/i,
    );
  });

  it("rechaza la ejecución sin corpus o sin un estado local apto para fallback", async () => {
    const fallback = new DisabledFallbackEvaluator();
    const baseRequest = fallbackRequest();

    await expect(
      fallback.evaluate({ ...baseRequest, verifiedSources: [] }),
    ).rejects.toThrow(/corpus de fuentes oficiales verificadas/i);
    await expect(
      fallback.evaluate({
        ...baseRequest,
        localResult: { ...baseRequest.localResult, status: "NEEDS_INPUT" },
      }),
    ).rejects.toThrow(/resultado local NO_MATCH explícito/i);
    await expect(
      fallback.evaluate({
        ...baseRequest,
        localResult: { ...baseRequest.localResult, status: "NEEDS_REVIEW" },
      }),
    ).rejects.toThrow(/resultado local NO_MATCH explícito/i);
  });

  it("rechaza entradas fiscales y campos personales adicionales", async () => {
    const fallback = new DisabledFallbackEvaluator();
    const baseRequest = fallbackRequest();
    const withPersonalInput = {
      ...baseRequest,
      supplierName: "Proveedor Persona SL",
    } as unknown as DisabledFallbackRequest;

    await expect(fallback.evaluate(withPersonalInput)).rejects.toThrow(
      /no admite entradas fiscales ni datos personales/i,
    );
  });
});
