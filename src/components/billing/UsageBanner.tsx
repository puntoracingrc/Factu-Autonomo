"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ShoppingBag } from "lucide-react";
import { useBilling } from "@/context/BillingContext";
import {
  BILLING_QUOTA_METRICS,
  BILLING_QUOTA_PACKS,
  billingQuotaMetricLabel,
  quotaPackForMetric,
} from "@/lib/billing/quotas";

function resetLabel(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

export function UsageBanner() {
  const {
    billingEnabled,
    isPro,
    plan,
    trialDaysLeft,
    quotaLoading,
    quotaSnapshot,
    checkoutQuotaPack,
  } = useBilling();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urgentQuota = useMemo(
    () =>
      BILLING_QUOTA_METRICS.map((metric) => quotaSnapshot.metrics[metric])
        .filter(
          (quota) =>
            quota.remaining !== null &&
            quota.remaining >= 0 &&
            quota.remaining <= 2,
        )
        .sort(
          (left, right) =>
            (left.remaining ?? Number.MAX_SAFE_INTEGER) -
            (right.remaining ?? Number.MAX_SAFE_INTEGER),
        )[0] ?? null,
    [quotaSnapshot],
  );

  if (!billingEnabled || isPro) {
    if (
      billingEnabled &&
      plan === "trial" &&
      trialDaysLeft !== null &&
      trialDaysLeft > 0
    ) {
      return (
        <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          Prueba Pro activa: te quedan <strong>{trialDaysLeft} día(s)</strong>.{" "}
          <Link href="/precios" className="font-semibold underline">
            Ver planes
          </Link>
        </div>
      );
    }
    return null;
  }
  if (quotaLoading || !urgentQuota) return null;

  const packKey = quotaPackForMetric(urgentQuota.metric);
  const pack = packKey ? BILLING_QUOTA_PACKS[packKey] : null;
  const remaining = urgentQuota.remaining ?? 0;

  async function buyPack() {
    if (!packKey) return;
    setBusy(true);
    setError(null);
    const result = await checkoutQuotaPack(packKey);
    if (result) setError(result);
    setBusy(false);
  }

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-start gap-2">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <span>
            Te {remaining === 1 ? "queda" : "quedan"}{" "}
            <strong>
              {remaining} {billingQuotaMetricLabel(urgentQuota.metric)}
            </strong>
            {urgentQuota.resetAt
              ? `. El contador se reinicia el ${resetLabel(urgentQuota.resetAt)}.`
              : ". Este límite es total y no se reinicia cada mes."}
          </span>
        </span>
        <span className="flex shrink-0 flex-wrap gap-2">
          {pack && packKey ? (
            <button
              type="button"
              onClick={() => void buyPack()}
              disabled={busy}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              {busy ? "Abriendo pago..." : `${pack.label} - ${pack.priceLabel}`}
            </button>
          ) : null}
          <Link
            href="/precios"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-600 px-3 font-semibold text-white hover:bg-blue-700"
          >
            Ver Pro
          </Link>
        </span>
      </div>
      {error ? <p className="mt-2 font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
