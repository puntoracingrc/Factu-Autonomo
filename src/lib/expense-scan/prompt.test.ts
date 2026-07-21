import { describe, expect, it } from "vitest";
import { EXPENSE_LEARNING_HINTS_PROMPT_SCHEMA_V1 } from "../expense-engine/contracts";
import { EXPENSE_SCAN_AI_OUTPUT_SCHEMA_VERSION } from "./schema";
import { buildExpenseScanPrompt } from "./prompt";

describe("buildExpenseScanPrompt", () => {
  it("pide conservar líneas repetidas en facturas largas de proveedor", () => {
    const prompt = buildExpenseScanPrompt();

    expect(prompt).toContain("No agrupes");
    expect(prompt).toContain("hasta 50");
    expect(prompt).toContain("Crystal Reports/Stil Condal");
    expect(prompt).toContain("AUTC45");
    expect(prompt).toContain("continúa en la fila siguiente");
    expect(prompt).toContain("ivaPercent real de cada línea");
    expect(prompt).toContain("porcentaje medio");
  });

  it("construye el envelope desde los enums canónicos de aprendizaje", () => {
    const prompt = buildExpenseScanPrompt();

    expect(prompt).toContain(EXPENSE_SCAN_AI_OUTPUT_SCHEMA_VERSION);
    expect(prompt).toContain(EXPENSE_LEARNING_HINTS_PROMPT_SCHEMA_V1.schemaVersion);
    for (const formula of EXPENSE_LEARNING_HINTS_PROMPT_SCHEMA_V1.formulas.kind) {
      expect(prompt).toContain(formula);
    }
    expect(prompt).toContain(
      `columns hasta ${EXPENSE_LEARNING_HINTS_PROMPT_SCHEMA_V1.columns.maxItems}`,
    );
    expect(prompt).toContain("learningHints = null");
    expect(prompt).toContain("nunca interpretes una ausencia como cero");
  });

  it("prohíbe contenido identificativo y valores de negocio en los hints", () => {
    const prompt = buildExpenseScanPrompt();

    expect(prompt).toContain("OCR o texto bruto");
    expect(prompt).toContain("proveedor, usuario, email, NIF, dirección");
    expect(prompt).toContain("importes ni porcentajes exactos");
    expect(prompt).toContain("nunca copies la cabecera original");
  });
});
