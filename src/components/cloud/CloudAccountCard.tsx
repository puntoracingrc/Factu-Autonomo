"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import {
  Cloud,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Mail,
  RefreshCw,
} from "lucide-react";
import { SignupSuccessPanel } from "@/components/cloud/SignupSuccessPanel";
import { Button, ButtonLink } from "@/components/ui/Button";
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
import {
  ACCOUNT_PASSWORD_POLICY_HINT,
  validateNewAccountPassword,
} from "@/lib/auth/password-policy";
import { buildFirstUseOnboardingState } from "@/lib/first-use-onboarding";
import { isGoogleAuthEnabled } from "@/lib/supabase/config";
import {
  captureReferralFromSearchParams,
  readPendingReferralCode,
  storePendingReferralCode,
} from "@/lib/referrals/storage";
import { REFERRAL_BONUS_SCANS } from "@/lib/billing/referral-codes";
import { hasWorkspaceContent } from "@/lib/workspace-state";
import {
  describeTurnstileClientError,
  describeTurnstileSiteKeyIssue,
} from "@/lib/turnstile-errors";

const STATUS_LABELS = {
  disabled: "Sincronización no disponible",
  offline: "Sin conexión — en cola",
  idle: "Listo",
  pending: "Pendiente de subir",
  syncing: "Sincronizando…",
  synced: "Sincronizado",
  error: "Error — reintentando",
} as const;

type AuthMode = "signin" | "signup" | "reset";
const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
const TURNSTILE_SITE_KEY_ISSUE = TURNSTILE_SITE_KEY
  ? describeTurnstileSiteKeyIssue(TURNSTILE_SITE_KEY)
  : null;

function GoogleLogoIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" focusable="false">
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

