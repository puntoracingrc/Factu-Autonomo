"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BatteryCharging, ChevronDown, Sparkles } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import type { AiUsageMeter } from "@/lib/billing/scan-limits";

interface AiUsageResponse {
  meter: AiUsageMeter;
  quota: {
    plan: string;
    period: "month" | "lifetime";
    monthKey?: string;
    limit: number;
    remaining: number;
    bonusCredits: number;
    remainingUnits: number;
    unitScale: number;
  };
}

function meterCopy(meter: AiUsageMeter) {
  if (meter.mode === "unlimited") {
    return {
      title: "IA del plan",
      text: "Modo interno sin límite activo.",
      detail: "No se descontarán escaneos ni rellenos mientras el cobro esté desactivado.",
    };
  }

  if (meter.mode === "trial") {
    return {
      title: "Prueba IA",
      text: `Te queda el ${meter.percentRemaining}% de la prueba.`,
      detail: "Cuando se agote, podrás pasar a Pro para seguir usando escaneos y rellenos IA.",
    };
  }

  if (meter.mode === "extra") {
    return {
      title: "Recarga IA extra",
      text: `Estás usando una recarga. Queda el ${meter.percentRemaining}%.`,
      detail: "La IA incluida del mes ya se agotó; ahora se descuentan créditos extra comprados.",
    };
  }

  if (meter.mode === "empty") {
    return {
      title: "IA agotada",
      text: "No queda saldo IA para este mes.",
      detail: "Puedes comprar una recarga o esperar al reinicio del mes.",
    };
  }

  return {
    title: "IA del plan",
    text: `Te queda el ${meter.percentRemaining}% de IA incluida este mes.`,
    detail: "Escaneos, rellenos IA y direcciones con Google bajan este porcentaje.",
  };
}

function barColor(percent: number) {
  if (percent <= 15) return "bg-rose-500";
  if (percent <= 35) return "bg-amber-500";
  return "bg-emerald-500";
}

export function AiUsageMeterCard() {
  const { billingEnabled, isPro, checkoutScanPack } = useBilling();
  const { user } = useCloudSync();
  const [data, setData] = useState<AiUsageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const loadUsage = useCallback(async () => {
    if (!billingEnabled || !user) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
      const supabase = await getSupabaseClientAsync();
      const { data: sessionData } = await supabase?.auth.getSession() ?? {
        data: { session: null },
      };
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Inicia sesión para ver tu saldo IA.");
        return;
      }

      const res = await fetch("/api/billing/ai-usage", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json()) as AiUsageResponse | { error?: string };
      if (!res.ok) {
        setError(
          "error" in body && body.error
            ? body.error
            : "No se pudo cargar el saldo IA.",
        );
        return;
      }
      if (!("meter" in body)) {
        setError("No se pudo cargar el saldo IA.");
        return;
      }
      setData(body);
    } finally {
      setLoading(false);
    }
  }, [billingEnabled, user]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const copy = useMemo(
    () =>
      data
        ? meterCopy(data.meter)
        : {
            title: "IA del plan",
            text: "Cargando saldo IA…",
            detail: "",
          },
    [data],
  );

  if (!billingEnabled || !user) return null;

  const percent = data?.meter.percentRemaining ?? 0;
  const scanEquivalent = data?.meter.scanEquivalentRemaining;
  const smallUses = data?.meter.smallUseEquivalentRemaining;
  const bonusCredits = data?.quota.bonusCredits ?? 0;

  async function buyPack() {
    setCheckoutError(null);
    const result = await checkoutScanPack();
    if (result) setCheckoutError(result);
  }

  return (
    <Card className="mb-6 border-emerald-100 bg-emerald-50/35">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Sparkles className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{copy.title}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {loading ? "Calculando saldo…" : error ?? copy.text}
              </p>
            </div>

            {!isPro ? (
              <ButtonLink href="/precios">Ver Pro</ButtonLink>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void buyPack()}
                disabled={loading}
              >
                Comprar recarga
              </Button>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-white ring-1 ring-emerald-100">
                <div
                  className={`h-full rounded-full transition-all ${barColor(percent)}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="min-w-12 text-right text-sm font-black text-slate-900">
                {loading || error ? "…" : `${percent}%`}
              </span>
            </div>
          </div>

          {data ? (
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-emerald-800 hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              onClick={() => setExpanded((current) => !current)}
            >
              <BatteryCharging className="h-4 w-4" />
              {expanded ? "Ocultar detalle" : "Ver detalle"}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>
          ) : null}

          {expanded && data ? (
            <div className="mt-3 rounded-xl bg-white/80 px-4 py-3 text-sm text-slate-600">
              <p>{copy.detail}</p>
              <p className="mt-2">
                Quedan aprox.{" "}
                <strong className="text-slate-900">
                  {scanEquivalent ?? "sin límite"} escaneos
                </strong>{" "}
                o{" "}
                <strong className="text-slate-900">
                  {smallUses ?? "sin límite"} rellenos pequeños
                </strong>
                .
              </p>
              {bonusCredits > 0 ? (
                <p className="mt-1">
                  Recarga extra disponible:{" "}
                  <strong className="text-slate-900">
                    {bonusCredits} escaneo(s)
                  </strong>
                  .
                </p>
              ) : null}
              <p className="mt-1 text-xs text-slate-500">
                1 escaneo equivale a 10 rellenos pequeños de IA.
              </p>
            </div>
          ) : null}

          {checkoutError ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              {checkoutError}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
