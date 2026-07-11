"use client";

import { formatMoney, formatShortDate } from "@/lib/calculations";
import type {
  RentabilidadRealFixedCostAllocationMethod,
  RentabilidadRealHoursBillingModel,
  RentabilidadRealHoursCalculationSettings,
  RentabilidadRealWorkCost,
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
  fixedCostCandidates,
  allocatedFixedCosts,
}: {
  settings: RentabilidadRealHoursCalculationSettings;
  onSettingsChange: (settings: RentabilidadRealHoursCalculationSettings) => void;
  documentMode: boolean;
  fixedCostCandidates: RentabilidadRealWorkCost[];
  allocatedFixedCosts: number;
}) {
  function patch(patchSettings: Partial<RentabilidadRealHoursCalculationSettings>) {
    onSettingsChange({ ...settings, ...patchSettings });
  }

  const manualCost = settings.manualDirectCosts[0];
  const selectedFixedCostIds = settings.selectedFixedCostIds ?? [];
  const selectedFixedCostIdSet = new Set(selectedFixedCostIds);
  const detectedFixedCostTotal = fixedCostCandidates.reduce(
    (total, cost) => total + cost.amount,
    0,
  );
  const selectedFixedCostTotal = fixedCostCandidates
    .filter((cost) => selectedFixedCostIdSet.has(cost.id))
    .reduce((total, cost) => total + cost.amount, 0);
  const appliedFixedCosts =
    settings.fixedCostAllocationMethod === "none" ? 0 : allocatedFixedCosts;
  const fixedCostsNeedSelection =
    settings.fixedCostAllocationMethod !== "none" &&
    settings.fixedCostAllocationMethod !== "manual_amount" &&
    fixedCostCandidates.length > 0 &&
    selectedFixedCostIds.length === 0;

  function toggleFixedCost(costId: string) {
    const next = new Set(selectedFixedCostIds);
    if (next.has(costId)) {
      next.delete(costId);
    } else {
      next.add(costId);
    }
    patch({ selectedFixedCostIds: Array.from(next) });
  }

  function selectAllFixedCosts() {
    patch({ selectedFixedCostIds: fixedCostCandidates.map((cost) => cost.id) });
  }

  function clearSelectedFixedCosts() {
    patch({ selectedFixedCostIds: [] });
  }

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
              aria-pressed={settings.billingModel === model.value}
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
          hint="Es una provisión orientativa, no tu IRPF definitivo."
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

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black text-slate-950 dark:text-slate-50">
                Gastos fijos del proyecto
              </p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Selecciona qué gastos fijos quieres imputar a este proyecto.
                Los gastos no seleccionados no se aplicarán al cálculo.
              </p>
            </div>
            {fixedCostCandidates.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectAllFixedCosts}
                  className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Seleccionar todos
                </button>
                <button
                  type="button"
                  onClick={clearSelectedFixedCosts}
                  className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  No aplicar ninguno
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-2 text-sm font-bold text-slate-700 sm:grid-cols-3 dark:text-slate-200">
            <MetricBox
              label="Gastos fijos detectados"
              value={formatMoney(detectedFixedCostTotal)}
            />
            <MetricBox
              label="Gastos fijos seleccionados"
              value={formatMoney(selectedFixedCostTotal)}
            />
            <MetricBox
              label="Aplicado a este cálculo"
              value={formatMoney(appliedFixedCosts)}
            />
          </div>

          {settings.fixedCostAllocationMethod === "none" ? (
            <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-100">
              Estos gastos no se aplicarán hasta que elijas una regla de reparto.
            </p>
          ) : null}

          {settings.fixedCostAllocationMethod === "manual_amount" ? (
            <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-100">
              Con importe manual se aplica solo la cantidad escrita arriba.
            </p>
          ) : null}

          {fixedCostsNeedSelection ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100">
              No has seleccionado gastos fijos para repartir.
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
                  <input
                    type="checkbox"
                    checked={selectedFixedCostIdSet.has(cost.id)}
                    onChange={() => toggleFixedCost(cost.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-black text-slate-950 dark:text-slate-50">
                      {cost.description}
                    </span>
                    <span className="block text-slate-600 dark:text-slate-300">
                      {cost.supplierName || "Sin proveedor"} · {cost.category} ·{" "}
                      {fixedCostDateLabel(cost.date)}
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
        </div>
      </div>
    </div>
  );
}

function fixedCostDateLabel(date: string): string {
  if (!date) return "Sin fecha";
  const parsed = new Date(date.includes("T") ? date : `${date}T00:00:00`);
  if (!Number.isFinite(parsed.getTime())) return "Sin fecha";
  return formatShortDate(date);
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 dark:bg-slate-950">
      <span className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span>{value}</span>
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
        value={numberValue(value)}
        onChange={(event) => onChange(parseNumber(event.target.value))}
        className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
      {hint ? (
        <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
