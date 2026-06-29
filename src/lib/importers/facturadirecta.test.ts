import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildFacturaDirectaImport,
  detectFacturaDirectaRows,
  readFacturaDirectaFiles,
} from "./facturadirecta";
import { EMPTY_DATA } from "../types";

const baseFiles = [
  {
    name: "contactos-listado.csv",
    rows: [
      {
        Detalle: "Proveedor Materiales Demo SL (Proveedor Materiales Demo)",
        NIF: "B76543214",
        Email: "proveedor@example.test",
        Teléfono: "+34910000202",
        Población: "Madrid",
        País: "ES",
        Nombre: "Proveedor Materiales Demo SL",
        "Mostrar como": "Proveedor Materiales Demo",
        "Cód. proveedor externo": "001",
        Dirección: "Avenida Proveedor Demo 5",
        "Código postal": "28020",
        "Fecha creación": "29-06-2026 20:41:12",
        Notas: "Proveedor ficticio",
      },
      {
        Detalle: "Cliente Importador Demo SL (Cliente Importador Demo)",
        NIF: "B12345674",
        Email: "cliente@example.test",
        Teléfono: "+34910000101",
        Población: "Madrid",
        País: "ES",
        Nombre: "Cliente Importador Demo SL",
        "Mostrar como": "Cliente Importador Demo",
        "Cód. cliente externo": "001",
        Dirección: "Calle Cliente Demo 12, 2B",
        "Código postal": "28013",
        "Fecha creación": "29-06-2026 20:36:07",
        Notas: "Cliente ficticio",
      },
    ],
  },
  {
    name: "productos-listado.csv",
    rows: [
      {
        "Tipo de producto": "Compra",
        Código: "",
        Nombre: "Alquiler",
        "Precio de compra": "0",
        "Descripción de compra": "Alquiler",
        "Impuestos de compra": "P_IVA_21_SV",
      },
      {
        "Tipo de producto": "Venta y compra",
        Código: "MAT-PERS-001",
        Nombre: "Kit persiana demo",
        "Precio de venta": "120",
        "Descripción de venta": "Kit de persiana demo",
        "Dto. venta": "0.05",
        "Impuestos de venta": "S_IVA_21",
      },
    ],
  },
  {
    name: "ventas-listado.csv",
    rows: [
      {
        Tipo: "Factura",
        Fecha: "29-06-2026",
        Estado: "Pendiente",
        "Serie / Núm.": "F26 00000001",
        "Cliente / Detalle": "Cliente Importador Demo SL - Kit de persiana demo",
        Subtotal: "114",
        Total: "137.94",
        Moneda: "EUR",
        Serie: "F26",
        Cliente: "Cliente Importador Demo",
        Nombre: "Cliente Importador Demo SL",
        "Mostrar como": "Cliente Importador Demo",
        NIF: "B12345674",
        Email: "cliente@example.test",
        Vencimiento: "29-07-2026",
        "Método de pago": "Transferencia demo",
        Adjuntos: "1",
        Enviados: "0",
        Notas: "Nota visible",
        "Notas internas": "No debe hacerse visible",
      },
      {
        Tipo: "Presupuesto",
        Fecha: "29-06-2026",
        Estado: "Cerrado",
        "Serie / Núm.": "2026 00000001",
        "Cliente / Detalle": "Cliente Importador Demo SL - Kit de persiana demo",
        Subtotal: "114",
        Total: "137.94",
        Moneda: "EUR",
        Cliente: "Cliente Importador Demo",
        Nombre: "Cliente Importador Demo SL",
        "Mostrar como": "Cliente Importador Demo",
        NIF: "B12345674",
        Vencimiento: "27-09-2026",
      },
    ],
  },
  {
    name: "informe-lineas-facturadas.csv",
    rows: [
      {
        Fecha: "2026-06-29",
        "Núm. Factura": "F2600000001",
        Cliente: "Cliente Importador Demo",
        "Código Prod.": "MAT-PERS-001",
        "Producto/Servicio": "Kit persiana demo",
        Cantidad: "1",
        "Precio unitario": "120",
        Descuento: "6",
        "Total línea": "114",
        Moneda: "EUR",
      },
    ],
  },
  {
    name: "informe-vencimientos-ventas.csv",
    rows: [
      {
        "Fecha del documento": "2026-06-29",
        "Título del documento": "Factura F2600000001 (29-06-2026)",
        "Nombre del contacto": "Cliente Importador Demo",
        "Importe del documento": "137.94",
        "Fecha de vencimiento": "2026-07-15",
        "Importe del vencimiento": "50",
      },
      {
        "Fecha del documento": "2026-06-29",
        "Título del documento": "Factura F2600000001 (29-06-2026)",
        "Nombre del contacto": "Cliente Importador Demo",
        "Importe del documento": "137.94",
        "Fecha de vencimiento": "2026-07-29",
        "Importe del vencimiento": "87.94",
      },
    ],
  },
  {
    name: "compras-listado.csv",
    rows: [
      {
        "Fecha registro": "29-06-2026",
        Estado: "Pendiente",
        "Núm.": "PMD-2026-0007",
        "Proveedor / Detalle":
          "Proveedor Materiales Demo SL - Compra de kit persiana demo",
        "Saldo pendiente": "94.86",
        Subtotal: "78.4",
        Total: "94.86",
        Moneda: "EUR",
      },
    ],
  },
  {
    name: "informe-vencimientos-compras.csv",
    rows: [
      {
        "Fecha del documento": "2026-06-29",
        "Título del documento": "Compra PMD-2026-0007 (29-06-2026)",
        "Nombre del contacto": "Proveedor Materiales Demo",
        "Importe del documento": "94.86",
        "Fecha de vencimiento": "2026-07-15",
        "Importe del vencimiento": "94.86",
      },
    ],
  },
] satisfies Parameters<typeof buildFacturaDirectaImport>[1];

