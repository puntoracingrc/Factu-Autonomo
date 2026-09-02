import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildVerifactuSoapEnvelope,
  parseAeatSubmitResponse,
  submitRegistroToAeatPreproduction,
} from "./aeat-submit";

describe("aeat submit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
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
    expect(result.outcome).toBe("accepted");
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

  it("reconoce el estado oficial AceptadoConErrores sin convertirlo en éxito limpio", () => {
    const result = parseAeatSubmitResponse({
      statusCode: 200,
      rawResponse:
        "<EstadoEnvio>ParcialmenteCorrecto</EstadoEnvio><EstadoRegistro>AceptadoConErrores</EstadoRegistro><CSV>CSV-CON-ERRORES</CSV>",
    });

    expect(result.ok).toBe(false);
    expect(result.outcome).toBe("accepted_with_errors");
    expect(result.csv).toBe("CSV-CON-ERRORES");
  });

  it("recupera un envío ambiguo cuando AEAT confirma el registro duplicado", () => {
    const result = parseAeatSubmitResponse({
      statusCode: 200,
      rawResponse: `
        <RespuestaRegFactuSistemaFacturacion>
          <CSV>CSV-DUPLICADO</CSV>
          <EstadoEnvio>ParcialmenteCorrecto</EstadoEnvio>
          <RespuestaLinea>
            <EstadoRegistro>Incorrecto</EstadoRegistro>
            <CodigoErrorRegistro>3000</CodigoErrorRegistro>
            <RegistroDuplicado>
              <EstadoRegistroDuplicado>Correcta</EstadoRegistroDuplicado>
            </RegistroDuplicado>
          </RespuestaLinea>
        </RespuestaRegFactuSistemaFacturacion>`,
    });

    expect(result.ok).toBe(true);
    expect(result.outcome).toBe("accepted_duplicate");
    expect(result.duplicateState).toBe("Correcta");
  });

  it("no convierte en aceptación limpia un duplicado aceptado con errores", () => {
    const result = parseAeatSubmitResponse({
      statusCode: 200,
      rawResponse: `
        <RespuestaRegFactuSistemaFacturacion>
          <CSV>CSV-DUPLICADO-CON-ERRORES</CSV>
          <EstadoEnvio>ParcialmenteCorrecto</EstadoEnvio>
          <RespuestaLinea>
            <EstadoRegistro>Incorrecto</EstadoRegistro>
            <RegistroDuplicado>
              <EstadoRegistroDuplicado>AceptadaConErrores</EstadoRegistroDuplicado>
            </RegistroDuplicado>
          </RespuestaLinea>
        </RespuestaRegFactuSistemaFacturacion>`,
    });

    expect(result.ok).toBe(false);
    expect(result.outcome).toBe("accepted_with_errors");
    expect(result.duplicateState).toBe("AceptadaConErrores");
  });

  it("clasifica como desconocida una respuesta sin señal AEAT", () => {
    const result = parseAeatSubmitResponse({
      statusCode: 502,
      rawResponse: "<html>gateway timeout</html>",
    });
    expect(result.ok).toBe(false);
    expect(result.outcome).toBe("delivery_unknown");
  });

  it("solo permite el host oficial acorde al canal en preproducción", async () => {
    const certificate = {
      p12Base64: Buffer.from("synthetic").toString("base64"),
      password: "synthetic",
    };
    const blocked = await submitRegistroToAeatPreproduction({
      xml: "<sum:RegFactuSistemaFacturacion/>",
      certificate,
      certificateChannel: "personal",
      endpointUrl: "https://example.com/collect",
    });
    expect(blocked.outcome).toBe("not_sent");

    const post = vi.fn().mockResolvedValue({
      statusCode: 200,
      rawResponse:
        "<CSV>TEST</CSV><EstadoEnvio>Correcto</EstadoEnvio><EstadoRegistro>Correcta</EstadoRegistro>",
    });
    const accepted = await submitRegistroToAeatPreproduction({
      xml: "<sum:RegFactuSistemaFacturacion/>",
      certificate,
      certificateChannel: "personal",
      post,
    });
    expect(accepted.outcome).toBe("accepted");
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({ endpointUrl: expect.stringContaining("prewww1.aeat.es") }),
    );
  });
});
