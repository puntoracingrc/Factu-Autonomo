"use client";

import Link from "next/link";
import { CloudOff, CloudUpload, Loader2, RefreshCw } from "lucide-react";
import { useCloudSync, type SyncStatus } from "@/context/CloudSyncContext";

function shouldShowIndicator(
  cloudEnabled: boolean,
  user: unknown,
  pendingChangeCount: number,
  pendingUpload: boolean,
  syncStatus: SyncStatus,
): boolean {
  if (!cloudEnabled || !user) return false;
  if (
    syncStatus === "synced" &&
    pendingChangeCount === 0 &&
    !pendingUpload
  ) {
    return false;
  }
  return (
    pendingChangeCount > 0 ||
    pendingUpload ||
    syncStatus === "syncing" ||
    syncStatus === "offline" ||
    syncStatus === "error"
  );
}

export function CloudSyncHeaderIndicator() {
  const {
    cloudEnabled,
    user,
    pendingChangeCount,
    pendingUpload,
    syncStatus,
    syncMessage,
    syncNow,
  } = useCloudSync();

  if (
    !shouldShowIndicator(
      cloudEnabled,
      user,
      pendingChangeCount,
      pendingUpload,
      syncStatus,
    )
  ) {
    return null;
  }

  const isSyncing = syncStatus === "syncing";
  const isOffline = syncStatus === "offline";
  const isError = syncStatus === "error";
  const hasCount = pendingChangeCount > 0;

  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      disabled={isSyncing || isOffline}
      title={syncMessage ?? "Sincronizar con la nube"}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        isError
          ? "bg-red-100 text-red-800 hover:bg-red-200"
          : isOffline
            ? "bg-slate-200 text-slate-700"
            : isSyncing
              ? "bg-sky-100 text-sky-800"
              : "bg-amber-100 text-amber-900 hover:bg-amber-200"
      }`}
    >
      {isSyncing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isOffline ? (
        <CloudOff className="h-3.5 w-3.5" />
      ) : isError ? (
        <RefreshCw className="h-3.5 w-3.5" />
      ) : (
        <CloudUpload className="h-3.5 w-3.5" />
      )}
      <span className="whitespace-nowrap">
        {isSyncing
          ? "Subiendo…"
          : isOffline
            ? hasCount
              ? `${pendingChangeCount} en cola`
              : "Sin red"
            : isError
              ? "Reintentar"
              : hasCount
                ? `${pendingChangeCount} pendiente${pendingChangeCount === 1 ? "" : "s"}`
                : "Subir"}
      </span>
    </button>
  );
}

export function CloudSyncNavBadge() {
  const {
    cloudEnabled,
    user,
    pendingChangeCount,
    pendingUpload,
    syncStatus,
  } = useCloudSync();

  if (
    !shouldShowIndicator(
      cloudEnabled,
      user,
      pendingChangeCount,
      pendingUpload,
      syncStatus,
    )
  ) {
    return null;
  }

  const showCount = pendingChangeCount > 0;
  const isSyncing = syncStatus === "syncing";

  return (
    <span
      className={`absolute -right-0.5 -top-0.5 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none text-white shadow-sm ${
        isSyncing ? "bg-sky-500" : "bg-amber-500"
      }`}
      aria-label={
        showCount
          ? `${pendingChangeCount} cambios pendientes de subir`
          : "Cambios pendientes de subir"
      }
    >
      {isSyncing ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : showCount ? (
        pendingChangeCount > 9 ? "9+" : pendingChangeCount
      ) : (
        "!"
      )}
    </span>
  );
}

export function CloudSyncPendingBanner() {
  const { cloudEnabled, user, pendingChangeCount, syncStatus, syncNow } =
    useCloudSync();

  if (!cloudEnabled || !user || pendingChangeCount === 0) return null;
  if (syncStatus === "syncing") return null;

  return (
    <div
      className={`border-b px-4 py-2 ${
        syncStatus === "offline"
          ? "border-slate-200 bg-slate-100"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 text-sm">
        <p
          className={
            syncStatus === "offline" ? "text-slate-700" : "text-amber-950"
          }
        >
          {syncStatus === "offline" ? (
            <>
              <strong>{pendingChangeCount}</strong> cambio
              {pendingChangeCount === 1 ? "" : "s"} en cola — se subirán al
              volver internet.
            </>
          ) : (
            <>
              <strong>{pendingChangeCount}</strong> cambio
              {pendingChangeCount === 1 ? "" : "s"} sin subir a la nube (solo lo
              modificado).
            </>
          )}
        </p>
        {syncStatus !== "offline" && (
          <button
            type="button"
            onClick={() => void syncNow()}
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Subir ahora
          </button>
        )}
        {syncStatus === "offline" && (
          <Link
            href="/configuracion"
            className="shrink-0 text-xs font-semibold text-slate-600 underline"
          >
            Ajustes
          </Link>
        )}
      </div>
    </div>
  );
}
