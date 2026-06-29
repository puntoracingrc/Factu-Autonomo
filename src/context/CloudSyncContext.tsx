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
import { getAuthCallbackUrl } from "@/lib/supabase/auth-redirect";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { isCloudEnabled, isGoogleAuthEnabled } from "@/lib/supabase/config";
import { pickNewerAppData } from "@/lib/cloud/sync";
import { EMPTY_DATA } from "@/lib/types";

export type SyncStatus =
  | "disabled"
  | "offline"
  | "idle"
  | "pending"
  | "syncing"
  | "synced"
  | "error";

export type SignUpResult =
  | { ok: true; email: string; needsEmailConfirmation: boolean }
  | { ok: false; error: string };

interface CloudSyncValue {
  cloudEnabled: boolean;
  user: User | null;
  email: string;
  syncStatus: SyncStatus;
  syncMessage: string | null;
  pendingUpload: boolean;
  pendingChangeCount: number;
  setEmail: (value: string) => void;
  signUp: (password: string) => Promise<SignUpResult>;
  signIn: (password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  resendConfirmationEmail: () => Promise<string | null>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  forceDownloadFromCloud: () => Promise<void>;
  exportBackup: () => void;
  importBackup: (file: File) => Promise<string | null>;
}

const CloudSyncContext = createContext<CloudSyncValue | null>(null);

const RETRY_MS = 30_000;
const PULL_INTERVAL_MS = 45_000;

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const { data, ready, replaceData } = useAppStore();
  const cloudEnabled = isCloudEnabled();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [online, setOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    cloudEnabled ? "idle" : "disabled",
  );
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const skipPush = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulledForUser = useRef<string | null>(null);
  const syncing = useRef(false);
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const pendingChangeCount = data.meta?.pendingChanges?.length ?? 0;
  const pendingUpload =
    hasPendingSyncChanges(data) ||
    isSyncPendingFlag() ||
    hasUnsyncedChanges(data);

  const updatePendingStatus = useCallback(() => {
    if (!user || !cloudEnabled) return;
    if (!isBrowserOnline()) {
      setSyncStatus("offline");
      setSyncMessage("Sin conexión. Los cambios se subirán cuando vuelva internet.");
      return;
    }
    if (hasPendingSyncChanges(data) || hasUnsyncedChanges(data) || isSyncPendingFlag()) {
      setSyncStatus("pending");
      setSyncMessage(
        pendingChangeCount > 0
          ? `${pendingChangeCount} cambio(s) pendiente(s) de subir`
          : "Cambios pendientes de subir a la nube",
      );
    } else if (syncStatus !== "syncing" && syncStatus !== "error") {
      setSyncStatus("synced");
    }
  }, [cloudEnabled, data, pendingChangeCount, syncStatus, user]);

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
    async (payload = data, silent = false): Promise<boolean> => {
      if (!user) return false;

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
    [data, replaceData, user],
  );

  const flushPendingUpload = useCallback(
    async (silent = true, payload = dataRef.current) => {
      if (!user) return false;
      if (!hasPendingSyncChanges(payload) && !hasUnsyncedChanges(payload)) {
        clearSyncPending();
        setSyncStatus("synced");
        return true;
      }
      if (syncing.current) return false;
      syncing.current = true;
      const ok = await pushToCloud(payload, silent);
      syncing.current = false;
      return ok;
    },
    [pushToCloud, user],
  );

  const pullFromCloud = useCallback(async () => {
    if (!user) return;

    const cloudAccess = await canUseCloudForUser(user.id);
    if (!cloudAccess.allowed) {
      setSyncStatus("idle");
      setSyncMessage(cloudAccess.reason ?? "La nube requiere plan Pro.");
      return;
    }

    if (!isBrowserOnline()) {
      setSyncStatus("offline");
      setSyncMessage("Sin conexión. Trabajando en local.");
      return;
    }

    let workingData = dataRef.current;

    if (hasPendingSyncChanges(workingData) || hasUnsyncedChanges(workingData) || isSyncPendingFlag()) {
      const uploaded = await flushPendingUpload(true, workingData);
      workingData = dataRef.current;
      if (!uploaded && hasUnsyncedChanges(workingData)) return;
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
            setSyncMessage("Copia antigua migrada a sincronización por cambios");
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

      if (hasPendingSyncChanges(workingData) || hasUnsyncedChanges(workingData) || isSyncPendingFlag()) {
        await flushPendingUpload(true, workingData);
        workingData = dataRef.current;
      }

      if (!hasPendingSyncChanges(workingData) && !hasUnsyncedChanges(workingData)) {
        finalizeSyncState(workingData);
      }
    } catch (error) {
      setSyncStatus("error");
      setSyncMessage(
        error instanceof Error ? error.message : "Error al descargar de la nube",
      );
      skipPush.current = false;
    }
  }, [finalizeSyncState, flushPendingUpload, replaceData, user]);

  const pullFromCloudRef = useRef(pullFromCloud);
  pullFromCloudRef.current = pullFromCloud;

  /** Referencia estable: evita bucles si un efecto depende de syncNow tras cada pull. */
  const syncNow = useCallback(async () => {
    await pullFromCloudRef.current();
  }, []);

