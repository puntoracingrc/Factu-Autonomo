"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, Link2, ShieldCheck } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBilling } from "@/context/BillingContext";
import { useAppStore } from "@/context/AppStore";
import { formatMoney } from "@/lib/calculations";
import { resolveRentabilidadRealBillingAccess } from "@/lib/rentabilidad-real/access-policy";
import {
  buildRentabilidadRealWorkProfitabilityInputFromExistingData,
  calculateRentabilidadRealWorkProfitability,
  DEFAULT_RENTABILIDAD_REAL_CALCULATION_SETTINGS,
  getStoredRentabilidadRealCalculationSettings,
  setStoredRentabilidadRealCalculationSettings,
  type RentabilidadRealCalculationSettings,
} from "@/lib/rentabilidad-real/calculation";
import { getStoredRentabilidadRealWizardAnswers } from "@/lib/rentabilidad-real/wizard-storage";
import type { RentabilidadRealWizardAnswers } from "@/lib/rentabilidad-real/types";
import { useRentabilidadRealActivation } from "../useRentabilidadRealActivation";
import { FixedCostAllocationForm } from "./FixedCostAllocationForm";
import { InternalAdjustmentsPanel } from "./InternalAdjustmentsPanel";
import { WorkExpenseLinkingPanel } from "./WorkExpenseLinkingPanel";
import {
  WorkSourceSelector,
  type WorkCalculatorSourceMode,
} from "./WorkSourceSelector";
import { WorkProfitabilityResultCards } from "./WorkProfitabilityResultCards";
import { WorkProfitabilityWarnings } from "./WorkProfitabilityWarnings";

function hasRelevantAssets(answers: RentabilidadRealWizardAnswers | null) {
  return Boolean(
    answers?.hasOffice ||
      answers?.hasWorkshop ||
      answers?.hasWorkVehicle ||
      answers?.hasRelevantToolsOrEquipment ||
      answers?.hasLightMachinery,
  );
}

