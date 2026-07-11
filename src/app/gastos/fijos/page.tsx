"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { IvaPercentSelect } from "@/components/iva/IvaPercentSelect";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { ResponsiveEntityPanel } from "@/components/ui/ResponsiveEntityPanel";
import { useAppStore } from "@/context/AppStore";
import { formatMoney, formatShortDate, todayISO } from "@/lib/calculations";
import {
  decimalInputFromNumber,
  parseDecimalInput,
} from "@/lib/decimal-input";
import { ExpenseAmountFields } from "@/components/expenses/ExpenseAmountFields";
import { RecurringDueBanner } from "@/components/expenses/RecurringDueBanner";
import { RecurringUpcomingList } from "@/components/expenses/RecurringUpcomingList";
import {
  isRecurringExpenseApplicableOn,
  normalizeRecurringOccurrenceCount,
  recurringDueLabel,
  recurringDurationLabel,
  recurringExpenseTotals,
  recurringFrequencyLabel,
  recurringExpenseStatusOn,
} from "@/lib/recurring-expenses";
import { isVatExempt } from "@/lib/vat-regime";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type ExpenseDeductibility,
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
  deductibility: "deductible" as ExpenseDeductibility,
  category: EXPENSE_CATEGORIES[0] as string,
  paymentMethod: PAYMENT_METHODS[0] as string,
  frequency: "monthly" as RecurringExpenseFrequency,
  dueKind: "end_of_month" as
    | "start_of_month"
    | "mid_of_month"
    | "end_of_month"
    | "day_of_month",
  dueDay: "1",
  dueMonth: "1",
  durationKind: "indefinite" as RecurringDuration["kind"],
  endDate: "",
  occurrenceCount: "12",
  startDate: todayISO(),
  notes: "",
};

type EditApplyMode = "today" | "custom";

const FREQUENCY_MONTHLY_DIVISOR: Record<RecurringExpenseFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

function recurringExpenseForm(item: RecurringExpense) {
  return {
    supplierName: item.supplierName,
    description: item.description,
    amountText: decimalInputFromNumber(item.amount),
    ivaPercent: item.ivaPercent,
    deductibility: item.deductibility ?? "deductible",
    category: item.category,
    paymentMethod: item.paymentMethod,
    frequency: item.frequency,
    dueKind: item.dueTiming.kind,
    dueDay:
      item.dueTiming.kind === "day_of_month"
        ? String(item.dueTiming.day)
        : "1",
    dueMonth: String(item.dueMonth ?? 1),
    durationKind: item.duration.kind,
    endDate: item.duration.kind === "until_date" ? item.duration.endDate : "",
    occurrenceCount:
      item.duration.kind === "occurrences"
        ? String(normalizeRecurringOccurrenceCount(item.duration.count) ?? 1)
        : "12",
    startDate: item.startDate,
    notes: item.notes ?? "",
  };
}

