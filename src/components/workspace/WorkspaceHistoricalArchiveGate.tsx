"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArchiveRestore, RefreshCw } from "lucide-react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useWorkspaceStorage } from "@/context/WorkspaceStorageContext";
import { canUseCloudForUser } from "@/lib/billing/cloud-access";
import { registerCurrentCloudDevice } from "@/lib/cloud/device-client";
import { CLOUD_DEVICE_REACTIVATED_EVENT } from "@/lib/cloud/device-events";
import { reportAppError } from "@/lib/monitoring/client";
import {
  getHistoricalWorkspaceArchiveStatusFromBrowser,
  pullHistoricalWorkspaceArchiveFromBrowser,
} from "@/lib/workspace-history/archive-client";
import {
  hasLocallyCompleteHistoricalWorkspaceArchive,
  type HistoricalWorkspaceArchiveManifest,
} from "@/lib/workspace-history/archive";
import { archiveAndReleaseWorkspaceLocalRecoveryCopies } from "@/lib/workspace-history/local-recovery-vault";
import { workspaceRequiresServerAdoption } from "@/lib/workspace-storage";

const MERGE_RETRY_DELAYS_MS = [0, 200, 600, 1_200] as const;
const AUTOMATIC_RETRY_DELAYS_MS = [2_000, 5_000, 15_000] as const;

type GateState =
  | { status: "checking"; phase: "checking" | "restoring" }
  | { status: "ready" }
  | { status: "error"; message: string };

type CachedArchive = {
  ownerScope: string;
  archiveId: string;
  manifestHash: string;
  manifest: HistoricalWorkspaceArchiveManifest;
};

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

function recoveryFailureMessage(reason: string | null): string {
  if (reason === "quota_exceeded") {
    return "Este dispositivo no tiene espacio local suficiente para completar ahora el histórico. Tus facturas siguen protegidas en el servidor.";
  }
  if (reason === "storage_unavailable") {
    return "El navegador no permite guardar ahora la recuperación. Tus facturas siguen protegidas en el servidor.";
  }
  if (
    reason === "stale_precondition" ||
    reason === "storage_state_unknown" ||
    reason === "verification_failed"
  ) {
    return "Este dispositivo está terminando otra actualización. Factu volverá a comprobar el histórico automáticamente.";
  }
  if (reason === "cloud_snapshot_incomplete") {
    return "El dispositivo todavía está terminando de recibir la copia central. Factu continuará automáticamente cuando esté lista.";
  }
  return "No hemos podido completar todavía la recuperación automática. Tus facturas siguen protegidas en el servidor y el problema ha quedado registrado para soporte.";
}

function receiptMatches(
  receipt: ReturnType<
    typeof useAppStore
  >["data"]["historicalWorkspaceArchiveReceipt"],
  archive: {
    archiveId: string;
    manifestHash: string;
    expectedDocumentCount: number;
  },
): boolean {
  return Boolean(
    receipt?.schema === "CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_RECEIPT_V1" &&
    receipt.archiveId === archive.archiveId &&
    receipt.manifestHash === archive.manifestHash &&
    receipt.documentCount === archive.expectedDocumentCount,
  );
}

export function WorkspaceHistoricalArchiveGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const scope = useWorkspaceStorage();
  const { ready, getCurrentData, mergeHistoricalWorkspaceArchiveDurably } =
    useAppStore();
  const { user, emailConfirmed, requiresEmailConfirmation } = useCloudSync();
  const sequenceRef = useRef(0);
  const mountedRef = useRef(false);
  const runningRef = useRef(false);
  const pendingWakeRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const automaticRetryCountRef = useRef(0);
  const cachedArchiveRef = useRef<CachedArchive | null>(null);
  const lastReportedFailureRef = useRef<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<GateState>({ status: "ready" });

  const restore = useCallback(async () => {
    if (runningRef.current) {
      pendingWakeRef.current = true;
      return;
    }
    runningRef.current = true;
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    const sequence = sequenceRef.current + 1;
    sequenceRef.current = sequence;
    const isCurrent = () => sequenceRef.current === sequence;
    const setCurrentState = (next: GateState) => {
      if (isCurrent()) setState(next);
    };
    let requiresServerAdoption = false;
    let archiveRecoveryRequired = false;
    let failureReason: string | null = null;
    let recoveryCopiesReleased = 0;
    let recoveryCharactersReleased = 0;
    try {
      if (scope.kind !== "user") {
        setCurrentState({ status: "ready" });
        return;
      }
      if (!ready || !user || user.id !== scope.ownerScope) return;
      if (!emailConfirmed || requiresEmailConfirmation) {
        setCurrentState({ status: "ready" });
        return;
      }

      requiresServerAdoption = workspaceRequiresServerAdoption(
        scope.ownerScope,
        localStorage,
      );
      const localData = getCurrentData();
      if (hasLocallyCompleteHistoricalWorkspaceArchive(localData)) {
        setCurrentState({ status: "ready" });
        return;
      }
      if (requiresServerAdoption) {
        setCurrentState({ status: "checking", phase: "checking" });
      }

      const access = await canUseCloudForUser(user.id);
      if (!isCurrent()) return;
      if (!access.allowed) {
        setCurrentState({ status: "ready" });
        return;
      }
      const device = await registerCurrentCloudDevice({
        notifyReactivated: false,
        expectedOwnerScope: user.id,
      });
      if (!isCurrent()) return;
      if (device.error || device.allowed === false) {
        failureReason = "device_verification_failed";
        throw new Error(
          device.message ??
            device.error ??
            "Este dispositivo no pudo verificarse con el servidor.",
        );
      }

      const status = await getHistoricalWorkspaceArchiveStatusFromBrowser({
        expectedOwnerScope: user.id,
      });
      if (!isCurrent()) return;
      if (!status.ok) {
        if (requiresServerAdoption) {
          failureReason = status.code || "archive_status_failed";
          throw new Error(
            "No se pudo comprobar si el servidor conserva tus facturas anteriores. No se restaurará una copia incompleta.",
          );
        }
        setCurrentState({ status: "ready" });
        return;
      }
      if (!status.value || status.value.status !== "ready") {
        setCurrentState({ status: "ready" });
        return;
      }
      const currentData = getCurrentData();
      if (
        receiptMatches(
          currentData.historicalWorkspaceArchiveReceipt,
          status.value,
        ) &&
        hasLocallyCompleteHistoricalWorkspaceArchive(currentData)
      ) {
        setCurrentState({ status: "ready" });
        return;
      }

      archiveRecoveryRequired = true;
      setCurrentState({ status: "checking", phase: "restoring" });
      const cached = cachedArchiveRef.current;
      let manifest: HistoricalWorkspaceArchiveManifest;
      if (
        cached?.ownerScope === user.id &&
        cached.archiveId === status.value.archiveId &&
        cached.manifestHash === status.value.manifestHash
      ) {
        manifest = cached.manifest;
      } else {
        const pulled = await pullHistoricalWorkspaceArchiveFromBrowser({
          expectedOwnerScope: user.id,
        });
        if (!isCurrent()) return;
        if (!pulled.ok || !pulled.value) {
          failureReason = pulled.ok
            ? "archive_missing"
            : pulled.code || "archive_pull_failed";
          throw new Error(
            pulled.ok
              ? "El servidor no devolvió la recuperación histórica confirmada."
              : pulled.message,
          );
        }
        manifest = pulled.value;
        cachedArchiveRef.current = {
          ownerScope: user.id,
          archiveId: status.value.archiveId,
          manifestHash: status.value.manifestHash,
          manifest,
        };
      }

      let applied = false;
      let quotaRecoveryAttempted = false;
      for (
        let attempt = 0;
        attempt < MERGE_RETRY_DELAYS_MS.length;
        attempt += 1
      ) {
        const delayMs = MERGE_RETRY_DELAYS_MS[attempt]!;
        if (delayMs > 0) await wait(delayMs);
        if (!isCurrent()) return;

        const result = mergeHistoricalWorkspaceArchiveDurably(manifest);
        if (result.status === "applied") {
          applied = true;
          automaticRetryCountRef.current = 0;
          lastReportedFailureRef.current = null;
          if (result.value.localKept > 0) {
            void reportAppError({
              severity: "warning",
              area: "sync",
              code: "historical_archive_local_variants_preserved",
              message:
                "La recuperación histórica conservó variantes locales sin reemplazarlas.",
              metadata: {
                archiveDocumentCount: result.value.documentCount,
                localVariantsKept: result.value.localKept,
                centralDocumentsKept: result.value.centralKept,
                documentsAdded: result.value.added,
              },
            });
          }
          break;
        }

        failureReason = result.reason;
        if (
          result.status === "blocked" &&
          result.reason === "quota_exceeded" &&
          !quotaRecoveryAttempted
        ) {
          quotaRecoveryAttempted = true;
          const released = await archiveAndReleaseWorkspaceLocalRecoveryCopies({
            ownerScope: user.id,
            activeStorageKey: scope.storageKey,
            storage: localStorage,
          });
          if (!isCurrent()) return;
          recoveryCopiesReleased += released.released;
          recoveryCharactersReleased += released.releasedCharacters;
          if (released.released > 0) continue;
        }
        if (
          result.reason !== "stale_precondition" &&
          result.reason !== "storage_state_unknown" &&
          result.reason !== "verification_failed"
        ) {
          break;
        }
      }
      if (!applied) {
        throw new Error(recoveryFailureMessage(failureReason));
      }
      cachedArchiveRef.current = null;
      if (recoveryCopiesReleased > 0) {
        void reportAppError({
          severity: "info",
          area: "sync",
          code: "historical_archive_storage_self_healed",
          message:
            "La recuperación histórica liberó una copia local redundante después de preservarla.",
          metadata: {
            recoveryCopiesReleased,
            recoveryCharactersReleased,
          },
        });
      }
      setCurrentState({ status: "ready" });
    } catch (error) {
      if (!requiresServerAdoption && !archiveRecoveryRequired) {
        setCurrentState({ status: "ready" });
        return;
      }
      const reportSignature = `${user?.id ?? "unknown"}:${failureReason ?? "unexpected"}`;
      if (lastReportedFailureRef.current !== reportSignature) {
        lastReportedFailureRef.current = reportSignature;
        void reportAppError({
          severity: "error",
          area: "sync",
          code: `historical_archive_restore_${failureReason ?? "unexpected"}`,
          message:
            "No se pudo completar la recuperación histórica del dispositivo.",
          metadata: {
            reason: failureReason ?? "unexpected",
            localInvoiceCount: getCurrentData().documents.filter(
              (document) => document.type === "factura",
            ).length,
            recoveryCopiesReleased,
            recoveryCharactersReleased,
          },
        });
      }
      setCurrentState({
        status: "error",
        message: failureReason
          ? recoveryFailureMessage(failureReason)
          : error instanceof Error
            ? error.message
            : "No se pudo recuperar el histórico de facturas.",
      });
      if (
        isCurrent() &&
        navigator.onLine &&
        automaticRetryCountRef.current < AUTOMATIC_RETRY_DELAYS_MS.length
      ) {
        const delayMs =
          AUTOMATIC_RETRY_DELAYS_MS[automaticRetryCountRef.current]!;
        automaticRetryCountRef.current += 1;
        retryTimerRef.current = window.setTimeout(() => {
          retryTimerRef.current = null;
          if (mountedRef.current) setRevision((value) => value + 1);
        }, delayMs);
      }
    } finally {
      runningRef.current = false;
      if (pendingWakeRef.current && mountedRef.current) {
        pendingWakeRef.current = false;
        setRevision((value) => value + 1);
      }
    }
  }, [
    emailConfirmed,
    getCurrentData,
    mergeHistoricalWorkspaceArchiveDurably,
    ready,
    requiresEmailConfirmation,
    scope,
    user,
  ]);

  useEffect(() => {
    void restore();
    return () => {
      sequenceRef.current += 1;
    };
  }, [restore, revision]);

  useEffect(() => {
    mountedRef.current = true;

    function wake() {
      if (!navigator.onLine || document.visibilityState !== "visible") return;
      automaticRetryCountRef.current = 0;
      if (runningRef.current) {
        pendingWakeRef.current = true;
        return;
      }
      setRevision((value) => value + 1);
    }

    window.addEventListener("online", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("pageshow", wake);
    window.addEventListener(CLOUD_DEVICE_REACTIVATED_EVENT, wake);
    document.addEventListener("visibilitychange", wake);

    return () => {
      mountedRef.current = false;
      pendingWakeRef.current = false;
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      window.removeEventListener("online", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("pageshow", wake);
      window.removeEventListener(CLOUD_DEVICE_REACTIVATED_EVENT, wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  if (state.status === "ready") return <>{children}</>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-950">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <ArchiveRestore className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-black">
          {state.status === "checking"
            ? state.phase === "restoring"
              ? "Recuperando tus facturas anteriores"
              : "Comprobando tu histórico"
            : "Tus facturas siguen protegidas"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {state.status === "checking"
            ? state.phase === "restoring"
              ? "Estamos descargando la copia verificada del servidor para completar este dispositivo."
              : "Estamos comprobando si este dispositivo necesita recuperar facturas anteriores al servidor central."
            : state.message}
        </p>
        {state.status === "error" ? (
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">
            No cierres sesión ni restaures nada. Factu volverá a intentarlo
            automáticamente.
          </p>
        ) : null}
        {state.status === "checking" ? (
          <RefreshCw className="mx-auto mt-6 h-6 w-6 animate-spin text-blue-600" />
        ) : (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => {
                automaticRetryCountRef.current = 0;
                setRevision((value) => value + 1);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 font-bold text-white hover:bg-blue-700"
            >
              <RefreshCw className="h-5 w-5" />
              Intentar ahora
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
