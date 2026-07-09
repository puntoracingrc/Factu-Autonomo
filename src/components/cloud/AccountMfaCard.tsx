"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { useCloudSync } from "@/context/CloudSyncContext";

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

function cleanOtpCode(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

function friendlyMfaError(message: string): string {
  if (/already exists/i.test(message)) {
    return "Ya hay una configuración pendiente. Cancélala y vuelve a generar el QR.";
  }
  if (/invalid|code|factor/i.test(message)) {
    return "No se pudo verificar el código. Revisa los 6 dígitos e inténtalo de nuevo.";
  }
  return message;
}

export function AccountMfaCard() {
  const { user, cloudEnabled } = useCloudSync();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<MfaBusyState>("idle");
  const [factors, setFactors] = useState<AccountMfaFactor[]>([]);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [nextLevel, setNextLevel] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMfa = useCallback(async () => {
    if (!user || !cloudEnabled) return;
    setLoading(true);
    setError(null);
    const supabase = await getSupabaseClientAsync();
    if (!supabase) {
      setError("Supabase no está disponible ahora mismo.");
      setLoading(false);
      return;
    }

    const [aalResult, factorsResult] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);

    if (aalResult.error) {
      setError(aalResult.error.message);
    } else {
      setCurrentLevel(aalResult.data.currentLevel ?? null);
      setNextLevel(aalResult.data.nextLevel ?? null);
    }

    if (factorsResult.error) {
      setError(factorsResult.error.message);
    } else {
      setFactors((factorsResult.data.all ?? []) as AccountMfaFactor[]);
    }

    setLoading(false);
  }, [cloudEnabled, user]);

  useEffect(() => {
    void loadMfa();
  }, [loadMfa]);

  const totpFactors = useMemo(
    () => factors.filter((factor) => factor.factor_type === "totp"),
    [factors],
  );
  const verifiedTotp = totpFactors.find((factor) => factor.status === "verified");
  const verifiedTotps = totpFactors.filter(
    (factor) => factor.status === "verified",
  );
  const pendingTotp = totpFactors.find((factor) => factor.status !== "verified");
  const sessionVerified = currentLevel === "aal2";
  const canVerifySession = Boolean(verifiedTotp && nextLevel === "aal2");
  const hasVerifiedTotp = verifiedTotps.length > 0;

  const startEnrollment = async () => {
    if (hasVerifiedTotp && !sessionVerified) {
      setError("Verifica esta sesión antes de añadir otro dispositivo.");
      return;
    }

    setBusy("enroll");
    setError(null);
    setMessage(null);
    const supabase = await getSupabaseClientAsync();
    if (!supabase) {
      setError("Supabase no está disponible ahora mismo.");
      setBusy("idle");
      return;
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Factura Autonomo Cuenta",
    });
    if (enrollError) {
      setError(friendlyMfaError(enrollError.message));
      await loadMfa();
      setBusy("idle");
      return;
    }

    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setBusy("idle");
  };

  const verifyFactor = async (factorId: string) => {
    const otp = cleanOtpCode(code);
    if (!otp) {
      setError("Introduce el código de 6 dígitos.");
      return;
    }

    setBusy("verify");
    setError(null);
    setMessage(null);
    const supabase = await getSupabaseClientAsync();
    if (!supabase) {
      setError("Supabase no está disponible ahora mismo.");
      setBusy("idle");
      return;
    }

    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setError(friendlyMfaError(challenge.error.message));
      setBusy("idle");
      return;
    }

    const verified = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: otp,
    });
    if (verified.error) {
      setError(friendlyMfaError(verified.error.message));
      setBusy("idle");
      return;
    }

    setCode("");
    setEnrollment(null);
    setMessage("Verificación en dos pasos activa en esta sesión.");
    await loadMfa();
    setBusy("idle");
  };

  const removeFactor = async (factorId: string, verified: boolean) => {
    if (verified && !sessionVerified) {
      setError("Verifica esta sesión antes de desactivar el doble factor.");
      return;
    }

    const confirmed = verified
      ? confirm("Vas a desactivar el doble factor de esta cuenta. ¿Continuar?")
      : true;
    if (!confirmed) return;

    setBusy("remove");
    setError(null);
    setMessage(null);
    const supabase = await getSupabaseClientAsync();
    if (!supabase) {
      setError("Supabase no está disponible ahora mismo.");
      setBusy("idle");
      return;
    }

    const result = await supabase.auth.mfa.unenroll({ factorId });
    if (result.error) {
      setError(friendlyMfaError(result.error.message));
      setBusy("idle");
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
    setBusy("idle");
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
            <p className="mt-2 text-sm font-bold text-slate-700">
              Estado: {hasVerifiedTotp ? "activo" : "no activo"} ·{" "}
              {verifiedTotps.length} dispositivo(s) · Sesión{" "}
              {sessionVerified ? "verificada" : "normal"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void loadMfa()}
          disabled={loading || busy !== "idle"}
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
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
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <Button
              type="button"
              onClick={() => void verifyFactor(verifiedTotp.id)}
              disabled={busy !== "idle"}
            >
              <KeyRound className="h-4 w-4" />
              Verificar
            </Button>
          </div>
        </div>
      ) : null}

      {!loading && pendingTotp && !enrollment ? (
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
            onClick={() => void removeFactor(pendingTotp.id, false)}
            disabled={busy !== "idle"}
          >
            <Trash2 className="h-4 w-4" />
            Cancelar configuración
          </Button>
        </div>
      ) : null}

      {!loading && !verifiedTotp && !pendingTotp && !enrollment ? (
        <Button
          type="button"
          onClick={startEnrollment}
          disabled={busy !== "idle"}
        >
          <ShieldCheck className="h-4 w-4" />
          Activar doble factor
        </Button>
      ) : null}

      {!loading && hasVerifiedTotp && sessionVerified && !pendingTotp && !enrollment ? (
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

      {enrollment ? (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[180px_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <Image
              src={qrCodeSrc(enrollment.qrCode)}
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
            <p className="break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
              {enrollment.secret}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1 space-y-1">
                <span className="text-sm font-bold text-slate-700">
                  Código de 6 dígitos
                </span>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <Button
                type="button"
                onClick={() => void verifyFactor(enrollment.factorId)}
                disabled={busy !== "idle"}
              >
                <ShieldCheck className="h-4 w-4" />
                Activar
              </Button>
            </div>
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
              onClick={() => void removeFactor(factor.id, true)}
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
