"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, CalendarRange, Table2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { formatMoney } from "@/lib/calculations";
import {
  getStoredRentabilidadRealCalculationSettings,
  type RentabilidadRealCalculationSettings,
} from "@/lib/rentabilidad-real/calculation";
import { resolveRentabilidadRealBillingAccess } from "@/lib/rentabilidad-real/access-policy";
import {
  RENTABILIDAD_REAL_DOCUMENT_ANALYSIS_MODES,
  getDocumentAnalysisModeLabel,
  getStoredDocumentAnalysisModes,
  type RentabilidadRealDocumentAnalysisModeFilter,
  type RentabilidadRealDocumentAnalysisModesById,
} from "@/lib/rentabilidad-real/document-analysis-modes";
import {
  buildRentabilidadRealEvolutionReport,
  type RentabilidadRealEvolutionGrouping,
  type RentabilidadRealEvolutionPeriodRow,
  type RentabilidadRealEvolutionSummary,
} from "@/lib/rentabilidad-real/evolution";
import {
  DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
  getStoredRentabilidadRealReportSettings,
  type RentabilidadRealReportFixedCostAllocationMode,
  type RentabilidadRealReportSettings,
} from "@/lib/rentabilidad-real/reports";
import { useRentabilidadRealActivation } from "../useRentabilidadRealActivation";

function formatPercent(value: number): string {
  return `${value.toLocaleString("es-ES", { maximumFractionDigits: 2 })}%`;
}

function summaryCards(summary: RentabilidadRealEvolutionSummary) {
  return [
    {
      label: "Ingresos sin IVA",
      value: formatMoney(summary.incomeWithoutIndirectTax),
      detail: `${summary.documentCount} documentos`,
    },
    {
      label: "Costes directos",
      value: formatMoney(summary.totalDirectCosts),
      detail: "Gastos enlazados",
    },
    {
      label: "Gastos fijos imputados",
      value: formatMoney(summary.allocatedFixedCosts),
      detail: "Segun regla activa",
    },
    {
      label: "Beneficio documentado",
      value: formatMoney(summary.operatingProfit),
      detail: `${summary.periodCount} periodos`,
      tone: summary.operatingProfit >= 0 ? "positive" : "warning",
    },
    {
      label: "Beneficio interno",
      value: formatMoney(summary.internalRealProfit),
      detail: "Tras ajustes internos",
      tone: summary.internalRealProfit >= 0 ? "positive" : "warning",
    },
    {
      label: "Margen medio",
      value: formatPercent(summary.averageMarginPercentage),
      detail: "Sobre ingresos analizados",
      tone: summary.averageMarginPercentage >= 0 ? "positive" : "warning",
    },
    {
      label: "Caja prudente",
      value: formatMoney(summary.prudentAvailableCash),
      detail: "Tras provision IRPF orientativa",
      tone: summary.prudentAvailableCash >= 0 ? "positive" : "warning",
    },
    {
      label: "IVA estimado",
      value: formatMoney(summary.estimatedVatToReserve),
      detail: "Reserva orientativa",
    },
    {
      label: "IRPF estimado",
      value: formatMoney(summary.estimatedIrpfProvision),
      detail: "No es IRPF definitivo",
    },
    {
      label: "Documentos analizados",
      value: String(summary.documentCount),
      detail: `${summary.periodCount} grupos`,
    },
    {
      label: "Sin modo",
      value: String(summary.documentsWithoutAnalysisMode),
      detail: "Documentos por clasificar",
      tone: summary.documentsWithoutAnalysisMode > 0 ? "warning" : "default",
    },
    {
      label: "Gastos candidatos",
      value: String(summary.unlinkedCandidatesCount),
      detail: "Sin enlazar a trabajo",
      tone: summary.unlinkedCandidatesCount > 0 ? "warning" : "default",
    },
  ];
}

function toneClass(tone?: string) {
  if (tone === "positive") {
    return "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/35";
  }
  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35";
  }
  return "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60";
}

function warningLabels(row: RentabilidadRealEvolutionPeriodRow): string[] {
  const labels: string[] = [];
  if (row.lowMarginDocumentsCount > 0) labels.push(`${row.lowMarginDocumentsCount} margen bajo`);
  if (row.negativeProfitDocumentsCount > 0) {
    labels.push(`${row.negativeProfitDocumentsCount} negativo`);
  }
  if (row.unlinkedCandidatesCount > 0) {
    labels.push(`${row.unlinkedCandidatesCount} gastos pendientes`);
  }
  if (row.documentsWithoutAnalysisMode > 0) {
    labels.push(`${row.documentsWithoutAnalysisMode} sin modo`);
  }
  return labels;
}

