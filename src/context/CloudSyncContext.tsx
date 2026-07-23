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
import { appDataToSyncChanges } from "@/lib/cloud/diff";
import {
  hasPendingSyncChanges,
  markChangesSynced,
  markFullySynced,
  mergeRemoteOntoLocal,
  rebuildCloudSnapshot,
} from "@/lib/cloud/incremental";
import {
  countSyncEntities,
  fetchLegacyCloudBackup,
  hasRemoteSyncChangesAfter,
  migrateLegacyBackupToEntities,
  pullSyncChanges,
  pushSyncChanges,
} from "@/lib/cloud/repository";
import {
  buildCloudReplacementChanges,
  clearSyncPending,
  buildCloudUploadPlan,
  hasUnsyncedChanges,
  isBrowserOnline,
  isSyncPendingFlag,
  markSyncPending,
} from "@/lib/cloud/sync-queue";
import {
  CLOUD_SNAPSHOT_INCOMPLETE_SYNC_ISSUE,
  classifyCloudSyncReviewIssue,
  type CloudSyncReviewIssue,
} from "@/lib/cloud/sync-errors";
import {
  clearCloudSyncReviewIssue,
  readCloudSyncReviewIssue,
  rememberCloudSyncReviewIssue,
  resolveCloudSyncReviewFromPersistedSnapshot,
  subscribeCloudSyncReviewIssue,
} from "@/lib/cloud/sync-review-storage";
import {
  advanceCloudAuthIdentity,
  captureCloudAuthOperation,
  isCloudAuthOperationCurrent,
  type CloudAuthOperationToken,
  type CloudAuthIdentity,
} from "@/lib/cloud/auth-operation-guard";
import {
  advanceCloudSyncReviewGeneration,
  captureCloudSyncReviewOperation,
  isCloudSyncReviewOperationCurrent,
  runCloudSyncReviewMutation,
  type CloudSyncReviewGeneration,
  type CloudSyncReviewOperationToken,
} from "@/lib/cloud/sync-review-operation-guard";
import { runExclusiveSyncOperation } from "@/lib/cloud/sync-operation";
import { runCloudDeviceRepair } from "@/lib/cloud/device-repair";
import {
  buildCloudRepairPreviewPlan,
  cloudRepairPreviewAllowsConfirmation,
  cloudRepairSnapshotFingerprint,
  newestCloudChangeTimestamp,
  type CloudRepairConfirmation,
  type CloudRepairPreview,
  type CloudRepairPreviewPlan,
} from "@/lib/cloud/device-repair-preview";
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
  registerCurrentCloudDevice,
  releaseCurrentCloudDeviceSession,
  retireCurrentCloudDevice,
} from "@/lib/cloud/device-client";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { isCloudEnabled, isGoogleAuthEnabled } from "@/lib/supabase/config";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import {
  EMAIL_CONFIRMATION_REQUIRED_MESSAGE,
  isUserEmailConfirmed,
} from "@/lib/auth/email-confirmation";
import { validateNewAccountPassword } from "@/lib/auth/password-policy";
import { setDemoWorkspaceMode } from "@/lib/demo-workspace";
import {
  clearPersistedAppData,
  loadData,
  readPersistedDataSnapshot,
} from "@/lib/storage";
import { EMPTY_DATA, type AppData } from "@/lib/types";
import { pickNewerAppData } from "@/lib/cloud/sync";
import { hasWorkspaceContent } from "@/lib/workspace-state";
import {
  reportAppError,
  reportAppRecovery,
} from "@/lib/monitoring/client";
import {
  appDataRecordCount,
  dispatchDataAccessEvent,
} from "@/lib/security/data-access-events";
import { clearSecondaryDeviceData } from "@/lib/security/device-data-clear";
import {
  downloadProtectedBackup,
  readProtectedBackupFile,
} from "@/lib/security/protected-backup";
import {
  isRetryableWelcomeStatus,
  WELCOME_MAX_CLIENT_RETRIES,
  welcomeRetryDelayMs,
} from "@/lib/email/welcome-client-retry";
import { fiscalNotificationsOwnerScopeForUserIdV1 } from "@/lib/fiscal-notifications/workspace-persistence.v1";

export type SyncStatus =
  "disabled" | "offline" | "idle" | "pending" | "syncing" | "synced" | "error";

export type SignUpResult =
  | { ok: true; email: string; needsEmailConfirmation: boolean }
  | { ok: false; error: string };

export type LocalDataHandoffStatus =
  "none" | "pending" | "kept_local" | "syncing";

type CloudWriteFreshnessStatus = "fresh" | "needs_pull" | "stale";

interface CloudSyncValue {
  cloudEnabled: boolean;
  authReady: boolean;
  user: User | null;
  emailConfirmed: boolean;
  requiresEmailConfirmation: boolean;
  email: string;
  syncStatus: SyncStatus;
  syncMessage: string | null;
  syncIssue: CloudSyncReviewIssue | null;
  cloudRepairPreview: CloudRepairPreview | null;
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
  saveLocalDataToAccount: () => Promise<void>;
  keepLocalDataOnDevice: () => void;
  pauseCloudForLocalRestore: () => boolean;
  prepareCloudRepairPreview: () => Promise<void>;
  cancelCloudRepairPreview: () => void;
  forceDownloadFromCloud: (
    confirmation: CloudRepairConfirmation,
  ) => Promise<void>;
  exportBackup: () => Promise<void>;
  importBackup: (file: File) => Promise<string | null>;
}

const CloudSyncContext = createContext<CloudSyncValue | null>(null);

const RETRY_MS = 30_000;
const PULL_INTERVAL_MS = 45_000;
const LOCAL_DATA_HANDOFF_PREFIX = "factura-autonomo-local-data-handoff";

type LocalDataHandoffDecision = "synced" | "keep_local";

interface CloudRepairRemoteDetails {
  source: "entities" | "legacy";
  recordedAt: string | null;
  fingerprint: string;
}

interface CloudRepairRemoteSnapshot {
  data: AppData;
  details: CloudRepairRemoteDetails;
}

interface ActiveCloudRepairPreview {
  userId: string;
  preview: CloudRepairPreview;
  localFingerprint: string;
  cloudFingerprint: string;
  authOperation: CloudAuthOperationToken;
  reviewOperation: CloudSyncReviewOperationToken;
}

async function loadCloudRepairRemoteSnapshot(
  userId: string,
): Promise<CloudRepairRemoteSnapshot | null> {
  const remoteChanges = await pullSyncChanges(userId);
  if (remoteChanges.length > 0) {
    dispatchDataAccessEvent({
      type: "cloud_pull",
      itemCount: remoteChanges.length,
    });
    const recordedAt = newestCloudChangeTimestamp(remoteChanges);
    const { data: normalized } = rebuildCloudSnapshot(remoteChanges);
    const data = recordedAt
      ? markFullySynced(normalized, recordedAt)
      : markFullySynced(normalized);
    return {
      data,
      details: {
        source: "entities",
        recordedAt,
        fingerprint: cloudRepairSnapshotFingerprint(data),
      },
    };
  }

  const legacy = await fetchLegacyCloudBackup(userId);
  if (!legacy) return null;
  dispatchDataAccessEvent({
    type: "cloud_pull",
    itemCount: appDataRecordCount(legacy.data),
  });
  const data = markFullySynced(legacy.data, legacy.updated_at);
  return {
    data,
    details: {
      source: "legacy",
      recordedAt: legacy.updated_at,
      fingerprint: cloudRepairSnapshotFingerprint(data),
    },
  };
}

