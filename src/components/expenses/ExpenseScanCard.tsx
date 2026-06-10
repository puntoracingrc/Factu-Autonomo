"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Camera, FileText, Loader2, ScanLine, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  PRO_EXPENSE_SCANS_PER_MONTH,
  type ScanQuota,
} from "@/lib/billing/scan-limits";
import { scanPackLabel } from "@/lib/billing/scan-packs";
import { prepareScanFile } from "@/lib/expense-scan/prepare-scan-file";
import type { ExpenseScanPayload } from "@/lib/expense-scan/schema";

interface ExpenseScanCardProps {
  onScanned: (payload: ExpenseScanPayload) => void;
}

export function ExpenseScanCard({ onScanned }: ExpenseScanCardProps) {
  const searchParams = useSearchParams();
  const { billingEnabled, isPro, checkoutScanPack } = useBilling();
  const { user } = useCloudSync();
  const inputRef = useRef<HTMLInputElement>(null);
  const [quota, setQuota] = useState<ScanQuota | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [buyingPack, setBuyingPack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const checkoutStatus = searchParams.get("checkout");

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

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setWarnings([]);
    setScanning(true);

    try {
      let uploadFile = file;
      try {
        const prepared = await prepareScanFile(file);
        uploadFile = prepared.file;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo preparar la imagen para escanear.",
        );
        return;
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

      if (body.quota) setQuota(body.quota);

      if (!res.ok || !body.data) {
        setError(body.error ?? "No se pudo escanear la factura.");
        return;
      }

      if (body.data.warnings.length > 0) {
        setWarnings(body.data.warnings);
      }
      onScanned(body.data);
    } catch {
      setError("Error de conexión. Comprueba tu internet e inténtalo de nuevo.");
    } finally {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const needsAccount = billingEnabled && !user;
  const noScansLeft =
    quota !== null &&
    quota.remaining <= 0 &&
    quota.remaining !== Number.MAX_SAFE_INTEGER;

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
          {quota && quota.remaining !== Number.MAX_SAFE_INTEGER && (
            <p className="text-sm text-slate-600">
              Escaneos restantes:{" "}
              <strong>
                {quota.remaining}
                {quota.period === "month" ? " este mes" : " de prueba"}
              </strong>
              {quota.bonusCredits > 0 ? (
                <span className="text-slate-500">
                  {" "}
                  ({quota.bonusCredits} extra comprados)
                </span>
              ) : null}
              {loadingQuota ? " (actualizando…)" : null}
            </p>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*,application/pdf,.pdf"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              fullWidth
              disabled={scanning || noScansLeft}
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
              disabled={scanning || noScansLeft}
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
