"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  ClipboardCheck,
  Clock3,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBilling } from "@/context/BillingContext";
import { resolveRentabilidadRealBillingAccess } from "@/lib/rentabilidad-real/access-policy";
import { buildTestResultViewModel } from "@/lib/rentabilidad-real/view-model";
import type {
  RentabilidadRealScoringResult,
  RentabilidadRealWizardAnswers,
} from "@/lib/rentabilidad-real/types";
import { useRentabilidadRealActivation } from "./useRentabilidadRealActivation";

export function RentabilidadRealWizardResult({
  answers,
  scoringResult,
}: {
  answers: RentabilidadRealWizardAnswers;
  scoringResult: RentabilidadRealScoringResult;
}) {
  const { plan, billingEnabled } = useBilling();
  const rentabilidadRealAccess = resolveRentabilidadRealBillingAccess({
    planKey: plan,
    billingEnabled,
  });
  const activation = useRentabilidadRealActivation({
    planKey: rentabilidadRealAccess.planKey,
    isProPlus: rentabilidadRealAccess.isProPlus,
  });
  const viewModel = buildTestResultViewModel(scoringResult);
  const canActivateRecommended =
    !scoringResult.outOfPhase && scoringResult.recommendedProductIds.length > 0;
  const showWorkCalculatorCta =
    scoringResult.level === 2 || scoringResult.level === 4;
  const showHoursProjectsNote = scoringResult.level === 3;
  const showSecondaryHoursCta =
    showWorkCalculatorCta &&
    Boolean(answers.worksByProjects || answers.worksByHours);
  const showPriceSimulatorCta =
    !scoringResult.outOfPhase &&
    scoringResult.level >= 1 &&
    scoringResult.level <= 4;
  const showReportsCta = showPriceSimulatorCta;

  function activateRecommended() {
    if (!canActivateRecommended) return;
    activation.activateMany(scoringResult.recommendedProductIds);
  }

  return (
    <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700 dark:bg-blue-950/45 dark:text-blue-200">
            <ClipboardCheck className="h-4 w-4" />
            Resultado del test
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-950 dark:text-slate-50">
            {scoringResult.profileLabel}
          </h2>
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
            Nivel detectado: {scoringResult.level}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {scoringResult.explanation}
          </p>
        </div>

        {scoringResult.outOfPhase ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100">
            <div className="flex items-start gap-2 font-bold">
              <ShieldAlert className="mt-0.5 h-4 w-4" />
              Caso reservado para fase futura
            </div>
            <p className="mt-2">
              No activaremos motores de niveles 1 a 4 para este caso.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">
            Productos recomendados
          </h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {viewModel.recommendedProducts.map((product) => (
              <li key={product.id}>- {product.name}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">
            Productos opcionales
          </h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {viewModel.optionalProducts.length > 0 ? (
              viewModel.optionalProducts.map((product) => (
                <li key={product.id}>- {product.name}</li>
              ))
            ) : (
              <li>- Sin extras opcionales en este resultado</li>
            )}
          </ul>
        </div>
      </div>

      {scoringResult.outOfPhase ? (
        <div className="mt-5">
          <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">
            Productos de fase futura
          </h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {viewModel.unavailableProducts.map((product) => (
              <li key={product.id}>- {product.name}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {scoringResult.pendingQuestions.length > 0 ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <p className="font-bold">Preguntas pendientes</p>
          <p className="mt-1">{scoringResult.pendingQuestions.join(", ")}</p>
        </div>
      ) : null}

      {activation.notice ? (
        <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-100">
          {activation.notice.message}
        </div>
      ) : null}

      {showWorkCalculatorCta ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <Calculator className="mt-0.5 h-4 w-4 text-emerald-700 dark:text-emerald-200" />
              <div>
                <p className="text-sm font-black text-emerald-950 dark:text-emerald-100">
                  Puedes empezar calculando una obra o servicio real.
                </p>
                <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-100">
                  La calculadora usa presupuesto, factura y gastos ya existentes.
                </p>
              </div>
            </div>
            <Link
              href="/rentabilidad-real/calculadora/trabajo"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Ir a calculadora
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : null}

      {showHoursProjectsNote ? (
        <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/60 dark:bg-sky-950/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <Clock3 className="mt-0.5 h-4 w-4 text-sky-700 dark:text-sky-200" />
              <div>
                <p className="text-sm font-black text-sky-950 dark:text-sky-100">
                  Tu resultado encaja con horas/proyectos.
                </p>
                <p className="mt-1 text-sm text-sky-900 dark:text-sky-100">
                  Analiza cuánto ganas por hora real trabajada.
                </p>
              </div>
            </div>
            <Link
              href="/rentabilidad-real/calculadora/horas"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Ir a horas/proyecto
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : null}

      {showSecondaryHoursCta ? (
        <div className="mt-3">
          <Link
            href="/rentabilidad-real/calculadora/horas"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-sky-200 bg-white px-4 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            También calcular por horas/proyecto
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      {showPriceSimulatorCta ? (
        <div className="mt-3">
          <Link
            href="/rentabilidad-real/simulador-precio-minimo"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            Simular precio mínimo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      {showReportsCta ? (
        <div className="mt-3">
          <Link
            href="/rentabilidad-real/informes"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <BarChart3 className="h-4 w-4" />
            Ver informes de rentabilidad
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          onClick={activateRecommended}
          disabled={!canActivateRecommended}
          className="sm:w-auto"
        >
          Activar recomendados incluidos en Pro+
        </Button>
        <Link
          href="/rentabilidad-real"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-blue-200 bg-white px-5 text-base font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          Ver marketplace
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/rentabilidad-real/validar-configuracion"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-base font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950"
        >
          Validar configuración con mi gestor
        </Link>
      </div>

      {answers.legalForm ? null : (
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          La forma jurídica queda pendiente porque respondiste “No lo sé”.
        </p>
      )}
    </Card>
  );
}
