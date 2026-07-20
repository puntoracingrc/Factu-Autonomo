export type TurnstileClientErrorKind = "configuration" | "transient";

export interface TurnstileClientDiagnostic {
  code: string | null;
  diagnosticCode: string;
  kind: TurnstileClientErrorKind;
  message: string;
}

const TURNSTILE_CONFIGURATION_MESSAGE =
  "La verificación de seguridad no está bien configurada. Contacta con soporte o inténtalo más tarde.";

const TURNSTILE_DOMAIN_MESSAGE =
  "La verificación de seguridad no está autorizada para este dominio. Contacta con soporte o inténtalo más tarde.";

const TURNSTILE_TRANSIENT_MESSAGE =
  "No se pudo completar la verificación de seguridad. Recarga la página e inténtalo de nuevo.";

const TURNSTILE_CLOCK_MESSAGE =
  "No se pudo completar la verificación de seguridad. Comprueba la hora del dispositivo, recarga la página e inténtalo de nuevo.";

const TURNSTILE_CONFIGURATION_ERROR_CODES = new Set([
  "110100",
  "110110",
  "400020",
  "400070",
]);

const TURNSTILE_TRANSIENT_ERROR_CODES = new Set(["110600", "110620", "200500"]);

export function normalizeTurnstileClientErrorCode(
  errorCode: unknown,
): string | null {
  if (typeof errorCode === "number" && Number.isFinite(errorCode)) {
    return String(Math.trunc(errorCode));
  }

  if (typeof errorCode !== "string") return null;

  const match = errorCode.match(/\b\d{6}\b/);
  return match?.[0] ?? null;
}

export function isLikelyTurnstileSiteKey(siteKey: string): boolean {
  const trimmed = siteKey.trim();
  if (!trimmed) return false;

  if (/^[123]x0{20}[A-Z]{2}$/.test(trimmed)) return true;

  return /^0x[A-Za-z0-9_-]{20,}$/.test(trimmed);
}

export function describeTurnstileSiteKeyIssue(
  siteKey: string,
): TurnstileClientDiagnostic | null {
  if (isLikelyTurnstileSiteKey(siteKey)) return null;

  return {
    code: "invalid-sitekey-format",
    diagnosticCode: "invalid-sitekey-format",
    kind: "configuration",
    message: TURNSTILE_CONFIGURATION_MESSAGE,
  };
}

export function describeTurnstileClientError(
  errorCode: unknown,
): TurnstileClientDiagnostic {
  const code = normalizeTurnstileClientErrorCode(errorCode);

  if (code === "110200") {
    return {
      code,
      diagnosticCode: code,
      kind: "configuration",
      message: TURNSTILE_DOMAIN_MESSAGE,
    };
  }

  if (code && TURNSTILE_CONFIGURATION_ERROR_CODES.has(code)) {
    return {
      code,
      diagnosticCode: code,
      kind: "configuration",
      message: TURNSTILE_CONFIGURATION_MESSAGE,
    };
  }

  if (code === "200100") {
    return {
      code,
      diagnosticCode: code,
      kind: "transient",
      message: TURNSTILE_CLOCK_MESSAGE,
    };
  }

  if (
    code &&
    (TURNSTILE_TRANSIENT_ERROR_CODES.has(code) ||
      code.startsWith("300") ||
      code.startsWith("600"))
  ) {
    return {
      code,
      diagnosticCode: code,
      kind: "transient",
      message: TURNSTILE_TRANSIENT_MESSAGE,
    };
  }

  return {
    code,
    diagnosticCode: code ?? "unknown",
    kind: "transient",
    message: TURNSTILE_TRANSIENT_MESSAGE,
  };
}
