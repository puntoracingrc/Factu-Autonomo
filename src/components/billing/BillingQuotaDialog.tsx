"use client";

import { useId, useState } from "react";
import { CalendarClock, Crown, ShoppingBag, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  BILLING_QUOTA_PACKS,
  billingQuotaMetricLabel,
  quotaPackForMetric,
  type BillingQuotaBlock,
  type BillingQuotaPackKey,
} from "@/lib/billing/quotas";
import {
  formatPlanPrice,
  PLANS,
  yearlySavingsPercent,
} from "@/lib/billing/plans";

interface BillingQuotaDialogProps {
  block: BillingQuotaBlock | null;
  signedIn: boolean;
  onClose: () => void;
  onSubscribe: (interval: "monthly" | "yearly") => Promise<string | null>;
  onBuyPack: (pack: BillingQuotaPackKey) => Promise<string | null>;
}

export function BillingQuotaDialog({
  block,
  signedIn,
  onClose,
  onSubscribe,
  onBuyPack,
}: BillingQuotaDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!block) return null;
  const packKey = quotaPackForMetric(block.metric);
  const pack = packKey ? BILLING_QUOTA_PACKS[packKey] : null;

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (result) setError(result);
  }

  return (
    <Modal
      open
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      panelClassName="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-xl supports-[height:100dvh]:max-h-[90dvh]"
      testId="billing-quota-dialog"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id={titleId} className="text-lg font-bold text-slate-900">
              {block.code === "service_unavailable"
                ? "No pudimos comprobar tu límite"
                : block.code === "account_required"
                  ? "Activa tu cuenta gratuita"
                  : "Has llegado al límite del plan Gratis"}
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-slate-600">
              {block.message}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {block.code === "limit_reached" ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
          <strong>{block.used}</strong> {billingQuotaMetricLabel(block.metric)} en uso
          {block.effectiveLimit === null ? null : (
            <> de <strong>{block.effectiveLimit}</strong></>
          )}
          {block.creditBalance > 0 ? (
            <>. Te quedan <strong>{block.creditBalance}</strong> extras</>
          ) : null}
          .
        </div>
      ) : null}

      {!signedIn ? (
        <ButtonLink href="/cuenta#inicio-sesion" fullWidth>
          Iniciar sesión gratis
        </ButtonLink>
      ) : block.code === "service_unavailable" ? (
        <Button fullWidth onClick={onClose}>
          Volver al borrador
        </Button>
      ) : (
        <div className="space-y-3">
          {pack && packKey ? (
            <Button
              fullWidth
              variant="secondary"
              disabled={busy}
              onClick={() => void run(() => onBuyPack(packKey))}
            >
              <ShoppingBag className="h-4 w-4" />
              {busy
                ? "Abriendo pago..."
                : `${pack.label} - ${pack.priceLabel}`}
            </Button>
          ) : null}
          <Button
            fullWidth
            disabled={busy}
            onClick={() => void run(() => onSubscribe("yearly"))}
          >
            <Crown className="h-4 w-4" />
            {formatPlanPrice(PLANS.pro.priceYearlyEur ?? 0, "year")} - ahorra{" "}
            {yearlySavingsPercent()}%
          </Button>
          <Button
            fullWidth
            variant="secondary"
            disabled={busy}
            onClick={() => void run(() => onSubscribe("monthly"))}
          >
            {formatPlanPrice(PLANS.pro.priceMonthlyEur ?? 0, "month")}
          </Button>
        </div>
      )}

      {error ? (
        <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
      ) : null}
    </Modal>
  );
}
