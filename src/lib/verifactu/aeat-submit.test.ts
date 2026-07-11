import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildVerifactuSoapEnvelope,
  parseAeatSubmitResponse,
  submitRegistroToAeat,
} from "./aeat-submit";

describe("aeat submit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("no simula éxito cuando el transporte real está desactivado", async () => {
    const result = await submitRegistroToAeat({
      xml: "<sum:RegFactuSistemaFacturacion/>",
      environment: "test",
    });
    expect(result.ok).toBe(false);
    expect(result.rawResponse).toBe("SIMULATED_TEST_MODE_DISABLED");
  });

  it("reports missing certificate when real send is enabled", async () => {
    vi.stubEnv("VERIFACTU_AEAT_SUBMIT", "true");

    const result = await submitRegistroToAeat({
      xml: "<sum:RegFactuSistemaFacturacion/>",
      environment: "test",
    });

    expect(result.ok).toBe(false);
    expect(result.rawResponse).toBe("AEAT_CERTIFICATE_NOT_CONFIGURED");
  });

  it("does not simulate success for production without real transport", async () => {
    const result = await submitRegistroToAeat({
      xml: "<sum:RegFactuSistemaFacturacion/>",
      environment: "production",
    });

    expect(result.ok).toBe(false);
    expect(result.rawResponse).toBe("REAL_AEAT_TRANSPORT_NOT_ENABLED");
  });

  it("wraps the registry payload in the official SOAP envelope", () => {
    const envelope = buildVerifactuSoapEnvelope(
      '<?xml version="1.0"?><sum:RegFactuSistemaFacturacion/>',
    );

    expect(envelope).toContain("<soapenv:Envelope");
    expect(envelope).toContain("<soapenv:Body>");
    expect(envelope).toContain("<sum:RegFactuSistemaFacturacion/>");
  });

  it("parses an accepted AEAT response", () => {
    const result = parseAeatSubmitResponse({
      statusCode: 200,
      rawResponse: `
        <soapenv:Envelope>
          <soapenv:Body>
            <RespuestaRegFactuSistemaFacturacion>
              <CSV>TESTCSV123</CSV>
              <EstadoEnvio>Correcto</EstadoEnvio>
              <RespuestaLinea>
                <EstadoRegistro>Correcta</EstadoRegistro>
              </RespuestaLinea>
            </RespuestaRegFactuSistemaFacturacion>
          </soapenv:Body>
        </soapenv:Envelope>`,
    });

    expect(result.ok).toBe(true);
    expect(result.csv).toBe("TESTCSV123");
    expect(result.estadoRegistro).toBe("Correcta");
  });

  it("no acepta HTTP 200 sin una señal positiva de AEAT", () => {
    for (const rawResponse of ["", "<html>proxy ok</html>"]) {
      expect(
        parseAeatSubmitResponse({ statusCode: 200, rawResponse }).ok,
      ).toBe(false);
    }
  });

  it("no acepta estados AEAT desconocidos", () => {
    const result = parseAeatSubmitResponse({
      statusCode: 200,
      rawResponse:
        "<EstadoEnvio>Parcialmente correcto</EstadoEnvio><EstadoRegistro>Pendiente</EstadoRegistro>",
    });
    expect(result.ok).toBe(false);
  });

  it("no convierte aceptación parcial o ausencia de CSV en registro limpio", () => {
    for (const rawResponse of [
      "<EstadoEnvio>Parcialmente correcto</EstadoEnvio><EstadoRegistro>AceptadaConErrores</EstadoRegistro><CSV>CSV</CSV>",
      "<EstadoEnvio>Correcto</EstadoEnvio><EstadoRegistro>Correcta</EstadoRegistro>",
      "<EstadoEnvio>Correcto</EstadoEnvio><EstadoRegistro>Anulada</EstadoRegistro><CSV>CSV</CSV>",
    ]) {
      expect(
        parseAeatSubmitResponse({ statusCode: 200, rawResponse }).ok,
      ).toBe(false);
    }
  });
});
