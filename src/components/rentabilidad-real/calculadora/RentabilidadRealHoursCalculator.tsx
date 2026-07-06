"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { resolveRentabilidadRealBillingAccess } from "@/lib/rentabilidad-real/access-policy";
import { isSupersededRentabilidadRealDocument } from "@/lib/rentabilidad-real/document-chain";
import {
  getDocumentAnalysisMode,
  setDocumentAnalysisMode,
  type RentabilidadRealDocumentAnalysisMode,
} from "@/lib/rentabilidad-real/document-analysis-modes";
import {
  buildRentabilidadRealHoursProfitabilityInputFromExistingData,
  calculateRentabilidadRealHoursProfitability,
  DEFAULT_RENTABILIDAD_REAL_HOURS_SETTINGS,
  getStoredRentabilidadRealHoursSettings,
  setStoredRentabilidadRealHoursSettings,
  type RentabilidadRealHoursCalculationSettings,
} from "@/lib/rentabilidad-real/calculation";
import { useRentabilidadRealActivation } from "../useRentabilidadRealActivation";
import { DocumentAnalysisModeField } from "../DocumentAnalysisModeField";
import { HoursInputForm } from "./HoursInputForm";
import { HoursProfitabilityResultCards } from "./HoursProfitabilityResultCards";
import { HoursProfitabilityWarnings } from "./HoursProfitabilityWarnings";
import { HoursSourceSelector } from "./HoursSourceSelector";
import { InternalAdjustmentsPanel } from "./InternalAdjustmentsPanel";

