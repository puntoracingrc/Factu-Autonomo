import { describe, expect, it } from "vitest";
import type { BusinessProfile, Document } from "../types";
import { DEFAULT_PROFILE } from "../types";
import { registerDocumentVerifactu } from "./register";

function invoice(status: Document["status"] = "enviado"): Document {
  return {
    id: "doc-1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-06-09",
    client: { name: "Cliente Test" },
    items: [
      {
        id: "l1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status,
    createdAt: "2026-06-09T10:00:00.000Z",
    updatedAt: "2026-06-09T10:00:00.000Z",
  };
}

const profile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  nif: "12345678Z",
  verifactu: { enabled: true, environment: "test" },
};

describe("registerDocumentVerifactu", () => {
  it("returns null for borrador", async () => {
    const result = await registerDocumentVerifactu({
      doc: invoice("borrador"),
      profile,
    });
    expect(result).toBeNull();
  });

  it("creates chained record with QR for emitted invoice", async () => {
    const result = await registerDocumentVerifactu({
      doc: invoice("enviado"),
      profile,
    });

    expect(result).not.toBeNull();
    expect(result?.verifactu.qrUrl).toContain("prewww2.aeat.es");
    expect(result?.verifactu.recordHash).toHaveLength(64);
    expect(result?.chain.recordCount).toBe(1);
    expect(result?.xml).toContain("<RegistroFacturacion");
  });
});
