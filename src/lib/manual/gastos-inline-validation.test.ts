import { describe, expect, it } from "vitest";
import { gastosSection } from "./sections/gastos";

describe("manual de validación de gastos fijos", () => {
  it("explica el resumen accesible sin prometer un guardado fallido", () => {
    const fixedExpenses = gastosSection.steps.find(
      (step) => step.title === "5. Gastos fijos",
    );
    const text = JSON.stringify(fixedExpenses);

    expect(text).toContain("el formulario permanece abierto");
    expect(text).toContain("resumen de errores");
    expect(text).toContain("campo correspondiente");
    expect(text).toContain("sin perder el contexto");
  });
});
