import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { issueDocument } from "@/lib/document-integrity";
import { attestNewImportedDocument } from "@/lib/document-integrity/legacy-import-attestation";
import { captureIssuerSnapshot } from "@/lib/issuer-snapshot";
import {
  DEFAULT_PROFILE,
  type BusinessProfile,
  type Document,
} from "@/lib/types";
import {
  buildInvoicePdfPeriodArchive,
  buildInvoicePdfSelectionArchive,
  invoicePdfExportFolderName,
  invoicePdfExportPackagePeriodLabel,
  invoicePdfExportPeriodFromQuarter,
  invoicePdfExportPeriodLabel,
  invoicePdfSelectionFolderName,
  invoicePdfSelectionSummaryFileName,
  invoicePdfSummaryFileName,
  InvoicePdfPeriodExportError,
  isDateInInvoicePdfExportPeriod,
} from "./export-invoice-pdf-archive";

const PROFILE: BusinessProfile = {
  ...DEFAULT_PROFILE,
  name: "Empresa Sintética",
  nif: "11111111H",
  address: "Calle Prueba 1",
  postalCode: "28001",
  city: "Madrid",
};

function draftInvoice(
  id: string,
  number: string,
  date: string,
  overrides: Partial<Document> = {},
): Document {
  return {
    id,
    type: "factura",
    number,
    date,
    client: {
      name: "Cliente Sintético",
      nif: "87654321A",
      address: "Calle Cliente 2",
      postalCode: "28002",
      city: "Madrid",
    },
    items: [
      {
        id: `${id}-line`,
        description: "Servicio de prueba",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "borrador",
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
    ...overrides,
  };
}

function issuedInvoice(
  id: string,
  number: string,
  date: string,
  overrides: Partial<Document> = {},
): Document {
  return issueDocument(
    draftInvoice(id, number, date, overrides),
    PROFILE,
    `${date}T10:00:00.000Z`,
  );
}

async function archiveFiles(
  archive: Blob,
): Promise<Record<string, Uint8Array>> {
  return unzipSync(new Uint8Array(await archive.arrayBuffer()));
}

function captureExportError(action: () => Promise<unknown>) {
  return action().catch((error: unknown) => error);
}

describe("invoice PDF period naming", () => {
  it("nombra los trimestres fiscales con el formato solicitado", () => {
    const period = invoicePdfExportPeriodFromQuarter(2026, 2);
    expect(period).toEqual({ year: 2026, startMonth: 4, endMonth: 6 });
    expect(invoicePdfExportFolderName(period)).toBe(
      "Facturas Trimestre 2 2026",
    );
    expect(invoicePdfExportPackagePeriodLabel(period)).toBe("Trimestre 2 2026");
  });

  it("nombra un mes y un rango no trimestral con sus meses", () => {
    expect(
      invoicePdfExportFolderName({
        year: 2026,
        startMonth: 5,
        endMonth: 5,
      }),
    ).toBe("Facturas Mayo 2026");
    expect(
      invoicePdfExportFolderName({
        year: 2026,
        startMonth: 5,
        endMonth: 7,
      }),
    ).toBe("Facturas Mayo-Julio 2026");
    expect(
      invoicePdfExportPeriodLabel({
        year: 2026,
        startMonth: 11,
        endMonth: 12,
      }),
    ).toBe("Noviembre-Diciembre 2026");
    expect(
      invoicePdfSummaryFileName({
        year: 2026,
        startMonth: 5,
        endMonth: 5,
      }),
    ).toBe("Resumen Facturas Mayo 2026.pdf");
    expect(
      invoicePdfSummaryFileName(invoicePdfExportPeriodFromQuarter(2026, 2)),
    ).toBe("Resumen Facturas Trimestre 2 2026.pdf");
  });

  it("crea nombres seguros para una selección de cliente", () => {
    expect(invoicePdfSelectionFolderName("Catal-pur SL")).toBe(
      "Facturas Catal-pur SL",
    );
    expect(invoicePdfSelectionSummaryFileName("Catal-pur SL")).toBe(
      "Resumen Facturas Catal-pur SL.pdf",
    );
    expect(invoicePdfSelectionFolderName("Cliente: Norte/Sur * 2026")).toBe(
      "Facturas Cliente Norte Sur 2026",
    );
  });

  it("rechaza rangos invertidos, inválidos o superiores a tres meses", () => {
    for (const period of [
      { year: 2026, startMonth: 5, endMonth: 4 },
      { year: 2026, startMonth: 0, endMonth: 1 },
      { year: 2026, startMonth: 5, endMonth: 8 },
    ]) {
      expect(() => invoicePdfExportFolderName(period)).toThrowError(
        InvoicePdfPeriodExportError,
      );
    }
  });

  it("filtra fechas ISO de forma determinista sin depender de la zona horaria", () => {
    const period = { year: 2026, startMonth: 5, endMonth: 7 };
    expect(isDateInInvoicePdfExportPeriod("2026-05-01", period)).toBe(true);
    expect(
      isDateInInvoicePdfExportPeriod("2026-07-31T23:59:59.000Z", period),
    ).toBe(true);
    expect(isDateInInvoicePdfExportPeriod("2026-08-01", period)).toBe(false);
    expect(isDateInInvoicePdfExportPeriod("fecha-invalida", period)).toBe(
      false,
    );
  });
});

describe("invoice PDF period archive", () => {
  it("genera un ZIP con la carpeta y solo las facturas emitidas del periodo", async () => {
    const inPeriod = issuedInvoice("invoice-may", "F-2026-0002", "2026-05-10");
    const outside = issuedInvoice("invoice-aug", "F-2026-0003", "2026-08-01");
    const draft = draftInvoice("draft", "BORRADOR", "2026-05-12");
    const receipt = issueDocument(
      draftInvoice("receipt", "R-2026-0001", "2026-05-11", {
        type: "recibo",
      }),
      PROFILE,
      "2026-05-11T10:00:00.000Z",
    );

    const result = await buildInvoicePdfPeriodArchive(
      [outside, draft, receipt, inPeriod],
      PROFILE,
      { year: 2026, startMonth: 5, endMonth: 5 },
    );
    const files = await archiveFiles(result.blob);

    expect(result).toMatchObject({
      folderName: "Facturas Mayo 2026",
      fileName: "Facturas Mayo 2026.zip",
      summaryFileName: "Resumen Facturas Mayo 2026.pdf",
      invoiceCount: 1,
    });
    expect(Object.keys(files)).toEqual([
      "Facturas Mayo 2026/F-2026-0002.pdf",
      "Facturas Mayo 2026/Resumen Facturas Mayo 2026.pdf",
    ]);
    for (const file of Object.values(files)) {
      expect(strFromU8(file.slice(0, 4))).toBe("%PDF");
    }
  });

  it("usa fecha y número del snapshot aunque los campos vivos hayan derivado", async () => {
    const issued = issuedInvoice(
      "snapshot-source",
      "F-2026-0010",
      "2026-04-02",
    );
    const drifted: Document = {
      ...issued,
      number: "F-LIVE-ALTERADA",
      date: "2027-12-31",
      items: [{ ...issued.items[0], unitPrice: 999 }],
    };

    const result = await buildInvoicePdfPeriodArchive(
      [drifted],
      PROFILE,
      invoicePdfExportPeriodFromQuarter(2026, 2),
    );
    const files = await archiveFiles(result.blob);

    expect(Object.keys(files)).toEqual([
      "Facturas Trimestre 2 2026/F-2026-0010.pdf",
      "Facturas Trimestre 2 2026/Resumen Facturas Trimestre 2 2026.pdf",
    ]);
    expect(JSON.stringify(Object.keys(files))).not.toContain("ALTERADA");
  });

  it("incluye históricos importados atestados sin fabricar sello moderno", async () => {
    const historical = attestNewImportedDocument(
      {
        ...draftInvoice(
          "pcfacturacion:factura:Factura_2F2941_2F",
          "Factura/2941/",
          "2026-06-12",
        ),
        status: "pagado",
        issuer: captureIssuerSnapshot(PROFILE, "2026-06-12T10:00:00.000Z"),
        documentLifecycle: "issued",
        integrityLock: "locked",
      },
      PROFILE,
      "pcfacturacion",
      "2026-07-13T20:00:00.000Z",
    );

    const result = await buildInvoicePdfPeriodArchive([historical], PROFILE, {
      year: 2026,
      startMonth: 6,
      endMonth: 6,
    });
    const files = await archiveFiles(result.blob);

    expect(result.invoiceCount).toBe(1);
    expect(Object.keys(files)).toEqual([
      "Facturas Junio 2026/Factura_2941_.pdf",
      "Facturas Junio 2026/Resumen Facturas Junio 2026.pdf",
    ]);
    expect(historical.pdfSnapshot).toBeUndefined();
    expect(historical.snapshotSeal).toBeUndefined();
  });

  it("bloquea todo el paquete si una factura del periodo tiene evidencia corrupta", async () => {
    const issued = issuedInvoice("corrupt", "F-2026-0099", "2026-05-20");
    const corrupt: Document = {
      ...issued,
      documentSnapshot: {
        ...issued.documentSnapshot!,
        items: [
          {
            ...issued.documentSnapshot!.items[0],
            unitPrice: 999,
          },
        ],
      },
    };

    const error = await captureExportError(() =>
      buildInvoicePdfPeriodArchive([corrupt], PROFILE, {
        year: 2026,
        startMonth: 5,
        endMonth: 5,
      }),
    );

    expect(error).toBeInstanceOf(InvoicePdfPeriodExportError);
    expect(error).toMatchObject({
      code: "blocked_documents",
      documentReferences: ["F-2026-0099"],
    });
  });

  it("no descarga un archivo vacío cuando el periodo no contiene facturas", async () => {
    const error = await captureExportError(() =>
      buildInvoicePdfPeriodArchive([], PROFILE, {
        year: 2026,
        startMonth: 5,
        endMonth: 5,
      }),
    );

    expect(error).toMatchObject({ code: "no_invoices" });
  });
});

describe("invoice PDF customer selection archive", () => {
  it("incluye todas las facturas seleccionadas aunque pertenezcan a años distintos", async () => {
    const oldInvoice = issuedInvoice(
      "customer-old",
      "Factura/2413/",
      "2021-08-04",
      { customerId: "customer-catal" },
    );
    const recentInvoice = issuedInvoice(
      "customer-recent",
      "F-2026-2956",
      "2026-07-15",
      { customerId: "customer-catal" },
    );
    const otherCustomer = issuedInvoice(
      "customer-other",
      "F-2026-2999",
      "2026-07-16",
      { customerId: "customer-other" },
    );

    const result = await buildInvoicePdfSelectionArchive(
      [otherCustomer, oldInvoice, recentInvoice],
      PROFILE,
      {
        documentIds: [recentInvoice.id, oldInvoice.id],
        fileLabel: "Catal-pur SL",
        summaryLabel: "Cliente Catal-pur SL · todo el historial",
      },
    );
    const files = await archiveFiles(result.blob);

    expect(result).toMatchObject({
      folderName: "Facturas Catal-pur SL",
      fileName: "Facturas Catal-pur SL.zip",
      summaryFileName: "Resumen Facturas Catal-pur SL.pdf",
      invoiceCount: 2,
    });
    expect(Object.keys(files)).toEqual([
      "Facturas Catal-pur SL/Factura_2413_.pdf",
      "Facturas Catal-pur SL/F-2026-2956.pdf",
      "Facturas Catal-pur SL/Resumen Facturas Catal-pur SL.pdf",
    ]);
    expect(JSON.stringify(Object.keys(files))).not.toContain("2999");
  });

  it("bloquea la selección completa si una de sus facturas está corrupta", async () => {
    const selected = issuedInvoice(
      "selected-valid",
      "F-2026-0100",
      "2026-06-01",
    );
    const issued = issuedInvoice(
      "selected-corrupt",
      "F-2026-0101",
      "2026-06-02",
    );
    const corrupt: Document = {
      ...issued,
      documentSnapshot: {
        ...issued.documentSnapshot!,
        items: [{ ...issued.documentSnapshot!.items[0], unitPrice: 999 }],
      },
    };

    const error = await captureExportError(() =>
      buildInvoicePdfSelectionArchive([selected, corrupt], PROFILE, {
        documentIds: [selected.id, corrupt.id],
        fileLabel: "Cliente",
        summaryLabel: "Cliente · selección",
      }),
    );

    expect(error).toMatchObject({
      code: "blocked_documents",
      documentReferences: ["F-2026-0101"],
    });
  });

  it("ignora un documento bloqueado ajeno y rechaza una selección vacía", async () => {
    const selected = issuedInvoice(
      "only-selected",
      "F-2026-0200",
      "2026-06-01",
    );
    const otherIssued = issuedInvoice(
      "other-corrupt",
      "F-2026-0201",
      "2026-06-02",
    );
    const otherCorrupt: Document = {
      ...otherIssued,
      documentSnapshot: {
        ...otherIssued.documentSnapshot!,
        number: "ALTERADA",
      },
    };

    const result = await buildInvoicePdfSelectionArchive(
      [selected, otherCorrupt],
      PROFILE,
      {
        documentIds: [selected.id],
        fileLabel: "Cliente",
        summaryLabel: "Cliente · selección",
      },
    );
    expect(result.invoiceCount).toBe(1);

    const error = await captureExportError(() =>
      buildInvoicePdfSelectionArchive([selected], PROFILE, {
        documentIds: [],
        fileLabel: "Cliente",
        summaryLabel: "Cliente · selección",
      }),
    );
    expect(error).toMatchObject({ code: "invalid_selection" });
  });
});
