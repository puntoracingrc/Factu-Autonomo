import { afterEach, describe, expect, it, vi } from "vitest";
import type { BusinessProfile, Document } from "../types";
import { DEFAULT_PROFILE } from "../types";
import { issueDocument } from "../document-integrity";
import { buildVerifactuSoapEnvelope, submitRegistroToAeat } from "./aeat-submit";
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

  it("generates the official XML and SOAP envelope for the first clean test invoice", async () => {
    const result = await registerDocumentVerifactu({
      doc: cleanInvoice,
      profile: cleanProfile,
      chain: null,
    });

    expect(result).not.toBeNull();
    expect(result?.verifactu.status).toBe("test_registered");
    expect(result?.verifactu.csv).toBeUndefined();
    expect(result?.chain.lastNumSerie).toBe("F-2026-TEST-0001");
    expect(result?.chain.lastFechaExpedicion).toBe("2026-06-28");

    const xml = result!.xml;
    expect(xml).toContain("<sum:RegFactuSistemaFacturacion");
    expect(xml).toContain("<sum1:RegistroAlta>");
    expect(xml).toContain("<sum1:IDEmisorFactura>12345678Z</sum1:IDEmisorFactura>");
    expect(xml).toContain("<sum1:NumSerieFactura>F-2026-TEST-0001</sum1:NumSerieFactura>");
    expect(xml).toContain("<sum1:FechaExpedicionFactura>28-06-2026</sum1:FechaExpedicionFactura>");
    expect(xml).toContain("<sum1:NombreRazonEmisor>Autonomo Test</sum1:NombreRazonEmisor>");
    expect(xml).toContain("<sum1:NombreRazon>Cliente Limpio SL</sum1:NombreRazon>");
    expect(xml).toContain("<sum1:NIF>87654321X</sum1:NIF>");
    expect(xml).toContain("<sum1:TipoImpositivo>21.00</sum1:TipoImpositivo>");
    expect(xml).toContain("<sum1:BaseImponibleOimporteNoSujeto>100.00</sum1:BaseImponibleOimporteNoSujeto>");
    expect(xml).toContain("<sum1:CuotaRepercutida>21.00</sum1:CuotaRepercutida>");
    expect(xml).toContain("<sum1:CuotaTotal>21.00</sum1:CuotaTotal>");
    expect(xml).toContain("<sum1:ImporteTotal>121.00</sum1:ImporteTotal>");

    const envelope = buildVerifactuSoapEnvelope(xml);
    expect(envelope).toContain("<soapenv:Envelope");
    expect(envelope).toContain("<soapenv:Body>");
    expect(envelope).toContain("<sum:RegFactuSistemaFacturacion");
  });

  it("does not attempt a real AEAT send when the certificate is still missing", async () => {
    vi.stubEnv("VERIFACTU_AEAT_SUBMIT", "true");

    const result = await registerDocumentVerifactu({
      doc: cleanInvoice,
      profile: cleanProfile,
      chain: null,
    });
    const aeat = await submitRegistroToAeat({
      xml: result!.xml,
      environment: "test",
    });

    expect(aeat.ok).toBe(false);
    expect(aeat.rawResponse).toBe("AEAT_CERTIFICATE_NOT_CONFIGURED");
  });
});