describe("FacturaDirecta importer", () => {
  it("detecta listados por cabeceras", () => {
    expect(detectFacturaDirectaRows(baseFiles[0].rows)).toBe("contacts");
    expect(detectFacturaDirectaRows(baseFiles[1].rows)).toBe("products");
    expect(detectFacturaDirectaRows(baseFiles[2].rows)).toBe("sales");
    expect(detectFacturaDirectaRows(baseFiles[3].rows)).toBe("invoiceLines");
  });

  it("importa pack de contactos, ventas, líneas y compras sin copiar lo no soportado", () => {
    const result = buildFacturaDirectaImport(EMPTY_DATA, baseFiles);

    expect(result.preview).toMatchObject({
      customers: 1,
      suppliers: 1,
      productsRead: 2,
      productsUsedForLines: 1,
      systemProductsSkipped: 1,
      invoices: 1,
      invoiceLines: 1,
      estimates: 1,
      estimateFallbackLines: 1,
      expenses: 1,
      partialDueDateDocuments: 1,
      internalNotes: 1,
      attachments: 1,
    });
    expect(result.data.customers[0]).toMatchObject({
      name: "Cliente Importador Demo",
      nif: "B12345674",
    });
    expect(result.data.suppliers[0]).toMatchObject({
      name: "Proveedor Materiales Demo",
      nif: "B76543214",
    });
    const invoice = result.data.documents.find((doc) => doc.type === "factura");
    expect(invoice).toMatchObject({
      number: "F26 00000001",
      customerId: "facturadirecta:customer:001",
      dueDate: "2026-07-29",
      notes: "Nota visible",
    });
    expect(invoice?.notes).not.toContain("No debe hacerse visible");
    expect(invoice?.items[0]).toMatchObject({
      description: "Kit de persiana demo",
      unitPrice: 114,
      ivaPercent: 21,
    });
    expect(result.data.expenses[0]).toMatchObject({
      supplierId: "facturadirecta:supplier:001",
      amount: 78.4,
      ivaPercent: 21,
    });
    expect(result.data.expenses[0].notes).toContain("2026-07-15");
    expect(result.unsupported.map((item) => item.label)).toContain(
      "Notas internas de ventas",
    );
  });

  it("reimporta FacturaDirecta sin duplicar el lote anterior", () => {
    const first = buildFacturaDirectaImport(EMPTY_DATA, baseFiles);
    const manualCustomer = {
      ...first.data.customers[0],
      id: "manual-customer",
      name: "Manual",
    };
    const second = buildFacturaDirectaImport(
      {
        ...first.data,
        customers: [...first.data.customers, manualCustomer],
      },
      baseFiles,
    );

    expect(second.data.customers.filter((customer) => customer.id.startsWith("facturadirecta:customer:"))).toHaveLength(1);
    expect(second.data.customers.some((customer) => customer.id === "manual-customer")).toBe(true);
    expect(second.data.documents.filter((doc) => doc.id.startsWith("facturadirecta:factura:"))).toHaveLength(1);
  });
});

const realFixturesDir =
  "/Users/macbookpro14/Documents/New project 2/artifacts/competitor-import-fixtures/exports/facturadirecta";
const realFixtureNames = [
  "contactos-listado.csv",
  "productos-listado.csv",
  "ventas-listado.csv",
  "informe-lineas-facturadas.csv",
  "informe-vencimientos-ventas.csv",
  "compras-listado.csv",
  "informe-vencimientos-compras.csv",
];

describe.runIf(existsSync(realFixturesDir))("FacturaDirecta real fixtures", () => {
  it("lee los CSV reales exportados desde FacturaDirecta", async () => {
    const files = realFixtureNames.map((name) => {
      const buffer = readFileSync(join(realFixturesDir, name));
      return new File([new Uint8Array(buffer)], name);
    });
    const result = await readFacturaDirectaFiles(files, EMPTY_DATA);

    expect(result.preview.customers).toBeGreaterThan(0);
    expect(result.preview.suppliers).toBeGreaterThan(0);
    expect(result.preview.invoices).toBeGreaterThan(0);
    expect(result.preview.expenses).toBeGreaterThan(0);
    expect(result.data.documents.some((doc) => doc.number === "F26 00000001")).toBe(true);
    expect(result.data.expenses.some((expense) => expense.description)).toBe(true);
  });
});
