"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { roundMoney } from "@/lib/calculations";
import { resolveRentabilidadRealBillingAccess } from "@/lib/rentabilidad-real/access-policy";
import {
  mapExistingExpenseToProfitabilityFixedCost,
  mapExistingRecurringExpenseToProfitabilityFixedCost,
  type ProfitabilityFixedCostSource,
} from "@/lib/rentabilidad-real/integrations";
import {
  buildRentabilidadRealWorkProfitabilityInputFromExistingData,
} from "@/lib/rentabilidad-real/calculation";
import {
  DEFAULT_RENTABILIDAD_REAL_PRICE_SIMULATOR_SETTINGS,
  getStoredRentabilidadRealPriceSimulatorSettings,
  setStoredRentabilidadRealPriceSimulatorSettings,
  simulateRentabilidadRealMinimumPrice,
  type RentabilidadRealPriceSimulatorMode,
  type RentabilidadRealPriceSimulatorObjectiveType,
  type RentabilidadRealPriceSimulatorSettings,
} from "@/lib/rentabilidad-real/price-simulator";
import type { AppData } from "@/lib/types";
import { useRentabilidadRealActivation } from "../useRentabilidadRealActivation";
import { PriceSimulatorInputs } from "./PriceSimulatorInputs";
import { PriceSimulatorModeSelector } from "./PriceSimulatorModeSelector";
import { PriceSimulatorResultCards } from "./PriceSimulatorResultCards";
import { PriceSimulatorWarnings } from "./PriceSimulatorWarnings";

function sumFixedCostsFromData(data: AppData): number {
  const fixedCosts = [
    ...data.expenses
      .map(mapExistingExpenseToProfitabilityFixedCost)
      .filter((item): item is ProfitabilityFixedCostSource => Boolean(item)),
    ...data.recurringExpenses.map(
      mapExistingRecurringExpenseToProfitabilityFixedCost,
    ),
  ];
  return roundMoney(fixedCosts.reduce((total, cost) => total + cost.amount, 0));
}

function objectiveForMode(
  mode: RentabilidadRealPriceSimulatorMode,
): RentabilidadRealPriceSimulatorObjectiveType {
  if (mode === "hourly_rate") return "per_hour";
  if (mode === "monthly_revenue") return "monthly";
  return "per_job";
}

