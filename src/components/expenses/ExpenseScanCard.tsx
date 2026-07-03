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
import { Camera, FileText, Loader2, ScanLine, ShoppingBag } from "lucide-react";
import {
  AiProcessingConsentNotice,
  useAiProcessingConsent,
} from "@/components/legal/AiProcessingConsentNotice";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  buildAiUsageMeter,
  PRO_EXPENSE_SCANS_PER_MONTH,
  type ScanQuota,
} from "@/lib/billing/scan-limits";
import { aiLearningAccountForEmail } from "@/lib/ai-learning";
import { scanPackLabel } from "@/lib/billing/scan-packs";
import { prepareScanFile } from "@/lib/expense-scan/prepare-scan-file";
import type { ExpenseScanPayload } from "@/lib/expense-scan/schema";
import { markFactuFeatureUsed } from "@/lib/factu/feature-usage";

interface ExpenseScanCardProps {
  onScanned: (
    payload: ExpenseScanPayload,
    options?: { fileName?: string; append?: boolean },
  ) => void;
}

const MAX_SCAN_FILES = 10;

export function ExpenseScanCard({ onScanned }: ExpenseScanCardProps) {
  const searchParams = useSearchParams();
  const { billingEnabled, isPro, checkoutScanPack } = useBilling();
  const { user } = useCloudSync();
  const inputRef = useRef<HTMLInputElement>(null);
  const [quota, setQuota] = useState<ScanQuota | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [buyingPack, setBuyingPack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const aiConsent = useAiProcessingConsent();
  const checkoutStatus = searchParams.get("checkout");
  const needsAccount = billingEnabled && !user;
  const noScansLeft =
    quota !== null &&
    quota.remaining <= 0 &&
    quota.remaining !== Number.MAX_SAFE_INTEGER;
  const scanControlsDisabled = scanning || noScansLeft || !aiConsent.accepted;
  const dropDisabled = scanning || noScansLeft;
  const usageLabel = useMemo(() => {
    if (!quota || quota.remainingUnits === Number.MAX_SAFE_INTEGER) return null;
    return `${buildAiUsageMeter(quota).percentRemaining}% restante`;
  }, [quota]);
  const learningAccess = aiLearningAccountForEmail(user?.email);

  const loadQuota = useCallback(async () => {
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
  }, [billingEnabled, user]);

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

  async function handleFiles(fileList: FileList | null | undefined) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    setError(null);
    setWarnings([]);

    if (scanning) return;

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

    if (files.length > MAX_SCAN_FILES) {
      setError(`Puedes escanear hasta ${MAX_SCAN_FILES} archivos cada vez.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setScanning(true);

    try {
      const allWarnings: string[] = [];
      const errors: string[] = [];
      let imported = 0;

      for (const file of files) {
        const result = await scanFile(file);
        if (result.quota) setQuota(result.quota);

        if (!result.data) {
          errors.push(`${file.name}: ${result.error ?? "no se pudo leer"}`);
          continue;
        }

        if (result.data.warnings.length > 0) {
          allWarnings.push(
            ...result.data.warnings.map((warning) => `${file.name}: ${warning}`),
          );
        }
        onScanned(result.data, {
          fileName: file.name,
          append: imported > 0,
        });
        imported += 1;
      }

      if (allWarnings.length > 0) setWarnings(allWarnings);
      if (errors.length > 0) setError(errors.join(" · "));
      if (imported > 0) markFactuFeatureUsed("expense_scan");
    } catch {
      setError("Error de conexión. Comprueba tu internet e inténtalo de nuevo.");
    } finally {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
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
    void handleFiles(event.dataTransfer.files);
  }

  return (
    <Card className="space-y-4 border-sky-200 bg-sky-50/60">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
          <ScanLine className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Escanear factura o ticket</h2>
          <p className="mt-1 text-sm text-slate-600">
            Foto, imagen o PDF: la app rellena proveedor, importe e IVA. Siempre revisa antes
            de guardar.
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

      {needsAccount ? (
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
            onChange={(e) => void handleFiles(e.target.files)}
          />

          <div
            className={`rounded-2xl border-2 border-dashed p-3 transition-colors ${
              dragActive
                ? "border-blue-500 bg-white"
                : "border-sky-200 bg-white/60"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                fullWidth
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
                fullWidth
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
                {noScansLeft ? "Sin escaneos" : "Imagen o PDF"}
              </Button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {dragActive
                ? "Suelta los archivos para escanearlos."
                : `Arrastra archivos aquí o selecciona hasta ${MAX_SCAN_FILES}.`}
            </p>
          </div>

          {noScansLeft && (
            <div className="space-y-3">
              <p className="text-sm text-violet-800">
                {isPro ? (
                  <>
                    Has usado los {PRO_EXPENSE_SCANS_PER_MONTH} escaneos incluidos
                    este mes. Puedes comprar un pack extra o esperar al mes que
                    viene.
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
