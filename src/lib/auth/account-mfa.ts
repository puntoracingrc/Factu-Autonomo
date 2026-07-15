export type AccountMfaStage = "load" | "enroll" | "verify" | "remove";
export type AccountMfaVerificationMode = "enrollment" | "session";

export interface AccountMfaErrorLike {
  code?: unknown;
  message?: unknown;
}

export interface AccountMfaChallengeAndVerifyClient {
  auth: {
    mfa: {
      challengeAndVerify(input: {
        factorId: string;
        code: string;
      }): Promise<{
        error: AccountMfaErrorLike | null;
      }>;
    };
  };
}

export interface AccountMfaSessionClient {
  auth: {
    getClaims(): Promise<{
      data: {
        claims?: {
          session_id?: unknown;
          sub?: unknown;
        };
      } | null;
      error: AccountMfaErrorLike | null;
    }>;
  };
}

export type AccountMfaSessionResult =
  | { status: "ready"; sessionId: string }
  | { status: "blocked"; message: string };

export interface AccountMfaAsyncToken {
  id: number;
  sessionKey: string;
}

export interface AccountMfaAsyncGuard {
  beginOperation(sessionKey: string): AccountMfaAsyncToken | null;
  finishOperation(token: AccountMfaAsyncToken): boolean;
  resetOperations(): void;
  beginRequest(sessionKey: string): AccountMfaAsyncToken;
  isCurrentRequest(token: AccountMfaAsyncToken, sessionKey: string | null): boolean;
  invalidateRequests(): void;
}

export function createAccountMfaAsyncGuard(): AccountMfaAsyncGuard {
  let sequence = 0;
  let activeOperation: AccountMfaAsyncToken | null = null;
  let currentRequestId = 0;

  return {
    beginOperation(sessionKey) {
      if (activeOperation) return null;
      activeOperation = { id: ++sequence, sessionKey };
      return activeOperation;
    },
    finishOperation(token) {
      if (
        activeOperation?.id !== token.id ||
        activeOperation.sessionKey !== token.sessionKey
      ) {
        return false;
      }
      activeOperation = null;
      return true;
    },
    resetOperations() {
      activeOperation = null;
    },
    beginRequest(sessionKey) {
      return { id: ++currentRequestId, sessionKey };
    },
    isCurrentRequest(token, sessionKey) {
      return (
        token.id === currentRequestId &&
        token.sessionKey === sessionKey
      );
    },
    invalidateRequests() {
      currentRequestId += 1;
    },
  };
}

export type AccountMfaVerificationResult =
  | { status: "applied" }
  | {
      status: "blocked";
      code: string;
      message: string;
      invalidatesEnrollment: boolean;
    };

const SAFE_ERROR_CODE = /^[a-z0-9_]+$/;

export function normalizeTotpInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function validateTotpCode(
  value: string,
): { ok: true; code: string } | { ok: false; message: string } {
  const code = value.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) {
    return {
      ok: false,
      message: "Introduce exactamente los 6 dígitos de tu app autenticadora.",
    };
  }
  return { ok: true, code };
}

export function accountMfaErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "mfa_unknown_error";
  const candidate = (error as AccountMfaErrorLike).code;
  return typeof candidate === "string" && SAFE_ERROR_CODE.test(candidate)
    ? candidate
    : "mfa_unknown_error";
}

export function accountMfaErrorInvalidatesEnrollment(code: string): boolean {
  return code === "mfa_factor_not_found";
}

