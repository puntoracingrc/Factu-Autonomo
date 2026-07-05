"use client";

import type {
  RentabilidadRealFixedCostAllocationMethod,
  RentabilidadRealHoursBillingModel,
  RentabilidadRealHoursCalculationSettings,
} from "@/lib/rentabilidad-real/calculation";

function numberValue(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const BILLING_MODELS: Array<{
  value: RentabilidadRealHoursBillingModel;
  label: string;
}> = [
  { value: "hours", label: "Por horas" },
  { value: "closed_project", label: "Proyecto cerrado" },
  { value: "monthly_retainer", label: "Iguala mensual" },
];

const FIXED_METHODS: Array<{
  value: RentabilidadRealFixedCostAllocationMethod;
  label: string;
}> = [
  { value: "none", label: "No imputar" },
  { value: "manual_amount", label: "Manual" },
  { value: "hours", label: "Por horas" },
  { value: "revenue_share", label: "Por facturación" },
];

export function HoursInputForm({
  settings,
  onSettingsChange,
  documentMode,
}: {
  settings: RentabilidadRealHoursCalculationSettings;
  onSettingsChange: (settings: RentabilidadRealHoursCalculationSettings) => void;
  documentMode: boolean;
}) {
  function patch(patchSettings: Partial<RentabilidadRealHoursCalculationSettings>) {
    onSettingsChange({ ...settings, ...patchSettings });
  }

  const manualCost = settings.manualDirectCosts[0];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-black text-slate-950 dark:text-slate-50">
          Modelo de cobro
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {BILLING_MODELS.map((model) => (
            <button
              key={model.value}
              type="button"
              onClick={() => patch({ billingModel: model.value })}
              className={`min-h-11 rounded-lg border px-3 text-sm font-black transition-colors ${
                settings.billingModel === model.value
                  ? "border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/45 dark:text-blue-100"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {model.label}
            </button>
          ))}
        </div>
      </div>

      {!documentMode ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Nombre del proyecto"
            value={settings.projectName}
            onChange={(value) => patch({ projectName: value })}
          />
          <TextField
            label="Cliente opcional"
            value={settings.customerName ?? ""}
            onChange={(value) => patch({ customerName: value || undefined })}
          />
          <NumberField
            label="Ingreso sin IVA"
            value={settings.incomeWithoutIndirectTax}
            onChange={(value) => patch({ incomeWithoutIndirectTax: value })}
          />
          <NumberField
            label="IVA aplicado (%)"
            value={settings.vatPercent}
            onChange={(value) => patch({ vatPercent: value })}
          />
          <NumberField
            label="Costes directos manuales sin IVA"
            value={manualCost?.amount}
            onChange={(value) =>
              patch({
                manualDirectCosts:
                  value && value > 0
                    ? [
                        {
                          id: "manual_direct_cost",
                          description: "Costes directos manuales",
                          amount: value,
                        },
                      ]
                    : [],
              })
            }
          />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField
          label="Horas facturadas"
          value={settings.billedHours}
          onChange={(value) => patch({ billedHours: value })}
        />
        <NumberField
          label="Horas reales trabajadas"
          value={settings.realWorkedHours}
          onChange={(value) => patch({ realWorkedHours: value })}
        />
        <NumberField
          label="Horas reales totales"
          value={settings.totalRealHoursOverride}
          onChange={(value) => patch({ totalRealHoursOverride: value })}
        />
        <NumberField
          label="Horas no facturables"
          value={settings.nonBillableHours}
          onChange={(value) => patch({ nonBillableHours: value })}
        />
        <NumberField
          label="Reuniones"
          value={settings.meetingHours}
          onChange={(value) => patch({ meetingHours: value })}
        />
        <NumberField
          label="Revisiones/cambios"
          value={settings.revisionHours}
          onChange={(value) => patch({ revisionHours: value })}
        />
        <NumberField
          label="Administración"
          value={settings.adminHours}
          onChange={(value) => patch({ adminHours: value })}
        />
        <NumberField
          label="Provisión IRPF estimada (%)"
          value={settings.irpfProvisionPercentage}
          onChange={(value) => patch({ irpfProvisionPercentage: value ?? 20 })}
        />
      </div>

      <div>
        <p className="text-sm font-black text-slate-950 dark:text-slate-50">
          Gastos fijos
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {FIXED_METHODS.map((method) => (
            <button
              key={method.value}
              type="button"
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
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {settings.fixedCostAllocationMethod === "manual_amount" ? (
            <NumberField
              label="Importe manual"
              value={settings.manualAmount}
              onChange={(value) => patch({ manualAmount: value })}
            />
          ) : null}
          {settings.fixedCostAllocationMethod === "hours" ? (
            <NumberField
              label="Horas mensuales de trabajo"
              value={settings.monthlyWorkHours}
              onChange={(value) => patch({ monthlyWorkHours: value })}
            />
          ) : null}
          {settings.fixedCostAllocationMethod === "revenue_share" ? (
            <NumberField
              label="Facturación mensual sin IVA"
              value={settings.monthlyRevenue}
              onChange={(value) => patch({ monthlyRevenue: value })}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TextField({
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
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
