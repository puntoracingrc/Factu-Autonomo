import { getServerVerifactuEnvironment, isAeatSubmitConfigured } from "./config";
import type { VerifactuEnvironment } from "./types";

export interface AeatSubmitResult {
  ok: boolean;
  csv?: string;
  errorMessage?: string;
  rawResponse?: string;
}

/**
 * En modo actual no se abre transporte real con AEAT.
 * Devuelve éxito simulado para que el flujo de pruebas genere huella, XML, QR y cadena
 * sin enviar datos a endpoints oficiales.
 */
export async function submitRegistroToAeat(input: {
  xml: string;
  environment?: VerifactuEnvironment;
}): Promise<AeatSubmitResult> {
  const environment = input.environment ?? getServerVerifactuEnvironment();

  if (!isAeatSubmitConfigured()) {
    if (environment !== "test") {
      return {
        ok: false,
        errorMessage:
          "Producción AEAT no configurada. Usa el entorno de pruebas.",
        rawResponse: "REAL_AEAT_TRANSPORT_NOT_ENABLED",
      };
    }

    return {
      ok: true,
      csv: undefined,
      rawResponse: "SIMULATED_TEST_MODE",
    };
  }

  return {
    ok: false,
    errorMessage:
      "Transporte AEAT real pendiente de una fase separada con SOAP/mTLS oficial.",
    rawResponse: "REAL_AEAT_TRANSPORT_NOT_ENABLED",
  };
}