  const forceDownloadFromCloud = useCallback(async () => {
    if (!user) return;

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
        await migrateLegacyBackupToEntities(user.id, synced);
        setSyncStatus("synced");
        setSyncMessage("Copia antigua descargada y actualizada en la nube");
        return;
      }

      setSyncStatus("synced");
      setSyncMessage("No hay datos guardados en la nube para esta cuenta");
    } catch (error) {
      setSyncStatus("error");
      setSyncMessage(
        error instanceof Error
          ? error.message
          : "Error al descargar todos los datos de la nube",
      );
    } finally {
      syncing.current = false;
    }
  }, [replaceLocalDataFromCloud, user]);

  const schedulePush = useCallback(() => {
    if (!ready || !user || skipPush.current) return;
    if (!pendingUpload) return;

    markSyncPending();
    updatePendingStatus();

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      void flushPendingUpload(true);
    }, 2000);
  }, [flushPendingUpload, pendingUpload, ready, updatePendingStatus, user]);

  useEffect(() => {
    setOnline(isBrowserOnline());
    function handleOnline() {
      setOnline(true);
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
  }, [flushPendingUpload]);

  useEffect(() => {
    if (!cloudEnabled) return;
    let unsubscribe: (() => void) | undefined;

    void getSupabaseClientAsync().then((supabase) => {
      if (!supabase) return;

      void supabase.auth.getUser().then(({ data: authData }) => {
        setUser(authData.user);
        if (authData.user?.email) setEmail(authData.user.email);
      });

      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(session?.user ?? null);
          if (session?.user?.email) setEmail(session.user.email);
        },
      );
      unsubscribe = () => listener.subscription.unsubscribe();
    });

    return () => unsubscribe?.();
  }, [cloudEnabled]);

  useEffect(() => {
    schedulePush();
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [schedulePush]);

  useEffect(() => {
    if (!ready || !user) return;
    if (pulledForUser.current === user.id) return;
    pulledForUser.current = user.id;
    void pullFromCloud();
  }, [ready, user, pullFromCloud]);

  useEffect(() => {
    if (!user) pulledForUser.current = null;
  }, [user]);

  useEffect(() => {
    if (!cloudEnabled || !user) return;

    function handleVisible() {
      if (document.visibilityState === "visible" && isBrowserOnline()) {
        void flushPendingUpload(true).then(() => {
          if (!hasPendingSyncChanges(data)) void pullFromCloud();
        });
      }
    }

    document.addEventListener("visibilitychange", handleVisible);
    return () => document.removeEventListener("visibilitychange", handleVisible);
  }, [cloudEnabled, data, flushPendingUpload, pullFromCloud, user]);

  useEffect(() => {
    if (!cloudEnabled || !user) return;

    const pullTimer = setInterval(() => {
      if (document.visibilityState !== "visible" || !isBrowserOnline()) return;
      if (syncing.current) return;
      void pullFromCloud();
    }, PULL_INTERVAL_MS);

    return () => clearInterval(pullTimer);
  }, [cloudEnabled, pullFromCloud, user]);

  useEffect(() => {
    if (!user || !pendingUpload || !online) return;

    if (retryTimer.current) clearInterval(retryTimer.current);
    retryTimer.current = setInterval(() => {
      void flushPendingUpload(true);
    }, RETRY_MS);

    return () => {
      if (retryTimer.current) clearInterval(retryTimer.current);
    };
  }, [flushPendingUpload, online, pendingUpload, user]);

  useEffect(() => {
    updatePendingStatus();
  }, [updatePendingStatus, pendingUpload, online, pendingChangeCount]);

  const signUp = useCallback(
    async (password: string): Promise<SignUpResult> => {
      const supabase = await getSupabaseClientAsync();
      if (!supabase) {
        return { ok: false, error: "La nube no está configurada en este servidor" };
      }
      if (!email.trim()) {
        return { ok: false, error: "Introduce tu email" };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: getAuthCallbackUrl() },
      });
      if (error) return { ok: false, error: error.message };

      const registeredEmail = data.user?.email ?? email.trim();
      const needsEmailConfirmation = Boolean(data.user && !data.session);

      if (data.user?.id && data.user.email) {
        void fetch("/api/email/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.user.id,
            email: data.user.email,
          }),
        }).catch(() => undefined);
      }

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
    async (password: string) => {
      const supabase = await getSupabaseClientAsync();
      if (!supabase) return "La nube no está configurada en este servidor";
      if (!email.trim()) return "Introduce tu email";

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return error.message;

      pulledForUser.current = null;
      setSyncMessage("Sesión iniciada — sincronizando…");
      if (ready) {
        void pullFromCloud();
      }
      return null;
    },
    [email, pullFromCloud, ready],
  );

  const signInWithGoogle = useCallback(async () => {
    const supabase = await getSupabaseClientAsync();
    if (!supabase) return "La nube no está configurada en este servidor";
    if (!isGoogleAuthEnabled()) {
      return "El acceso con Google aún no está activado.";
    }

    setSyncMessage("Abriendo Google para iniciar sesión…");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthCallbackUrl(),
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (error) return error.message;
    return null;
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

      if (user) await pushToCloud(withQueue, false);
      setSyncMessage("Copia importada correctamente");
      return null;
    },
    [pushToCloud, replaceData, user],
  );

  const value = useMemo(
    () => ({
      cloudEnabled,
      user,
      email,
      syncStatus,
      syncMessage,
      pendingUpload,
      pendingChangeCount,
      setEmail,
      signUp,
      signIn,
      signInWithGoogle,
      resendConfirmationEmail,
      signOut,
      syncNow,
      forceDownloadFromCloud,
      exportBackup: () => downloadBackup(data),
      importBackup,
    }),
    [
      cloudEnabled,
      user,
      email,
      syncStatus,
      syncMessage,
      pendingUpload,
      pendingChangeCount,
      signUp,
      signIn,
      signInWithGoogle,
      resendConfirmationEmail,
      signOut,
      syncNow,
      forceDownloadFromCloud,
      data,
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
