import { describe, expect, it } from "vitest";
import {
  buildPcFacturacionImport,
  detectPcFacturacionTables,
  extractSpanishTaxId,
  parsePcFacturacionDwi,
} from "./pcfacturacion";
import { applyBusinessProfileAutofillSuggestion } from "../business-profile-autofill";
import { EMPTY_DATA, type Document } from "../types";
import { inspectLegacyImportAttestation } from "../document-integrity/legacy-import-attestation";

const TEST_DATA = {
  ...EMPTY_DATA,
  profile: {
    ...EMPTY_DATA.profile,
    name: "Negocio de pruebas",
    nif: "B12345678",
    address: "Calle Mayor 1",
    postalCode: "08001",
    city: "Barcelona",
  },
};

function asDraft(document: Document): Document {
  return {
    ...document,
    status: "borrador",
    issuer: undefined,
    documentSnapshot: undefined,
    pdfSnapshot: undefined,
    snapshotSeal: undefined,
    snapshotIntegrityRequired: undefined,
    snapshotIntegrity: undefined,
    documentLifecycle: "draft",
    integrityLock: "unlocked",
    deliveryStatus: "not_sent",
    paymentStatus:
      document.type === "factura" ? "pending" : "not_applicable",
    acceptanceStatus:
      document.type === "presupuesto" ? "pending" : "not_applicable",
    issuedAt: undefined,
    sentAt: undefined,
    paidAt: undefined,
    acceptedAt: undefined,
  };
}

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
  it("detecta una base de PC Facturacion por sus tablas clave", () => {
    expect(
      detectPcFacturacionTables([
        "Client",
        "Contacts",
        "Invoice",
        "Offer",
        "Positions",
      ]),
    ).toMatchObject({
      matches: true,
      missingTables: [],
    });

    expect(detectPcFacturacionTables(["ps_customer", "ps_orders"])).toMatchObject({
      matches: false,
      missingTables: ["Client", "Contacts", "Invoice", "Offer", "Positions"],
    });
  });

  it("extrae NIF/CIF aunque vengan con separadores", () => {
    expect(extractSpanishTaxId("NIF: 46144831 - T")).toBe("46144831T");
    expect(extractSpanishTaxId("CIF- B-65305450")).toBe("B65305450");
  });

  it("aborta si el NIF válido del origen difiere del configurado", () => {
    const current = {
      ...EMPTY_DATA,
      profile: { ...EMPTY_DATA.profile, nif: "B87654321" },
    };

    expect(() =>
      buildPcFacturacionImport(current, baseTables, {
        includeUnusedCustomers: false,
      }),
    ).toThrow(
      "El NIF detectado en PC Facturación no coincide con el NIF configurado en esta cuenta. No se aplicó ningún cambio",
    );
  });

  it("acepta el mismo NIF con puntuación equivalente", () => {
    const current = {
      ...EMPTY_DATA,
      profile: { ...EMPTY_DATA.profile, nif: "B-12.345.678" },
    };

    const result = buildPcFacturacionImport(current, baseTables, {
      includeUnusedCustomers: false,
    });

    expect(
      result.data.documents.find((document) => document.type === "factura")
        ?.documentSnapshot?.issuer.nif,
    ).toBe("B-12.345.678");
  });

  it("persiste un histórico V2 aunque el software antiguo dejase campos incompletos", () => {
    const tables = {
      ...baseTables,
      Client: [
        {
          ...baseTables.Client[0],
          Street: "",
          ZIP: "",
          Town: "",
        },
      ],
      Contacts: [
        {
          ...baseTables.Contacts[0],
          Company: "Cliente histórico",
          Name: "",
          Surname: "",
          Street: "",
          ZIP: "",
          Town: "",
        },
      ],
      Positions: baseTables.Positions.map((position) =>
        position.DocumentNumber === "Factura/1/"
          ? { ...position, ShortText: "" }
          : position,
      ),
    };

    const result = buildPcFacturacionImport(EMPTY_DATA, tables, {
      includeUnusedCustomers: false,
    });
    const invoice = result.data.documents.find(
      (document) => document.type === "factura",
    );

    expect(invoice).toBeDefined();
    expect(inspectLegacyImportAttestation(invoice!)).toMatchObject({ ok: true });
    expect(
      invoice?.legacyImportAttestation?.schemaVersion === 2
        ? invoice.legacyImportAttestation.acceptedContentPolicy
            .completenessExceptions
        : [],
    ).toEqual(
      expect.arrayContaining([
        "issuer_address_missing",
        "customer_address_missing",
      ]),
    );
  });

  it.each(["", "fecha-imposible", "2026-02-30"])(
    "aborta una factura cuya fecha de origen no es válida: %s",
    (invalidDate) => {
      const tables = {
        ...baseTables,
        Invoice: [{ ...baseTables.Invoice[0], Date: invalidDate }],
      };

      expect(() =>
        buildPcFacturacionImport(EMPTY_DATA, tables, {
          includeUnusedCustomers: false,
        }),
      ).toThrow("no tiene una fecha válida. No se aplicó ningún cambio");
    },
  );

  it("aborta una factura cuyo vencimiento de origen no es válido", () => {
    const tables = {
      ...baseTables,
      Invoice: [
        {
          ...baseTables.Invoice[0],
          DuePayment: "vencimiento-imposible",
        },
      ],
    };

    expect(() =>
      buildPcFacturacionImport(EMPTY_DATA, tables, {
        includeUnusedCustomers: false,
      }),
    ).toThrow("no tiene un vencimiento válido. No se aplicó ningún cambio");
  });

  it("sella con el NIF detectado cuando la cuenta aún no lo tiene", () => {
    const result = buildPcFacturacionImport(EMPTY_DATA, baseTables, {
      includeUnusedCustomers: false,
    });

    expect(
      result.data.documents.find((document) => document.type === "factura")
        ?.documentSnapshot?.issuer.nif,
    ).toBe("B12345678");
  });

  it("no deja que un NIF configurado inválido tape el NIF detectado", () => {
    const current = {
      ...EMPTY_DATA,
      profile: { ...EMPTY_DATA.profile, nif: "SIN NIF" },
    };

    const result = buildPcFacturacionImport(current, baseTables, {
      includeUnusedCustomers: false,
    });

    expect(
      result.data.documents.find((document) => document.type === "factura")
        ?.documentSnapshot?.issuer.nif,
    ).toBe("B12345678");
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

    expect(result.data.profile.name).toBe("");
    expect(result.profileSuggestion.emptyFieldCount).toBeGreaterThan(0);
    expect(result.data.customers).toHaveLength(1);
    expect(result.data.customers[0]).toMatchObject({
      name: "Ana Garcia",
      customerType: "person",
    });
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

  it("clasifica como empresa clientes importados con CIF o forma juridica", () => {
    const result = buildPcFacturacionImport(EMPTY_DATA, baseTables, {
      includeUnusedCustomers: true,
    });

    const company = result.data.customers.find(
      (customer) => customer.id === "pcfacturacion:customer:1002",
    );
    expect(company).toMatchObject({
      customerType: "company",
      firstName: "Empresa SL",
      lastName: "",
      name: "Empresa SL",
      nif: "B87654321",
    });
  });

  it("reimporta sin duplicar el lote antiguo y conserva documentos manuales", () => {
    const firstImport = buildPcFacturacionImport(EMPTY_DATA, baseTables, {
      includeUnusedCustomers: false,
    });
    const manualDocument = {
      ...firstImport.data.documents[0],
      id: "manual-factura",
      number: "FM-2026-0001",
      status: "borrador" as const,
      documentLifecycle: "draft" as const,
      integrityLock: "unlocked" as const,
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
      snapshotIntegrityRequired: undefined,
      snapshotIntegrity: undefined,
      issuedAt: undefined,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
    const secondTables = {
      ...baseTables,
      Invoice: [
        ...baseTables.Invoice,
        {
          InvoiceNumber: "Factura/2/",
          Date: new Date("2024-02-15T00:00:00.000Z"),
          CustomerNumber: "1001",
          Customer: "Ana Garcia",
          GrossAmount: 60.5,
          Paid: true,
          Canceled: false,
        },
      ],
      Positions: [
        ...baseTables.Positions,
        {
          Document: "Factura",
          DocumentNumber: "Factura/2/",
          LineItemNumber: "1",
          ShortText: "Nueva factura añadida",
          Quantity: 1,
          UnitpriceNet: 50,
          UnitpriceVat: 10.5,
          VatCode: "N 21 %",
        },
      ],
    };

    const secondImport = buildPcFacturacionImport(
      {
        ...firstImport.data,
        documents: [...firstImport.data.documents, manualDocument],
      },
      secondTables,
      { includeUnusedCustomers: false },
    );

    expect(
      secondImport.data.documents.filter((doc) => doc.number === "Factura/1/"),
    ).toHaveLength(1);
    expect(
      secondImport.data.documents.filter((doc) => doc.number === "Factura/2/"),
    ).toHaveLength(1);
    expect(
      secondImport.data.documents.some((doc) => doc.id === "manual-factura"),
    ).toBe(true);
  });

  it("conserva presupuestos y clientes al reimportar solo facturas", () => {
    const first = buildPcFacturacionImport(TEST_DATA, baseTables, {
      includeUnusedCustomers: false,
    });
    const current = {
      ...first.data,
      documents: first.data.documents.map(asDraft),
    };
    const previousOfferIds = current.documents
      .filter((document) => document.type === "presupuesto")
      .map((document) => document.id);
    const previousCustomerIds = current.customers.map((customer) => customer.id);

    const invoicesOnly = buildPcFacturacionImport(
      current,
      {
        Contacts: [],
        Invoice: baseTables.Invoice,
        Offer: [],
        Positions: baseTables.Positions,
      },
      { includeUnusedCustomers: false },
    );

    expect(
      invoicesOnly.data.documents
        .filter((document) => document.type === "presupuesto")
        .map((document) => document.id),
    ).toEqual(previousOfferIds);
    expect(invoicesOnly.data.customers.map((customer) => customer.id)).toEqual(
      previousCustomerIds,
    );
    expect(
      invoicesOnly.data.documents.filter(
        (document) => document.type === "factura",
      ),
    ).toHaveLength(1);
  });

  it("conserva facturas y clientes si sus tablas vienen vacías junto a presupuestos", () => {
    const first = buildPcFacturacionImport(TEST_DATA, baseTables, {
      includeUnusedCustomers: false,
    });
    const current = {
      ...first.data,
      documents: first.data.documents.map(asDraft),
    };
    const previousInvoiceIds = current.documents
      .filter((document) => document.type === "factura")
      .map((document) => document.id);
    const previousCustomerIds = current.customers.map((customer) => customer.id);

    const offersOnly = buildPcFacturacionImport(
      current,
      {
        Contacts: [],
        Invoice: [],
        Offer: baseTables.Offer,
        Positions: baseTables.Positions,
      },
      { includeUnusedCustomers: false },
    );

    expect(
      offersOnly.data.documents
        .filter((document) => document.type === "factura")
        .map((document) => document.id),
    ).toEqual(previousInvoiceIds);
    expect(offersOnly.data.customers.map((customer) => customer.id)).toEqual(
      previousCustomerIds,
    );
    expect(
      offersOnly.data.documents.filter(
        (document) => document.type === "presupuesto",
      ),
    ).toHaveLength(1);
  });

  it("propone autorrellenar ajustes de empresa desde campos alternativos del importador", () => {
    const result = buildPcFacturacionImport(
      EMPTY_DATA,
      {
        ...baseTables,
        Client: [
          {
            ClientName: "Taller Importado SL",
            FiscalNumber: "CIF B-65305450",
            Direccion: "Avenida Taller 15",
            CP: "28001",
            City: "Madrid",
            Phone: "910000000",
            Mail: "hola@taller.test",
            IBAN: "ES12 0000 0000 0000 0000 0000",
          },
        ],
        Positions: [
          {
            ...baseTables.Positions[0],
            UnitpriceVat: 2.5,
            VatCode: "N 5 %",
          },
          ...baseTables.Positions.slice(1),
        ],
      },
      { includeUnusedCustomers: false },
    );
    const appliedProfile = applyBusinessProfileAutofillSuggestion(
      result.data.profile,
      result.profileSuggestion,
    );

    expect(result.data.profile.name).toBe("");
    expect(appliedProfile).toMatchObject({
      name: "Taller Importado SL",
      nif: "B65305450",
      address: "Avenida Taller 15",
      postalCode: "28001",
      city: "Madrid",
      phone: "910000000",
      email: "hola@taller.test",
      iban: "ES12 0000 0000 0000 0000 0000",
    });
    expect(appliedProfile.iva.rates).toContain(5);
  });

  it("permite marcar como pagadas las facturas importadas que vienen impagadas", () => {
    const tables = {
      ...baseTables,
      Invoice: [
        {
          ...baseTables.Invoice[0],
          Paid: false,
        },
      ],
    };
    const keepResult = buildPcFacturacionImport(EMPTY_DATA, tables, {
      includeUnusedCustomers: false,
    });
    const markPaidResult = buildPcFacturacionImport(EMPTY_DATA, tables, {
      includeUnusedCustomers: false,
      markUnpaidInvoicesAsPaid: true,
    });

    expect(keepResult.preview.unpaidInvoices).toBe(1);
    expect(keepResult.preview.unpaidInvoicesMarkedPaid).toBe(false);
    expect(keepResult.data.documents.find((doc) => doc.type === "factura")?.status).toBe(
      "enviado",
    );
    expect(markPaidResult.preview.unpaidInvoices).toBe(1);
    expect(markPaidResult.preview.unpaidInvoicesMarkedPaid).toBe(true);
    expect(markPaidResult.data.documents.find((doc) => doc.type === "factura")?.status).toBe(
      "pagado",
    );
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
