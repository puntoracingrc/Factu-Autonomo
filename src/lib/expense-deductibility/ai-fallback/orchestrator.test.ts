import { describe, expect, it } from "vitest";
import {
  fiscalAiFallbackTriggerFor,
  runFiscalAiFallbackAfterLocal,
} from "./orchestrator";
import {
  FiscalAiProviderError,
  type FiscalAiFallbackProvider,
  type FiscalAiProviderRequest,
  type FiscalAiProviderResponse,
} from "./provider";
import { FISCAL_AI_OUTPUT_SCHEMA_VERSION } from "./output";
import { evaluateExpense } from "@/lib/tax-engine/engine";
import { TaxEngineValidationError } from "@/lib/tax-engine/errors";
import { OFFICIAL_SOURCES } from "@/lib/tax-engine/sources";
import type {
  EvaluationResult,
  ExpenseInput,
  TaxContext,
} from "@/lib/tax-engine/types";

const INPUT: ExpenseInput = {
  concept: "licencia técnica especializada",
  supplierName: "PROVEEDOR-CANARY-PRIVATE",
  expenseDate: "2026-07-12",
  netAmountCents: 10_000,
  vatAmountCents: 2_100,
  totalAmountCents: 12_100,
  currency: "EUR",
  paymentMethod: "CARD",
  invoiceType: "FULL_INVOICE",
  extractedText: "OCR-CANARY-PRIVATE",
};

const CONTEXT: TaxContext = {
  jurisdiction: "ES_COMMON",
  taxpayerType: "SELF_EMPLOYED_IRPF",
  directTaxRegime: "DIRECT_ESTIMATION_SIMPLIFIED",
  vatRegime: "GENERAL",
  hasFullVatDeductionRight: true,
  activityDescription: "Consultoría",
  fiscalYear: 2026,
};

const METADATA = {
  evaluationId: "evaluation-ai-fallback-test",
  evaluatedAt: "2026-07-12T12:00:00.000Z",
} as const;

function localResult(
  input: ExpenseInput = INPUT,
  context: TaxContext = CONTEXT,
  answers: Record<string, string | boolean | number> = {},
): EvaluationResult {
  return evaluateExpense(input, context, answers, METADATA);
}

function validProviderResponse(
  request: FiscalAiProviderRequest,
): FiscalAiProviderResponse {
  return {
    output: {
      schemaVersion: FISCAL_AI_OUTPUT_SCHEMA_VERSION,
      classification: "MEALS_AND_HOSPITALITY",
      confidenceBand: "LOW",
      sourcesSufficient: false,
      summary: "Clasificación auxiliar pendiente de revisión profesional.",
      sourceIds: [OFFICIAL_SOURCES.IRPF_MAINTENANCE.id],
      missingInformation: [
        "Falta confirmar la relación concreta con la actividad.",
      ],
      evidenceRequired: ["Conserva justificante y prueba de pago."],
      directTax: {
        taxType: "IRPF",
        proposedPercentage: null,
        proposedDeductibleAmountCents: null,
        explanation: "El tratamiento directo queda pendiente.",
      },
      indirectTax: {
        taxType: "IVA",
        proposedPercentage: null,
        proposedDeductibleAmountCents: null,
        explanation: "El tratamiento indirecto queda pendiente.",
      },
    },
    modelId: "mock-fiscal-model",
    promptVersion: "mock-fiscal-prompt.v1",
    suppliedSourceIds: request.context.legalFragments.map(
      (fragment) => fragment.sourceId,
    ),
    metrics: {
      attempts: 1,
      durationMs: 17,
      inputTokens: 120,
      outputTokens: 40,
      totalTokens: 160,
    },
  };
}

class DeterministicProvider implements FiscalAiFallbackProvider {
  readonly calls: FiscalAiProviderRequest[] = [];

  constructor(
    private readonly responder: (
      request: FiscalAiProviderRequest,
    ) => Promise<FiscalAiProviderResponse> | FiscalAiProviderResponse =
      validProviderResponse,
  ) {}

