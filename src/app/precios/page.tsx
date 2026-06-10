"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  formatPlanPrice,
  PLANS,
  yearlySavingsPercent,
} from "@/lib/billing/plans";
import { subscriptionLabel } from "@/lib/billing/subscription";

const FREE_FEATURES = [
  "Hasta 10 documentos al mes",
  "Hasta 15 clientes",
  "Facturas, presupuestos y recibos en PDF",
  "Logo personalizado en PDF",
  "Gastos y resumen acumulado",
  "Copia manual export/import",
];

const PRO_FEATURES = [
  "Documentos y clientes ilimitados",
  "Escanear facturas de gasto (15/mes)",
  "Sincronización en la nube (móvil + PC)",
  "Resumen trimestral + export CSV",
  "14 días de prueba al crear cuenta",
];

function CheckoutNotice() {
  const params = useSearchParams();
  const checkout = params.get("checkout");

  if (checkout === "success") {
    return (
      <Card className="mb-6 border-green-200 bg-green-50">
        <p className="text-sm font-medium text-green-900">
          Pago completado. Tu plan Pro se activará en unos segundos. Si no ves
          los cambios, recarga la página o vuelve a iniciar sesión.
        </p>
      </Card>
    );
  }

  if (checkout === "cancel") {
    return (
      <Card className="mb-6 border-slate-200 bg-slate-50">
        <p className="text-sm text-slate-700">
          Pago cancelado. Puedes volver a intentarlo cuando quieras.
        </p>
      </Card>
    );
  }

  return null;
}

export default function PreciosPage() {
  const { plan, isPro, checkout, openPortal, billingEnabled, trialDaysLeft } =
    useBilling();
  const { user } = useCloudSync();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function subscribe(interval: "monthly" | "yearly") {
    setBusy(true);
    setError(null);
    const result = await checkout(interval);
    setBusy(false);
    if (result) setError(result);
  }

  async function manage() {
    setBusy(true);
    setError(null);
    const result = await openPortal();
    setBusy(false);
    if (result) setError(result);
  }

  return (
    <div>
      <PageHeader
        title="Planes y precios"
        subtitle="Más barato que Quipu o Contasimple ilimitado, pensado solo para facturar sin complicaciones"
      />

      <CheckoutNotice />

      {!billingEnabled && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">
            La facturación está en modo desarrollo: todas las funciones están
            desbloqueadas. Activa{" "}
            <code className="rounded bg-white px-1">NEXT_PUBLIC_BILLING_ENABLED=true</code>{" "}
            en producción.
          </p>
        </Card>
      )}

      {isPro && billingEnabled && (
        <Card className="mb-6 border-violet-200 bg-violet-50">
          <p className="text-sm text-violet-900">
            Tu plan actual: <strong>{subscriptionLabel(plan)}</strong>
            {trialDaysLeft !== null && trialDaysLeft > 0
              ? ` — ${trialDaysLeft} día(s) de prueba restantes`
              : ""}
            .
          </p>
          {user && plan === "pro" && (
            <Button className="mt-3" variant="secondary" onClick={() => void manage()} disabled={busy}>
              Gestionar suscripción
            </Button>
          )}
        </Card>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-slate-900">Gratis</h2>
          <p className="mt-1 text-3xl font-bold text-slate-900">0 €</p>
          <p className="mt-1 text-sm text-slate-500">Para empezar sin tarjeta</p>
          <ul className="mt-4 space-y-2">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {feature}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="border-violet-300 bg-violet-50/50">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-violet-700" />
            <h2 className="text-xl font-bold text-slate-900">Pro</h2>
          </div>
          <p className="mt-1 text-3xl font-bold text-violet-900">
            {formatPlanPrice(PLANS.pro.priceMonthlyEur ?? 0, "month")}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            o {formatPlanPrice(PLANS.pro.priceYearlyEur ?? 0, "year")} (ahorra{" "}
            {yearlySavingsPercent()}%)
          </p>
          <ul className="mt-4 space-y-2">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />
                {feature}
              </li>
            ))}
          </ul>
          {!isPro && (
            <div className="mt-5 space-y-2">
              {!user && (
                <p className="text-sm text-slate-600">
                  <Link href="/configuracion" className="font-semibold text-blue-600 underline">
                    Crea una cuenta
                  </Link>{" "}
                  para activar la prueba de 14 días.
                </p>
              )}
              <Button fullWidth onClick={() => void subscribe("yearly")} disabled={busy}>
                Pro anual — mejor precio
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => void subscribe("monthly")}
                disabled={busy}
              >
                Pro mensual
              </Button>
            </div>
          )}
        </Card>
      </div>

      <Card className="mb-6">
        <h2 className="mb-2 font-bold text-slate-900">¿Por qué este precio?</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Quipu cobra desde ~16 €/mes y Contasimple ilimitado ~18 €/mes. Factura
          Autónomo no incluye banca, nóminas ni modelos AEAT automáticos: solo
          facturación clara, gastos y resumen fiscal. Por eso Pro está en{" "}
          <strong>5,99 €/mes</strong> — por debajo del mercado para autónomos que
          solo necesitan facturar bien.
        </p>
      </Card>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <p className="text-xs text-slate-500">
        Precios sin IVA. Al pagar se añade el 21 % según normativa española.{" "}
        <Link href="/legal/terminos" className="underline">
          Términos
        </Link>{" "}
        ·{" "}
        <Link href="/legal/privacidad" className="underline">
          Privacidad
        </Link>
      </p>
    </div>
  );
}
