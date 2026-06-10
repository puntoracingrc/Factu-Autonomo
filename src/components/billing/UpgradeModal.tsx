"use client";

import { useState } from "react";
import { Crown, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useBilling } from "@/context/BillingContext";
import {
  formatPlanPrice,
  PLANS,
  yearlySavingsPercent,
} from "@/lib/billing/plans";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

export function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  const { checkout } = useBilling();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function startCheckout(interval: "monthly" | "yearly") {
    setBusy(true);
    setError(null);
    const result = await checkout(interval);
    setBusy(false);
    if (result) setError(result);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        role="dialog"
        aria-labelledby="upgrade-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h2 id="upgrade-title" className="text-lg font-bold text-slate-900">
                Pasa a Pro
              </h2>
              <p className="text-sm text-slate-600">
                Factura sin límites y sincroniza todos tus dispositivos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {reason && (
          <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {reason}
          </p>
        )}

        <ul className="mb-4 space-y-2 text-sm text-slate-700">
          <li>Documentos y clientes ilimitados</li>
          <li>Sincronización en la nube (móvil + PC)</li>
          <li>Resumen trimestral y export CSV para tu gestor</li>
          <li>Logo personalizado en PDF</li>
        </ul>

        <div className="space-y-3">
          <Button fullWidth onClick={() => void startCheckout("yearly")} disabled={busy}>
            {formatPlanPrice(PLANS.pro.priceYearlyEur ?? 0, "year")} — ahorra{" "}
            {yearlySavingsPercent()}%
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void startCheckout("monthly")}
            disabled={busy}
          >
            {formatPlanPrice(PLANS.pro.priceMonthlyEur ?? 0, "month")}
          </Button>
        </div>

        {error && (
          <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
