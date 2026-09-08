"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArchiveRestore, LogOut, RefreshCw } from "lucide-react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useWorkspaceStorage } from "@/context/WorkspaceStorageContext";
import { canUseCloudForUser } from "@/lib/billing/cloud-access";
import { registerCurrentCloudDevice } from "@/lib/cloud/device-client";
import {
  getHistoricalWorkspaceArchiveStatusFromBrowser,
  pullHistoricalWorkspaceArchiveFromBrowser,
} from "@/lib/workspace-history/archive-client";
import { workspaceRequiresServerAdoption } from "@/lib/workspace-storage";

type GateState =
  | { status: "checking" }
  | { status: "ready" }
  | { status: "error"; message: string };

function receiptMatches(
  receipt: ReturnType<typeof useAppStore>["data"]["historicalWorkspaceArchiveReceipt"],
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
  const {
    ready,
    getCurrentData,
    mergeHistoricalWorkspaceArchiveDurably,
  } = useAppStore();
  const {
    user,
    emailConfirmed,
    requiresEmailConfirmation,
    signOut,
  } = useCloudSync();
  const sequenceRef = useRef(0);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<GateState>({ status: "ready" });

  const restore = useCallback(async () => {
    const sequence = sequenceRef.current + 1;
    sequenceRef.current = sequence;
    const isCurrent = () => sequenceRef.current === sequence;
    const setCurrentState = (next: GateState) => {
      if (isCurrent()) setState(next);
    };
    if (scope.kind !== "user") {
      setCurrentState({ status: "ready" });
      return;
    }
    if (!ready || !user || user.id !== scope.ownerScope) return;
    if (!emailConfirmed || requiresEmailConfirmation) {
      setCurrentState({ status: "ready" });
      return;
    }

    const requiresServerAdoption = workspaceRequiresServerAdoption(
      scope.ownerScope,
      localStorage,
    );
    const localData = getCurrentData();
    if (
      localData.historicalWorkspaceArchiveReceipt &&
      localData.documents.length >=
        localData.historicalWorkspaceArchiveReceipt.documentCount
    ) {
      setCurrentState({ status: "ready" });
      return;
    }
    if (requiresServerAdoption) {
      setCurrentState({ status: "checking" });
    }
    try {
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
      if (
        receiptMatches(
          getCurrentData().historicalWorkspaceArchiveReceipt,
          status.value,
        )
      ) {
        setCurrentState({ status: "ready" });
        return;
      }

      const pulled = await pullHistoricalWorkspaceArchiveFromBrowser({
        expectedOwnerScope: user.id,
      });
      if (!isCurrent()) return;
      if (!pulled.ok || !pulled.value) {
        throw new Error(
          pulled.ok
            ? "El servidor no devolvió la recuperación histórica confirmada."
            : pulled.message,
        );
      }

      let applied = false;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const result = mergeHistoricalWorkspaceArchiveDurably(
          getCurrentData(),
          pulled.value,
        );
        if (result.status === "applied") {
          applied = true;
          break;
        }
        if (result.status !== "blocked" || result.reason !== "stale_precondition") {
          break;
        }
      }
      if (!applied) {
        throw new Error(
          "La copia histórica no coincide con los datos de este dispositivo. No se ha reemplazado ninguna factura.",
        );
      }
      setCurrentState({ status: "ready" });
    } catch (error) {
      if (!requiresServerAdoption) {
        setCurrentState({ status: "ready" });
        return;
      }
      setCurrentState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo recuperar el histórico de facturas.",
      });
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

  if (state.status === "ready") return <>{children}</>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-950">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <ArchiveRestore className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-black">
          {state.status === "checking"
            ? "Comprobando tu histórico"
            : "Tus facturas siguen protegidas"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {state.status === "checking"
            ? "Estamos comprobando si este dispositivo necesita recuperar facturas anteriores al servidor central."
            : state.message}
        </p>
        {state.status === "checking" ? (
          <RefreshCw className="mx-auto mt-6 h-6 w-6 animate-spin text-blue-600" />
        ) : (
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setRevision((value) => value + 1)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 font-bold text-white hover:bg-blue-700"
            >
              <RefreshCw className="h-5 w-5" />
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 font-bold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-5 w-5" />
              Cerrar sesión
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
