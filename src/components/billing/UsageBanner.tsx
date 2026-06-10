"use client";

import Link from "next/link";
import { useBilling } from "@/context/BillingContext";
import { PLANS } from "@/lib/billing/plans";

export function UsageBanner() {
  const { billingEnabled, isPro, documentsThisMonth, showUsageWarning, plan, trialDaysLeft } =
    useBilling();

  if (!billingEnabled || isPro) {
    if (billingEnabled && plan === "trial" && trialDaysLeft !== null && trialDaysLeft > 0) {
      return (
        <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          Prueba Pro activa: te quedan <strong>{trialDaysLeft} día(s)</strong>.{" "}
          <Link href="/precios" className="font-semibold underline">
            Ver planes
          </Link>
        </div>
      );
    }
    return null;
  }

  const max = PLANS.free.limits.maxDocumentsPerMonth ?? 0;

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
        showUsageWarning
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      Plan Gratis: <strong>{documentsThisMonth}</strong> de {max} documentos este mes.{" "}
      <Link href="/precios" className="font-semibold text-blue-600 underline">
        Pasa a Pro
      </Link>{" "}
      para facturar sin límite.
    </div>
  );
}