export function RentabilidadRealWorkCalculator() {
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
  const [sourceMode, setSourceMode] =
    useState<WorkCalculatorSourceMode>("quote");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settings, setSettings] =
    useState<RentabilidadRealCalculationSettings>(
      DEFAULT_RENTABILIDAD_REAL_CALCULATION_SETTINGS,
    );
  const [storedAnswers, setStoredAnswers] =
    useState<RentabilidadRealWizardAnswers | null>(null);
  const [internalAdjustmentsTotal, setInternalAdjustmentsTotal] = useState(0);

  const quoteDocuments = useMemo(
    () => data.documents.filter((doc) => doc.type === "presupuesto"),
    [data.documents],
  );
  const invoiceDocuments = useMemo(
    () => data.documents.filter((doc) => doc.type === "factura"),
    [data.documents],
  );
  const availableDocuments =
    sourceMode === "quote" ? quoteDocuments : invoiceDocuments;
  const selectedDocument = availableDocuments.find(
    (doc) => doc.id === selectedDocumentId,
  );

  useEffect(() => {
    setSettings(getStoredRentabilidadRealCalculationSettings());
    setStoredAnswers(getStoredRentabilidadRealWizardAnswers());
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    setStoredRentabilidadRealCalculationSettings(settings);
  }, [settings, settingsLoaded]);

  useEffect(() => {
    if (quoteDocuments.length === 0 && invoiceDocuments.length > 0) {
      setSourceMode("invoice");
    }
  }, [invoiceDocuments.length, quoteDocuments.length]);

  useEffect(() => {
    if (
      availableDocuments.length > 0 &&
      !availableDocuments.some((doc) => doc.id === selectedDocumentId)
    ) {
      setSelectedDocumentId(availableDocuments[0].id);
    }
    if (availableDocuments.length === 0 && selectedDocumentId) {
      setSelectedDocumentId("");
    }
  }, [availableDocuments, selectedDocumentId]);

  useEffect(() => {
    setInternalAdjustmentsTotal(0);
  }, [selectedDocumentId]);

  const profitabilityInput = useMemo(() => {
    if (!selectedDocumentId) return null;
    return buildRentabilidadRealWorkProfitabilityInputFromExistingData(data, {
      sourceDocumentId: selectedDocumentId,
      fixedCostAllocationMethod: settings.fixedCostAllocationMethod,
      manualAmount: settings.manualAmount,
      monthlyRevenue: settings.monthlyRevenue,
      monthlyJobs: settings.monthlyJobs,
      workHours: settings.workHours,
      monthlyWorkHours: settings.monthlyWorkHours,
      selectedFixedCostIds: settings.selectedFixedCostIds,
      irpfProvisionPercentage: settings.irpfProvisionPercentage,
    });
  }, [data, selectedDocumentId, settings]);
  const result = useMemo(
    () =>
      profitabilityInput
        ? calculateRentabilidadRealWorkProfitability({
            ...profitabilityInput,
            internalAdjustmentsTotal,
          })
        : null,
    [internalAdjustmentsTotal, profitabilityInput],
  );
  const handleInternalAdjustmentsSummaryChange = useCallback(
    (summary: { totalInternalAdjustments: number }) => {
      setInternalAdjustmentsTotal(summary.totalInternalAdjustments);
    },
    [],
  );
  const hasBaseActive = activation.activeProductIds.includes("RR_BASE");
  const hasTradesActive =
    activation.activeProductIds.includes("RR_TRADES_JOBS");
  const hasFixedCostsProActive =
    activation.activeProductIds.includes("RR_FIXED_COSTS_PRO");
  const hasAssetsActive =
    activation.activeProductIds.includes("RR_ASSETS_LIGHT");

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/rentabilidad-real"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800 dark:text-blue-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Rentabilidad Real
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-50">
            Calcular rentabilidad de un trabajo
          </h1>
          <p className="mt-1 max-w-3xl text-base leading-7 text-slate-500 dark:text-slate-400">
            Analiza una obra o servicio usando tus presupuestos, facturas,
            gastos y gastos fijos existentes.
          </p>
        </div>
      </div>

      {!hasBaseActive ? (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-blue-950 dark:text-blue-100">
                Activa Rentabilidad Real Base para usar esta calculadora como
                módulo principal.
              </p>
              <p className="mt-1 text-sm text-blue-900 dark:text-blue-100">
                En esta sesión puedes revisar la pantalla, pero el módulo base
                debe quedar activo.
              </p>
            </div>
            <Button
              onClick={() => activation.activate("RR_BASE")}
              className="shrink-0"
            >
              Activar base
            </Button>
          </div>
        </Card>
      ) : null}

      {!hasTradesActive ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Para obras y oficios, el motor recomendado es Trabajos/obras. Puedes
            calcular con datos existentes, pero conviene activarlo si este será
            tu uso principal.
          </p>
        </Card>
      ) : null}

      {hasRelevantAssets(storedAnswers) && !hasAssetsActive ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Tu test apunta a vehículo, local o herramientas relevantes. Esos
            costes tendrán mejor tratamiento con Activos Light en una fase
            posterior.
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/45 dark:text-blue-200">
              <Calculator className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
                Fuente del trabajo
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Elige un presupuesto o factura ya existente. No se creará ni se
                modificará ningún documento.
              </p>
            </div>
          </div>
          <WorkSourceSelector
            sourceMode={sourceMode}
            onSourceModeChange={setSourceMode}
            documents={availableDocuments}
            selectedDocumentId={selectedDocumentId}
            onSelectedDocumentChange={setSelectedDocumentId}
          />
        </Card>

        <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
          <FixedCostAllocationForm
            settings={settings}
            fixedCostCandidates={profitabilityInput?.fixedCostCandidates ?? []}
            fixedCostsAdvancedActive={hasFixedCostsProActive}
            onSettingsChange={setSettings}
          />
        </Card>
      </div>

      {selectedDocument && profitabilityInput && result ? (
        <>
          <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200">
                <Link2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
                  Conexión detectada
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <ConnectionPill
                    label="Presupuesto"
                    value={
                      result.quoteSummary
                        ? `${result.quoteSummary.number} · ${formatMoney(result.quoteSummary.subtotal)}`
                        : "Sin vínculo detectado"
                    }
                  />
                  <ConnectionPill
                    label="Factura"
                    value={
                      result.invoiceSummary
                        ? `${result.invoiceSummary.number} · ${formatMoney(result.invoiceSummary.subtotal)}`
                        : "Sin vínculo detectado"
                    }
                  />
                  <ConnectionPill
                    label="Gastos enlazados"
                    value={`${result.directCosts.length} encontrados`}
                  />
                  <ConnectionPill
                    label="Gastos fijos candidatos"
                    value={`${result.fixedCostCandidates.length} encontrados`}
                  />
                </div>
              </div>
            </div>
          </Card>

          <WorkExpenseLinkingPanel profitabilityInput={profitabilityInput} />

          <InternalAdjustmentsPanel
            sourceDocumentId={profitabilityInput.source.sourceDocumentId}
            sourceType={profitabilityInput.source.sourceType}
            onSummaryChange={handleInternalAdjustmentsSummaryChange}
          />

          <WorkProfitabilityResultCards result={result} />

          <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
                  Trazabilidad
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Este cálculo usa tus datos existentes. No se ha creado ningún
                  gasto, factura ni impuesto nuevo.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {result.sourceLinks.map((link) => (
                    <span
                      key={`${link.sourceType}-${link.sourceId ?? link.label}`}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {link.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <WorkProfitabilityWarnings warnings={result.warnings} />
        </>
      ) : (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
              Necesitas al menos un presupuesto o una factura existente para
              calcular un trabajo.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href="/presupuestos/nuevo" variant="secondary">
                Crear presupuesto
              </ButtonLink>
              <ButtonLink href="/facturas/nuevo" variant="secondary">
                Crear factura
              </ButtonLink>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function ConnectionPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-950 dark:text-slate-50">
        {value}
      </p>
    </div>
  );
}
