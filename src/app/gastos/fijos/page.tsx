"use client";

import { useState } from "react";
import { CalendarClock, Pencil, Plus, Trash2, X } from "lucide-react";
import { IvaPercentSelect } from "@/components/iva/IvaPercentSelect";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { todayISO } from "@/lib/calculations";
import {
  decimalInputFromNumber,
  parseDecimalInput,
  sanitizeDecimalTyping,
  selectInputOnFocus,
} from "@/lib/decimal-input";
import {
  recurringDueLabel,
  recurringDurationLabel,
  recurringFrequencyLabel,
} from "@/lib/recurring-expenses";
import { isVatExempt } from "@/lib/vat-regime";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type RecurringDueTiming,
  type RecurringDuration,
  type RecurringExpense,
  type RecurringExpenseFrequency,
} from "@/lib/types";

const EMPTY_FORM = {
  supplierName: "",
  description: "",
  amountText: "",
  ivaPercent: 21,
  category: EXPENSE_CATEGORIES[0] as string,
  paymentMethod: PAYMENT_METHODS[0] as string,
  frequency: "monthly" as RecurringExpenseFrequency,
  dueKind: "end_of_month" as "end_of_month" | "day_of_month",
  dueDay: "1",
  dueMonth: "1",
  durationKind: "indefinite" as RecurringDuration["kind"],
  endDate: "",
  occurrenceCount: "12",
  startDate: todayISO(),
  notes: "",
};

