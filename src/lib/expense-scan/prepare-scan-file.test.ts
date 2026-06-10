import { describe, expect, it } from "vitest";
import { COMPRESS_IMAGE_ABOVE_BYTES } from "./limits";
import { shouldCompressScanImage } from "./prepare-scan-file";

function mockFile(name: string, type: string, size = 1000): File {
  return { name, type, size } as File;
}

describe("shouldCompressScanImage", () => {
  it("comprime fotos grandes del móvil", () => {
    expect(
      shouldCompressScanImage(
        mockFile("factura.jpg", "image/jpeg", COMPRESS_IMAGE_ABOVE_BYTES + 1),
      ),
    ).toBe(true);
  });

  it("no comprime imágenes pequeñas", () => {
    expect(shouldCompressScanImage(mockFile("ticket.jpg", "image/jpeg", 500_000))).toBe(
      false,
    );
  });

  it("no comprime PDF", () => {
    expect(
      shouldCompressScanImage(
        mockFile("factura.pdf", "application/pdf", 10 * 1024 * 1024),
      ),
    ).toBe(false);
  });
});
