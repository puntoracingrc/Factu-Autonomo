"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArchiveRestore, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { registerCurrentCloudDevice } from "@/lib/cloud/device-client";
import {
  historicalWorkspaceDocuments,
  type HistoricalWorkspaceArchiveManifest,
} from "@/lib/workspace-history/archive";
import {
  getHistoricalWorkspaceArchiveStatusFromBrowser,
  uploadHistoricalWorkspaceArchiveFromBrowser,
} from "@/lib/workspace-history/archive-client";
import type { HistoricalWorkspaceArchiveStatusRow } from "@/lib/workspace-history/archive-route-handler";

type CardState =
  | { status: "loading" }
  | { status: "idle"; archive: HistoricalWorkspaceArchiveStatusRow | null }
  | { status: "uploading"; stored: number; total: number }
  | { status: "ready"; archive: HistoricalWorkspaceArchiveStatusRow }
  | { status: "error"; message: string };

export function HistoricalInvoiceArchiveCard() {
  const {
    data,
    getCurrentData,
    mergeHistoricalWorkspaceArchiveDurably,
  } = useAppStore();
  const { user, emailConfirmed } = useCloudSync();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<CardState>({ status: "loading" });
  const localHistoricalCount = useMemo(
    () => historicalWorkspaceDocuments(data.documents).length,
    [data.documents],
  );

  const refresh = useCallback(async () => {
    if (!user || !emailConfirmed) {
      setState({ status: "idle", archive: null });
      return;
    }
    setState({ status: "loading" });
    const result = await getHistoricalWorkspaceArchiveStatusFromBrowser({
      expectedOwnerScope: user.id,
    });
    if (!result.ok) {
      setState({ status: "error", message: result.message });
      return;
    }
    setState(
      result.value?.status === "ready"
        ? { status: "ready", archive: result.value }
        : { status: "idle", archive: result.value },
    );
  }, [emailConfirmed, user]);

  useEffect(() => {
    void refresh();
  }, [refresh, revision]);

  async function applyReceipt(manifest: HistoricalWorkspaceArchiveManifest) {
    const result = mergeHistoricalWorkspaceArchiveDurably(manifest);
    if (result.status !== "applied") {
      throw new Error(
        "El archivo quedó verificado en el servidor, pero este dispositivo cambió durante el proceso. Recarga para aplicarlo.",
      );
    }
  }

  async function upload() {
    if (!user || localHistoricalCount === 0) return;
    const accepted = window.confirm(
      `Se guardarán ${localHistoricalCount} facturas anteriores al servidor central como recuperación inmutable de esta empresa. No se emitirán de nuevo ni se borrará la copia del PC. ¿Continuar?`,
    );
    if (!accepted) return;

    setState({ status: "uploading", stored: 0, total: localHistoricalCount });
    try {
      const device = await registerCurrentCloudDevice({
        notifyReactivated: false,
        expectedOwnerScope: user.id,
      });
      if (device.error || device.allowed === false) {
        throw new Error(
          device.message ??
            device.error ??
            "Este dispositivo no pudo verificarse con el servidor.",
        );
      }
      const snapshot = getCurrentData();
      const result = await uploadHistoricalWorkspaceArchiveFromBrowser(
        snapshot.documents,
        {
          dependencies: { expectedOwnerScope: user.id },
          onProgress: (stored, total) =>
            setState({ status: "uploading", stored, total }),
        },
      );
      if (!result.ok) throw new Error(result.message);
      await applyReceipt(result.value.manifest);
      setState({ status: "ready", archive: result.value.archive });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo preparar la recuperación histórica.",
      });
    }
  }

  if (!user) return null;
  if (
    localHistoricalCount === 0 &&
    (state.status === "loading" ||
      state.status === "error" ||
      (state.status === "idle" && state.archive === null))
  ) {
    return null;
  }

  const serverArchive =
    state.status === "ready" || state.status === "idle" ? state.archive : null;
  const readyCount =
    state.status === "ready" ? state.archive.storedDocumentCount : null;

  return (
    <Card className="mb-6 space-y-4 border-blue-100 bg-blue-50/40">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700">
          <ArchiveRestore className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-bold text-slate-900">
            Recuperación de facturas anteriores
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Conserva una sola copia verificada de las facturas creadas antes de
            usar el servidor central. Sirve para reconstruir un móvil o un
            navegador nuevo; no vuelve a emitirlas ni cambia su numeración.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-blue-100 bg-white px-4 py-3 text-sm text-slate-700">
        <p>
          <strong>En este dispositivo:</strong> {localHistoricalCount} facturas
          anteriores al servidor central.
        </p>
        <p className="mt-1">
          <strong>En recuperación:</strong>{" "}
          {readyCount !== null
            ? `${readyCount} verificadas y listas`
            : serverArchive?.status === "uploading"
              ? `${serverArchive.storedDocumentCount} de ${serverArchive.expectedDocumentCount} recibidas`
              : "todavía no preparada"}
        </p>
      </div>

      {state.status === "ready" ? (
        <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          Recuperación completa disponible para tus otros dispositivos.
        </p>
      ) : null}
      {state.status === "error" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {state.status !== "ready" ? (
          <Button
            type="button"
            onClick={() => void upload()}
            disabled={
              !user ||
              !emailConfirmed ||
              localHistoricalCount === 0 ||
              state.status === "uploading" ||
              state.status === "loading"
            }
          >
            {state.status === "uploading" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {state.status === "uploading"
              ? `Verificando ${state.stored} de ${state.total}`
              : serverArchive?.status === "uploading"
                ? "Continuar preparación"
                : "Preparar recuperación completa"}
          </Button>
        ) : null}
        {state.status === "error" ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw className="h-4 w-4" />
            Volver a comprobar
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
