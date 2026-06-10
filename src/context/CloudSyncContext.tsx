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
  mergeRemoteOntoLocal,
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
  hasUnsyncedChanges,
  isBrowserOnline,
  isSyncPendingFlag,
  markSyncPending,
} from "@/lib/cloud/sync-queue";
import { canUseCloudForUser } from "@/lib/billing/cloud-access";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { isCloudEnabled } from "@/lib/supabase/config";
import { pickNewerAppData } from "@/lib/cloud/sync";

export type SyncStatus =
  | "disabled"
  | "offline"
  | "idle"
  | "pending"
  | "syncing"
  | "synced"
  | "error";

interface CloudSyncValue {
  cloudEnabled: boolean;
  user: User | null;
  email: string;
  syncStatus: SyncStatus;
  syncMessage: string | null;
  pendingUpload: boolean;
  pendingChangeCount: number;
  setEmail: (value: string) => void;
  signUp: (password: string) => Promise<string | null>;
  signIn: (password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  exportBackup: () => void;
  importBackup: (file: File) => Promise<string | null>;
}

const CloudSyncContext = createContext<CloudSyncValue | null>(null);

const RETRY_MS = 30_000;

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

  const pendingChangeCount = data.meta?.pendingChanges?.length ?? 0;
  const pendingUpload =
    hasUnsyncedChanges(data) || isSyncPendingFlag();

  const updatePendingStatus = useCallback(() => {
    if (!user || !cloudEnabled) return;
    if (!isBrowserOnline()) {
      setSyncStatus("offline");
      setSyncMessage("Sin conexión. Los cambios se subirán cuando vuelva internet.");
      return;
    }
    if (hasPendingSyncChanges(data) || isSyncPendingFlag()) {
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

      const changes = payload.meta?.pendingChanges ?? [];
      if (changes.length === 0) {
        if (!hasUnsyncedChanges(payload)) return true;
        return false;
      }

      if (!silent) setSyncStatus("syncing");
      try {
        const syncedAt = await pushSyncChanges(user.id, changes);
        clearSyncPending();
        skipPush.current = true;
        replaceData(markChangesSynced(payload, changes, syncedAt), {
          fromRemote: true,
        });
        skipPush.current = false;
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
    async (silent = true) => {
      if (!user || !hasPendingSyncChanges(data)) {
        if (!hasUnsyncedChanges(data)) return true;
      }
      if (syncing.current) return false;
      syncing.current = true;
      const ok = await pushToCloud(data, silent);
      syncing.current = false;
      return ok;
    },
    [data, pushToCloud, user],
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

    if (hasPendingSyncChanges(data)) {
      const uploaded = await flushPendingUpload(true);
      if (!uploaded && hasPendingSyncChanges(data)) return;
    }

    setSyncStatus("syncing");
    try {
      const since = data.meta?.lastSyncedAt;
      let remoteChanges = await pullSyncChanges(user.id, since);

      if (remoteChanges.length === 0) {
        const entityCount = await countSyncEntities(user.id);
        if (entityCount === 0) {
          const legacy = await fetchLegacyCloudBackup(user.id);
          if (legacy) {
            const picked = pickNewerAppData(data, legacy.data, legacy.updated_at);
            skipPush.current = true;
            replaceData(picked.data, { fromRemote: true });
            skipPush.current = false;
            await migrateLegacyBackupToEntities(user.id, picked.data);
            remoteChanges = appDataToSyncChanges(picked.data);
            setSyncMessage("Copia antigua migrada a sincronización por cambios");
          }
        }
      }

      if (remoteChanges.length > 0) {
        skipPush.current = true;
        const { data: merged, applied } = mergeRemoteOntoLocal(data, remoteChanges);
        replaceData(merged, { fromRemote: true });
        skipPush.current = false;
        setSyncStatus("synced");
        setSyncMessage(
          applied > 0
            ? `${applied} cambio(s) recibido(s) de la nube`
            : "Ya estabas al día",
        );
      } else if (!since) {
        const initial = appDataToSyncChanges(data);
        if (initial.length > 0) {
          await pushSyncChanges(user.id, initial);
          skipPush.current = true;
          replaceData(
            markChangesSynced(data, initial, new Date().toISOString()),
            { fromRemote: true },
          );
          skipPush.current = false;
        }
        setSyncStatus("synced");
        setSyncMessage("Copia inicial creada en la nube");
      } else {
        setSyncStatus("synced");
        setSyncMessage("Todo sincronizado");
      }

      if (hasPendingSyncChanges(data)) {
        await flushPendingUpload(true);
      }
    } catch (error) {
      setSyncStatus("error");
      setSyncMessage(
        error instanceof Error ? error.message : "Error al descargar de la nube",
      );
      skipPush.current = false;
    }
  }, [data, flushPendingUpload, replaceData, user]);

  const schedulePush = useCallback(() => {
    if (!ready || !user || skipPush.current) return;
    if (!hasPendingSyncChanges(data)) return;

    markSyncPending();
    updatePendingStatus();

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      void flushPendingUpload(true);
    }, 2000);
  }, [data, flushPendingUpload, ready, updatePendingStatus, user]);

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
    async (password: string) => {
      const supabase = await getSupabaseClientAsync();
      if (!supabase) return "La nube no está configurada en este servidor";
      if (!email.trim()) return "Introduce tu email";

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return error.message;

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

      setSyncMessage(
        "Cuenta creada. Si hace falta, confirma el email y luego inicia sesión.",
      );
      return null;
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
      setSyncMessage("Sesión iniciada");
      return null;
    },
    [email],
  );

  const signOut = useCallback(async () => {
    const supabase = await getSupabaseClientAsync();
    if (supabase) await supabase.auth.signOut();
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
      signOut,
      syncNow: pullFromCloud,
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
      signOut,
      pullFromCloud,
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
