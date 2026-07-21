import { describe, expect, it } from "vitest";
import {
  EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
  EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
  EXPENSE_ENGINE_PRIVACY_SCOPE,
  EXPENSE_ENGINE_VERSION,
  EXPENSE_LEARNING_HINTS_SCHEMA_VERSION,
  expenseLearningStructureKeyV1,
  normalizeExpenseEngineObservationV1,
  normalizeExpenseLearningHintsV1,
} from "./contracts";

function validHints() {
  return {
    schemaVersion: EXPENSE_LEARNING_HINTS_SCHEMA_VERSION,
    layout: {
      pageMode: "SINGLE",
      readingOrder: "ROW_MAJOR",
      regionOrder: ["HEADER", "LINE_ITEMS", "TOTALS"],
      tableCount: "ONE",
    },
    columns: [
      {
        tableRole: "LINE_ITEMS",
        index: 0,
        role: "DESCRIPTION",
        normalizedLabel: "DESCRIPTION",
        unit: "TEXT",
        sign: "UNSIGNED",
        confidence: "HIGH",
      },
      {
        tableRole: "LINE_ITEMS",
        index: 1,
        role: "LINE_TOTAL",
        normalizedLabel: "LINE_TOTAL",
        unit: "EUR",
        sign: "SIGNED",
        confidence: "HIGH",
      },
    ],
    labels: [{ role: "TOTAL", region: "TOTALS", confidence: "HIGH" }],
    formulas: [
      {
        scope: "LINE",
        kind: "QUANTITY_X_NET_UNIT_PRICE",
        rounding: { mode: "HALF_UP", scale: 2 },
        sign: "SIGNED",
        confidence: "MEDIUM",
      },
    ],
  };
}

function validObservation() {
  return {
    schemaVersion: EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
    engineVersion: EXPENSE_ENGINE_VERSION,
    policyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
    privacyScope: EXPENSE_ENGINE_PRIVACY_SCOPE,
    structuralArchetypeId: "LINE_TABLE",
    documentKind: "EXPENSE_INVOICE",
    sourceQualityBucket: "HIGH",
    routeMode: "SHADOW_AI",
    localOutcome: "CANDIDATE",
    localConfidence: "HIGH",
    abstentionReason: null,
    aiFallbackUsed: false,
    aiFallbackReason: null,
    aiUsageBucket: "ONE",
    localDurationBucket: "LT_1_S",
    humanReviewStatus: "CORRECTED",
    localVsHuman: [{ field: "TAX_BASE", verdict: "MATCH" }],
    aiVsHuman: [{ field: "TAX_BASE", verdict: "CORRECTED" }],
    localVsAi: [{ field: "TAX_BASE", verdict: "CORRECTED" }],
    math: [
      {
        check: "DOCUMENT_TOTAL",
        verdict: "MATCH",
        residual: "CENT_TOLERANCE",
      },
    ],
    criticalFlags: [],
    learningHints: validHints(),
  };
}

describe("expense engine contracts", () => {
  it("normaliza solo vocabulario estructural cerrado", () => {
    const hints = normalizeExpenseLearningHintsV1(validHints());

    expect(hints).not.toBeNull();
    expect(expenseLearningStructureKeyV1(hints!)).toContain(
      "LINE_ITEMS:0:DESCRIPTION",
    );
  });

  it("descarta hints completos si aparece texto o identidad libre", () => {
    expect(
      normalizeExpenseLearningHintsV1({
        ...validHints(),
        supplierName: "Proveedor de una persona real",
      }),
    ).toBeNull();
    expect(
      normalizeExpenseLearningHintsV1({
        ...validHints(),
        columns: [
          {
            ...validHints().columns[0],
            normalizedLabel: "Cabecera original de la factura",
          },
        ],
      }),
    ).toBeNull();
  });

  it("acepta una observación sin valores de negocio", () => {
    const observation = normalizeExpenseEngineObservationV1(validObservation());

    expect(observation).not.toBeNull();
    const serialized = JSON.stringify(observation);
    expect(serialized).not.toContain("supplierName");
    expect(serialized).not.toContain("userId");
    expect(serialized).not.toContain("invoiceNumber");
    expect(serialized).not.toContain("amount");
  });

  it("rechaza identidad, valores exactos y estados incoherentes", () => {
    expect(
      normalizeExpenseEngineObservationV1({
        ...validObservation(),
        userId: "user-1",
      }),
    ).toBeNull();
    expect(
      normalizeExpenseEngineObservationV1({
        ...validObservation(),
        exactAmount: 123.45,
      }),
    ).toBeNull();
    expect(
      normalizeExpenseEngineObservationV1({
        ...validObservation(),
        localOutcome: "ABSTAINED",
        abstentionReason: null,
      }),
    ).toBeNull();
  });

  it("exige motivos de fallback coherentes y comparaciones únicas", () => {
    expect(
      normalizeExpenseEngineObservationV1({
        ...validObservation(),
        aiFallbackUsed: true,
        aiFallbackReason: null,
      }),
    ).toBeNull();
    expect(
      normalizeExpenseEngineObservationV1({
        ...validObservation(),
        localVsHuman: [
          { field: "TAX_BASE", verdict: "MATCH" },
          { field: "TAX_BASE", verdict: "CORRECTED" },
        ],
      }),
    ).toBeNull();
  });
});