export function CloudAccountCard({
  surface = "app",
}: {
  surface?: "app" | "partner";
} = {}) {
  const {
    cloudEnabled,
    user,
    requiresEmailConfirmation,
    email,
    setEmail,
    signUp,
    signIn,
    requestPasswordReset,
    updatePassword,
    signInWithGoogle,
    resendConfirmationEmail,
    signOut,
    signOutAndClearDevice,
    syncNow,
    forceDownloadFromCloud,
    exportBackup,
    localDataHandoffStatus,
    saveLocalDataToAccount,
    keepLocalDataOnDevice,
    syncStatus,
    syncMessage,
    pendingUpload,
    pendingChangeCount,
  } = useCloudSync();
  const { data } = useAppStore();
  const { billingEnabled, limits } = useBilling();

  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<Extract<
    SignUpResult,
    { ok: true }
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const authStatus = searchParams.get("auth");
  const requestedMode = searchParams.get("modo");
  const googleAuthEnabled = isGoogleAuthEnabled();
  const signupSuccessRef = useRef<HTMLDivElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const captchaEnabled = Boolean(TURNSTILE_SITE_KEY);
  const captchaConfigurationIssue = TURNSTILE_SITE_KEY_ISSUE;
  const hasLocalWork = hasWorkspaceContent(data);
  const firstUseState = buildFirstUseOnboardingState({
    data,
    demoMode: false,
    emailConfirmed: !requiresEmailConfirmation,
    hasUser: Boolean(user),
  });
  const shouldOfferFirstSteps =
    Boolean(user) &&
    !requiresEmailConfirmation &&
    firstUseState.visible &&
    (!firstUseState.profileReady || !firstUseState.hasFirstDocument);

  useEffect(() => {
    if (requestedMode === "crear" || requestedMode === "signup") {
      setAuthMode("signup");
      setAuthError(null);
      setAuthNotice(null);
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

  useEffect(() => {
    if (!captchaConfigurationIssue) return;

    console.error("Turnstile configuration issue", {
      code: captchaConfigurationIssue.diagnosticCode,
      kind: captchaConfigurationIssue.kind,
    });
  }, [captchaConfigurationIssue]);

  function changeAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    setAuthError(null);
    setAuthNotice(null);
    setResendNotice(null);
    resetCaptchaChallenge();
    if (mode === "signin") {
      setSignupSuccess(null);
    }
  }

  function resetCaptchaChallenge() {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  }

  async function runAuth(action: AuthMode) {
    setAuthError(null);
    setAuthNotice(null);
    if (action === "signin") setSignupSuccess(null);
    if (action === "reset") {
      await requestResetLink();
      return;
    }

    if (action === "signup") {
      if (!legalAccepted) {
        setAuthError(
          "Para crear cuenta debes aceptar los términos y la política de privacidad.",
        );
        return;
      }
    }

    const requestCaptchaToken = captchaEnabled
      ? captchaToken?.trim()
      : undefined;
    if (captchaConfigurationIssue) {
      setAuthError(captchaConfigurationIssue.message);
      return;
    }
    if (captchaEnabled && !requestCaptchaToken) {
      setAuthError("Espera a que termine la verificación de seguridad.");
      return;
    }

    setBusy(true);

    try {
      if (action === "signup") {
        if (referralCode.trim()) storePendingReferralCode(referralCode);
        const result = await signUp(password, requestCaptchaToken);
        if (!result.ok) {
          setAuthError(result.error);
          return;
        }
        setSignupSuccess(result);
        setPassword("");
        return;
      }

      const error = await signIn(password, requestCaptchaToken);
      if (error) setAuthError(friendlyAuthError(error));
      else setPassword("");
    } finally {
      setBusy(false);
      if (captchaEnabled) resetCaptchaChallenge();
    }
  }

  async function requestResetLink() {
    setAuthError(null);
    setAuthNotice(null);
    if (!email.trim()) {
      setAuthError("Introduce tu email");
      return;
    }

    const requestCaptchaToken = captchaEnabled
      ? captchaToken?.trim()
      : undefined;
    if (captchaConfigurationIssue) {
      setAuthError(captchaConfigurationIssue.message);
      return;
    }
    if (captchaEnabled && !requestCaptchaToken) {
      setAuthError("Espera a que termine la verificación de seguridad.");
      return;
    }

    setBusy(true);
    try {
      const error = await requestPasswordReset(requestCaptchaToken);
      if (error) {
        setAuthError(friendlyAuthError(error));
        return;
      }
      setAuthNotice(
        "Te hemos enviado un enlace para crear una contraseña nueva. Revisa tu email y spam.",
      );
    } finally {
      setBusy(false);
      if (captchaEnabled) resetCaptchaChallenge();
    }
  }

  async function saveNewPassword() {
    setAuthError(null);
    setAuthNotice(null);
    const passwordError = validateNewAccountPassword(newPassword);
    if (passwordError) {
      setAuthError(passwordError);
      return;
    }
    if (newPassword !== newPasswordConfirmation) {
      setAuthError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    const error = await updatePassword(newPassword);
    setBusy(false);
    if (error) {
      setAuthError(friendlyAuthError(error));
      return;
    }

    setNewPassword("");
    setNewPasswordConfirmation("");
    setAuthNotice("Contraseña actualizada. Ya puedes seguir usando tu cuenta.");
  }

  async function runGoogleAuth() {
    setAuthError(null);
    setSignupSuccess(null);
    setResendNotice(null);
    setAuthNotice(null);
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
        "Email de confirmación reenviado. Busca el correo de confirmación de Factu.",
      );
    }
  }

  async function handleForceDownload() {
    const confirmed = confirm(
      "Factu descargará primero una copia cifrada de seguridad de este dispositivo. Después sustituirá los datos locales por la copia completa de la nube, sin subir antes los cambios de este dispositivo. ¿Continuar?",
    );
    if (!confirmed) return;

    setBusy(true);
    await forceDownloadFromCloud();
    setBusy(false);
  }

  async function handleSaveLocalDataToAccount() {
    setBusy(true);
    await saveLocalDataToAccount();
    setBusy(false);
  }

  function handleKeepLocalDataOnDevice() {
    keepLocalDataOnDevice();
  }

  async function handleSecureSignOut() {
    const confirmed = confirm(
      "Se comprobará primero que la nube está al día. Después se cerrará la sesión y se borrarán de este navegador los datos de Factu y los ajustes locales de Rentabilidad Real. ¿Continuar?",
    );
    if (!confirmed) return;

    setAuthError(null);
    setAuthNotice(null);
    setBusy(true);
    const error = await signOutAndClearDevice();
    setBusy(false);
    if (error) {
      setAuthError(error);
      return;
    }
    setAuthNotice("Sesión cerrada y datos de este dispositivo borrados.");
  }

  return (
    <Card className="mb-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
          <Cloud className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {surface === "partner" ? "Acceso Partner" : "Acceso a tu cuenta"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {surface === "partner"
              ? "Crea tu acceso o inicia sesión con el mismo email que autorice el administrador."
              : "Inicia sesión para activar la nube entre móvil y PC, o guarda una copia JSON si prefieres seguir solo en este navegador."}
          </p>
        </div>
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
          {authStatus === "recovery" ? (
            <div className="space-y-3 rounded-xl border border-blue-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">
                    Crear contraseña nueva
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    El enlace del email ya ha validado tu cuenta. Elige una
                    contraseña nueva para futuros accesos por email.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nueva contraseña" hint={ACCOUNT_PASSWORD_POLICY_HINT}>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
                <Field label="Repetir contraseña">
                  <Input
                    type="password"
                    value={newPasswordConfirmation}
                    onChange={(event) =>
                      setNewPasswordConfirmation(event.target.value)
                    }
                    autoComplete="new-password"
                  />
                </Field>
              </div>
              <Button onClick={() => void saveNewPassword()} disabled={busy}>
                <KeyRound className="h-4 w-4" />
                Guardar contraseña
              </Button>
            </div>
          ) : null}
          {shouldOfferFirstSteps ? (
            <div className="space-y-3 rounded-xl border border-blue-200 bg-white p-4">
              <div>
                <p className="text-sm font-black text-slate-900">
                  Primeros pasos de la cuenta
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  La cuenta ya está activa. En el Panel tienes una guía breve
                  para completar tus datos y crear la primera factura real.
                </p>
              </div>
              <ButtonLink href="/" variant="secondary">
                Abrir primeros pasos
              </ButtonLink>
            </div>
          ) : null}
          {requiresEmailConfirmation ? (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <div>
                <p className="font-black">Email pendiente de confirmar</p>
                <p className="mt-1 leading-6">
                  Confirma tu email para activar la nube, Drive, envíos reales y
                  acciones de cuenta. Puedes seguir trabajando en este navegador
                  mientras tanto.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => void handleResendConfirmation()}
                disabled={busy || !email.trim()}
              >
                <Mail className="h-4 w-4" />
                Reenviar email de confirmación
              </Button>
            </div>
          ) : null}
          {!requiresEmailConfirmation &&
          limits.cloudSync &&
          localDataHandoffStatus !== "none" ? (
            <div className="space-y-3 rounded-xl border border-sky-200 bg-white p-4">
              <div>
                <p className="text-sm font-black text-slate-900">
                  {localDataHandoffStatus === "kept_local"
                    ? "Datos locales sin subir"
                    : "Datos locales encontrados"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {localDataHandoffStatus === "kept_local"
                    ? "Has elegido seguir usando estos datos solo en este navegador. Puedes guardarlos en tu cuenta más adelante."
                    : "Antes de sincronizar, elige qué hacemos con lo que ya creaste en este navegador."}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  onClick={() => void handleSaveLocalDataToAccount()}
                  disabled={
                    busy ||
                    requiresEmailConfirmation ||
                    localDataHandoffStatus === "syncing"
                  }
                >
                  {localDataHandoffStatus === "syncing"
                    ? "Guardando…"
                    : "Guardar estos datos en mi cuenta"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void exportBackup()}
                  disabled={busy}
                >
                  <Download className="h-4 w-4" />
                  Descargar copia antes de continuar
                </Button>
                {localDataHandoffStatus === "pending" ? (
                  <Button
                    variant="ghost"
                    onClick={handleKeepLocalDataOnDevice}
                    disabled={busy}
                  >
                    Seguir solo en este navegador
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
          {!limits.cloudSync && !requiresEmailConfirmation ? (
            <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-950">
              Plan Gratis: este navegador es tu único dispositivo local. La
              cuenta no sube estos datos a la nube de Factu; conserva una copia
              manual o conecta Drive desde la sección Copias.
            </p>
          ) : null}
          {limits.cloudSync ? (
            <p className="text-sm text-slate-500">
              Estado: {STATUS_LABELS[syncStatus]}
              {syncMessage ? ` — ${syncMessage}` : ""}
            </p>
          ) : null}
          {limits.cloudSync && pendingUpload && syncStatus !== "syncing" && (
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
            {limits.cloudSync ? (
              <Button
                variant="secondary"
                onClick={() => void syncNow()}
                disabled={busy || requiresEmailConfirmation}
              >
                <RefreshCw className="h-4 w-4" />
                Sincronizar ahora
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => void signOut()}>
              Cerrar sesión
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleSecureSignOut()}
              disabled={busy}
            >
              <LogOut className="h-4 w-4" />
              Cerrar y borrar este dispositivo
            </Button>
          </div>
          {limits.cloudSync ? (
            <details className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              <summary className="cursor-pointer font-semibold text-slate-700">
                Problemas de sincronización
              </summary>
              <div className="mt-3 space-y-3">
                <p>
                  Si este dispositivo no muestra los datos que sí aparecen en
                  otro, puedes repararlo descargando otra vez la copia completa
                  de la nube. Factu conserva primero una copia cifrada y solo
                  confirma la reparación cuando el navegador verifica el
                  guardado local.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => void handleForceDownload()}
                  disabled={busy || requiresEmailConfirmation}
                >
                  <Download className="h-4 w-4" />
                  Reparar con la copia de la nube
                </Button>
              </div>
            </details>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
            {hasLocalWork ? (
              <>
                Hemos encontrado datos en este navegador. Crear cuenta o iniciar
                sesión <strong>no los borra</strong>. Si tu plan incluye nube,
                te preguntaremos si quieres guardarlos en tu cuenta o seguir
                solo en este navegador.
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
              Cuenta confirmada. Ya puedes iniciar sesión con tu contraseña; al
              entrar verás los primeros pasos en el Panel.
            </p>
          ) : null}
          {authStatus === "recovery" ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
              El enlace de recuperación no pudo abrir una sesión válida. Pide un
              enlace nuevo e inténtalo desde el mismo navegador.
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

            {authMode === "reset" ? (
              <div className="rounded-xl border border-blue-200 bg-white p-4">
                <p className="text-sm font-black text-slate-900">
                  Recuperar contraseña
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Te enviaremos un enlace para crear una contraseña nueva. No
                  cambia nada hasta que abras ese email.
                </p>
              </div>
            ) : null}

            {googleAuthEnabled && authMode !== "reset" ? (
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
                autoComplete="email"
              />
            </Field>
            {authMode !== "reset" ? (
              <Field label="Contraseña" hint={ACCOUNT_PASSWORD_POLICY_HINT}>
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
            ) : null}
            {surface !== "partner" && billingEnabled && authMode === "signup" ? (
              <Field
                label="Código de invitación"
                hint={`Opcional — ${REFERRAL_BONUS_SCANS} créditos IA para ambos después de un pago válido`}
              >
                <Input
                  value={referralCode}
                  onChange={(e) =>
                    setReferralCode(e.target.value.toUpperCase())
                  }
                  placeholder="Ej: ABC12XY9"
                  onBlur={() => {
                    if (referralCode.trim())
                      storePendingReferralCode(referralCode);
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
                  <Link
                    href="/legal/terminos"
                    className="font-semibold underline"
                  >
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
            {captchaEnabled ? (
              <div className="overflow-hidden rounded-xl bg-white px-3 py-2">
                {captchaConfigurationIssue ? (
                  <p className="text-sm text-red-700">
                    {captchaConfigurationIssue.message}
                  </p>
                ) : (
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    options={{
                      appearance: "interaction-only",
                      language: "es",
                      size: "flexible",
                      theme: "light",
                    }}
                    onSuccess={setCaptchaToken}
                    onExpire={() => setCaptchaToken(null)}
                    onError={(errorCode) => {
                      const diagnostic =
                        describeTurnstileClientError(errorCode);
                      setCaptchaToken(null);
                      console.error("Turnstile client error", {
                        code: diagnostic.diagnosticCode,
                        kind: diagnostic.kind,
                      });
                      setAuthError(diagnostic.message);
                    }}
                    onUnsupported={() => {
                      setCaptchaToken(null);
                      setAuthError(
                        "Este navegador no puede completar la verificación de seguridad.",
                      );
                    }}
                  />
                )}
              </div>
            ) : null}
            <Button
              fullWidth
              onClick={() => void runAuth(authMode)}
              disabled={busy}
            >
              {busy
                ? authMode === "reset"
                  ? "Enviando enlace…"
                  : authMode === "signup"
                  ? "Creando cuenta…"
                  : "Comprobando…"
                : authMode === "reset"
                  ? "Enviar enlace de recuperación"
                  : authMode === "signup"
                  ? "Crear cuenta"
                  : "Iniciar sesión"}
            </Button>
            {authMode === "signin" ? (
              <button
                type="button"
                onClick={() => changeAuthMode("reset")}
                className="mx-auto block text-sm font-bold text-blue-700 underline-offset-4 hover:underline"
              >
                He olvidado mi contraseña
              </button>
            ) : null}
            {authMode === "reset" ? (
              <button
                type="button"
                onClick={() => changeAuthMode("signin")}
                className="mx-auto block text-sm font-bold text-slate-600 underline-offset-4 hover:underline"
              >
                Volver a iniciar sesión
              </button>
            ) : null}
          </div>
        </div>
      )}

      {authError && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-red-600">{authError}</p>
          {isEmailNotConfirmedError(authError) ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">
                ¿No encuentras el correo de confirmación?
              </p>
              <p className="mt-1">
                Busca el mensaje de <strong>Supabase</strong> con el enlace
                «Confirmar cuenta». Revisa spam y promociones. La bienvenida de
                Factu llegará después de activar la cuenta e iniciar sesión.
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
      {authNotice ? (
        <p className="text-sm font-medium text-emerald-700">{authNotice}</p>
      ) : null}
    </Card>
  );
}
