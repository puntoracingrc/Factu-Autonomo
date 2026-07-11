import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES } from "./limits";
import { resolveScanMimeType, validateScanFile } from "./file-validation";
import {
  filterWarningsAfterPdfLineExtraction,
  mergePdfPurchaseLineVat,
  resolveExpenseScanMaxTokens,
} from "./openai";

function mockFile(name: string, type: string, size = 1000): File {
  return { name, type, size } as File;
}

describe("validateScanFile", () => {
  it("acepta PDF por tipo o extensión", () => {
    expect(validateScanFile(mockFile("factura.pdf", "application/pdf"))).toBeNull();
    expect(validateScanFile(mockFile("factura.pdf", ""))).toBeNull();
  });

  it("acepta imágenes habituales", () => {
    expect(validateScanFile(mockFile("ticket.jpg", "image/jpeg"))).toBeNull();
  });

  it("rechaza formatos no soportados", () => {
    expect(validateScanFile(mockFile("doc.docx", "application/msword"))).toMatch(
      /no soportado/i,
    );
  });

  it("rechaza imágenes por encima del límite", () => {
    expect(
      validateScanFile(mockFile("foto.jpg", "image/jpeg", MAX_IMAGE_BYTES + 1)),
    ).toMatch(/demasiado grande/i);
  });
});

describe("resolveScanMimeType", () => {
  it("infiere PDF sin mime del navegador", () => {
    expect(resolveScanMimeType(mockFile("a.PDF", ""))).toBe("application/pdf");
  });
});

describe("resolveExpenseScanMaxTokens", () => {
  it("usa un margen suficiente para facturas con muchas líneas", () => {
    expect(resolveExpenseScanMaxTokens()).toBe(6000);
  });

  it("permite configurar el margen dentro de límites razonables", () => {
    expect(resolveExpenseScanMaxTokens("4200")).toBe(4200);
    expect(resolveExpenseScanMaxTokens("1200")).toBe(2000);
    expect(resolveExpenseScanMaxTokens("15000")).toBe(12000);
  });
});

describe("filterWarningsAfterPdfLineExtraction", () => {
  it("elimina avisos obsoletos cuando el lector del PDF recupera todas las líneas", () => {
    expect(
      filterWarningsAfterPdfLineExtraction(
        [
          "Documento contiene múltiples líneas de productos, se han extraído las primeras 5.",
          "Revisar si conviene configurar como gasto fijo.",
          "Revisa el NIF del proveedor.",
        ],
        40,
        "purchase_invoice",
      ),
    ).toEqual(["Revisa el NIF del proveedor."]);
  });

  it("mantiene sugerencias de gasto fijo cuando el gasto realmente es fijo", () => {
    expect(
      filterWarningsAfterPdfLineExtraction(
        ["Revisar si conviene configurar como gasto fijo."],
        2,
        "fixed",
      ),
    ).toEqual(["Revisar si conviene configurar como gasto fijo."]);
  });
});

describe("mergePdfPurchaseLineVat", () => {
  it("conserva los tipos de IVA visuales al ampliar una tabla PDF", () => {
    const merged = mergePdfPurchaseLineVat(
      [
        { supplierReference: "A-1", description: "Material", quantity: 1, unitPrice: 100 },
        { supplierReference: "B-2", description: "Transporte", quantity: 1, unitPrice: 100 },
        { supplierReference: "C-3", description: "Embalaje", quantity: 1, unitPrice: 10 },
      ],
      [
        { supplierReference: "A-1", description: "Material", quantity: 1, unitPrice: 100, ivaPercent: 21 },
        { supplierReference: "B-2", description: "Transporte", quantity: 1, unitPrice: 100, ivaPercent: 10 },
      ],
    );

    expect(merged.map((line) => line.ivaPercent)).toEqual([21, 10, undefined]);
  });

  it("no asigna IVA por posición ni por una clave ambigua", () => {
    const merged = mergePdfPurchaseLineVat(
      [
        { description: "Fila distinta", quantity: 1, unitPrice: 100 },
        { description: "Repetida", quantity: 1, unitPrice: 50 },
        { description: "Repetida", quantity: 1, unitPrice: 50 },
      ],
      [
        { description: "Otra fila", quantity: 1, unitPrice: 100, ivaPercent: 21 },
        { description: "Repetida", quantity: 1, unitPrice: 50, ivaPercent: 10 },
        { description: "Repetida", quantity: 1, unitPrice: 50, ivaPercent: 4 },
      ],
    );

    expect(merged.map((line) => line.ivaPercent)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });
});
