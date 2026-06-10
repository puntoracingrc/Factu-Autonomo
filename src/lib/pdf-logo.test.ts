import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "./types";
import type { Document } from "./types";
import { logoMimeFormat, pdfLogoDrawSize, resolvePdfLogoUrl } from "./pdf-logo";

const baseDoc: Document = {
  id: "1",
  type: "factura",
  number: "F-2026-0001",
  date: "2026-06-09",
  client: { name: "Cliente" },
  items: [],
  status: "enviado",
  createdAt: "",
  updatedAt: "",
};

describe("resolvePdfLogoUrl", () => {
  it("usa el logo del perfil si el snapshot emitido no lo tenía", () => {
    const profile = {
      ...DEFAULT_PROFILE,
      logoUrl: "data:image/png;base64,abc",
    };
    const doc: Document = {
      ...baseDoc,
      issuer: {
        name: "Emisor",
        nif: "12345678Z",
        address: "",
        city: "",
        postalCode: "",
        capturedAt: "2026-01-01",
      },
    };

    expect(resolvePdfLogoUrl(doc, profile)).toBe("data:image/png;base64,abc");
  });
});

describe("logoMimeFormat", () => {
  it("reconoce formatos habituales de móvil", () => {
    expect(logoMimeFormat("data:image/jpeg;base64,x")).toBe("JPEG");
    expect(logoMimeFormat("data:image/webp;base64,x")).toBe("WEBP");
    expect(logoMimeFormat("data:image/jpg;base64,x")).toBe("JPEG");
  });
});

describe("pdfLogoDrawSize", () => {
  it("mantiene la proporción dentro del bloque del PDF", () => {
    const size = pdfLogoDrawSize({ dataUrl: "x", width: 200, height: 100 });
    expect(size.width).toBe(40);
    expect(size.height).toBe(20);
  });
});
