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
import { downloadBackup, readBackupFile } from "@/lib/backup";
import { appDataToSyncChanges } from "@/lib/cloud/diff";
import {
  hasPendingSyncChanges,
  markChangesSynced,
  markFullySynced,
  mergeRemoteOntoLocal,
  normalizeImportedCloudData,
} from "@/lib/cloud/incremental";
import {
  countSyncEntities,
  fetchLegacyCloudBackup,
  migrateLegacyBackupToEntities,
  pullSyncChanges,
  pushSyncChanges,
} from "@/lib/cloud/repository";
import {
  clearSyncPending,
  buildCloudUploadChanges,
  hasUnsyncedChanges,
  isBrowserOnline,
  isSyncPendingFlag,
  markSyncPending,
} from "@/lib/cloud/sync-queue";
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
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { isCloudEnabled, isGoogleAuthEnabled } from "@/lib/supabase/config";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import {
  EMAIL_CONFIRMATION_REQUIRED_MESSAGE,
  isUserEmailConfirmed,
} from "@/lib/auth/email-confirmation";
import { validateNewAccountPassword } from "@/lib/auth/password-policy";
import { setDemoWorkspaceMode } from "@/lib/demo-workspace";
import { loadData } from "@/lib/storage";
import { pickNewerAppData } from "@/lib/cloud/sync";
import { EMPTY_DATA } from "@/lib/types";
import { hasWorkspaceContent } from "@/lib/workspace-state";
import { reportAppError } from "@/lib/monitoring/client";
import {
  isRetryableWelcomeStatus,
  WELCOME_MAX_CLIENT_RETRIES,
  welcomeRetryDelayMs,
} from "@/lib/email/welcome-client-retry";

export type SyncStatus =
  "disabled" | "offline" | "idle" | "pending" | "syncing" | "synced" | "error";

export type SignUpResult =
  | { ok: true; email: string; needsEmailConfirmation: boolean }
  | { ok: false; error: string };

export type LocalDataHandoffStatus =
  "none" | "pending" | "kept_local" | "syncing";

interface CloudSyncValue {
  cloudEnabled: boolean;
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
  signUp: (
    password: string,
    captchaToken?: string,
  ) => Promise<SignUpResult>;
  signIn: (password: string, captchaToken?: string) => Promise<string | null>;
  requestPasswordReset: (
    captchaToken?: string,
  ) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  resendConfirmationEmail: () => Promise<string | null>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  saveLocalDataToAccount: () => Promise<void>;
  keepLocalDataOnDevice: () => void;
  forceDownloadFromCloud: () => Promise<void>;
  exportBackup: () => void;
  importBackup: (file: File) => Promise<string | null>;
}

const CloudSyncContext = createContext<CloudSyncValue | null>(null);

const RETRY_MS = 30_000;
const PULL_INTERVAL_MS = 45_000;
const LOCAL_DATA_HANDOFF_PREFIX = "factura-autonomo-local-data-handoff";

type LocalDataHandoffDecision = "synced" | "keep_local";

function handoffDecisionKey(userId: string): string {
  return `${LOCAL_DATA_HANDOFF_PREFIX}:${userId}`;
}

function readHandoffDecision(userId: string): LocalDataHandoffDecision | null {
  if (typeof localStorage === "undefined") return null;
  const value = localStorage.getItem(handoffDecisionKey(userId));
  return value === "synced" || value === "keep_local" ? value : null;
}

