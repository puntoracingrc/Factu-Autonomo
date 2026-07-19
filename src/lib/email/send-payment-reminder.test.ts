import { describe, expect, it } from "vitest";
import { issueDocument } from "../document-integrity";
import { DEFAULT_PROFILE, type Document } from "../types";
import { validatePaymentReminderInput } from "./send-payment-reminder";

function issuedInvoice(): Document {
  return issueDocument(
    {
      id: "invoice-1",
      type: "factura",
      number: "F-2026-0001",
      date: "2026-07-19",
      client: { name: "Cliente", email: "cliente@example.com" },
      items: [
        {
          id: "line-1",
          description: "Servicio",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
      status: "borrador",
      createdAt: "2026-07-19T08:00:00.000Z",
      updatedAt: "2026-07-19T08:00:00.000Z",
    },
    DEFAULT_PROFILE,
    "2026-07-19T09:00:00.000Z",
  );
}

describe("payment reminder server eligibility", () => {
  it("rechaza documentos importados y mantiene las facturas propias", () => {
    const ownInvoice = issuedInvoice();
    const importedInvoice: Document = {
      ...ownInvoice,
      legacyImportProvenance: {
        schemaVersion: 2,
        kind: "external_import",
        importer: "generic_documents",
        importedAt: "2026-07-01T08:00:00.000Z",
        provenanceRecordedAt: "2026-07-01T08:00:00.000Z",
        issuerOrigin: "source_document",
        documentStateAtImport: "issued",
      },
    };

    expect(
      validatePaymentReminderInput({
        doc: ownInvoice,
        profile: DEFAULT_PROFILE,
        message: "Recordatorio",
      }),
    ).toBeNull();
    expect(
      validatePaymentReminderInput({
        doc: importedInvoice,
        profile: DEFAULT_PROFILE,
        message: "Recordatorio",
      }),
    ).toBe(
      "Los recordatorios solo estan disponibles para facturas creadas en la aplicacion.",
    );
  });
});
