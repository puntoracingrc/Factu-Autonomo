"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  CircleHelp,
  CreditCard,
  Crown,
  Database,
  MailCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import { PricingComparisonPanel } from "@/components/billing/PricingComparisonPanel";
import {
  formatPlanPrice,
  isPaidPlan,
  PLANS,
  type PaidPlanId,
  yearlySavingsPercent,
} from "@/lib/billing/plans";
import {
  PRO_EXPENSE_SCANS_PER_MONTH,
  PRO_PLUS_EXPENSE_SCANS_PER_MONTH,
} from "@/lib/billing/scan-limits";
import { getPricingRankingSummary } from "@/lib/billing/competitor-pricing";
import { subscriptionLabel } from "@/lib/billing/subscription";

const PLAN_GUIDE = [
  {
    title: "Empieza gratis",
    description:
      "Es un plan gratuito real, no una prueba camuflada: cuenta verificada, documentos limitados y sin tarjeta.",
    Icon: MailCheck,
    tone: "bg-blue-50 text-blue-700",
  },
  {
    title: "Pasa a Pro cuando trabajes a diario",
    description:
      "Para documentos, clientes, productos y nube sin límites de uso normal en un negocio pequeño.",
    Icon: Crown,
    tone: "bg-violet-50 text-violet-700",
  },
  {
    title: "Añade IA si tienes muchos gastos",
    description:
      "Pro+ IA tiene sentido cuando escanear compras, leer líneas y revisar márgenes empieza a ahorrar tiempo.",
    Icon: Sparkles,
    tone: "bg-emerald-50 text-emerald-700",
  },
];

const TRUST_POINTS = [
  {
    title: "Sin tarjeta en Gratis",
    description: "Puedes crear cuenta y empezar sin meter datos de pago.",
    Icon: CreditCard,
  },
  {
    title: "Pago gestionado por Stripe",
    description: "Las tarjetas y facturas de suscripción se gestionan fuera de la app.",
    Icon: ShieldCheck,
  },
  {
    title: "Tus datos bajo control",
    description: "Puedes trabajar localmente y decidir cuándo usar cuenta o nube.",
    Icon: Database,
  },
  {
    title: "Ayuda antes de pagar",
    description: "El manual explica los flujos principales y qué hace cada plan.",
    Icon: CircleHelp,
  },
];

const FREE_FEATURES = [
  "Cuenta gratuita verificada, sin tarjeta",
  "Hasta 10 documentos al mes",
  "Hasta 15 clientes",
  "Facturas, presupuestos y recibos en PDF",
  "Información VeriFactu/SIF (registro y QR desactivados)",
  "Logo personalizado en PDF",
  "Gastos y resumen acumulado",
  "2 escaneos IA de prueba",
  "Copia manual export/import",
];

const VERIFACTU_PUBLIC_NOTICE =
  "El registro y el QR tributario están desactivados; ninguna factura se presenta como aceptada por AEAT. No afirmamos que la AEAT haya homologado, validado o revisado comercialmente la app.";

const PRO_FEATURES = [
  "Documentos y clientes ilimitados",
  "Productos, servicios y proveedores ilimitados",
  `Escaneo simple de gastos (${PRO_EXPENSE_SCANS_PER_MONTH} escaneos/mes incluidos; packs extra opcionales)`,
  "Rellenar clientes con IA desde texto (10 rellenos equivalen a 1 escaneo), incluido CP si la dirección se localiza",
  "Buzón inteligente básico para facturas de proveedores",
  "Importar datos desde otros programas de facturación",
  "Diseñador Pro de plantillas para facturas, presupuestos y recibos",
  "Sincronización en la nube (móvil + PC)",
  "Resumen trimestral + export CSV",
  "14 días de prueba al crear cuenta",
];

const PRO_PLUS_FEATURES = [
  `IA avanzada para gastos y catálogo (${PRO_PLUS_EXPENSE_SCANS_PER_MONTH} escaneos/mes incluidos)`,
  "Lee líneas de factura y permite elegir qué líneas crean producto",
  "Actualiza costes y referencias de proveedor con revisión previa",
  "Recuerda productos descartados para no volver a proponerlos",
  "Reglas de incremento y margen por familia",
  "Margen real por línea y global del documento",
  "Panel de aprendizaje para corregir lecturas",
  "Soporte prioritario",
];

