"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  FileText,
  Keyboard,
  Pencil,
  Repeat2,
  Receipt,
  ScanLine,
  ShoppingCart,
  Trash2,
  Upload,
} from "lucide-react";
import { ExpenseFiltersBar } from "@/components/expenses/ExpenseFiltersBar";
import { ExpenseInboxCard } from "@/components/expenses/ExpenseInboxCard";
import { ExpenseSupplierDonut } from "@/components/expenses/ExpenseSupplierDonut";
import { RecurringDueBanner } from "@/components/expenses/RecurringDueBanner";
import { FactuEmptyState } from "@/components/factu/FactuEmptyState";
import { ButtonLink } from "@/components/ui/Button";
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
import { documentShortNumber } from "@/lib/document-links";
import { expenseEditHref } from "@/lib/expense-links";
import {
  aggregateExpensesBySupplier,
  EXPENSE_CHART_COLORS,
  expenseExportFilenameStem,
  filterExpensesByPeriod,
  formatExpensePeriodLabel,
  getDefaultExpensePeriod,
  matchesSupplierFilter,
  supplierLabelFromKey,
  type ExpensePeriodKind,
  type SupplierSpendSlice,
  uniqueSupplierOptions,
} from "@/lib/expense-filters";
import {
  expenseBusinessKindShortLabel,
  inferExpenseBusinessKind,
  isFixedExpense,
} from "@/lib/expense-classification";
import {
  purchaseLineHasCatalogProduct,
  purchaseProductCatalogKeys,
} from "@/lib/purchase-products";
import type { Quarter } from "@/lib/periods";
import type { Expense, ExpenseBusinessKind, Supplier } from "@/lib/types";
import { expenseAmount, isVatExempt } from "@/lib/vat-regime";

const EXPENSE_LIST_BATCH_SIZE = 30;
const FIXED_EXPENSE_OTHER_KEY = "__fixed_otros__";

function fixedExpenseFilterKey(expense: Expense): string {
  if (expense.recurringExpenseId) return `fixed:${expense.recurringExpenseId}`;
  const label = `${expense.supplierName}:${expense.description}`
    .trim()
    .toLowerCase();
  return `fixed:${label}`;
}

function fixedExpenseLabel(expense: Expense): string {
  return expense.supplierName.trim() || expense.description.trim() || "Gasto fijo";
}

function aggregateFixedExpenses(
  expenses: Expense[],
  vatExempt: boolean,
  maxSlices = 8,
): SupplierSpendSlice[] {
  const fixedExpenses = expenses.filter(isFixedExpense);
  if (fixedExpenses.length === 0) return [];

  const totals = new Map<string, { label: string; amount: number }>();
  for (const expense of fixedExpenses) {
    const key = fixedExpenseFilterKey(expense);
    const amount = expenseAmount(expense, vatExempt);
    const current = totals.get(key);
    if (current) {
      current.amount += amount;
    } else {
      totals.set(key, { label: fixedExpenseLabel(expense), amount });
    }
  }

  const sorted = [...totals.entries()].sort((a, b) => b[1].amount - a[1].amount);
  const grandTotal = sorted.reduce((sum, [, value]) => sum + value.amount, 0);
  if (grandTotal <= 0) return [];

  const limit = Math.max(2, maxSlices);
  const main = sorted.slice(0, limit - 1);
  const rest = sorted.slice(limit - 1);

  const slices = main.map(([key, value], index) => ({
    key,
    label: value.label,
    amount: value.amount,
    percent: (value.amount / grandTotal) * 100,
    color: EXPENSE_CHART_COLORS[index % EXPENSE_CHART_COLORS.length],
  }));

  if (rest.length > 0) {
    const otrosAmount = rest.reduce((sum, [, value]) => sum + value.amount, 0);
    slices.push({
      key: FIXED_EXPENSE_OTHER_KEY,
      label: "Otros fijos",
      amount: otrosAmount,
      percent: (otrosAmount / grandTotal) * 100,
      color: EXPENSE_CHART_COLORS[slices.length % EXPENSE_CHART_COLORS.length],
    });
  }

  return slices;
}

function matchesExpenseFilter(
  expense: Expense,
  filterKey: string | null,
  purchaseSlices: SupplierSpendSlice[],
  fixedSlices: SupplierSpendSlice[],
): boolean {
  if (!filterKey) return true;

  if (filterKey === FIXED_EXPENSE_OTHER_KEY) {
    const mainKeys = fixedSlices
      .filter((slice) => slice.key !== FIXED_EXPENSE_OTHER_KEY)
      .map((slice) => slice.key);
    return isFixedExpense(expense) && !mainKeys.includes(fixedExpenseFilterKey(expense));
  }

  if (filterKey.startsWith("fixed:")) {
    return isFixedExpense(expense) && fixedExpenseFilterKey(expense) === filterKey;
  }

  return (
    !isFixedExpense(expense) &&
    matchesSupplierFilter(expense, filterKey, purchaseSlices)
  );
}

