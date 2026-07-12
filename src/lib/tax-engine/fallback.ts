import { TaxEngineConfigurationError } from "./errors";
import type { EvaluationResult, OfficialSource } from "./types";

export type VerifiedOfficialSource = OfficialSource & {
  readonly verificationStatus: "VERIFIED";
};

export interface DisabledFallbackRequest {
  /** Resultado ya producido por el motor determinista local. */
  readonly localResult: EvaluationResult;
  /** Corpus verificado que no se envía a ningún proveedor en esta fase. */
  readonly verifiedSources: readonly VerifiedOfficialSource[];
}

function assertRequestContainsNoPersonalInput(
  request: DisabledFallbackRequest,
): void {
  const allowedKeys = new Set(["localResult", "verifiedSources"]);
  if (Object.keys(request).some((key) => !allowedKeys.has(key))) {
    throw new TaxEngineConfigurationError(
      "El fallback no admite entradas fiscales ni datos personales adicionales.",
    );
  }
}

function assertOnlyVerifiedSources(sources: readonly OfficialSource[]): void {
  const unverified = sources.find(
    (source) => source.verificationStatus !== "VERIFIED",
  );
  if (unverified) {
    throw new TaxEngineConfigurationError(
      `El fallback no admite la fuente sin verificar ${unverified.id}.`,
    );
  }
}

function assertLocalResultAllowsFallback(result: EvaluationResult): void {
  if (result.status !== "NO_MATCH") {
    throw new TaxEngineConfigurationError(
      "El fallback solo puede ejecutarse después de un resultado local NO_MATCH explícito.",
    );
  }
}

/**
 * Implementación desactivada y guardia negativa interna. No es un puerto de
 * red ni se exporta desde el barrel público del motor. El adaptador real vive
 * en la capa de aplicación, con redacción y validación estructural propias.
 */
export class DisabledFallbackEvaluator {
  async evaluate(request: DisabledFallbackRequest): Promise<EvaluationResult> {
    assertRequestContainsNoPersonalInput(request);
    assertLocalResultAllowsFallback(request.localResult);
    if (request.verifiedSources.length === 0) {
      throw new TaxEngineConfigurationError(
        "El fallback requiere un corpus de fuentes oficiales verificadas.",
      );
    }
    assertOnlyVerifiedSources(request.verifiedSources);
    assertOnlyVerifiedSources(request.localResult.officialSources);

    return {
      ...request.localResult,
      warnings: [
        ...request.localResult.warnings,
        "El fallback externo está deshabilitado; se conserva exclusivamente el resultado del motor local.",
        "No se ha realizado ninguna llamada externa ni se ha compartido información fiscal o personal.",
      ],
      requiresHumanReview: true,
    };
  }
}
