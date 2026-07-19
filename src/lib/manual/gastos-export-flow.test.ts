import { describe, expect, it } from "vitest";
import { gastosSection } from "./sections/gastos";

describe("manual del flujo fiscal y de exportacion de gastos", () => {
  it("documenta las tres clasificaciones sin convertirlas en casillas independientes", () => {
    const classification = gastosSection.steps.find(
      (step) => step.title === "2. Clasificar el uso del gasto",
    );
    const text = JSON.stringify(classification);

    expect(text).toContain("Empresa y deducible");
    expect(text).toContain("Empresa, no deducible");
    expect(text).toContain("Personal / no empresarial");
    expect(text).toContain("selector único");
    expect(text).toContain("conservan su tratamiento histórico");
    expect(text).toContain("no sustituye la revisión fiscal");
  });

  it("explica el alcance predeterminado y las tres exportaciones afectadas", () => {
    const exportStep = gastosSection.steps.find(
      (step) => step.title === "4. Exportar y enviar al gestor",
    );
    const text = JSON.stringify(exportStep);

    expect(text).toContain("Solo empresa y deducibles");
    expect(text).toContain("Todos los gastos de empresa");
    expect(text).toContain("Todos los gastos");
    expect(text).toContain("CSV");
    expect(text).toContain("ZIP");
    expect(text).toContain("Exportar y enviar al gestor");
    expect(text).toContain("no cambia su clasificación");
  });

  it("aplica las mismas reglas a los gastos fijos", () => {
    const fixedExpenses = gastosSection.steps.find(
      (step) => step.title === "5. Gastos fijos",
    );
    const text = JSON.stringify(fixedExpenses);

    expect(text).toContain("Uso del gasto");
    expect(text).toContain("heredarán esa clasificación");
    expect(text).toContain("las mismas reglas que un gasto normal");
  });
});
