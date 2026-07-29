"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CloudDownload, ShieldAlert, TriangleAlert } from "lucide-react";

import {
  buildCentralBusinessConflictReviewItems,
  type CentralBusinessConflictReviewItem,
} from "@/components/cloud/central-business-conflict-presentation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  CENTRAL_BUSINESS_DURABLE_QUEUE_CHANGED_EVENT,
  loadCentralBusinessDurableQueue,
  type CentralBusinessQueuedOperation,
} from "@/lib/central-business-authority/durable-queue";

type Notice = {
  tone: "success" | "error";
  message: string;
};

function resolutionCopy(item: CentralBusinessConflictReviewItem): string {
  return item.operationCount === 1
    ? "Se descartará este cambio local pendiente y se descargará la versión confirmada por el servidor."
    : `Se descartarán los ${item.operationCount} cambios locales pendientes de este elemento y se descargará la versión confirmada por el servidor.`;
}

export function CentralBusinessConflictRecoveryCard() {
  const {
    data,
    ready,
    resolveCentralBusinessConflictKeepingServer,
  } = useAppStore();
  const { user, emailConfirmed } = useCloudSync();
  const ownerScope = user?.id ?? null;
  const [operations, setOperations] = useState<
    CentralBusinessQueuedOperation[]
  >([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const refresh = useCallback(() => {
    if (!ownerScope) {
      setOperations([]);
      setLoadError(null);
      return;
    }
    try {
      const state = loadCentralBusinessDurableQueue(ownerScope);
      setOperations(state.operations);
      setLoadError(null);
    } catch (error) {
      setOperations([]);
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudo revisar la cola central guardada.",
      );
    }
  }, [ownerScope]);

  useEffect(() => {
    refresh();
    function onQueueChanged(event: Event) {
      const detail =
        event instanceof CustomEvent
          ? (event.detail as { ownerScope?: unknown } | undefined)
          : undefined;
      if (!detail || detail.ownerScope === ownerScope) refresh();
    }
    window.addEventListener(
      CENTRAL_BUSINESS_DURABLE_QUEUE_CHANGED_EVENT,
      onQueueChanged,
    );
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(
        CENTRAL_BUSINESS_DURABLE_QUEUE_CHANGED_EVENT,
        onQueueChanged,
      );
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [ownerScope, refresh]);

  const items = useMemo(
    () => buildCentralBusinessConflictReviewItems(data, operations),
    [data, operations],
  );

  if (
    !ownerScope ||
    !emailConfirmed ||
    (!loadError && items.length === 0 && !notice)
  ) {
    return null;
  }

  async function keepServerVersion(item: CentralBusinessConflictReviewItem) {
    if (!ownerScope || !acknowledged[item.key]) return;
    setResolvingKey(item.key);
    setNotice(null);
    try {
      const result = await resolveCentralBusinessConflictKeepingServer({
        ownerScope,
        entityType: item.entityType,
        entityId: item.entityId,
      });
      if (result.ok) {
        setAcknowledged((current) => ({ ...current, [item.key]: false }));
        setNotice({
          tone: "success",
          message: `Versión central aplicada. Se retiraron ${result.discarded} cambio(s) local(es) pendiente(s).`,
        });
      } else {
        setNotice({ tone: "error", message: result.message });
      }
    } finally {
      setResolvingKey(null);
      refresh();
    }
  }

  return (
    <Card className="mb-6 space-y-4 border-amber-200 bg-amber-50/70">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700">
          <ShieldAlert className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900">
            Cambios centrales que requieren revisión
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            Factu ha detenido estas operaciones para no sobrescribir cambios de
            otro dispositivo.
          </p>
        </div>
      </div>

      {loadError ? (
        <p className="rounded-lg border border-red-200 bg-white px-4 py-3 text-sm text-red-900">
          <TriangleAlert className="mr-2 inline h-4 w-4 align-text-bottom" />
          {loadError}
        </p>
      ) : null}

      {items.map((item) => {
        const resolving = resolvingKey === item.key;
        return (
          <section
            key={item.key}
            className="space-y-3 border-t border-amber-200 pt-4 first:border-t-0 first:pt-0"
          >
            <div>
              <p className="font-bold text-slate-950">{item.label}</p>
              <p className="mt-1 text-sm text-slate-700">
                Este dispositivo: {item.operationText} sobre{" "}
                {item.expectedVersionText}. Servidor: versión más reciente
                protegida.
              </p>
              <p className="mt-1 text-sm text-slate-600">{item.issue}</p>
            </div>

            {item.canKeepServer ? (
              <>
                <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0"
                    checked={Boolean(acknowledged[item.key])}
                    onChange={(event) =>
                      setAcknowledged((current) => ({
                        ...current,
                        [item.key]: event.target.checked,
                      }))
                    }
                    disabled={resolving}
                  />
                  <span>{resolutionCopy(item)}</span>
                </label>
                <Button
                  variant="secondary"
                  disabled={
                    !ready || !acknowledged[item.key] || resolvingKey !== null
                  }
                  onClick={() => void keepServerVersion(item)}
                >
                  <CloudDownload className="h-5 w-5" />
                  {resolving
                    ? "Descargando versión central…"
                    : "Conservar versión del servidor"}
                </Button>
              </>
            ) : (
              <p className="rounded-lg border border-red-200 bg-white px-4 py-3 text-sm leading-6 text-red-900">
                Este conflicto afecta a la identidad de la operación y no se
                puede resolver automáticamente. Los datos quedan intactos.
              </p>
            )}
          </section>
        );
      })}

      {notice ? (
        <p
          className={`rounded-lg border bg-white px-4 py-3 text-sm ${
            notice.tone === "success"
              ? "border-emerald-200 text-emerald-900"
              : "border-red-200 text-red-900"
          }`}
        >
          {notice.message}
        </p>
      ) : null}
    </Card>
  );
}
