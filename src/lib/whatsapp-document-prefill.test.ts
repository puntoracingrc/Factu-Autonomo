import { describe, expect, it } from "vitest";
import {
  WHATSAPP_COPILOT_SOURCE,
  whatsappDocumentPrefillFromSearchParams,
} from "./whatsapp-document-prefill";

describe("whatsappDocumentPrefillFromSearchParams", () => {
  it("ignora enlaces que no vienen del copiloto", () => {
    const params = new URLSearchParams("customerName=Carlos%20R.");

    expect(whatsappDocumentPrefillFromSearchParams(params)).toBeNull();
  });

  it("extrae cliente, telefono, concepto y notas del copiloto", () => {
    const params = new URLSearchParams({
      source: WHATSAPP_COPILOT_SOURCE,
      caseId: "wa-123",
      customerName: "Carlos R.",
      phone: "600 000 018",
      city: "Madrid sur",
      concept: "Motorizacion de persiana enrollable",
      workType: "Motorizar",
      priceRange: "180-320 €",
      notes: "Foto general recibida; falta confirmar ancho.",
    });

    const prefill = whatsappDocumentPrefillFromSearchParams(params);

    expect(prefill).toMatchObject({
      clientForm: {
        customerType: "person",
        firstName: "Carlos",
        lastName: "R.",
        phone: "600 000 018",
        city: "Madrid sur",
      },
      line: {
        description: "Motorizacion de persiana enrollable",
        quantity: 1,
      },
    });
    expect(prefill?.line.unitPrice).toBeUndefined();
    expect(prefill?.notes).toContain("Origen: WhatsApp Copilot.");
    expect(prefill?.notes).toContain("Caso: wa-123.");
    expect(prefill?.notes).toContain("Rango orientativo: 180-320 €.");
    expect(prefill?.notes).toContain("Foto general recibida");
  });

  it("solo rellena importe cuando llega un precio explicito", () => {
    const params = new URLSearchParams({
      source: WHATSAPP_COPILOT_SOURCE,
      customerName: "Maria Gomez",
      concept: "Cambio de cinta",
      unitPrice: "95,50 €",
      quantity: "2",
    });

    const prefill = whatsappDocumentPrefillFromSearchParams(params);

    expect(prefill?.line).toMatchObject({
      description: "Cambio de cinta",
      quantity: 2,
      unitPrice: 95.5,
    });
  });

  it("separa condiciones de venta y forma de pago", () => {
    const params = new URLSearchParams({
      source: WHATSAPP_COPILOT_SOURCE,
      salesTerms: "Validez 15 dias.",
      paymentTerms: "Transferencia.",
    });

    expect(whatsappDocumentPrefillFromSearchParams(params)).toMatchObject({
      salesTerms: "Validez 15 dias.",
      paymentTerms: "Transferencia.",
    });
  });

  it("acepta empresa como tipo de cliente", () => {
    const params = new URLSearchParams({
      source: WHATSAPP_COPILOT_SOURCE,
      customerType: "business",
      customerName: "Persianas Demo SL",
    });

    expect(
      whatsappDocumentPrefillFromSearchParams(params)?.clientForm.customerType,
    ).toBe("company");
  });
});
