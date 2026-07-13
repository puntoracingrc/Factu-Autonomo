import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { EMPTY_DATA, type Document } from "../types";
import {
  GENERIC_DOCUMENTS_SOURCE_NAME,
  parseLinesFromSequentialText,
  readGenericDocumentFiles,
} from "./generic-documents";

const TEST_DATA = {
  ...EMPTY_DATA,
  profile: {
    ...EMPTY_DATA.profile,
    name: "Negocio de pruebas",
    nif: "B12345674",
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

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellRef(column: number, row: number): string {
  let dividend = column + 1;
  let letters = "";
  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    letters = String.fromCharCode(65 + modulo) + letters;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  return `${letters}${row}`;
}

function sheetXml(rows: string[][]): string {
  const body = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map(
            (value, columnIndex) =>
              `<c r="${cellRef(columnIndex, rowIndex + 1)}" t="inlineStr"><is><t>${xml(value)}</t></is></c>`,
          )
          .join("")}</row>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function xlsxFile(name: string, rows: string[][]): File {
  const archive = zipSync({
    "[Content_Types].xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    ),
    "_rels/.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ),
    "xl/workbook.xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Datos" sheetId="1" r:id="rId1"/></sheets></workbook>',
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    ),
    "xl/worksheets/sheet1.xml": strToU8(sheetXml(rows)),
  });
  return new File([archive], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function docxFile(name: string, lines: string[]): File {
  const paragraphs = lines
    .map((line) => `<w:p><w:r><w:t>${xml(line)}</w:t></w:r></w:p>`)
    .join("");
  const archive = zipSync({
    "[Content_Types].xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ),
    "_rels/.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    ),
    "word/document.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}</w:body></w:document>`,
    ),
  });
  return new File([archive], name, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function pdfFile(name: string, lines: string[]): File {
  const stream = lines.map((line) => `(${line.replace(/[()\\]/g, "\\$&")}) Tj`).join("\n");
  const pdf = `%PDF-1.4
1 0 obj
<< /Length ${stream.length} >>
stream
${stream}
endstream
endobj
%%EOF`;
  return new File([pdf], name, { type: "application/pdf" });
}

const contactRows = [
  ["ID", "Nombre fiscal", "NIF", "Email", "Teléfono", "Contacto", "Dirección", "Pago", "Notas"],
  ["CLI-1", "Cliente Uno SL", "B11111111", "cliente1@example.com", "600111111", "", "Calle Uno 1", "", ""],
  ["CLI-2", "Cliente Dos SL", "B22222222", "cliente2@example.com", "600222222", "", "Calle Dos 2", "", ""],
  ["CLI-3", "Cliente Tres SL", "B33333333", "cliente3@example.com", "600333333", "", "Calle Tres 3", "", ""],
  ["CLI-4", "Cliente Cuatro SL", "B44444444", "cliente4@example.com", "600444444", "", "Calle Cuatro 4", "", ""],
  ["CLI-5", "Cliente Cinco SL", "B55555555", "cliente5@example.com", "600555555", "", "Calle Cinco 5", "", ""],
];

const supplierRows = [
  ["ID", "Nombre fiscal", "NIF", "Email", "Teléfono", "Contacto", "Dirección", "Pago", "Notas"],
  ["PRO-1", "Proveedor Uno SL", "B66666661", "proveedor1@example.com", "900111111", "", "Poligono 1", "", ""],
  ["PRO-2", "Proveedor Dos SL", "B66666662", "proveedor2@example.com", "900222222", "", "Poligono 2", "", ""],
  ["PRO-3", "Proveedor Tres SL", "B66666663", "proveedor3@example.com", "900333333", "", "Poligono 3", "", ""],
  ["PRO-4", "Proveedor Cuatro SL", "B66666664", "proveedor4@example.com", "900444444", "", "Poligono 4", "", ""],
  ["PRO-5", "Proveedor Cinco SL", "B66666665", "proveedor5@example.com", "900555555", "", "Poligono 5", "", ""],
];

const invoiceRows = [
  ["Factura F2026-0001"],
  ["Número", "F2026-0001"],
  ["Fecha", "30/06/2026"],
  ["Vencimiento", "30/07/2026"],
  ["Estado", "Pendiente"],
  ["Cliente", "Cliente Uno SL"],
  ["NIF", "B11111111"],
  ["Email", "cliente1@example.com"],
  ["Dirección", "Calle Uno 1"],
  ["Código postal", "28001"],
  ["Ciudad", "Madrid"],
  ["Código", "Descripción", "Cantidad", "Precio unitario", "IVA %", "Base", "IVA", "Total"],
  ["SERV-1", "Servicio mensual", "2", "100", "21", "200", "42", "242"],
  ["Base imponible", "200"],
  ["IVA", "42"],
  ["Total", "242"],
];

const estimateLines = [
  "Presupuesto P2026-0001",
  "Número",
  "P2026-0001",
  "Fecha",
  "30/06/2026",
  "Válido hasta",
  "15/07/2026",
  "Estado",
  "Enviado",
  "Persianas Norte SL",
  "NIF: B12345674",
  "Calle del Taller 18",
  "28021 Madrid",
  "Cliente Uno SL",
  "NIF: B11111111",
  "Calle Uno 1",
  "28001 Madrid",
  "Código",
  "Descripción",
  "Cantidad",
  "Precio unitario",
  "Descuento %",
  "Base",
  "IVA",
  "Total",
  "MAT-1",
  "Material preparado",
  "1",
  "50",
  "0",
  "50",
  "10.5",
  "60.5",
  "Base imponible",
  "50",
  "IVA",
  "10.5",
  "Total",
  "60.5",
];

const pdfInvoiceLines = [
  "Factura F2026-0002",
  "Fecha",
  "01/07/2026",
  "Vencimiento",
  "31/07/2026",
  "Estado",
  "Pendiente",
  "Persianas Norte SL",
  "NIF: B12345674",
  "Calle del Taller 18",
  "28021 Madrid",
  "Cliente Dos SL",
  "NIF: B22222222",
  "Calle Dos 2",
  "28002 Madrid",
  "Código",
  "Descripción",
  "Cantidad",
  "Precio unitario",
  "Descuento %",
  "Base",
  "IVA",
  "Total",
  "SERV-2",
  "Servicio urgente",
  "1",
  "80",
  "0",
  "80",
  "16.8",
  "96.8",
  "Base imponible",
  "80",
  "IVA",
  "16.8",
  "Total",
  "96.8",
];

describe("readGenericDocumentFiles", () => {
  it("persiste procedencia en una factura genérica que sigue como borrador editable", async () => {
    const draftRows = invoiceRows.map((row) =>
      row[0] === "Estado" ? ["Estado", "Borrador"] : row,
    );
    const result = await readGenericDocumentFiles(
      [xlsxFile("factura-F2026-0001.xlsx", draftRows)],
      TEST_DATA,
    );
    const draft = result.data.documents.find(
      (document) => document.id === "generic-documents:factura:F2026-0001",
    );

    expect(draft?.status).toBe("borrador");
    expect(draft?.legacyImportProvenance).toMatchObject({
      schemaVersion: 2,
      kind: "external_import",
      importer: "generic_documents",
      issuerOrigin: "current_profile_at_import",
      documentStateAtImport: "draft",
    });
    expect(draft?.legacyImportAttestation).toBeUndefined();
    expect(draft?.documentSnapshot).toBeUndefined();
  });

  it("reconstruye líneas secuenciales de un PDF", () => {
    expect(parseLinesFromSequentialText(pdfInvoiceLines)).toHaveLength(1);
  });
  it("aborta si el emisor detectado pertenece a otra cuenta", async () => {
    const wrongAccount = {
      ...TEST_DATA,
      profile: { ...TEST_DATA.profile, nif: "B87654321" },
    };

    await expect(
      readGenericDocumentFiles(
        [docxFile("presupuesto-P2026-0001.docx", estimateLines)],
        wrongAccount,
      ),
    ).rejects.toThrow("no coincide con el configurado en esta cuenta");
  });

  it("aborta un lote con más de un NIF emisor", async () => {
    const secondIssuer = estimateLines.map((line) =>
      line
        .replace("P2026-0001", "P2026-0002")
        .replace("B12345674", "B87654321"),
    );

    await expect(
      readGenericDocumentFiles(
        [
          docxFile("presupuesto-P2026-0001.docx", estimateLines),
          docxFile("presupuesto-P2026-0002.docx", secondIssuer),
        ],
        { ...EMPTY_DATA, profile: { ...EMPTY_DATA.profile, nif: "" } },
      ),
    ).rejects.toThrow("más de un NIF emisor");
  });

  it("no inventa la fecha actual para una factura sin fecha válida", async () => {
    const invalidDateRows = invoiceRows.map((row) =>
      row[0] === "Fecha" ? ["Fecha", "fecha-imposible"] : row,
    );

    await expect(
      readGenericDocumentFiles(
        [xlsxFile("factura-F2026-0001.xlsx", invalidDateRows)],
        TEST_DATA,
      ),
    ).rejects.toThrow("no tiene una fecha válida");
  });

  it("rechaza una fecha de calendario imposible", async () => {
    const invalidDateRows = invoiceRows.map((row) =>
      row[0] === "Fecha" ? ["Fecha", "31/02/2026"] : row,
    );

    await expect(
      readGenericDocumentFiles(
        [xlsxFile("factura-F2026-0001.xlsx", invalidDateRows)],
        TEST_DATA,
      ),
    ).rejects.toThrow("no tiene una fecha válida");
  });

  it.each(["0", "1", "-1", "2026-02-31T10:00:00"])(
    "rechaza el valor de fecha ambiguo o imposible %j",
    async (invalidDate) => {
      const invalidDateRows = invoiceRows.map((row) =>
        row[0] === "Fecha" ? ["Fecha", invalidDate] : row,
      );

      await expect(
        readGenericDocumentFiles(
          [xlsxFile("factura-F2026-0001.xlsx", invalidDateRows)],
          TEST_DATA,
        ),
      ).rejects.toThrow("no tiene una fecha válida");
    },
  );

  it("previsualiza Excel, Word y PDF con facturas, presupuestos y contactos", async () => {
    const result = await readGenericDocumentFiles(
      [
        xlsxFile("clientes-inventados-5.xlsx", contactRows),
        xlsxFile("proveedores-inventados-5.xlsx", supplierRows),
        xlsxFile("factura-F2026-0001.xlsx", invoiceRows),
        docxFile("presupuesto-P2026-0001.docx", estimateLines),
        pdfFile("factura-F2026-0002.pdf", pdfInvoiceLines),
      ],
      TEST_DATA,
    );

    expect(result.preview.sourceName).toBe(GENERIC_DOCUMENTS_SOURCE_NAME);
    expect(result.preview.customers).toBeGreaterThanOrEqual(5);
    expect(result.preview.suppliers).toBe(5);
    expect(result.preview.invoices).toBe(2);
    expect(result.preview.estimates).toBe(1);
    expect(result.preview.invoiceLines).toBeGreaterThan(0);
    expect(result.preview.estimateLines).toBeGreaterThan(0);
    expect(result.preview.files.map((file) => file.format)).toEqual(
      expect.arrayContaining(["excel", "word", "pdf"]),
    );
    expect(result.data.documents.map((document) => document.number)).toEqual(
      expect.arrayContaining(["F2026-0001", "F2026-0002", "P2026-0001"]),
    );
    expect(result.data.customers[0]).toMatchObject({
      customerType: "company",
      name: "Cliente Uno SL",
      nif: "B11111111",
    });
    expect(
      result.data.documents.find((document) => document.number === "F2026-0001"),
    ).toMatchObject({
      client: {
        customerType: "company",
        name: "Cliente Uno SL",
      },
    });
    expect(result.warnings.join("\n")).toContain("PDF");
    expect(result.unsupported.map((item) => item.label)).toContain(
      "Adjuntos y documento visual original",
    );
  });

  it("conserva presupuestos y proveedores al importar solo una factura", async () => {
    const first = await readGenericDocumentFiles(
      [
        xlsxFile("clientes-inventados-5.xlsx", contactRows),
        xlsxFile("proveedores-inventados-5.xlsx", supplierRows),
        xlsxFile("factura-F2026-0001.xlsx", invoiceRows),
        docxFile("presupuesto-P2026-0001.docx", estimateLines),
      ],
      TEST_DATA,
    );
    const current = {
      ...first.data,
      documents: first.data.documents.map(asDraft),
    };
    const previousEstimateIds = current.documents
      .filter((document) => document.type === "presupuesto")
      .map((document) => document.id);
    const previousSupplierIds = current.suppliers.map((supplier) => supplier.id);

    const invoiceOnly = await readGenericDocumentFiles(
      [xlsxFile("factura-F2026-0001.xlsx", invoiceRows)],
      current,
    );

    expect(
      invoiceOnly.data.documents
        .filter((document) => document.type === "presupuesto")
        .map((document) => document.id),
    ).toEqual(previousEstimateIds);
    expect(invoiceOnly.data.suppliers.map((supplier) => supplier.id)).toEqual(
      previousSupplierIds,
    );
  });

  it("un archivo no reconocido no elimina ninguna categoría previa", async () => {
    const first = await readGenericDocumentFiles(
      [
        xlsxFile("clientes-inventados-5.xlsx", contactRows),
        xlsxFile("proveedores-inventados-5.xlsx", supplierRows),
        xlsxFile("factura-F2026-0001.xlsx", invoiceRows),
        docxFile("presupuesto-P2026-0001.docx", estimateLines),
      ],
      TEST_DATA,
    );
    const current = {
      ...first.data,
      documents: first.data.documents.map(asDraft),
    };

    const unknown = await readGenericDocumentFiles(
      [new File(["contenido no clasificable"], "notas.txt")],
      current,
    );

    expect(unknown.data.documents.map((document) => document.id)).toEqual(
      current.documents.map((document) => document.id),
    );
    expect(unknown.data.customers.map((customer) => customer.id)).toEqual(
      current.customers.map((customer) => customer.id),
    );
    expect(unknown.data.suppliers.map((supplier) => supplier.id)).toEqual(
      current.suppliers.map((supplier) => supplier.id),
    );
  });

  it("listados vacíos no borran maestros al importar otra categoría", async () => {
    const first = await readGenericDocumentFiles(
      [
        xlsxFile("clientes-inventados-5.xlsx", contactRows),
        xlsxFile("proveedores-inventados-5.xlsx", supplierRows),
        xlsxFile("factura-F2026-0001.xlsx", invoiceRows),
      ],
      TEST_DATA,
    );
    const current = {
      ...first.data,
      documents: first.data.documents.map(asDraft),
    };
    const previousCustomerIds = new Set(
      current.customers.map((customer) => customer.id),
    );
    const previousSupplierIds = new Set(
      current.suppliers.map((supplier) => supplier.id),
    );

    const result = await readGenericDocumentFiles(
      [
        xlsxFile("factura-F2026-0001.xlsx", invoiceRows),
        xlsxFile("clientes-vacios.xlsx", [["ID", "Nombre fiscal"]]),
        xlsxFile("proveedores-vacios.xlsx", [["ID", "Nombre fiscal"]]),
      ],
      current,
    );

    expect(
      [...previousCustomerIds].every((id) =>
        result.data.customers.some((customer) => customer.id === id),
      ),
    ).toBe(true);
    expect(
      [...previousSupplierIds].every((id) =>
        result.data.suppliers.some((supplier) => supplier.id === id),
      ),
    ).toBe(true);
  });
});