function snapshotMatchesCloudRepairFingerprint(
  data: AppData | null,
  expectedFingerprint: string,
): boolean {
  if (!data) return false;
  try {
    return cloudRepairSnapshotFingerprint(data) === expectedFingerprint;
  } catch {
    return false;
  }
}

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
  const {
    data,
    ready,
    replaceData,
    getCurrentData,
    replaceCloudSnapshotDurably,
    adoptPersistedCloudSnapshot,
    setExternalWriteBlock,
    clearExternalWriteBlock,
  } = useAppStore();
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
  const [syncIssue, setSyncIssue] = useState<CloudSyncReviewIssue | null>(null);
  const [cloudRepairPreview, setCloudRepairPreview] =
    useState<CloudRepairPreview | null>(null);
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
  const automaticCloudPaused = useRef(false);
  const syncIssueRef = useRef<CloudSyncReviewIssue | null>(null);
  const syncReviewGenerationRef = useRef<CloudSyncReviewGeneration>({
    userId: null,
    generation: 0,
  });
  const authIdentityRef = useRef<CloudAuthIdentity>({
    userId: null,
    generation: 0,
  });
  const cloudRepairPreviewRef = useRef<ActiveCloudRepairPreview | null>(null);
  const dataRef = useRef(data);

  const setAuthUser = useCallback((nextUser: User | null) => {
    cloudRepairPreviewRef.current = null;
    setCloudRepairPreview(null);
    authIdentityRef.current = advanceCloudAuthIdentity(
      authIdentityRef.current,
      nextUser?.id ?? null,
    );
    setUser(nextUser);
  }, []);

  const invalidateCloudAuthOperations = useCallback(() => {
    cloudRepairPreviewRef.current = null;
    setCloudRepairPreview(null);
    authIdentityRef.current = advanceCloudAuthIdentity(
      authIdentityRef.current,
      authIdentityRef.current.userId,
    );
  }, []);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const setCloudSyncPreflightWriteBlock = useCallback(
    (message = "Comprobando que este dispositivo está al día con la nube antes de permitir cambios…") => {
      setExternalWriteBlock({
        source: "cloud_sync_preflight",
        message,
        recoveryHref: "/cuenta",
        recoveryLabel: "Abrir Cuenta",
      });
    },
    [setExternalWriteBlock],
  );

  const clearCloudSyncPreflightWriteBlock = useCallback(() => {
    clearExternalWriteBlock("cloud_sync_preflight");
  }, [clearExternalWriteBlock]);

  useEffect(() => {
    if (!syncIssue) {
      clearExternalWriteBlock("cloud_sync_review");
      return;
    }

    setExternalWriteBlock({
      source: "cloud_sync_review",
      message: `${syncIssue.userMessage} Este dispositivo queda en modo solo lectura hasta revisar la sincronización; no se pueden crear, editar ni borrar datos de negocio.`,
      recoveryHref: "/cuenta",
      recoveryLabel: "Abrir Cuenta",
    });
  }, [clearExternalWriteBlock, setExternalWriteBlock, syncIssue]);

  useEffect(() => {
    automaticCloudPaused.current = Boolean(
      user && readHandoffDecision(user.id) === "keep_local",
    );
  }, [user]);

  const activeUserId = user?.id ?? null;

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

  const checkCloudWriteFreshness = useCallback(
    async (payload: AppData): Promise<CloudWriteFreshnessStatus> => {
      if (demoMode) return "fresh";
      if (!user || !cloudEnabled) return "fresh";
      if (requiresEmailConfirmation || handoffPausesCloud) return "fresh";

      const lastSyncedAt = payload.meta?.lastSyncedAt ?? null;
      const hasRemoteChanges = await hasRemoteSyncChangesAfter(
        user.id,
        lastSyncedAt,
      );
      if (!hasRemoteChanges) return "fresh";

      if (!lastSyncedAt && !hasWorkspaceContent(payload)) {
        return "needs_pull";
      }
      return "stale";
    },
    [
      cloudEnabled,
      demoMode,
      handoffPausesCloud,
      requiresEmailConfirmation,
      user,
    ],
  );

  const stopPendingCloudTimers = useCallback(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    if (retryTimer.current) clearInterval(retryTimer.current);
    pushTimer.current = null;
    retryTimer.current = null;
  }, []);

  const invalidateSyncReviewOperations = useCallback(
    (userId: string | null) => {
      syncReviewGenerationRef.current = advanceCloudSyncReviewGeneration(
        syncReviewGenerationRef.current,
        userId,
      );
    },
    [],
  );

  const applyCloudSyncReviewIssue = useCallback(
    (issue: CloudSyncReviewIssue) => {
      cloudRepairPreviewRef.current = null;
      setCloudRepairPreview(null);
      invalidateSyncReviewOperations(activeUserId);
      syncIssueRef.current = issue;
      setSyncIssue(issue);
      stopPendingCloudTimers();
      setSyncStatus("error");
      setSyncMessage(issue.userMessage);
    },
    [activeUserId, invalidateSyncReviewOperations, stopPendingCloudTimers],
  );

  const activateCloudSyncReviewIssue = useCallback(
    (issue: CloudSyncReviewIssue) => {
      applyCloudSyncReviewIssue(issue);
      if (activeUserId) rememberCloudSyncReviewIssue(activeUserId, issue);
    },
    [activeUserId, applyCloudSyncReviewIssue],
  );

  const enforceFreshCloudBeforeWrites = useCallback(
    async (payload: AppData): Promise<boolean> => {
      try {
        const freshness = await checkCloudWriteFreshness(payload);
        if (freshness === "fresh") {
          clearCloudSyncPreflightWriteBlock();
          return true;
        }
        if (freshness === "needs_pull") {
          setCloudSyncPreflightWriteBlock(
            "Descargando la copia activa de la nube antes de permitir cambios en este dispositivo…",
          );
          setSyncStatus("syncing");
          setSyncMessage(
            "Hay datos en la nube pendientes de descargar. Espera a que termine la sincronización inicial.",
          );
          return false;
        }

        activateCloudSyncReviewIssue(CLOUD_SNAPSHOT_INCOMPLETE_SYNC_ISSUE);
        return false;
      } catch (error) {
        setCloudSyncPreflightWriteBlock(
          isBrowserOnline()
            ? "No se pudo confirmar si este dispositivo está al día con la nube. Los cambios quedan pausados para evitar pisar datos."
            : "Sin conexión. No se puede confirmar la copia activa de la nube; los cambios quedan pausados.",
        );
        setSyncStatus(isBrowserOnline() ? "error" : "offline");
        setSyncMessage(
          error instanceof Error
            ? error.message
            : "No se pudo comprobar la nube antes de escribir.",
        );
        return false;
      }
    },
    [
      activateCloudSyncReviewIssue,
      checkCloudWriteFreshness,
      clearCloudSyncPreflightWriteBlock,
      setCloudSyncPreflightWriteBlock,
    ],
  );

  const clearActiveCloudSyncReviewIssue = useCallback(() => {
    cloudRepairPreviewRef.current = null;
    setCloudRepairPreview(null);
    invalidateSyncReviewOperations(activeUserId);
    if (activeUserId) clearCloudSyncReviewIssue(activeUserId);
    syncIssueRef.current = null;
    setSyncIssue(null);
  }, [activeUserId, invalidateSyncReviewOperations]);

  const updatePendingStatus = useCallback(() => {
    if (demoMode) {
      setSyncStatus("idle");
      setSyncMessage("Modo demo: los datos ficticios no se suben a la nube.");
      return;
    }
    if (!user || !cloudEnabled) return;
    if (syncIssueRef.current?.automaticRetryBlocked) {
      setSyncStatus("error");
      setSyncMessage(syncIssueRef.current.userMessage);
      return;
    }
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
    if (syncStatus === "error") return;
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
    } else if (syncStatus !== "syncing") {
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
        try {
          replaceData(synced, { fromRemote: true });
        } finally {
          skipPush.current = false;
        }
        clearCloudSyncPreflightWriteBlock();
      }
    },
    [clearCloudSyncPreflightWriteBlock, replaceData],
  );

  const replaceLocalDataFromCloud = useCallback(
    (payload: typeof data) => {
      skipPush.current = true;
      try {
        replaceData(payload, { fromRemote: true });
      } finally {
        skipPush.current = false;
      }
      if (getCurrentData() !== payload) return false;
      dataRef.current = payload;
      return true;
    },
    [getCurrentData, replaceData],
  );

  useEffect(() => {
    if (!activeUserId) {
      invalidateSyncReviewOperations(null);
      syncIssueRef.current = null;
      setSyncIssue(null);
      return;
    }

    invalidateSyncReviewOperations(activeUserId);

    const persistedIssue = readCloudSyncReviewIssue(activeUserId);
    if (persistedIssue) {
      applyCloudSyncReviewIssue(persistedIssue);
    } else if (syncIssueRef.current) {
      syncIssueRef.current = null;
      setSyncIssue(null);
      setSyncStatus("idle");
      setSyncMessage(null);
    }

    return subscribeCloudSyncReviewIssue(activeUserId, (nextIssue) => {
      if (nextIssue) {
        applyCloudSyncReviewIssue(nextIssue);
        return;
      }
      if (!syncIssueRef.current) return;

      const unresolvedIssue = syncIssueRef.current;
      invalidateSyncReviewOperations(activeUserId);
      const expectedCurrent = getCurrentData();
      const repaired = readPersistedDataSnapshot();
      const resolved = resolveCloudSyncReviewFromPersistedSnapshot({
        snapshot: repaired,
        hasPendingFlag: isSyncPendingFlag(),
        adopt: (snapshot) =>
          adoptPersistedCloudSnapshot(snapshot, expectedCurrent),
        commitResolution: () => {
          syncIssueRef.current = null;
          setSyncIssue(null);
          automaticCloudPaused.current =
            readHandoffDecision(activeUserId) === "keep_local";
          setSyncStatus("synced");
          setSyncMessage(
            "Conflicto resuelto desde otra pestaña con la copia verificada de la nube.",
          );
        },
      });
      if (!resolved) {
        applyCloudSyncReviewIssue(unresolvedIssue);
        rememberCloudSyncReviewIssue(activeUserId, unresolvedIssue);
        setSyncMessage(
          "La otra pestaña no dejó un snapshot sincronizado verificable. El conflicto sigue en pausa.",
        );
        return;
      }
    });
  }, [
    activeUserId,
    adoptPersistedCloudSnapshot,
    applyCloudSyncReviewIssue,
    getCurrentData,
    invalidateSyncReviewOperations,
  ]);

  const ensureCloudReadyForCurrentDevice = useCallback(async () => {
    if (!user) return false;
    const authOperation = captureCloudAuthOperation(authIdentityRef.current);
    if (!authOperation || authOperation.userId !== user.id) return false;
    const authOperationIsCurrent = () =>
      isCloudAuthOperationCurrent(authIdentityRef.current, authOperation);

    const cloudAccess = await canUseCloudForUser(user.id);
    if (!authOperationIsCurrent()) return false;
    if (!cloudAccess.allowed) {
      setSyncStatus("idle");
      setSyncMessage(
        cloudAccess.reason ?? "La nube requiere un plan con sincronizacion.",
      );
      return false;
    }

    try {
      const deviceAccess = await registerCurrentCloudDevice();
      if (!authOperationIsCurrent()) return false;
      if (deviceAccess.allowed === false || deviceAccess.error) {
        setSyncStatus(
          deviceAccess.reason === "device_session_conflict" ? "error" : "idle",
        );
        setSyncMessage(
          deviceAccess.message ??
            deviceAccess.error ??
            "Este dispositivo no puede sincronizar con la nube.",
        );
        return false;
      }
      return true;
    } catch (error) {
      if (!authOperationIsCurrent()) return false;
      setSyncStatus("error");
      setSyncMessage(
        error instanceof Error
          ? error.message
          : "No se pudo verificar este dispositivo.",
      );
      return false;
    }
  }, [user]);

  const rememberSuccessfulDeviceSync = useCallback(() => {
    void registerCurrentCloudDevice({ markSynced: true }).catch(
      () => undefined,
    );
  }, []);

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
      const authOperation = captureCloudAuthOperation(authIdentityRef.current);
      if (!authOperation || authOperation.userId !== user.id) return false;
      const authOperationIsCurrent = () =>
        isCloudAuthOperationCurrent(authIdentityRef.current, authOperation);
      if (requiresEmailConfirmation) {
        setSyncStatus("idle");
        setSyncMessage(EMAIL_CONFIRMATION_REQUIRED_MESSAGE);
        return false;
      }
      if (
        (automaticCloudPaused.current || handoffPausesCloud) &&
        !options?.allowLocalDataUpload
      ) {
        setSyncStatus("idle");
        setSyncMessage(
          localDataHandoffStatus === "kept_local"
            ? "Tus datos siguen solo en este navegador. Puedes guardarlos en tu cuenta desde Cuenta."
            : "Elige primero qué hacer con los datos locales.",
        );
        return false;
      }
      if (syncIssueRef.current?.automaticRetryBlocked) {
        setSyncStatus("error");
        setSyncMessage(syncIssueRef.current.userMessage);
        return false;
      }
      if (!(await enforceFreshCloudBeforeWrites(payload))) return false;
      const reviewOperation = captureCloudSyncReviewOperation(
        syncReviewGenerationRef.current,
      );
      if (!reviewOperation || reviewOperation.userId !== user.id) return false;
      const reviewOperationIsCurrent = () =>
        isCloudSyncReviewOperationCurrent(
          syncReviewGenerationRef.current,
          reviewOperation,
        );
      const runReviewMutation = (mutation: () => void) =>
        runCloudSyncReviewMutation(
          syncReviewGenerationRef.current,
          reviewOperation,
          mutation,
        );

      if (!(await ensureCloudReadyForCurrentDevice())) return false;
      if (!authOperationIsCurrent()) return false;
      if (
        !reviewOperationIsCurrent() ||
        syncIssueRef.current?.automaticRetryBlocked
      ) {
        return false;
      }

      if (!isBrowserOnline()) {
        markSyncPending();
        setSyncStatus("offline");
        setSyncMessage("Sin conexión. En cola para subir.");
        return false;
      }

      const uploadPlan = buildCloudUploadPlan(payload);
      const { changes } = uploadPlan;
      if (changes.length === 0) {
        clearSyncPending();
        setSyncStatus("synced");
        return true;
      }

      if (!silent) setSyncStatus("syncing");
      try {
        const syncedAt = await pushSyncChanges(authOperation.userId, changes);
        if (!authOperationIsCurrent()) {
          markSyncPending();
          return false;
        }
        if (!reviewOperationIsCurrent()) return false;
        if (syncIssueRef.current?.automaticRetryBlocked) {
          markSyncPending();
          setSyncStatus("error");
          setSyncMessage(syncIssueRef.current.userMessage);
          return false;
        }
        const synced = markChangesSynced(payload, changes, syncedAt);
        if (
          !runReviewMutation(() => {
            dataRef.current = synced;
            skipPush.current = true;
            try {
              replaceData(synced, { fromRemote: true });
            } finally {
              skipPush.current = false;
            }
            clearSyncPending();
            clearCloudSyncPreflightWriteBlock();
            setSyncStatus("synced");
            rememberSuccessfulDeviceSync();
            setSyncMessage(
              silent
                ? null
                : `${changes.length} cambio(s) sincronizado(s) con la nube`,
            );
          })
        ) {
          return false;
        }
        void reportAppRecovery(authOperation.userId, "sync_push_verified");
        return true;
      } catch (error) {
        if (!reviewOperationIsCurrent()) return false;
        markSyncPending();
        if (!authOperationIsCurrent()) return false;
        const reviewIssue = classifyCloudSyncReviewIssue(error);
        void reportAppError({
          severity: "error",
          area: "sync",
          code: reviewIssue?.code ?? "push_failed",
          message: reviewIssue
            ? "La sincronizacion requiere revision antes de continuar"
            : error instanceof Error
              ? error.message
              : "Error al subir cambios a la nube",
          metadata: {
            queueDepth: uploadPlan.queueDepth,
            uploadChangeCount: uploadPlan.uploadChangeCount,
            uploadMode: uploadPlan.uploadMode,
            containsFiscalWorkspace: uploadPlan.containsFiscalWorkspace,
            entityTypeCounts: uploadPlan.entityTypeCounts,
            lastModifiedAfterLastSynced: uploadPlan.lastModifiedAfterLastSynced,
          },
        });
        if (reviewIssue) {
          activateCloudSyncReviewIssue(reviewIssue);
          return false;
        }
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
      activateCloudSyncReviewIssue,
      clearCloudSyncPreflightWriteBlock,
      data,
      demoMode,
      enforceFreshCloudBeforeWrites,
      ensureCloudReadyForCurrentDevice,
      handoffPausesCloud,
      localDataHandoffStatus,
      rememberSuccessfulDeviceSync,
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
      if (
        (automaticCloudPaused.current || handoffPausesCloud) &&
        !options?.allowLocalDataUpload
      ) {
        return false;
      }
      if (syncIssueRef.current?.automaticRetryBlocked) return false;
      if (!hasPendingSyncChanges(payload) && !hasUnsyncedChanges(payload)) {
        clearSyncPending();
        setSyncStatus("synced");
        return true;
      }
      const result = await runExclusiveSyncOperation(syncing, async () => {
        try {
          return await pushToCloud(payload, silent, options);
        } catch (error) {
          markSyncPending();
          const reviewIssue = classifyCloudSyncReviewIssue(error);
          void reportAppError({
            severity: "error",
            area: "sync",
            code: reviewIssue?.code ?? "push_preflight_failed",
            message: reviewIssue
              ? "La sincronizacion requiere revision antes de continuar"
              : error instanceof Error
                ? error.message
                : "Error al preparar la subida a la nube",
            metadata: {
              pendingChanges: payload.meta?.pendingChanges?.length ?? 0,
            },
          });
          if (reviewIssue) {
            activateCloudSyncReviewIssue(reviewIssue);
            return false;
          }
          setSyncStatus(isBrowserOnline() ? "error" : "offline");
          setSyncMessage(
            isBrowserOnline()
              ? error instanceof Error
                ? error.message
                : "No se pudo preparar la sincronización. Vuelve a intentarlo."
              : "Sin conexión. En cola para subir.",
          );
          return false;
        }
      });
      return result.started ? result.value : false;
    },
    [
      activateCloudSyncReviewIssue,
      demoMode,
      handoffPausesCloud,
      pushToCloud,
      requiresEmailConfirmation,
      user,
    ],
  );

  const pullFromCloud = useCallback(
    async (options?: {
      allowLocalDataUpload?: boolean;
      automatic?: boolean;
    }): Promise<boolean> => {
      if (demoMode) return false;
      if (!user) return false;
      const authOperation = captureCloudAuthOperation(authIdentityRef.current);
      if (!authOperation || authOperation.userId !== user.id) return false;
      const authOperationIsCurrent = () =>
        isCloudAuthOperationCurrent(authIdentityRef.current, authOperation);
      if (requiresEmailConfirmation) {
        setSyncStatus("idle");
        setSyncMessage(EMAIL_CONFIRMATION_REQUIRED_MESSAGE);
        return false;
      }
      if (
        (automaticCloudPaused.current || handoffPausesCloud) &&
        !options?.allowLocalDataUpload
      ) {
        setSyncStatus("idle");
        setSyncMessage(
          localDataHandoffStatus === "kept_local"
            ? "Tus datos siguen solo en este navegador. Puedes guardarlos en tu cuenta desde Cuenta."
            : "Elige primero qué hacer con los datos locales.",
        );
        return false;
      }
      if (syncIssueRef.current?.automaticRetryBlocked) {
        setSyncStatus("error");
        setSyncMessage(syncIssueRef.current.userMessage);
        return false;
      }
      const reviewOperation = captureCloudSyncReviewOperation(
        syncReviewGenerationRef.current,
      );
      if (!reviewOperation || reviewOperation.userId !== user.id) return false;
      const reviewOperationIsCurrent = () =>
        isCloudSyncReviewOperationCurrent(
          syncReviewGenerationRef.current,
          reviewOperation,
        );
      const runReviewMutation = (mutation: () => void) =>
        runCloudSyncReviewMutation(
          syncReviewGenerationRef.current,
          reviewOperation,
          mutation,
        );

      if (!(await ensureCloudReadyForCurrentDevice())) return false;
      if (!authOperationIsCurrent()) return false;
      if (
        !reviewOperationIsCurrent() ||
        syncIssueRef.current?.automaticRetryBlocked
      ) {
        return false;
      }

      if (!isBrowserOnline()) {
        setSyncStatus("offline");
        setSyncMessage("Sin conexión. Trabajando en local.");
        return false;
      }

      const operation = await runExclusiveSyncOperation(syncing, async () => {
        try {
          let workingData = dataRef.current;

          if (
            hasPendingSyncChanges(workingData) ||
            hasUnsyncedChanges(workingData) ||
            isSyncPendingFlag()
          ) {
            const uploaded = await pushToCloud(workingData, true, options);
            if (!authOperationIsCurrent() || !reviewOperationIsCurrent()) {
              return false;
            }
            workingData = dataRef.current;
            if (!uploaded && hasUnsyncedChanges(workingData)) return false;
          }

          setSyncStatus("syncing");
          const since = workingData.meta?.lastSyncedAt;
          let remoteChanges = await pullSyncChanges(
            authOperation.userId,
            since,
          );
          if (
            !authOperationIsCurrent() ||
            !reviewOperationIsCurrent() ||
            syncIssueRef.current?.automaticRetryBlocked
          ) {
            return false;
          }
          if (remoteChanges.length > 0) {
            dispatchDataAccessEvent({
              type: "cloud_pull",
              itemCount: remoteChanges.length,
              automatic: options?.automatic === true,
            });
          }

          if (remoteChanges.length === 0) {
            const entityCount = await countSyncEntities(authOperation.userId);
            if (
              !authOperationIsCurrent() ||
              !reviewOperationIsCurrent() ||
              syncIssueRef.current?.automaticRetryBlocked
            ) {
              return false;
            }
            if (entityCount === 0) {
              const legacy = await fetchLegacyCloudBackup(authOperation.userId);
              if (
                !authOperationIsCurrent() ||
                !reviewOperationIsCurrent() ||
                syncIssueRef.current?.automaticRetryBlocked
              ) {
                return false;
              }
              if (legacy) {
                const picked = pickNewerAppData(
                  workingData,
                  legacy.data,
                  legacy.updated_at,
                );
                workingData = picked.data;
                if (
                  !runReviewMutation(() => {
                    dataRef.current = workingData;
                    skipPush.current = true;
                    try {
                      replaceData(workingData, { fromRemote: true });
                    } finally {
                      skipPush.current = false;
                    }
                  })
                ) {
                  return false;
                }
                await migrateLegacyBackupToEntities(
                  authOperation.userId,
                  workingData,
                );
                if (
                  !authOperationIsCurrent() ||
                  !reviewOperationIsCurrent() ||
                  syncIssueRef.current?.automaticRetryBlocked
                ) {
                  return false;
                }
                remoteChanges = appDataToSyncChanges(workingData);
                setSyncMessage(
                  "Copia antigua migrada a sincronización por cambios",
                );
              }
            }
          }

          if (remoteChanges.length > 0) {
            const { data: merged, applied } =
              !since && !hasWorkspaceContent(workingData)
                ? rebuildCloudSnapshot(remoteChanges)
                : mergeRemoteOntoLocal(workingData, remoteChanges);
            workingData = merged;
            if (
              !runReviewMutation(() => {
                dataRef.current = workingData;
                skipPush.current = true;
                try {
                  replaceData(workingData, { fromRemote: true });
                } finally {
                  skipPush.current = false;
                }
                setSyncStatus("synced");
                setSyncMessage(
                  applied > 0
                    ? `${applied} cambio(s) recibido(s) de la nube`
                    : "Ya estabas al día",
                );
              })
            ) {
              return false;
            }
          } else if (!since) {
            const initial = appDataToSyncChanges(workingData);
            if (initial.length > 0) {
              const syncedAt = new Date().toISOString();
              await pushSyncChanges(authOperation.userId, initial);
              if (!authOperationIsCurrent()) {
                markSyncPending();
                return false;
              }
              if (!reviewOperationIsCurrent()) return false;
              if (syncIssueRef.current?.automaticRetryBlocked) {
                markSyncPending();
                return false;
              }
              workingData = markChangesSynced(workingData, initial, syncedAt);
              if (
                !runReviewMutation(() => {
                  dataRef.current = workingData;
                  skipPush.current = true;
                  try {
                    replaceData(workingData, { fromRemote: true });
                  } finally {
                    skipPush.current = false;
                  }
                })
              ) {
                return false;
              }
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
            const uploaded = await pushToCloud(workingData, true, options);
            if (!authOperationIsCurrent() || !reviewOperationIsCurrent()) {
              return false;
            }
            workingData = dataRef.current;
            if (!uploaded && hasUnsyncedChanges(workingData)) return false;
          }

          if (
            !hasPendingSyncChanges(workingData) &&
            !hasUnsyncedChanges(workingData) &&
            !isSyncPendingFlag()
          ) {
            const remoteDocumentCount = await countSyncEntities(
              authOperation.userId,
              { entityType: "document" },
            );
            if (!authOperationIsCurrent() || !reviewOperationIsCurrent()) {
              return false;
            }
            if (remoteDocumentCount > workingData.documents.length) {
              activateCloudSyncReviewIssue(
                CLOUD_SNAPSHOT_INCOMPLETE_SYNC_ISSUE,
              );
              return false;
            }
          }

          if (
            !hasPendingSyncChanges(workingData) &&
            !hasUnsyncedChanges(workingData)
          ) {
            if (!runReviewMutation(() => finalizeSyncState(workingData))) {
              return false;
            }
          }
          rememberSuccessfulDeviceSync();
          if (
            !hasPendingSyncChanges(workingData) &&
            !hasUnsyncedChanges(workingData) &&
            !isSyncPendingFlag()
          ) {
            void reportAppRecovery(authOperation.userId, "sync_cycle_verified");
          }
          return true;
        } catch (error) {
          if (!reviewOperationIsCurrent()) return false;
          markSyncPending();
          if (!authOperationIsCurrent()) return false;
          const reviewIssue = classifyCloudSyncReviewIssue(error);
          void reportAppError({
            severity: "error",
            area: "sync",
            code: reviewIssue?.code ?? "pull_failed",
            message: reviewIssue
              ? "La sincronizacion requiere revision antes de continuar"
              : error instanceof Error
                ? error.message
                : "Error al descargar de la nube",
            metadata: {
              hasPendingChanges:
                hasPendingSyncChanges(dataRef.current) ||
                hasUnsyncedChanges(dataRef.current),
            },
          });
          if (reviewIssue) {
            activateCloudSyncReviewIssue(reviewIssue);
            skipPush.current = false;
            return false;
          }
          setSyncStatus("error");
          setSyncMessage(
            error instanceof Error
              ? error.message
              : "Error al descargar de la nube",
          );
          skipPush.current = false;
          return false;
        }
      });
      return operation.started ? operation.value : false;
    },
    [
      activateCloudSyncReviewIssue,
      demoMode,
      ensureCloudReadyForCurrentDevice,
      finalizeSyncState,
      handoffPausesCloud,
      localDataHandoffStatus,
      pushToCloud,
      rememberSuccessfulDeviceSync,
      replaceData,
      requiresEmailConfirmation,
      user,
    ],
  );

  const pullFromCloudRef = useRef(pullFromCloud);
  pullFromCloudRef.current = pullFromCloud;

  useEffect(() => {
    if (!cloudEnabled || demoMode) {
      clearCloudSyncPreflightWriteBlock();
      return;
    }
    if (!authReady) {
      setCloudSyncPreflightWriteBlock(
        "Comprobando la sesión y la copia activa de la nube antes de permitir cambios…",
      );
      return;
    }
    if (!ready || !user) {
      clearCloudSyncPreflightWriteBlock();
      return;
    }
    if (
      requiresEmailConfirmation ||
      handoffPausesCloud ||
      localDataHandoffStatus === "syncing"
    ) {
      clearCloudSyncPreflightWriteBlock();
      return;
    }

    let cancelled = false;
    const hadReviewIssue = Boolean(syncIssueRef.current?.automaticRetryBlocked);
    if (!hadReviewIssue) {
      setCloudSyncPreflightWriteBlock();
    }
    void checkCloudWriteFreshness(dataRef.current)
      .then((freshness) => {
        if (cancelled) return;
        if (freshness === "fresh") {
          if (hadReviewIssue) {
            clearActiveCloudSyncReviewIssue();
            setSyncStatus("synced");
            setSyncMessage(
              "Copia de la nube comprobada. Este dispositivo está al día.",
            );
          }
          clearCloudSyncPreflightWriteBlock();
          return;
        }
        if (freshness === "stale") {
          activateCloudSyncReviewIssue(CLOUD_SNAPSHOT_INCOMPLETE_SYNC_ISSUE);
          return;
        }
        setSyncStatus("syncing");
        setSyncMessage(
          "Descargando la copia activa de la nube antes de permitir cambios.",
        );
        void pullFromCloudRef.current({ automatic: true });
      })
      .catch((error) => {
        if (cancelled) return;
        setCloudSyncPreflightWriteBlock(
          isBrowserOnline()
            ? "No se pudo confirmar si este dispositivo está al día con la nube. Los cambios quedan pausados para evitar pisar datos."
            : "Sin conexión. No se puede confirmar la copia activa de la nube; los cambios quedan pausados.",
        );
        setSyncStatus(isBrowserOnline() ? "error" : "offline");
        setSyncMessage(
          error instanceof Error
            ? error.message
            : "No se pudo comprobar la nube antes de escribir.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [
    activateCloudSyncReviewIssue,
    authReady,
    checkCloudWriteFreshness,
    clearActiveCloudSyncReviewIssue,
    clearCloudSyncPreflightWriteBlock,
    cloudEnabled,
    demoMode,
    handoffPausesCloud,
    localDataHandoffStatus,
    ready,
    requiresEmailConfirmation,
    setCloudSyncPreflightWriteBlock,
    syncIssue,
    user,
  ]);

  /** Referencia estable: evita bucles si un efecto depende de syncNow tras cada pull. */
  const syncNow = useCallback(
    async (freshLocalData?: AppData): Promise<boolean> => {
      if (syncIssueRef.current?.automaticRetryBlocked) {
        setSyncStatus("error");
        setSyncMessage(syncIssueRef.current.userMessage);
        return false;
      }
      if (freshLocalData) {
        dataRef.current = freshLocalData;
        const uploaded = await flushPendingUpload(false, freshLocalData);
        if (!uploaded) return false;
      }
      return pullFromCloudRef.current();
    },
    [flushPendingUpload],
  );

  const saveLocalDataToAccount = useCallback(async () => {
    if (!user) return;
    if (requiresEmailConfirmation) {
      setSyncStatus("idle");
      setSyncMessage(EMAIL_CONFIRMATION_REQUIRED_MESSAGE);
      return;
    }
    if (syncIssueRef.current?.automaticRetryBlocked) {
      setSyncStatus("error");
      setSyncMessage(syncIssueRef.current.userMessage);
      return;
    }
    const queuedAt = new Date().toISOString();
    const changes = buildCloudReplacementChanges(dataRef.current, queuedAt);
    if (changes.length === 0) {
      rememberHandoffDecision(user.id, "synced");
      automaticCloudPaused.current = false;
      setLocalDataHandoffStatus("none");
      setSyncMessage("No había datos locales pendientes que guardar.");
      return;
    }

    const queued = {
      ...dataRef.current,
      meta: {
        ...dataRef.current.meta,
        lastModified: queuedAt,
        pendingChanges: changes,
      },
    };
    dataRef.current = queued;
    skipPush.current = true;
    try {
      replaceData(queued, { fromRemote: true });
    } finally {
      skipPush.current = false;
    }
    markSyncPending();

    setLocalDataHandoffStatus("syncing");
    setSyncMessage("Guardando los datos locales en tu cuenta…");
    const ok = await pullFromCloudRef.current({ allowLocalDataUpload: true });
    if (ok) {
      rememberHandoffDecision(user.id, "synced");
      automaticCloudPaused.current = false;
      setLocalDataHandoffStatus("none");
      setSyncMessage("Datos de este navegador guardados en tu cuenta.");
    } else {
      setLocalDataHandoffStatus("pending");
    }
  }, [replaceData, requiresEmailConfirmation, user]);

  const pauseAutomaticCloud = useCallback(
    (message: string) => {
      if (!user) return;
      automaticCloudPaused.current = true;
      stopPendingCloudTimers();
      rememberHandoffDecision(user.id, "keep_local");
      setLocalDataHandoffStatus("kept_local");
      setSyncStatus("idle");
      setSyncMessage(message);
    },
    [stopPendingCloudTimers, user],
  );

  const pauseCloudOperationsForRepair = useCallback(
    (message: string) => {
      automaticCloudPaused.current = true;
      stopPendingCloudTimers();
      setSyncStatus("idle");
      setSyncMessage(message);
    },
    [stopPendingCloudTimers],
  );

  const releaseCloudRepairPreviewPause = useCallback(() => {
    automaticCloudPaused.current = Boolean(
      syncIssueRef.current?.automaticRetryBlocked ||
      (user && readHandoffDecision(user.id) === "keep_local"),
    );
  }, [user]);

  const cancelCloudRepairPreview = useCallback(() => {
    cloudRepairPreviewRef.current = null;
    setCloudRepairPreview(null);
    releaseCloudRepairPreviewPause();

    const issue = syncIssueRef.current;
    if (issue) {
      setSyncStatus("error");
      setSyncMessage(issue.userMessage);
      return;
    }
    if (user && readHandoffDecision(user.id) === "keep_local") {
      setSyncStatus("idle");
      setSyncMessage("Datos en modo local para esta cuenta.");
      return;
    }
    if (!isBrowserOnline()) {
      setSyncStatus("offline");
      setSyncMessage(
        "Sin conexión. Los cambios se subirán cuando vuelva internet.",
      );
      return;
    }

    const current = dataRef.current;
    const hasPending =
      hasPendingSyncChanges(current) ||
      hasUnsyncedChanges(current) ||
      isSyncPendingFlag();
    setSyncStatus(hasPending ? "pending" : "synced");
    setSyncMessage(hasPending ? "Cambios pendientes de subir a la nube" : null);
  }, [releaseCloudRepairPreviewPause, user]);

  const keepLocalDataOnDevice = useCallback(() => {
    if (!user) return;
    pauseAutomaticCloud("Tus datos seguirán solo en este navegador.");
    clearSyncPending();
  }, [pauseAutomaticCloud, user]);

  const pauseCloudForLocalRestore = useCallback((): boolean => {
    if (!user) return true;
    if (syncing.current) return false;
    pauseAutomaticCloud(
      "Restauración local preparada. Revisa los datos antes de guardarlos en tu cuenta.",
    );
    return true;
  }, [pauseAutomaticCloud, user]);

  const prepareCloudRepairPreview = useCallback(async () => {
    cloudRepairPreviewRef.current = null;
    setCloudRepairPreview(null);
    if (demoMode) {
      setSyncMessage("Sal de la demo para comparar datos reales con la nube.");
      return;
    }
    if (!user) return;
    if (requiresEmailConfirmation) {
      setSyncStatus("idle");
      setSyncMessage(EMAIL_CONFIRMATION_REQUIRED_MESSAGE);
      return;
    }
    if (syncing.current) {
      setSyncMessage(
        "Ya hay una sincronización en marcha. Espera a que termine y vuelve a comparar.",
      );
      return;
    }

    const authOperation = captureCloudAuthOperation(authIdentityRef.current);
    const reviewOperation = captureCloudSyncReviewOperation(
      syncReviewGenerationRef.current,
    );
    if (
      !authOperation ||
      !reviewOperation ||
      authOperation.userId !== user.id ||
      reviewOperation.userId !== user.id
    ) {
      setSyncStatus("error");
      setSyncMessage("La sesión cambió antes de preparar la comparación.");
      return;
    }
    const operationIsCurrent = () =>
      isCloudAuthOperationCurrent(authIdentityRef.current, authOperation) &&
      isCloudSyncReviewOperationCurrent(
        syncReviewGenerationRef.current,
        reviewOperation,
      );

    pauseCloudOperationsForRepair(
      "Comparando este dispositivo con la copia de la nube…",
    );
    if (!(await ensureCloudReadyForCurrentDevice())) {
      releaseCloudRepairPreviewPause();
      return;
    }
    if (!operationIsCurrent()) {
      releaseCloudRepairPreviewPause();
      return;
    }
    if (!isBrowserOnline()) {
      releaseCloudRepairPreviewPause();
      setSyncStatus("offline");
      setSyncMessage("Sin conexión. No se puede comparar con la nube ahora.");
      return;
    }

    const expectedLocal = getCurrentData();
    const operation = await runExclusiveSyncOperation(syncing, async () => {
      setSyncStatus("syncing");
      try {
        const remote = await loadCloudRepairRemoteSnapshot(user.id);
        if (!operationIsCurrent()) return;
        if (!remote) {
          releaseCloudRepairPreviewPause();
          setSyncStatus("idle");
          setSyncMessage(
            "No hay datos guardados en la nube. No se ha reemplazado nada.",
          );
          return;
        }
        const persistedLocal = readPersistedDataSnapshot();
        const expectedLocalFingerprint =
          cloudRepairSnapshotFingerprint(expectedLocal);
        if (
          getCurrentData() !== expectedLocal ||
          !snapshotMatchesCloudRepairFingerprint(
            persistedLocal,
            expectedLocalFingerprint,
          )
        ) {
          releaseCloudRepairPreviewPause();
          setSyncStatus("error");
          setSyncMessage(
            "Los datos de este dispositivo cambiaron durante la comparación. Vuelve a comparar antes de reparar.",
          );
          return;
        }

        const plan: CloudRepairPreviewPlan = buildCloudRepairPreviewPlan({
          local: expectedLocal,
          cloud: remote.data,
          localRecordedAt: persistedLocal?.meta?.lastModified ?? null,
          cloudRecordedAt: remote.details.recordedAt,
          cloudSource: remote.details.source,
          generatedAt: new Date().toISOString(),
          expectedFiscalOwnerScope: fiscalNotificationsOwnerScopeForUserIdV1(
            user.id,
          ),
        });
        if (plan.status !== "ready") {
          releaseCloudRepairPreviewPause();
          setSyncStatus("error");
          setSyncMessage(
            "No se pudo clasificar la comparación de forma segura. No se ha reemplazado nada.",
          );
          return;
        }

        cloudRepairPreviewRef.current = {
          userId: user.id,
          preview: plan.preview,
          localFingerprint: plan.localFingerprint,
          cloudFingerprint: plan.cloudFingerprint,
          authOperation,
          reviewOperation,
        };
        setCloudRepairPreview(plan.preview);
        setSyncStatus("idle");
        setSyncMessage(
          "Comparación preparada. Revisa las cantidades y las fechas antes de conservar la nube.",
        );
      } catch (error) {
        if (!operationIsCurrent()) return;
        releaseCloudRepairPreviewPause();
        void reportAppError({
          severity: "error",
          area: "sync",
          code: "cloud_repair_preview_failed",
          message:
            error instanceof Error
              ? error.message
              : "No se pudo preparar la comparación de reparación",
        });
        setSyncStatus("error");
        setSyncMessage(
          "No se pudo comparar este dispositivo con la nube. No se ha reemplazado nada.",
        );
      }
    });

    if (!operation.started) {
      releaseCloudRepairPreviewPause();
      setSyncMessage(
        "Ya hay una sincronización en marcha. Espera a que termine y vuelve a comparar.",
      );
    }
  }, [
    demoMode,
    ensureCloudReadyForCurrentDevice,
    getCurrentData,
    pauseCloudOperationsForRepair,
    releaseCloudRepairPreviewPause,
    requiresEmailConfirmation,
    user,
  ]);

  const forceDownloadFromCloud = useCallback(
    async (confirmation: CloudRepairConfirmation) => {
      if (demoMode) {
        setSyncMessage(
          "Sal de la demo para descargar datos reales de la nube.",
        );
        return;
      }
      if (!user) return;
      if (requiresEmailConfirmation) {
        setSyncStatus("idle");
        setSyncMessage(EMAIL_CONFIRMATION_REQUIRED_MESSAGE);
        return;
      }
      const activePreview = cloudRepairPreviewRef.current;
      if (
        !activePreview ||
        activePreview.userId !== user.id ||
      cloudRepairPreview?.id !== activePreview.preview.id ||
      confirmation.previewId !== activePreview.preview.id ||
      !cloudRepairPreviewAllowsConfirmation(
        activePreview.preview,
        confirmation.reductionsAcknowledged,
      )
      ) {
        setSyncStatus("error");
        setSyncMessage(
          "Compara de nuevo este dispositivo con la nube antes de reparar.",
        );
        return;
      }
      const repairAuthOperation = activePreview.authOperation;
      const repairReviewOperation = activePreview.reviewOperation;
      const repairOperationIsCurrent = () =>
        isCloudAuthOperationCurrent(
          authIdentityRef.current,
          repairAuthOperation,
        ) &&
        isCloudSyncReviewOperationCurrent(
          syncReviewGenerationRef.current,
          repairReviewOperation,
        );
      if (!repairOperationIsCurrent()) {
        cloudRepairPreviewRef.current = null;
        setCloudRepairPreview(null);
        releaseCloudRepairPreviewPause();
        setSyncStatus("error");
        setSyncMessage(
          "La sesión o el conflicto cambiaron desde la comparación. Vuelve a comparar antes de reparar.",
        );
        return;
      }
      if (syncing.current) {
        setSyncMessage(
          "Ya hay una sincronización en marcha. Espera a que termine y vuelve a reparar.",
        );
        return;
      }

      pauseCloudOperationsForRepair(
        "Preparando una copia de seguridad antes de reparar este dispositivo…",
      );

      if (!repairOperationIsCurrent()) return;
      if (!(await ensureCloudReadyForCurrentDevice())) {
        cloudRepairPreviewRef.current = null;
        setCloudRepairPreview(null);
        releaseCloudRepairPreviewPause();
        return;
      }
      if (!repairOperationIsCurrent()) return;

      if (!isBrowserOnline()) {
        cloudRepairPreviewRef.current = null;
        setCloudRepairPreview(null);
        releaseCloudRepairPreviewPause();
        setSyncStatus("offline");
        setSyncMessage(
          "Sin conexión. Vuelve a comparar cuando puedas consultar la nube.",
        );
        return;
      }

      const operation = await runExclusiveSyncOperation(syncing, async () => {
        setSyncStatus("syncing");

        try {
          const repair = await runCloudDeviceRepair<CloudRepairRemoteDetails>({
            getCurrent: getCurrentData,
            downloadCurrent: (current) =>
              downloadProtectedBackup(current, {
                purpose: "pre_restore",
                requireEncryption: true,
              }),
            loadRemote: () => loadCloudRepairRemoteSnapshot(user.id),
            validateExpected: (expected) =>
              snapshotMatchesCloudRepairFingerprint(
                expected,
                activePreview.localFingerprint,
              ) &&
              snapshotMatchesCloudRepairFingerprint(
                readPersistedDataSnapshot(),
                activePreview.localFingerprint,
              ),
            validateRemote: (remote) =>
              remote.details.fingerprint === activePreview.cloudFingerprint &&
              snapshotMatchesCloudRepairFingerprint(
                remote.data,
                activePreview.cloudFingerprint,
              ),
            replace: replaceCloudSnapshotDurably,
            isOperationCurrent: repairOperationIsCurrent,
          });

          if (!repairOperationIsCurrent()) return;
          if (repair.status === "operation_invalidated") return;

          if (repair.status === "preview_stale") {
            cloudRepairPreviewRef.current = null;
            setCloudRepairPreview(null);
            releaseCloudRepairPreviewPause();
            setSyncStatus("error");
            setSyncMessage(
              repair.safetyCopyFilename
                ? `La copia local o la nube cambiaron después de compararlas. No se reemplazó nada; se solicitó ${repair.safetyCopyFilename}. Vuelve a comparar.`
                : "La copia local cambió después de compararla. No se reemplazó nada; vuelve a comparar.",
            );
            return;
          }

          if (repair.status === "backup_failed") {
            setSyncStatus("error");
            setSyncMessage(
              `No se reparó el dispositivo: ${repair.error} Los datos locales se conservan y la sincronización queda en pausa.`,
            );
            return;
          }
          if (repair.status === "stale_precondition") {
            setSyncStatus("error");
            setSyncMessage(
              `Los datos cambiaron durante la reparación. No se reemplazó nada; se solicitó la copia ${repair.safetyCopyFilename} y la sincronización queda en pausa.`,
            );
            return;
          }
          if (repair.status === "cloud_empty") {
            setSyncStatus("idle");
            setSyncMessage(
              "No hay datos guardados en la nube. Los datos de este dispositivo se conservan y quedan sin subir.",
            );
            return;
          }

          const durable = repair.result;
          if (durable.status === "indeterminate") {
            setSyncStatus("error");
            setSyncMessage(
              "El navegador no pudo confirmar el guardado de la copia de la nube. No se publicó el reemplazo; exporta lo visible, recarga y vuelve a intentarlo.",
            );
            return;
          }
          if (durable.status === "blocked") {
            setSyncStatus("error");
            setSyncMessage(
              "No se pudo guardar y verificar la copia de la nube. Los datos locales anteriores se conservan y la sincronización queda en pausa.",
            );
            return;
          }

          dataRef.current = durable.data;
          clearSyncPending();
          clearActiveCloudSyncReviewIssue();
          cloudRepairPreviewRef.current = null;
          setCloudRepairPreview(null);
          automaticCloudPaused.current = false;
          rememberHandoffDecision(user.id, "synced");
          setLocalDataHandoffStatus("none");

          let legacyMigrationFailed = false;
          if (repair.remote.source === "legacy") {
            try {
              await migrateLegacyBackupToEntities(user.id, durable.data);
            } catch (error) {
              legacyMigrationFailed = true;
              void reportAppError({
                severity: "warning",
                area: "sync",
                code: "legacy_repair_migration_failed",
                message:
                  error instanceof Error
                    ? error.message
                    : "No se pudo actualizar la copia antigua en la nube",
              });
            }
          }

          setSyncStatus("synced");
          rememberSuccessfulDeviceSync();
          void reportAppRecovery(user.id, "cloud_repair_verified");
          setSyncMessage(
            legacyMigrationFailed
              ? `Dispositivo reparado desde la nube. Se solicitó la copia local ${repair.safetyCopyFilename}; búscala en Descargas o en la carpeta configurada en tu navegador. La copia antigua sigue pendiente de actualizar en la nube.`
              : `Dispositivo reparado y verificado con las cantidades revisadas. Se solicitó la copia local ${repair.safetyCopyFilename}; búscala en Descargas o en la carpeta configurada en tu navegador.`,
          );
        } catch (error) {
          if (!repairOperationIsCurrent()) return;
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
              ? `${error.message}. No se reemplazaron los datos locales y la sincronización queda en pausa.`
              : "Error al descargar todos los datos de la nube. No se reemplazaron los datos locales y la sincronización queda en pausa.",
          );
        }
      });

      if (!operation.started) {
        setSyncMessage("Ya hay una sincronización en marcha.");
      }
    },
    [
      demoMode,
      cloudRepairPreview,
      clearActiveCloudSyncReviewIssue,
      ensureCloudReadyForCurrentDevice,
      getCurrentData,
      pauseCloudOperationsForRepair,
      releaseCloudRepairPreviewPause,
      rememberSuccessfulDeviceSync,
      replaceCloudSnapshotDurably,
      requiresEmailConfirmation,
      user,
    ],
  );

  const schedulePush = useCallback(() => {
    if (demoMode) return;
    if (handoffPausesCloud) return;
    if (syncIssueRef.current?.automaticRetryBlocked) return;
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
      if (syncIssueRef.current?.automaticRetryBlocked) return;
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
    let cancelled = false;

    void getSupabaseClientAsync().then((supabase) => {
      if (cancelled) return;
      if (!supabase) {
        setAuthReady(true);
        return;
      }

      void supabase.auth
        .getUser()
        .then(({ data: authData }) => {
          if (cancelled) return;
          setAuthUser(authData.user);
          if (authData.user?.email) setEmail(authData.user.email);
        })
        .finally(() => {
          if (!cancelled) setAuthReady(true);
        });

      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (cancelled) return;
          setAuthReady(true);
          setAuthUser(session?.user ?? null);
          if (session?.user?.email) setEmail(session.user.email);
        },
      );
      unsubscribe = () => listener.subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      invalidateCloudAuthOperations();
      unsubscribe?.();
    };
  }, [cloudEnabled, invalidateCloudAuthOperations, setAuthUser]);

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
    if (syncIssueRef.current?.automaticRetryBlocked) {
      setSyncStatus("error");
      setSyncMessage(syncIssueRef.current.userMessage);
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
    if (syncIssueRef.current?.automaticRetryBlocked) return;
    if (pulledForUser.current === user.id) return;
    pulledForUser.current = user.id;
    void pullFromCloud({ automatic: true });
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
        if (syncIssueRef.current?.automaticRetryBlocked) return;
        void flushPendingUpload(true).then(() => {
          if (!hasPendingSyncChanges(data)) {
            void pullFromCloud({ automatic: true });
          }
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
      if (syncIssueRef.current?.automaticRetryBlocked) return;
      void pullFromCloud({ automatic: true });
    }, PULL_INTERVAL_MS);

    return () => clearInterval(pullTimer);
  }, [cloudEnabled, demoMode, handoffPausesCloud, pullFromCloud, user]);

  useEffect(() => {
    if (demoMode || handoffPausesCloud || !user || !pendingUpload || !online)
      return;

    if (retryTimer.current) clearInterval(retryTimer.current);
    retryTimer.current = setInterval(() => {
      if (syncIssueRef.current?.automaticRetryBlocked) return;
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
    async (password: string, captchaToken?: string): Promise<SignUpResult> => {
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
        setAuthUser(data.session.user);
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
    [email, setAuthUser],
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

  const finishSignedOutSession = useCallback(
    (message: string) => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      if (retryTimer.current) clearInterval(retryTimer.current);
      pushTimer.current = null;
      retryTimer.current = null;
      pulledForUser.current = null;
      syncing.current = false;
      syncIssueRef.current = null;
      setSyncIssue(null);
      setAuthUser(null);
      setSyncMessage(message);
      setSyncStatus(cloudEnabled ? "idle" : "disabled");
    },
    [cloudEnabled, setAuthUser],
  );

  const signOut = useCallback(async () => {
    invalidateCloudAuthOperations();
    const supabase = await getSupabaseClientAsync();
    if (supabase) {
      await releaseCurrentCloudDeviceSession();
      const { error } = await supabase.auth.signOut();
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
    }
    finishSignedOutSession("Sesión cerrada");
  }, [finishSignedOutSession, invalidateCloudAuthOperations]);

  const signOutAndClearDevice = useCallback(async (): Promise<
    string | null
  > => {
    if (!user) return "No hay una sesión iniciada.";
    if (demoMode) return "Sal de la demo antes de borrar este dispositivo.";
    if (!emailConfirmed) return EMAIL_CONFIRMATION_REQUIRED_MESSAGE;
    invalidateCloudAuthOperations();

    const cloudAccess = await canUseCloudForUser(user.id);
    if (cloudAccess.allowed) {
      if (handoffPausesCloud) {
        return "Guarda primero estos datos en tu cuenta antes de borrarlos del dispositivo.";
      }
      const synced = await flushPendingUpload(false);
      if (!synced) {
        return "No se ha podido confirmar la copia en la nube. No se ha borrado ningún dato local.";
      }
      const retired = await retireCurrentCloudDevice();
      if (retired.error) {
        return `No se ha podido liberar la plaza de este dispositivo. No se ha borrado ningún dato local. ${retired.error}`;
      }
    }

    const expected = dataRef.current;
    const supabase = await getSupabaseClientAsync();
    if (!supabase) return "La nube no está disponible en este momento.";
    const { error } = await supabase.auth.signOut();
    if (error) return error.message;

    finishSignedOutSession("Sesión cerrada de forma segura");
    const cleared = clearPersistedAppData(expected);
    if (cleared.status !== "applied") {
      return "La sesión se cerró, pero el navegador no confirmó el borrado local. No uses este dispositivo como compartido hasta reintentar.";
    }

    clearDriveAccessToken();
    clearCloudSyncReviewIssue(user.id);
    const secondary = clearSecondaryDeviceData(user.id);
    skipPush.current = true;
    try {
      replaceData({ ...EMPTY_DATA }, { fromRemote: true });
      dataRef.current = EMPTY_DATA;
    } finally {
      skipPush.current = false;
    }

    if (!secondary.ok) {
      return "Los datos principales se borraron, pero no se pudo confirmar la limpieza de todos los ajustes locales.";
    }
    return null;
  }, [
    demoMode,
    emailConfirmed,
    finishSignedOutSession,
    flushPendingUpload,
    handoffPausesCloud,
    invalidateCloudAuthOperations,
    replaceData,
    user,
  ]);

  const importBackup = useCallback(
    async (file: File) => {
      if (demoMode) {
        return "Sal de la demo para importar una copia real.";
      }
      if (syncIssueRef.current?.automaticRetryBlocked) {
        setSyncStatus("error");
        setSyncMessage(syncIssueRef.current.userMessage);
        return "Resuelve primero el conflicto de sincronización desde Cuenta.";
      }
      const parsed = await readProtectedBackupFile(file);
      if ("error" in parsed) return parsed.error;

      const confirmed = confirm(
        "¿Importar esta copia? Se sustituirán los datos de este dispositivo.",
      );
      if (!confirmed) return null;

      const queuedAt = new Date().toISOString();
      const withQueue = {
        ...parsed,
        meta: {
          ...parsed.meta,
          lastModified: queuedAt,
          pendingChanges: buildCloudReplacementChanges(parsed, queuedAt),
        },
      };
      skipPush.current = true;
      dataRef.current = withQueue;
      try {
        replaceData(withQueue, { fromRemote: true });
      } finally {
        skipPush.current = false;
      }
      markSyncPending();

      if (user && emailConfirmed) await pushToCloud(withQueue, false);
      setSyncMessage("Copia importada correctamente");
      return null;
    },
    [demoMode, emailConfirmed, pushToCloud, replaceData, user],
  );

  const exportBackup = useCallback(async () => {
    const result = await downloadProtectedBackup(dataRef.current);
    setSyncMessage(
      result.ok
        ? result.encrypted
          ? `Copia cifrada descargada: ${result.filename}`
          : `Copia local descargada sin cifrar: ${result.filename}`
        : result.error,
    );
  }, []);

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
      syncIssue,
      cloudRepairPreview,
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
      signOutAndClearDevice,
      syncNow,
      saveLocalDataToAccount,
      keepLocalDataOnDevice,
      pauseCloudForLocalRestore,
      prepareCloudRepairPreview,
      cancelCloudRepairPreview,
      forceDownloadFromCloud,
      exportBackup,
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
      syncIssue,
      cloudRepairPreview,
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
      signOutAndClearDevice,
      syncNow,
      saveLocalDataToAccount,
      keepLocalDataOnDevice,
      pauseCloudForLocalRestore,
      prepareCloudRepairPreview,
      cancelCloudRepairPreview,
      forceDownloadFromCloud,
      exportBackup,
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
