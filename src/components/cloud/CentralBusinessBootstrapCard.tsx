"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  RefreshCw,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  buildCentralBusinessBootstrapBrowserSnapshot,
  centralBusinessBootstrapSnapshotSignature,
  commitCentralBusinessBootstrapFromBrowser,
  previewCentralBusinessBootstrapFromBrowser,
  type CentralBusinessBootstrapBrowserEntity,
  type CentralBusinessBootstrapBrowserEntityType,
  type CentralBusinessBootstrapBrowserPreview,
  type CentralBusinessBootstrapBrowserPreviewEntry,
} from "@/lib/central-business-authority/bootstrap-client";
import { recordCentralBusinessBootstrapCheckpoint } from "@/lib/central-business-authority/bootstrap-checkpoint";
import { loadCentralBusinessDurableQueue } from "@/lib/central-business-authority/durable-queue";
import { centralAdoptionLegacyQueueSignature } from "@/lib/central-business-authority/legacy-queue-retirement";
import {
  fetchCentralBusinessAuthorityStatusFromBrowser,
  type CentralBusinessAuthorityBrowserStatus,
} from "@/lib/central-business-authority/status-client";

type Notice = {
  tone: "success" | "warning" | "error";
  message: string;
};

const ENTITY_LABELS = {
  customer: "Clientes",
  supplier: "Proveedores",
  product: "Productos",
  user_reminder: "Recordatorios",
  expense: "Gastos",
  recurring_expense: "Gastos fijos",
  quote: "Presupuestos",
  receipt: "Recibos",
  profile: "Perfil",
} as const;

const BOOTSTRAP_ENTITY_TYPES = [
  "customer",
  "supplier",
  "product",
  "user_reminder",
  "expense",
  "recurring_expense",
  "quote",
  "receipt",
  "profile",
] as const satisfies readonly CentralBusinessBootstrapBrowserEntityType[];

const REVIEW_ENTRY_LIMIT = 12;
const CENTRAL_INVOICE_EVENT_PAGE_LIMIT = 50;

function noticeClass(tone: Notice["tone"]): string {
  if (tone === "success") {
    return "border-emerald-200 bg-white text-emerald-900";
  }
  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }
  return "border-red-200 bg-red-50 text-red-950";
}

function isReviewEntry(
  entry: CentralBusinessBootstrapBrowserPreviewEntry,
): boolean {
  return entry.status === "conflict" || entry.status === "central_only";
}

function reviewStatusLabel(
  entry: CentralBusinessBootstrapBrowserPreviewEntry,
): string {
  return entry.status === "conflict" ? "Conflicto" : "Solo servidor";
}

function centralVersionLabel(
  entry: CentralBusinessBootstrapBrowserPreviewEntry,
): string {
  if (entry.centralVersion === null) return "Sin version central";
  return `Version central ${entry.centralVersion}`;
}

