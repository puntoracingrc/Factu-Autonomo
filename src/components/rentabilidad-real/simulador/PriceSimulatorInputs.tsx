"use client";

import { formatMoney } from "@/lib/calculations";
import { isDocumentUsableForFinancialCalculations } from "@/lib/document-integrity/legacy-import-attestation";
import { documentAmounts } from "@/lib/vat-regime";
import type { RentabilidadRealFixedCostAllocationMethod } from "@/lib/rentabilidad-real/calculation";
import { rentabilidadRealDocumentClientName } from "@/lib/rentabilidad-real/document-client";
import type {
  RentabilidadRealPriceSimulatorObjectiveType,
  RentabilidadRealPriceSimulatorSettings,
} from "@/lib/rentabilidad-real/price-simulator";
import type { Document } from "@/lib/types";

function numberValue(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const OBJECTIVES: Array<{
  value: RentabilidadRealPriceSimulatorObjectiveType;
  label: string;
}> = [
  { value: "per_job", label: "Por trabajo/proyecto" },
  { value: "per_hour", label: "Por hora" },
  { value: "monthly", label: "Mensual" },
];

const FIXED_METHODS: Array<{
  value: RentabilidadRealFixedCostAllocationMethod;
  label: string;
}> = [
  { value: "none", label: "Sin reparto" },
  { value: "manual_amount", label: "Manual" },
  { value: "monthly_jobs", label: "Por trabajos" },
  { value: "hours", label: "Por horas" },
  { value: "revenue_share", label: "Por facturación" },
];

export function PriceSimulatorInputs({
  settings,
  documents,
  detectedMonthlyFixedCosts,
  detectedDocumentDirectCosts,
  detectedDocumentIncome,
  onSettingsChange,
}: {
  settings: RentabilidadRealPriceSimulatorSettings;
  documents: Document[];
  detectedMonthlyFixedCosts: number;
  detectedDocumentDirectCosts?: number;
  detectedDocumentIncome?: number;
  onSettingsChange: (
    settings: RentabilidadRealPriceSimulatorSettings,
  ) => void;
}) {
  const usableDocuments = documents.filter(
    isDocumentUsableForFinancialCalculations,
  );
  function patch(patchSettings: Partial<RentabilidadRealPriceSimulatorSettings>) {
    onSettingsChange({ ...settings, ...patchSettings });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-black text-slate-950 dark:text-slate-50">
          Datos de partida
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            aria-pressed={settings.sourceMode === "manual"}
            onClick={() => patch({ sourceMode: "manual" })}
            className={`min-h-11 rounded-md px-3 text-sm font-black transition-colors ${
              settings.sourceMode === "manual"
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-200"
                : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            Manual
          </button>
          <button
            type="button"
            aria-pressed={settings.sourceMode === "document"}
            onClick={() => patch({ sourceMode: "document" })}
            className={`min-h-11 rounded-md px-3 text-sm font-black transition-colors ${
              settings.sourceMode === "document"
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-200"
                : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            Documento
          </button>
        </div>

        {settings.sourceMode === "document" ? (
          <label className="mt-3 block">
            <span className="text-sm font-black text-slate-950 dark:text-slate-50">
              Factura o presupuesto
            </span>
            <select
              value={settings.selectedDocumentId ?? ""}
              onChange={(event) =>
                patch({ selectedDocumentId: event.target.value || undefined })
              }
              className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {usableDocuments.length === 0 ? (
                <option value="">No hay documentos disponibles</option>
              ) : null}
              {usableDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.number} · {rentabilidadRealDocumentClientName(doc)} ·{" "}
                  {formatMoney(documentAmounts(doc, false).subtotal)} base
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {settings.sourceMode === "document" &&
        (detectedDocumentDirectCosts !== undefined ||
          detectedDocumentIncome !== undefined) ? (
          <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-100">
            Detectado: {formatMoney(detectedDocumentIncome ?? 0)} de ingreso y{" "}
            {formatMoney(detectedDocumentDirectCosts ?? 0)} de costes directos
            enlazados.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="text-sm font-black text-slate-950 dark:text-slate-50">
            Objetivo
          </span>
          <select
            value={settings.objectiveType}
            onChange={(event) =>
              patch({
                objectiveType: event.target
                  .value as RentabilidadRealPriceSimulatorObjectiveType,
              })
            }
            className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {OBJECTIVES.map((objective) => (
              <option key={objective.value} value={objective.value}>
                {objective.label}
              </option>
            ))}
          </select>
        </label>
        <NumberField
          label="Beneficio objetivo"
          value={settings.targetNetProfit}
          onChange={(value) => patch({ targetNetProfit: value ?? 0 })}
        />
        <NumberField
          label="Costes directos estimados"
          value={settings.directCosts}
          onChange={(value) => patch({ directCosts: value ?? 0 })}
        />
        <NumberField
          label="Ajustes internos previstos"
          value={settings.internalAdjustments}
          onChange={(value) => patch({ internalAdjustments: value ?? 0 })}
        />
        <NumberField
          label="Horas reales estimadas"
          value={settings.estimatedRealHours}
          onChange={(value) => patch({ estimatedRealHours: value })}
        />
        <NumberField
          label="Trabajos previstos al mes"
          value={settings.jobsPerMonth}
          onChange={(value) => patch({ jobsPerMonth: value })}
        />
      </div>

      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-950 dark:text-slate-50">
              Gastos fijos
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Detectados en la app: {formatMoney(detectedMonthlyFixedCosts)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => patch({ monthlyFixedCosts: detectedMonthlyFixedCosts })}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Usar detectados
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField
            label="Gastos fijos mensuales"
            value={settings.monthlyFixedCosts}
            onChange={(value) => patch({ monthlyFixedCosts: value ?? 0 })}
          />
          <NumberField
            label="Cuota autónomo manual"
            value={settings.selfEmployedFee}
            onChange={(value) => patch({ selfEmployedFee: value ?? 0 })}
          />
          <label className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <input
              type="checkbox"
              checked={settings.selfEmployedFeeIncludedInFixedCosts}
              onChange={(event) =>
                patch({
                  selfEmployedFeeIncludedInFixedCosts: event.target.checked,
                })
              }
              className="h-4 w-4"
            />
            La cuota ya está incluida
          </label>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {FIXED_METHODS.map((method) => (
            <button
              key={method.value}
              type="button"
              aria-pressed={
                settings.fixedCostAllocationMethod === method.value
              }
              onClick={() => patch({ fixedCostAllocationMethod: method.value })}
              className={`min-h-11 rounded-lg border px-3 text-sm font-black transition-colors ${
                settings.fixedCostAllocationMethod === method.value
                  ? "border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/45 dark:text-blue-100"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {method.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {settings.fixedCostAllocationMethod === "manual_amount" ? (
            <NumberField
              label="Gasto fijo imputado"
              value={settings.manualAllocatedFixedCosts}
              onChange={(value) => patch({ manualAllocatedFixedCosts: value })}
            />
          ) : null}
          {settings.fixedCostAllocationMethod === "hours" ? (
            <NumberField
              label="Horas facturables mensuales"
              value={settings.monthlyBillableHours}
              onChange={(value) => patch({ monthlyBillableHours: value })}
            />
          ) : null}
          {settings.fixedCostAllocationMethod === "revenue_share" ? (
            <NumberField
              label="Facturación mensual prevista"
              value={settings.monthlyExpectedRevenue}
              onChange={(value) => patch({ monthlyExpectedRevenue: value })}
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField
          label="Margen deseado (%)"
          value={settings.desiredMarginPercentage}
          onChange={(value) => patch({ desiredMarginPercentage: value ?? 0 })}
        />
        <NumberField
          label="Provisión IRPF (%)"
          value={settings.irpfProvisionPercentage}
          onChange={(value) => patch({ irpfProvisionPercentage: value ?? 20 })}
        />
        <NumberField
          label="IVA aplicable (%)"
          value={settings.vatRate}
          onChange={(value) => patch({ vatRate: value ?? 0 })}
        />
        <NumberField
          label="Precio medio por trabajo"
          value={settings.averageJobPrice}
          onChange={(value) => patch({ averageJobPrice: value })}
        />
        <NumberField
          label="Costes directos mensuales"
          value={settings.monthlyDirectCostsEstimate}
          onChange={(value) => patch({ monthlyDirectCostsEstimate: value })}
        />
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-950 dark:text-slate-50">
        {label}
      </span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={numberValue(value)}
        onChange={(event) => onChange(parseNumber(event.target.value))}
        className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </label>
  );
}