function CheckoutNotice() {
  const params = useSearchParams();
  const checkout = params.get("checkout");

  if (checkout === "success") {
    return (
      <Card className="mb-6 border-green-200 bg-green-50">
        <p className="text-sm font-medium text-green-900">
          Pago completado. Tu plan se activará en unos segundos. Si no ves
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
  const rankingSummary = getPricingRankingSummary();
  const { plan, isPro, checkout, openPortal, billingEnabled, trialDaysLeft } =
    useBilling();
  const { user } = useCloudSync();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function subscribe(planToBuy: PaidPlanId, interval: "monthly" | "yearly") {
    setBusy(true);
    setError(null);
    const result = await checkout(interval, planToBuy);
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
        subtitle={rankingSummary.subtitle}
      />

      <Card className="mb-6 border-blue-200 bg-blue-50/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
              <MailCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Empieza gratis, sube solo cuando te compense
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
                El plan Gratis sirve para empezar de verdad. Si luego necesitas
                más documentos, nube, importación avanzada o IA, puedes elegir
                Pro o Pro+ IA con la cuenta ya preparada.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink href="/cuenta?modo=crear#inicio-sesion" className="whitespace-nowrap">
              Crear cuenta gratis
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/ayuda/primeros-pasos" variant="secondary" className="whitespace-nowrap">
              Ver primeros pasos
            </ButtonLink>
          </div>
        </div>
      </Card>

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
          {user && isPaidPlan(plan) && (
            <Button className="mt-3" variant="secondary" onClick={() => void manage()} disabled={busy}>
              Gestionar suscripción
            </Button>
          )}
        </Card>
      )}

      <section className="mb-6 grid gap-4 lg:grid-cols-3" aria-label="Guía rápida de planes">
        {PLAN_GUIDE.map(({ title, description, Icon, tone }) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-base font-bold text-slate-950">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {description}
            </p>
          </div>
        ))}
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="text-xl font-bold text-slate-900">Gratis</h2>
          <p className="mt-1 text-3xl font-bold text-slate-900">0 €</p>
          <p className="mt-1 text-sm text-slate-500">
            Para empezar con email verificado, sin tarjeta
          </p>
          <ul className="mt-4 space-y-2">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {feature}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-950">
            {VERIFACTU_PUBLIC_NOTICE}{" "}
            <Link
              href="/legal/verifactu"
              className="font-bold underline underline-offset-2"
            >
              Qué incluye y qué no
            </Link>
            .
          </p>
          {!user && (
            <div className="mt-5 space-y-2">
              <ButtonLink href="/cuenta?modo=crear#inicio-sesion" fullWidth>
                Crear cuenta gratis
              </ButtonLink>
              <ButtonLink href="/demo" variant="secondary" fullWidth>
                Ver demo primero
              </ButtonLink>
            </div>
          )}
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
          {plan !== "pro" && plan !== "pro_plus" && (
            <div className="mt-5 space-y-2">
              {!user && (
                <p className="text-sm text-slate-600">
                  <Link href="/cuenta?modo=crear#inicio-sesion" className="font-semibold text-blue-600 underline">
                    Crea una cuenta
                  </Link>{" "}
                  para activar la prueba de 14 días.
                </p>
              )}
              <Button fullWidth onClick={() => void subscribe("pro", "yearly")} disabled={busy}>
                Pro anual — mejor precio
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => void subscribe("pro", "monthly")}
                disabled={busy}
              >
                Pro mensual
              </Button>
            </div>
          )}
        </Card>

        <Card className="border-emerald-300 bg-emerald-50/50">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-emerald-700" />
            <h2 className="text-xl font-bold text-slate-900">Pro+ IA</h2>
          </div>
          <p className="mt-1 text-3xl font-bold text-emerald-900">
            {formatPlanPrice(PLANS.pro_plus.priceMonthlyEur ?? 0, "month")}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            o {formatPlanPrice(PLANS.pro_plus.priceYearlyEur ?? 0, "year")} (ahorra{" "}
            {yearlySavingsPercent("pro_plus")}%)
          </p>
          <ul className="mt-4 space-y-2">
            {PRO_PLUS_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                {feature}
              </li>
            ))}
          </ul>
          {plan !== "pro_plus" && (
            <div className="mt-5 space-y-2">
              {!user && (
                <p className="text-sm text-slate-600">
                  <Link href="/cuenta?modo=crear#inicio-sesion" className="font-semibold text-blue-600 underline">
                    Crea una cuenta
                  </Link>{" "}
                  para contratar Pro+ IA con tu email verificado.
                </p>
              )}
              <Button
                fullWidth
                onClick={() => void subscribe("pro_plus", "yearly")}
                disabled={busy}
              >
                Pro+ anual
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => void subscribe("pro_plus", "monthly")}
                disabled={busy}
              >
                Pro+ mensual
              </Button>
            </div>
          )}
        </Card>
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Confianza y condiciones">
        {TRUST_POINTS.map(({ title, description, Icon }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-950">{title}</h2>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                {description}
              </p>
            </div>
          </div>
        ))}
      </section>

      <PricingComparisonPanel />

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <p className="text-xs leading-5 text-slate-500">
        Precios sin IVA. Al pagar se añade el 21 % según normativa española.{" "}
        La información fiscal de la app es orientativa y no sustituye a tu
        gestor o asesor.{" "}
        <Link href="/legal/terminos" className="underline">
          Términos
        </Link>{" "}
        ·{" "}
        <Link href="/legal/privacidad" className="underline">
          Privacidad
        </Link>{" "}
        ·{" "}
        <Link href="/legal/cookies" className="underline">
          Cookies
        </Link>{" "}
        ·{" "}
        <Link href="/legal/encargo-tratamiento" className="underline">
          Encargo de tratamiento
        </Link>
      </p>
    </div>
  );
}
