"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/calculations";
import {
  addStoredInternalAdjustment,
  getInternalAdjustmentsForSource,
  removeStoredInternalAdjustment,
  summarizeInternalAdjustments,
  updateStoredInternalAdjustment,
  type InternalAdjustmentSummary,
  type InternalProfitabilityAdjustment,
  type InternalProfitabilityAdjustmentCategory,
  type InternalProfitabilityAdjustmentSourceType,
} from "@/lib/rentabilidad-real/internal-adjustments";

const MANDATORY_ADJUSTMENT_COPY =
  "Este ajuste solo afecta a tu rentabilidad interna. No se incluirá como gasto fiscal, no reducirá IRPF, no generará IVA deducible y no se exportará a libros fiscales.";

const ADVISOR_HELP_COPY =
  "Si este importe corresponde a una persona que ha trabajado en el negocio, revisa con tu gestor cómo debe formalizarse.";

const CATEGORY_OPTIONS: Array<{
  value: InternalProfitabilityAdjustmentCategory;
  label: string;
}> = [
  { value: "undocumented_help", label: "Ayuda puntual a revisar" },
  {
    value: "non_deductible_extra_cost",
    label: "Coste extraordinario no deducible",
  },
  {
    value: "cash_out_without_tax_document",
    label: "Salida de caja no fiscal",
  },
  { value: "waste_or_loss", label: "Merma o pérdida no documentada" },
  { value: "other_internal_adjustment", label: "Otro ajuste interno" },
];

function categoryLabel(category: InternalProfitabilityAdjustmentCategory) {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    "Ajuste interno"
  );
}

function parseAmount(value: string): number {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface FormState {
  id?: string;
  label: string;
  amount: string;
  category: InternalProfitabilityAdjustmentCategory;
  note: string;
}

function emptyForm(): FormState {
  return {
    label: "",
    amount: "",
    category: "other_internal_adjustment",
    note: "",
  };
}

export function InternalAdjustmentsPanel({
  sourceDocumentId,
  sourceType,
  onSummaryChange,
}: {
  sourceDocumentId: string;
  sourceType: InternalProfitabilityAdjustmentSourceType;
  onSummaryChange: (summary: InternalAdjustmentSummary) => void;
}) {
  const [adjustments, setAdjustments] = useState<
    InternalProfitabilityAdjustment[]
  >([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");

  const summary = useMemo(
    () => summarizeInternalAdjustments(adjustments),
    [adjustments],
  );

  const reload = useCallback(() => {
    setAdjustments(getInternalAdjustmentsForSource(sourceDocumentId));
  }, [sourceDocumentId]);

  useEffect(() => {
    reload();
    setForm(emptyForm());
    setError("");
  }, [reload]);

  useEffect(() => {
    onSummaryChange(summary);
  }, [onSummaryChange, summary]);

  function patchForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
    setError("");
  }

  function resetForm() {
    setForm(emptyForm());
    setError("");
  }

  function editAdjustment(adjustment: InternalProfitabilityAdjustment) {
    setForm({
      id: adjustment.id,
      label: adjustment.label,
      amount: String(adjustment.amount),
      category: adjustment.category,
      note: adjustment.note ?? "",
    });
    setError("");
  }

  function saveAdjustment() {
    const amount = parseAmount(form.amount);
    if (amount <= 0) {
      setError("El importe debe ser positivo.");
      return;
    }

    try {
      if (form.id) {
        const current = adjustments.find(
          (adjustment) => adjustment.id === form.id,
        );
        if (!current) return;
        updateStoredInternalAdjustment({
          ...current,
          label: form.label,
          amount,
          category: form.category,
          note: form.note || undefined,
        });
      } else {
        addStoredInternalAdjustment({
          sourceDocumentId,
          sourceType,
          amount,
          label: form.label || "Ajuste interno no fiscal",
          category: form.category,
          note: form.note || undefined,
        });
      }
      resetForm();
      reload();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar el ajuste interno.",
      );
    }
  }

  function deleteAdjustment(id: string) {
    removeStoredInternalAdjustment(id);
    if (form.id === id) resetForm();
    reload();
  }

  return (
    <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
              Ajustes internos no fiscales
            </h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black uppercase text-amber-800 dark:bg-amber-950/45 dark:text-amber-100">
              No fiscal
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Estos ajustes ayudan a ver tu rentabilidad interna, pero no son
            gastos fiscales.
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-black text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100">
          Total: {formatMoney(summary.totalInternalAdjustments)}
        </div>
      </div>

      <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
        {MANDATORY_ADJUSTMENT_COPY}
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(8rem,0.45fr)_minmax(0,1fr)]">
        <label className="block">
          <span className="text-sm font-black text-slate-950 dark:text-slate-50">
            Concepto
          </span>
          <input
            value={form.label}
            onChange={(event) => patchForm({ label: event.target.value })}
            placeholder="Ajuste interno no fiscal"
            className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-black text-slate-950 dark:text-slate-50">
            Importe
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(event) => patchForm({ amount: event.target.value })}
            className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-black text-slate-950 dark:text-slate-50">
            Categoría
          </span>
          <select
            value={form.category}
            onChange={(event) =>
              patchForm({
                category: event.target
                  .value as InternalProfitabilityAdjustmentCategory,
              })
            }
            className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 block">
        <span className="text-sm font-black text-slate-950 dark:text-slate-50">
          Nota interna opcional
        </span>
        <textarea
          value={form.note}
          onChange={(event) => patchForm({ note: event.target.value })}
          rows={2}
          className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>

      {form.category === "undocumented_help" ? (
        <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-100">
          {ADVISOR_HELP_COPY}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-100">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={saveAdjustment} className="gap-2">
          {form.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {form.id ? "Guardar ajuste" : "Añadir ajuste interno"}
        </Button>
        {form.id ? (
          <Button
            type="button"
            variant="secondary"
            onClick={resetForm}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Cancelar
          </Button>
        ) : null}
      </div>

      <div className="mt-5 space-y-2">
        {adjustments.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
            No hay ajustes internos no fiscales para esta fuente.
          </p>
        ) : (
          adjustments.map((adjustment) => (
            <div
              key={adjustment.id}
              className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_auto] dark:border-slate-700 dark:bg-slate-800/60"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black text-slate-950 dark:text-slate-50">
                    {adjustment.label}
                  </p>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black uppercase text-amber-800 dark:bg-amber-950/45 dark:text-amber-100">
                    No fiscal
                  </span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-black text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                    Solo rentabilidad interna
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {categoryLabel(adjustment.category)}
                </p>
                {adjustment.note ? (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {adjustment.note}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <p className="text-base font-black text-slate-950 dark:text-slate-50">
                  {formatMoney(adjustment.amount)}
                </p>
                <button
                  type="button"
                  onClick={() => editAdjustment(adjustment)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
                  aria-label="Editar ajuste interno"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteAdjustment(adjustment.id)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 transition-colors hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-950 dark:text-red-200 dark:hover:bg-red-950/35"
                  aria-label="Eliminar ajuste interno"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
