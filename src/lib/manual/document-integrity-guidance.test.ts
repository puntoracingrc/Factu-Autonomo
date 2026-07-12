import { describe, expect, it } from "vitest";
import { facturasSection } from "./sections/facturas";
import {
  presupuestosSection,
  recibosSection,
} from "./sections/presupuestos-recibos";

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

  it("documenta una cadena sin repetir la tarjeta y conserva la procedencia histórica", () => {
    const invoicesText = sectionText(facturasSection);
    const quotesText = sectionText(presupuestosSection);
    const receiptsText = sectionText(recibosSection);

    expect(invoicesText).toContain("la cadena no la repite");
    expect(invoicesText).toContain("muestra solo sus documentos relacionados");
    expect(invoicesText).toContain("relación histórica de conversión");
    expect(invoicesText).toContain("no se puede cambiar ni quitar con una **X**");
    expect(invoicesText).toContain("La **X** aparece únicamente en estos gastos operativos y desvinculables");

    expect(quotesText).toContain("presupone el documento actual");
    expect(quotesText).toContain("la cadena muestra solo los relacionados");
    expect(quotesText).toContain("rectificativa, recibo o gastos");
    expect(quotesText).toContain("no se reasigna ni se quita con una **X**");

    expect(receiptsText).toContain("se presupone el recibo actual");
    expect(receiptsText).toContain("la cadena muestra solo su factura de origen");
    expect(receiptsText).toContain("la **X** se reserva para gastos operativos");
  });
});
