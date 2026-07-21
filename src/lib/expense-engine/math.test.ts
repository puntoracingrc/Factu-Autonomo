import { describe, expect, it } from "vitest";
import { reconcileExpenseEngineMathV1 } from "./math";

describe("expense engine math", () => {
  it("reconcilia líneas, base, IVA y total sin exponer importes", () => {
    const result = reconcileExpenseEngineMathV1({
      documentFormula: "BASE_PLUS_TAX",
      taxBase: 180,
      taxPercent: 21,
      taxAmount: 37.8,
      documentTotal: 217.8,
      lines: [
        { quantity: 2, unitPrice: 50, total: 100 },
        {
          quantity: 1,
          unitPrice: 100,
          discountPercent: 20,
          total: 80,
        },
      ],
    });

    expect(result).toEqual([
      { check: "LINE_EXTENSIONS", verdict: "MATCH", residual: "EXACT" },
      { check: "LINES_TO_BASE", verdict: "MATCH", residual: "EXACT" },
      { check: "TAX_FROM_BASE", verdict: "MATCH", residual: "EXACT" },
      {
        check: "SURCHARGE_FROM_BASE",
        verdict: "INSUFFICIENT",
        residual: "UNKNOWN",
      },
      { check: "DOCUMENT_TOTAL", verdict: "MATCH", residual: "EXACT" },
      { check: "SIGN_CONSISTENCY", verdict: "MATCH", residual: "EXACT" },
    ]);
    expect(JSON.stringify(result)).not.toContain("217.8");
    expect(JSON.stringify(result)).not.toContain("180");
  });

  it("admite la tolerancia monetaria existente del dominio", () => {
    const result = reconcileExpenseEngineMathV1({
      documentFormula: "BASE_PLUS_TAX",
      taxBase: 10,
      taxPercent: 21,
      taxAmount: 2.11,
      documentTotal: 12.11,
      lines: [{ quantity: 1, unitPrice: 10, total: 10.01 }],
    });

    expect(result[0]).toEqual({
      check: "LINE_EXTENSIONS",
      verdict: "MATCH",
      residual: "CENT_TOLERANCE",
    });
    expect(result[1].verdict).toBe("MATCH");
  });

  it("marca desajustes materiales y signos incompatibles", () => {
    const result = reconcileExpenseEngineMathV1({
      documentFormula: "BASE_PLUS_TAX",
      taxBase: -100,
      taxPercent: 21,
      taxAmount: -21,
      documentTotal: 121,
      lines: [{ quantity: 2, unitPrice: 50, total: -75 }],
    });

    expect(result[0].verdict).toBe("MISMATCH");
    expect(result[1].verdict).toBe("MISMATCH");
    expect(result[4].verdict).toBe("MISMATCH");
    expect(result[5]).toEqual({
      check: "SIGN_CONSISTENCY",
      verdict: "MISMATCH",
      residual: "MATERIAL",
    });
  });

  it("se abstiene cuando faltan datos en vez de asumir cero", () => {
    const result = reconcileExpenseEngineMathV1({
      documentFormula: "BASE_PLUS_TAX_MINUS_WITHHOLDING",
      taxBase: 100,
      taxAmount: 21,
      documentTotal: 121,
      lines: [{}],
    });

    expect(result[4]).toEqual({
      check: "DOCUMENT_TOTAL",
      verdict: "INSUFFICIENT",
      residual: "UNKNOWN",
    });
  });

  it("requiere una formula documentada antes de conciliar el total", () => {
    const result = reconcileExpenseEngineMathV1({
      taxBase: 100,
      taxAmount: 21,
      documentTotal: 121,
    });

    expect(result[4].verdict).toBe("INSUFFICIENT");
  });
});
