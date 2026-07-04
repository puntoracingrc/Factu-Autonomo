"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Cloud,
  Download,
  Eye,
  EyeOff,
  Mail,
  RefreshCw,
  Upload,
} from "lucide-react";
import { SignupSuccessPanel } from "@/components/cloud/SignupSuccessPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import type { SignUpResult } from "@/context/CloudSyncContext";
import {
  friendlyAuthError,
  isEmailNotConfirmedError,
} from "@/lib/supabase/auth-errors";
import { isGoogleAuthEnabled } from "@/lib/supabase/config";
import {
  captureReferralFromSearchParams,
  readPendingReferralCode,
  storePendingReferralCode,
} from "@/lib/referrals/storage";
import { REFERRAL_BONUS_SCANS } from "@/lib/billing/referral-codes";
import { hasWorkspaceContent } from "@/lib/workspace-state";

const STATUS_LABELS = {
  disabled: "Sincronización no disponible",
  offline: "Sin conexión — en cola",
  idle: "Listo",
  pending: "Pendiente de subir",
  syncing: "Sincronizando…",
  synced: "Sincronizado",
  error: "Error — reintentando",
} as const;

type AuthMode = "signin" | "signup";

function GoogleLogoIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.46-1.13 2.7-2.41 3.54v2.93h3.78c2.21-2.04 3.65-5.04 3.65-8.71Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.78-2.93c-1.05.7-2.39 1.12-4.17 1.12-3.12 0-5.76-2.1-6.7-4.93H1.39v3.02A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.35A7.21 7.21 0 0 1 4.91 12c0-.82.14-1.61.39-2.35V6.63H1.39A11.95 11.95 0 0 0 0 12c0 1.93.46 3.76 1.39 5.37l3.91-3.02Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.72c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.14 15.23 0 12 0A11.99 11.99 0 0 0 1.39 6.63L5.3 9.65C6.24 6.82 8.88 4.72 12 4.72Z"
      />
    </svg>
  );
}