  async evaluate(
    request: FiscalAiProviderRequest,
  ): Promise<FiscalAiProviderResponse> {
    this.calls.push(request);
    return this.responder(request);
  }
}

async function run(
  result: EvaluationResult,
  provider: FiscalAiFallbackProvider,
  options: {
    input?: ExpenseInput;
    context?: TaxContext;
    trigger?: "NO_MATCH" | "UNRESOLVABLE_AMBIGUITY" | null;
    signal?: AbortSignal;
  } = {},
) {
  return runFiscalAiFallbackAfterLocal({
    localResult: result,
    input: options.input ?? INPUT,
    context: options.context ?? CONTEXT,
    trigger:
      options.trigger === undefined
        ? fiscalAiFallbackTriggerFor(result)
        : options.trigger,
    provider,
    signal: options.signal,
  });
}

describe("runFiscalAiFallbackAfterLocal: activación local-first", () => {
  it("activa el proveedor una sola vez después de un NO_MATCH local", async () => {
    const local = localResult();
    const localBefore = structuredClone(local);
    const provider = new DeterministicProvider();

    expect(local.status).toBe("NO_MATCH");
    expect(fiscalAiFallbackTriggerFor(local)).toBe("NO_MATCH");

    const result = await run(local, provider);

    expect(provider.calls).toHaveLength(1);
    expect(local).toStrictEqual(localBefore);
    expect(result).toMatchObject({
      evaluationId: local.evaluationId,
      status: "NEEDS_REVIEW",
      risk: "UNDETERMINED",
      directTax: null,
      indirectTax: null,
      evaluationOrigin: "AI_FALLBACK",
      requiresHumanReview: true,
      aiFallback: {
        status: "PROPOSED",
        trigger: "NO_MATCH",
        modelId: "mock-fiscal-model",
        promptVersion: "mock-fiscal-prompt.v1",
        validatorErrorCodes: [],
        confidenceBand: "LOW",
        humanReviewRequired: true,
        providerAttempts: 1,
      },
    });
    expect(result.officialSources.map((source) => source.id)).toEqual([
      OFFICIAL_SOURCES.IRPF_MAINTENANCE.id,
    ]);
    expect(result.calculationTrace.slice(-2).map((step) => step.code)).toEqual([
      "local-engine-no-match",
      "ai-fallback-validated",
    ]);
  });

  it("admite una consulta cualitativa sin enviar importes reales", async () => {
    const input: ExpenseInput = {
      ...INPUT,
      amountsKnown: false,
      netAmountCents: 0,
      vatAmountCents: 0,
      totalAmountCents: 0,
    };
    const local = localResult(input);
    const provider = new DeterministicProvider();

    expect(local.status).toBe("NO_MATCH");
    const result = await run(local, provider, { input });

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      evaluationOrigin: "AI_FALLBACK",
      aiFallback: { status: "PROPOSED" },
    });
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]?.context.expense).toEqual({
      concept: "licencia",
      paymentMethod: "CARD",
      invoiceType: "FULL_INVOICE",
    });
  });

  it("admite una ambigüedad no resoluble marcada explícitamente", async () => {
    const ambiguous: EvaluationResult = {
      ...localResult(),
      status: "NEEDS_REVIEW",
      requiredQuestions: [],
      directTax: null,
      indirectTax: null,
      matchedRuleId: null,
      matchedRuleVersion: null,
      requiresHumanReview: true,
    };
    const provider = new DeterministicProvider();

    expect(fiscalAiFallbackTriggerFor(ambiguous)).toBeNull();
    const result = await run(ambiguous, provider, {
      trigger: "UNRESOLVABLE_AMBIGUITY",
    });

    expect(provider.calls).toHaveLength(1);
    expect(result.aiFallback).toMatchObject({
      status: "PROPOSED",
      trigger: "UNRESOLVABLE_AMBIGUITY",
    });
    expect(result.evaluationOrigin).toBe("AI_FALLBACK");
  });

  it("no activa el fallback si NO_MATCH no lleva un trigger admitido", async () => {
    const local = localResult();
    const provider = new DeterministicProvider();

    const result = await run(local, provider, { trigger: null });

    expect(result).toBe(local);
    expect(provider.calls).toHaveLength(0);
  });

  it("no llama para resultado resuelto, preguntas pendientes o caso no soportado", async () => {
    const resolved = localResult(
      { ...INPUT, concept: "comida" },
      CONTEXT,
      { "meal.purpose": "PERSONAL" },
    );
    const needsInput = localResult(
      { ...INPUT, concept: "comida" },
      CONTEXT,
    );
    const unsupportedContext: TaxContext = {
      ...CONTEXT,
      jurisdiction: "ES_CANARY_IGIC",
    };
    const unsupported = localResult(INPUT, unsupportedContext);
    const companyContext: TaxContext = {
      ...CONTEXT,
      taxpayerType: "COMPANY_IS",
    };
    const unsupportedCompany = localResult(INPUT, companyContext);

    expect(resolved.status).toBe("NEEDS_REVIEW");
    expect(needsInput.status).toBe("NEEDS_INPUT");
    expect(unsupported.status).toBe("UNSUPPORTED");
    expect(unsupportedCompany.status).toBe("UNSUPPORTED");

    for (const [candidate, context] of [
      [resolved, CONTEXT],
      [needsInput, CONTEXT],
      [unsupported, unsupportedContext],
      [unsupportedCompany, companyContext],
    ] as const) {
      const provider = new DeterministicProvider();
      const result = await run(candidate, provider, { context });
      expect(result).toBe(candidate);
      expect(provider.calls).toHaveLength(0);
    }
  });

  it("no llama cuando faltan respuestas o contexto fiscal local", async () => {
    const missingContext = localResult(INPUT, {
      ...CONTEXT,
      jurisdiction: "UNKNOWN",
      taxpayerType: "UNKNOWN",
      directTaxRegime: "UNKNOWN",
      vatRegime: "UNKNOWN",
      hasFullVatDeductionRight: false,
      activityDescription: "",
    });
    const localQuestion: EvaluationResult = {
      ...localResult(),
      status: "NEEDS_INPUT",
      requiredQuestions: [
        {
          id: "expense.manualCategory",
          prompt: "Selecciona la categoría local.",
          type: "SINGLE_CHOICE",
          required: true,
        },
      ],
      missingInformation: ["Selecciona la categoría local."],
    };

    for (const candidate of [missingContext, localQuestion]) {
      const provider = new DeterministicProvider();
      const result = await run(candidate, provider, {
        trigger: "UNRESOLVABLE_AMBIGUITY",
      });
      expect(result).toBe(candidate);
      expect(provider.calls).toHaveLength(0);
    }
  });

  it("no usa NEEDS_REVIEW jurídico o documental como permiso genérico", async () => {
    const pendingRule: EvaluationResult = {
      ...localResult(),
      status: "NEEDS_REVIEW",
      matchedRuleId: "es-common.irpf-vat.meals-hospitality",
      matchedRuleVersion: "1.0.0",
      requiredQuestions: [],
      requiresHumanReview: true,
    };
    const documentaryReview: EvaluationResult = {
      ...localResult(),
      status: "NEEDS_REVIEW",
      requiredQuestions: [
        {
          id: "document.confirmation",
          prompt: "Confirma el justificante.",
          type: "BOOLEAN",
          required: true,
        },
      ],
      requiresHumanReview: true,
    };

    for (const candidate of [pendingRule, documentaryReview]) {
      const provider = new DeterministicProvider();
      const result = await run(candidate, provider, {
        trigger: "UNRESOLVABLE_AMBIGUITY",
      });
      expect(result).toBe(candidate);
      expect(provider.calls).toHaveLength(0);
    }
  });

  it("una entrada inválida falla en el motor local antes de existir llamada externa", () => {
    const provider = new DeterministicProvider();

    expect(() =>
      localResult({
        ...INPUT,
        netAmountCents: -1,
      }),
    ).toThrow(TaxEngineValidationError);
    expect(provider.calls).toHaveLength(0);
  });
});

