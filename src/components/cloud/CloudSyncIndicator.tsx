"use client";

import Link from "next/link";
import {
  CircleAlert,
  CloudOff,
  CloudUpload,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync, type SyncStatus } from "@/context/CloudSyncContext";

function useCloudIndicatorAvailability(): boolean {
  const { limits, loading } = useBilling();
  return !loading && limits.cloudSync;
}

function shouldShowIndicator(
  cloudEnabled: boolean,
  cloudAvailable: boolean,
  user: unknown,
  pendingChangeCount: number,
  pendingUpload: boolean,
  syncStatus: SyncStatus,
): boolean {
  if (!cloudEnabled || !cloudAvailable || !user) return false;
  if (syncStatus === "synced" && pendingChangeCount === 0 && !pendingUpload) {
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

function pendingChangesText(count: number): string {
  return count === 1 ? "1 cambio" : `${count} cambios`;
}

function cloudSyncButtonTitle(
  syncStatus: SyncStatus,
  pendingChangeCount: number,
  syncMessage: string | null,
): string {
  if (syncStatus === "offline") {
    return pendingChangeCount > 0
      ? `${pendingChangesText(pendingChangeCount)} guardado en este dispositivo. Se subirá cuando vuelva internet.`
      : "Sin conexión. Puedes seguir trabajando; lo local se sincronizará al volver internet.";
  }
  if (syncStatus === "pending" && pendingChangeCount > 0) {
    return `${pendingChangesText(pendingChangeCount)} guardado en este dispositivo. Pendiente de subir a la nube.`;
  }
  return syncMessage ?? "Sincronizar con la nube";
}

function cloudSyncButtonLabel(
  syncStatus: SyncStatus,
  pendingChangeCount: number,
): string {
  const hasCount = pendingChangeCount > 0;

  if (syncStatus === "syncing") return "Subiendo...";
  if (syncStatus === "offline") return hasCount ? "Guardado local" : "Sin red";
  if (syncStatus === "error") return "Reintentar";
  if (hasCount) return "Guardado local";
  return "Subir";
}

export function CloudSyncHeaderIndicator() {
  const cloudAvailable = useCloudIndicatorAvailability();
  const {
    cloudEnabled,
    cloudSyncPaused,
    user,
    pendingChangeCount,
    pendingUpload,
    syncStatus,
    syncMessage,
    syncIssue,
    syncNow,
  } = useCloudSync();

  if (
    cloudSyncPaused ||
    !shouldShowIndicator(
      cloudEnabled,
      cloudAvailable,
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

  if (syncIssue?.recovery === "review_account") {
    return (
      <Link
        href="/cuenta"
        title={syncIssue.userMessage}
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 transition-colors hover:bg-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 min-[430px]:min-w-0"
      >
        <CircleAlert className="h-3.5 w-3.5" />
        <span className="hidden whitespace-nowrap min-[430px]:inline">
          Resolver conflicto
        </span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      disabled={isSyncing || isOffline}
      title={cloudSyncButtonTitle(syncStatus, pendingChangeCount, syncMessage)}
      className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 min-[430px]:min-w-0 ${
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
      <span className="hidden whitespace-nowrap min-[430px]:inline">
        {cloudSyncButtonLabel(syncStatus, pendingChangeCount)}
      </span>
    </button>
  );
}

export function CloudSyncNavBadge() {
  const cloudAvailable = useCloudIndicatorAvailability();
  const {
    cloudEnabled,
    cloudSyncPaused,
    user,
    pendingChangeCount,
    pendingUpload,
    syncStatus,
    syncIssue,
  } = useCloudSync();

  if (
    cloudSyncPaused ||
    !shouldShowIndicator(
      cloudEnabled,
      cloudAvailable,
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
        syncIssue ? "bg-red-600" : isSyncing ? "bg-sky-500" : "bg-amber-500"
      }`}
      aria-label={
        syncIssue
          ? "Conflicto de sincronización pendiente de resolver"
          : showCount
            ? `${pendingChangeCount} cambios pendientes de subir`
            : "Cambios pendientes de subir"
      }
    >
      {syncIssue ? (
        "!"
      ) : isSyncing ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : showCount ? (
        pendingChangeCount > 9 ? (
          "9+"
        ) : (
          pendingChangeCount
        )
      ) : (
        "!"
      )}
    </span>
  );
}

export function CloudSyncPendingBanner() {
  const cloudAvailable = useCloudIndicatorAvailability();
  const {
    cloudEnabled,
    cloudSyncPaused,
    user,
    pendingChangeCount,
    syncStatus,
    syncIssue,
    syncNow,
  } = useCloudSync();

  if (!cloudEnabled || !cloudAvailable || !user) {
    return null;
  }
  if (cloudSyncPaused) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
        <div className="mx-auto max-w-3xl text-sm text-amber-950">
          Copia completa entre dispositivos pausada. Las acciones que indiquen
          &quot;Servidor central&quot; se confirman y sincronizan allí; las
          demás quedan en este dispositivo.
        </div>
      </div>
    );
  }
  if (syncIssue?.recovery === "review_account") {
    return (
      <div className="border-b border-red-200 bg-red-50 px-4 py-2">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="text-red-950">{syncIssue.userMessage}</p>
          <Link
            href="/cuenta"
            className="shrink-0 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
          >
            Resolver conflicto
          </Link>
        </div>
      </div>
    );
  }
  if (pendingChangeCount === 0) return null;
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
              <strong>{pendingChangesText(pendingChangeCount)}</strong>{" "}
              guardado en este dispositivo. Se subirá cuando vuelva internet.
            </>
          ) : (
            <>
              <strong>{pendingChangesText(pendingChangeCount)}</strong>{" "}
              guardado en este dispositivo. Pendiente de subir a la nube.
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