export function CloudAccountCard() {
  const {
    cloudEnabled,
    user,
    email,
    setEmail,
    signUp,
    signIn,
    signInWithGoogle,
    resendConfirmationEmail,
    signOut,
    syncNow,
    forceDownloadFromCloud,
    exportBackup,
    importBackup,
    syncStatus,
    syncMessage,
    pendingUpload,
    pendingChangeCount,
  } = useCloudSync();
  const { data } = useAppStore();
  const { billingEnabled, limits } = useBilling();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<Extract<
    SignUpResult,
    { ok: true }
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const searchParams = useSearchParams();
  const authStatus = searchParams.get("auth");
  const requestedMode = searchParams.get("modo");
  const googleAuthEnabled = isGoogleAuthEnabled();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signupSuccessRef = useRef<HTMLDivElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const hasLocalWork = hasWorkspaceContent(data);

  useEffect(() => {
    if (requestedMode === "crear" || requestedMode === "signup") {
      setAuthMode("signup");
      setAuthError(null);
      setResendNotice(null);
    }
  }, [requestedMode]);

  useEffect(() => {
    captureReferralFromSearchParams(searchParams);
    const pending = readPendingReferralCode();
    if (pending) setReferralCode(pending);
  }, [searchParams]);

  useEffect(() => {
    if (signupSuccess && signupSuccessRef.current) {
      signupSuccessRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [signupSuccess]);

  function changeAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    setAuthError(null);
    setResendNotice(null);
    if (mode === "signin") {
      setSignupSuccess(null);
    }
  }

  async function runAuth(action: AuthMode) {
    setAuthError(null);
    if (action === "signin") setSignupSuccess(null);
    setBusy(true);

    if (action === "signup") {
      if (!legalAccepted) {
        setBusy(false);
        setAuthError(
          "Para crear cuenta debes aceptar los términos y la política de privacidad.",
        );
        return;
      }
      if (referralCode.trim()) storePendingReferralCode(referralCode);
      const result = await signUp(password);
      setBusy(false);
      if (!result.ok) {
        setAuthError(result.error);
        return;
      }
      setSignupSuccess(result);
      setPassword("");
      return;
    }

    const error = await signIn(password);
    setBusy(false);
    if (error) setAuthError(friendlyAuthError(error));
    else setPassword("");
  }

  async function runGoogleAuth() {
    setAuthError(null);
    setSignupSuccess(null);
    setResendNotice(null);
    if (referralCode.trim()) storePendingReferralCode(referralCode);
    setBusy(true);
    const error = await signInWithGoogle();
    if (error) {
      setBusy(false);
      setAuthError(friendlyAuthError(error));
    }
  }

  async function handleResendConfirmation() {
    setResendNotice(null);
    setBusy(true);
    const error = await resendConfirmationEmail();
    setBusy(false);
    if (error) setAuthError(error);
    else {
      setResendNotice(
        "Email de confirmación reenviado. Busca el correo de Supabase (no el de Factu).",
      );
    }
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    const error = await importBackup(file);
    setBusy(false);
    if (error) setAuthError(error);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleForceDownload() {
    const confirmed = confirm(
      "Esto sustituirá los datos de este dispositivo por la copia completa de la nube. Úsalo si otro dispositivo tiene los datos correctos. ¿Continuar?",
    );
    if (!confirmed) return;

    setBusy(true);
    await forceDownloadFromCloud();
    setBusy(false);
  }

  return (
    <Card className="mb-6 space-y-4">
      <div id="inicio-sesion" className="flex scroll-mt-24 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
          <Cloud className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Cuenta y copia de seguridad
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Sincroniza móvil y PC con la misma cuenta, o exporta un archivo JSON
            por si cambias de teléfono.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={exportBackup}>
          <Download className="h-4 w-4" />
          Exportar copia
        </Button>
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Importar copia
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void handleImport(e.target.files?.[0])}
        />
      </div>

      {billingEnabled && !limits.cloudSync && (
        <p className="rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
          La sincronización automática en la nube y el importador de datos son
          funciones <strong>Pro</strong>. En el plan Gratis puedes crear cuenta
          y exportar una copia manual cuando lo necesites.
        </p>
      )}

      {!cloudEnabled ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          La sincronización automática no está disponible ahora mismo. Puedes
          seguir usando la app en este dispositivo y guardar una copia manual
          cuando lo necesites.
        </p>
      ) : user ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-700">
            Sesión: <strong>{user.email}</strong>
          </p>
          <p className="text-sm text-slate-500">
            Estado: {STATUS_LABELS[syncStatus]}
            {syncMessage ? ` — ${syncMessage}` : ""}
          </p>
          {pendingUpload && syncStatus !== "syncing" && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {syncStatus === "offline" ? (
                <>
                  {pendingChangeCount > 0
                    ? `${pendingChangeCount} cambio(s) en cola.`
                    : "Hay cambios guardados en este dispositivo."}{" "}
                  Se subirán al recuperar internet.
                </>
              ) : pendingChangeCount > 0 ? (
                <>
                  {pendingChangeCount} cambio(s) pendiente(s) de subir (solo lo
                  modificado). Se suben solos en unos segundos o pulsa
                  Sincronizar ahora.
                </>
              ) : (
                <>
                  Quedan cambios locales por confirmar en la nube. Pulsa
                  Sincronizar ahora.
                </>
              )}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void syncNow()} disabled={busy}>
              <RefreshCw className="h-4 w-4" />
              Sincronizar ahora
            </Button>
            <Button variant="ghost" onClick={() => void signOut()}>
              Cerrar sesión
            </Button>
          </div>
          <details className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <summary className="cursor-pointer font-semibold text-slate-700">
              Problemas de sincronización
            </summary>
            <div className="mt-3 space-y-3">
              <p>
                Si este dispositivo no muestra los datos que sí aparecen en otro,
                puedes repararlo descargando otra vez la copia completa de la nube.
              </p>
              <Button
                variant="secondary"
                onClick={() => void handleForceDownload()}
                disabled={busy}
              >
                <Download className="h-4 w-4" />
                Reparar con la copia de la nube
              </Button>
            </div>
          </details>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
            {hasLocalWork ? (
              <>
                Hemos encontrado datos en este navegador. Crear cuenta o iniciar
                sesión <strong>no los borra</strong>. Si tu plan incluye nube,
                la app intentará subirlos a tu cuenta; también puedes exportar
                una copia manual.
              </>
            ) : (
              <>
                Puedes probar sin cuenta, pero lo que guardes quedará solo en
                este navegador hasta que inicies sesión.
              </>
            )}
          </p>

          {authStatus === "confirmed" ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
              Cuenta confirmada. Ya puedes iniciar sesión con tu contraseña.
            </p>
          ) : null}

          {signupSuccess ? (
            <div ref={signupSuccessRef}>
              <SignupSuccessPanel
                email={signupSuccess.email}
                needsEmailConfirmation={signupSuccess.needsEmailConfirmation}
                onContinueToSignIn={() => {
                  setSignupSuccess(null);
                  passwordInputRef.current?.focus();
                }}
              />
            </div>
          ) : null}

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1">
              <button
                type="button"
                onClick={() => changeAuthMode("signin")}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  authMode === "signin"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => changeAuthMode("signup")}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  authMode === "signup"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Crear cuenta
              </button>
            </div>

            {googleAuthEnabled ? (
              <div className="space-y-2">
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => void runGoogleAuth()}
                  disabled={busy}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm">
                    <GoogleLogoIcon />
                  </span>
                  {busy
                    ? "Abriendo Google…"
                    : authMode === "signup"
                      ? "Crear cuenta con Google"
                      : "Continuar con Google"}
                </Button>
                <p className="text-xs text-slate-500">
                  Google solo se usa para iniciar sesión. Drive se conectará
                  aparte si activas la copia extra.
                </p>
                <div className="flex items-center gap-3 text-xs font-semibold uppercase text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  O con email
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
              </div>
            ) : null}

            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </Field>
            <Field label="Contraseña" hint="Mínimo 6 caracteres">
              <div className="relative">
                <Input
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-14"
                  autoComplete={
                    authMode === "signin" ? "current-password" : "new-password"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  title={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>
            {billingEnabled && authMode === "signup" ? (
              <Field
                label="Código de invitación"
                hint={`Opcional — ${REFERRAL_BONUS_SCANS} escaneos extra para ti y quien te invita`}
              >
                <Input
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="Ej: ABC12XY9"
                  onBlur={() => {
                    if (referralCode.trim()) storePendingReferralCode(referralCode);
                  }}
                />
              </Field>
            ) : null}
            {authMode === "signup" ? (
              <label className="flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={legalAccepted}
                  onChange={(event) => setLegalAccepted(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded"
                />
                <span>
                  Al crear cuenta acepto los{" "}
                  <Link href="/legal/terminos" className="font-semibold underline">
                    términos de uso
                  </Link>{" "}
                  y la{" "}
                  <Link
                    href="/legal/privacidad"
                    className="font-semibold underline"
                  >
                    política de privacidad
                  </Link>
                  .
                </span>
              </label>
            ) : null}
            <Button
              fullWidth
              onClick={() => void runAuth(authMode)}
              disabled={busy}
            >
              {busy
                ? authMode === "signup"
                  ? "Creando cuenta…"
                  : "Comprobando…"
                : authMode === "signup"
                  ? "Crear cuenta"
                  : "Iniciar sesión"}
            </Button>
          </div>
        </div>
      )}

      {authError && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-red-600">{authError}</p>
          {isEmailNotConfirmedError(authError) ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">¿Solo viste el email de Factu?</p>
              <p className="mt-1">
                Ese correo es de bienvenida. Necesitas el de{" "}
                <strong>Supabase</strong> con el enlace «Confirmar cuenta».
                Revisa spam y promociones.
              </p>
              <Button
                variant="secondary"
                className="mt-3"
                onClick={() => void handleResendConfirmation()}
                disabled={busy || !email.trim()}
              >
                <Mail className="h-4 w-4" />
                Reenviar email de confirmación
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {resendNotice ? (
        <p className="text-sm font-medium text-emerald-700">{resendNotice}</p>
      ) : null}
    </Card>
  );
}
