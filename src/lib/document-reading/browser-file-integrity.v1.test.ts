import { describe, expect, it } from "vitest";
import { DocumentReadingErrorV1 } from "./contracts.v1";
import {
  hasStrictPdfMagicV1,
  readBrowserPdfFileIntegrityV1,
} from "./browser-file-integrity.v1";
import { DOCUMENT_READING_LIMITS_V1 } from "./limits.v1";

const PRIVATE_FILENAME = "PRIVATE_CUSTOMER_12345678Z.pdf";

function pdfBytes(suffix = "\nsynthetic"): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`%PDF-1.7${suffix}`);
}

function pdfFile(
  bytes: Uint8Array<ArrayBuffer> = pdfBytes(),
  type = "application/pdf",
): File {
  return new File([bytes], PRIVATE_FILENAME, { type });
}

function digestBytes(): ArrayBuffer {
  return Uint8Array.from({ length: 32 }, (_, index) => index).buffer;
}

describe("browser PDF integrity v1", () => {
  it("verifica magic, tamaño y hash sin serializar bytes ni nombre", async () => {
    const result = await readBrowserPdfFileIntegrityV1(
      { file: pdfFile() },
      { digestSha256: async () => digestBytes() },
    );
    expect(result.source).toEqual({
      mimeType: "application/pdf",
      byteLength: pdfBytes().byteLength,
      sha256: Array.from({ length: 32 }, (_, index) =>
        index.toString(16).padStart(2, "0"),
      ).join(""),
    });
    expect(new Uint8Array(result.bytes)).toEqual(pdfBytes());
    expect(Object.keys(result)).toEqual(["source"]);
    expect(JSON.stringify(result)).not.toContain(PRIVATE_FILENAME);
    expect(JSON.stringify(result)).not.toContain("bytes");
  });

  it("se abstiene mediante errores tipados ante MIME, magic o tamaño inválidos", async () => {
    await expect(
      readBrowserPdfFileIntegrityV1(
        { file: pdfFile(pdfBytes(), "image/png") },
        { digestSha256: async () => digestBytes() },
      ),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_MIME" });
    await expect(
      readBrowserPdfFileIntegrityV1(
        { file: pdfFile(new TextEncoder().encode("not-pdf")) },
        { digestSha256: async () => digestBytes() },
      ),
    ).rejects.toMatchObject({ code: "INVALID_PDF" });
    const oversized = new File(
      [new Uint8Array(DOCUMENT_READING_LIMITS_V1.maxPdfBytes + 1)],
      PRIVATE_FILENAME,
      { type: "application/pdf" },
    );
    await expect(
      readBrowserPdfFileIntegrityV1(
        { file: oversized },
        { digestSha256: async () => digestBytes() },
      ),
    ).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
  });

  it("cancela antes de leer y rechaza digest no SHA-256", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      readBrowserPdfFileIntegrityV1(
        { file: pdfFile(), signal: controller.signal },
        { digestSha256: async () => digestBytes() },
      ),
    ).rejects.toMatchObject({ code: "ABORTED" });
    await expect(
      readBrowserPdfFileIntegrityV1(
        { file: pdfFile() },
        { digestSha256: async () => new ArrayBuffer(31) },
      ),
    ).rejects.toBeInstanceOf(DocumentReadingErrorV1);
  });

  it("acepta únicamente la cabecera PDF estricta soportada", () => {
    expect(hasStrictPdfMagicV1(pdfBytes())).toBe(true);
    expect(hasStrictPdfMagicV1(new TextEncoder().encode("%PDF-3.0"))).toBe(false);
    expect(hasStrictPdfMagicV1(new TextEncoder().encode("prefix%PDF-1.7"))).toBe(
      false,
    );
  });
});
