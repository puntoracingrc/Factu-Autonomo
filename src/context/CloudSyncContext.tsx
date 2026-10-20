"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { useAppStore } from "@/context/AppStore";
import { useCloudAuth } from "@/context/CloudAuthContext";
import { useCompany } from "@/context/CompanyContext";
import { useWorkspaceStorage } from "@/context/WorkspaceStorageContext";
import { canUseCloudForUser } from "@/lib/billing/cloud-access";
import {
  getAuthCallbackUrl,
  getPasswordRecoveryCallbackUrl,
} from "@/lib/supabase/auth-redirect";
import {
  friendlyGoogleLoginError,
  startGoogleLoginRedirect,
} from "@/lib/google-auth/browser";
import { getGoogleAuthClientId } from "@/lib/google-auth/config";
import { clearDriveAccessToken } from "@/lib/google-drive/backup";
import {
  recoverRevokedCloudDeviceAfterFreshSignIn,
  registerCurrentCloudDevice,
  releaseCurrentCloudDeviceSession,
  retireCurrentCloudDevice,
} from "@/lib/cloud/device-client";
import {
  runCloudSyncSingleFlight,
  type CloudSyncFlightState,
} from "@/lib/cloud/sync-single-flight";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { isGoogleAuthEnabled } from "@/lib/supabase/config";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import {
  EMAIL_CONFIRMATION_REQUIRED_MESSAGE,
  isUserEmailConfirmed,
} from "@/lib/auth/email-confirmation";
import { validateNewAccountPassword } from "@/lib/auth/password-policy";
import { setDemoWorkspaceMode } from "@/lib/demo-workspace";
import { clearPersistedAppData } from "@/lib/storage";
import type { AppData } from "@/lib/types";
import { clearSecondaryDeviceData } from "@/lib/security/device-data-clear";
import { readProtectedBackupFile } from "@/lib/security/protected-backup";
import {
  isRetryableWelcomeStatus,
  WELCOME_MAX_CLIENT_RETRIES,
  welcomeRetryDelayMs,
} from "@/lib/email/welcome-client-retry";
import { isActiveWorkspaceOwnerScope } from "@/lib/workspace-owner-runtime";
import {
  centralSyncFailureMessage,
  recordCentralSyncOutcome,
  type CentralSyncArea,
  type CentralSyncFailures,
  type CentralSyncOutcome,
} from "@/lib/central-authority/sync-health";

export type SyncStatus =
  "disabled" | "offline" | "idle" | "pending" | "syncing" | "synced" | "error";

export type SignUpResult =
  | { ok: true; email: string; needsEmailConfirmation: boolean }
  | { ok: false; error: string };

export type LocalDataHandoffStatus =
  "none" | "pending" | "kept_local" | "syncing";

