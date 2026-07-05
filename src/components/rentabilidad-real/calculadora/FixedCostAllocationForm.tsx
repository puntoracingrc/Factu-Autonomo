"use client";

import { formatMoney, formatShortDate } from "@/lib/calculations";
import { buildRentabilidadRealFixedCostDisplay } from "@/lib/rentabilidad-real/work-calculator-view-model";
import type {
  RentabilidadRealCalculationSettings,
  RentabilidadRealFixedCostAllocationMethod,
  RentabilidadRealWorkCost,
} from "@/lib/rentabilidad-real/calculation";

const METHODS: Array<{
  value: RentabilidadRealFixedCostAllocationMethod;
  label: string;
}> = [
  { value: "none", label: "No imputar gastos fijos todavía" },
  { value: "manual_amount", label: "Importe manual" },
  { value: "revenue_share", label: "Por facturación del mes" },
  { value: "monthly_jobs", label: "Por número de trabajos del mes" },
  { value: "hours", label: "Por horas" },
];

function numericValue(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function parseNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function FixedCostAllocationForm({
  settings,
  fixedCostCandidates,
  allocatedFixedCosts,
  fixedCostsAdvancedActive,
  onSettingsChange,
}: {
  settings: RentabilidadRealCalculationSettings;
  fixedCostCandidates: RentabilidadRealWorkCost[];
  allocatedFixedCosts: number;
  fixedCostsAdvancedActive: boolean;
  onSettingsChange: (settings: RentabilidadRealCalculationSettings) => void;
}) {
  const selectedIds =
    settings.selectedFixedCostIds !== undefined
      ? settings.selectedFixedCostIds
      : fixedCostCandidates.map((cost) => cost.id);
  const selectedIdSet = new Set(selectedIds);
  const selectedTotal = fixedCostCandidates
    .filter((cost) => selectedIdSet.has(cost.id))
    .reduce((total, cost) => total + cost.amount, 0);
  const fixedCostDisplay = buildRentabilidadRealFixedCostDisplay({
    method: settings.fixedCostAllocationMethod,
    selectedTotal,
    allocatedFixedCosts,
  });

  function patchSettings(patch: Partial<RentabilidadRealCalculationSettings>) {
    onSettingsChange({
      ...settings,
      ...patch,
    });
  }

  function toggleFixedCost(costId: string) {
    const allIds = fixedCostCandidates.map((cost) => cost.id);
    const current = new Set(
      settings.selectedFixedCostIds !== undefined
        ? settings.selectedFixedCostIds
        : allIds,
    );
    if (current.has(costId)) {
      current.delete(costId);
    } else {
      current.add(costId);
    }
    patchSettings({ selectedFixedCostIds: Array.from(current) });
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-black text-slate-950 dark:text-slate-50">
          Reparto de gastos fijos
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {METHODS.map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() =>
                patchSettings({ fixedCostAllocationMethod: method.value })
              }
              className={`min-h-12 rounded-lg border px-3 text-left text-sm font-black transition-colors ${
                settings.fixedCostAllocationMethod === method.value
                  ? "border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/45 dark:text-blue-100"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {method.label}
            </button>
          ))}
        </div>
      </div>

      {!fixedCostsAdvancedActive &&
      settings.fixedCostAllocationMethod !== "none" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100">
          La imputación avanzada de gastos fijos pertenece a Gastos Fijos Pro.
          Puedes ver la simulación, pero conviene activar el módulo antes de
          usarla como criterio habitual.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {settings.fixedCostAllocationMethod === "manual_amount" ? (
          <NumberField
            label="Importe manual"
            value={settings.manualAmount}
            onChange={(value) => patchSettings({ manualAmount: value })}
          />
        ) : null}
        {settings.fixedCostAllocationMethod === "revenue_share" ? (
          <>
            <NumberField
              label="Facturación mensual sin IVA"
              value={settings.monthlyRevenue}
              onChange={(value) => patchSettings({ monthlyRevenue: value })}
            />
          </>
        ) : null}
        {settings.fixedCostAllocationMethod === "monthly_jobs" ? (
          <NumberField
            label="Trabajos del mes"
            value={settings.monthlyJobs}
            onChange={(value) => patchSettings({ monthlyJobs: value })}
          />
        ) : null}
        {settings.fixedCostAllocationMethod === "hours" ? (
          <>
            <NumberField
              label="Horas del trabajo"
              value={settings.workHours}
              onChange={(value) => patchSettings({ workHours: value })}
            />
            <NumberField
              label="Horas trabajadas del mes"
              value={settings.monthlyWorkHours}
              onChange={(value) => patchSettings({ monthlyWorkHours: value })}
            />
          </>
        ) : null}
        <NumberField
          label="Provisión IRPF estimada (%)"
          value={settings.irpfProvisionPercentage}
          onChange={(value) =>
            patchSettings({ irpfProvisionPercentage: value ?? 20 })
          }
          hint="Es una provisión orientativa, no tu IRPF definitivo."
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <p className="text-sm font-black text-slate-950 dark:text-slate-50">
            Gastos fijos candidatos
          </p>
          <div className="grid gap-2 text-sm font-bold text-slate-700 sm:grid-cols-2 lg:min-w-[23rem] dark:text-slate-200">
            <div className="rounded-lg bg-white px-3 py-2 dark:bg-slate-950">
              <span className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                {fixedCostDisplay.totalLabel}
              </span>
              <span>{formatMoney(fixedCostDisplay.totalAmount)}</span>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 dark:bg-slate-950">
              <span className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                {fixedCostDisplay.appliedLabel}
              </span>
              <span>{formatMoney(fixedCostDisplay.appliedAmount)}</span>
            </div>
          </div>
        </div>
        {fixedCostDisplay.helperText ? (
          <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-100">
            {fixedCostDisplay.helperText}
          </p>
        ) : null}
        {fixedCostCandidates.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            No hay gastos fijos o recurrentes detectados todavía.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {fixedCostCandidates.map((cost) => (
              <label
                key={cost.id}
                className="flex items-start gap-3 rounded-lg bg-white p-3 text-sm dark:bg-slate-950"
              >
                {fixedCostDisplay.showSelectionControls ? (
                  <input
                    type="checkbox"
                    checked={selectedIdSet.has(cost.id)}
                    onChange={() => toggleFixedCost(cost.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                ) : (
                  <span className="mt-0.5 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Detectado
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-black text-slate-950 dark:text-slate-50">
                    {cost.description}
                  </span>
                  <span className="block text-slate-600 dark:text-slate-300">
                    {cost.supplierName || "Sin proveedor"} · {cost.category} ·{" "}
                    {formatShortDate(cost.date)}
                  </span>
                  <span className="block text-slate-500 dark:text-slate-400">
                    Base {formatMoney(cost.amount)}
                    {cost.total !== cost.amount
                      ? ` · Total ${formatMoney(cost.total)}`
                      : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Configuración local temporal. No se guarda ningún resultado como
          verdad contable.
        </p>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  hint?: string;
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
        value={numericValue(value)}
        onChange={(event) => onChange(parseNumber(event.target.value))}
        className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
      {hint ? (
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
