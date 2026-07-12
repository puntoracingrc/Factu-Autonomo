import { describe, expect, it } from "vitest";
import { facturasSection } from "./sections/facturas";
import { recibosSection } from "./sections/presupuestos-recibos";

function sectionText(section: typeof facturasSection): string {
  return section.steps
    .flatMap((step) => [step.title, ...(step.paragraphs ?? [])])
    .join(" ");
}

describe("guía de integridad y generación de recibos", () => {
  it("distingue integridad bloqueada de la inmutabilidad normal", () => {
    const text = sectionText(facturasSection);

    expect(text).toContain("no es el bloqueo normal");
    expect(text).toContain("0,00 €");
    expect(text).toContain("snapshot fiscal");
    expect(text).toContain("explícita y auditable");
    expect(text).toContain("sin regenerar silenciosamente");
  });

  it("explica recibo existente, fallo visible y ausencia de cambios parciales", () => {
    const text = sectionText(recibosSection);

    expect(text).toContain("Ver recibo");
    expect(text).toContain("nunca crea un duplicado");
    expect(text).toContain("verás el motivo");
    expect(text).toContain("no se guardará ningún cambio parcial");
    expect(text).toContain("sin resellar automáticamente");
  });
});
