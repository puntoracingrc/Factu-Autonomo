"use client";

import { useMemo, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { ExpenseFiltersBar } from "@/components/expenses/ExpenseFiltersBar";
import { ExpenseSupplierDonut } from "@/components/expenses/ExpenseSupplierDonut";
import { RecurringDueBanner } from "@/components/expenses/RecurringDueBanner";
import { FactuEmptyState } from "@/components/factu/FactuEmptyState";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import {
  buildExpensesExportCsv,
  downloadExpensesCsv,
} from "@/lib/billing/export-expenses-csv";
import {
  aggregateExpensesBySupplier,
  expenseExportFilenameStem,
  filterExpensesByPeriod,
  formatExpensePeriodLabel,
  getDefaultExpensePeriod,
  matchesSupplierFilter,
  supplierLabelFromKey,
  type ExpensePeriodKind,
  uniqueSupplierOptions,
} from "@/lib/expense-filters";
import type { Quarter } from "@/lib/periods";
import { expenseAmount, isVatExempt } from "@/lib/vat-regime";

export default function GastosPage() {
  const { data, deleteExpense } = useAppStore();
  const vatExempt = isVatExempt(data.profile);
  const defaultPeriod = getDefaultExpensePeriod();

  const [periodKind, setPeriodKind] =
    useState<ExpensePeriodKind>(defaultPeriod.kind);
  const [year, setYear] = useState(defaultPeriod.year);
  const [month, setMonth] = useState(defaultPeriod.month);
  const [quarter, setQuarter] = useState<Quarter>(defaultPeriod.quarter);
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);

  const periodExpenses = useMemo(
    () =>
      filterExpensesByPeriod(
        data.expenses,
        periodKind,
        year,
        month,
        quarter,
      ),
    [data.expenses, periodKind, year, month, quarter],
  );

  const chartSlices = useMemo(
    () => aggregateExpensesBySupplier(periodExpenses, vatExempt),
    [periodExpenses, vatExempt],
  );

  const supplierOptions = useMemo(
    () => uniqueSupplierOptions(periodExpenses),
    [periodExpenses],
  );

  const filteredExpenses = useMemo(() => {
    const matched = periodExpenses.filter((expense) =>
      matchesSupplierFilter(expense, supplierFilter, chartSlices),
    );
    return [...matched].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [periodExpenses, supplierFilter, chartSlices]);

  const total = filteredExpenses.reduce(
    (sum, expense) => sum + expenseAmount(expense, vatExempt),
    0,
  );

  function handlePeriodKindChange(kind: ExpensePeriodKind) {
    setPeriodKind(kind);
    setSupplierFilter(null);
  }

  function handleExportCsv() {
    const periodLabel = formatExpensePeriodLabel(
      periodKind,
      year,
      month,
      quarter,
    );
    const supplierFilterLabel = supplierFilter
      ? supplierLabelFromKey(supplierFilter, data.expenses)
      : undefined;
    const csv = buildExpensesExportCsv(filteredExpenses, data.suppliers, {
      profile: data.profile,
      periodLabel,
      supplierFilterLabel,
    });
    const stem = expenseExportFilenameStem(periodKind, year, month, quarter);
    const suffix = supplierFilter ? "-filtrado" : "";
    downloadExpensesCsv(csv, `${stem}${suffix}`);
  }

  return (
    <div>
      <PageHeader
        title="Gastos y compras"
        subtitle="Registra lo que gastas en tu negocio"
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink href="/gastos/fijos">+ Gastos fijos</ButtonLink>
            <ButtonLink href="/gastos/nuevo">+ Añadir gasto</ButtonLink>
          </div>
        }
      />

      <RecurringDueBanner data={data} />

      <Card className="mb-6 space-y-4">
        <ExpenseFiltersBar
          expenses={data.expenses}
          periodKind={periodKind}
          year={year}
          month={month}
          quarter={quarter}
          supplierFilter={supplierFilter}
          supplierOptions={supplierOptions}
          onPeriodKindChange={handlePeriodKindChange}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onQuarterChange={setQuarter}
          onSupplierFilterChange={setSupplierFilter}
        />
      </Card>

      <Card className="mb-6 border-emerald-200 bg-emerald-50">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-700">Total gastado</p>
            <p className="text-2xl font-bold text-emerald-900">
              {formatMoney(total)}
            </p>
          </div>
          {filteredExpenses.length > 0 && (
            <Button variant="secondary" onClick={handleExportCsv}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          )}
        </div>
        {supplierFilter && (
          <p className="mt-1 text-xs text-emerald-800">
            Filtrado por proveedor · {filteredExpenses.length} gasto
            {filteredExpenses.length === 1 ? "" : "s"}
          </p>
        )}
        {vatExempt && (
          <p className="mt-1 text-xs text-emerald-800">
            Sin IVA deducible (exento de repercusión)
          </p>
        )}
      </Card>

      {chartSlices.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-1 font-bold text-slate-900">Gastos por proveedor</h2>
          <p className="mb-4 text-sm text-slate-500">
            Solo visual. Pulsa un segmento o la leyenda para filtrar el listado.
          </p>
          <ExpenseSupplierDonut
            slices={chartSlices}
            selectedKey={supplierFilter}
            onSelect={setSupplierFilter}
          />
        </Card>
      )}

      {data.expenses.length === 0 ? (
        <FactuEmptyState
          variant="gasto"
          action={<ButtonLink href="/gastos/nuevo">Añadir gasto</ButtonLink>}
        />
      ) : filteredExpenses.length === 0 ? (
        <Card className="text-center text-sm text-slate-600">
          No hay gastos en este periodo
          {supplierFilter ? " para el proveedor seleccionado" : ""}.
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => (
            <Card
              key={expense.id}
              className="flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-900">{expense.supplierName}</p>
                <p className="text-sm text-slate-600">{expense.description}</p>
                <p className="text-xs text-slate-400">
                  {formatShortDate(expense.date)} · {expense.category} ·{" "}
                  {expense.paymentMethod}
                  {expense.recurringExpenseId && " · Gasto fijo"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-red-700">
                  {formatMoney(expenseAmount(expense, vatExempt))}
                </span>
                <button
                  onClick={() => {
                    if (confirm("¿Borrar este gasto?")) deleteExpense(expense.id);
                  }}
                  className="rounded-xl bg-red-50 p-2 text-red-600"
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
