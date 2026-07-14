import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(name: string): string {
  return readFileSync(new URL(name, import.meta.url), "utf8");
}

describe("document payment and notes pickers", () => {
  it("keeps payment controls in one compact field", () => {
    const payment = source("./DocumentPaymentPicker.tsx");

    expect(payment).toContain("Forma de pago");
    expect(payment).toContain("Elegir otra…");
    expect(payment).toContain('aria-label="Elegir otra forma de pago"');
    expect(payment).toContain("Guardar forma de pago");
    expect(payment).toContain("Dejar como predeterminada");
    expect(payment).toContain("matchingMethod &&");
    expect(payment).not.toContain("Forma de pago guardada");
    expect(payment).not.toContain("aparece en el PDF");
  });

  it("keeps saved sales terms separate and offers future/default use", () => {
    const phrase = source("./DocumentPhrasePicker.tsx");

    expect(phrase).toContain('label = "Condiciones de venta"');
    expect(phrase).toContain("document-sales-terms");
    expect(phrase).toContain("Elegir otra…");
    expect(phrase).toContain("Guardar condición");
    expect(phrase).toContain("Dejar como predeterminada");
    expect(phrase).toContain("Usar como predeterminada");
    expect(phrase).toContain("matchingPhrase &&");
    expect(phrase).not.toContain("Frase guardada");
  });

  it("is shared by budgets, invoices, receipts and rectifications", () => {
    const documentForm = source("../forms/DocumentForm.tsx");
    const rectificationForm = source("../forms/RectificativaForm.tsx");

    expect(documentForm).toContain("<DocumentPaymentPicker");
    expect(documentForm).toContain("<DocumentPhrasePicker");
    expect(documentForm).toContain("saveDocumentPhraseForFutureUse");
    expect(documentForm).toContain("salesTerms");
    expect(documentForm).toContain("Notas (opcional)");
    expect(rectificationForm).toContain("<DocumentPaymentPicker");
    expect(rectificationForm).toContain("<DocumentPhrasePicker");
    expect(rectificationForm).toContain("saveDocumentPhraseForFutureUse");
    expect(rectificationForm).toContain("salesTerms");
    expect(rectificationForm).toContain("Notas (opcional)");
    expect(source("../../lib/pdf.ts")).toContain("Condiciones de venta:");
  });
});
