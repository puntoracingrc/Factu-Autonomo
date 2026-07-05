"use client";

import type {
  RentabilidadRealReportFixedCostAllocationMode,
  RentabilidadRealReportPeriod,
  RentabilidadRealReportSettings,
  RentabilidadRealReportSourceTypes,
} from "@/lib/rentabilidad-real/reports";

function numberValue(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const PERIODS: Array<{ value: RentabilidadRealReportPeriod; label: string }> = [
  { value: "all", label: "Todo" },
  { value: "current_month", label: "Mes actual" },
  { value: "current_quarter", label: "Trimestre actual" },
  { value: "custom", label: "Personalizado" },
];

const SOURCE_TYPES: Array<{
  value: RentabilidadRealReportSourceTypes;
  label: string;
}> = [
  { value: "both", label: "Facturas y presupuestos" },
  { value: "invoices", label: "Solo facturas" },
  { value: "quotes", label: "Solo presupuestos" },
];

const FIXED_COST_MODES: Array<{
  value: RentabilidadRealReportFixedCostAllocationMode;
  label: string;
}> = [
  { value: "none", label: "No imputar" },
  { value: "use_saved_settings", label: "Usar configuración guardada" },
  { value: "revenue_share_report", label: "Por facturación del periodo" },
];

export function ReportsFiltersPanel({
  settings,
  onSettingsChange,
}: {
  settings: RentabilidadRealReportSettings;
  onSettingsChange: (settings: RentabilidadRealReportSettings) => void;
}) {
  function patch(patchSettings: Partial<RentabilidadRealReportSettings>) {
    onSettingsChange({ ...settings, ...patchSettings });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SelectField
          label="Periodo"
          value={settings.period}
          options={PERIODS}
          onChange={(value) =>
            patch({ period: value as RentabilidadRealReportPeriod })
          }
        />
        <SelectField
          label="Tipo de documento"
          value={settings.sourceTypes}
          options={SOURCE_TYPES}
          onChange={(value) =>
            patch({ sourceTypes: value as RentabilidadRealReportSourceTypes })
          }
        />
        <SelectField
          label="Reparto de gastos fijos"
          value={settings.fixedCostAllocationMode}
          options={FIXED_COST_MODES}
          onChange={(value) =>
            patch({
              fixedCostAllocationMode:
                value as RentabilidadRealReportFixedCostAllocationMode,
            })
          }
        />
      </div>

      {settings.period === "custom" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <DateField
            label="Desde"
            value={settings.customStartDate}
            onChange={(value) => patch({ customStartDate: value })}
          />
          <DateField
            label="Hasta"
            value={settings.customEndDate}
            onChange={(value) => patch({ customEndDate: value })}
          />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ToggleField
          label="Incluir presupuestos sin factura"
          checked={settings.includeQuotesWithoutInvoice}
          onChange={(checked) => patch({ includeQuotesWithoutInvoice: checked })}
        />
        <ToggleField
          label="Incluir ajustes internos"
          checked={settings.includeInternalAdjustments}
          onChange={(checked) => patch({ includeInternalAdjustments: checked })}
        />
        <NumberField
          label="Umbral margen bajo (%)"
          value={settings.lowMarginThresholdPercentage}
          onChange={(value) =>
            patch({ lowMarginThresholdPercentage: value ?? 15 })
          }
        />
        <NumberField
          label="Provisión IRPF (%)"
          value={settings.irpfProvisionPercentage}
          onChange={(value) => patch({ irpfProvisionPercentage: value ?? 20 })}
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-950 dark:text-slate-50">
        {label}
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
        aria-label={label}
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

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-950 dark:text-slate-50">
        {label}
      </span>
      <input
        aria-label={label}
        type="date"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || undefined)}
        className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
      <input
        aria-label={label}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4"
      />
      {label}
    </label>
  );
}