export default function GastosFijosPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    data,
    addRecurringExpense,
    updateRecurringExpense,
    applyRecurringExpenseChange,
    deleteRecurringExpense,
  } = useAppStore();
  const vatExempt = isVatExempt(data.profile);
  const defaultIva = data.profile.iva?.defaultRate ?? 21;
  const today = todayISO();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editApplyMode, setEditApplyMode] =
    useState<EditApplyMode>("today");
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ivaPercent: defaultIva,
  });

  const templates = [...data.recurringExpenses].sort((a, b) => {
    const closedA = recurringExpenseStatusOn(a, today) === "closed";
    const closedB = recurringExpenseStatusOn(b, today) === "closed";
    if (closedA !== closedB) return closedA ? 1 : -1;
    return a.supplierName.localeCompare(b.supplierName, "es");
  });
  const activeSummary = useMemo(() => {
    const summary = {
      monthly: 0,
      quarterly: 0,
      annual: 0,
      monthlyEquivalent: 0,
      totalActive: 0,
    };

    for (const item of data.recurringExpenses) {
      if (!isRecurringExpenseApplicableOn(item, today)) continue;
      summary[item.frequency] += 1;
      summary.totalActive += 1;
      summary.monthlyEquivalent +=
        recurringExpenseTotals(item, vatExempt).total /
        FREQUENCY_MONTHLY_DIVISOR[item.frequency];
    }

    summary.monthlyEquivalent =
      Math.round((summary.monthlyEquivalent + Number.EPSILON) * 100) / 100;

    return summary;
  }, [data.recurringExpenses, today, vatExempt]);
  const requestedEditId = searchParams.get("editar");
  const selectedEffectiveDate =
    editApplyMode === "today" ? today : effectiveDate || today;

  useEffect(() => {
    if (!requestedEditId || editingId === requestedEditId) return;
    const requestedTemplate = data.recurringExpenses.find(
      (item) => item.id === requestedEditId,
    );
    if (!requestedTemplate) return;

    setEditingId(requestedTemplate.id);
    setEditApplyMode("today");
    setEffectiveDate(todayISO());
    setForm(recurringExpenseForm(requestedTemplate));
    setFormOpen(true);
  }, [data.recurringExpenses, editingId, requestedEditId]);

  function openNew() {
    setEditingId(null);
    setEditApplyMode("today");
    setEffectiveDate(todayISO());
    setForm({
      ...EMPTY_FORM,
      ivaPercent: vatExempt ? 0 : defaultIva,
      deductibility: "deductible",
      startDate: todayISO(),
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setEditApplyMode("today");
    setEffectiveDate(todayISO());
    if (requestedEditId) {
      router.replace(pathname, { scroll: false });
    }
  }

  function startEdit(item: RecurringExpense) {
    setEditingId(item.id);
    setEditApplyMode("today");
    setEffectiveDate(todayISO());
    setForm(recurringExpenseForm(item));
    setFormOpen(true);
  }

  function buildDueTiming(): RecurringDueTiming {
    if (form.dueKind === "start_of_month") return { kind: "start_of_month" };
    if (form.dueKind === "mid_of_month") return { kind: "mid_of_month" };
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
        count:
          normalizeRecurringOccurrenceCount(Number(form.occurrenceCount)) ??
          1,
      };
    }
    return { kind: "indefinite" };
  }

  function handleSave() {
    const amount = parseDecimalInput(form.amountText);
    const startDate = editingId ? selectedEffectiveDate : form.startDate;
    if (!form.supplierName.trim() || !form.description.trim() || amount <= 0) {
      alert("Completa proveedor, descripción e importe");
      return;
    }
    if (!startDate) {
      alert("Indica desde qué fecha se aplica el gasto");
      return;
    }
    if (form.frequency === "annual" && form.dueKind === "end_of_month") {
      alert("En gastos anuales indica un día concreto del mes");
      return;
    }
    if (
      form.durationKind === "until_date" &&
      form.endDate &&
      form.endDate < startDate
    ) {
      alert("La fecha final no puede ser anterior al inicio del tramo");
      return;
    }

    const payload = {
      supplierName: form.supplierName.trim(),
      description: form.description.trim(),
      amount,
      ivaPercent:
        vatExempt || form.deductibility === "non_deductible"
          ? 0
          : form.ivaPercent,
      deductibility: form.deductibility,
      category: form.category,
      paymentMethod: form.paymentMethod,
      frequency: form.frequency,
      dueTiming: buildDueTiming(),
      dueMonth:
        form.frequency === "annual" ? Number(form.dueMonth) : undefined,
      duration: buildDuration(),
      startDate,
      enabled: true,
      notes: form.notes || undefined,
    };

    if (editingId) {
      const existing = data.recurringExpenses.find((item) => item.id === editingId);
      if (existing) {
        applyRecurringExpenseChange(editingId, payload, startDate);
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
          <div className="flex flex-col gap-2 sm:flex-row">
            {!formOpen && (
              <Button onClick={openNew} className="gap-2">
                <Plus className="h-5 w-5" />
                Nuevo gasto fijo
              </Button>
            )}
            <ButtonLink href="/gastos" variant="secondary">
              Volver
            </ButtonLink>
          </div>
        }
      />

      <p className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
        {activeSummary.totalActive > 0 ? (
          <>
            Activos ahora: {activeSummary.monthly} al mes ·{" "}
            {activeSummary.quarterly} al trimestre · {activeSummary.annual} al
            año. Equivalente mensual aprox.:{" "}
            <span className="font-black text-slate-950">
              {formatMoney(activeSummary.monthlyEquivalent)}
            </span>
            .
          </>
        ) : (
          "No tienes gastos fijos activos ahora mismo."
        )}
      </p>

      <RecurringDueBanner data={data} />
      <RecurringUpcomingList data={data} />

      <Card className="mb-6 border-sky-200 bg-sky-50">
        <p className="text-sm text-sky-900">
          Configura el importe, la frecuencia y cuándo vence. La app crea el gasto
          automáticamente en la fecha indicada y aparece en{" "}
          <strong>Gastos y compras</strong> como cualquier otro.
        </p>
      </Card>

      <ResponsiveEntityPanel
        open={formOpen}
        title={editingId ? "Editar gasto fijo" : "Nuevo gasto fijo"}
        subtitle="Importe, frecuencia, vencimiento y tratamiento del gasto."
        icon={CalendarClock}
        onClose={closeForm}
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:col-span-2">
              <p className="text-sm font-bold text-slate-900">
                Tratamiento del gasto
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  {
                    value: "deductible" as ExpenseDeductibility,
                    label: "Normal con factura o ticket",
                    hint: "Para gastos deducibles habituales con su documento.",
                  },
                  {
                    value: "non_deductible" as ExpenseDeductibility,
                    label: "Gasto extra no desgravable",
                    hint: "Para comidas, parking u otros pagos que quieres recordar, sin deducirlos.",
                  },
                ].map((option) => {
                  const selected = form.deductibility === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          deductibility: option.value,
                          ivaPercent:
                            option.value === "non_deductible"
                              ? 0
                              : vatExempt
                                ? 0
                                : prev.ivaPercent || defaultIva,
                        }))
                      }
                      aria-pressed={selected}
                      className={`rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                        selected
                          ? "border-blue-300 bg-blue-50 text-blue-900"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="block text-sm font-bold">
                        {option.label}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {editingId && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:col-span-2">
                <p className="text-sm font-bold text-amber-950">
                  Cómo aplicar este cambio
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      value: "today" as EditApplyMode,
                      label: "Nuevo importe desde hoy",
                      hint: `No cambia nada anterior a ${formatShortDate(today)}.`,
                    },
                    {
                      value: "custom" as EditApplyMode,
                      label: "Nuevo importe desde otra fecha",
                      hint: "Para poner al día meses que aún no habías cambiado.",
                    },
                  ].map((option) => {
                    const selected = editApplyMode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setEditApplyMode(option.value);
                          if (option.value === "today") {
                            setEffectiveDate(today);
                          }
                        }}
                        aria-pressed={selected}
                        className={`rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                          selected
                            ? "border-amber-400 bg-white text-amber-950"
                            : "border-amber-200 bg-amber-50 text-amber-900 hover:bg-white"
                        }`}
                      >
                        <span className="block text-sm font-bold">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs">
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {editApplyMode === "custom" && (
                  <div className="mt-3">
                    <Field label="Aplicar desde">
                      <Input
                        type="date"
                        value={effectiveDate}
                        onChange={(e) => setEffectiveDate(e.target.value)}
                      />
                    </Field>
                  </div>
                )}
                <p className="mt-3 text-xs font-medium text-amber-900">
                  No se toca ningún gasto anterior a{" "}
                  {formatShortDate(selectedEffectiveDate)}. El tramo anterior se
                  cierra el día previo. Si ya había cargos desde esa fecha, se
                  actualizan al nuevo tramo para no duplicarlos.
                </p>
              </div>
            )}
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
            <ExpenseAmountFields
              amountText={form.amountText}
              onAmountTextChange={(amountText) =>
                setForm((prev) => ({ ...prev, amountText }))
              }
              ivaPercent={form.ivaPercent}
              vatExempt={vatExempt || form.deductibility === "non_deductible"}
            />
            {form.deductibility === "non_deductible" ? (
              <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 sm:col-span-2">
                Se guardará como gasto extra no desgravable. Cuenta entero, con
                IVA 0.
              </div>
            ) : !vatExempt && (
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
                    dueKind: e.target.value as typeof form.dueKind,
                  }))
                }
              >
                <option value="start_of_month">Inicio de mes</option>
                <option value="mid_of_month">Mediados de mes</option>
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
            {!editingId && (
              <Field label="Primera fecha / inicio">
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </Field>
            )}
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
                  step={1}
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
        </div>
      </ResponsiveEntityPanel>

      {templates.length === 0 ? (
        <Card className="text-center text-slate-500">
          No hay gastos fijos configurados. Ejemplos: cuota de autónomos (mensual,
          fin de mes), seguro anual o plan de pago con Hacienda.
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((item) => {
            const totals = recurringExpenseTotals(item, vatExempt);
            const hasIva = totals.ivaPercent > 0;
            const recurringStatus = recurringExpenseStatusOn(item, today);
            const isClosed = recurringStatus === "closed";
            const statusLabel = {
              active: "Activo",
              paused: "Pausado",
              upcoming: "Pendiente",
              closed: "Tramo cerrado",
            }[recurringStatus];
            return (
              <Card
                key={item.id}
                className="flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">
                      {item.description}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isClosed
                          ? "bg-slate-100 text-slate-600"
                          : recurringStatus === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : recurringStatus === "upcoming"
                            ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {statusLabel}
                    </span>
                    {item.deductibility === "non_deductible" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        No desgravable
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{item.supplierName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {recurringFrequencyLabel(item.frequency)} ·{" "}
                    {recurringDueLabel(item)} · {recurringDurationLabel(item)}
                  </p>
                  <p className="text-sm font-semibold text-red-700">
                    {formatMoney(totals.total)}
                    {hasIva ? " IVA incluido" : ""}
                  </p>
                  {hasIva && (
                    <p className="text-xs font-medium text-slate-500">
                      Base {formatMoney(totals.base)} + {totals.ivaPercent}% IVA
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!isClosed && (
                    <button
                      type="button"
                      onClick={() =>
                        updateRecurringExpense({
                          ...item,
                          enabled: !item.enabled,
                        })
                      }
                      className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      {item.enabled ? "Pausar" : "Activar"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-blue-50 p-2 text-blue-700"
                    title="Editar"
                    aria-label={`Editar gasto fijo ${item.description}`}
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(`¿Borrar el gasto fijo «${item.description}»?`)
                      ) {
                        deleteRecurringExpense(item.id);
                      }
                    }}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-red-50 p-2 text-red-600"
                    title="Borrar"
                    aria-label={`Borrar gasto fijo ${item.description}`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