const FIXED_COST_MODES: Array<{
  value: RentabilidadRealReportFixedCostAllocationMode;
  label: string;
}> = [
  { value: "none", label: "No imputar" },
  { value: "use_saved_settings", label: "Usar configuración guardada" },
  { value: "revenue_share_report", label: "Por facturación del periodo" },
];

const FIXED_COST_MODE_HELP: Record<
  RentabilidadRealReportFixedCostAllocationMode,
  string
> = {
  none: "Los gastos fijos detectados no se aplican a esta evolucion.",
  use_saved_settings:
    "Usa la regla local guardada en la calculadora de trabajo.",
  revenue_share_report:
    "Reparte los fijos por peso de facturacion dentro del filtro actual.",
};

function EvolutionControls({
  grouping,
  startDate,
  endDate,
  analysisModeFilter,
  clientId,
  fixedCostAllocationMode,
  clientOptions,
  includeQuotesWithoutInvoice,
  includeInternalAdjustments,
  lowMarginOnly,
  onGroupingChange,
  onStartDateChange,
  onEndDateChange,
  onAnalysisModeFilterChange,
  onClientIdChange,
  onFixedCostAllocationModeChange,
  onIncludeQuotesWithoutInvoiceChange,
  onIncludeInternalAdjustmentsChange,
  onLowMarginOnlyChange,
}: {
  grouping: RentabilidadRealEvolutionGrouping;
  startDate: string;
  endDate: string;
  analysisModeFilter: RentabilidadRealDocumentAnalysisModeFilter;
  clientId: string;
  fixedCostAllocationMode: RentabilidadRealReportFixedCostAllocationMode;
  clientOptions: Array<{ id: string; name: string }>;
  includeQuotesWithoutInvoice: boolean;
  includeInternalAdjustments: boolean;
  lowMarginOnly: boolean;
  onGroupingChange: (value: RentabilidadRealEvolutionGrouping) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onAnalysisModeFilterChange: (
    value: RentabilidadRealDocumentAnalysisModeFilter,
  ) => void;
  onClientIdChange: (value: string) => void;
  onFixedCostAllocationModeChange: (
    value: RentabilidadRealReportFixedCostAllocationMode,
  ) => void;
  onIncludeQuotesWithoutInvoiceChange: (value: boolean) => void;
  onIncludeInternalAdjustmentsChange: (value: boolean) => void;
  onLowMarginOnlyChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="block">
        <span className="text-sm font-black text-slate-950 dark:text-slate-50">
          Agrupar
        </span>
        <select
          aria-label="Agrupar"
          value={grouping}
          onChange={(event) =>
            onGroupingChange(event.target.value as RentabilidadRealEvolutionGrouping)
          }
          className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        >
          <option value="monthly">Mensual</option>
          <option value="quarterly">Trimestral</option>
          <option value="client">Cliente</option>
          <option value="analysis_mode">Modo de analisis</option>
        </select>
      </label>
      <DateField label="Desde" value={startDate} onChange={onStartDateChange} />
      <DateField label="Hasta" value={endDate} onChange={onEndDateChange} />
      <div className="flex items-end">
        <Button
          type="button"
          variant="secondary"
          className="min-h-12 w-full"
          onClick={() => {
            onStartDateChange("");
            onEndDateChange("");
          }}
        >
          Ver todo
        </Button>
      </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="text-sm font-black text-slate-950 dark:text-slate-50">
            Modo
          </span>
          <select
            aria-label="Filtrar por modo de analisis"
            value={analysisModeFilter}
            onChange={(event) =>
              onAnalysisModeFilterChange(
                event.target.value as RentabilidadRealDocumentAnalysisModeFilter,
              )
            }
            className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="all">Todos</option>
            {RENTABILIDAD_REAL_DOCUMENT_ANALYSIS_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {getDocumentAnalysisModeLabel(mode)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-black text-slate-950 dark:text-slate-50">
            Cliente
          </span>
          <select
            aria-label="Filtrar por cliente"
            value={clientId}
            onChange={(event) => onClientIdChange(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">Todos</option>
            {clientOptions.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-black text-slate-950 dark:text-slate-50">
            Gastos fijos
          </span>
          <select
            aria-label="Reparto de gastos fijos"
            value={fixedCostAllocationMode}
            onChange={(event) =>
              onFixedCostAllocationModeChange(
                event.target.value as RentabilidadRealReportFixedCostAllocationMode,
              )
            }
            className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {FIXED_COST_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>

        <ToggleField
          label="Incluir presupuestos sin factura"
          checked={includeQuotesWithoutInvoice}
          onChange={onIncludeQuotesWithoutInvoiceChange}
        />
        <ToggleField
          label="Incluir ajustes internos"
          checked={includeInternalAdjustments}
          onChange={onIncludeInternalAdjustmentsChange}
        />
        <ToggleField
          label="Solo margen bajo"
          checked={lowMarginOnly}
          onChange={onLowMarginOnlyChange}
        />
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold leading-6 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-100">
        Gastos fijos: {FIXED_COST_MODE_HELP[fixedCostAllocationMode]}
      </div>
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 xl:mt-7">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-blue-600"
      />
      <span>{label}</span>
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-950 dark:text-slate-50">
        {label}
      </span>
      <input
        aria-label={label}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </label>
  );
}

function EvolutionSummaryCards({
  summary,
}: {
  summary: RentabilidadRealEvolutionSummary;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {summaryCards(summary).map((card) => (
        <div
          key={card.label}
          className={`min-h-24 rounded-lg border p-4 ${toneClass(card.tone)}`}
        >
          <p className="text-sm font-black text-slate-600 dark:text-slate-300">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">
            {card.value}
          </p>
          <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
            {card.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

function EvolutionTable({
  rows,
  grouping,
}: {
  rows: RentabilidadRealEvolutionPeriodRow[];
  grouping: RentabilidadRealEvolutionGrouping;
}) {
  const firstColumnLabel =
    grouping === "client"
      ? "Cliente"
      : grouping === "analysis_mode"
        ? "Modo"
        : "Periodo";

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1100px] w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
            {[
              firstColumnLabel,
              "Docs",
              "Ingresos",
              "Costes",
              "Fijos",
              "Beneficio",
              "Margen",
              "Caja",
              "Modos",
              "Alertas",
            ].map((heading) => (
              <th
                key={heading}
                className="border-b border-slate-200 px-3 py-3 dark:border-slate-700"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const labels = warningLabels(row);
            return (
              <tr key={row.periodId} className="align-top">
                <td className="border-b border-slate-100 px-3 py-4 font-black text-slate-950 dark:border-slate-800 dark:text-slate-50">
                  {row.periodLabel}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                  {row.documentCount}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                  {formatMoney(row.incomeWithoutIndirectTax)}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                  {formatMoney(row.totalDirectCosts)}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                  {formatMoney(row.allocatedFixedCosts)}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                  {formatMoney(row.operatingProfit)}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                  {formatPercent(row.averageMarginPercentage)}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                  {formatMoney(row.prudentAvailableCash)}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 dark:border-slate-800">
                  <div className="flex max-w-64 flex-wrap gap-1">
                    {row.modeBreakdown.map((mode) => (
                      <span
                        key={mode.analysisMode}
                        className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {getDocumentAnalysisModeLabel(mode.analysisMode)} ·{" "}
                        {mode.documentCount}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="border-b border-slate-100 px-3 py-4 dark:border-slate-800">
                  <div className="flex max-w-56 flex-wrap gap-1">
                    {labels.length === 0 ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200">
                        OK
                      </span>
                    ) : (
                      labels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-800 dark:bg-amber-950/45 dark:text-amber-100"
                        >
                          {label}
                        </span>
                      ))
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RentabilidadRealEvolutionDashboard() {
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
  const [reportSettings, setReportSettings] =
    useState<RentabilidadRealReportSettings>(
      DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
    );
  const [savedWorkSettings, setSavedWorkSettings] =
    useState<RentabilidadRealCalculationSettings | undefined>();
  const [documentAnalysisModes, setDocumentAnalysisModes] =
    useState<RentabilidadRealDocumentAnalysisModesById>({});
  const [grouping, setGrouping] =
    useState<RentabilidadRealEvolutionGrouping>("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [analysisModeFilter, setAnalysisModeFilter] =
    useState<RentabilidadRealDocumentAnalysisModeFilter>("all");
  const [clientId, setClientId] = useState("");
  const [fixedCostAllocationMode, setFixedCostAllocationMode] =
    useState<RentabilidadRealReportFixedCostAllocationMode>(
      DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS.fixedCostAllocationMode,
    );
  const [includeQuotesWithoutInvoice, setIncludeQuotesWithoutInvoice] =
    useState(DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS.includeQuotesWithoutInvoice);
  const [includeInternalAdjustments, setIncludeInternalAdjustments] = useState(
    DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS.includeInternalAdjustments,
  );
  const [lowMarginOnly, setLowMarginOnly] = useState(false);

  useEffect(() => {
    const storedSettings = getStoredRentabilidadRealReportSettings();
    setReportSettings(storedSettings);
    setAnalysisModeFilter(storedSettings.analysisModeFilter);
    setFixedCostAllocationMode(storedSettings.fixedCostAllocationMode);
    setIncludeQuotesWithoutInvoice(storedSettings.includeQuotesWithoutInvoice);
    setIncludeInternalAdjustments(storedSettings.includeInternalAdjustments);
    setSavedWorkSettings(getStoredRentabilidadRealCalculationSettings());
    setDocumentAnalysisModes(getStoredDocumentAnalysisModes());
  }, []);

  const clientOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const customer of data.customers) {
      if (customer.id.trim()) {
        byId.set(customer.id, customer.name || "Cliente sin nombre");
      }
    }
    for (const document of data.documents) {
      if (document.customerId?.trim()) {
        byId.set(
          document.customerId,
          document.client?.name || byId.get(document.customerId) || "Cliente sin nombre",
        );
      }
    }

    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    );
  }, [data.customers, data.documents]);

  const report = useMemo(
    () =>
      buildRentabilidadRealEvolutionReport(data, {
        grouping,
        clientId: clientId || undefined,
        lowMarginOnly,
        documentReportSettings: {
          ...reportSettings,
          period: startDate || endDate ? "custom" : "all",
          customStartDate: startDate || undefined,
          customEndDate: endDate || undefined,
          includeQuotesWithoutInvoice,
          includeInternalAdjustments,
          analysisModeFilter,
          fixedCostAllocationMode,
          savedWorkCalculationSettings: savedWorkSettings,
          documentAnalysisModes,
        },
      }),
    [
      analysisModeFilter,
      clientId,
      data,
      documentAnalysisModes,
      endDate,
      fixedCostAllocationMode,
      grouping,
      includeInternalAdjustments,
      includeQuotesWithoutInvoice,
      lowMarginOnly,
      reportSettings,
      savedWorkSettings,
      startDate,
    ],
  );
  const hasBaseActive = activation.activeProductIds.includes("RR_BASE");
  const canActivateIncluded = rentabilidadRealAccess.isProPlus;

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
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-50">
              Evolución de Rentabilidad
            </h1>
            <p className="mt-1 max-w-4xl text-base leading-7 text-slate-500 dark:text-slate-400">
              Mira la evolucion por periodo, cliente o modo usando tus
              facturas, presupuestos, gastos enlazados y ajustes internos. No
              guarda resultados como contabilidad.
            </p>
          </div>
          <ButtonLink href="/rentabilidad-real/informes" variant="secondary">
            Ver informes
          </ButtonLink>
        </div>
      </div>

      {!hasBaseActive ? (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-blue-950 dark:text-blue-100">
              RR_BASE debe estar activo para usar Evolución de Rentabilidad.
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

      <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/45 dark:text-blue-200">
            <CalendarRange className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
              Periodo
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Filtra la lectura. El cálculo se rehace al momento y no modifica
              documentos.
            </p>
          </div>
        </div>
        <EvolutionControls
          grouping={grouping}
          startDate={startDate}
          endDate={endDate}
          analysisModeFilter={analysisModeFilter}
          clientId={clientId}
          fixedCostAllocationMode={fixedCostAllocationMode}
          clientOptions={clientOptions}
          includeQuotesWithoutInvoice={includeQuotesWithoutInvoice}
          includeInternalAdjustments={includeInternalAdjustments}
          lowMarginOnly={lowMarginOnly}
          onGroupingChange={setGrouping}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onAnalysisModeFilterChange={setAnalysisModeFilter}
          onClientIdChange={setClientId}
          onFixedCostAllocationModeChange={setFixedCostAllocationMode}
          onIncludeQuotesWithoutInvoiceChange={setIncludeQuotesWithoutInvoice}
          onIncludeInternalAdjustmentsChange={setIncludeInternalAdjustments}
          onLowMarginOnlyChange={setLowMarginOnly}
        />
      </Card>

      {report.rows.length === 0 ? (
        <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
                Sin datos para este rango
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Cuando haya facturas o presupuestos analizables, aparecerán aquí
                agrupados por periodo.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <EvolutionSummaryCards summary={report.summary} />

          <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <Table2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
                  {grouping === "client"
                    ? "Resumen por cliente"
                    : grouping === "analysis_mode"
                      ? "Resumen por modo"
                      : "Evolucion por periodo"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Cada fila resume los documentos incluidos en el filtro actual.
                </p>
              </div>
            </div>
            <EvolutionTable rows={report.rows} grouping={grouping} />
          </Card>
        </>
      )}
    </div>
  );
}
