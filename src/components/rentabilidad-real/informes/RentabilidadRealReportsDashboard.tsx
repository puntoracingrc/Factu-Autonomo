"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, ClipboardList, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { resolveRentabilidadRealBillingAccess } from "@/lib/rentabilidad-real/access-policy";
import {
  buildClientProfitabilityReport,
  buildDataQualityReport,
  buildDocumentProfitabilityReport,
  DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
  getStoredRentabilidadRealReportSettings,
  setStoredRentabilidadRealReportSettings,
  type RentabilidadRealReportSettings,
} from "@/lib/rentabilidad-real/reports";
import {
  getStoredRentabilidadRealCalculationSettings,
  type RentabilidadRealCalculationSettings,
} from "@/lib/rentabilidad-real/calculation";
import { useRentabilidadRealActivation } from "../useRentabilidadRealActivation";
import { ClientProfitabilityTable } from "./ClientProfitabilityTable";
import { DataQualityPanel } from "./DataQualityPanel";
import { DocumentProfitabilityTable } from "./DocumentProfitabilityTable";
import { ReportsEmptyState } from "./ReportsEmptyState";
import { ReportsFiltersPanel } from "./ReportsFiltersPanel";
import { ReportsSummaryCards } from "./ReportsSummaryCards";
import { ReportsWarnings } from "./ReportsWarnings";

function hasAssetLikeCosts(text: string): boolean {
  const normalized = text.toLowerCase();
  return [
    "vehiculo",
    "vehículo",
    "coche",
    "furgoneta",
    "local",
    "taller",
    "herramienta",
    "maquinaria",
  ].some((word) => normalized.includes(word));
}

export function RentabilidadRealReportsDashboard() {
  const { data, ready } = useAppStore();
  const { plan, billingEnabled } = useBilling();
  const rentabilidadRealAccess = resolveRentabilidadRealBillingAccess({
    planKey: plan,
    billingEnabled,
  });
  const activation = useRentabilidadRealActivation({
    planKey: rentabilidadRealAccess.planKey,
    isProPlus: rentabilidadRealAccess.isProPlus,
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settings, setSettings] = useState<RentabilidadRealReportSettings>(
    DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
  );
  const [savedWorkSettings, setSavedWorkSettings] =
    useState<RentabilidadRealCalculationSettings | undefined>();

  useEffect(() => {
    setSettings(getStoredRentabilidadRealReportSettings());
    setSavedWorkSettings(getStoredRentabilidadRealCalculationSettings());
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    setStoredRentabilidadRealReportSettings(settings);
  }, [settings, settingsLoaded]);

  const documentReport = useMemo(
    () =>
      buildDocumentProfitabilityReport(data, {
        ...settings,
        savedWorkCalculationSettings: savedWorkSettings,
      }),
    [data, savedWorkSettings, settings],
  );
  const clientReport = useMemo(
    () => buildClientProfitabilityReport(documentReport.rows),
    [documentReport.rows],
  );
  const dataQualityReport = useMemo(
    () => buildDataQualityReport(data, documentReport.rows, settings),
    [data, documentReport.rows, settings],
  );
  const hasDocuments = data.documents.some(
    (document) => document.type === "factura" || document.type === "presupuesto",
  );
  const hasBaseActive = activation.activeProductIds.includes("RR_BASE");
  const hasTradesActive =
    activation.activeProductIds.includes("RR_TRADES_JOBS");
  const hasHoursActive =
    activation.activeProductIds.includes("RR_HOURS_PROJECTS");
  const hasFixedCostsProActive =
    activation.activeProductIds.includes("RR_FIXED_COSTS_PRO");
  const hasAssetsActive =
    activation.activeProductIds.includes("RR_ASSETS_LIGHT");
  const canActivateIncluded = rentabilidadRealAccess.isProPlus;
  const hasAssetLikeExpense = data.expenses.some((expense) =>
    hasAssetLikeCosts(
      [expense.description, expense.category, expense.supplierName]
        .filter(Boolean)
        .join(" "),
    ),
  );

  if (!ready) {
    return (
      <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Cargando tus datos existentes...
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/rentabilidad-real"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800 dark:text-blue-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Rentabilidad Real
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-50">
          Informes de Rentabilidad Real
        </h1>
        <p className="mt-1 max-w-4xl text-base leading-7 text-slate-500 dark:text-slate-400">
          Analiza tus facturas, presupuestos, gastos enlazados, gastos fijos y
          ajustes internos sin duplicar tu contabilidad.
        </p>
      </div>

      {!hasBaseActive ? (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-blue-950 dark:text-blue-100">
              RR_BASE debe estar activo para usar Informes de Rentabilidad Real.
            </p>
            {canActivateIncluded ? (
              <Button type="button" onClick={() => activation.activate("RR_BASE")}>
                Activar base
              </Button>
            ) : (
              <Link
                href="/precios"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white"
              >
                Mejorar a Pro+
              </Link>
            )}
          </div>
        </Card>
      ) : null}

      {!hasTradesActive ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Para informes de trabajos y obras conviene activar
              Rentabilidad por Obras y Oficios.
            </p>
            {canActivateIncluded ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => activation.activate("RR_TRADES_JOBS")}
              >
                Activar incluido
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {!hasHoursActive ? (
        <Card className="border-sky-200 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/35">
          <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
            Los informes v1 se basan en documentos. Horas/proyectos queda
            recomendado para análisis por tiempo.
          </p>
        </Card>
      ) : null}

      {settings.fixedCostAllocationMode !== "none" && !hasFixedCostsProActive ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Para imputar gastos fijos con más criterio, conviene activar Gastos
            Fijos Pro.
          </p>
        </Card>
      ) : null}

      {hasAssetLikeExpense && !hasAssetsActive ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Hay costes que parecen de vehículo, local o herramientas. Activos
            Light puede mejorar ese análisis cuando lo uses.
          </p>
        </Card>
      ) : null}

      {activation.notice ? (
        <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {activation.notice.message}
          </p>
        </Card>
      ) : null}

      <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/45 dark:text-blue-200">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
              Filtros del informe
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Las preferencias se guardan en este navegador. Los resultados se
              recalculan al vuelo.
            </p>
          </div>
        </div>
        <ReportsFiltersPanel settings={settings} onSettingsChange={setSettings} />
      </Card>

      {documentReport.rows.length === 0 ? (
        <ReportsEmptyState hasDocuments={hasDocuments} />
      ) : (
        <>
          <ReportsWarnings warnings={documentReport.warnings} />
          <ReportsSummaryCards summary={documentReport.summary} />

          <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
                  Informe por documento
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Cada fila representa una factura, un presupuesto o un par
                  presupuesto/factura vinculado.
                </p>
              </div>
            </div>
            <DocumentProfitabilityTable rows={documentReport.rows} />
          </Card>

          <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
                  Informe por cliente
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Agrupa los documentos analizados por cliente y compara margen
                  documentado e interno.
                </p>
              </div>
            </div>
            <ClientProfitabilityTable rows={clientReport.rows} />
          </Card>

          <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
              Calidad de datos
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Señales que pueden cambiar la rentabilidad cuando se revisen.
            </p>
            <div className="mt-4">
              <DataQualityPanel report={dataQualityReport} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
