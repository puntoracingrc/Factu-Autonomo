import { describe, expect, it } from "vitest";
import { buildExpenseScanPrompt } from "./prompt";

describe("buildExpenseScanPrompt", () => {
  it("pide conservar líneas repetidas en facturas largas de proveedor", () => {
    const prompt = buildExpenseScanPrompt();

    expect(prompt).toContain("No agrupes");
    expect(prompt).toContain("hasta 50");
    expect(prompt).toContain("Crystal Reports/Stil Condal");
    expect(prompt).toContain("AUTC45");
    expect(prompt).toContain("continúa en la fila siguiente");
  });
});
