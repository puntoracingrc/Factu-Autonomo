import { describe, expect, it } from "vitest";
import { generateQrDataUrl, hasVerifactuQr } from "./qr-image";
import { buildQrUrl } from "./qr";
import type { Document, VerifactuInfo } from "../types";

describe("qr image", () => {
  it("generates png data url from AEAT validation url", async () => {
    const url = buildQrUrl({
      nif: "12345678Z",
      numserie: "F-2026-0001",
      fecha: "2026-06-09",
      importe: 121,
      environment: "test",
    });
    const dataUrl = await generateQrDataUrl(url);
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(dataUrl.length).toBeGreaterThan(100);
  });

  it("solo muestra QR para registros confirmados", () => {
    const base: VerifactuInfo = {
      recordHash: "A".repeat(64),
      previousHash: "",
      recordTimestamp: "2026-07-11T01:00:00+02:00",
      qrUrl: "https://example.invalid/qr",
      status: "test_registered",
      recordType: "alta",
      environment: "test",
    };
    const document = (verifactu: VerifactuInfo): Document => ({
      id: "invoice",
      type: "factura",
      number: "F-1",
      date: "2026-07-11",
      client: { name: "Cliente" },
      items: [],
      status: "enviado",
      verifactu,
      verifactuPersistence: "server_confirmed",
      createdAt: "2026-07-11T00:00:00.000Z",
      updatedAt: "2026-07-11T00:00:00.000Z",
    });

    expect(hasVerifactuQr(document(base))).toBe(true);
    expect(hasVerifactuQr(document({ ...base, status: "failed" }))).toBe(false);
    expect(hasVerifactuQr(document({ ...base, status: "pending" }))).toBe(false);
  });
});
