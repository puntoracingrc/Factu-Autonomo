import { describe, expect, it, vi } from "vitest";
import {
  EXPENSE_ENGINE_PRIVACY_SCOPE,
  EXPENSE_MATH_CHECKS,
  normalizeExpenseEngineObservationV1,
} from "@/lib/expense-engine/contracts";
import { createExpenseLocalCandidateAvailableOutcomeV1 } from "@/lib/expense-engine/local-candidate.v1";
import type { Expense } from "@/lib/types";
import type { ExpenseScanPayload } from "./schema";
import {
  EXPENSE_LOCAL_SEMANTIC_SHADOW_TEST_SEAM,
  completeExpenseLocalSemanticShadowV1,
} from "./local-semantic-shadow.v1";

const ai: ExpenseScanPayload = {
  document: {
    kind: "expense_invoice",
    isExpenseDocument: true,
  },
  supplier: {
    name: "Proveedor Sintetico Unico",
    nif: "B12345678",
  },
  expense: {
    date: "2026-06-13",
    businessKind: "purchase_invoice",
    description: "Material sintetico privado",
    amount: 100,
    ivaPercent: 21,
    category: "Compras",
    paymentMethod: "Tarjeta",
    purchaseLines: [
      {
        description: "Linea privada unica",
        quantity: 1,
        unit: "ud",
        unitPrice: 100,
        total: 100,
      },
    ],
  },
  confidence: 0.93,
  warnings: [],
};

const human: Expense = {
  id: "scanned-expense-operation",
  createdAt: "2026-07-21T12:00:00.000Z",
  date: "2026-06-14",
  origin: "scan",
  businessKind: "purchase_invoice",
  supplierName: "Proveedor Corregido Privado",
  description: "Material confirmado privado",
  amount: 110,
  ivaPercent: 21,
  category: "Compras",
  paymentMethod: "Tarjeta",
  purchaseDocument: { supplierNif: "B87654321" },
  purchaseLines: [
    {
      id: "line-1",
      description: "Linea humana privada",
      quantity: 1,
      unit: "ud",
      unitPrice: 110,
      total: 110,
    },
  ],
};

function localCandidate() {
  return createExpenseLocalCandidateAvailableOutcomeV1({
    metadata: {
      structuralArchetypeId: "LINE_TABLE",
      documentKind: "EXPENSE_INVOICE",
      sourceQualityBucket: "HIGH",
      localConfidence: "HIGH",
      math: EXPENSE_MATH_CHECKS.map((check) => ({
        check,
        verdict: "MATCH" as const,
        residual: "EXACT" as const,
      })),
    },
    candidate: {
      documentKind: "EXPENSE_INVOICE",
      supplierName: "Proveedor Local Privado",
      supplierTaxId: "B99999999",
      invoiceNumber: "F-PRIVADA-1",
      date: "2026-06-13",
      taxBase: 100,
      taxPercent: 21,
      taxAmount: 21,
      total: 121,
      lines: [
        {
          description: "Linea local privada",
          unit: "ud",
          total: 100,
        },
      ],
    },
  });
}

function request() {
  return {
    ownerScope: "owner-synthetic",
    operationId: "operation-synthetic",
    documentId: "document-synthetic",
    file: {} as File,
  };
}

describe("expense local semantic shadow runtime v1", () => {
  it("starts without waiting and keeps the handle non-serializable", async () => {
    const runCandidate = vi.fn(async () => localCandidate());
    const handle = EXPENSE_LOCAL_SEMANTIC_SHADOW_TEST_SEAM!.startWithDependencies(
      request(),
      { runCandidate, now: () => 100 },
    );

    expect(JSON.stringify(handle)).toBeUndefined();
    expect(JSON.stringify({ handle })).toBe("{}");
    await Promise.resolve();
    expect(runCandidate).toHaveBeenCalledTimes(1);
  });

  it("emits only categorical observation data after durable human completion", async () => {
    const clock = vi
      .fn<() => number>()
      .mockReturnValueOnce(100)
      .mockReturnValue(480);
    const handle = EXPENSE_LOCAL_SEMANTIC_SHADOW_TEST_SEAM!.startWithDependencies(
      request(),
      { runCandidate: async () => localCandidate(), now: clock },
    );

    const observation = await completeExpenseLocalSemanticShadowV1({
      handle,
      ai,
      human,
      replayed: false,
    });

    expect(observation).not.toBeNull();
    expect(normalizeExpenseEngineObservationV1(observation)).toEqual(observation);
    expect(observation).toMatchObject({
      privacyScope: EXPENSE_ENGINE_PRIVACY_SCOPE,
      routeMode: "SHADOW_AI",
      localOutcome: "CANDIDATE",
      aiUsageBucket: "ONE",
      localDurationBucket: "LT_1_S",
      humanReviewStatus: "CORRECTED",
      learningHints: null,
    });
    expect(
      observation?.aiVsHuman.find(
        (comparison) => comparison.field === "EXPENSE_DATE",
      )?.verdict,
    ).toBe("CORRECTED");

    const serialized = JSON.stringify(observation);
    for (const forbidden of [
      "Proveedor",
      "B12345678",
      "B87654321",
      "B99999999",
      "F-PRIVADA-1",
      "Material",
      "Linea",
      "2026-06-13",
      "2026-06-14",
      "121",
      "110",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("drops durable replays without waiting for or evaluating the local result", async () => {
    const signals: AbortSignal[] = [];
    const handle = EXPENSE_LOCAL_SEMANTIC_SHADOW_TEST_SEAM!.startWithDependencies(
      request(),
      {
        runCandidate: async (value) => {
          signals.push(value.signal);
          return new Promise(() => undefined);
        },
        now: () => 100,
      },
    );
    await Promise.resolve();

    await expect(
      completeExpenseLocalSemanticShadowV1({
        handle,
        ai,
        human,
        replayed: true,
      }),
    ).resolves.toBeNull();
    expect(signals[0]?.aborted).toBe(true);
  });

  it("aborts abandoned work and cannot emit an observation afterwards", async () => {
    const signals: AbortSignal[] = [];
    const handle = EXPENSE_LOCAL_SEMANTIC_SHADOW_TEST_SEAM!.startWithDependencies(
      request(),
      {
        runCandidate: async (value) => {
          signals.push(value.signal);
          return new Promise(() => undefined);
        },
        now: () => 100,
      },
    );
    await Promise.resolve();

    handle.dispose();

    expect(signals[0]?.aborted).toBe(true);
    await expect(
      completeExpenseLocalSemanticShadowV1({
        handle,
        ai,
        human,
        replayed: false,
      }),
    ).resolves.toBeNull();
  });

  it("converts unexpected local failures into a closed FAILED observation", async () => {
    const handle = EXPENSE_LOCAL_SEMANTIC_SHADOW_TEST_SEAM!.startWithDependencies(
      request(),
      {
        runCandidate: async () => {
          throw new Error("synthetic failure");
        },
        now: () => 100,
      },
    );

    await expect(
      completeExpenseLocalSemanticShadowV1({
        handle,
        ai,
        human,
        replayed: false,
      }),
    ).resolves.toMatchObject({
      localOutcome: "FAILED",
      abstentionReason: "UNKNOWN",
      aiFallbackUsed: true,
      aiFallbackReason: "UNKNOWN",
    });
  });
});
