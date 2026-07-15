"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  Clipboard,
  Inbox,
  Loader2,
  RefreshCw,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { expenseInboxItemVatView } from "@/components/expenses/expense-vat-ui";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useBilling } from "@/context/BillingContext";
import { formatShortDate } from "@/lib/calculations";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { closeExpenseInboxItemLocally } from "@/lib/expense-inbox-lifecycle";
import type { AiUsageMeter } from "@/lib/billing/scan-limits";
import type {
  ExpenseInboxDeliveryStatus,
  ExpenseInboxItem,
} from "@/lib/expense-inbox";
import { isExpenseInboxQuotaError } from "@/lib/expense-inbox";
import { scanPackLabel } from "@/lib/billing/scan-packs";

interface ExpenseInboxResponse {
  alias?: {
    address: string;
  };
  deliveryStatus?: ExpenseInboxDeliveryStatus;
  items?: ExpenseInboxItem[];
  pendingCount?: number;
  copyRecipient?: string | null;
  error?: string;
}

interface AiUsageResponse {
  meter?: AiUsageMeter;
}

async function currentAuthHeaders(): Promise<HeadersInit> {
  const supabase = await getSupabaseClientAsync();
  const { data } = (await supabase?.auth.getSession()) ?? {
    data: { session: null },
  };
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function ExpenseInboxCard({ vatExempt = false }: { vatExempt?: boolean }) {
  const { user } = useCloudSync();
  const { checkoutScanPack } = useBilling();
  const [address, setAddress] = useState("");
  const [items, setItems] = useState<ExpenseInboxItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [copyRecipient, setCopyRecipient] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] =
    useState<ExpenseInboxDeliveryStatus | null>(null);
  const [usageLabel, setUsageLabel] = useState<string | null>(null);
  const [usageMode, setUsageMode] = useState<AiUsageMeter["mode"] | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rotatingAddress, setRotatingAddress] = useState(false);
  const [discardingId, setDiscardingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [buyingPack, setBuyingPack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInbox = useCallback(async () => {
    if (!user) {
      setAddress("");
      setItems([]);
      setPendingCount(0);
      setCopyRecipient(null);
      setDeliveryStatus(null);
      setUsageLabel(null);
      setUsageMode(null);
      return;
    }

    setLoading(true);
    setUsageLoading(true);
    setError(null);
    try {
      const headers = await currentAuthHeaders();
      const [response, usageResponse] = await Promise.all([
        fetch("/api/expense-inbox", { headers }),
        fetch("/api/billing/ai-usage", { headers }).catch(() => null),
      ]);
      const body = (await response.json().catch(() => ({}))) as ExpenseInboxResponse;
      const usageBody =
        usageResponse && usageResponse.ok
          ? ((await usageResponse.json().catch(() => ({}))) as AiUsageResponse)
          : null;
      const percentRemaining = usageBody?.meter?.percentRemaining;
      setUsageLabel(
        typeof percentRemaining === "number"
          ? `IA ${percentRemaining}% restante`
          : null,
      );
      setUsageMode(usageBody?.meter?.mode ?? null);

      if (!response.ok) {
        setError(body.error ?? "No se pudo cargar el buzón.");
        return;
      }

      setAddress(body.alias?.address ?? "");
      setItems(body.items ?? []);
      setPendingCount(body.pendingCount ?? 0);
      setCopyRecipient(body.copyRecipient ?? null);
      setDeliveryStatus(body.deliveryStatus ?? null);
    } catch {
      setError("No se pudo cargar el buzón.");
    } finally {
      setLoading(false);
      setUsageLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  async function copyAddress() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function rotateAddress() {
    if (!address) return;
    const confirmed = window.confirm(
      "Se generará un correo nuevo y el actual dejará de recibir facturas nuevas. Las facturas pendientes no se borran.",
    );
    if (!confirmed) return;

    setRotatingAddress(true);
    setError(null);
    try {
      const headers = await currentAuthHeaders();
      const response = await fetch("/api/expense-inbox", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotate-alias" }),
      });
      const body = (await response.json().catch(() => ({}))) as ExpenseInboxResponse;
      if (!response.ok || !body.alias?.address) {
        setError(body.error ?? "No se pudo generar un correo nuevo.");
        return;
      }
      setAddress(body.alias.address);
      setDeliveryStatus(body.deliveryStatus ?? null);
      setCopied(false);
    } catch {
      setError("No se pudo generar un correo nuevo.");
    } finally {
      setRotatingAddress(false);
    }
  }

  async function discardItem(item: ExpenseInboxItem) {
    const confirmed = window.confirm(
      "La factura saldrá de pendientes, pero no se borrará ningún gasto ya guardado. ¿Quieres descartarla?",
    );
    if (!confirmed) return;

    setDiscardingId(item.id);
    setError(null);
    try {
      const headers = await currentAuthHeaders();
      const response = await fetch("/api/expense-inbox", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: "ignored" }),
      });
      const body = (await response.json().catch(() => ({}))) as ExpenseInboxResponse;
      if (!response.ok) {
        setError(body.error ?? "No se pudo descartar la factura.");
        return;
      }
      const closed = closeExpenseInboxItemLocally(items, item.id);
      setItems(closed.items);
      if (closed.removedPending) {
        setPendingCount((count) => Math.max(0, count - 1));
      }
    } catch {
      setError("No se pudo descartar la factura.");
    } finally {
      setDiscardingId(null);
    }
  }

  async function retryItem(item: ExpenseInboxItem) {
    setRetryingId(item.id);
    setError(null);
    try {
      const headers = await currentAuthHeaders();
      const response = await fetch("/api/expense-inbox", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", id: item.id }),
      });
      const body = (await response.json().catch(() => ({}))) as
        ExpenseInboxResponse & { item?: ExpenseInboxItem };
      if (!response.ok || !body.item) {
        setError(body.error ?? "No se pudo reintentar el análisis.");
        return;
      }
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === body.item?.id ? body.item : currentItem,
        ),
      );
      if (body.item.status === "pending") {
        setPendingCount((count) => count + 1);
      }
    } catch {
      setError("No se pudo reintentar el análisis.");
    } finally {
      setRetryingId(null);
    }
  }

  async function buyScanPack() {
    setBuyingPack(true);
    setError(null);
    const checkoutError = await checkoutScanPack();
    if (checkoutError) setError(checkoutError);
    setBuyingPack(false);
  }

  if (!user) {
    return (
      <Card className="border-emerald-100 bg-emerald-50/60">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Inbox className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">
              Buzón inteligente de gastos
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Inicia sesión para recibir facturas de proveedores por email.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 border-emerald-100 bg-emerald-50/50">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Inbox className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Buzón inteligente de gastos
              </h2>
              {pendingCount > 0 ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  {pendingCount} pendiente(s)
                </span>
              ) : null}
              {usageLabel || usageLoading ? (
                <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-bold text-emerald-800">
                  {usageLabel ?? "IA calculando..."}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Reenvía aquí facturas de proveedores. Quedan pendientes de revisar.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => void loadInbox()}
          disabled={loading}
          className="self-start"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Actualizar
        </Button>
      </div>

      {error ? (
        <p className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-amber-800">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      ) : null}

      {address ? (
        <div className="rounded-2xl border border-emerald-100 bg-white p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Email para proveedores
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 break-all rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900">
              {address}
            </code>
            <Button variant="secondary" onClick={() => void copyAddress()}>
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => void rotateAddress()}
              disabled={rotatingAddress}
            >
              {rotatingAddress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Generar nuevo
            </Button>
          </div>
          <p className="mt-2 flex gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
            Usa este correo solo para facturas o tickets de proveedores. Si lo
            publicas o empieza a entrar basura, genera uno nuevo. Se revisan los
            10 primeros adjuntos de cada email.
          </p>
          <p className="mt-2 text-xs text-slate-600">
            {copyRecipient ? (
              <>
                También enviamos una copia automática desde la app a{" "}
                <strong>{copyRecipient}</strong>.
              </>
            ) : (
              "Añade un email válido en Datos de empresa para recibir también una copia."
            )}
          </p>
          {deliveryStatus && deliveryStatus.state !== "ready" ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="flex gap-2 font-semibold">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {deliveryStatus.message}
              </p>
              {deliveryStatus.mxHosts?.length ? (
                <p className="mt-1 text-xs text-amber-800">
                  MX actual: {deliveryStatus.mxHosts.join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => {
            const vatView = expenseInboxItemVatView(item, vatExempt);
            const title =
              item.scanPayload?.expense.description ||
              item.attachmentFilename ||
              "Factura recibida";
            const canBuyScanPack =
              item.status === "error" &&
              usageMode === "empty" &&
              isExpenseInboxQuotaError(item.scanError);
            return (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">{title}</p>
                  <p className="text-sm text-slate-500">
                    {item.fromEmail ?? "Proveedor"} · {formatShortDate(item.receivedAt)}
                    {vatView ? ` · ${vatView.amountLabel}` : ""}
                  </p>
                  {vatView ? (
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        vatView.resolution.blocked
                          ? "bg-amber-100 text-amber-900"
                          : vatView.resolution.source === "lines"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {vatView.sourceLabel}
                    </span>
                  ) : null}
                  {item.status === "error" && item.scanError ? (
                    <p className="mt-1 text-sm font-semibold text-red-700">
                      {item.scanError}
                    </p>
                  ) : null}
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
                  {canBuyScanPack ? (
                    <Button
                      onClick={() => void buyScanPack()}
                      disabled={buyingPack}
                    >
                      {buyingPack ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShoppingBag className="h-4 w-4" />
                      )}
                      Comprar {scanPackLabel()}
                    </Button>
                  ) : null}
                  {item.status === "error" && item.canRetry ? (
                    <Button
                      variant="secondary"
                      onClick={() => void retryItem(item)}
                      disabled={retryingId === item.id}
                    >
                      {retryingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Reintentar análisis
                    </Button>
                  ) : null}
                  {item.status === "pending" ? (
                    <Link
                      href={`/gastos/nuevo?inbox=${item.id}`}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"
                    >
                      Revisar
                    </Link>
                  ) : null}
                  <Button
                    variant="ghost"
                    onClick={() => void discardItem(item)}
                    disabled={discardingId === item.id}
                    title="Descartar del buzón"
                    aria-label={`Descartar ${title} del buzón`}
                  >
                    {discardingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Descartar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-600">
          No hay facturas pendientes en el buzón.
        </p>
      )}
    </Card>
  );
}
