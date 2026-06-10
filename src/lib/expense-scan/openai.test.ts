import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES } from "./limits";
import { resolveScanMimeType, validateScanFile } from "./openai";

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
