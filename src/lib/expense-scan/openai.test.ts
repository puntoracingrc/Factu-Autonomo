import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES } from "./limits";
import { resolveScanMimeType, validateScanFile } from "./file-validation";
import {
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
