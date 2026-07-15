import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  accountMfaErrorCode,
  accountMfaErrorMessage,
  accountMfaVerificationErrorMessage,
  createAccountMfaAsyncGuard,
  normalizeTotpInput,
  readAccountMfaSession,
  validateTotpCode,
  verifyAccountTotp,
  type AccountMfaChallengeAndVerifyClient,
} from "./account-mfa";

function clientWithResult(error: { code?: string; message?: string } | null) {
  const challengeAndVerify = vi.fn().mockResolvedValue({ error });
  return {
    client: {
      auth: { mfa: { challengeAndVerify } },
    } as AccountMfaChallengeAndVerifyClient,
    challengeAndVerify,
  };
}

describe("account MFA", () => {
  it("impide que una operación antigua finalice la operación de una sesión nueva", () => {
    const guard = createAccountMfaAsyncGuard();
    const oldOperation = guard.beginOperation("session-a");
    expect(oldOperation).not.toBeNull();
    expect(guard.beginOperation("session-a")).toBeNull();

    guard.resetOperations();
    const newOperation = guard.beginOperation("session-b");
    expect(newOperation).not.toBeNull();
    expect(guard.finishOperation(oldOperation!)).toBe(false);
    expect(guard.beginOperation("session-b")).toBeNull();
    expect(guard.finishOperation(newOperation!)).toBe(true);
    expect(guard.beginOperation("session-b")).not.toBeNull();
  });

  it("descarta cargas fuera de orden y cargas de otra sesión", () => {
    const guard = createAccountMfaAsyncGuard();
    const first = guard.beginRequest("session-a");
    const second = guard.beginRequest("session-a");

    expect(guard.isCurrentRequest(first, "session-a")).toBe(false);
    expect(guard.isCurrentRequest(second, "session-b")).toBe(false);
    expect(guard.isCurrentRequest(second, "session-a")).toBe(true);
    guard.invalidateRequests();
    expect(guard.isCurrentRequest(second, "session-a")).toBe(false);
  });

  it("conserva ceros iniciales y exige exactamente seis dígitos", () => {
    expect(normalizeTotpInput(" 01 23-45x6 ")).toBe("012345");
    expect(validateTotpCode("012345")).toEqual({
      ok: true,
      code: "012345",
    });
    expect(validateTotpCode("12345")).toMatchObject({ ok: false });
    expect(validateTotpCode("12345a")).toMatchObject({ ok: false });
  });

  it("usa una única operación challengeAndVerify con el factor y código exactos", async () => {
    const { client, challengeAndVerify } = clientWithResult(null);

    await expect(
      verifyAccountTotp(client, "factor-current", "012345"),
    ).resolves.toEqual({ status: "applied" });
    expect(challengeAndVerify).toHaveBeenCalledTimes(1);
    expect(challengeAndVerify).toHaveBeenCalledWith({
      factorId: "factor-current",
      code: "012345",
    });
  });

  it("no llama al servidor si el formato del código es inválido", async () => {
    const { client, challengeAndVerify } = clientWithResult(null);

    await expect(
      verifyAccountTotp(client, "factor-current", "12345"),
    ).resolves.toMatchObject({
      status: "blocked",
      code: "mfa_invalid_code_format",
    });
    expect(challengeAndVerify).not.toHaveBeenCalled();
  });

  it("distingue código incorrecto de un QR obsoleto", async () => {
    const wrongCode = clientWithResult({
      code: "mfa_verification_failed",
      message: "Invalid TOTP code",
    });
    const staleFactor = clientWithResult({
      code: "mfa_factor_not_found",
      message: "Factor not found",
    });

    await expect(
      verifyAccountTotp(wrongCode.client, "factor-a", "123456"),
    ).resolves.toMatchObject({
      status: "blocked",
      code: "mfa_verification_failed",
      invalidatesEnrollment: false,
    });
    await expect(
      verifyAccountTotp(staleFactor.client, "factor-b", "123456"),
    ).resolves.toMatchObject({
      status: "blocked",
      code: "mfa_factor_not_found",
      invalidatesEnrollment: true,
    });
    expect(
      accountMfaErrorMessage(
        { code: "mfa_factor_not_found", message: "Factor not found" },
        "verify",
      ),
    ).not.toContain("Factor not found");
    expect(
      accountMfaVerificationErrorMessage(
        { code: "mfa_verification_failed" },
        "session",
      ),
    ).toContain("dispositivo autenticador activo");
    expect(
      accountMfaVerificationErrorMessage(
        { code: "mfa_factor_not_found" },
        "session",
      ),
    ).not.toContain("QR");
  });

  it("mapea configuración deshabilitada, caducidad, red y rate limit sin filtrar mensajes", async () => {
    expect(
      accountMfaErrorMessage(
        { code: "mfa_totp_verify_not_enabled", message: "private details" },
        "verify",
      ),
    ).toContain("no tiene habilitada");
    expect(
      accountMfaErrorMessage({ code: "mfa_challenge_expired" }, "verify"),
    ).toContain("caducado");
    expect(
      accountMfaErrorMessage({ code: "mfa_ip_address_mismatch" }, "verify"),
    ).toContain("red cambió");
    expect(
      accountMfaErrorMessage({ code: "over_request_rate_limit" }, "verify"),
    ).toContain("demasiados intentos");
    expect(accountMfaErrorCode({ code: "unsafe code!" })).toBe(
      "mfa_unknown_error",
    );
    expect(
      accountMfaErrorMessage({ code: "future_safe_code" }, "verify"),
    ).toContain("Referencia técnica: future_safe_code");
  });

  it("convierte excepciones de red en un resultado bloqueado y reintentable", async () => {
    const challengeAndVerify = vi.fn().mockRejectedValue(new Error("secret"));
    const client = {
      auth: { mfa: { challengeAndVerify } },
    } as AccountMfaChallengeAndVerifyClient;

    await expect(
      verifyAccountTotp(client, "factor-current", "123456"),
    ).resolves.toMatchObject({
      status: "blocked",
      code: "mfa_network_error",
      invalidatesEnrollment: false,
    });
  });

  it("liga el flujo al session_id verificado y al usuario esperado", async () => {
    const readyClient = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { session_id: "session-a", sub: "user-a" } },
          error: null,
        }),
      },
    };
    const otherUserClient = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { session_id: "session-a", sub: "user-b" } },
          error: null,
        }),
      },
    };

    await expect(
      readAccountMfaSession(readyClient, "user-a"),
    ).resolves.toEqual({ status: "ready", sessionId: "session-a" });
    await expect(
      readAccountMfaSession(otherUserClient, "user-a"),
    ).resolves.toMatchObject({ status: "blocked" });
  });

  it("bloquea una sesión sin claim, con error o con excepción", async () => {
    const withoutClaim = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: { claims: {} }, error: null }),
      },
    };
    const authError = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "bad_jwt", message: "private" },
        }),
      },
    };
    const thrown = {
      auth: { getClaims: vi.fn().mockRejectedValue(new Error("private")) },
    };

    await expect(
      readAccountMfaSession(withoutClaim, "user-a"),
    ).resolves.toMatchObject({ status: "blocked" });
    await expect(
      readAccountMfaSession(authError, "user-a"),
    ).resolves.toMatchObject({ status: "blocked" });
    await expect(
      readAccountMfaSession(thrown, "user-a"),
    ).resolves.toMatchObject({ status: "blocked" });
  });

  it("mantiene el componente ligado al factor, usuario y operación atómica", () => {
    const source = readFileSync(
      new URL("../../components/cloud/AccountMfaCard.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain(
      "verifyAccountTotp(supabase, factorId, code, mode)",
    );
    expect(source).not.toContain("supabase.auth.mfa.challenge({ factorId })");
    expect(source).toContain("mfaAsyncGuard.beginOperation");
    expect(source).toContain("mfaAsyncGuard.isCurrentRequest");
    expect(source).toContain("visibleEnrollment.sessionKey");
    expect(source).toContain("scopedMfaStateReady");
    expect(source).toContain("Cancelar este QR");
  });
});