function expenseSourceLabel(expense: Expense): string {
  if (expense.origin === "scan") return "Introducido con escaneo";
  if (expense.origin === "import") return "Importado";
  if (isFixedExpense(expense)) return "Gasto fijo";
  return "Introducido manualmente";
}

function ExpenseSourceIcon({ expense }: { expense: Expense }) {
  const label = expenseSourceLabel(expense);
  const Icon =
    expense.origin === "scan"
      ? ScanLine
      : expense.origin === "import"
        ? Upload
        : isFixedExpense(expense)
          ? Repeat2
          : Keyboard;

  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"
      aria-label={label}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

function ExpenseKindBadge({
  expense,
  supplier,
}: {
  expense: Expense;
  supplier?: Supplier;
}) {
  const kind = inferExpenseBusinessKind(expense, supplier);
  const label = expenseBusinessKindShortLabel(kind);
  const Icon = expenseKindIcon(kind);
  const tone = expenseKindTone(kind);

  return (
    <span
      className={`inline-flex min-h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] font-bold ${tone}`}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function expenseKindIcon(kind: ExpenseBusinessKind) {
  if (kind === "purchase_invoice") return FileText;
  if (kind === "quick_ticket") return Receipt;
  if (kind === "fixed") return Repeat2;
  return ShoppingCart;
}

function expenseKindTone(kind: ExpenseBusinessKind): string {
  if (kind === "purchase_invoice") {
    return "border-blue-100 bg-blue-50 text-blue-700";
  }
  if (kind === "quick_ticket") {
    return "border-amber-100 bg-amber-50 text-amber-800";
  }
  if (kind === "fixed") {
    return "border-violet-100 bg-violet-50 text-violet-700";
  }
  return "border-emerald-100 bg-emerald-50 text-emerald-700";
}

function ExpensePurchaseLinesPreview({
  expense,
  productKeys,
}: {
  expense: Expense;
  productKeys: Set<string>;
}) {
  const lines = (expense.purchaseLines ?? [])
    .map((line) => ({
      description: line.description.trim(),
      hasProduct: purchaseLineHasCatalogProduct(line, productKeys),
    }))
    .filter((line) => line.description.length > 0);

  if (lines.length === 0) {
    return (
      <p className="text-sm text-slate-400 md:text-center">
        Sin líneas de producto
      </p>
    );
  }

  return (
    <div className="min-w-0">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        Líneas detectadas
      </p>
      <div className="flex flex-wrap gap-1.5">
        {lines.map((line, index) => (
          <span
            key={`${line.description}-${index}`}
            className={`max-w-full rounded-full px-2.5 py-1 text-xs font-semibold leading-snug [overflow-wrap:anywhere] ${
              line.hasProduct
                ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200"
                : "bg-slate-100 text-slate-600"
            }`}
            title={
              line.hasProduct
                ? `${line.description} · artículo creado`
                : `${line.description} · sin artículo creado`
            }
          >
            {line.description}
          </span>
        ))}
      </div>
    </div>
  );
}

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
  const recurringExpenseIds = useMemo(
    () => new Set(data.recurringExpenses.map((item) => item.id)),
    [data.recurringExpenses],
  );

  const suppliersById = useMemo(
    () => new Map(data.suppliers.map((supplier) => [supplier.id, supplier])),
    [data.suppliers],
  );
  const documentsById = useMemo(
    () => new Map(data.documents.map((document) => [document.id, document])),
    [data.documents],
  );
  const productKeys = useMemo(
    () => purchaseProductCatalogKeys(data.products, data.expenses),
    [data.expenses, data.products],
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

  const purchaseExpenses = useMemo(
    () => periodExpenses.filter((expense) => !isFixedExpense(expense)),
    [periodExpenses],
  );

  const purchaseChartSlices = useMemo(
    () => aggregateExpensesBySupplier(purchaseExpenses, vatExempt),
    [purchaseExpenses, vatExempt],
  );

  const fixedChartSlices = useMemo(
    () => aggregateFixedExpenses(periodExpenses, vatExempt),
    [periodExpenses, vatExempt],
  );

  const supplierOptions = useMemo(
    () => {
      const supplierOptions = uniqueSupplierOptions(purchaseExpenses);
      const fixedOptions = fixedChartSlices.map((slice) => ({
        key: slice.key,
        label: slice.label,
      }));
      return [...supplierOptions, ...fixedOptions];
    },
    [fixedChartSlices, purchaseExpenses],
  );

  const filteredExpenses = useMemo(() => {
    const matched = periodExpenses.filter((expense) =>
      matchesExpenseFilter(
        expense,
        supplierFilter,
        purchaseChartSlices,
        fixedChartSlices,
      ),
    );
    return [...matched].sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }, [fixedChartSlices, periodExpenses, purchaseChartSlices, supplierFilter]);

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
      ? supplierOptions.find((option) => option.key === supplierFilter)?.label ??
        supplierLabelFromKey(supplierFilter, data.expenses)
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
      />

      <RecurringDueBanner data={data} />

      <div className="mb-4">
        <ExpenseInboxCard />
      </div>

      <Card className="mb-4 space-y-2 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Acciones
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <ButtonLink href="/gastos/nuevo">+ Añadir gasto</ButtonLink>
          <ButtonLink href="/gastos/fijos" variant="secondary">
            + Gastos fijos
          </ButtonLink>
        </div>
      </Card>

      <Card className="mb-4 space-y-3 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Buscar y ordenar
        </h2>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-end">
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
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 xl:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Total gastado
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">
              {formatMoney(total)}
            </p>
            {filteredExpenses.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="mt-2 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </button>
            )}
            {supplierFilter && (
              <p className="mt-1 text-xs text-emerald-800">
                {filteredExpenses.length} gasto
                {filteredExpenses.length === 1 ? "" : "s"} filtrado
                {filteredExpenses.length === 1 ? "" : "s"}
              </p>
            )}
            {vatExempt && (
              <p className="mt-1 text-xs text-emerald-800">
                Sin IVA deducible
              </p>
            )}
          </div>
        </div>
      </Card>

      {(purchaseChartSlices.length > 0 || fixedChartSlices.length > 0) && (
        <Card className="mb-4 p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">Gastos por tipo</h2>
              <p className="text-sm text-slate-500">
                Pulsa un segmento o la leyenda para filtrar. Usa restablecer
                para volver al listado completo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSupplierFilter(null)}
              disabled={!supplierFilter}
              className="rounded-full border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Restablecer
            </button>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {purchaseChartSlices.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                  Compras
                </h3>
                <ExpenseSupplierDonut
                  slices={purchaseChartSlices}
                  selectedKey={supplierFilter}
                  onSelect={setSupplierFilter}
                  ariaLabel="Gastos de compras"
                />
              </section>
            )}
            {fixedChartSlices.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                  Gastos fijos
                </h3>
                <ExpenseSupplierDonut
                  slices={fixedChartSlices}
                  selectedKey={supplierFilter}
                  onSelect={setSupplierFilter}
                  ariaLabel="Gastos fijos"
                />
              </section>
            )}
          </div>
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
                <Card className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(16rem,1.35fr)_auto] md:items-center">
                  <Link
                    href={expenseEditHref(expense, recurringExpenseIds)}
                    className="min-w-0 flex-1 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    aria-label={`Abrir gasto ${expense.description}`}
                  >
                    <p className="font-bold text-slate-900">
                      {expense.supplierName}
                    </p>
                    <p className="text-sm text-slate-600">
                      {expense.description}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <ExpenseSourceIcon expense={expense} />
                      <ExpenseKindBadge
                        expense={expense}
                        supplier={
                          expense.supplierId
                            ? suppliersById.get(expense.supplierId)
                            : undefined
                        }
                      />
                      <span className="min-w-0 truncate">
                        {formatShortDate(expense.date)} · {expense.category} ·{" "}
                        {expense.paymentMethod}
                      </span>
                    </div>
                    {(expense.purchaseDocument?.invoiceNumber ||
                      expense.purchaseLines?.length ||
                      expense.workDocumentId) && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        {expense.purchaseDocument?.invoiceNumber && (
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            Fra. {expense.purchaseDocument.invoiceNumber}
                          </span>
                        )}
                        {expense.purchaseLines?.length ? (
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                            {expense.purchaseLines.length} línea(s)
                          </span>
                        ) : null}
                        {expense.workDocumentId &&
                        documentsById.get(expense.workDocumentId) ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                            Trabajo{" "}
                            {documentShortNumber(
                              documentsById.get(expense.workDocumentId)!,
                            )}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </Link>
                  <Link
                    href={expenseEditHref(expense, recurringExpenseIds)}
                    className="min-w-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    aria-label={`Ver líneas de ${expense.description}`}
                  >
                    <ExpensePurchaseLinesPreview
                      expense={expense}
                      productKeys={productKeys}
                    />
                  </Link>
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-bold text-red-700">
                      {formatMoney(expenseAmount(expense, vatExempt))}
                    </span>
                    <Link
                      href={expenseEditHref(expense, recurringExpenseIds)}
                      aria-label={`Editar gasto ${expense.description}`}
                      title="Editar"
                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-blue-200 bg-white text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
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
