import { afterEach, describe, expect, it, vi } from "vitest";
import type { BusinessProfile, Document } from "../types";
import { DEFAULT_PROFILE } from "../types";
import { issueDocument } from "../document-integrity";
import { submitRegistroToAeat } from "./aeat-submit";
import { registerDocumentVerifactu } from "./register";

const cleanProfile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  name: "Autonomo Test",
  nif: "12345678Z",
  verifactu: { enabled: true, environment: "test", optInVersion: 1 },
};

const cleanInvoice: Document = issueDocument({
  id: "clean-invoice-1",
  type: "factura",
  number: "F-2026-TEST-0001",
  date: "2026-06-28",
  client: { name: "Cliente Limpio SL", nif: "87654321X" },
  items: [
    {
      id: "line-1",
      description: "Servicio de prueba VeriFactu",
      quantity: 1,
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  status: "borrador",
  createdAt: "2026-06-28T10:00:00.000Z",
  updatedAt: "2026-06-28T10:00:00.000Z",
}, cleanProfile, "2026-06-28T10:00:00.000Z");

describe("verifactu clean invoice preflight", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("no fabrica un registro ni XML de envío desde el cliente", async () => {
    const result = await registerDocumentVerifactu({
      doc: cleanInvoice,
      profile: cleanProfile,
      chain: null,
    });

    expect(result).toBeNull();
  });

  it("does not attempt a real AEAT send when the certificate is still missing", async () => {
    vi.stubEnv("VERIFACTU_AEAT_SUBMIT", "true");

    const aeat = await submitRegistroToAeat({
      xml: "<registro-prueba />",
      environment: "test",
    });

    expect(aeat.ok).toBe(false);
    expect(aeat.rawResponse).toBe("AEAT_CERTIFICATE_NOT_CONFIGURED");
  });
});