export function CentralBusinessBootstrapCard() {
  const {
    ready,
    getCurrentData,
    adoptCentralBusinessEventsFromServer,
    retireLegacyPendingChangesAfterCentralAdoption,
    syncCentralInvoiceAuthorityEvents,
    syncCentralBusinessEvents,
  } = useAppStore();
  const { pendingChangeCount, user, requiresEmailConfirmation } = useCloudSync();
  const ownerScope = user?.id ?? null;
  const [status, setStatus] =
    useState<CentralBusinessAuthorityBrowserStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [preview, setPreview] =
    useState<CentralBusinessBootstrapBrowserPreview | null>(null);
  const [snapshot, setSnapshot] =
    useState<CentralBusinessBootstrapBrowserEntity[] | null>(null);
  const [snapshotSignature, setSnapshotSignature] = useState<string | null>(
    null,
  );
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [adoptConfirmed, setAdoptConfirmed] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (
      !ownerScope ||
      requiresEmailConfirmation ||
      !ready
    ) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    setCheckingStatus(true);
    void fetchCentralBusinessAuthorityStatusFromBrowser()
      .then((result) => {
        if (!cancelled) setStatus(result.ok ? result : null);
      })
      .finally(() => {
        if (!cancelled) setCheckingStatus(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerScope, ready, requiresEmailConfirmation]);

  const appliesToUser = Boolean(status?.activation.appliesToUser);
  if (
    !status ||
    !appliesToUser ||
    !ownerScope ||
    !ready ||
    requiresEmailConfirmation
  ) {
    return null;
  }
  const activeOwnerScope = ownerScope;
  const reviewEntries = preview?.entries.filter(isReviewEntry) ?? [];
  const visibleReviewEntries = reviewEntries.slice(0, REVIEW_ENTRY_LIMIT);
  const hiddenReviewEntryCount = Math.max(
    0,
    reviewEntries.length - visibleReviewEntries.length,
  );
  const hasServerDifferences = Boolean(
    preview &&
      !preview.canCommit &&
      (preview.summary.conflict > 0 || preview.summary.centralOnly > 0),
  );
  const canResetDeviceFromServer = Boolean(preview && pendingChangeCount > 0);
  const canAdoptServerCopy =
    hasServerDifferences || canResetDeviceFromServer;
  const canConfirmBootstrap = Boolean(
    preview?.canCommit && preview.summary.create > 0,
  );

  async function syncAllCentralEvents(): Promise<Notice | null> {
    for (let page = 0; page < 100; page += 1) {
      const result = await syncCentralBusinessEvents(activeOwnerScope, {
        limit: 500,
      });
      if (!result.ok) {
        return {
          tone: result.retryable ? "warning" : "error",
          message: result.message,
        };
      }
      if (!result.hasMore) return null;
    }
    return {
      tone: "warning",
      message:
        "Quedan demasiados eventos por revisar. Vuelve a comprobar antes de migrar.",
    };
  }

  async function syncAllCentralInvoiceEvents(): Promise<Notice | null> {
    for (let page = 0; page < 100; page += 1) {
      const result = await syncCentralInvoiceAuthorityEvents(getCurrentData(), {
        limit: CENTRAL_INVOICE_EVENT_PAGE_LIMIT,
      });
      if (result.status === "blocked") {
        return {
          tone: "warning",
          message:
            "Las facturas locales cambiaron durante la comprobación. La cola antigua se conserva.",
        };
      }
      if (result.status === "indeterminate") {
        return {
          tone: "error",
          message:
            "No se pudo confirmar el guardado local de las facturas centrales. La cola antigua se conserva.",
        };
      }
      const localSync = result.value.localSync;
      if (!localSync.ok) {
        return {
          tone: localSync.conflicts.length > 0 ? "warning" : "error",
          message: `${localSync.message} La cola antigua se conserva.`,
        };
      }
      if (localSync.pulledEvents < CENTRAL_INVOICE_EVENT_PAGE_LIMIT) {
        return null;
      }
    }
    return {
      tone: "warning",
      message:
        "Quedan demasiados eventos de facturas por comprobar. La cola antigua se conserva.",
    };
  }

  function resetPreview() {
    setPreview(null);
    setSnapshot(null);
    setSnapshotSignature(null);
    setIdempotencyKey(null);
    setConfirmed(false);
    setAdoptConfirmed(false);
  }

  function storePreview(
    entities: CentralBusinessBootstrapBrowserEntity[],
    nextPreview: CentralBusinessBootstrapBrowserPreview,
  ) {
    setSnapshot(entities);
    setSnapshotSignature(
      centralBusinessBootstrapSnapshotSignature(entities),
    );
    setIdempotencyKey(
      `CENTRAL_BUSINESS_BOOTSTRAP:${crypto.randomUUID()}`,
    );
    setPreview(nextPreview);
  }

  async function handlePrepare() {
    setPreparing(true);
    setNotice(null);
    resetPreview();
    try {
      if (!status?.summary.writesPossible) {
        setNotice({
          tone: "warning",
          message:
            "El servidor central todavía no supera todas las comprobaciones necesarias.",
        });
        return;
      }

      const syncNotice = await syncAllCentralEvents();
      const queue = loadCentralBusinessDurableQueue(activeOwnerScope);
      if (queue.operations.length > 0) {
        setNotice({
          tone: "warning",
          message:
            "Hay cambios centrales pendientes o en revisión. Resuélvelos antes de preparar la migración.",
        });
        return;
      }
      if (syncNotice?.tone === "warning") {
        setNotice(syncNotice);
        return;
      }

      const entities = buildCentralBusinessBootstrapBrowserSnapshot(
        getCurrentData(),
      );
      const result =
        await previewCentralBusinessBootstrapFromBrowser(entities);
      if (!result.ok) {
        setNotice({
          tone: result.status === 409 ? "warning" : "error",
          message: result.message,
        });
        return;
      }
      storePreview(entities, result.preview);
      if (!result.preview.canCommit) {
        setNotice({
          tone: "warning",
          message:
            "La comparación ha encontrado diferencias. No se migrará nada hasta revisarlas.",
        });
      } else if (syncNotice) {
        setNotice({
          tone: "warning",
          message:
            "La lectura histórica se detuvo, pero la comparación exacta está disponible. Solo podrás enlazarla si confirmas que ambas copias coinciden.",
        });
      }
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo preparar la migración central.",
      });
    } finally {
      setPreparing(false);
    }
  }

  async function handleAdoptServerCopy() {
    const expectedPendingChanges =
      getCurrentData().meta?.pendingChanges ?? [];
    const expectedPendingChangeCount = expectedPendingChanges.length;
    const expectedPendingChangesSignature =
      centralAdoptionLegacyQueueSignature(expectedPendingChanges);
    if (expectedPendingChangeCount !== pendingChangeCount) {
      resetPreview();
      setNotice({
        tone: "warning",
        message:
          "La cola antigua cambió después de comparar. Prepara una vista previa nueva.",
      });
      return;
    }
    const hasBlockingServerDifferences = Boolean(
      preview &&
        !preview.canCommit &&
        (preview.summary.conflict > 0 || preview.summary.centralOnly > 0),
    );
    const isExplicitDeviceReset = Boolean(
      preview && expectedPendingChangeCount > 0,
    );
    if (
      !preview ||
      !snapshotSignature ||
      !adoptConfirmed ||
      (!hasBlockingServerDifferences && !isExplicitDeviceReset)
    ) {
      return;
    }
    setRestoring(true);
    setNotice(null);
    try {
      const currentEntities = buildCentralBusinessBootstrapBrowserSnapshot(
        getCurrentData(),
      );
      if (
        centralBusinessBootstrapSnapshotSignature(currentEntities) !==
        snapshotSignature
      ) {
        resetPreview();
        setNotice({
          tone: "warning",
          message:
            "Los datos de este dispositivo cambiaron después de comparar. Prepara una vista previa nueva.",
        });
        return;
      }

      const adopted = await adoptCentralBusinessEventsFromServer(
        activeOwnerScope,
        { limit: 500, maxPages: 100 },
      );
      if (!adopted.ok) {
        setNotice({
          tone: adopted.retryable ? "warning" : "error",
          message: adopted.message,
        });
        return;
      }

      const restoredEntities =
        buildCentralBusinessBootstrapBrowserSnapshot(getCurrentData());
      const verified =
        await previewCentralBusinessBootstrapFromBrowser(restoredEntities);
      if (!verified.ok) {
        resetPreview();
        setNotice({
          tone: verified.status === 409 ? "warning" : "error",
          message: verified.message,
        });
        return;
      }
      storePreview(restoredEntities, verified.preview);
      if (
        verified.preview.summary.create > 0 ||
        verified.preview.summary.centralOnly > 0 ||
        verified.preview.summary.conflict > 0
      ) {
        setNotice({
          tone: "warning",
          message:
            "La relectura terminó, pero todavía quedan diferencias. No se ha escrito nada en el servidor.",
        });
        return;
      }

      let discardedLegacyChanges = 0;
      if (expectedPendingChangeCount > 0) {
        const invoiceSyncNotice = await syncAllCentralInvoiceEvents();
        if (invoiceSyncNotice) {
          setNotice(invoiceSyncNotice);
          return;
        }
        const retired = await retireLegacyPendingChangesAfterCentralAdoption(
          getCurrentData(),
          expectedPendingChangeCount,
          expectedPendingChangesSignature,
        );
        if (retired.status !== "applied") {
          setNotice({
            tone: retired.status === "blocked" ? "warning" : "error",
            message:
              "La cola antigua cambió o no pudo guardarse durante la adopción. Se conserva intacta; vuelve a comparar.",
          });
          return;
        }
        discardedLegacyChanges = retired.value.discarded;
      }
      setNotice({
        tone: "success",
        message:
          discardedLegacyChanges > 0
            ? `${adopted.applied} ficha(s) centrales adoptada(s) desde el servidor en este dispositivo. Se comprobaron también las facturas centrales y se retiraron ${discardedLegacyChanges} cambio(s) de la cola antigua. No se ha escrito nada en el servidor y la comparación se ha verificado de nuevo.`
            : `${adopted.applied} ficha(s) centrales adoptada(s) desde el servidor en este dispositivo. No se ha escrito nada en el servidor y la comparación se ha verificado de nuevo.`,
      });
      setConfirmed(false);
      setAdoptConfirmed(false);
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo adoptar la copia central en este dispositivo.",
      });
    } finally {
      setRestoring(false);
    }
  }

  async function handleCommit() {
    if (
      !preview ||
      !snapshot ||
      !snapshotSignature ||
      !idempotencyKey ||
      !confirmed ||
      !preview.canCommit
    ) {
      return;
    }
    setCommitting(true);
    setNotice(null);
    try {
      const currentEntities = buildCentralBusinessBootstrapBrowserSnapshot(
        getCurrentData(),
      );
      if (
        centralBusinessBootstrapSnapshotSignature(currentEntities) !==
        snapshotSignature
      ) {
        resetPreview();
        setNotice({
          tone: "warning",
          message:
            "Los datos de este dispositivo cambiaron después de comparar. Prepara una vista previa nueva.",
        });
        return;
      }

      const result = await commitCentralBusinessBootstrapFromBrowser({
        entities: snapshot,
        preview,
        idempotencyKey,
      });
      if (!result.ok) {
        if (result.code === "BOOTSTRAP_PREVIEW_STALE") resetPreview();
        setNotice({
          tone: result.status === 409 ? "warning" : "error",
          message: result.message,
        });
        return;
      }

      await recordCentralBusinessBootstrapCheckpoint({
        ownerScope: activeOwnerScope,
        entities: snapshot,
        preview,
        verifyCurrentSnapshot: () =>
          centralBusinessBootstrapSnapshotSignature(
            buildCentralBusinessBootstrapBrowserSnapshot(getCurrentData()),
          ) === snapshotSignature,
      });
      const syncNotice = await syncAllCentralEvents();
      if (syncNotice) {
        setNotice({
          tone: "warning",
          message: `El servidor confirmó el lote, pero este navegador aún debe terminar de recibir sus versiones. ${syncNotice.message}`,
        });
        return;
      }

      setNotice({
        tone: "success",
        message: `${result.result.createdCount} fichas incorporadas y ${result.result.identicalCount} ya coincidentes. Este dispositivo quedó enlazado con las versiones centrales.`,
      });
      resetPreview();
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo confirmar la migración central.",
      });
    } finally {
      setCommitting(false);
    }
  }

  return (
    <Card className="mb-6 space-y-4 border-indigo-100 bg-indigo-50/60">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700">
          <Database className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900">
            Migrar fichas al servidor central
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Compara clientes, proveedores, productos, recordatorios, gastos,
            gastos fijos, presupuestos, recibos y el perfil de este
            dispositivo antes de convertir PostgreSQL en su autoridad. La
            vista previa no escribe nada y un conflicto bloquea el lote
            completo.
          </p>
        </div>
      </div>

      {checkingStatus ? (
        <p className="text-sm text-slate-500">
          <RefreshCw className="mr-2 inline h-4 w-4 animate-spin align-text-bottom" />
          Comprobando si esta cuenta pertenece al canario…
        </p>
      ) : null}

      {preview ? (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {BOOTSTRAP_ENTITY_TYPES.map(
              (entityType) => {
                const entries = preview.entries.filter(
                  (entry) => entry.entityType === entityType,
                );
                return (
                  <div
                    key={entityType}
                    className="rounded-lg border border-indigo-100 bg-white px-4 py-3"
                  >
                    <p className="text-sm font-bold text-slate-900">
                      {ENTITY_LABELS[entityType]}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {entries.filter((entry) => entry.status === "create").length} nuevas ·{" "}
                      {entries.filter((entry) => entry.status === "identical").length} iguales ·{" "}
                      {entries.filter(
                        (entry) =>
                          entry.status === "conflict" ||
                          entry.status === "central_only",
                      ).length} a revisar
                    </p>
                  </div>
                );
              },
            )}
          </div>

          <div
            className={`rounded-lg border px-4 py-3 text-sm leading-6 ${
              preview.canCommit
                ? "border-emerald-200 bg-white text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-950"
            }`}
          >
            {preview.canCommit ? (
              <CheckCircle2 className="mr-2 inline h-4 w-4 align-text-bottom" />
            ) : (
              <ShieldAlert className="mr-2 inline h-4 w-4 align-text-bottom" />
            )}
            {preview.canCommit
              ? `${preview.summary.local} fichas verificadas. El lote puede confirmarse.`
              : `${preview.summary.conflict} conflictos y ${preview.summary.centralOnly} fichas solo centrales. No se escribirá nada.`}
          </div>

          {!preview.canCommit && reviewEntries.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-white px-4 py-3">
              <p className="text-sm font-bold text-slate-900">
                Entradas que bloquean la migracion
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                {visibleReviewEntries.map((entry) => (
                  <li
                    key={`${entry.entityType}:${entry.entityId}`}
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <span className="font-semibold text-slate-900">
                      {ENTITY_LABELS[entry.entityType]} ·{" "}
                      {reviewStatusLabel(entry)}
                    </span>
                    <span className="ml-2 text-slate-600">
                      {centralVersionLabel(entry)} ·{" "}
                      {entry.centralDeleted
                        ? "Retirada en servidor"
                        : "Activa en servidor"}
                    </span>
                    <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-xs text-slate-700">
                      {entry.entityId}
                    </code>
                  </li>
                ))}
              </ul>
              {hiddenReviewEntryCount > 0 ? (
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {hiddenReviewEntryCount} entrada(s) mas bloquean este lote.
                </p>
              ) : null}
            </div>
          ) : null}

          {canConfirmBootstrap ? (
            <label className="flex items-start gap-3 rounded-lg border border-indigo-100 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                disabled={committing}
                className="mt-1 h-4 w-4 shrink-0 accent-indigo-700"
              />
              <span>
                He revisado la comparación. Autorizo crear únicamente las
                fichas ausentes; las coincidentes no se reescriben y cualquier
                diferencia abortará todo el lote.
              </span>
            </label>
          ) : null}

          {canAdoptServerCopy ? (
            <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                checked={adoptConfirmed}
                onChange={(event) =>
                  setAdoptConfirmed(event.target.checked)
                }
                disabled={restoring}
                className="mt-1 h-4 w-4 shrink-0 accent-amber-700"
              />
              <span>
                {canResetDeviceFromServer
                  ? `Autorizo reemplazar en este dispositivo clientes, proveedores, productos, recordatorios, gastos, gastos fijos, presupuestos, recibos y perfil por la copia central. Se descartarán aquí ${preview.summary.create} ficha(s) que solo existen en este dispositivo, se comprobarán las facturas centrales y se retirarán ${pendingChangeCount} cambio(s) de la cola antigua.`
                  : "Entiendo que este dispositivo usará la copia del servidor para clientes, proveedores, productos, recordatorios, gastos, gastos fijos, presupuestos, recibos y perfil."} No
                escribe en el servidor ni modifica el contenido de las facturas
                emitidas.
              </span>
            </label>
          ) : null}
        </div>
      ) : null}

      {notice ? (
        <p
          className={`rounded-lg border px-4 py-3 text-sm leading-6 ${noticeClass(notice.tone)}`}
        >
          {notice.tone === "success" ? (
            <CheckCircle2 className="mr-2 inline h-4 w-4 align-text-bottom" />
          ) : (
            <TriangleAlert className="mr-2 inline h-4 w-4 align-text-bottom" />
          )}
          {notice.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() => void handlePrepare()}
          disabled={
            preparing ||
            committing ||
            restoring ||
            !status?.summary.writesPossible
          }
          aria-busy={preparing}
        >
          <RefreshCw className={`h-4 w-4 ${preparing ? "animate-spin" : ""}`} />
          {preparing ? "Comparando…" : "Preparar comparación"}
        </Button>
        {canConfirmBootstrap ? (
          <Button
            onClick={() => void handleCommit()}
            disabled={!confirmed || preparing || committing || restoring}
            aria-busy={committing}
          >
            <Database className="h-4 w-4" />
            {committing
              ? "Confirmando con el servidor…"
              : "Confirmar migración central"}
          </Button>
        ) : null}
        {canAdoptServerCopy ? (
          <Button
            onClick={() => void handleAdoptServerCopy()}
            disabled={
              !adoptConfirmed || preparing || committing || restoring
            }
            aria-busy={restoring}
          >
            <RefreshCw
              className={`h-4 w-4 ${restoring ? "animate-spin" : ""}`}
            />
            {restoring
              ? "Adoptando servidor…"
              : "Usar servidor en este dispositivo"}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
