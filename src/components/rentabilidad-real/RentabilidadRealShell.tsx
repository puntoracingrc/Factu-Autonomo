"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Calculator,
  Clock3,
  ClipboardCheck,
  Euro,
  RotateCcw,
  Sparkles,
  TestTube2,
  TrendingUp,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBilling } from "@/context/BillingContext";
import { PLANS } from "@/lib/billing/plans";
import { resolveRentabilidadRealBillingAccess } from "@/lib/rentabilidad-real/access-policy";
import {
  getStoredRentabilidadRealAdvisorValidationStatus,
  type RentabilidadRealAdvisorValidationStatus,
} from "@/lib/rentabilidad-real/advisor-validation";
import { buildMarketplaceViewModel } from "@/lib/rentabilidad-real/view-model";
import {
  getStoredRentabilidadRealLastScoringResult,
  getStoredRentabilidadRealWizardAnswers,
} from "@/lib/rentabilidad-real/wizard-storage";
import {
  RENTABILIDAD_REAL_LOCAL_RESET_CONFIRMATION,
  resetRentabilidadRealLocalConfiguration,
} from "@/lib/rentabilidad-real/local-reset";
import type {
  RentabilidadRealScoringResult,
  RentabilidadRealWizardAnswers,
} from "@/lib/rentabilidad-real/types";
import { RentabilidadRealActiveModulesPanel } from "./RentabilidadRealActiveModulesPanel";
import { RentabilidadRealExistingDataPanel } from "./RentabilidadRealExistingDataPanel";
import { RentabilidadRealMarketplace } from "./RentabilidadRealMarketplace";
import { useRentabilidadRealActivation } from "./useRentabilidadRealActivation";

const VALIDATION_LABELS: Record<RentabilidadRealAdvisorValidationStatus, string> =
  {
    not_started: "Sin validar",
    pending_review: "Configuración pendiente de gestor",
    validated: "Configuración validada",
    corrected: "Configuración corregida por gestor",
  };

