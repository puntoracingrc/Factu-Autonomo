import { describe, expect, it } from "vitest";
import {
  compareExpenseEngineSnapshotsV1,
  evaluateExpenseEngineSnapshotsV1,
  evaluateExpenseLocalCandidateV1,
} from "./evaluation.v1";
import { createExpenseLocalCandidateAvailableOutcomeV1 } from "./local-candidate.v1";

const HUMAN = {
  documentKind: "EXPENSE_INVOICE" as const,
  expenseDate: "2026-07-21",
  supplierIdentityPresent: true,
  category: "Material",
  taxRate: 21,
  taxBase: 100,
  taxAmount: 21,
  totalAmount: 121,
  paymentMethod: "Transferencia",
  lines: [
    { unit: "ud", total: 60 },
    { unit: "ud", total: 40 },
  ],
};

describe("expense engine evaluation v1", () => {
  it("compara local, IA y validación humana sin devolver valores", () => {
    const result = evaluateExpenseEngineSnapshotsV1({
      local: HUMAN,
      ai: {
        ...HUMAN,
        category: "Otros",
        totalAmount: 120,
      },
      human: HUMAN,
    });

    expect(
      result.localVsHuman.find((entry) => entry.field === "TOTAL_AMOUNT"),
    ).toEqual({ field: "TOTAL_AMOUNT", verdict: "MATCH" });
    expect(
      result.aiVsHuman.find((entry) => entry.field === "TOTAL_AMOUNT"),
    ).toEqual({ field: "TOTAL_AMOUNT", verdict: "CORRECTED" });
    expect(
      result.localVsAi.find((entry) => entry.field === "CATEGORY"),
    ).toEqual({ field: "CATEGORY", verdict: "CORRECTED" });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("Material");
    expect(serialized).not.toContain("Transferencia");
    expect(serialized).not.toContain("121");
  });

  it("trata la ausencia de verdad de referencia como abstención", () => {
    const comparisons = compareExpenseEngineSnapshotsV1(HUMAN, undefined);

    expect(comparisons).toHaveLength(14);
    expect(comparisons.every((entry) => entry.verdict === "ABSTAINED")).toBe(
      true,
    );
  });

  it("marca como missing un campo confirmado que el candidato no leyó", () => {
    const comparisons = compareExpenseEngineSnapshotsV1(
      { ...HUMAN, taxAmount: undefined },
      HUMAN,
    );

    expect(comparisons.find((entry) => entry.field === "TAX_AMOUNT")).toEqual({
      field: "TAX_AMOUNT",
      verdict: "MISSING",
    });
  });

  it("aplica tolerancia monetaria y normalización de texto", () => {
    const comparisons = compareExpenseEngineSnapshotsV1(
      {
        ...HUMAN,
        category: "  material ",
        totalAmount: 121.02,
        lines: [
          { unit: "UD", total: 60.01 },
          { unit: "ud", total: 39.99 },
        ],
      },
      HUMAN,
    );

    for (const field of [
      "CATEGORY",
      "TOTAL_AMOUNT",
      "LINE_UNITS",
      "LINE_TOTALS",
    ] as const) {
      expect(comparisons.find((entry) => entry.field === field)?.verdict).toBe(
        "MATCH",
      );
    }
  });

  it("consume el candidato efímero sin devolver sus valores", () => {
    const local = createExpenseLocalCandidateAvailableOutcomeV1({
      metadata: {
        structuralArchetypeId: "LINE_TABLE",
        documentKind: "EXPENSE_INVOICE",
        sourceQualityBucket: "HIGH",
        localConfidence: "HIGH",
        math: [],
      },
      candidate: {
        documentKind: "EXPENSE_INVOICE",
        supplierName: "Proveedor privado",
        supplierTaxId: "B00000000",
        date: HUMAN.expenseDate,
        taxBase: HUMAN.taxBase,
        taxPercent: HUMAN.taxRate,
        taxAmount: HUMAN.taxAmount,
        total: HUMAN.totalAmount,
        lines: HUMAN.lines.map((line, index) => ({
          description: `Producto privado ${index}`,
          unit: line.unit,
          total: line.total,
        })),
      },
    });
    const result = evaluateExpenseLocalCandidateV1({
      local,
      ai: HUMAN,
      human: HUMAN,
    });

    expect(
      result.localVsHuman.find((entry) => entry.field === "TOTAL_AMOUNT"),
    ).toEqual({ field: "TOTAL_AMOUNT", verdict: "MATCH" });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("Proveedor privado");
    expect(serialized).not.toContain("B00000000");
    expect(serialized).not.toContain("Producto privado");
    expect(serialized).not.toContain(String(HUMAN.totalAmount));
  });
});
