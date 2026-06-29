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

  it("simulates success in test mode when real send is disabled", async () => {
    const result = await submitRegistroToAeat({
      xml: "<sum:RegFactuSistemaFacturacion/>",
      environment: "test",
    });
    expect(result.ok).toBe(true);
    expect(result.rawResponse).toBe("SIMULATED_TEST_MODE");
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
});
