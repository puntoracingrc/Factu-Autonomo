"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Download, Pencil, Trash2 } from "lucide-react";
import { ExpenseFiltersBar } from "@/components/expenses/ExpenseFiltersBar";
import { ExpenseSupplierDonut } from "@/components/expenses/ExpenseSupplierDonut";
import { RecurringDueBanner } from "@/components/expenses/RecurringDueBanner";
import { FactuEmptyState } from "@/components/factu/FactuEmptyState";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { TimelineMonthDivider } from "@/components/ui/TimelineMonthDivider";
import { useAppStore } from "@/context/AppStore";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import {
  formatTimelineMonthLabel,
  timelineMonthKey,
} from "@/lib/timeline";
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

const EXPENSE_LIST_BATCH_SIZE = 30;

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
  const [visibleExpenseCount, setVisibleExpenseCount] = useState(
    EXPENSE_LIST_BATCH_SIZE,
  );

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
    return [...matched].sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }, [periodExpenses, supplierFilter, chartSlices]);

  const visibleExpenses = filteredExpenses.slice(0, visibleExpenseCount);
  const hiddenExpenseCount = Math.max(
    filteredExpenses.length - visibleExpenses.length,
    0,
  );

  const total = filteredExpenses.reduce(
    (sum, expense) => sum + expenseAmount(expense, vatExempt),
    0,
  );

  useEffect(() => {
    setVisibleExpenseCount(EXPENSE_LIST_BATCH_SIZE);
  }, [month, periodKind, quarter, supplierFilter, year]);

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
          {visibleExpenses.map((expense, index) => {
            const previousExpense =
              index > 0 ? visibleExpenses[index - 1] : null;
            const showTimelineDivider =
              !previousExpense ||
              timelineMonthKey(previousExpense.date) !==
                timelineMonthKey(expense.date);

            return (
              <Fragment key={expense.id}>
                {showTimelineDivider && (
                  <TimelineMonthDivider
                    label={formatTimelineMonthLabel(expense.date)}
                  />
                )}
                <Card className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">
                      {expense.supplierName}
                    </p>
                    <p className="text-sm text-slate-600">
                      {expense.description}
                    </p>
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
                    <ButtonLink
                      href={`/gastos/nuevo?editar=${encodeURIComponent(
                        expense.id,
                      )}`}
                      variant="secondary"
                      className="min-h-10 px-3 text-sm"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </ButtonLink>
                    <button
                      onClick={() => {
                        if (confirm("¿Borrar este gasto?")) {
                          deleteExpense(expense.id);
                        }
                      }}
                      className="rounded-xl bg-red-50 p-2 text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                      aria-label={`Borrar gasto ${expense.description}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </Card>
              </Fragment>
            );
          })}
          {hiddenExpenseCount > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() =>
                  setVisibleExpenseCount((current) =>
                    Math.min(
                      current + EXPENSE_LIST_BATCH_SIZE,
                      filteredExpenses.length,
                    ),
                  )
                }
                className="min-h-12 w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Cargar {Math.min(EXPENSE_LIST_BATCH_SIZE, hiddenExpenseCount)}{" "}
                más
              </button>
              <p className="mt-2 text-center text-xs font-medium text-slate-400">
                Mostrando {visibleExpenses.length} de {filteredExpenses.length}{" "}
                gastos
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
