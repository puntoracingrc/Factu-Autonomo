"use client";

import { useEffect, useState } from "react";
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
import {
  resolvePricingPromotion,
  type AdminAccessState,
} from "@/lib/billing/pricing-promotion";

const PLAN_GUIDE = [
  {
    title: "Empieza gratis",
    description:
      "Cuenta verificada y sin tarjeta. Los datos quedan en un dispositivo; protégelos con copia manual o Drive opcional.",
    Icon: MailCheck,
    tone: "bg-blue-50 text-blue-700",
  },
  {
    title: "Pasa a Pro cuando trabajes a diario",
    description:
      "Añade almacenamiento en la nube de Factu y sincronización de hasta 2 dispositivos.",
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
    description:
      "Gratis es local; Pro sincroniza 2 dispositivos y Pro+ hasta 5.",
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
  "Datos guardados solo en este navegador",
  "Copia manual export/import",
  "Copia automática opcional en Google Drive",
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
  "Nube de Factu para hasta 2 dispositivos sincronizados",
  "Copia automática opcional en Google Drive",
  "Resumen trimestral + export CSV",
  "Pruebas temporales mediante código promocional",
];

const PRO_PLUS_FEATURES = [
  "Nube de Factu para hasta 5 dispositivos sincronizados",
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
  const {
    plan,
    isPro,
    checkout,
    openPortal,
    billingEnabled,
    trialDaysLeft,
    loading: billingLoading,
  } = useBilling();
  const { user } = useCloudSync();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const userId = user?.id ?? null;
  const [adminAccessResult, setAdminAccessResult] = useState<{
    userId: string | null;
    state: AdminAccessState;
  }>({ userId: null, state: "member" });
  const adminAccess: AdminAccessState = !userId
    ? "member"
    : adminAccessResult.userId === userId
      ? adminAccessResult.state
      : "checking";
  const promotion = resolvePricingPromotion({
    plan,
    hasUser: Boolean(user),
    billingLoading,
    adminAccess,
  });

  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;
    const controller = new AbortController();
    setAdminAccessResult({ userId, state: "checking" });

    void (async () => {
      const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
      const supabase = await getSupabaseClientAsync();
      if (!supabase) throw new Error("supabase_unavailable");

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("session_unavailable");

      const response = await fetch("/api/admin/capabilities", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("admin_capabilities_unavailable");

      const body = (await response.json()) as { fullAdmin?: boolean };
      if (active) {
        setAdminAccessResult({
          userId,
          state: body.fullAdmin ? "admin" : "member",
        });
      }
    })().catch(() => {
      if (active && !controller.signal.aborted) {
        setAdminAccessResult({ userId, state: "unavailable" });
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [userId]);

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

      {promotion === "free" && (
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
                  Gratis guarda el trabajo en un único dispositivo. Si luego
                  necesitas nube, Pro sincroniza hasta 2 dispositivos y Pro+
                  hasta 5.
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
      )}

      {promotion === "pro_plus" && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50/70">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Da el salto a Pro+ IA
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
                  Mantén todo lo de Pro, amplía la nube a 5 dispositivos y
                  añade {PRO_PLUS_EXPENSE_SCANS_PER_MONTH} escaneos al mes,
                  lectura de líneas, actualización de costes y márgenes por
                  familia.
                </p>
              </div>
            </div>
            <ButtonLink href="#plan-pro-plus" className="whitespace-nowrap">
              Ver ventajas de Pro+
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
        </Card>
      )}

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
            Un dispositivo local, sin nube de Factu
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
                  para empezar con el plan Gratis.
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

        <Card
          id="plan-pro-plus"
          className="scroll-mt-24 border-emerald-300 bg-emerald-50/50"
        >
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