export function RentabilidadRealPriceSimulator() {
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
  const [fixedCostsApplied, setFixedCostsApplied] = useState(false);
  const [documentDefaultsAppliedTo, setDocumentDefaultsAppliedTo] =
    useState("");
  const [settings, setSettings] =
    useState<RentabilidadRealPriceSimulatorSettings>(
      DEFAULT_RENTABILIDAD_REAL_PRICE_SIMULATOR_SETTINGS,
    );

  const documents = useMemo(
    () =>
      data.documents.filter(
        (doc) => doc.type === "factura" || doc.type === "presupuesto",
      ),
    [data.documents],
  );
  const detectedMonthlyFixedCosts = useMemo(
    () => sumFixedCostsFromData(data),
    [data],
  );
  const selectedDocumentId = settings.selectedDocumentId;
  const selectedWorkInput = useMemo(() => {
    if (settings.sourceMode !== "document" || !selectedDocumentId) return null;
    return buildRentabilidadRealWorkProfitabilityInputFromExistingData(data, {
      sourceDocumentId: selectedDocumentId,
      fixedCostAllocationMethod: "none",
      irpfProvisionPercentage: settings.irpfProvisionPercentage,
    });
  }, [
    data,
    selectedDocumentId,
    settings.irpfProvisionPercentage,
    settings.sourceMode,
  ]);
  const detectedDocumentDirectCosts = useMemo(
    () =>
      selectedWorkInput
        ? roundMoney(
            selectedWorkInput.directCosts.reduce(
              (total, cost) => total + cost.amount,
              0,
            ),
          )
        : undefined,
    [selectedWorkInput],
  );
  const detectedDocumentIncome =
    selectedWorkInput?.invoiceSummary?.subtotal ??
    selectedWorkInput?.quoteSummary?.subtotal;

  useEffect(() => {
    setSettings(getStoredRentabilidadRealPriceSimulatorSettings());
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    setStoredRentabilidadRealPriceSimulatorSettings(settings);
  }, [settings, settingsLoaded]);

  useEffect(() => {
    if (
      settings.sourceMode === "document" &&
      documents.length > 0 &&
      !documents.some((doc) => doc.id === settings.selectedDocumentId)
    ) {
      setSettings((current) => ({
        ...current,
        selectedDocumentId: documents[0].id,
      }));
    }
  }, [documents, settings.selectedDocumentId, settings.sourceMode]);

  useEffect(() => {
    if (!settingsLoaded || fixedCostsApplied || detectedMonthlyFixedCosts <= 0) {
      return;
    }
    setFixedCostsApplied(true);
    setSettings((current) =>
      current.monthlyFixedCosts > 0
        ? current
        : { ...current, monthlyFixedCosts: detectedMonthlyFixedCosts },
    );
  }, [detectedMonthlyFixedCosts, fixedCostsApplied, settingsLoaded]);

  useEffect(() => {
    if (
      !settingsLoaded ||
      settings.sourceMode !== "document" ||
      !selectedDocumentId ||
      documentDefaultsAppliedTo === selectedDocumentId ||
      !selectedWorkInput
    ) {
      return;
    }

    setDocumentDefaultsAppliedTo(selectedDocumentId);
    setSettings((current) => ({
      ...current,
      directCosts: detectedDocumentDirectCosts ?? current.directCosts,
      averageJobPrice: detectedDocumentIncome ?? current.averageJobPrice,
      vatRate: data.profile.iva.defaultRate,
    }));
  }, [
    data.profile.iva.defaultRate,
    detectedDocumentDirectCosts,
    detectedDocumentIncome,
    documentDefaultsAppliedTo,
    selectedDocumentId,
    selectedWorkInput,
    settings.sourceMode,
    settingsLoaded,
  ]);

  const result = useMemo(
    () =>
      simulateRentabilidadRealMinimumPrice({
        ...settings,
        vatRate: settings.vatRate ?? data.profile.iva.defaultRate,
        irpfProvisionPercentage:
          settings.irpfProvisionPercentage ?? data.profile.irpfPercent ?? 20,
      }),
    [data.profile.irpfPercent, data.profile.iva.defaultRate, settings],
  );
  const hasBaseActive = activation.activeProductIds.includes("RR_BASE");
  const hasPriceSimulatorActive =
    activation.activeProductIds.includes("RR_PRICE_SIMULATOR");
  const canActivatePriceSimulator = rentabilidadRealAccess.isProPlus;

  function changeMode(mode: RentabilidadRealPriceSimulatorMode) {
    setSettings((current) => ({
      ...current,
      mode,
      objectiveType: objectiveForMode(mode),
    }));
  }

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
          Simulador de Precio Mínimo
        </h1>
        <p className="mt-1 max-w-3xl text-base leading-7 text-slate-500 dark:text-slate-400">
          Calcula cuánto deberías cobrar como mínimo por hora, trabajo,
          proyecto o mes usando costes reales y supuestos prudentes.
        </p>
      </div>

      {!hasBaseActive ? (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-blue-950 dark:text-blue-100">
              Activa Rentabilidad Real Base para usar este simulador dentro del
              módulo principal.
            </p>
            <Button type="button" onClick={() => activation.activate("RR_BASE")}>
              Activar base
            </Button>
          </div>
        </Card>
      ) : null}

      {!hasPriceSimulatorActive ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              El Simulador de Precio Mínimo está incluido en Pro+ para
              autónomos persona física hasta nivel 4.
            </p>
            {canActivatePriceSimulator ? (
              <Button
                type="button"
                onClick={() => activation.activate("RR_PRICE_SIMULATOR")}
              >
                Activar incluido
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
            <Calculator className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
              Tipo de simulación
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Cambia el modo según quieras precio por hora, trabajo cerrado,
              proyecto o facturación mensual mínima.
            </p>
          </div>
        </div>
        <PriceSimulatorModeSelector
          mode={settings.mode}
          onModeChange={changeMode}
        />
      </Card>

      <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
        <PriceSimulatorInputs
          settings={settings}
          documents={documents}
          detectedMonthlyFixedCosts={detectedMonthlyFixedCosts}
          detectedDocumentDirectCosts={detectedDocumentDirectCosts}
          detectedDocumentIncome={detectedDocumentIncome}
          onSettingsChange={setSettings}
        />
      </Card>

      <PriceSimulatorResultCards result={result} />

      <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
              Trazabilidad
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Reutiliza facturas, presupuestos, gastos directos enlazados y
              gastos fijos existentes cuando eliges un documento. Los resultados
              no se guardan como verdad contable.
            </p>
          </div>
        </div>
      </Card>

      <PriceSimulatorWarnings warnings={result.warnings} />
    </div>
  );
}
