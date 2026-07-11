import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveOptInFixturePath } from "../../../scripts/private-fixture-paths.mjs";
import {
  buildHoldedImport,
  parseHoldedWorkbookBuffer,
  type HoldedInputSheet,
} from "./holded";
import { EMPTY_DATA } from "../types";

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
    const result = buildHoldedImport(EMPTY_DATA, baseSheets);

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
    expect(result.data.expenses[0]).toMatchObject({
      id: "holded:expense:hol_pur_1",
      supplierId: "holded:supplier:hol_con_2",
      amount: 40,
      ivaPercent: 21,
    });
    expect(result.unsupported.map((item) => item.label)).toContain("Adjuntos y PDFs históricos");
    expect(result.warnings.join("\n")).toContain("fixture inferido");
  });

  it("reimporta Holded sin duplicar el lote anterior", () => {
    const first = buildHoldedImport(EMPTY_DATA, baseSheets);
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
    const result = buildHoldedImport(EMPTY_DATA, sheets);

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