export function RentabilidadRealShell() {
  const { plan, billingEnabled } = useBilling();
  const rentabilidadRealAccess = resolveRentabilidadRealBillingAccess({
    planKey: plan,
    billingEnabled,
  });
  const [storedAnswers, setStoredAnswers] =
    useState<RentabilidadRealWizardAnswers | null>(null);
  const [lastScoringResult, setLastScoringResult] =
    useState<RentabilidadRealScoringResult | null>(null);
  const [validationStatus, setValidationStatus] =
    useState<RentabilidadRealAdvisorValidationStatus>("not_started");
  const [localResetMessage, setLocalResetMessage] = useState<string | null>(
    null,
  );

  const activation = useRentabilidadRealActivation({
    planKey: rentabilidadRealAccess.planKey,
    isProPlus: rentabilidadRealAccess.isProPlus,
  });

  useEffect(() => {
    setStoredAnswers(getStoredRentabilidadRealWizardAnswers());
    setLastScoringResult(getStoredRentabilidadRealLastScoringResult());
    setValidationStatus(getStoredRentabilidadRealAdvisorValidationStatus());
  }, []);

  const marketplace = useMemo(
    () => buildMarketplaceViewModel(activation.accessContext),
    [activation.accessContext],
  );
  const planName = billingEnabled
    ? PLANS[plan].name
    : rentabilidadRealAccess.localProPlusFallback
      ? "Pro+ IA (modo desarrollo/preview)"
      : `${PLANS[plan].name} (billing desactivado)`;
  const hasTest = Boolean(storedAnswers && lastScoringResult);

  const handleLocalReset = () => {
    const confirmed = window.confirm(
      `Restablecer configuración local de Rentabilidad Real\n\n${RENTABILIDAD_REAL_LOCAL_RESET_CONFIRMATION}`,
    );
    if (!confirmed) return;

    const result = resetRentabilidadRealLocalConfiguration();
    setStoredAnswers(getStoredRentabilidadRealWizardAnswers());
    setLastScoringResult(getStoredRentabilidadRealLastScoringResult());
    setValidationStatus(getStoredRentabilidadRealAdvisorValidationStatus());
    activation.refresh();
    setLocalResetMessage(
      result.skipped
        ? "No se ha podido acceder a la configuración local de este navegador."
        : "Configuración local de Rentabilidad Real restablecida. No se ha borrado ningún documento.",
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-50">
          Rentabilidad Real
        </h1>
        <p className="mt-1 text-base text-slate-500 dark:text-slate-400">
          Elige los modos adecuados, activa módulos incluidos y prepara tu
          configuración antes de calcular trabajos reales.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/80 p-5 dark:border-blue-900/60 dark:bg-blue-950/30">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-200">
              <Sparkles className="h-4 w-4" />
              Incluido en Pro+ para autónomos hasta nivel 4
            </div>
            <p className="mt-4 text-base leading-7 text-slate-700 dark:text-slate-200">
              Los módulos de autónomos persona física hasta nivel 4 están
              incluidos en Pro+. Tu plan actual en esta sesión es {planName}.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/rentabilidad-real/test"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Hacer test guiado
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/rentabilidad-real/validar-configuracion"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-blue-200 bg-white px-5 text-base font-semibold text-blue-700 transition-colors hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              Validar configuración
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/45 dark:text-blue-200">
              <BadgeCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-950 dark:text-slate-50">
                Acceso
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {rentabilidadRealAccess.isProPlus
                  ? "Puedes activar módulos incluidos sin coste adicional."
                  : "Los módulos incluidos requieren Pro+ para activarse."}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <TestTube2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-950 dark:text-slate-50">
                Test guiado
              </h2>
              {lastScoringResult ? (
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Nivel {lastScoringResult.level}:{" "}
                  {lastScoringResult.profileLabel}
                </p>
              ) : (
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Todavía no hay test guardado.
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-950 dark:text-slate-50">
                Gestor
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {VALIDATION_LABELS[validationStatus]}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <RentabilidadRealExistingDataPanel />

      <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/35">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 dark:bg-slate-950 dark:text-emerald-200">
              <Calculator className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
                Calcular rentabilidad de un trabajo
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-200">
                Usa tus presupuestos, facturas, gastos y gastos fijos existentes
                para saber cuánto deja realmente una obra o servicio.
              </p>
            </div>
          </div>
          <ButtonLink
            href="/rentabilidad-real/calculadora/trabajo"
            className="shrink-0"
          >
            Ir a calculadora
          </ButtonLink>
        </div>
      </Card>

      <Card className="border-sky-200 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/35">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-sky-700 dark:bg-slate-950 dark:text-sky-200">
              <Clock3 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
                Calcular rentabilidad por horas/proyecto
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-200">
                Descubre cuánto ganas realmente por hora real trabajada, no
                solo por hora facturada.
              </p>
            </div>
          </div>
          <ButtonLink
            href="/rentabilidad-real/calculadora/horas"
            className="shrink-0"
          >
            Ir a horas/proyecto
          </ButtonLink>
        </div>
      </Card>

      <Card className="border-violet-200 bg-violet-50 dark:border-violet-900/60 dark:bg-violet-950/35">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-violet-700 dark:bg-slate-950 dark:text-violet-200">
              <Euro className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
                Simular precio mínimo
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-200">
                Calcula cuánto deberías cobrar por hora, trabajo, proyecto o
                mes para cubrir costes, provisión IRPF y margen.
              </p>
            </div>
          </div>
          <ButtonLink
            href="/rentabilidad-real/simulador-precio-minimo"
            className="shrink-0"
          >
            Abrir simulador
          </ButtonLink>
        </div>
      </Card>

      <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
                Ver informes de rentabilidad
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-200">
                Descubre qué clientes, documentos o trabajos dejan más margen y
                qué datos faltan para calcular mejor.
              </p>
            </div>
          </div>
          <ButtonLink href="/rentabilidad-real/informes" className="shrink-0">
            Ver informes
          </ButtonLink>
        </div>
      </Card>

      <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
                Ver evolución mensual/trimestral
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-200">
                Comprueba cómo cambian ingresos, costes, margen y caja prudente
                por periodos sin guardar snapshots contables.
              </p>
            </div>
          </div>
          <ButtonLink href="/rentabilidad-real/evolucion" className="shrink-0">
            Ver evolución
          </ButtonLink>
        </div>
      </Card>

      {!hasTest ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
              Haz el test guiado para activar recomendaciones con más criterio.
            </p>
            <Link
              href="/rentabilidad-real/test"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Hacer test guiado
            </Link>
          </div>
        </Card>
      ) : null}

      {validationStatus === "pending_review" ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
            Tu configuración está pendiente de revisión con tu gestor.
          </p>
        </Card>
      ) : null}

      {validationStatus === "validated" ? (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/35">
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
            Configuración validada.
          </p>
        </Card>
      ) : null}

      {activation.notice ? (
        <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {activation.notice.message}
          </p>
          {activation.notice.impact?.userMessages.length ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {activation.notice.impact.userMessages.map((message) => (
                <li key={message}>- {message}</li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      <RentabilidadRealActiveModulesPanel
        activeProductIds={activation.activeProductIds}
      />

      <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <RotateCcw className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
                Configuración local
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-200">
                Restablece solo respuestas del test, módulos activos, ajustes
                internos y preferencias locales de Rentabilidad Real en este
                navegador. No borra facturas, presupuestos, gastos, impuestos
                ni datos fiscales.
              </p>
              {localResetMessage ? (
                <p className="mt-2 text-sm font-bold text-emerald-700 dark:text-emerald-200">
                  {localResetMessage}
                </p>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={handleLocalReset}
          >
            Restablecer configuración local de Rentabilidad Real
          </Button>
        </div>
      </Card>

      <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
          Próximos pasos
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/rentabilidad-real/test"
            className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            Hacer test guiado
          </Link>
          <a
            href="#modulos-disponibles"
            className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            Activar módulos recomendados
          </a>
          <Link
            href="/rentabilidad-real/validar-configuracion"
            className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            Validar configuración con mi gestor
          </Link>
          <Link
            href="/rentabilidad-real/calculadora/trabajo"
            className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            Calcular rentabilidad de un trabajo
          </Link>
          <Link
            href="/rentabilidad-real/calculadora/horas"
            className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            Calcular por horas/proyecto
          </Link>
          <Link
            href="/rentabilidad-real/simulador-precio-minimo"
            className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            Simular precio mínimo
          </Link>
          <Link
            href="/rentabilidad-real/informes"
            className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            Ver informes de rentabilidad
          </Link>
          <Link
            href="/rentabilidad-real/evolucion"
            className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            Ver evolución mensual/trimestral
          </Link>
        </div>
      </Card>

      <RentabilidadRealMarketplace
        availableProducts={marketplace.availableProducts}
        comingSoonProducts={marketplace.comingSoonProducts}
        onActivate={activation.activate}
        onDeactivate={activation.deactivate}
      />
    </div>
  );
}