function rememberHandoffDecision(
  userId: string,
  decision: LocalDataHandoffDecision,
): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(handoffDecisionKey(userId), decision);
}

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const { data, ready, replaceData } = useAppStore();
  const demoMode = useDemoWorkspaceMode();
  const cloudEnabled = isCloudEnabled();
  const [authReady, setAuthReady] = useState(!cloudEnabled);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [online, setOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    cloudEnabled ? "idle" : "disabled",
  );
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [localDataHandoffStatus, setLocalDataHandoffStatus] =
    useState<LocalDataHandoffStatus>("none");
  const skipPush = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulledForUser = useRef<string | null>(null);
  const welcomeRequestedForUser = useRef<string | null>(null);
  const welcomeRetryUser = useRef<string | null>(null);
  const welcomeRetryAttempts = useRef(0);
  const welcomeRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [welcomeRetryRevision, setWelcomeRetryRevision] = useState(0);
  const syncing = useRef(false);
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const pendingChangeCount = data.meta?.pendingChanges?.length ?? 0;
  const emailConfirmed = isUserEmailConfirmed(user);
  const requiresEmailConfirmation = Boolean(user && !emailConfirmed);
  const handoffDecision = user ? readHandoffDecision(user.id) : null;
  const hasUndecidedLocalData =
    !demoMode &&
    ready &&
    Boolean(user) &&
    emailConfirmed &&
    handoffDecision === null &&
    hasWorkspaceContent(data) &&
    !data.meta?.lastSyncedAt;
  const handoffPausesCloud =
    requiresEmailConfirmation ||
    localDataHandoffStatus === "pending" ||
    localDataHandoffStatus === "kept_local" ||
    handoffDecision === "keep_local" ||
    hasUndecidedLocalData;
  const pendingUpload =
    !demoMode &&
    !handoffPausesCloud &&
    (hasPendingSyncChanges(data) ||
      isSyncPendingFlag() ||
      hasUnsyncedChanges(data));

  const updatePendingStatus = useCallback(() => {
    if (demoMode) {
      setSyncStatus("idle");
      setSyncMessage("Modo demo: los datos ficticios no se suben a la nube.");
      return;
    }
    if (!user || !cloudEnabled) return;
    if (requiresEmailConfirmation) {
      setSyncStatus("idle");
      setSyncMessage(EMAIL_CONFIRMATION_REQUIRED_MESSAGE);
      return;
    }
    if (handoffPausesCloud) {
      setSyncStatus("idle");
      setSyncMessage(
        localDataHandoffStatus === "kept_local"
          ? "Datos en modo local para esta cuenta."
          : "Elige qué hacer con los datos de este navegador.",
      );
      return;
    }
    if (!isBrowserOnline()) {
      setSyncStatus("offline");
      setSyncMessage(
        "Sin conexión. Los cambios se subirán cuando vuelva internet.",
      );
      return;
    }
    if (
      hasPendingSyncChanges(data) ||
      hasUnsyncedChanges(data) ||
      isSyncPendingFlag()
    ) {
      setSyncStatus("pending");
      setSyncMessage(
        pendingChangeCount > 0
          ? `${pendingChangeCount} cambio(s) pendiente(s) de subir`
          : "Cambios pendientes de subir a la nube",
      );
    } else if (syncStatus !== "syncing" && syncStatus !== "error") {
      setSyncStatus("synced");
    }
  }, [
    cloudEnabled,
    data,
    demoMode,
    handoffPausesCloud,
    requiresEmailConfirmation,
    localDataHandoffStatus,
    pendingChangeCount,
    syncStatus,
    user,
  ]);

  const finalizeSyncState = useCallback(
    (payload: typeof data) => {
      clearSyncPending();
      if (!hasPendingSyncChanges(payload)) {
        const synced = markFullySynced(payload);
        dataRef.current = synced;
        skipPush.current = true;
        replaceData(synced, { fromRemote: true });
        skipPush.current = false;
      }
    },
    [replaceData],
  );

  const replaceLocalDataFromCloud = useCallback(
    (payload: typeof data) => {
      dataRef.current = payload;
      skipPush.current = true;
      try {
        replaceData(payload, { fromRemote: true });
      } finally {
        skipPush.current = false;
      }
    },
    [replaceData],
  );

  const pushToCloud = useCallback(
    async (
      payload = data,
      silent = false,
      options?: { allowLocalDataUpload?: boolean },
    ): Promise<boolean> => {
      if (demoMode) {
        setSyncStatus("idle");
        setSyncMessage("Modo demo: no se sincronizan datos ficticios.");
        return false;
      }
      if (!user) return false;
      if (requiresEmailConfirmation) {
        setSyncStatus("idle");
        setSyncMessage(EMAIL_CONFIRMATION_REQUIRED_MESSAGE);
        return false;
      }
      if (handoffPausesCloud && !options?.allowLocalDataUpload) {
        setSyncStatus("idle");
        setSyncMessage(
          localDataHandoffStatus === "kept_local"
            ? "Tus datos siguen solo en este navegador. Puedes guardarlos en tu cuenta desde Cuenta."
            : "Elige primero qué hacer con los datos locales.",
        );
        return false;
      }

      const cloudAccess = await canUseCloudForUser(user.id);
      if (!cloudAccess.allowed) {
        setSyncStatus("idle");
        setSyncMessage(cloudAccess.reason ?? "La nube requiere plan Pro.");
        return false;
      }

      if (!isBrowserOnline()) {
        markSyncPending();
        setSyncStatus("offline");
        setSyncMessage("Sin conexión. En cola para subir.");
        return false;
      }

      const changes = buildCloudUploadChanges(payload);
      if (changes.length === 0) {
        clearSyncPending();
        setSyncStatus("synced");
        return true;
      }

      if (!silent) setSyncStatus("syncing");
      try {
        const syncedAt = await pushSyncChanges(user.id, changes);
        const synced = markChangesSynced(payload, changes, syncedAt);
        dataRef.current = synced;
        skipPush.current = true;
        replaceData(synced, { fromRemote: true });
        skipPush.current = false;
        clearSyncPending();
        setSyncStatus("synced");
        setSyncMessage(
          silent
            ? null
            : `${changes.length} cambio(s) sincronizado(s) con la nube`,
        );
        return true;
      } catch (error) {
        markSyncPending();
        void reportAppError({
          severity: "error",
          area: "sync",
          code: "push_failed",
          message:
            error instanceof Error
              ? error.message
              : "Error al subir cambios a la nube",
          metadata: {
            pendingChanges: changes.length,
          },
        });
        setSyncStatus(isBrowserOnline() ? "error" : "offline");
        setSyncMessage(
          isBrowserOnline()
            ? error instanceof Error
              ? error.message
              : "Error al sincronizar. Reintentando…"
            : "Sin conexión. En cola para subir.",
        );
        return false;
      }
    },
    [
      data,
      demoMode,
      handoffPausesCloud,
      localDataHandoffStatus,
      replaceData,
      requiresEmailConfirmation,
      user,
    ],
  );

  const flushPendingUpload = useCallback(
    async (
      silent = true,
      payload = dataRef.current,
      options?: { allowLocalDataUpload?: boolean },
    ) => {
      if (demoMode) return false;
      if (!user) return false;
      if (requiresEmailConfirmation) return false;
      if (handoffPausesCloud && !options?.allowLocalDataUpload) return false;
      if (!hasPendingSyncChanges(payload) && !hasUnsyncedChanges(payload)) {
        clearSyncPending();
        setSyncStatus("synced");
        return true;
      }
      if (syncing.current) return false;
      syncing.current = true;
      const ok = await pushToCloud(payload, silent, options);
      syncing.current = false;
      return ok;
    },
    [
      demoMode,
      handoffPausesCloud,
      pushToCloud,
      requiresEmailConfirmation,
      user,
    ],
  );

  const pullFromCloud = useCallback(
    async (options?: { allowLocalDataUpload?: boolean }): Promise<boolean> => {
      if (demoMode) return false;
      if (!user) return false;
      if (requiresEmailConfirmation) {
        setSyncStatus("idle");
        setSyncMessage(EMAIL_CONFIRMATION_REQUIRED_MESSAGE);
        return false;
      }
      if (handoffPausesCloud && !options?.allowLocalDataUpload) {
        setSyncStatus("idle");
        setSyncMessage(
          localDataHandoffStatus === "kept_local"
            ? "Tus datos siguen solo en este navegador. Puedes guardarlos en tu cuenta desde Cuenta."
            : "Elige primero qué hacer con los datos locales.",
        );
        return false;
      }

      const cloudAccess = await canUseCloudForUser(user.id);
      if (!cloudAccess.allowed) {
        setSyncStatus("idle");
        setSyncMessage(cloudAccess.reason ?? "La nube requiere plan Pro.");
        return false;
      }

      if (!isBrowserOnline()) {
        setSyncStatus("offline");
        setSyncMessage("Sin conexión. Trabajando en local.");
        return false;
      }

      let workingData = dataRef.current;

      if (
        hasPendingSyncChanges(workingData) ||
        hasUnsyncedChanges(workingData) ||
        isSyncPendingFlag()
      ) {
        const uploaded = await flushPendingUpload(true, workingData, options);
        workingData = dataRef.current;
        if (!uploaded && hasUnsyncedChanges(workingData)) return false;
      }

      setSyncStatus("syncing");
      try {
        const since = workingData.meta?.lastSyncedAt;
        let remoteChanges = await pullSyncChanges(user.id, since);

        if (remoteChanges.length === 0) {
          const entityCount = await countSyncEntities(user.id);
          if (entityCount === 0) {
            const legacy = await fetchLegacyCloudBackup(user.id);
            if (legacy) {
              const picked = pickNewerAppData(
                workingData,
                legacy.data,
                legacy.updated_at,
              );
              workingData = picked.data;
              dataRef.current = workingData;
              skipPush.current = true;
              replaceData(workingData, { fromRemote: true });
              skipPush.current = false;
              await migrateLegacyBackupToEntities(user.id, workingData);
              remoteChanges = appDataToSyncChanges(workingData);
              setSyncMessage(
                "Copia antigua migrada a sincronización por cambios",
              );
            }
          }
        }

        if (remoteChanges.length > 0) {
          const { data: merged, applied } = mergeRemoteOntoLocal(
            workingData,
            remoteChanges,
          );
          workingData = merged;
          dataRef.current = workingData;
          skipPush.current = true;
          replaceData(workingData, { fromRemote: true });
          skipPush.current = false;
          setSyncStatus("synced");
          setSyncMessage(
            applied > 0
              ? `${applied} cambio(s) recibido(s) de la nube`
              : "Ya estabas al día",
          );
        } else if (!since) {
          const initial = appDataToSyncChanges(workingData);
          if (initial.length > 0) {
            const syncedAt = new Date().toISOString();
            await pushSyncChanges(user.id, initial);
            workingData = markChangesSynced(workingData, initial, syncedAt);
            dataRef.current = workingData;
            skipPush.current = true;
            replaceData(workingData, { fromRemote: true });
            skipPush.current = false;
          }
          setSyncStatus("synced");
          setSyncMessage("Copia inicial creada en la nube");
        } else {
          setSyncStatus("synced");
          setSyncMessage("Todo sincronizado");
        }

        if (
          hasPendingSyncChanges(workingData) ||
          hasUnsyncedChanges(workingData) ||
          isSyncPendingFlag()
        ) {
          await flushPendingUpload(true, workingData, options);
          workingData = dataRef.current;
        }

        if (
          !hasPendingSyncChanges(workingData) &&
          !hasUnsyncedChanges(workingData)
        ) {
          finalizeSyncState(workingData);
        }
        return true;
      } catch (error) {
        void reportAppError({
          severity: "error",
          area: "sync",
          code: "pull_failed",
          message:
            error instanceof Error
              ? error.message
              : "Error al descargar de la nube",
          metadata: {
            hasPendingChanges:
              hasPendingSyncChanges(dataRef.current) ||
              hasUnsyncedChanges(dataRef.current),
          },
        });
        setSyncStatus("error");
        setSyncMessage(
          error instanceof Error
            ? error.message
            : "Error al descargar de la nube",
        );
        skipPush.current = false;
        return false;
      }
    },
    [
      demoMode,
      finalizeSyncState,
      flushPendingUpload,
      handoffPausesCloud,
      localDataHandoffStatus,
      replaceData,
      requiresEmailConfirmation,
      user,
    ],
  );

  const pullFromCloudRef = useRef(pullFromCloud);
  pullFromCloudRef.current = pullFromCloud;

  /** Referencia estable: evita bucles si un efecto depende de syncNow tras cada pull. */
  const syncNow = useCallback(async () => {
    await pullFromCloudRef.current();
  }, []);

  const saveLocalDataToAccount = useCallback(async () => {
    if (!user) return;
    if (requiresEmailConfirmation) {
      setSyncStatus("idle");
      setSyncMessage(EMAIL_CONFIRMATION_REQUIRED_MESSAGE);
      return;
    }
    const changes = appDataToSyncChanges(dataRef.current);
    if (changes.length === 0) {
      rememberHandoffDecision(user.id, "synced");
      setLocalDataHandoffStatus("none");
      setSyncMessage("No había datos locales pendientes que guardar.");
      return;
    }

    const queued = {
      ...dataRef.current,
      meta: {
        ...dataRef.current.meta,
        lastModified: new Date().toISOString(),
        pendingChanges: changes,
      },
    };
    dataRef.current = queued;
    skipPush.current = true;
    replaceData(queued, { fromRemote: true });
    skipPush.current = false;
    markSyncPending();

    setLocalDataHandoffStatus("syncing");
    setSyncMessage("Guardando los datos locales en tu cuenta…");
    const ok = await pullFromCloudRef.current({ allowLocalDataUpload: true });
    if (ok) {
      rememberHandoffDecision(user.id, "synced");
      setLocalDataHandoffStatus("none");
      setSyncMessage("Datos de este navegador guardados en tu cuenta.");
    } else {
      setLocalDataHandoffStatus("pending");
    }
  }, [replaceData, requiresEmailConfirmation, user]);

  const keepLocalDataOnDevice = useCallback(() => {
    if (!user) return;
    rememberHandoffDecision(user.id, "keep_local");
    clearSyncPending();
    setLocalDataHandoffStatus("kept_local");
    setSyncStatus("idle");
    setSyncMessage("Tus datos seguirán solo en este navegador.");
  }, [user]);

  const forceDownloadFromCloud = useCallback(async () => {
    if (demoMode) {
      setSyncMessage("Sal de la demo para descargar datos reales de la nube.");
      return;
    }
    if (!user) return;
    if (requiresEmailConfirmation) {
      setSyncStatus("idle");
      setSyncMessage(EMAIL_CONFIRMATION_REQUIRED_MESSAGE);
      return;
    }

    if (syncing.current) {
      setSyncMessage("Ya hay una sincronización en marcha.");
      return;
    }

    const cloudAccess = await canUseCloudForUser(user.id);
    if (!cloudAccess.allowed) {
      setSyncStatus("idle");
      setSyncMessage(cloudAccess.reason ?? "La nube requiere plan Pro.");
      return;
    }

    if (!isBrowserOnline()) {
      setSyncStatus("offline");
      setSyncMessage("Sin conexión. No se puede descargar la nube ahora.");
      return;
    }

    syncing.current = true;
    setSyncStatus("syncing");

    try {
      const remoteChanges = await pullSyncChanges(user.id);

      if (remoteChanges.length > 0) {
        const { data: cloudSnapshot, applied } = mergeRemoteOntoLocal(
          EMPTY_DATA,
          remoteChanges,
        );
        const normalized = normalizeImportedCloudData(cloudSnapshot);
        const synced = markFullySynced(normalized);
        clearSyncPending();
        replaceLocalDataFromCloud(synced);
        rememberHandoffDecision(user.id, "synced");
        setLocalDataHandoffStatus("none");
        setSyncStatus("synced");
        setSyncMessage(
          applied > 0
            ? `Descarga completa: ${applied} elemento(s) traído(s) de la nube`
            : "Descarga completa terminada",
        );
        return;
      }

      const legacy = await fetchLegacyCloudBackup(user.id);
      if (legacy) {
        const synced = markFullySynced(legacy.data, legacy.updated_at);
        clearSyncPending();
        replaceLocalDataFromCloud(synced);
        rememberHandoffDecision(user.id, "synced");
        setLocalDataHandoffStatus("none");
        await migrateLegacyBackupToEntities(user.id, synced);
        setSyncStatus("synced");
        setSyncMessage("Copia antigua descargada y actualizada en la nube");
        return;
      }

      setSyncStatus("synced");
      setSyncMessage("No hay datos guardados en la nube para esta cuenta");
    } catch (error) {
      void reportAppError({
        severity: "error",
        area: "sync",
        code: "force_download_failed",
        message:
          error instanceof Error
            ? error.message
            : "Error al descargar todos los datos de la nube",
      });
      setSyncStatus("error");
      setSyncMessage(
        error instanceof Error
          ? error.message
          : "Error al descargar todos los datos de la nube",
      );
    } finally {
      syncing.current = false;
    }
  }, [demoMode, replaceLocalDataFromCloud, requiresEmailConfirmation, user]);

  const schedulePush = useCallback(() => {
    if (demoMode) return;
    if (handoffPausesCloud) return;
    if (!ready || !user || skipPush.current) return;
    if (!pendingUpload) return;

    markSyncPending();
    updatePendingStatus();

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      void flushPendingUpload(true);
    }, 2000);
  }, [
    demoMode,
    flushPendingUpload,
    handoffPausesCloud,
    pendingUpload,
    ready,
    updatePendingStatus,
    user,
  ]);

  useEffect(() => {
    setOnline(isBrowserOnline());
    function handleOnline() {
      setOnline(true);
      if (demoMode) return;
      if (handoffPausesCloud) return;
      void flushPendingUpload(true);
    }
    function handleOffline() {
      setOnline(false);
      setSyncStatus("offline");
      setSyncMessage("Sin conexión. Los cambios quedan en cola.");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [demoMode, flushPendingUpload, handoffPausesCloud]);

  useEffect(() => {
    if (!cloudEnabled) {
      setAuthReady(true);
      return;
    }
    let unsubscribe: (() => void) | undefined;

    void getSupabaseClientAsync().then((supabase) => {
      if (!supabase) {
        setAuthReady(true);
        return;
      }

      void supabase.auth
        .getUser()
        .then(({ data: authData }) => {
          setUser(authData.user);
          if (authData.user?.email) setEmail(authData.user.email);
        })
        .finally(() => setAuthReady(true));

      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setAuthReady(true);
          setUser(session?.user ?? null);
          if (session?.user?.email) setEmail(session.user.email);
        },
      );
      unsubscribe = () => listener.subscription.unsubscribe();
    });

    return () => unsubscribe?.();
  }, [cloudEnabled]);

  const welcomeUserId = user?.id ?? null;

  useEffect(() => {
    const clearRetryTimer = () => {
      if (!welcomeRetryTimer.current) return;
      clearTimeout(welcomeRetryTimer.current);
      welcomeRetryTimer.current = null;
    };

    if (!welcomeUserId || !cloudEnabled || demoMode || !emailConfirmed) {
      clearRetryTimer();
      welcomeRequestedForUser.current = null;
      welcomeRetryAttempts.current = 0;
      if (!welcomeUserId) welcomeRetryUser.current = null;
      return;
    }

    if (welcomeRetryUser.current !== welcomeUserId) {
      clearRetryTimer();
      welcomeRetryUser.current = welcomeUserId;
      welcomeRetryAttempts.current = 0;
      welcomeRequestedForUser.current = null;
    }
    if (welcomeRequestedForUser.current === welcomeUserId) return;

    let cancelled = false;
    welcomeRequestedForUser.current = welcomeUserId;

    const scheduleRetry = (retryAfter?: string | null) => {
      if (
        cancelled ||
        welcomeRetryAttempts.current >= WELCOME_MAX_CLIENT_RETRIES
      ) {
        return;
      }

      const retryIndex = welcomeRetryAttempts.current;
      welcomeRetryAttempts.current += 1;
      clearRetryTimer();
      welcomeRetryTimer.current = setTimeout(() => {
        welcomeRetryTimer.current = null;
        if (welcomeRetryUser.current !== welcomeUserId) return;
        welcomeRequestedForUser.current = null;
        setWelcomeRetryRevision((revision) => revision + 1);
      }, welcomeRetryDelayMs({ retryIndex, retryAfter }));
    };

    void getSupabaseClientAsync()
      .then(async (supabase) => {
        if (!supabase) {
          scheduleRetry();
          return;
        }
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        const session = sessionData.session;
        if (
          sessionError ||
          !session?.access_token ||
          session.user.id !== welcomeUserId
        ) {
          scheduleRetry();
          return;
        }

        const response = await fetch("/api/email/welcome", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (cancelled || welcomeRetryUser.current !== welcomeUserId) return;
        if (response.ok) {
          welcomeRetryAttempts.current = 0;
          return;
        }
        if (isRetryableWelcomeStatus(response.status)) {
          scheduleRetry(response.headers.get("Retry-After"));
        }
      })
      .catch(() => scheduleRetry());

    return () => {
      cancelled = true;
      clearRetryTimer();
    };
  }, [
    cloudEnabled,
    demoMode,
    emailConfirmed,
    welcomeRetryRevision,
    welcomeUserId,
  ]);

  useEffect(() => {
    schedulePush();
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [schedulePush]);

  useEffect(() => {
    if (demoMode || !ready || !user) {
      if (!user) setLocalDataHandoffStatus("none");
      return;
    }
    if (requiresEmailConfirmation) {
      setLocalDataHandoffStatus("none");
      setSyncStatus("idle");
      setSyncMessage(EMAIL_CONFIRMATION_REQUIRED_MESSAGE);
      return;
    }
    if (localDataHandoffStatus === "syncing") return;

    const decision = readHandoffDecision(user.id);
    if (decision === "synced") {
      setLocalDataHandoffStatus("none");
      return;
    }
    if (decision === "keep_local") {
      setLocalDataHandoffStatus("kept_local");
      return;
    }
    if (
      hasWorkspaceContent(dataRef.current) &&
      !dataRef.current.meta?.lastSyncedAt
    ) {
      setLocalDataHandoffStatus("pending");
      setSyncStatus("idle");
      setSyncMessage("Elige qué hacer con los datos de este navegador.");
      return;
    }
    setLocalDataHandoffStatus("none");
  }, [
    data,
    demoMode,
    localDataHandoffStatus,
    ready,
    requiresEmailConfirmation,
    user,
  ]);

  useEffect(() => {
    if (!demoMode || !ready || !user) return;
    setDemoWorkspaceMode(false);
    replaceLocalDataFromCloud(loadData());
    setSyncMessage(
      "Demo cerrada al iniciar sesión. Ya estás en tu espacio real.",
    );
  }, [demoMode, ready, replaceLocalDataFromCloud, user]);

  useEffect(() => {
    if (demoMode || !ready || !user) return;
    if (handoffPausesCloud || localDataHandoffStatus === "syncing") return;
    if (pulledForUser.current === user.id) return;
    pulledForUser.current = user.id;
    void pullFromCloud();
  }, [
    demoMode,
    handoffPausesCloud,
    localDataHandoffStatus,
    pullFromCloud,
    ready,
    user,
  ]);

  useEffect(() => {
    if (!user) pulledForUser.current = null;
  }, [user]);

  useEffect(() => {
    if (demoMode || handoffPausesCloud || !cloudEnabled || !user) return;

    function handleVisible() {
      if (document.visibilityState === "visible" && isBrowserOnline()) {
        void flushPendingUpload(true).then(() => {
          if (!hasPendingSyncChanges(data)) void pullFromCloud();
        });
      }
    }

    document.addEventListener("visibilitychange", handleVisible);
    return () =>
      document.removeEventListener("visibilitychange", handleVisible);
  }, [
    cloudEnabled,
    data,
    demoMode,
    flushPendingUpload,
    handoffPausesCloud,
    pullFromCloud,
    user,
  ]);

  useEffect(() => {
    if (demoMode || handoffPausesCloud || !cloudEnabled || !user) return;

    const pullTimer = setInterval(() => {
      if (document.visibilityState !== "visible" || !isBrowserOnline()) return;
      if (syncing.current) return;
      void pullFromCloud();
    }, PULL_INTERVAL_MS);

    return () => clearInterval(pullTimer);
  }, [cloudEnabled, demoMode, handoffPausesCloud, pullFromCloud, user]);

  useEffect(() => {
    if (demoMode || handoffPausesCloud || !user || !pendingUpload || !online)
      return;

    if (retryTimer.current) clearInterval(retryTimer.current);
    retryTimer.current = setInterval(() => {
      void flushPendingUpload(true);
    }, RETRY_MS);

    return () => {
      if (retryTimer.current) clearInterval(retryTimer.current);
    };
  }, [
    demoMode,
    flushPendingUpload,
    handoffPausesCloud,
    online,
    pendingUpload,
    user,
  ]);

  useEffect(() => {
    updatePendingStatus();
  }, [updatePendingStatus, pendingUpload, online, pendingChangeCount]);

  const signUp = useCallback(
    async (
      password: string,
      captchaToken?: string,
    ): Promise<SignUpResult> => {
      const supabase = await getSupabaseClientAsync();
      if (!supabase) {
        return {
          ok: false,
          error: "La nube no está configurada en este servidor",
        };
      }
      if (!email.trim()) {
        return { ok: false, error: "Introduce tu email" };
      }
      const passwordError = validateNewAccountPassword(password);
      if (passwordError) return { ok: false, error: passwordError };

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthCallbackUrl(),
          ...(captchaToken ? { captchaToken } : {}),
        },
      });
      if (error) return { ok: false, error: error.message };

      const registeredEmail = data.user?.email ?? email.trim();
      const needsEmailConfirmation = Boolean(data.user && !data.session);

      if (data.session?.user) {
        setUser(data.session.user);
        setSyncMessage("Cuenta creada e iniciada");
      } else {
        setSyncMessage(
          needsEmailConfirmation
            ? "Cuenta creada. Confirma el email y luego inicia sesión."
            : "Cuenta creada. Ya puedes iniciar sesión.",
        );
      }

      return {
        ok: true,
        email: registeredEmail,
        needsEmailConfirmation,
      };
    },
    [email],
  );

  const signIn = useCallback(
    async (password: string, captchaToken?: string) => {
      const supabase = await getSupabaseClientAsync();
      if (!supabase) return "La nube no está configurada en este servidor";
      if (!email.trim()) return "Introduce tu email";

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        ...(captchaToken ? { options: { captchaToken } } : {}),
      });
      if (error) return error.message;

      pulledForUser.current = null;
      setSyncMessage("Sesión iniciada.");
      return null;
    },
    [email],
  );

  const requestPasswordReset = useCallback(
    async (captchaToken?: string) => {
      const supabase = await getSupabaseClientAsync();
      if (!supabase) return "La nube no está configurada en este servidor";
      if (!email.trim()) return "Introduce tu email";

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: getPasswordRecoveryCallbackUrl(),
          ...(captchaToken ? { captchaToken } : {}),
        },
      );
      if (error) return error.message;

      return null;
    },
    [email],
  );

  const updatePassword = useCallback(async (password: string) => {
    const supabase = await getSupabaseClientAsync();
    if (!supabase) return "La nube no está configurada en este servidor";
    const passwordError = validateNewAccountPassword(password);
    if (passwordError) return passwordError;

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return error.message;

    setSyncMessage("Contraseña actualizada.");
    return null;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const supabase = await getSupabaseClientAsync();
    if (!supabase) return "La nube no está configurada en este servidor";
    if (!isGoogleAuthEnabled()) {
      return "El acceso con Google aún no está activado.";
    }
    const googleClientId = getGoogleAuthClientId();
    if (!googleClientId) {
      return "Falta configurar el identificador público de Google.";
    }

    setSyncMessage("Abriendo Google para iniciar sesión…");
    try {
      await startGoogleLoginRedirect(googleClientId);
      return null;
    } catch (error) {
      return friendlyGoogleLoginError(error);
    }
  }, []);

  const resendConfirmationEmail = useCallback(async () => {
    const supabase = await getSupabaseClientAsync();
    if (!supabase) return "La nube no está configurada en este servidor";
    if (!email.trim()) return "Introduce tu email";

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: getAuthCallbackUrl() },
    });
    if (error) return error.message;

    return null;
  }, [email]);

  const signOut = useCallback(async () => {
    const supabase = await getSupabaseClientAsync();
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
    }
    if (pushTimer.current) clearTimeout(pushTimer.current);
    if (retryTimer.current) clearInterval(retryTimer.current);
    pushTimer.current = null;
    retryTimer.current = null;
    pulledForUser.current = null;
    syncing.current = false;
    setUser(null);
    setSyncMessage("Sesión cerrada");
    setSyncStatus(cloudEnabled ? "idle" : "disabled");
  }, [cloudEnabled]);

  const importBackup = useCallback(
    async (file: File) => {
      if (demoMode) {
        return "Sal de la demo para importar una copia real.";
      }
      const parsed = await readBackupFile(file);
      if ("error" in parsed) return parsed.error;

      const confirmed = confirm(
        "¿Importar esta copia? Se sustituirán los datos de este dispositivo.",
      );
      if (!confirmed) return null;

      const withQueue = {
        ...parsed,
        meta: {
          ...parsed.meta,
          lastModified: new Date().toISOString(),
          pendingChanges: appDataToSyncChanges(parsed),
        },
      };
      skipPush.current = true;
      dataRef.current = withQueue;
      replaceData(withQueue, { fromRemote: true });
      skipPush.current = false;
      markSyncPending();

      if (user && emailConfirmed) await pushToCloud(withQueue, false);
      setSyncMessage("Copia importada correctamente");
      return null;
    },
    [demoMode, emailConfirmed, pushToCloud, replaceData, user],
  );

  const value = useMemo(
    () => ({
      cloudEnabled,
      authReady,
      user,
      emailConfirmed,
      requiresEmailConfirmation,
      email,
      syncStatus,
      syncMessage,
      pendingUpload,
      pendingChangeCount,
      localDataHandoffStatus,
      setEmail,
      signUp,
      signIn,
      requestPasswordReset,
      updatePassword,
      signInWithGoogle,
      resendConfirmationEmail,
      signOut,
      syncNow,
      saveLocalDataToAccount,
      keepLocalDataOnDevice,
      forceDownloadFromCloud,
      exportBackup: () => downloadBackup(data),
      importBackup,
    }),
    [
      cloudEnabled,
      user,
      emailConfirmed,
      requiresEmailConfirmation,
      email,
      syncStatus,
      syncMessage,
      pendingUpload,
      pendingChangeCount,
      localDataHandoffStatus,
      signUp,
      signIn,
      requestPasswordReset,
      updatePassword,
      signInWithGoogle,
      resendConfirmationEmail,
      signOut,
      syncNow,
      saveLocalDataToAccount,
      keepLocalDataOnDevice,
      forceDownloadFromCloud,
      data,
      authReady,
      importBackup,
    ],
  );

  return (
    <CloudSyncContext.Provider value={value}>
      {children}
    </CloudSyncContext.Provider>
  );
}

export function useCloudSync(): CloudSyncValue {
  const ctx = useContext(CloudSyncContext);
  if (!ctx) {
    throw new Error("useCloudSync debe usarse dentro de CloudSyncProvider");
  }
  return ctx;
}
