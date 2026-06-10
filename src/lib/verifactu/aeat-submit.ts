import { AEAT_WS_HOSTS } from "./constants";
import { getServerVerifactuEnvironment, getVerifactuCertConfig } from "./config";
import type { VerifactuEnvironment } from "./types";

export interface AeatSubmitResult {
  ok: boolean;
  csv?: string;
  errorMessage?: string;
  rawResponse?: string;
}

/**
 * Envío a AEAT. Con certificado P12 y VERIFACTU_AEAT_SUBMIT=true intenta remisión real.
 * Sin certificado devuelve éxito simulado para entorno de pruebas.
 */
export async function submitRegistroToAeat(input: {
  xml: string;
  environment?: VerifactuEnvironment;
}): Promise<AeatSubmitResult> {
  const environment = input.environment ?? getServerVerifactuEnvironment();
  const cert = getVerifactuCertConfig();

  if (!cert || process.env.VERIFACTU_AEAT_SUBMIT !== "true") {
    return {
      ok: true,
      csv: undefined,
      rawResponse: "SIMULATED_TEST_MODE",
    };
  }

  const host = AEAT_WS_HOSTS[environment];
  const endpoint = `${host}/wlpl/TIKE-CONT/SuministroFacturas`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/xml; charset=UTF-8",
        Accept: "application/xml, application/json",
      },
      body: input.xml,
    });

    const rawResponse = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        errorMessage: `AEAT respondió ${response.status}`,
        rawResponse,
      };
    }

    const csvMatch = rawResponse.match(
      /<CodigoSeguroVerificacion>([^<]+)<\/CodigoSeguroVerificacion>/i,
    );
    return {
      ok: true,
      csv: csvMatch?.[1],
      rawResponse,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessage:
        error instanceof Error ? error.message : "Error de conexión con AEAT",
    };
  }
}