export function accountMfaErrorMessage(
  error: unknown,
  stage: AccountMfaStage,
): string {
  const code = accountMfaErrorCode(error);

  switch (code) {
    case "mfa_verification_failed":
      return "El código no corresponde a este QR. Comprueba que la fecha y hora del móvil estén en automático, espera al siguiente código y vuelve a intentarlo.";
    case "mfa_factor_not_found":
      return "Este QR ya no está vinculado a la sesión actual. Cancélalo y genera uno nuevo.";
    case "mfa_challenge_expired":
      return "La comprobación ha caducado. Espera al siguiente código y vuelve a intentarlo.";
    case "mfa_ip_address_mismatch":
      return "La red cambió durante la comprobación. Mantén la misma conexión y vuelve a intentarlo.";
    case "mfa_totp_verify_not_enabled":
      return "El servidor no tiene habilitada la verificación con app autenticadora. La configuración no se ha activado.";
    case "mfa_totp_enroll_not_enabled":
      return "El servidor no tiene habilitada la creación de doble factor con app autenticadora.";
    case "mfa_verification_rejected":
      return "El servidor rechazó la comprobación. Espera al siguiente código y vuelve a intentarlo.";
    case "mfa_factor_name_conflict":
    case "too_many_enrolled_mfa_factors":
      return "Ya existe otra configuración de doble factor. Actualiza el estado y revisa los dispositivos antes de añadir uno nuevo.";
    case "insufficient_aal":
      return "Esta sesión necesita una verificación de seguridad adicional antes de continuar.";
    case "over_request_rate_limit":
    case "too_many_requests":
      return "Se han hecho demasiados intentos. Espera un momento antes de volver a probar.";
    default:
      const reference =
        code === "mfa_unknown_error" ? "" : ` Referencia técnica: ${code}.`;
      if (stage === "load") {
        return `No se pudo consultar el estado del doble factor. Actualiza la página y vuelve a intentarlo.${reference}`;
      }
      if (stage === "enroll") {
        return `No se pudo generar una configuración nueva de doble factor. Actualiza el estado y vuelve a intentarlo.${reference}`;
      }
      if (stage === "remove") {
        return `No se pudo retirar la configuración de doble factor. Actualiza el estado y vuelve a intentarlo.${reference}`;
      }
      return `No se pudo comprobar el doble factor. Actualiza el estado y vuelve a intentarlo.${reference}`;
  }
}

export function accountMfaVerificationErrorMessage(
  error: unknown,
  mode: AccountMfaVerificationMode,
): string {
  const code = accountMfaErrorCode(error);
  if (mode === "session" && code === "mfa_verification_failed") {
    return "El código no corresponde al dispositivo autenticador activo. Comprueba que la fecha y hora del móvil estén en automático, espera al siguiente código y vuelve a intentarlo.";
  }
  if (mode === "session" && code === "mfa_factor_not_found") {
    return "Este dispositivo ya no está vinculado a la cuenta. Actualiza el estado y revisa los dispositivos activos.";
  }
  return accountMfaErrorMessage(error, "verify");
}

export async function readAccountMfaSession(
  client: AccountMfaSessionClient,
  expectedUserId: string,
): Promise<AccountMfaSessionResult> {
  try {
    const result = await client.auth.getClaims();
    if (result.error) {
      return {
        status: "blocked",
        message:
          "No se pudo comprobar la sesión de seguridad. Actualiza el estado y vuelve a intentarlo.",
      };
    }
    const claims = result.data?.claims;
    if (
      typeof claims?.session_id !== "string" ||
      !claims.session_id ||
      claims.sub !== expectedUserId
    ) {
      return {
        status: "blocked",
        message:
          "La sesión de seguridad cambió. Actualiza el estado antes de continuar.",
      };
    }
    return { status: "ready", sessionId: claims.session_id };
  } catch {
    return {
      status: "blocked",
      message:
        "No se pudo comprobar la sesión de seguridad. Comprueba la conexión y vuelve a intentarlo.",
    };
  }
}

export async function verifyAccountTotp(
  client: AccountMfaChallengeAndVerifyClient,
  factorId: string,
  rawCode: string,
  mode: AccountMfaVerificationMode = "enrollment",
): Promise<AccountMfaVerificationResult> {
  const validated = validateTotpCode(rawCode);
  if (!validated.ok) {
    return {
      status: "blocked",
      code: "mfa_invalid_code_format",
      message: validated.message,
      invalidatesEnrollment: false,
    };
  }

  try {
    const result = await client.auth.mfa.challengeAndVerify({
      factorId,
      code: validated.code,
    });
    if (result.error) {
      const code = accountMfaErrorCode(result.error);
      return {
        status: "blocked",
        code,
        message: accountMfaVerificationErrorMessage(result.error, mode),
        invalidatesEnrollment: accountMfaErrorInvalidatesEnrollment(code),
      };
    }
    return { status: "applied" };
  } catch {
    return {
      status: "blocked",
      code: "mfa_network_error",
      message:
        "No se pudo contactar con el servicio de seguridad. No se ha activado nada; comprueba la conexión y vuelve a intentarlo.",
      invalidatesEnrollment: false,
    };
  }
}
