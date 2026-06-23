import { describe, expect, it } from "vitest";
import {
  buildPcFacturacionImport,
  extractSpanishTaxId,
  parsePcFacturacionDwi,
} from "./pcfacturacion";
import { EMPTY_DATA } from "../types";

const baseTables = {
  Client: [
    {
      Company: "Persianas Almar",
      TaxNumber: "B12345678",
      Street: "Calle Mayor 1",
      ZIP: "08001",
      Town: "Barcelona",
      Telephone: "930000000",
      Email: "info@example.test",
    },
  ],
  Contacts: [
    {
      CustomerNumber: "1001",
      Company: "NIF 12345678Z",
      Name: "Garcia",
      Surname: "Ana",
      Matchcode: "Ana Garcia",
      Street: "Calle Cliente 2",
      ZIP: "08002",
      Town: "Barcelona",
      Email: "ana@example.test",
      CustomerDate: new Date("2020-01-01T00:00:00.000Z"),
    },
    {
      CustomerNumber: "1002",
      Company: "Empresa SL",
      Name: "B87654321",
      Matchcode: "Contacto Empresa",
      Town: "Madrid",
    },
    {
      CustomerNumber: "9999",
      Company: "",
      Name: "",
      Surname: "",
      Matchcode: "",
    },
  ],
  Invoice: [
    {
      InvoiceNumber: "Factura/1/",
      Date: new Date("2024-02-01T00:00:00.000Z"),
      CustomerNumber: "1001",
      Customer: "Ana Garcia",
      GrossAmount: 121,
      Paid: true,
      Canceled: false,
      PaymentPractice: "Contado",
    },
  ],
  Offer: [
    {
      OfferNumber: "Pto/1/",
      Date: new Date("2024-01-20T00:00:00.000Z"),
      CustomerNumber: "1001",
      Customer: "Ana Garcia",
      InvoiceNumber: "",
    },
  ],
  Positions: [
    {
      Document: "Factura",
      DocumentNumber: "Factura/1/",
      LineItemNumber: "1",
      ShortText: "Reparacion persiana",
      Quantity: 2,
      UnitpriceNet: 50,
      UnitpriceVat: 10.5,
      VatCode: "N 21 %",
    },
    {
      Document: "Presupuesto",
      DocumentNumber: "Pto/1/",
      LineItemNumber: "1",
      ShortText: "Presupuesto reparacion",
      Quantity: 1,
      UnitpriceNet: 80,
      UnitpriceVat: 16.8,
      VatCode: "N 21 %",
    },
    {
      Document: "Factura",
      DocumentNumber: "F/antigua",
      LineItemNumber: "1",
      ShortText: "Linea sin cabecera",
      Quantity: 1,
      UnitpriceNet: 10,
      UnitpriceVat: 2.1,
      VatCode: "N 21 %",
    },
  ],
};

describe("PC Facturacion importer", () => {
  it("extrae NIF/CIF aunque vengan con separadores", () => {
    expect(extractSpanishTaxId("NIF: 46144831 - T")).toBe("46144831T");
    expect(extractSpanishTaxId("CIF- B-65305450")).toBe("B65305450");
  });

  it("lee la numeracion configurada en un DWI", () => {
    const dwi = parsePcFacturacionDwi(`
      [NumberRange]
      Offer=6403
      Invoice=2941
      Receipt=2008
      Customer=1568947
      Format=Abrev.;/;Nº;/;Vacío

      [Token]
      Offer=Pto
      Invoice=Factura
      Receipt=F
    `);

    expect(dwi).toMatchObject({
      invoiceNext: 2941,
      offerNext: 6403,
      receiptNext: 2008,
      customerNext: 1568947,
      invoiceTemplate: "Factura/{num}/",
      offerTemplate: "Pto/{num}/",
      receiptTemplate: "F/{num}/",
    });
  });

  it("mapea empresa, clientes, facturas, presupuestos y lineas", () => {
    const result = buildPcFacturacionImport(EMPTY_DATA, baseTables, {
      includeUnusedCustomers: false,
    });

    expect(result.preview.companyName).toBe("Persianas Almar");
    expect(result.preview.customersWithDocuments).toBe(1);
    expect(result.preview.unusedCustomers).toBe(1);
    expect(result.preview.blankCustomers).toBe(1);
    expect(result.preview.customersToImport).toBe(1);
    expect(result.preview.invoices).toBe(1);
    expect(result.preview.offers).toBe(1);
    expect(result.preview.invoiceLines).toBe(1);
    expect(result.preview.orphanInvoiceLineDocuments).toBe(1);

    expect(result.data.profile.name).toBe("Persianas Almar");
    expect(result.data.customers).toHaveLength(1);
    expect(result.data.documents).toHaveLength(2);
    expect(result.data.documents.find((doc) => doc.type === "factura")?.status).toBe(
      "pagado",
    );
    expect(result.data.documents.find((doc) => doc.type === "factura")?.items[0]).toMatchObject({
      description: "Reparacion persiana",
      quantity: 2,
      unitPrice: 50,
      ivaPercent: 21,
    });
  });

  it("puede incluir clientes sin documentos cuando se solicita", () => {
    const result = buildPcFacturacionImport(EMPTY_DATA, baseTables, {
      includeUnusedCustomers: true,
    });

    expect(result.preview.customersToImport).toBe(2);
    expect(result.data.customers).toHaveLength(2);
  });

  it("aplica la numeracion opcional del DWI sin cambiar los documentos historicos", () => {
    const result = buildPcFacturacionImport(EMPTY_DATA, baseTables, {
      includeUnusedCustomers: false,
      dwiText: `
        [NumberRange]
        Offer=6403
        Invoice=2941
        Receipt=2008
        Format=Abrev.;/;Nº;/;Vacío

        [Token]
        Offer=Pto
        Invoice=Factura
        Receipt=F
      `,
    });

    expect(result.preview.numbering).toMatchObject({
      nextInvoiceNumber: "Factura/2941/",
      nextOfferNumber: "Pto/6403/",
      nextReceiptNumber: "F/2008/",
    });
    expect(result.data.profile.numbering.lastSequence.factura).toBe(2940);
    expect(result.data.profile.numbering.formats.factura.template).toBe(
      "Factura/{num}/",
    );
    expect(result.data.documents.find((doc) => doc.type === "factura")?.number).toBe(
      "Factura/1/",
    );
  });
});