describe("runFiscalAiFallbackAfterLocal: rechazo, errores y privacidad", () => {
  it("descarta una salida inválida y conserva el resultado local", async () => {
    const local = localResult();
    const provider = new DeterministicProvider((request) => ({
      ...validProviderResponse(request),
      output: {
        ...(
          validProviderResponse(request).output as Record<string, unknown>
        ),
        sourceIds: ["fuente-inventada"],
      },
    }));

    const result = await run(local, provider);

    expect(result).toMatchObject({
      status: "NO_MATCH",
      evaluationOrigin: "LOCAL_RULE",
      requiresHumanReview: true,
      aiFallback: {
        status: "REJECTED",
        citedSourceIds: [],
        confidenceBand: null,
      },
    });
    expect(result.aiFallback?.validatorErrorCodes).toEqual(
      expect.arrayContaining(["SOURCE_INVENTED", "SOURCE_NOT_SUPPLIED"]),
    );
    expect(result.officialSources).toEqual([]);
  });

  it("rechaza si el proveedor afirma haber recibido un corpus distinto", async () => {
    const provider = new DeterministicProvider((request) => ({
      ...validProviderResponse(request),
      suppliedSourceIds: ["fuente-ajena"],
    }));

    const result = await run(localResult(), provider);

    expect(result.aiFallback).toMatchObject({
      status: "REJECTED",
      validatorErrorCodes: ["SOURCE_NOT_SUPPLIED"],
      citedSourceIds: [],
    });
    expect(result.evaluationOrigin).toBe("LOCAL_RULE");
  });

  it.each([
    ["PROVIDER_TIMEOUT", 2],
    ["PROVIDER_ABORTED", 1],
    ["PROVIDER_TRANSIENT_ERROR", 2],
    ["PROVIDER_NON_TRANSIENT_ERROR", 1],
  ] as const)(
    "convierte %s en fallo seguro sin inventar propuesta",
    async (code, attempts) => {
      const provider = new DeterministicProvider(() => {
        throw new FiscalAiProviderError(code, {
          attempts,
          durationMs: 25,
        });
      });

      const result = await run(localResult(), provider);

      expect(provider.calls).toHaveLength(1);
      expect(result).toMatchObject({
        status: "NO_MATCH",
        evaluationOrigin: "LOCAL_RULE",
        directTax: null,
        indirectTax: null,
        aiFallback: {
          status: "FAILED",
          validatorErrorCodes: [code],
          providerAttempts: attempts,
          confidenceBand: null,
          humanReviewRequired: true,
        },
      });
    },
  );

  it("propaga la señal al mock sin incluir Expense, proveedor ni OCR en su contexto", async () => {
    const controller = new AbortController();
    const provider = new DeterministicProvider();

    const result = await run(localResult(), provider, {
      signal: controller.signal,
    });
    const request = provider.calls[0];
    const serializedRequest = JSON.stringify(request);

    expect(request?.signal).toBe(controller.signal);
    expect(serializedRequest).not.toMatch(
      /PROVEEDOR-CANARY-PRIVATE|OCR-CANARY-PRIVATE|supplierName|extractedText|localResult/,
    );
    expect(result.aiFallback?.status).toBe("PROPOSED");
  });

  it("serializa solo metadata segura, fuentes citadas y revisión humana", async () => {
    const result = await run(
      localResult(),
      new DeterministicProvider(),
    );
    const serialized = JSON.stringify(result);

    expect(JSON.parse(serialized)).toEqual(result);
    expect(serialized).not.toMatch(
      /PROVEEDOR-CANARY-PRIVATE|OCR-CANARY-PRIVATE|OPENAI_API_KEY|sk-proj|rawOutput|promptText/,
    );
    expect(serialized).toContain("Propuesta de IA pendiente de revisión");
    expect(result.aiFallback?.humanReviewRequired).toBe(true);
    expect(result.directTax).toBeNull();
    expect(result.indirectTax).toBeNull();
  });
});
