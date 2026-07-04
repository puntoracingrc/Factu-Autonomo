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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCloudSync } from "@/context/CloudSyncContext";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import type { AiUsageMeter } from "@/lib/billing/scan-limits";
import type { ExpenseInboxItem } from "@/lib/expense-inbox";

interface ExpenseInboxResponse {
  alias?: {
    address: string;
  };
  items?: ExpenseInboxItem[];
  pendingCount?: number;
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

function itemAmount(item: ExpenseInboxItem): string | null {
  const amount = item.scanPayload?.expense.amount;
  return typeof amount === "number" && Number.isFinite(amount)
    ? formatMoney(amount)
    : null;
}

export function ExpenseInboxCard() {
  const { user } = useCloudSync();
  const [address, setAddress] = useState("");
  const [items, setItems] = useState<ExpenseInboxItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [usageLabel, setUsageLabel] = useState<string | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rotatingAddress, setRotatingAddress] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInbox = useCallback(async () => {
    if (!user) {
      setAddress("");
      setItems([]);
      setPendingCount(0);
      setUsageLabel(null);
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

      if (!response.ok) {
        setError(body.error ?? "No se pudo cargar el buzón.");
        return;
      }

      setAddress(body.alias?.address ?? "");
      setItems(body.items ?? []);
      setPendingCount(body.pendingCount ?? 0);
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
      setCopied(false);
    } catch {
      setError("No se pudo generar un correo nuevo.");
    } finally {
      setRotatingAddress(false);
    }
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
            <code className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900">
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
          <p className="mt-2 flex gap-2 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Usa este correo solo para facturas o tickets de proveedores. Si lo
            publicas o empieza a entrar basura, genera uno nuevo. Se revisan los
            10 primeros adjuntos de cada email.
          </p>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => {
            const amount = itemAmount(item);
            const title =
              item.scanPayload?.expense.description ||
              item.attachmentFilename ||
              "Factura recibida";
            return (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">{title}</p>
                  <p className="text-sm text-slate-500">
                    {item.fromEmail ?? "Proveedor"} · {formatShortDate(item.receivedAt)}
                    {amount ? ` · ${amount}` : ""}
                  </p>
                  {item.status === "error" && item.scanError ? (
                    <p className="mt-1 text-sm font-semibold text-red-700">
                      {item.scanError}
                    </p>
                  ) : null}
                </div>
                {item.status === "pending" ? (
                  <Link
                    href={`/gastos/nuevo?inbox=${item.id}`}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"
                  >
                    Revisar
                  </Link>
                ) : null}
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
