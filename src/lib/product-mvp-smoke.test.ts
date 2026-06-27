import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDocumentPdfBlob, openDocumentPdfPreview } from "./pdf";
import { buildInvoiceDraftFromQuote } from "./quote-to-invoice";
import { hasClientEmail, hasClientPhone } from "./share";
import { documentTotals } from "./calculations";
import { issueDocument } from "./document-integrity";
import { withVerifactuOnDocument } from "./verifactu/store";
import { DEFAULT_PROFILE, type BusinessProfile, type Document } from "./types";

const profile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  name: "Taller Demo",
  nif: "12345678Z",
  address: "Calle Prueba 1",
  city: "Madrid",
  postalCode: "28001",
  email: "demo@example.com",
  phone: "600000000",
  verifactu: { enabled: true, environment: "test" },
};

const quote: Document = {
  id: "quote-smoke",
  type: "presupuesto",
  number: "P-2026-0001",
  date: "2026-06-27",
  customerId: "customer-1",
  client: {
    firstName: "Ana",
    lastName: "Garcia",
    name: "Ana Garcia",
    nif: "87654321X",
    email: "ana@example.com",
    phone: "612345678",
  },
  items: [
    {
      id: "quote-line-1",
      description: "Servicio convertido",
      quantity: 1,
      unit: "ud",
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  notes: "Revisar antes de emitir.",
  paymentTerms: "Transferencia",
  status: "borrador",
  createdAt: "2026-06-27T10:00:00.000Z",
  updatedAt: "2026-06-27T10:00:00.000Z",
};

describe("MVP document smoke", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("convierte presupuesto a factura, emite, genera QR/PDF y conserva contacto", async () => {
    const originalQuote = structuredClone(quote);
    const invoiceDraft = buildInvoiceDraftFromQuote(quote, {
      date: "2026-06-27",
      lineIdFactory: () => "invoice-line-1",
    });
    const invoice: Document = {
      ...invoiceDraft,
      id: "invoice-smoke",
      number: "F-2026-0001",
      createdAt: "2026-06-27T10:01:00.000Z",
      updatedAt: "2026-06-27T10:01:00.000Z",
    };

    expect(invoice.status).toBe("borrador");
    expect(invoice.type).toBe("factura");
    expect(invoice.sourceQuoteDocumentId).toBe(quote.id);
    expect(invoice.sourceQuoteNumber).toBe(quote.number);
    expect(invoice.verifactu).toBeUndefined();
    expect(invoice.documentSnapshot).toBeUndefined();
    expect(invoice.pdfSnapshot).toBeUndefined();
    expect(documentTotals(invoice).total).toBe(documentTotals(quote).total);
    expect(hasClientEmail(invoice)).toBe(true);
    expect(hasClientPhone(invoice)).toBe(true);

    const issued = issueDocument(
      invoice,
      profile,
      "2026-06-27T10:05:00.000Z",
    );
    const registered = await withVerifactuOnDocument({
      doc: issued,
      profile,
      chain: null,
    });
    const pdf = await buildDocumentPdfBlob(registered.doc, profile);

    expect(registered.doc.status).toBe("enviado");
    expect(registered.doc.integrityLock).toBe("locked");
    expect(registered.doc.verifactu?.environment).toBe("test");
    expect(registered.doc.verifactu?.qrUrl).toContain("prewww2.aeat.es");
    expect(pdf.type).toBe("application/pdf");
    expect(pdf.size).toBeGreaterThan(1000);
    expect(quote).toEqual(originalQuote);
  });

  it("detecta cuando el navegador bloquea abrir el PDF", async () => {
    vi.stubGlobal("window", {
      open: vi.fn(() => null),
    });

    await expect(openDocumentPdfPreview(quote, profile)).rejects.toThrow(
      "popup_blocked",
    );
  });
});
