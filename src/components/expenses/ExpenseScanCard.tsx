"use client";

import {
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  RotateCcw,
  ScanLine,
  ShoppingBag,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import {
  AiProcessingConsentNotice,
  useAiProcessingConsent,
} from "@/components/legal/AiProcessingConsentNotice";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import {
  buildAiUsageMeter,
  PRO_EXPENSE_SCANS_PER_MONTH,
  type ScanQuota,
} from "@/lib/billing/scan-limits";
import { aiLearningAccountForEmail } from "@/lib/ai-learning";
import { scanPackLabel } from "@/lib/billing/scan-packs";
import { prepareScanFile } from "@/lib/expense-scan/prepare-scan-file";
import {
  enqueueExpenseScanFiles,
  updateExpenseScanQueueItem,
  type ExpenseScanQueueItem,
  type ExpenseScanQueueStatus,
} from "@/lib/expense-scan/scan-queue";
import type { ExpenseScanPayload } from "@/lib/expense-scan/schema";
import { markFactuFeatureUsed } from "@/lib/factu/feature-usage";

interface ExpenseScanCardProps {
  onScanned: (
    payload: ExpenseScanPayload,
    options?: { fileName?: string; append?: boolean },
  ) => void;
  onScanProgress?: (
    progress: { current: number; total: number; fileName?: string } | null,
  ) => void;
}

const MAX_SCAN_FILES = 10;

const QUEUE_STATUS_COPY: Readonly<
  Record<ExpenseScanQueueStatus, { label: string; className: string }>
> = {
  PREPARED: {
    label: "Preparado",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  ANALYZING: {
    label: "Analizando",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  READ: {
    label: "Leído",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  NEEDS_REVIEW: {
    label: "Necesita revisión",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  NOT_RECOGNIZED: {
    label: "No reconocido",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

export function ExpenseScanCard({
  onScanned,
  onScanProgress,
}: ExpenseScanCardProps) {
  const searchParams = useSearchParams();
  const { billingEnabled, isPro, checkoutScanPack } = useBilling();
  const { user } = useCloudSync();
  const demoMode = useDemoWorkspaceMode();
  const inputRef = useRef<HTMLInputElement>(null);
  const [quota, setQuota] = useState<ScanQuota | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [buyingPack, setBuyingPack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [scanQueue, setScanQueue] = useState<
    readonly ExpenseScanQueueItem<File>[]
  >([]);
  const aiConsent = useAiProcessingConsent();
  const checkoutStatus = searchParams.get("checkout");
  const needsAccount = billingEnabled && !user;
  const learningAccess = aiLearningAccountForEmail(user?.email);
  const noScansLeft =
    quota !== null &&
    quota.remaining <= 0 &&
    quota.remaining !== Number.MAX_SAFE_INTEGER;
  const unlimitedScanMode =
    learningAccess.allowed || quota?.remainingUnits === Number.MAX_SAFE_INTEGER;
  const scanBatchLimit = unlimitedScanMode
    ? Number.MAX_SAFE_INTEGER
    : MAX_SCAN_FILES;
  const scanControlsDisabled =
    demoMode || scanning || noScansLeft || !aiConsent.accepted;
  const dropDisabled =
    demoMode || scanning || noScansLeft || !aiConsent.accepted;
  const includedScanLimit =
    quota?.limit && quota.limit !== Number.MAX_SAFE_INTEGER
      ? quota.limit
      : PRO_EXPENSE_SCANS_PER_MONTH;
  const usageLabel = useMemo(() => {
    if (!quota) return null;
    if (quota.remainingUnits === Number.MAX_SAFE_INTEGER) {
      return "sin límite de pruebas";
    }
    return `${buildAiUsageMeter(quota).percentRemaining}% restante`;
  }, [quota]);
  const scanBatchHint = unlimitedScanMode
    ? "todos los que necesites para la prueba"
    : `hasta ${MAX_SCAN_FILES}`;
  const preparedCount = scanQueue.filter(
    (item) => item.status === "PREPARED",
  ).length;

  const loadQuota = useCallback(async () => {
    if (demoMode) {
      setQuota(null);
      return;
    }
    if (billingEnabled && !user) {
      setQuota(null);
      return;
    }
    setLoadingQuota(true);
    try {
      const headers: HeadersInit = {};
      if (user) {
        const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
        const supabase = await getSupabaseClientAsync();
        const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
        const token = data.session?.access_token;
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch("/api/expenses/scan", { headers });
      if (res.ok) {
        const body = (await res.json()) as { quota: ScanQuota };
        setQuota(body.quota);
      }
    } finally {
      setLoadingQuota(false);
    }
  }, [billingEnabled, demoMode, user]);

  useEffect(() => {
    void loadQuota();
  }, [loadQuota, checkoutStatus]);

  async function handleBuyScanPack() {
    setBuyingPack(true);
    setError(null);
    const result = await checkoutScanPack();
    setBuyingPack(false);
    if (result) setError(result);
  }

  async function scanFile(file: File): Promise<{
    data?: ExpenseScanPayload;
    error?: string;
    quota?: ScanQuota;
  }> {
    let uploadFile = file;
    try {
      const prepared = await prepareScanFile(file);
      uploadFile = prepared.file;
    } catch (err) {
      return {
        error:
          err instanceof Error
            ? err.message
            : "No se pudo preparar la imagen para escanear.",
      };
    }

    const form = new FormData();
    form.append("file", uploadFile);

    const headers: HeadersInit = {};
    if (user) {
      const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
      const supabase = await getSupabaseClientAsync();
      const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
      const token = data.session?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch("/api/expenses/scan", {
      method: "POST",
      headers,
      body: form,
    });
    const body = (await res.json()) as {
      data?: ExpenseScanPayload;
      error?: string;
      quota?: ScanQuota;
    };

    return {
      data: res.ok ? body.data : undefined,
      error:
        !res.ok || !body.data
          ? body.error ?? "No se pudo escanear la factura."
          : undefined,
      quota: body.quota,
    };
  }

  function queueFiles(fileList: FileList | null | undefined) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    setError(null);
    setWarnings([]);

    if (scanning) return;

    if (demoMode) {
      setError("En modo demo no se usa IA. Registra gastos de prueba a mano.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (!aiConsent.accepted) {
      setError("Acepta primero el aviso de tratamiento con IA.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (noScansLeft) {
      setError("No te quedan escaneos disponibles.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const result = enqueueExpenseScanFiles({
      current: scanQueue,
      incoming: files,
      limit: scanBatchLimit,
    });
    if (result.limitExceeded) {
      setError(
        `La cola admite ${scanBatchHint}. Quita alguno antes de añadir más.`,
      );
    } else {
      setScanQueue(result.items);
    }
    if (result.duplicateNames.length > 0) {
      setWarnings([
        `${result.duplicateNames.length} archivo${
          result.duplicateNames.length === 1
            ? " repetido se ha"
            : "s repetidos se han"
        } omitido de la cola.`,
      ]);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function analyzeQueuedFiles() {
    const itemsToAnalyze = scanQueue.filter(
      (item) => item.status === "PREPARED",
    );
    if (itemsToAnalyze.length === 0 || scanning) return;

    setError(null);
    setWarnings([]);

    if (demoMode) {
      setError("En modo demo no se usa IA. Registra gastos de prueba a mano.");
      return;
    }

    if (!aiConsent.accepted) {
      setError("Acepta primero el aviso de tratamiento con IA.");
      return;
    }

    if (noScansLeft) {
      setError("No te quedan escaneos disponibles.");
      return;
    }

    setScanning(true);
    let activeQueueItemId: string | null = null;

    try {
      const allWarnings: string[] = [];
      const errors: string[] = [];
      let imported = 0;

      for (const [index, item] of itemsToAnalyze.entries()) {
        activeQueueItemId = item.id;
        setScanQueue((current) =>
          updateExpenseScanQueueItem(current, item.id, {
            status: "ANALYZING",
            message: null,
          }),
        );
        onScanProgress?.({
          current: index + 1,
          total: itemsToAnalyze.length,
          fileName: item.file.name,
        });
        const result = await scanFile(item.file);
        if (result.quota) setQuota(result.quota);

        if (!result.data) {
          const message = result.error ?? "No se pudo leer el archivo.";
          errors.push(`${item.file.name}: ${message}`);
          setScanQueue((current) =>
            updateExpenseScanQueueItem(current, item.id, {
              status: "NOT_RECOGNIZED",
              message,
            }),
          );
          activeQueueItemId = null;
          continue;
        }

        const data = result.data;
        if (data.warnings.length > 0) {
          allWarnings.push(
            ...data.warnings.map(
              (warning) => `${item.file.name}: ${warning}`,
            ),
          );
        }
        setScanQueue((current) =>
          updateExpenseScanQueueItem(current, item.id, {
            status: data.warnings.length > 0 ? "NEEDS_REVIEW" : "READ",
            message:
              data.warnings.length > 0
                ? data.warnings.join(" · ")
                : "Datos preparados para revisar antes de guardar.",
          }),
        );
        onScanned(data, {
          fileName: item.file.name,
          append: imported > 0,
        });
        imported += 1;
        activeQueueItemId = null;
      }

      if (allWarnings.length > 0) setWarnings(allWarnings);
      if (errors.length > 0) setError(errors.join(" · "));
      if (imported > 0) markFactuFeatureUsed("expense_scan");
    } catch {
      const message =
        "Error de conexión. Comprueba tu internet e inténtalo de nuevo.";
      setError(message);
      if (activeQueueItemId) {
        setScanQueue((current) =>
          updateExpenseScanQueueItem(current, activeQueueItemId!, {
            status: "NOT_RECOGNIZED",
            message,
          }),
        );
      }
    } finally {
      setScanning(false);
      onScanProgress?.(null);
    }
  }

  function removeQueuedFile(id: string) {
    if (scanning) return;
    setScanQueue((current) => current.filter((item) => item.id !== id));
  }

  function retryQueuedFile(id: string) {
    if (scanning) return;
    setError(null);
    setScanQueue((current) =>
      updateExpenseScanQueueItem(current, id, {
        status: "PREPARED",
        message: null,
      }),
    );
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = dropDisabled ? "none" : "copy";
    if (!dropDisabled) setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    const related = event.relatedTarget;
    if (related instanceof Node && event.currentTarget.contains(related)) {
      return;
    }
    setDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (dropDisabled) return;
    queueFiles(event.dataTransfer.files);
  }

  return (
    <Card className="space-y-4 border-sky-200 bg-sky-50/60">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
          <ScanLine className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Escanear factura o ticket
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Foto, imagen o PDF: la app rellena proveedor, importe e IVA.
            Siempre revisa antes de guardar.
          </p>
          <p className="mt-2 rounded-xl border border-sky-100 bg-white/80 px-3 py-2 text-sm text-slate-700">
            Para crear productos desde el escaneo, revisa la factura y deja
            marcada cada línea que quieras llevar a Productos. En lotes, revisa
            cada factura antes de guardarla.
          </p>
        </div>
      </div>

      {checkoutStatus === "scan_pack_success" && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Pack de escaneos añadido. Ya puedes volver a escanear facturas.
        </p>
      )}

      {checkoutStatus === "scan_pack_cancel" && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          Compra cancelada. Puedes intentarlo de nuevo cuando quieras.
        </p>
      )}

      {demoMode ? (
        <p className="rounded-xl bg-white px-4 py-3 text-sm text-amber-800">
          En modo demo no se escanean facturas ni tickets con IA. Puedes crear
          gastos ficticios manualmente para ver el flujo.
        </p>
      ) : needsAccount ? (
        <p className="rounded-xl bg-white px-4 py-3 text-sm text-slate-700">
          Necesitas{" "}
          <Link href="/configuracion" className="font-semibold text-sky-700 underline">
            crear cuenta e iniciar sesión
          </Link>{" "}
          para usar el escáner (2 escaneos de prueba gratis; con Pro,{" "}
          {PRO_EXPENSE_SCANS_PER_MONTH} escaneos al mes incluidos, sin coste
          extra).
        </p>
      ) : (
        <>
          <AiProcessingConsentNotice
            accepted={aiConsent.accepted}
            onAccepted={() => {
              aiConsent.accept();
              setError(null);
            }}
          />

          {(usageLabel || loadingQuota) && (
            <p className="text-sm text-slate-600">
              Consumo IA restante:{" "}
              <strong>{usageLabel ?? "calculando…"}</strong>
              {loadingQuota && usageLabel ? " (actualizando…)" : null}
            </p>
          )}
          {learningAccess.allowed ? (
            <Link
              href="/admin?seccion=aprendizaje"
              className="inline-flex text-sm font-bold text-sky-700 underline"
            >
              Corregir lecturas IA en Admin
            </Link>
          ) : null}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*,application/pdf,.pdf"
            multiple
            className="hidden"
            disabled={scanControlsDisabled}
            onChange={(event) => queueFiles(event.target.files)}
          />

          <div
            role="group"
            aria-label="Archivos de gastos"
            className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100"
                : "border-sky-200 bg-white/60"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload
              className="mx-auto h-7 w-7 text-sky-700"
              aria-hidden="true"
            />
            <p className="mt-2 font-bold text-slate-900" aria-live="polite">
              {dragActive
                ? "Suelta aquí las facturas y tickets"
                : "Arrastra aquí tus facturas y tickets"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              PDF, PNG, JPG o WebP · {scanBatchHint}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Primero prepara la cola. No analizaremos nada hasta que pulses
              Analizar.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                variant="secondary"
                disabled={scanControlsDisabled}
                onClick={() => {
                  if (inputRef.current) {
                    inputRef.current.accept =
                      "image/jpeg,image/png,image/webp,image/*";
                    inputRef.current.setAttribute("capture", "environment");
                    inputRef.current.click();
                  }
                }}
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analizando…
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    {noScansLeft ? "Sin escaneos" : "Hacer foto"}
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                disabled={scanControlsDisabled}
                onClick={() => {
                  if (inputRef.current) {
                    inputRef.current.accept =
                      "image/jpeg,image/png,image/webp,image/*,application/pdf,.pdf";
                    inputRef.current.removeAttribute("capture");
                    inputRef.current.click();
                  }
                }}
              >
                <FileText className="h-4 w-4" />
                {noScansLeft ? "Sin escaneos" : "Elegir archivos"}
              </Button>
            </div>
          </div>

          {scanQueue.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">
                    {scanQueue.length} archivo
                    {scanQueue.length === 1 ? "" : "s"} en la cola
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Puedes añadir más o quitar alguno antes de analizar.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={scanning}
                  onClick={() => {
                    setScanQueue([]);
                    setError(null);
                    setWarnings([]);
                  }}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Quitar todos
                </button>
              </div>

              <ul className="mt-3 space-y-2">
                {scanQueue.map((item) => {
                  const status = QUEUE_STATUS_COPY[item.status];
                  return (
                    <li
                      key={item.id}
                      className="rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {item.status === "ANALYZING" ? (
                          <Loader2
                            className="h-4 w-4 shrink-0 animate-spin text-blue-600"
                            aria-hidden="true"
                          />
                        ) : item.status === "READ" ? (
                          <CheckCircle2
                            className="h-4 w-4 shrink-0 text-emerald-600"
                            aria-hidden="true"
                          />
                        ) : item.status === "NEEDS_REVIEW" ? (
                          <TriangleAlert
                            className="h-4 w-4 shrink-0 text-amber-600"
                            aria-hidden="true"
                          />
                        ) : item.status === "NOT_RECOGNIZED" ? (
                          <TriangleAlert
                            className="h-4 w-4 shrink-0 text-red-600"
                            aria-hidden="true"
                          />
                        ) : (
                          <FileText
                            className="h-4 w-4 shrink-0 text-slate-500"
                            aria-hidden="true"
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                          {item.file.name}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-bold ${status.className}`}
                        >
                          {status.label}
                        </span>
                        {item.status === "NOT_RECOGNIZED" && (
                          <button
                            type="button"
                            disabled={scanning}
                            onClick={() => retryQueuedFile(item.id)}
                            className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RotateCcw
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Reintentar
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={scanning}
                          onClick={() => removeQueuedFile(item.id)}
                          aria-label={`Quitar ${item.file.name}`}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      {item.message && (
                        <p className="mt-1 pr-12 text-xs text-slate-600">
                          {item.message}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>

              {preparedCount > 0 && (
                <Button
                  type="button"
                  className="mt-4"
                  disabled={scanning || scanControlsDisabled}
                  onClick={() => void analyzeQueuedFiles()}
                >
                  {scanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analizando…
                    </>
                  ) : (
                    <>
                      <ScanLine className="h-4 w-4" />
                      Analizar {preparedCount} documento
                      {preparedCount === 1 ? "" : "s"}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {noScansLeft && (
            <div className="space-y-3">
              <p className="text-sm text-violet-800">
                {isPro ? (
                  <>
                    Has usado los {includedScanLimit} escaneos incluidos este
                    mes. Puedes comprar un pack extra o esperar al mes que viene.
                  </>
                ) : (
                  <>
                    Pasa a{" "}
                    <Link href="/precios" className="font-semibold underline">
                      Pro
                    </Link>{" "}
                    para escanear hasta {PRO_EXPENSE_SCANS_PER_MONTH} facturas al
                    mes (incluido en el plan, sin coste extra).
                  </>
                )}
              </p>
              {isPro && billingEnabled && (
                <Button
                  fullWidth
                  disabled={buyingPack}
                  onClick={() => void handleBuyScanPack()}
                >
                  {buyingPack ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Abriendo pago…
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4" />
                      Comprar {scanPackLabel()}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {warnings.length > 0 && (
        <ul className="list-inside list-disc text-sm text-amber-800">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
