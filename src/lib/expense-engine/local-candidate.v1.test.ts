import { describe, expect, it } from "vitest";
import {
  createEphemeralExpenseLocalCandidateV1,
  createExpenseLocalCandidateAbstainedOutcomeV1,
  createExpenseLocalCandidateAvailableOutcomeV1,
} from "./local-candidate.v1";

const PRIVATE_SUPPLIER = "Proveedor Privado SL";
const PRIVATE_TAX_ID = "B00000000";

function candidate() {
  return {
    documentKind: "EXPENSE_INVOICE" as const,
    supplierName: PRIVATE_SUPPLIER,
    supplierTaxId: PRIVATE_TAX_ID,
    invoiceNumber: "F-2026-001",
    date: "2026-07-21",
    taxBase: 100,
    taxPercent: 21,
    taxAmount: 21,
    total: 121,
    lines: [
      {
        reference: "REF-1",
        description: "Producto confidencial",
        quantity: 2,
        unitPrice: 50,
        total: 100,
      },
    ],
  };
}

const metadata = {
  structuralArchetypeId: "LINE_TABLE" as const,
  documentKind: "EXPENSE_INVOICE" as const,
  sourceQualityBucket: "HIGH" as const,
  localConfidence: "HIGH" as const,
  math: [
    {
      check: "DOCUMENT_TOTAL" as const,
      verdict: "MATCH" as const,
      residual: "EXACT" as const,
    },
  ],
};

describe("expense local candidate v1", () => {
  it("mantiene los valores accesibles solo en memoria", () => {
    const ephemeral = createEphemeralExpenseLocalCandidateV1(candidate());

    expect(ephemeral.supplierName).toBe(PRIVATE_SUPPLIER);
    expect(ephemeral.lines[0]?.description).toBe("Producto confidencial");
    expect(Object.keys(ephemeral)).toEqual([]);
    expect(Object.keys(ephemeral.lines[0] ?? {})).toEqual([]);
    expect(JSON.stringify(ephemeral)).toBeUndefined();
    expect(JSON.stringify(ephemeral.lines)).toBeUndefined();
  });

  it("oculta el candidato completo dentro del resultado sombra", () => {
    const result = createExpenseLocalCandidateAvailableOutcomeV1({
      metadata,
      candidate: candidate(),
    });
    const serialized = JSON.stringify(result);

    expect(result.ephemeralCandidate.total).toBe(121);
    expect(Object.keys(result)).not.toContain("ephemeralCandidate");
    expect(serialized).not.toContain(PRIVATE_SUPPLIER);
    expect(serialized).not.toContain(PRIVATE_TAX_ID);
    expect(serialized).not.toContain("121");
    expect(serialized).not.toContain("Producto confidencial");
    expect(serialized).toContain('"promotionPolicy":"BLOCKED"');
  });

  it("crea abstenciones sin contenido de negocio", () => {
    const result = createExpenseLocalCandidateAbstainedOutcomeV1({
      metadata: { ...metadata, localConfidence: "LOW" },
      reason: "MISSING_FIELDS",
    });

    expect(result.status).toBe("ABSTAINED");
    expect(result.abstentionReason).toBe("MISSING_FIELDS");
    expect(JSON.stringify(result)).not.toContain(PRIVATE_SUPPLIER);
  });

  it("rechaza fechas, importes y textos fuera de contrato", () => {
    expect(() =>
      createEphemeralExpenseLocalCandidateV1({
        ...candidate(),
        date: "2026-02-31",
      }),
    ).toThrowError("INVALID_EXPENSE_LOCAL_CANDIDATE");
    expect(() =>
      createEphemeralExpenseLocalCandidateV1({
        ...candidate(),
        total: Number.POSITIVE_INFINITY,
      }),
    ).toThrowError("INVALID_EXPENSE_LOCAL_CANDIDATE");
    expect(() =>
      createEphemeralExpenseLocalCandidateV1({
        ...candidate(),
        supplierName: "Proveedor\u0000Privado",
      }),
    ).toThrowError("INVALID_EXPENSE_LOCAL_CANDIDATE");
  });
});