export default function GastosFijosPage() {
  const {
    data,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
  } = useAppStore();
  const vatExempt = isVatExempt(data.profile);
  const defaultIva = data.profile.iva?.defaultRate ?? 21;

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ivaPercent: defaultIva,
  });

  const templates = [...data.recurringExpenses].sort((a, b) =>
    a.supplierName.localeCompare(b.supplierName, "es"),
  );

  function openNew() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      ivaPercent: vatExempt ? 0 : defaultIva,
      startDate: todayISO(),
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
  }

  function startEdit(item: RecurringExpense) {
    setEditingId(item.id);
    setForm({
      supplierName: item.supplierName,
      description: item.description,
      amountText: decimalInputFromNumber(item.amount),
      ivaPercent: item.ivaPercent,
      category: item.category,
      paymentMethod: item.paymentMethod,
      frequency: item.frequency,
      dueKind:
        item.dueTiming.kind === "end_of_month" ? "end_of_month" : "day_of_month",
      dueDay:
        item.dueTiming.kind === "day_of_month"
          ? String(item.dueTiming.day)
          : "1",
      dueMonth: String(item.dueMonth ?? 1),
      durationKind: item.duration.kind,
      endDate: item.duration.kind === "until_date" ? item.duration.endDate : "",
      occurrenceCount:
        item.duration.kind === "occurrences" ? String(item.duration.count) : "12",
      startDate: item.startDate,
      notes: item.notes ?? "",
    });
    setFormOpen(true);
  }

  function buildDueTiming(): RecurringDueTiming {
    if (form.dueKind === "end_of_month") return { kind: "end_of_month" };
    return {
      kind: "day_of_month",
      day: Math.min(31, Math.max(1, Number(form.dueDay) || 1)),
    };
  }

  function buildDuration(): RecurringDuration {
    if (form.durationKind === "until_date") {
      return { kind: "until_date", endDate: form.endDate || todayISO() };
    }
    if (form.durationKind === "occurrences") {
      return {
        kind: "occurrences",
        count: Math.max(1, Number(form.occurrenceCount) || 1),
      };
    }
    return { kind: "indefinite" };
  }

  function handleSave() {
    const amount = parseDecimalInput(form.amountText);
    if (!form.supplierName.trim() || !form.description.trim() || amount <= 0) {
      alert("Completa proveedor, descripción e importe");
      return;
    }
    if (form.frequency === "annual" && form.dueKind === "end_of_month") {
      alert("En gastos anuales indica un día concreto del mes");
      return;
    }

    const payload = {
      supplierName: form.supplierName.trim(),
      description: form.description.trim(),
      amount,
      ivaPercent: vatExempt ? 0 : form.ivaPercent,
      category: form.category,
      paymentMethod: form.paymentMethod,
      frequency: form.frequency,
      dueTiming: buildDueTiming(),
      dueMonth:
        form.frequency === "annual" ? Number(form.dueMonth) : undefined,
      duration: buildDuration(),
      startDate: form.startDate,
      enabled: true,
      notes: form.notes || undefined,
    };

    if (editingId) {
      const existing = data.recurringExpenses.find((item) => item.id === editingId);
      if (existing) {
        updateRecurringExpense({
          ...existing,
          ...payload,
        });
      }
    } else {
      addRecurringExpense(payload);
    }

    closeForm();
  }

  return (
    <div>
      <PageHeader
        title="Gastos fijos"
        subtitle="Cuotas recurrentes que se registran solas en Gastos (autónomos, seguros, planes de pago…)"
        action={
          <ButtonLink href="/gastos" variant="secondary">
            Ver gastos
          </ButtonLink>
        }
      />

      <Card className="mb-6 border-sky-200 bg-sky-50">
        <p className="text-sm text-sky-900">
          Configura el importe, la frecuencia y cuándo vence. La app crea el gasto
          automáticamente en la fecha indicada y aparece en{" "}
          <strong>Gastos y compras</strong> como cualquier otro.
        </p>
      </Card>

      {!formOpen && (
        <Button onClick={openNew} fullWidth className="mb-6 gap-2">
          <Plus className="h-5 w-5" />
          Nuevo gasto fijo
        </Button>
      )}

      {formOpen && (
        <Card className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-slate-900">
              <CalendarClock className="h-5 w-5 text-blue-600" />
              {editingId ? "Editar gasto fijo" : "Nuevo gasto fijo"}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="flex items-center gap-1 text-sm text-slate-500"
            >
              <X className="h-4 w-4" /> Cancelar
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Proveedor / entidad *">
              <Input
                value={form.supplierName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, supplierName: e.target.value }))
                }
                placeholder="Ej: TGSS, Aseguradora, AEAT"
              />
            </Field>
            <Field label="Concepto *">
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Ej: Cuota autónomos"
              />
            </Field>
            <Field label={vatExempt ? "Importe *" : "Importe (sin IVA) *"}>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={form.amountText}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    amountText: sanitizeDecimalTyping(e.target.value),
                  }))
                }
                onFocus={selectInputOnFocus}
              />
            </Field>
            {!vatExempt && (
              <Field label="IVA %">
                <IvaPercentSelect
                  value={form.ivaPercent}
                  onChange={(ivaPercent) =>
                    setForm((prev) => ({ ...prev, ivaPercent }))
                  }
                />
              </Field>
            )}
            <Field label="Categoría">
              <Select
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value }))
                }
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Forma de pago">
              <Select
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    paymentMethod: e.target.value,
                  }))
                }
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Frecuencia">
              <Select
                value={form.frequency}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    frequency: e.target.value as RecurringExpenseFrequency,
                  }))
                }
              >
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="annual">Anual</option>
              </Select>
            </Field>
            <Field label="Cuándo vence">
              <Select
                value={form.dueKind}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    dueKind: e.target.value as "end_of_month" | "day_of_month",
                  }))
                }
              >
                <option value="end_of_month">Final de mes</option>
                <option value="day_of_month">Día concreto del mes</option>
              </Select>
            </Field>
            {form.dueKind === "day_of_month" && (
              <Field label="Día del mes (1-31)">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dueDay}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, dueDay: e.target.value }))
                  }
                />
              </Field>
            )}
            {form.frequency === "annual" && (
              <Field label="Mes del año">
                <Select
                  value={form.dueMonth}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, dueMonth: e.target.value }))
                  }
                >
                  {[
                    "Enero",
                    "Febrero",
                    "Marzo",
                    "Abril",
                    "Mayo",
                    "Junio",
                    "Julio",
                    "Agosto",
                    "Septiembre",
                    "Octubre",
                    "Noviembre",
                    "Diciembre",
                  ].map((month, index) => (
                    <option key={month} value={String(index + 1)}>
                      {month}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Primera fecha / inicio">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </Field>
            <Field label="Duración">
              <Select
                value={form.durationKind}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    durationKind: e.target.value as RecurringDuration["kind"],
                  }))
                }
              >
                <option value="indefinite">Siempre (indefinido)</option>
                <option value="occurrences">Número de veces</option>
                <option value="until_date">Hasta una fecha</option>
              </Select>
            </Field>
            {form.durationKind === "occurrences" && (
              <Field
                label="Cuántas veces"
                hint={
                  form.frequency === "monthly"
                    ? "Ej: 5 meses de plan de pago"
                    : "Número de cargos a generar"
                }
              >
                <Input
                  type="number"
                  min={1}
                  value={form.occurrenceCount}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      occurrenceCount: e.target.value,
                    }))
                  }
                />
              </Field>
            )}
            {form.durationKind === "until_date" && (
              <Field label="Fecha final">
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                />
              </Field>
            )}
            <div className="sm:col-span-2">
            <Field label="Notas">
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </Field>
            </div>
          </div>

          <Button fullWidth onClick={handleSave}>
            {editingId ? "Guardar cambios" : "Guardar gasto fijo"}
          </Button>
        </Card>
      )}

      {templates.length === 0 ? (
        <Card className="text-center text-slate-500">
          No hay gastos fijos configurados. Ejemplos: cuota de autónomos (mensual,
          fin de mes), seguro anual o plan de pago con Hacienda.
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((item) => (
            <Card key={item.id} className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-900">{item.description}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      item.enabled
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.enabled ? "Activo" : "Pausado"}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{item.supplierName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {recurringFrequencyLabel(item.frequency)} ·{" "}
                  {recurringDueLabel(item)} · {recurringDurationLabel(item)}
                </p>
                <p className="text-sm font-semibold text-red-700">
                  {item.amount.toFixed(2)} €
                  {!vatExempt && item.ivaPercent > 0
                    ? ` + ${item.ivaPercent}% IVA`
                    : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateRecurringExpense({ ...item, enabled: !item.enabled })
                  }
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  {item.enabled ? "Pausar" : "Activar"}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="rounded-xl bg-blue-50 p-2 text-blue-700"
                  title="Editar"
                >
                  <Pencil className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`¿Borrar el gasto fijo «${item.description}»?`)) {
                      deleteRecurringExpense(item.id);
                    }
                  }}
                  className="rounded-xl bg-red-50 p-2 text-red-600"
                  title="Borrar"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
