"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyRound, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  accountMfaErrorMessage,
  createAccountMfaAsyncGuard,
  normalizeTotpInput,
  readAccountMfaSession,
  verifyAccountTotp,
  type AccountMfaAsyncToken,
} from "@/lib/auth/account-mfa";

type MfaBusyState = "idle" | "enroll" | "verify" | "remove";

interface AccountMfaFactor {
  id: string;
  factor_type?: string;
  status?: string;
  friendly_name?: string;
}

function qrCodeSrc(qrCode: string): string {
  if (qrCode.startsWith("data:")) return qrCode;
  return `data:image/svg+xml;utf8,${encodeURIComponent(qrCode)}`;
}

export function AccountMfaCard() {
  const { user, cloudEnabled } = useCloudSync();
  const userId = user?.id ?? null;
  const sessionKey = user
    ? `${user.id}:${user.last_sign_in_at ?? ""}:${user.updated_at ?? ""}`
    : null;
  const [loading, setLoading] = useState(false);
  const [mfaStateReady, setMfaStateReady] = useState(false);
  const [mfaStateSessionKey, setMfaStateSessionKey] = useState<string | null>(
    null,
  );
  const [mfaStateSessionId, setMfaStateSessionId] = useState<string | null>(
    null,
  );
  const [busy, setBusy] = useState<MfaBusyState>("idle");
  const [factors, setFactors] = useState<AccountMfaFactor[]>([]);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [nextLevel, setNextLevel] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
    sessionKey: string;
    sessionId: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mfaAsyncGuard] = useState(createAccountMfaAsyncGuard);
  const activeSessionKey = useRef<string | null>(sessionKey);

  const loadMfa = useCallback(async () => {
    const expectedSessionKey = sessionKey;
    if (
      !userId ||
      !expectedSessionKey ||
      !cloudEnabled ||
      activeSessionKey.current !== expectedSessionKey
    ) {
      return;
    }
    const requestToken = mfaAsyncGuard.beginRequest(expectedSessionKey);
    setLoading(true);
    setMfaStateReady(false);
    setMfaStateSessionKey(null);
    setMfaStateSessionId(null);
    setFactors([]);
    setCurrentLevel(null);
    setNextLevel(null);
    setError(null);
    try {
      const supabase = await getSupabaseClientAsync();
      if (!supabase) {
        if (
          mfaAsyncGuard.isCurrentRequest(
            requestToken,
            activeSessionKey.current,
          )
        ) {
          setError("Supabase no está disponible ahora mismo.");
        }
        return;
      }

      const sessionResult = await readAccountMfaSession(supabase, userId);
      if (sessionResult.status === "blocked") {
        if (
          mfaAsyncGuard.isCurrentRequest(
            requestToken,
            activeSessionKey.current,
          )
        ) {
          setError(sessionResult.message);
        }
        return;
      }

      const [aalResult, factorsResult] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);
      if (
        !mfaAsyncGuard.isCurrentRequest(
          requestToken,
          activeSessionKey.current,
        )
      ) {
        return;
      }

      if (aalResult.error) {
        setError(accountMfaErrorMessage(aalResult.error, "load"));
        return;
      }

      if (factorsResult.error) {
        setError(accountMfaErrorMessage(factorsResult.error, "load"));
        return;
      }

      const finalSessionResult = await readAccountMfaSession(supabase, userId);
      if (
        finalSessionResult.status === "blocked" ||
        finalSessionResult.sessionId !== sessionResult.sessionId
      ) {
        if (
          mfaAsyncGuard.isCurrentRequest(
            requestToken,
            activeSessionKey.current,
          )
        ) {
          setError(
            finalSessionResult.status === "blocked"
              ? finalSessionResult.message
              : "La sesión de seguridad cambió durante la comprobación. Actualiza el estado.",
          );
        }
        return;
      }
      if (
        !mfaAsyncGuard.isCurrentRequest(
          requestToken,
          activeSessionKey.current,
        )
      ) {
        return;
      }

      setCurrentLevel(aalResult.data.currentLevel ?? null);
      setNextLevel(aalResult.data.nextLevel ?? null);
      setFactors((factorsResult.data.all ?? []) as AccountMfaFactor[]);
      setMfaStateSessionKey(expectedSessionKey);
      setMfaStateSessionId(sessionResult.sessionId);
      setMfaStateReady(true);
    } catch {
      if (
        mfaAsyncGuard.isCurrentRequest(
          requestToken,
          activeSessionKey.current,
        )
      ) {
        setError(
          "No se pudo consultar el doble factor. Comprueba la conexión y vuelve a intentarlo.",
        );
      }
    } finally {
      if (
        mfaAsyncGuard.isCurrentRequest(
          requestToken,
          activeSessionKey.current,
        )
      ) {
        setLoading(false);
      }
    }
  }, [cloudEnabled, mfaAsyncGuard, sessionKey, userId]);

  useEffect(() => {
    activeSessionKey.current = sessionKey;
    mfaAsyncGuard.invalidateRequests();
    mfaAsyncGuard.resetOperations();
    setLoading(false);
    setMfaStateReady(false);
    setMfaStateSessionKey(null);
    setMfaStateSessionId(null);
    setBusy("idle");
    setFactors([]);
    setCurrentLevel(null);
    setNextLevel(null);
    setEnrollment(null);
    setCode("");
    setMessage(null);
    setError(null);
  }, [mfaAsyncGuard, sessionKey]);

  useEffect(() => {
    void loadMfa();
  }, [loadMfa]);

  const scopedMfaStateReady =
    mfaStateReady &&
    mfaStateSessionKey === sessionKey &&
    mfaStateSessionId !== null;
  const visibleEnrollment =
    enrollment?.sessionKey === sessionKey ? enrollment : null;
  const totpFactors = useMemo(
    () =>
      scopedMfaStateReady
        ? factors.filter((factor) => factor.factor_type === "totp")
        : [],
    [factors, scopedMfaStateReady],
  );
  const verifiedTotp = totpFactors.find((factor) => factor.status === "verified");
  const verifiedTotps = totpFactors.filter(
    (factor) => factor.status === "verified",
  );
  const pendingTotps = totpFactors.filter(
    (factor) => factor.status !== "verified",
  );
  const pendingTotp = pendingTotps[0];
  const sessionVerified = scopedMfaStateReady && currentLevel === "aal2";
  const canVerifySession = Boolean(
    scopedMfaStateReady && verifiedTotp && nextLevel === "aal2",
  );
  const hasVerifiedTotp = verifiedTotps.length > 0;

  const beginOperation = (
    nextBusy: MfaBusyState,
    operationSessionKey: string,
  ): AccountMfaAsyncToken | null => {
    const operation = mfaAsyncGuard.beginOperation(operationSessionKey);
    if (!operation) return null;
    setBusy(nextBusy);
    return operation;
  };

  const finishOperation = (operation: AccountMfaAsyncToken) => {
    if (!mfaAsyncGuard.finishOperation(operation)) return;
    setBusy("idle");
  };

  const invalidateSessionState = (sessionError: string) => {
    setMfaStateReady(false);
    setMfaStateSessionKey(null);
    setMfaStateSessionId(null);
    setFactors([]);
    setCurrentLevel(null);
    setNextLevel(null);
    setEnrollment(null);
    setCode("");
    setError(sessionError);
  };

  const startEnrollment = async () => {
    if (!scopedMfaStateReady) {
      setError("Actualiza el estado del doble factor antes de continuar.");
      return;
    }
    if (hasVerifiedTotp && !sessionVerified) {
      setError("Verifica esta sesión antes de añadir otro dispositivo.");
      return;
    }
    if (!sessionKey || !mfaStateSessionId || !userId) return;
    const operation = beginOperation("enroll", sessionKey);
    if (!operation) return;

    const expectedSessionKey = sessionKey;
    const expectedSessionId = mfaStateSessionId;
    const expectedUserId = userId;
    setError(null);
    setMessage(null);
    try {
      const supabase = await getSupabaseClientAsync();
      if (!supabase) {
        if (activeSessionKey.current === expectedSessionKey) {
          setError("Supabase no está disponible ahora mismo.");
        }
        return;
      }
      const sessionResult = await readAccountMfaSession(
        supabase,
        expectedUserId,
      );
      if (activeSessionKey.current !== expectedSessionKey) return;
      if (
        sessionResult.status === "blocked" ||
        sessionResult.sessionId !== expectedSessionId
      ) {
        invalidateSessionState(
          sessionResult.status === "blocked"
            ? sessionResult.message
            : "La sesión de seguridad cambió. Actualiza el estado antes de continuar.",
        );
        return;
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });
      if (enrollError) {
        const enrollMessage = accountMfaErrorMessage(enrollError, "enroll");
        await loadMfa();
        if (activeSessionKey.current === expectedSessionKey) {
          setError(enrollMessage);
        }
        return;
      }
      if (activeSessionKey.current !== expectedSessionKey) return;

      setCode("");
      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        sessionKey: expectedSessionKey,
        sessionId: expectedSessionId,
      });
      await loadMfa();
    } catch {
      if (activeSessionKey.current === expectedSessionKey) {
        setError(
          "No se pudo generar el QR. Comprueba la conexión y vuelve a intentarlo.",
        );
      }
    } finally {
      finishOperation(operation);
    }
  };

  const verifyFactor = async (
    factorId: string,
    factorSessionKey: string | null,
    factorSessionId: string | null,
    mode: "enrollment" | "session",
  ) => {
    if (!scopedMfaStateReady) {
      setError("Actualiza el estado del doble factor antes de continuar.");
      return;
    }
    if (
      !userId ||
      !sessionKey ||
      !factorSessionId ||
      factorSessionKey !== sessionKey ||
      factorSessionId !== mfaStateSessionId
    ) {
      setEnrollment(null);
      setCode("");
      setError(
        "Este QR pertenece a otra sesión. Actualiza el estado y genera uno nuevo.",
      );
      return;
    }
    const operation = beginOperation("verify", sessionKey);
    if (!operation) return;

    setError(null);
    setMessage(null);
    try {
      const supabase = await getSupabaseClientAsync();
      if (!supabase) {
        if (activeSessionKey.current === factorSessionKey) {
          setError("Supabase no está disponible ahora mismo.");
        }
        return;
      }
      const sessionResult = await readAccountMfaSession(supabase, userId);
      if (activeSessionKey.current !== factorSessionKey) return;
      if (
        sessionResult.status === "blocked" ||
        sessionResult.sessionId !== factorSessionId
      ) {
        invalidateSessionState(
          sessionResult.status === "blocked"
            ? sessionResult.message
            : "La sesión de seguridad cambió. Actualiza el estado antes de continuar.",
        );
        return;
      }

      const result = await verifyAccountTotp(supabase, factorId, code, mode);
      if (activeSessionKey.current !== factorSessionKey) return;
      if (result.status === "blocked") {
        if (result.invalidatesEnrollment) {
          setEnrollment(null);
          setCode("");
          await loadMfa();
        }
        if (activeSessionKey.current === factorSessionKey) {
          setError(result.message);
        }
        return;
      }

      setCode("");
      setEnrollment(null);
      setMessage("Verificación en dos pasos activa en esta sesión.");
      await loadMfa();
    } catch {
      if (activeSessionKey.current === factorSessionKey) {
        setError(
          "No se pudo completar la verificación. No se ha activado nada; vuelve a intentarlo.",
        );
      }
    } finally {
      finishOperation(operation);
    }
  };

  const removeFactor = async (
    factorId: string,
    verified: boolean,
    factorSessionId: string | null,
  ) => {
    const canCancelVisibleEnrollment = Boolean(
      !verified &&
        visibleEnrollment?.factorId === factorId &&
        visibleEnrollment.sessionId === factorSessionId,
    );
    if (!scopedMfaStateReady && !canCancelVisibleEnrollment) {
      setError("Actualiza el estado del doble factor antes de continuar.");
      return;
    }
    if (verified && !sessionVerified) {
      setError("Verifica esta sesión antes de desactivar el doble factor.");
      return;
    }

    const confirmed = verified
      ? confirm("Vas a desactivar el doble factor de esta cuenta. ¿Continuar?")
      : true;
    if (!confirmed) return;
    if (!sessionKey || !factorSessionId || !userId) return;
    const expectedSessionKey = sessionKey;
    const expectedSessionId = factorSessionId;
    const expectedUserId = userId;
    const operation = beginOperation("remove", sessionKey);
    if (!operation) return;

    setError(null);
    setMessage(null);
    try {
      const supabase = await getSupabaseClientAsync();
      if (!supabase) {
        if (activeSessionKey.current === expectedSessionKey) {
          setError("Supabase no está disponible ahora mismo.");
        }
        return;
      }
      const sessionResult = await readAccountMfaSession(
        supabase,
        expectedUserId,
      );
      if (activeSessionKey.current !== expectedSessionKey) return;
      if (
        sessionResult.status === "blocked" ||
        sessionResult.sessionId !== expectedSessionId
      ) {
        invalidateSessionState(
          sessionResult.status === "blocked"
            ? sessionResult.message
            : "La sesión de seguridad cambió. Actualiza el estado antes de continuar.",
        );
        return;
      }

      const result = await supabase.auth.mfa.unenroll({ factorId });
      if (activeSessionKey.current !== expectedSessionKey) return;
      if (result.error) {
        setError(accountMfaErrorMessage(result.error, "remove"));
        return;
      }

      setCode("");
      setEnrollment(null);
      setMessage(
        verified
          ? "Doble factor desactivado."
          : "Configuración pendiente cancelada. Puedes generar un QR nuevo.",
      );
      await loadMfa();
    } catch {
      if (activeSessionKey.current === expectedSessionKey) {
        setError(
          "No se pudo retirar la configuración. Comprueba la conexión y vuelve a intentarlo.",
        );
      }
    } finally {
      finishOperation(operation);
    }
  };

  if (!cloudEnabled) {
    return (
      <Card className="mb-6 border-slate-200 bg-white">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Doble factor
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              La seguridad avanzada estará disponible cuando la nube esté activa.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="mb-6 border-slate-200 bg-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Doble factor
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Entra en tu cuenta para activar un segundo paso de seguridad.
              </p>
            </div>
          </div>
          <ButtonLink href="#inicio-sesion" variant="secondary">
            Ir a Acceso
          </ButtonLink>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`mb-6 space-y-4 ${
        hasVerifiedTotp
          ? "border-emerald-100 bg-emerald-50/70"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              hasVerifiedTotp
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Doble factor
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Añade un código temporal de una app autenticadora a esta cuenta.
            </p>
            {scopedMfaStateReady ? (
              <p className="mt-2 text-sm font-bold text-slate-700">
                Estado: {hasVerifiedTotp ? "activo" : "no activo"} ·{" "}
                {verifiedTotps.length} dispositivo(s) activo(s)
                {pendingTotps.length > 0
                  ? ` · ${pendingTotps.length} configuración pendiente${
                      pendingTotps.length === 1 ? "" : "es"
                    }`
                  : ""} · Sesión{" "}
                {sessionVerified ? "verificada" : "normal"}
              </p>
            ) : (
              <p className="mt-2 text-sm font-bold text-slate-700">
                Estado pendiente de comprobar
              </p>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void loadMfa()}
          disabled={loading || busy !== "idle"}
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar estado
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-600">Comprobando doble factor...</p>
      ) : null}

      {!loading && verifiedTotp && sessionVerified ? (
        <div className="rounded-xl bg-white/80 px-4 py-3 text-sm text-emerald-900">
          <p className="font-black">Doble factor activo y validado en esta sesión.</p>
          <p className="mt-1 leading-6">
            Guarda la clave en un gestor seguro o añade otro dispositivo de
            respaldo. Si pierdes todos los factores, tendrá que ayudarte soporte
            tras comprobar que la cuenta es tuya.
          </p>
        </div>
      ) : null}

      {!loading && verifiedTotp && !sessionVerified && canVerifySession ? (
        <div className="rounded-xl border border-amber-200 bg-white p-4">
          <p className="text-sm font-black text-slate-900">
            Verifica esta sesión
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Esta cuenta tiene doble factor activo. Introduce el código de tu app
            para elevar la sesión actual.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1 space-y-1">
              <span className="text-sm font-bold text-slate-700">
                Código de 6 dígitos
              </span>
              <input
                value={code}
                onChange={(event) =>
                  setCode(normalizeTotpInput(event.target.value))
                }
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="one-time-code"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <Button
              type="button"
              onClick={() =>
                void verifyFactor(
                  verifiedTotp.id,
                  sessionKey,
                  mfaStateSessionId,
                  "session",
                )
              }
              disabled={busy !== "idle"}
            >
              <KeyRound className="h-4 w-4" />
              Verificar
            </Button>
          </div>
        </div>
      ) : null}

      {!loading && scopedMfaStateReady && pendingTotp && !visibleEnrollment ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-black">Configuración pendiente</p>
          <p className="mt-1 leading-6">
            Hay un QR anterior sin completar. Cancélalo y genera uno nuevo si
            ya no lo tienes a mano.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            onClick={() =>
              void removeFactor(pendingTotp.id, false, mfaStateSessionId)
            }
            disabled={busy !== "idle"}
          >
            <Trash2 className="h-4 w-4" />
            Cancelar configuración
          </Button>
        </div>
      ) : null}

      {!loading &&
      scopedMfaStateReady &&
      !verifiedTotp &&
      !pendingTotp &&
      !visibleEnrollment ? (
        <Button
          type="button"
          onClick={startEnrollment}
          disabled={busy !== "idle"}
        >
          <ShieldCheck className="h-4 w-4" />
          Activar doble factor
        </Button>
      ) : null}

      {!loading &&
      scopedMfaStateReady &&
      hasVerifiedTotp &&
      sessionVerified &&
      !pendingTotp &&
      !visibleEnrollment ? (
        <Button
          type="button"
          variant="secondary"
          onClick={startEnrollment}
          disabled={busy !== "idle"}
        >
          <ShieldCheck className="h-4 w-4" />
          Añadir dispositivo de respaldo
        </Button>
      ) : null}

      {visibleEnrollment ? (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[180px_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <Image
              src={qrCodeSrc(visibleEnrollment.qrCode)}
              alt="Código QR doble factor"
              width={144}
              height={144}
              unoptimized
              className="h-36 w-36"
            />
          </div>
          <div className="space-y-3">
            <p className="text-sm leading-6 text-slate-600">
              Escanea el QR con Google Authenticator, 1Password, Authy o una app
              compatible. Si no puedes escanearlo, usa esta clave:
            </p>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">
              Este QR y su clave son secretos. Si se han compartido o mostrado
              en una captura, cancélalos y genera una configuración nueva.
            </p>
            <details className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <summary className="cursor-pointer font-bold">
                Usar clave manual en vez del QR
              </summary>
              <p className="mt-2 break-all font-mono text-xs">
                {visibleEnrollment.secret}
              </p>
            </details>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1 space-y-1">
                <span className="text-sm font-bold text-slate-700">
                  Código de 6 dígitos
                </span>
                <input
                  value={code}
                  onChange={(event) =>
                    setCode(normalizeTotpInput(event.target.value))
                  }
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <Button
                type="button"
                onClick={() =>
                  void verifyFactor(
                    visibleEnrollment.factorId,
                    visibleEnrollment.sessionKey,
                    visibleEnrollment.sessionId,
                    "enrollment",
                  )
                }
                disabled={busy !== "idle" || !scopedMfaStateReady}
              >
                <ShieldCheck className="h-4 w-4" />
                Activar
              </Button>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void removeFactor(
                  visibleEnrollment.factorId,
                  false,
                  visibleEnrollment.sessionId,
                )
              }
              disabled={busy !== "idle"}
            >
              <Trash2 className="h-4 w-4" />
              Cancelar este QR
            </Button>
          </div>
        </div>
      ) : null}

      {!loading && verifiedTotps.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {verifiedTotps.map((factor, index) => (
            <Button
              key={factor.id}
              type="button"
              variant="danger"
              onClick={() =>
                void removeFactor(factor.id, true, mfaStateSessionId)
              }
              disabled={busy !== "idle"}
            >
              <Trash2 className="h-4 w-4" />
              {verifiedTotps.length > 1
                ? `Quitar dispositivo ${index + 1}`
                : "Desactivar doble factor"}
            </Button>
          ))}
        </div>
      ) : null}

      {message ? (
        <p className="text-sm font-semibold text-emerald-800">{message}</p>
      ) : null}
      {error ? (
        <p className="text-sm font-semibold text-red-700">{error}</p>
      ) : null}
    </Card>
  );
}
