import { describe, expect, it } from "vitest";
import { generateQrDataUrl, hasVerifactuQr } from "./qr-image";
import { buildQrUrl } from "./qr";
import {
  DEFAULT_PROFILE,
  type BusinessProfile,
  type Document,
  type VerifactuInfo,
} from "../types";
import { issueDocument } from "../document-integrity";

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

  it("no muestra ni prepara QR basándose solo en datos del cliente", async () => {
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

    expect(hasVerifactuQr(document(base))).toBe(false);
    expect(hasVerifactuQr(document({ ...base, status: "failed" }))).toBe(false);
    expect(hasVerifactuQr(document({ ...base, status: "pending" }))).toBe(false);

    const { preparePdfArtifacts } = await import("../pdf");
    const profile: BusinessProfile = {
      ...DEFAULT_PROFILE,
      nif: "12345678Z",
      verifactu: { enabled: true, environment: "test", optInVersion: 1 as const },
    };
    await expect(
      preparePdfArtifacts(document(base), profile),
    ).resolves.toEqual({});
    const historicalSimulation = {
      ...issueDocument(
        { ...document(base), status: "borrador" },
        profile,
        "2026-07-11T00:00:00.000Z",
      ),
      verifactuPersistence: "simulation" as const,
    };
    await expect(
      preparePdfArtifacts(historicalSimulation, profile),
    ).resolves.toEqual({});
  });
});
