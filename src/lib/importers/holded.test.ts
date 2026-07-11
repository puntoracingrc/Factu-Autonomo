import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveOptInFixturePath } from "../../../scripts/private-fixture-paths.mjs";
import {
  buildHoldedImport,
  parseHoldedWorkbookBuffer,
  type HoldedInputSheet,
} from "./holded";
import { expenseFiscalAmounts } from "../expenses";
import { EMPTY_DATA, type Document } from "../types";

const TEST_DATA = {
  ...EMPTY_DATA,
  profile: {
    ...EMPTY_DATA.profile,
    name: "Negocio de pruebas",
    nif: "12345678Z",
    address: "Calle Pruebas 1",
    postalCode: "28001",
    city: "Madrid",
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

const baseSheets: HoldedInputSheet[] = [
  {
    name: "Contactos",
    kind: "contacts",
    rows: [
      {
        contact_id: "hol_con_1",
        tipo_contacto: "cliente",
        nombre: "Cliente Holded SL",
        nombre_comercial: "Cliente Holded",
        nif: "B12345674",
        email: "cliente@example.test",
        telefono: "911111111",
        direccion: "Calle Demo 1",
        codigo_postal: "28001",
        ciudad: "Madrid",
      },
      {
        contact_id: "hol_con_2",
        tipo_contacto: "cliente_proveedor",
        nombre: "Mixto Holded SL",
        nombre_comercial: "Mixto Holded",
        nif: "B76543214",
        email: "mixto@example.test",
        telefono: "922222222",
        direccion: "Calle Mixta 2",
        codigo_postal: "28002",
        ciudad: "Madrid",
      },
    ],
  },
  {
    name: "Productos",
    kind: "products",
    rows: [
      {
        product_id: "hol_pro_1",
        sku: "SERV-1",
        nombre: "Servicio demo",
        descripcion: "Servicio demo importado",
        impuesto_venta: 21,
      },
    ],
  },
  {
    name: "Facturas",
    kind: "invoices",
    rows: [
      {
        invoice_id: "hol_inv_1",
        numero: "F2026-0001",
        fecha: "2026-06-29",
        vencimiento: "2026-07-29",
        cliente_contact_id: "hol_con_1",
        cliente_nombre: "Cliente Holded SL",
        cliente_nif: "B12345674",
        estado: "pendiente",
        base_imponible: 100,
        iva_total: 21,
        total: 121,
        metodo_pago: "transferencia",
        pdf_adjunto: "facturas/F2026-0001.pdf",
      },
      {
        invoice_id: "hol_inv_2",
        numero: "F2026-0002",
        fecha: "2026-06-30",
        cliente_contact_id: "hol_con_2",
        cliente_nombre: "Mixto Holded SL",
        cliente_nif: "B76543214",
        estado: "cobrada_parcial",
        base_imponible: 50,
        iva_total: 10.5,
        total: 60.5,
      },
    ],
  },
  {
    name: "Lineas factura",
    kind: "invoiceLines",
    rows: [
      {
        invoice_id: "hol_inv_1",
        linea: 1,
        product_id: "hol_pro_1",
        descripcion: "Servicio demo importado",
        cantidad: 1,
        precio_unitario: 100,
        descuento_pct: 0,
        impuesto_pct: 21,
        base_linea: 100,
        iva_linea: 21,
        total_linea: 121,
      },
      {
        invoice_id: "hol_inv_2",
        linea: 1,
        product_id: "hol_pro_1",
        descripcion: "Servicio parcial",
        cantidad: 1,
        precio_unitario: 50,
        descuento_pct: 0,
        impuesto_pct: 21,
        base_linea: 50,
        iva_linea: 10.5,
        total_linea: 60.5,
      },
    ],
  },
  {
    name: "Gastos compras",
    kind: "purchases",
    rows: [
      {
        purchase_id: "hol_pur_1",
        numero: "G-1",
        fecha: "2026-06-29",
        proveedor_contact_id: "hol_con_2",
        proveedor_nombre: "Mixto Holded SL",
        tipo: "factura_compra",
        base_imponible: 40,
        iva_total: 8.4,
        total: 48.4,
        categoria: "Materiales",
      },
    ],
  },
  {
    name: "Lineas gasto",
    kind: "purchaseLines",
    rows: [
      {
        purchase_id: "hol_pur_1",
        linea: 1,
        product_id: "hol_pro_1",
        descripcion: "Compra demo",
        cantidad: 1,
        precio_unitario: 40,
        impuesto_pct: 21,
        base_linea: 40,
        iva_linea: 8.4,
        total_linea: 48.4,
      },
    ],
  },
  {
    name: "Presupuestos",
    kind: "estimates",
    rows: [
      {
        estimate_id: "hol_est_1",
        numero: "P2026-0001",
        fecha: "2026-06-28",
        valido_hasta: "2026-07-28",
        cliente_contact_id: "hol_con_1",
        cliente_nombre: "Cliente Holded SL",
        estado: "aceptado",
        base_imponible: 100,
        iva_total: 21,
        total: 121,
        convertido_en_factura: "F2026-0001",
      },
    ],
  },
  {
    name: "Lineas presupuesto",
    kind: "estimateLines",
    rows: [
      {
        estimate_id: "hol_est_1",
        linea: 1,
        product_id: "hol_pro_1",
        descripcion: "Presupuesto demo",
        cantidad: 1,
        precio_unitario: 100,
        impuesto_pct: 21,
        base_linea: 100,
        iva_linea: 21,
        total_linea: 121,
      },
    ],
  },
  {
    name: "Adjuntos",
    kind: "attachments",
    rows: [
      {
        document_type: "invoice",
        document_id: "hol_inv_1",
        file_name: "F2026-0001.pdf",
      },
    ],
  },
];

describe("Holded importer", () => {
  it("importa el fixture inferido con IDs externos y avisa de no soportados", () => {
    const result = buildHoldedImport(TEST_DATA, baseSheets);

    expect(result.preview).toMatchObject({
      sourceName: "Holded",
      confidence: "fixture_inferido",
      customers: 2,
      suppliers: 1,
      mixedRoleContacts: 1,
      productsRead: 1,
      productsUsedForLines: 1,
      invoices: 2,
      invoiceLines: 2,
      estimates: 1,
      estimateLines: 1,
      expenses: 1,
      expenseLines: 1,
    });
    expect(result.data.customers.some((customer) => customer.id === "holded:customer:hol_con_1")).toBe(true);
    expect(result.data.suppliers.some((supplier) => supplier.id === "holded:supplier:hol_con_2")).toBe(true);
    expect(
      result.data.customers.find((customer) => customer.id === "holded:customer:hol_con_1"),
    ).toMatchObject({
      customerType: "company",
      firstName: "Cliente Holded",
      lastName: "",
      nif: "B12345674",
    });
    const invoice = result.data.documents.find((doc) => doc.id === "holded:factura:hol_inv_1");
    expect(invoice).toMatchObject({
      number: "F2026-0001",
      customerId: "holded:customer:hol_con_1",
      dueDate: "2026-07-29",
      paymentStatus: "pending",
      client: {
        customerType: "company",
        name: "Cliente Holded",
      },
    });
    const partial = result.data.documents.find((doc) => doc.id === "holded:factura:hol_inv_2");
    expect(partial?.paymentStatus).toBe("pending");
    expect(partial?.dueDate).toBeUndefined();
    expect(result.data.expenses[0]).toMatchObject({
      id: "holded:expense:hol_pur_1",
      supplierId: "holded:supplier:hol_con_2",
      amount: 40,
      ivaPercent: 21,
      purchaseLines: [
        {
          id: "holded:purchase-line:hol_pur_1-1",
          catalogProduct: false,
          total: 40,
          ivaPercent: 21,
        },
      ],
    });
    expect(result.unsupported.map((item) => item.label)).toContain("Adjuntos y PDFs históricos");
    expect(result.warnings.join("\n")).toContain("fixture inferido");
  });

  it("reimporta Holded sin duplicar el lote anterior", () => {
    const first = buildHoldedImport(TEST_DATA, baseSheets);
    const manualCustomer = {
      ...first.data.customers[0],
      id: "manual-customer",
      name: "Manual",
    };
    const second = buildHoldedImport(
      {
        ...first.data,
        customers: [...first.data.customers, manualCustomer],
      },
      baseSheets,
    );

    expect(second.data.customers.filter((customer) => customer.id.startsWith("holded:customer:"))).toHaveLength(2);
    expect(second.data.documents.filter((doc) => doc.id.startsWith("holded:factura:"))).toHaveLength(2);
    expect(second.data.customers.some((customer) => customer.id === "manual-customer")).toBe(true);
  });

  it("conserva el IVA por línea de una compra mixta y calcula su cuota real", () => {
    const mixedSheets = baseSheets.map((sheet) => {
      if (sheet.kind === "purchases") {
        return {
          ...sheet,
          rows: sheet.rows.map((row) => ({
            ...row,
            base_imponible: 200,
            iva_total: 31,
            total: 231,
          })),
        };
      }
      if (sheet.kind === "purchaseLines") {
        return {
          ...sheet,
          rows: [
            {
              purchase_id: "hol_pur_1",
              linea: 1,
              descripcion: "Compra general",
              cantidad: 1,
              precio_unitario: 100,
              impuesto_pct: 21,
              base_linea: 100,
              iva_linea: 21,
              total_linea: 121,
            },
            {
              purchase_id: "hol_pur_1",
              linea: 2,
              descripcion: "Compra reducida",
              cantidad: 1,
              precio_unitario: 100,
              impuesto_pct: 10,
              base_linea: 100,
              iva_linea: 10,
              total_linea: 110,
            },
          ],
        };
      }
      return sheet;
    });

    const result = buildHoldedImport(TEST_DATA, mixedSheets);
    const expense = result.data.expenses[0];

    expect(expense.purchaseLines).toMatchObject([
      {
        id: "holded:purchase-line:hol_pur_1-1",
        catalogProduct: false,
        total: 100,
        ivaPercent: 21,
      },
      {
        id: "holded:purchase-line:hol_pur_1-2",
        catalogProduct: false,
        total: 100,
        ivaPercent: 10,
      },
    ]);
    expect(expenseFiscalAmounts(expense)).toMatchObject({
      registeredBase: 200,
      registeredIva: 31,
      registeredTotal: 231,
    });
  });

  it("no convierte en 0 un tipo de IVA de compra ilegible", () => {
    const invalidVatSheets = baseSheets.map((sheet) => {
      if (sheet.kind === "purchases") {
        return {
          ...sheet,
          rows: sheet.rows.map((row) => ({
            ...row,
            base_imponible: 200,
            iva_total: 31,
            total: 231,
          })),
        };
      }
      if (sheet.kind === "purchaseLines") {
        return {
          ...sheet,
          rows: [
            {
              purchase_id: "hol_pur_1",
              linea: 1,
              descripcion: "Compra general",
              cantidad: 1,
              precio_unitario: 100,
              impuesto_pct: 21,
              base_linea: 100,
            },
            {
              purchase_id: "hol_pur_1",
              linea: 2,
              descripcion: "Tipo ilegible",
              cantidad: 1,
              precio_unitario: 100,
              impuesto_pct: "N/A",
              base_linea: 100,
            },
          ],
        };
      }
      return sheet;
    });

    const result = buildHoldedImport(TEST_DATA, invalidVatSheets);
    const imported = result.data.expenses[0];

    expect(imported.purchaseLines?.[1]?.ivaPercent).toBeUndefined();
    expect(result.warnings.join("\n")).toContain("tipo de IVA ilegible");
    expect(result.warnings.join("\n")).toContain("sin inventar un 0 %");
    expect(expenseFiscalAmounts(imported)).toMatchObject({
      vatSource: "blocked",
      vatBlocked: true,
      deductibleIva: 0,
      registeredTotal: 231,
    });
  });

  it("conserva ventas y contactos previos al importar solo compras", () => {
    const first = buildHoldedImport(TEST_DATA, baseSheets);
    const current = {
      ...first.data,
      documents: first.data.documents.map(asDraft),
    };
    const previousDocumentIds = current.documents.map((document) => document.id);
    const previousCustomerIds = current.customers.map((customer) => customer.id);
    const previousSupplierIds = current.suppliers.map((supplier) => supplier.id);

    const purchaseOnly = buildHoldedImport(current, [
      baseSheets[4],
      baseSheets[5],
    ]);

    expect(purchaseOnly.data.documents.map((document) => document.id)).toEqual(
      previousDocumentIds,
    );
    expect(purchaseOnly.data.customers.map((customer) => customer.id)).toEqual(
      previousCustomerIds,
    );
    expect(purchaseOnly.data.suppliers.map((supplier) => supplier.id)).toEqual(
      previousSupplierIds,
    );
    expect(purchaseOnly.data.expenses).toHaveLength(1);
    expect(purchaseOnly.data.expenses[0]?.supplierId).toBe(
      "holded:supplier:hol_con_2",
    );
  });

  it("conserva gastos y presupuestos al importar solo facturas", () => {
    const first = buildHoldedImport(TEST_DATA, baseSheets);
    const current = {
      ...first.data,
      documents: first.data.documents.map(asDraft),
    };
    const previousExpenseIds = current.expenses.map((expense) => expense.id);
    const previousEstimateIds = current.documents
      .filter((document) => document.type === "presupuesto")
      .map((document) => document.id);

    const invoicesOnly = buildHoldedImport(current, [
      baseSheets[2],
      baseSheets[3],
    ]);

    expect(invoicesOnly.data.expenses.map((expense) => expense.id)).toEqual(
      previousExpenseIds,
    );
    expect(
      invoicesOnly.data.documents
        .filter((document) => document.type === "presupuesto")
        .map((document) => document.id),
    ).toEqual(previousEstimateIds);
    expect(
      invoicesOnly.data.documents.filter(
        (document) => document.type === "factura",
      ),
    ).toHaveLength(2);
    expect(
      invoicesOnly.data.documents.find(
        (document) => document.id === "holded:factura:hol_inv_1",
      ),
    ).toMatchObject({
      customerId: "holded:customer:hol_con_1",
      client: {
        phone: "911111111",
      },
    });
  });

  it("prioriza un contacto nuevo sobre el cliente Holded reutilizable", () => {
    const first = buildHoldedImport(TEST_DATA, baseSheets);
    const current = {
      ...first.data,
      customers: first.data.customers.map((customer) =>
        customer.id === "holded:customer:hol_con_1"
          ? { ...customer, phone: "900000000" }
          : customer,
      ),
      documents: first.data.documents.map(asDraft),
    };

    const result = buildHoldedImport(current, [
      baseSheets[0],
      baseSheets[2],
      baseSheets[3],
    ]);

    expect(
      result.data.documents.find(
        (document) => document.id === "holded:factura:hol_inv_1",
      )?.client.phone,
    ).toBe("911111111");
  });

  it.each([
    {
      label: "vacía",
      value: "",
      expected: /campo fecha está vacío.*No se aplicó ningún cambio/i,
    },
    {
      label: "imposible",
      value: "31/02/2026",
      expected:
        /campo fecha contiene una fecha inválida.*No se aplicó ningún cambio/i,
    },
    {
      label: "imposible con hora",
      value: "2026-02-30T10:00:00+01:00",
      expected:
        /campo fecha contiene una fecha inválida.*No se aplicó ningún cambio/i,
    },
  ])(
    "rechaza una factura con fecha $label sin modificar el lote actual",
    ({ value, expected }) => {
      const current = buildHoldedImport(TEST_DATA, baseSheets).data;
      const before = structuredClone(current);
      const invalidSheets = baseSheets.map((sheet) =>
        sheet.kind === "invoices"
          ? {
              ...sheet,
              rows: sheet.rows.map((row) =>
                row.invoice_id === "hol_inv_1"
                  ? { ...row, fecha: value }
                  : row,
              ),
            }
          : sheet,
      );

      expect(() => buildHoldedImport(current, invalidSheets)).toThrow(expected);
      expect(current).toEqual(before);
    },
  );

  it("rechaza un vencimiento informado pero inválido sin inventar una fecha", () => {
    const current = buildHoldedImport(TEST_DATA, baseSheets).data;
    const before = structuredClone(current);
    const invalidSheets = baseSheets.map((sheet) =>
      sheet.kind === "invoices"
        ? {
            ...sheet,
            rows: sheet.rows.map((row) =>
              row.invoice_id === "hol_inv_1"
                ? { ...row, vencimiento: "fecha desconocida" }
                : row,
            ),
          }
        : sheet,
    );

    expect(() => buildHoldedImport(current, invalidSheets)).toThrow(
      /la factura "F2026-0001".*campo vencimiento contiene una fecha inválida.*No se aplicó ningún cambio/i,
    );
    expect(current).toEqual(before);
  });

  it.each([
    {
      label: "vacía",
      value: "",
      expected: /campo fecha está vacío.*No se aplicó ningún cambio/i,
    },
    {
      label: "imposible",
      value: "2026-02-30",
      expected:
        /campo fecha contiene una fecha inválida.*No se aplicó ningún cambio/i,
    },
    {
      label: "numérica no válida",
      value: "0",
      expected:
        /campo fecha contiene una fecha inválida.*No se aplicó ningún cambio/i,
    },
  ])(
    "rechaza un gasto real con fecha $label sin modificar el lote actual",
    ({ value, expected }) => {
      const current = buildHoldedImport(TEST_DATA, baseSheets).data;
      const before = structuredClone(current);
      const invalidSheets = baseSheets.map((sheet) =>
        sheet.kind === "purchases"
          ? {
              ...sheet,
              rows: sheet.rows.map((row) =>
                row.purchase_id === "hol_pur_1"
                  ? { ...row, fecha: value }
                  : row,
              ),
            }
          : sheet,
      );

      expect(() => buildHoldedImport(current, invalidSheets)).toThrow(expected);
      expect(current).toEqual(before);
    },
  );

  it("una fila de total sin identidad no borra gastos previos", () => {
    const first = buildHoldedImport(TEST_DATA, baseSheets);
    const previousExpenseIds = first.data.expenses.map((expense) => expense.id);

    const result = buildHoldedImport(first.data, [
      {
        name: "Gastos",
        kind: "purchases",
        rows: [
          {
            purchase_id: "",
            numero: "TOTAL",
            proveedor: "Resumen",
            total: 999,
          },
        ],
      },
    ]);

    expect(result.data.expenses.map((expense) => expense.id)).toEqual(
      previousExpenseIds,
    );
  });
});

const realFixture =
  resolveOptInFixturePath(
    "COMPETITOR_IMPORT_FIXTURES_ROOT",
    "exports",
    "holded",
    "holded-synthetic-export-v1.xlsx",
  ) ?? "";

describe.runIf(realFixture)("Holded synthetic XLSX fixture", () => {
  it("lee el XLSX multihoja inferido", async () => {
    const file = readFileSync(realFixture);
    const sheets = parseHoldedWorkbookBuffer(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
    );
    const result = buildHoldedImport(TEST_DATA, sheets);

    expect(result.preview.confidence).toBe("fixture_inferido");
    expect(result.preview.customers).toBeGreaterThan(0);
    expect(result.preview.suppliers).toBeGreaterThan(0);
    expect(result.preview.invoices).toBeGreaterThan(0);
    expect(result.preview.estimates).toBeGreaterThan(0);
    expect(result.preview.expenses).toBeGreaterThan(0);
    expect(result.preview.attachments).toBeGreaterThan(0);
    expect(result.preview.dateRange.from).toMatch(/^2026-/);
    expect(result.preview.dateRange.to).toMatch(/^2026-/);
  });
});
