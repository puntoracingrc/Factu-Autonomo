import { describe, expect, it } from "vitest";
import { createEvaluationSnapshot } from "./index";
import {
  evaluateExpense,
  type ExpenseAnswers,
  type ExpenseInput,
  type TaxContext,
} from "@/lib/tax-engine";

const INPUT: ExpenseInput = {
  concept: "  Cómida!!  ",
  supplierName: "Restaurante de prueba",
  expenseDate: "2026-07-12",
  netAmountCents: 2_000,
  vatAmountCents: 200,
  totalAmountCents: 2_200,
  currency: "EUR",
  paymentMethod: "CARD",
  invoiceType: "FULL_INVOICE",
  extractedText: "NIF y texto fiscal sensible que no debe persistirse",
  answers: { "embedded.audit": "respuesta original" },
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

const ANSWERS: ExpenseAnswers = {
  "meal.purpose": "PERSONAL",
};

const METADATA = {
  evaluationId: "evaluation-snapshot-1",
  evaluatedAt: "2026-07-12T10:20:30.000Z",
};

function snapshot(userDecision: "PENDING" | "CONFIRMED" | "REJECTED" = "PENDING") {
  const result = evaluateExpense(INPUT, CONTEXT, ANSWERS, METADATA);
  return createEvaluationSnapshot({
    input: INPUT,
    context: CONTEXT,
    answers: ANSWERS,
    result,
    actor: {
      userId: "user-from-server",
    },
    sourceExpenseId: "expense-42",
    userDecision,
    userDecisionAt:
      userDecision === "PENDING" ? null : "2026-07-12T10:25:00.000Z",
  });
}

describe("EvaluationSnapshot", () => {
  it("conserva auditoría normalizada y separa la identidad de la entrada fiscal", () => {
    const value = snapshot();

    expect(value).toMatchObject({
      schemaVersion: "1",
      evaluationId: METADATA.evaluationId,
      evaluatedAt: METADATA.evaluatedAt,
      matchedRuleId: "es-common.irpf-vat.meals-hospitality",
      matchedRuleVersion: "1.0.0",
      userId: "user-from-server",
      sourceExpenseId: "expense-42",
      userDecision: "PENDING",
      userDecisionAt: null,
      answers: ANSWERS,
      normalizedInput: {
        concept: INPUT.concept,
        originalConcept: INPUT.concept,
        normalizedConcept: "comida",
        conceptTokens: ["comida"],
        netAmountCents: 2_000,
        vatAmountCents: 200,
        totalAmountCents: 2_200,
      },
      context: CONTEXT,
    });
    expect(value.officialSources).toEqual(value.result.officialSources);
    expect(value.calculationTrace).toEqual(value.result.calculationTrace);
    expect(value.normalizedInput).not.toHaveProperty("answers");
    expect(value.normalizedInput).not.toHaveProperty("extractedText");
    expect(value.result).not.toHaveProperty("userId");
    expect(value).not.toHaveProperty("tenantId");
    expect(value.context).not.toBe(CONTEXT);
    expect(value.result).not.toBe(
      evaluateExpense(INPUT, CONTEXT, ANSWERS, METADATA),
    );
  });

  it("es serializable a JSON sin BigInt, undefined ni texto extraído", () => {
    const value = snapshot("REJECTED");
    const serialized = JSON.stringify(value);
    const restored = JSON.parse(serialized);

    expect(restored).toEqual(value);
    expect(serialized).not.toContain(
      "NIF y texto fiscal sensible que no debe persistirse",
    );
    expect(serialized).not.toContain("extractedText");
    expect(serialized).not.toContain("undefined");
    expect(() => structuredClone(value)).not.toThrow();
  });

  it("exige una fecha válida para decisiones confirmadas o rechazadas", () => {
    const result = evaluateExpense(INPUT, CONTEXT, ANSWERS, METADATA);

    expect(() =>
      createEvaluationSnapshot({
        input: INPUT,
        context: CONTEXT,
        answers: ANSWERS,
        result,
        actor: { userId: "user" },
        userDecision: "CONFIRMED",
      }),
    ).toThrow(/fecha de decisión/i);
    expect(() =>
      createEvaluationSnapshot({
        input: INPUT,
        context: CONTEXT,
        answers: ANSWERS,
        result,
        actor: { userId: "user" },
        userDecision: "PENDING",
        userDecisionAt: "2026-07-12T10:25:00.000Z",
      }),
    ).toThrow(/fecha de decisión/i);
  });

  it("rechaza snapshots sin identidad de usuario", () => {
    const result = evaluateExpense(INPUT, CONTEXT, ANSWERS, METADATA);

    expect(() =>
      createEvaluationSnapshot({
        input: INPUT,
        context: CONTEXT,
        answers: ANSWERS,
        result,
        actor: { userId: "" },
      }),
    ).toThrow(/identidad/i);
  });

  it("omite el vínculo a Expense cuando no existe gasto canónico de origen", () => {
    const result = evaluateExpense(INPUT, CONTEXT, ANSWERS, METADATA);
    const value = createEvaluationSnapshot({
      input: INPUT,
      context: CONTEXT,
      answers: ANSWERS,
      result,
      actor: { userId: "user" },
    });

    expect(value).not.toHaveProperty("sourceExpenseId");
    expect(JSON.stringify(value)).not.toContain("tenantId");
  });

  it("serializa metadata IA acotada sin prompt, salida cruda ni secretos", () => {
    const local = evaluateExpense(
      { ...INPUT, concept: "servicio desconocido" },
      CONTEXT,
      {},
      METADATA,
    );
    const result = {
      ...local,
      status: "NEEDS_REVIEW" as const,
      evaluationOrigin: "AI_FALLBACK" as const,
      warnings: [...local.warnings, "Propuesta pendiente de revisión."],
      aiFallback: {
        status: "PROPOSED" as const,
        trigger: "NO_MATCH" as const,
        promptVersion: "fiscal-expense-fallback-2026-07-12.v1",
        modelId: "modelo-configurado",
        suppliedSourceIds: ["boe-liva-97"],
        citedSourceIds: [],
        sourceVerificationStatus: "VERIFIED" as const,
        validatorErrorCodes: [],
        durationMs: 50,
        providerAttempts: 1,
        inputTokens: 100,
        outputTokens: 40,
        totalTokens: 140,
        confidenceBand: "LOW" as const,
        humanReviewRequired: true as const,
        proposalSummary: "Clasificación auxiliar sin cálculo definitivo.",
        classification: "UNCLASSIFIED" as const,
        missingLegalContext: ["Falta una fuente específica."],
        taxProposals: [
          {
            taxType: "IRPF" as const,
            proposedPercentage: null,
            proposedDeductibleAmountCents: null,
            explanation: "Pendiente de revisión.",
          },
          {
            taxType: "IVA" as const,
            proposedPercentage: null,
            proposedDeductibleAmountCents: null,
            explanation: "Pendiente de revisión.",
          },
        ],
      },
    };
    const unsafeResult = {
      ...result,
      systemPrompt: "systemPrompt con sk-top-secret",
      aiFallback: {
        ...result.aiFallback,
        rawOutput: "NIF 12345678Z y sk-raw-secret",
        apiKey: "sk-injected-secret",
      },
    } as typeof result;
    const value = createEvaluationSnapshot({
      input: INPUT,
      context: CONTEXT,
      answers: {},
      result: unsafeResult,
      actor: { userId: "user-from-server" },
    });
    const serialized = JSON.stringify(value);

    expect(JSON.parse(serialized).result.aiFallback).toEqual(result.aiFallback);
    expect(serialized).not.toContain("OPENAI_API_KEY");
    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain("rawOutput");
    expect(serialized).not.toContain("systemPrompt");
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("12345678Z");
    expect(serialized).not.toContain(INPUT.extractedText!);
  });
});
