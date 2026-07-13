import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

describe("ConsultorFiscalLayout", () => {
  it("muestra Notificaciones sin abrir el analizador fiscal de gastos", () => {
    expect(source).toContain(
      "expenseAnalysisEnabled={consultorFiscalEnabled}",
    );
    expect(source).toContain("notificationsEnabled");
    expect(source).not.toContain(
      "notificationsEnabled={consultorFiscalEnabled}",
    );
  });
});