export function RentabilidadRealHoursCalculator() {
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
  const [settings, setSettings] =
    useState<RentabilidadRealHoursCalculationSettings>(
      DEFAULT_RENTABILIDAD_REAL_HOURS_SETTINGS,
    );
  const [internalAdjustmentsTotal, setInternalAdjustmentsTotal] = useState(0);
  const [selectedAnalysisMode, setSelectedAnalysisMode] =
    useState<RentabilidadRealDocumentAnalysisMode>("unknown");
  const documents = useMemo(
    () =>
      data.documents.filter(
        (doc) =>
          (doc.type === "factura" || doc.type === "presupuesto") &&
          !isSupersededRentabilidadRealDocument(doc),
      ),
    [data.documents],
  );

  useEffect(() => {
    setSettings(getStoredRentabilidadRealHoursSettings());
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    setStoredRentabilidadRealHoursSettings(settings);
  }, [settings, settingsLoaded]);

  useEffect(() => {
    if (
      settings.sourceType === "document" &&
      documents.length > 0 &&
      !documents.some((doc) => doc.id === settings.selectedDocumentId)
    ) {
      setSettings((current) => ({
        ...current,
        selectedDocumentId: documents[0].id,
      }));
    }
  }, [documents, settings.selectedDocumentId, settings.sourceType]);

  useEffect(() => {
    setInternalAdjustmentsTotal(0);
  }, [settings.manualProjectId, settings.selectedDocumentId, settings.sourceType]);

  useEffect(() => {
    if (settings.sourceType !== "document" || !settings.selectedDocumentId) {
      setSelectedAnalysisMode("unknown");
      return;
    }

    const storedMode = getDocumentAnalysisMode(settings.selectedDocumentId);
    const defaultMode =
      storedMode === "unknown" ? "hours_project" : storedMode;
    setSelectedAnalysisMode(defaultMode);
    if (storedMode === "unknown") {
      setDocumentAnalysisMode(settings.selectedDocumentId, defaultMode);
    }
  }, [settings.selectedDocumentId, settings.sourceType]);

  function handleAnalysisModeChange(mode: RentabilidadRealDocumentAnalysisMode) {
    setSelectedAnalysisMode(mode);
    if (settings.sourceType === "document" && settings.selectedDocumentId) {
      setDocumentAnalysisMode(settings.selectedDocumentId, mode);
    }
  }

  const input = useMemo(
    () =>
      buildRentabilidadRealHoursProfitabilityInputFromExistingData(data, {
        sourceType: settings.sourceType,
        selectedDocumentId: settings.selectedDocumentId,
        projectName: settings.projectName,
        customerName: settings.customerName,
        billingModel: settings.billingModel,
        incomeWithoutIndirectTax: settings.incomeWithoutIndirectTax,
        vatPercent: settings.vatPercent,
        manualDirectCosts: settings.manualDirectCosts,
        fixedCostAllocationMethod: settings.fixedCostAllocationMethod,
        manualAmount: settings.manualAmount,
        monthlyRevenue: settings.monthlyRevenue,
        monthlyWorkHours: settings.monthlyWorkHours,
        selectedFixedCostIds: settings.selectedFixedCostIds,
        billedHours: settings.billedHours,
        realWorkedHours: settings.realWorkedHours,
        nonBillableHours: settings.nonBillableHours,
        meetingHours: settings.meetingHours,
        revisionHours: settings.revisionHours,
        adminHours: settings.adminHours,
        totalRealHoursOverride: settings.totalRealHoursOverride,
        irpfProvisionPercentage: settings.irpfProvisionPercentage,
      }),
    [data, settings],
  );
  const result = useMemo(
    () =>
      input
        ? calculateRentabilidadRealHoursProfitability({
            ...input,
            internalAdjustmentsTotal,
          })
        : null,
    [input, internalAdjustmentsTotal],
  );
  const internalAdjustmentSource = useMemo(() => {
    if (settings.sourceType === "manual") {
      return {
        sourceDocumentId: settings.manualProjectId,
        sourceType: "hours_project" as const,
      };
    }

    const documentId = input?.sourceDocumentId ?? settings.selectedDocumentId;
    const document = documents.find((doc) => doc.id === documentId);
    if (!documentId || !document) return null;

    return {
      sourceDocumentId: documentId,
      sourceType: document.type === "factura" ? ("invoice" as const) : ("quote" as const),
    };
  }, [documents, input?.sourceDocumentId, settings.manualProjectId, settings.selectedDocumentId, settings.sourceType]);
  const handleInternalAdjustmentsSummaryChange = useCallback(
    (summary: { totalInternalAdjustments: number }) => {
      setInternalAdjustmentsTotal(summary.totalInternalAdjustments);
    },
    [],
  );
  const hasBaseActive = activation.activeProductIds.includes("RR_BASE");
  const hasHoursActive =
    activation.activeProductIds.includes("RR_HOURS_PROJECTS");
  const hasFixedCostsProActive =
    activation.activeProductIds.includes("RR_FIXED_COSTS_PRO");
  const usesAdvancedFixedCosts =
    settings.fixedCostAllocationMethod !== "none" &&
    settings.fixedCostAllocationMethod !== "manual_amount";

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
          Calcular rentabilidad por horas o proyecto
        </h1>
        <p className="mt-1 max-w-3xl text-base leading-7 text-slate-500 dark:text-slate-400">
          Descubre cuánto ganas realmente por hora real trabajada, no solo por
          hora facturada.
        </p>
      </div>

      {!hasBaseActive ? (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-blue-950 dark:text-blue-100">
              RR_BASE debe estar activo para usar Rentabilidad Real como módulo
              principal.
            </p>
            <Button onClick={() => activation.activate("RR_BASE")}>
              Activar base
            </Button>
          </div>
        </Card>
      ) : null}

      {!hasHoursActive ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Esta calculadora está pensada para el módulo Rentabilidad por
              Horas y Proyectos.
            </p>
            {rentabilidadRealAccess.isProPlus ? (
              <Button
                type="button"
                onClick={() => activation.activate("RR_HOURS_PROJECTS")}
              >
                Activar módulo
              </Button>
            ) : (
              <Link
                href="/cuenta"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white"
              >
                Mejorar a Pro+
              </Link>
            )}
          </div>
        </Card>
      ) : null}

      {usesAdvancedFixedCosts && !hasFixedCostsProActive ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Si usas reparto avanzado de gastos fijos, conviene activar Gastos
            Fijos Pro.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/45 dark:text-blue-200">
              <Clock3 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
                Origen del proyecto
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Usa un documento existente o una simulación local sin crear
                datos contables.
              </p>
            </div>
          </div>
          <HoursSourceSelector
            sourceType={settings.sourceType}
            documents={documents}
            selectedDocumentId={settings.selectedDocumentId}
            onSourceTypeChange={(sourceType) =>
              setSettings((current) => ({ ...current, sourceType }))
            }
            onSelectedDocumentChange={(selectedDocumentId) =>
              setSettings((current) => ({ ...current, selectedDocumentId }))
            }
          />
          {settings.sourceType === "document" && settings.selectedDocumentId ? (
            <div className="mt-4">
              <DocumentAnalysisModeField
                value={selectedAnalysisMode}
                onChange={handleAnalysisModeChange}
                options={[
                  { value: "hours_project" },
                  { value: "retainer" },
                  { value: "simple_document" },
                ]}
              />
            </div>
          ) : null}
        </Card>

        <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
          <HoursInputForm
            settings={settings}
            onSettingsChange={setSettings}
            documentMode={settings.sourceType === "document"}
            fixedCostCandidates={input?.fixedCostCandidates ?? []}
            allocatedFixedCosts={result?.allocatedFixedCosts ?? 0}
          />
        </Card>
      </div>

      {result ? (
        <>
          {internalAdjustmentSource ? (
            <InternalAdjustmentsPanel
              sourceDocumentId={internalAdjustmentSource.sourceDocumentId}
              sourceType={internalAdjustmentSource.sourceType}
              onSummaryChange={handleInternalAdjustmentsSummaryChange}
            />
          ) : null}
          <HoursProfitabilityResultCards result={result} />
          <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
              Trazabilidad
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Reutiliza facturas, presupuestos, gastos enlazados, gastos fijos
              e impuestos existentes. Los costes manuales son solo simulación
              local.
            </p>
          </Card>
          <HoursProfitabilityWarnings warnings={result.warnings} />
        </>
      ) : (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
            Selecciona un documento o cambia a modo manual para calcular.
          </p>
        </Card>
      )}
    </div>
  );
}
