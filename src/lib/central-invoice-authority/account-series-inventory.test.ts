import { describe, expect, it } from "vitest";

import { EMPTY_DATA, type AppData, type Document } from "@/lib/types";

import {
  CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_INVENTORY,
  buildCentralInvoiceAuthorityAccountSeriesInventory,
} from "./account-series-inventory";

function document(
  id: string,
  number: string,
  overrides: Partial<Document> = {},
): Document {
  return {
    id,
    type: "factura",
    number,
    date: "2026-07-28",
    client: { name: "Cliente sintetico" },
    items: [],
    status: "enviado",
    createdAt: "2026-07-28T10:00:00.000Z",
    updatedAt: "2026-07-28T10:00:00.000Z",
    ...overrides,
  };
}

function appData(documents: Document[]): AppData {
  return {
    ...EMPTY_DATA,
    profile: {
      ...EMPTY_DATA.profile,
      nif: " 00000000t ",
      numbering: {
        year: 2026,
        lastSequence: {
          factura: 8,
          factura_rectificativa: 1,
          presupuesto: 0,
          recibo: 0,
        },
        formats: {
          factura: { template: "F-{year}-{num}", padding: 4 },
          factura_rectificativa: {
            template: "FR-{year}-{num}",
            padding: 4,
          },
          presupuesto: { template: "P-{year}-{num}", padding: 4 },
          recibo: { template: "R-{year}-{num}", padding: 4 },
        },
      },
      verifactu: { enabled: false, environment: "test" },
    },
    documents,
  };
}

describe("central authority account series inventory", () => {
  it("resume series sin exponer contenido fiscal ni clientes", () => {
    const inventory = buildCentralInvoiceAuthorityAccountSeriesInventory(
      appData([
        document("invoice-1", "F-2026-0007"),
        document("invoice-2", "F-2026-0012"),
        document("rectification-1", "FR-2026-0001", {
          rectification: {
            type: "correccion",
            reason: "Error",
            originalDocumentId: "invoice-1",
            originalNumber: "F-2026-0007",
            originalDate: "2026-07-28",
          },
        }),
      ]),
    );

    expect(inventory.schema).toBe(
      CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_INVENTORY,
    );
    expect(inventory.conflicts).toEqual([]);
    expect(inventory.summaries).toEqual([
      expect.objectContaining({
        issuerNif: "00000000T",
        seriesCode: "F-2026",
        fiscalYear: 2026,
        observedMaxSequence: 12,
        sourceDocumentCount: 2,
        sourceDigest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      }),
      expect.objectContaining({
        seriesCode: "FR-2026",
        observedMaxSequence: 1,
        sourceDocumentCount: 1,
      }),
    ]);
    expect(JSON.stringify(inventory)).not.toContain("Cliente sintetico");
  });

  it("conserva el contador configurado como suelo monotono", () => {
    const inventory = buildCentralInvoiceAuthorityAccountSeriesInventory(
      appData([document("invoice-1", "F-2026-0007")]),
    );

    expect(inventory.summaries[0]).toMatchObject({
      seriesCode: "F-2026",
      observedMaxSequence: 8,
      sourceDocumentCount: 1,
    });
  });

  it("bloquea una serie con secuencia fiscal duplicada", () => {
    const inventory = buildCentralInvoiceAuthorityAccountSeriesInventory(
      appData([
        document("invoice-1", "F-2026-0007"),
        document("invoice-2", "F-2026-0007"),
      ]),
    );

    expect(inventory.conflicts).toEqual([
      {
        seriesCode: "F-2026",
        fiscalYear: 2026,
        sequence: 7,
        documentNumbers: ["F-2026-0007", "F-2026-0007"],
      },
    ]);
    expect(
      inventory.summaries.some((summary) => summary.seriesCode === "F-2026"),
    ).toBe(false);
    expect(
      inventory.summaries.some((summary) => summary.seriesCode === "FR-2026"),
    ).toBe(true);
  });

  it("ignora formatos historicos ajenos a la serie configurada", () => {
    const inventory = buildCentralInvoiceAuthorityAccountSeriesInventory(
      appData([document("legacy", "Factura/2941/")]),
    );

    expect(inventory.ignoredDocuments).toBe(1);
    expect(inventory.summaries[0]).toMatchObject({
      seriesCode: "F-2026",
      observedMaxSequence: 8,
      sourceDocumentCount: 0,
    });
  });
});