interface CloudSyncValue {
  cloudEnabled: boolean;
  cloudSyncPaused: boolean;
  legacyCloudRetired: boolean;
  authReady: boolean;
  user: User | null;
  emailConfirmed: boolean;
  requiresEmailConfirmation: boolean;
  email: string;
  syncStatus: SyncStatus;
  syncMessage: string | null;
  pendingUpload: boolean;
  pendingChangeCount: number;
  localDataHandoffStatus: LocalDataHandoffStatus;
  setEmail: (value: string) => void;
  signUp: (password: string, captchaToken?: string) => Promise<SignUpResult>;
  signIn: (password: string, captchaToken?: string) => Promise<string | null>;
  requestPasswordReset: (captchaToken?: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  resendConfirmationEmail: () => Promise<string | null>;
  signOut: () => Promise<void>;
  signOutAndClearDevice: () => Promise<string | null>;
  syncNow: (freshLocalData?: AppData) => Promise<boolean>;
  reportCentralSyncOutcome: (
    ownerScope: string,
    area: CentralSyncArea,
    outcome: CentralSyncOutcome,
  ) => void;
  pauseCloudForLocalRestore: () => boolean;
  importBackup: (file: File) => Promise<string | null>;
}

const CloudSyncContext = createContext<CloudSyncValue | null>(null);
const BUSINESS_EVENT_LIMIT = 500;
const INVOICE_EVENT_LIMIT = 50;
const MAX_SYNC_PAGES = 100;

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const {
    data,
    ready,
    getCurrentData,
    replaceData,
    syncCentralBusinessEvents,
    syncCentralInvoiceAuthorityEvents,
    syncFiscalNotificationsWorkspace,
  } = useAppStore();
  const {
    cloudEnabled,
    authReady,
    user,
    email,
    setEmail,
    setAuthenticatedUser,
    signOutAuthSession,
  } = useCloudAuth();
  const workspace = useWorkspaceStorage();
  const { activeCompany } = useCompany();
  const demoMode = useDemoWorkspaceMode();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    cloudEnabled ? "idle" : "disabled",
  );
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [cloudAccessAllowed, setCloudAccessAllowed] = useState<boolean | null>(
    null,
  );
  const [online, setOnline] = useState(true);
  const syncFlightRef = useRef<CloudSyncFlightState<boolean>>(null);
  const syncFailuresRef = useRef<CentralSyncFailures>({});
  const welcomeRequestedForUser = useRef<string | null>(null);
  const welcomeRetryUser = useRef<string | null>(null);
  const welcomeRetryAttempts = useRef(0);
  const welcomeRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [welcomeRetryRevision, setWelcomeRetryRevision] = useState(0);

  const legacyCloudRetired = Boolean(user);
  const cloudSyncPaused = false;
  const emailConfirmed = isUserEmailConfirmed(user);
  const authenticatedUserId = user?.id ?? null;
  const requiresEmailConfirmation = Boolean(user && !emailConfirmed);
  const pendingChangeCount = (data.meta?.pendingChanges ?? []).filter(
    (change) => change.entityType === "fiscal_notifications_workspace",
  ).length;

  const reportCentralSyncOutcome = useCallback(
    (ownerScope: string, area: CentralSyncArea, outcome: CentralSyncOutcome) => {
      if (ownerScope !== workspace.ownerScope || !isActiveWorkspaceOwnerScope(ownerScope)) return;
      if (outcome.ok && (area === "business" || area === "invoices")) {
        setCloudAccessAllowed(true);
      }
      const previous = syncFailuresRef.current;
      const next = recordCentralSyncOutcome(previous, area, outcome);
      if (next === previous) return;
      syncFailuresRef.current = next;
      // A manual sync owns its progress text until its required steps finish.
      if (syncFlightRef.current) return;
      const message = centralSyncFailureMessage(next);
      setSyncStatus(message ? "error" : "synced");
      setSyncMessage(message ?? "Servidor central comprobado.");
    },
    [workspace.ownerScope],
  );

  useEffect(() => {
    const refresh = () => setOnline(navigator.onLine);
    refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  useEffect(() => {
    if (!authenticatedUserId || !activeCompany || !emailConfirmed || demoMode) {
      setCloudAccessAllowed(null);
      return;
    }
    let cancelled = false;
    const ownerScope = workspace.ownerScope;
    void canUseCloudForUser(activeCompany.billingOwnerUserId)
      .then(async (cloudAccess) => {
        if (cancelled || !isActiveWorkspaceOwnerScope(ownerScope)) return;
        setCloudAccessAllowed(cloudAccess.allowed);
        if (!cloudAccess.allowed) {
          setSyncStatus("idle");
          setSyncMessage(
            cloudAccess.reason ??
              "La sincronizacion entre dispositivos requiere un plan con nube.",
          );
          return;
        }
        reportCentralSyncOutcome(ownerScope, "access", { ok: true });
        const result = await registerCurrentCloudDevice({
          notifyReactivated: false,
          expectedOwnerScope: ownerScope,
        });
        if (cancelled || !isActiveWorkspaceOwnerScope(ownerScope)) return;
        reportCentralSyncOutcome(ownerScope, "device",
          result.error || result.allowed === false
            ? { ok: false, message: result.message ?? result.error ?? "Este dispositivo no puede usar el servidor central." }
            : { ok: true },
        );
      })
      .catch((error) => {
        if (cancelled || !isActiveWorkspaceOwnerScope(ownerScope)) return;
        setCloudAccessAllowed(null);
        reportCentralSyncOutcome(ownerScope, "access", {
          ok: false,
          message: error instanceof Error ? error.message : "No se pudo comprobar el acceso al servidor central.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [
    activeCompany, authenticatedUserId, demoMode, emailConfirmed,
    reportCentralSyncOutcome, workspace.ownerScope,
  ]);

  useEffect(() => {
    if (!demoMode || !ready || !user) return;
    setDemoWorkspaceMode(false);
    setSyncMessage(
      "Demo cerrada al iniciar sesion. Ya estas en tu espacio real.",
    );
  }, [demoMode, ready, user]);

  const syncNow = useCallback(
    async (freshLocalData?: AppData): Promise<boolean> => {
      void freshLocalData;
      if (demoMode || !user || !activeCompany || !emailConfirmed) return false;
      const ownerScope = workspace.ownerScope;
      const ensureOwnerIsActive = () => {
        if (!isActiveWorkspaceOwnerScope(ownerScope)) {
          throw new Error(
            "La cuenta cambió durante la sincronización. No se mezcló ningún dato.",
          );
        }
      };
      ensureOwnerIsActive();
      const synced = await runCloudSyncSingleFlight(syncFlightRef, ownerScope, async () => {
        ensureOwnerIsActive();
        if (!navigator.onLine) {
          setSyncStatus("offline");
          setSyncMessage(
            "Sin conexion. Las operaciones centrales siguen en cola.",
          );
          return false;
        }

        setSyncStatus("syncing");
        setSyncMessage("Comprobando el servidor central...");
        let area: CentralSyncArea = "access";
        try {
          const cloudAccess = await canUseCloudForUser(
            activeCompany.billingOwnerUserId,
          );
          ensureOwnerIsActive();
          setCloudAccessAllowed(cloudAccess.allowed);
          if (!cloudAccess.allowed) {
            setSyncStatus("idle");
            setSyncMessage(
              cloudAccess.reason ??
                "La sincronizacion entre dispositivos requiere un plan con nube.",
            );
            return false;
          }
          reportCentralSyncOutcome(ownerScope, "access", { ok: true });
          area = "device";
          const device = await registerCurrentCloudDevice({
            notifyReactivated: false,
            expectedOwnerScope: ownerScope,
          });
          ensureOwnerIsActive();
          if (device.error || device.allowed === false) {
            throw new Error(
              device.message ??
                device.error ??
                "Este dispositivo no puede usar el servidor central.",
            );
          }
          reportCentralSyncOutcome(ownerScope, "device", { ok: true });

          area = "business";
          for (let page = 0; page < MAX_SYNC_PAGES; page += 1) {
            let business = await syncCentralBusinessEvents(ownerScope, {
              limit: BUSINESS_EVENT_LIMIT,
            });
            ensureOwnerIsActive();
            if (!business.ok && business.retryable && business.code === "CENTRAL_BUSINESS_LOCAL_WRITE_BLOCKED") {
              business = await syncCentralBusinessEvents(ownerScope, { limit: BUSINESS_EVENT_LIMIT });
              ensureOwnerIsActive();
            }
            if (!business.ok) throw new Error(business.message);
            if (!business.hasMore) break;
            if (page === MAX_SYNC_PAGES - 1) {
              throw new Error(
                "Quedan demasiados eventos de negocio por revisar.",
              );
            }
          }
          reportCentralSyncOutcome(ownerScope, "business", { ok: true });

          area = "invoices";
          for (let page = 0; page < MAX_SYNC_PAGES; page += 1) {
            let invoices = await syncCentralInvoiceAuthorityEvents(
              getCurrentData(),
              { limit: INVOICE_EVENT_LIMIT },
            );
            ensureOwnerIsActive();
            if (invoices.status === "blocked" && invoices.reason === "stale_precondition") {
              invoices = await syncCentralInvoiceAuthorityEvents(getCurrentData(), { limit: INVOICE_EVENT_LIMIT });
              ensureOwnerIsActive();
            }
            if (invoices.status !== "applied") {
              throw new Error(
                invoices.status === "blocked" &&
                  invoices.reason === "quota_exceeded"
                  ? "Las facturas están en el servidor, pero el navegador ha rechazado guardar su copia local (quota_exceeded). No borres datos ni vuelvas a emitirlas."
                  : "No se pudo confirmar la lectura de facturas centrales.",
              );
            }
            if (!invoices.value.localSync.ok) {
              throw new Error(
                invoices.value.localSync.message ??
                  "Las facturas centrales requieren revision.",
              );
            }
            if (invoices.value.localSync.pulledEvents < INVOICE_EVENT_LIMIT) {
              break;
            }
            if (page === MAX_SYNC_PAGES - 1) {
              throw new Error(
                "Quedan demasiados eventos fiscales por revisar.",
              );
            }
          }
          reportCentralSyncOutcome(ownerScope, "invoices", { ok: true });

          area = "fiscal";
          const fiscalWorkspace =
            await syncFiscalNotificationsWorkspace(ownerScope);
          ensureOwnerIsActive();
          if (!fiscalWorkspace.ok) {
            throw new Error(fiscalWorkspace.message);
          }
          reportCentralSyncOutcome(ownerScope, "fiscal", { ok: true });

          // The authenticated reads already renewed/verified the device lease.
          // This last-seen stamp is not another prerequisite for displaying data.
          void registerCurrentCloudDevice({
            markSynced: true,
            notifyReactivated: false,
            expectedOwnerScope: ownerScope,
          }).catch(() => undefined);
          ensureOwnerIsActive();
          const failure = centralSyncFailureMessage(syncFailuresRef.current);
          setSyncStatus(failure ? "error" : "synced");
          setSyncMessage(failure ?? "Servidor central comprobado.");
          return failure === null;
        } catch (error) {
          if (!isActiveWorkspaceOwnerScope(ownerScope)) return false;
          const message = error instanceof Error ? error.message : "No se pudo comprobar el servidor central.";
          reportCentralSyncOutcome(ownerScope, area, { ok: false, message });
          setSyncStatus(navigator.onLine ? "error" : "offline");
          setSyncMessage(centralSyncFailureMessage(syncFailuresRef.current) ?? message);
          return false;
        }
      });
      // An automatic result may have arrived between the last manual step and
      // releasing the shared flight. Reconcile after release, not mid-progress.
      if (isActiveWorkspaceOwnerScope(ownerScope) && !syncFlightRef.current) {
        const failure = centralSyncFailureMessage(syncFailuresRef.current);
        if (failure) {
          setSyncStatus("error");
          setSyncMessage(failure);
        } else {
          setSyncStatus((previous) => previous === "error" ? "synced" : previous);
        }
      }
      return synced;
    },
    [
      demoMode,
      activeCompany,
      emailConfirmed,
      getCurrentData,
      reportCentralSyncOutcome,
      syncCentralBusinessEvents,
      syncCentralInvoiceAuthorityEvents,
      syncFiscalNotificationsWorkspace,
      user,
      workspace.ownerScope,
    ],
  );

  useEffect(() => {
    if (
      !ready ||
      demoMode ||
      !user ||
      !emailConfirmed ||
      !online ||
      cloudAccessAllowed !== true ||
      pendingChangeCount === 0
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      void syncNow();
    }, 1_500);
    return () => window.clearTimeout(timer);
  }, [
    cloudAccessAllowed,
    demoMode,
    emailConfirmed,
    online,
    pendingChangeCount,
    ready,
    syncNow,
    user,
  ]);

  const signUp = useCallback(
    async (password: string, captchaToken?: string): Promise<SignUpResult> => {
      const supabase = await getSupabaseClientAsync();
      if (!supabase) {
        return {
          ok: false,
          error: "La nube no esta configurada en este servidor",
        };
      }
      if (!email.trim()) return { ok: false, error: "Introduce tu email" };
      const passwordError = validateNewAccountPassword(password);
      if (passwordError) return { ok: false, error: passwordError };
      const { data: result, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthCallbackUrl(),
          ...(captchaToken ? { captchaToken } : {}),
        },
      });
      if (error) return { ok: false, error: error.message };
      if (result.session?.user) setAuthenticatedUser(result.session.user);
      const needsEmailConfirmation = Boolean(result.user && !result.session);
      setSyncMessage(
        needsEmailConfirmation
          ? "Cuenta creada. Confirma el email y luego inicia sesion."
          : "Cuenta creada e iniciada.",
      );
      return {
        ok: true,
        email: result.user?.email ?? email.trim(),
        needsEmailConfirmation,
      };
    },
    [email, setAuthenticatedUser],
  );

  const signIn = useCallback(
    async (password: string, captchaToken?: string) => {
      const supabase = await getSupabaseClientAsync();
      if (!supabase) return "La nube no esta configurada en este servidor";
      if (!email.trim()) return "Introduce tu email";
      const { data: result, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        ...(captchaToken ? { options: { captchaToken } } : {}),
      });
      if (error) return error.message;
      if (result.user) setAuthenticatedUser(result.user);
      const device = await recoverRevokedCloudDeviceAfterFreshSignIn();
      setSyncMessage(
        device.allowed === false || device.error
          ? (device.message ??
              device.error ??
              "No se pudo verificar el dispositivo.")
          : "Sesion iniciada. Dispositivo verificado.",
      );
      return null;
    },
    [email, setAuthenticatedUser],
  );

  const requestPasswordReset = useCallback(
    async (captchaToken?: string) => {
      const supabase = await getSupabaseClientAsync();
      if (!supabase) return "La nube no esta configurada en este servidor";
      if (!email.trim()) return "Introduce tu email";
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: getPasswordRecoveryCallbackUrl(),
          ...(captchaToken ? { captchaToken } : {}),
        },
      );
      return error?.message ?? null;
    },
    [email],
  );

  const updatePassword = useCallback(async (password: string) => {
    const supabase = await getSupabaseClientAsync();
    if (!supabase) return "La nube no esta configurada en este servidor";
    const passwordError = validateNewAccountPassword(password);
    if (passwordError) return passwordError;
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setSyncMessage("Contrasena actualizada.");
    return error?.message ?? null;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isGoogleAuthEnabled())
      return "El acceso con Google aun no esta activado.";
    const googleClientId = getGoogleAuthClientId();
    if (!googleClientId) {
      return "Falta configurar el identificador publico de Google.";
    }
    setSyncMessage("Abriendo Google para iniciar sesion...");
    try {
      await startGoogleLoginRedirect(googleClientId);
      return null;
    } catch (error) {
      return friendlyGoogleLoginError(error);
    }
  }, []);

  const resendConfirmationEmail = useCallback(async () => {
    const supabase = await getSupabaseClientAsync();
    if (!supabase) return "La nube no esta configurada en este servidor";
    if (!email.trim()) return "Introduce tu email";
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: getAuthCallbackUrl() },
    });
    return error?.message ?? null;
  }, [email]);

  const finishSignedOutSession = useCallback(
    (message: string) => {
      setAuthenticatedUser(null);
      setSyncMessage(message);
      setSyncStatus(cloudEnabled ? "idle" : "disabled");
    },
    [cloudEnabled, setAuthenticatedUser],
  );

  const signOut = useCallback(async () => {
    const ownerScope = user ? workspace.ownerScope : null;
    if (ownerScope && !isActiveWorkspaceOwnerScope(ownerScope)) return;
    await releaseCurrentCloudDeviceSession(ownerScope);
    if (ownerScope && !isActiveWorkspaceOwnerScope(ownerScope)) return;
    const error = await signOutAuthSession();
    if (error) {
      setSyncStatus("error");
      setSyncMessage(error);
      return;
    }
    finishSignedOutSession("Sesion cerrada");
  }, [finishSignedOutSession, signOutAuthSession, user, workspace.ownerScope]);

  const signOutAndClearDevice = useCallback(async (): Promise<
    string | null
  > => {
    if (!user) return "No hay una sesion iniciada.";
    if (demoMode) return "Sal de la demo antes de borrar este dispositivo.";
    if (!emailConfirmed) return EMAIL_CONFIRMATION_REQUIRED_MESSAGE;
    const ownerScope = workspace.ownerScope;
    const ownerStillActive = () => isActiveWorkspaceOwnerScope(ownerScope);
    if (!ownerStillActive()) {
      return "La cuenta ha cambiado. No se borro ningun dato local.";
    }
    const cloudAccess = await canUseCloudForUser(
      activeCompany?.billingOwnerUserId ?? user.id,
    );
    if (!ownerStillActive()) {
      return "La cuenta ha cambiado. No se borro ningun dato local.";
    }
    if (cloudAccess.allowed && !(await syncNow())) {
      return "No se pudo confirmar el servidor central. No se borro ningun dato local.";
    }
    if (!ownerStillActive()) {
      return "La cuenta ha cambiado. No se borro ningun dato local.";
    }
    if (cloudAccess.allowed) {
      const retired = await retireCurrentCloudDevice(ownerScope);
      if (retired.error) return retired.error;
    }
    if (!ownerStillActive()) {
      return "La cuenta ha cambiado. No se borro ningun dato local.";
    }
    const expected = getCurrentData();
    const signOutError = await signOutAuthSession();
    if (signOutError) return signOutError;
    finishSignedOutSession("Sesion cerrada de forma segura");
    const cleared = clearPersistedAppData(expected, {
      storageKey: workspace.storageKey,
    });
    if (cleared.status !== "applied") {
      return "La sesion se cerro, pero el navegador no confirmo el borrado local.";
    }
    clearDriveAccessToken();
    const secondary = clearSecondaryDeviceData(ownerScope);
    return secondary.ok
      ? null
      : "Los datos principales se borraron, pero quedaron ajustes locales por revisar.";
  }, [
    demoMode,
    activeCompany?.billingOwnerUserId,
    emailConfirmed,
    finishSignedOutSession,
    getCurrentData,
    syncNow,
    signOutAuthSession,
    user,
    workspace.ownerScope,
    workspace.storageKey,
  ]);

  const importBackup = useCallback(
    async (file: File) => {
      if (demoMode) return "Sal de la demo para importar una copia real.";
      if (user && legacyCloudRetired) {
        try {
          const cloudAccess = await canUseCloudForUser(
            activeCompany?.billingOwnerUserId ?? user.id,
          );
          if (cloudAccess.allowed) {
            return "Con el servidor central activo, una copia local no puede sustituir datos centrales. Cierra sesion o usa la migracion central revisada.";
          }
        } catch {
          return "No se pudo comprobar si esta cuenta usa servidor central. No se importo la copia.";
        }
      }
      const parsed = await readProtectedBackupFile(file);
      if ("error" in parsed) return parsed.error;
      if (
        !confirm(
          "Importar esta copia y sustituir los datos de este dispositivo?",
        )
      ) {
        return null;
      }
      replaceData(parsed, { fromRemote: true });
      setSyncMessage("Copia local importada correctamente.");
      return null;
    },
    [
      activeCompany?.billingOwnerUserId,
      demoMode,
      legacyCloudRetired,
      replaceData,
      user,
    ],
  );

  useEffect(() => {
    const userId = user?.id ?? null;
    const clearRetry = () => {
      if (!welcomeRetryTimer.current) return;
      clearTimeout(welcomeRetryTimer.current);
      welcomeRetryTimer.current = null;
    };
    if (!userId || demoMode || !emailConfirmed) {
      clearRetry();
      welcomeRequestedForUser.current = null;
      return;
    }
    if (welcomeRetryUser.current !== userId) {
      clearRetry();
      welcomeRetryUser.current = userId;
      welcomeRetryAttempts.current = 0;
      welcomeRequestedForUser.current = null;
    }
    if (welcomeRequestedForUser.current === userId) return;
    let cancelled = false;
    welcomeRequestedForUser.current = userId;
    const scheduleRetry = (retryAfter?: string | null) => {
      if (
        cancelled ||
        welcomeRetryAttempts.current >= WELCOME_MAX_CLIENT_RETRIES
      ) {
        return;
      }
      const retryIndex = welcomeRetryAttempts.current++;
      clearRetry();
      welcomeRetryTimer.current = setTimeout(() => {
        welcomeRetryTimer.current = null;
        welcomeRequestedForUser.current = null;
        setWelcomeRetryRevision((value) => value + 1);
      }, welcomeRetryDelayMs({ retryIndex, retryAfter }));
    };
    void getSupabaseClientAsync()
      .then(async (supabase) => {
        const { data: sessionData } = (await supabase?.auth.getSession()) ?? {
          data: { session: null },
        };
        const session = sessionData.session;
        if (!session?.access_token || session.user.id !== userId) {
          scheduleRetry();
          return;
        }
        const response = await fetch("/api/email/welcome", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (response.ok) return;
        if (isRetryableWelcomeStatus(response.status)) {
          scheduleRetry(response.headers.get("Retry-After"));
        }
      })
      .catch(() => scheduleRetry());
    return () => {
      cancelled = true;
      clearRetry();
    };
  }, [demoMode, emailConfirmed, user, welcomeRetryRevision]);

  const value = useMemo<CloudSyncValue>(
    () => ({
      cloudEnabled,
      cloudSyncPaused,
      legacyCloudRetired,
      authReady,
      user,
      emailConfirmed,
      requiresEmailConfirmation,
      email,
      syncStatus: online ? syncStatus : "offline",
      reportCentralSyncOutcome,
      syncMessage,
      pendingUpload: pendingChangeCount > 0,
      pendingChangeCount,
      localDataHandoffStatus: "none",
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
      pauseCloudForLocalRestore: () => !user || cloudAccessAllowed === false,
      importBackup,
    }),
    [
      authReady,
      cloudAccessAllowed,
      cloudEnabled,
      cloudSyncPaused,
      email,
      emailConfirmed,
      importBackup,
      legacyCloudRetired,
      online,
      pendingChangeCount,
      requestPasswordReset,
      requiresEmailConfirmation,
      resendConfirmationEmail,
      signIn,
      signInWithGoogle,
      signOut,
      signOutAndClearDevice,
      signUp,
      syncMessage,
      syncNow,
      syncStatus,
      reportCentralSyncOutcome,
      setEmail,
      updatePassword,
      user,
    ],
  );

  return (
    <CloudSyncContext.Provider value={value}>
      {children}
    </CloudSyncContext.Provider>
  );
}

export function useCloudSync(): CloudSyncValue {
  const context = useContext(CloudSyncContext);
  if (!context) {
    throw new Error("useCloudSync debe usarse dentro de CloudSyncProvider");
  }
  return context;
}
