"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import {
  Download,
  FileText,
  Keyboard,
  Mail,
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
import { ExpensePurchaseLinesPreview } from "@/components/expenses/ExpensePurchaseLinesPreview";
import { ExpenseSupplierDonut } from "@/components/expenses/ExpenseSupplierDonut";
import { RecurringDueBanner } from "@/components/expenses/RecurringDueBanner";
import {
  countBlockedExpenseVat,
  expenseVatSourceLabel,
} from "@/components/expenses/expense-vat-ui";
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
  findDuplicatePurchaseExpense,
  isExpenseFiscalDeductible,
  resolveExpenseVat,
} from "@/lib/expenses";
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
  purchaseProductCatalogKeys,
} from "@/lib/purchase-products";
import {
  isProviderSummaryPendingOriginal,
  planProviderSummaryExpenseImport,
  type ProviderInvoiceSummaryRow,
} from "@/lib/provider-summary-expenses";
import { parseProviderSummaryFile } from "@/lib/provider-summary-file";
import {
  ensureSupplierForExpense,
  supplierCompareKey,
} from "@/lib/suppliers";
import type { Quarter } from "@/lib/periods";
import type { Expense, ExpenseBusinessKind, Supplier } from "@/lib/types";
import { expenseAmount, isVatExempt } from "@/lib/vat-regime";

const EXPENSE_LIST_BATCH_SIZE = 30;
const FIXED_EXPENSE_OTHER_KEY = "__fixed_otros__";

interface ProviderSummaryPreview {
  id: string;
  fileName: string;
  providerName?: string;
  detectedProviderName?: string;
  providerSupplierId?: string;
  providerToCreate?: Omit<Supplier, "id" | "createdAt">;
  rows: ProviderInvoiceSummaryRow[];
  warnings: string[];
  alreadyRegisteredCount: number;
  alreadyPendingOriginalCount: number;
}

function providerSummaryEmailHref(input: {
  providerEmail?: string;
  providerName?: string;
  rows: ProviderInvoiceSummaryRow[];
}): string {
  const provider = input.providerName?.trim() || "proveedor";
  const invoiceList = input.rows
    .map(
      (row) =>
        `- ${row.invoiceNumber} (${formatShortDate(row.date)}, base ${formatMoney(row.base)}, total ${formatMoney(row.total)})`,
    )
    .join("\n");
  const subject = `Solicitud de facturas originales pendientes`;
  const body = [
    `Hola,`,
    "",
    `Tenemos registrado un resumen de ${provider}, pero nos faltan las facturas originales de estos documentos:`,
    "",
    invoiceList,
    "",
    "¿Nos las podéis enviar cuando os sea posible?",
    "",
    "Gracias.",
  ].join("\n");

  return `mailto:${input.providerEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

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

  const sorted = [...totals.entries()]
    .filter(([, value]) => Number.isFinite(value.amount) && value.amount > 0)
    .sort((a, b) => b[1].amount - a[1].amount);
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
    memberKeys: [key],
  }));

  if (rest.length > 0) {
    const otrosAmount = rest.reduce((sum, [, value]) => sum + value.amount, 0);
    slices.push({
      key: FIXED_EXPENSE_OTHER_KEY,
      label: "Otros fijos",
      amount: otrosAmount,
      percent: (otrosAmount / grandTotal) * 100,
      color: EXPENSE_CHART_COLORS[slices.length % EXPENSE_CHART_COLORS.length],
      memberKeys: rest.map(([key]) => key),
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
    const grouped = fixedSlices.find(
      (slice) => slice.key === FIXED_EXPENSE_OTHER_KEY,
    );
    if (grouped?.memberKeys) {
      return (
        isFixedExpense(expense) &&
        grouped.memberKeys.includes(fixedExpenseFilterKey(expense))
      );
    }
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
  if (isProviderSummaryPendingOriginal(expense)) {
    return "Resumen de proveedor";
  }
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

export default function GastosPage() {
  const { data, addExpense, addSupplier, deleteExpense } = useAppStore();
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
  const [summaryImportBusy, setSummaryImportBusy] = useState(false);
  const [summaryImportError, setSummaryImportError] = useState<string | null>(
    null,
  );
  const [summaryImportNotice, setSummaryImportNotice] = useState<string | null>(
    null,
  );
  const [summaryPreview, setSummaryPreview] =
    useState<ProviderSummaryPreview | null>(null);
  const [summaryRemovedInvoiceNumbers, setSummaryRemovedInvoiceNumbers] =
    useState<string[]>([]);
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
  const pendingOriginalExpenses = useMemo(
    () => data.expenses.filter(isProviderSummaryPendingOriginal),
    [data.expenses],
  );
  const pendingOriginalInvoiceNumbers = useMemo(
    () =>
      Array.from(
        new Set(
          pendingOriginalExpenses
            .map((expense) => expense.purchaseDocument?.invoiceNumber?.trim())
            .filter((invoiceNumber): invoiceNumber is string =>
              Boolean(invoiceNumber),
            ),
        ),
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [pendingOriginalExpenses],
  );
  const pendingOriginalInvoicePreview =
    pendingOriginalInvoiceNumbers.slice(0, 10);
  const pendingOriginalInvoiceOverflow = Math.max(
    pendingOriginalInvoiceNumbers.length - pendingOriginalInvoicePreview.length,
    0,
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
      const groupedPurchaseOptions = purchaseChartSlices
        .filter((slice) => slice.key === "__otros__")
        .map((slice) => ({ key: slice.key, label: `${slice.label} (compras)` }));
      const fixedOptionsByKey = new Map(
        periodExpenses
          .filter(isFixedExpense)
          .map((expense) => [
            fixedExpenseFilterKey(expense),
            fixedExpenseLabel(expense),
          ]),
      );
      for (const slice of fixedChartSlices) {
        if (slice.key === FIXED_EXPENSE_OTHER_KEY) {
          fixedOptionsByKey.set(slice.key, slice.label);
        }
      }
      const fixedOptions = [...fixedOptionsByKey].map(([key, label]) => ({
        key,
        label,
      }));
      return [...supplierOptions, ...groupedPurchaseOptions, ...fixedOptions];
    },
    [fixedChartSlices, periodExpenses, purchaseChartSlices, purchaseExpenses],
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
  const filteredCreditCount = filteredExpenses.filter(
    (expense) => expenseAmount(expense, vatExempt) < 0,
  ).length;
  const periodCreditCount = periodExpenses.filter(
    (expense) => expenseAmount(expense, vatExempt) < 0,
  ).length;
  const filteredBalanceIsCredit = total < 0;
  const blockedVatExpenseCount = countBlockedExpenseVat(
    filteredExpenses,
    vatExempt,
  );

  const selectedSummaryRows = useMemo(() => {
    if (!summaryPreview) return [];
    const removed = new Set(summaryRemovedInvoiceNumbers);
    return summaryPreview.rows.filter((row) => !removed.has(row.invoiceNumber));
  }, [summaryPreview, summaryRemovedInvoiceNumbers]);

  const summarySupplier = useMemo(() => {
    if (summaryPreview?.providerSupplierId) {
      return suppliersById.get(summaryPreview.providerSupplierId);
    }
    const providerKey = summaryPreview?.providerName
      ? supplierCompareKey(summaryPreview.providerName)
      : "";
    if (!providerKey) return undefined;
    return data.suppliers.find((supplier) => {
      const supplierKey = supplierCompareKey(supplier.name);
      return supplierKey === providerKey || supplierKey.includes(providerKey);
    });
  }, [
    data.suppliers,
    suppliersById,
    summaryPreview?.providerName,
    summaryPreview?.providerSupplierId,
  ]);

  const summaryEmailHref = useMemo(
    () =>
      providerSummaryEmailHref({
        providerEmail: summarySupplier?.email,
        providerName: summaryPreview?.providerName,
        rows: selectedSummaryRows,
      }),
    [selectedSummaryRows, summaryPreview?.providerName, summarySupplier?.email],
  );

  useEffect(() => {
    setVisibleExpenseCount(EXPENSE_LIST_BATCH_SIZE);
  }, [month, periodKind, quarter, supplierFilter, year]);

  function handlePeriodKindChange(kind: ExpensePeriodKind) {
    setPeriodKind(kind);
    setSupplierFilter(null);
  }

  function handleExportCsv() {
    if (blockedVatExpenseCount > 0) return;
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

  async function handleProviderSummaryFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setSummaryImportBusy(true);
    setSummaryImportError(null);
    setSummaryImportNotice(null);
    setSummaryPreview(null);
    setSummaryRemovedInvoiceNumbers([]);

    try {
      const payload = await parseProviderSummaryFile(file);

      const detectedProviderName = payload.providerName?.trim() || undefined;
      const providerResolution = detectedProviderName
        ? ensureSupplierForExpense(data.suppliers, {
            name: detectedProviderName,
            category: "Material",
            saveSupplier: true,
          })
        : undefined;
      const providerName =
        providerResolution?.supplierName || detectedProviderName;
      const rowsWithDuplicates = payload.rows.map((row) => ({
        row,
        duplicate: findDuplicatePurchaseExpense(data.expenses, {
          invoiceNumber: row.invoiceNumber,
          supplierName: providerName,
          amount: row.base,
        }),
      }));
      const newRows = rowsWithDuplicates
        .filter((item) => !item.duplicate)
        .map((item) => item.row);
      const alreadyPendingOriginalCount = rowsWithDuplicates.filter((item) =>
        item.duplicate ? isProviderSummaryPendingOriginal(item.duplicate) : false,
      ).length;

      setSummaryPreview({
        id: crypto.randomUUID(),
        fileName: payload.fileName,
        providerName,
        detectedProviderName,
        providerSupplierId: providerResolution?.supplierId,
        providerToCreate: providerResolution?.create,
        rows: newRows,
        warnings: payload.warnings,
        alreadyRegisteredCount: payload.rows.length - newRows.length,
        alreadyPendingOriginalCount,
      });
    } catch (error) {
      setSummaryImportError(
        error instanceof Error
          ? error.message
          : "No se pudo importar el resumen del proveedor.",
      );
    } finally {
      setSummaryImportBusy(false);
    }
  }

  function handleRemoveSummaryRow(invoiceNumber: string) {
    setSummaryRemovedInvoiceNumbers((current) =>
      current.includes(invoiceNumber) ? current : [...current, invoiceNumber],
    );
  }

  function handleSaveProviderSummaryExpenses(options: { email?: boolean } = {}) {
    if (!summaryPreview || selectedSummaryRows.length === 0) return;
    const emailHref = summaryEmailHref;
    const importedAt = new Date().toISOString();
    let supplierId = summaryPreview.providerSupplierId;
    let providerName = summaryPreview.providerName;
    if (!supplierId && summaryPreview.providerToCreate) {
      const created = addSupplier(summaryPreview.providerToCreate);
      supplierId = created.id;
      providerName = created.name;
    }
    const plan = planProviderSummaryExpenseImport(
      data.expenses,
      selectedSummaryRows,
      {
        providerName,
        supplierId,
        summaryId: summaryPreview.id,
        fileName: summaryPreview.fileName,
        importedAt,
      },
    );

    plan.expenses.forEach((expense) => addExpense(expense));
    setSummaryImportNotice(
      plan.expenses.length > 0
        ? `Guardadas ${plan.expenses.length} factura(s) desde resumen. Cuentan como gasto y quedan pendientes de original.`
        : "No había facturas nuevas que guardar desde este resumen.",
    );
    setSummaryPreview(null);
    setSummaryRemovedInvoiceNumbers([]);
    if (options.email) {
      window.location.href = emailHref;
    }
  }

  return (
    <div>
      <PageHeader
        title="Gastos y compras"
        subtitle="Registra lo que gastas en tu negocio"
      />

      <RecurringDueBanner data={data} />

      <div className="mb-4">
        <ExpenseInboxCard vatExempt={vatExempt} />
      </div>

      <Card className="mb-4 space-y-2 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Acciones
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <ButtonLink href="/gastos/nuevo">+ Añadir gasto</ButtonLink>
          <ButtonLink href="/gastos/fijos" variant="secondary">
            Gastos fijos
          </ButtonLink>
          <label
            className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-blue-200 bg-white px-5 text-base font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-500 sm:col-span-2 ${
              summaryImportBusy ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <Upload className="h-4 w-4" />
            {summaryImportBusy
              ? "Leyendo resumen..."
              : "Importar resumen de proveedor"}
            <input
              type="file"
              accept=".pdf,.txt,text/plain,application/pdf"
              className="sr-only"
              onChange={(event) => void handleProviderSummaryFileChange(event)}
              disabled={summaryImportBusy}
            />
          </label>
        </div>
      </Card>

      {summaryImportError && (
        <Card className="mb-4 border-red-200 bg-red-50 text-sm font-semibold text-red-800">
          {summaryImportError}
        </Card>
      )}

      {summaryImportNotice && (
        <Card className="mb-4 border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-900">
          {summaryImportNotice}
        </Card>
      )}

      {pendingOriginalExpenses.length > 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-amber-950">
                Facturas pendientes de original
              </h2>
              <p className="text-sm text-amber-900">
                Hay {pendingOriginalExpenses.length} factura
                {pendingOriginalExpenses.length === 1 ? "" : "s"} registrada
                {pendingOriginalExpenses.length === 1 ? "" : "s"} desde resumen.
                Cuentan como gasto, pero falta escanear la factura original.
              </p>
              {pendingOriginalInvoicePreview.length > 0 && (
                <p className="mt-1 text-sm font-semibold text-amber-950">
                  Faltan: {pendingOriginalInvoicePreview.join(", ")}
                  {pendingOriginalInvoiceOverflow > 0
                    ? ` y ${pendingOriginalInvoiceOverflow} más`
                    : ""}
                </p>
              )}
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-amber-800">
              Falta original
            </span>
          </div>
        </Card>
      )}

      {summaryPreview && (
        <Card className="mb-4 space-y-4 border-blue-200 bg-blue-50/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Facturas encontradas en el resumen
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Hemos encontrado {summaryPreview.rows.length} factura
                {summaryPreview.rows.length === 1 ? "" : "s"} que aún no tenías
                registrada{summaryPreview.rows.length === 1 ? "" : "s"}.
                Puedes quitar las que no quieras guardar.
              </p>
              {summaryPreview.providerName && (
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  Proveedor: {summaryPreview.providerName}
                </p>
              )}
              {summaryPreview.detectedProviderName &&
                summaryPreview.providerName &&
                supplierCompareKey(summaryPreview.detectedProviderName) !==
                  supplierCompareKey(summaryPreview.providerName) && (
                  <p className="mt-1 text-xs font-semibold text-emerald-700">
                    Detectado como «{summaryPreview.detectedProviderName}»,
                    guardado en el proveedor existente «
                    {summaryPreview.providerName}».
                  </p>
                )}
              {summaryPreview.providerToCreate && (
                <p className="mt-1 text-xs font-semibold text-blue-700">
                  Se creará este proveedor al guardar porque no hay ninguno
                  parecido.
                </p>
              )}
              {summaryPreview.alreadyRegisteredCount > 0 && (
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Ya registradas o pendientes: {summaryPreview.alreadyRegisteredCount}
                  {summaryPreview.alreadyPendingOriginalCount > 0
                    ? ` (${summaryPreview.alreadyPendingOriginalCount} ya estaban pendientes de original)`
                    : ""}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setSummaryPreview(null);
                setSummaryRemovedInvoiceNumbers([]);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Cancelar
            </button>
          </div>

          {summaryPreview.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {summaryPreview.warnings.slice(0, 3).map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}

          {summaryPreview.rows.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              No hay facturas nuevas en este resumen.
            </div>
          ) : (
            <div className="max-h-[28rem] overflow-auto rounded-2xl border border-slate-200 bg-white">
              <div className="min-w-[42rem] divide-y divide-slate-100">
                {summaryPreview.rows.map((row) => {
                  const removed = summaryRemovedInvoiceNumbers.includes(
                    row.invoiceNumber,
                  );
                  return (
                    <div
                      key={row.invoiceNumber}
                      className={`grid grid-cols-[1.1fr_0.8fr_1fr_1fr_1fr_auto] items-center gap-3 px-4 py-3 text-sm ${
                        removed ? "bg-slate-50 text-slate-400" : ""
                      }`}
                    >
                      <span className="font-bold text-slate-900">
                        {row.invoiceNumber}
                      </span>
                      <span>{formatShortDate(row.date)}</span>
                      <span>Base {formatMoney(row.base)}</span>
                      <span>IVA {formatMoney(row.ivaAmount)}</span>
                      <span className="font-bold">Total {formatMoney(row.total)}</span>
                      {removed ? (
                        <button
                          type="button"
                          onClick={() =>
                            setSummaryRemovedInvoiceNumbers((current) =>
                              current.filter(
                                (invoiceNumber) =>
                                  invoiceNumber !== row.invoiceNumber,
                              ),
                            )
                          }
                          className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700"
                        >
                          Recuperar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveSummaryRow(row.invoiceNumber)}
                          className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-600">
              Seleccionadas {selectedSummaryRows.length} de{" "}
              {summaryPreview.rows.length}. Se guardarán como gasto y quedarán
              marcadas como pendientes de original.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                onClick={() => handleSaveProviderSummaryExpenses()}
                disabled={selectedSummaryRows.length === 0}
              >
                Guardar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  handleSaveProviderSummaryExpenses({ email: true })
                }
                disabled={selectedSummaryRows.length === 0}
              >
                <Mail className="h-4 w-4" />
                Guardar y preparar email
              </Button>
            </div>
          </div>
        </Card>
      )}

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
              {filteredBalanceIsCredit ? "Saldo a favor" : "Gasto neto"}
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">
              {formatMoney(Math.abs(total))}
            </p>
            {filteredCreditCount > 0 && (
              <p className="mt-1 text-xs font-semibold text-sky-800">
                Incluye {filteredCreditCount} abono
                {filteredCreditCount === 1 ? "" : "s"} descontado
                {filteredCreditCount === 1 ? "" : "s"} del gasto.
              </p>
            )}
            {filteredExpenses.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={blockedVatExpenseCount > 0}
                title={
                  blockedVatExpenseCount > 0
                    ? "Revisa los gastos con desglose de IVA pendiente antes de exportar"
                    : "Exportar los gastos filtrados en CSV"
                }
                className="mt-2 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-amber-200 disabled:bg-amber-50 disabled:text-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </button>
            )}
            {blockedVatExpenseCount > 0 && (
              <p className="mt-1 text-xs font-semibold text-amber-800">
                Revisa {blockedVatExpenseCount} gasto
                {blockedVatExpenseCount === 1 ? "" : "s"} con desglose de IVA
                pendiente para exportar.
              </p>
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

      {(purchaseChartSlices.length > 0 ||
        fixedChartSlices.length > 0 ||
        periodCreditCount > 0) && (
        <Card className="mb-4 p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">Gastos por tipo</h2>
              <p className="text-sm text-slate-500">
                Pulsa un segmento o la leyenda para filtrar. Usa restablecer
                para volver al listado completo.
              </p>
              {periodCreditCount > 0 && (
                <p className="mt-1 text-xs font-semibold text-sky-800">
                  El donut solo representa saldos netos positivos. Los abonos y
                  saldos a favor siguen incluidos en el total y en el listado.
                </p>
              )}
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
            {purchaseChartSlices.length === 0 &&
              fixedChartSlices.length === 0 && (
                <p className="text-sm font-semibold text-slate-500 lg:col-span-2">
                  No hay saldos netos positivos que representar en el gráfico.
                </p>
              )}
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
            const expenseVat = resolveExpenseVat(expense, vatExempt);
            const signedExpenseTotal = expenseAmount(expense, vatExempt);
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
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 font-bold ${
                          expenseVat.blocked
                            ? "bg-amber-50 text-amber-800"
                            : expenseVat.source === "lines"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {expenseVatSourceLabel(expenseVat, vatExempt, expense)}
                      </span>
                      <span className="min-w-0 truncate">
                        {formatShortDate(expense.date)} · {expense.category} ·{" "}
                        {expense.paymentMethod}
                      </span>
                    </div>
                    {(expense.purchaseDocument?.invoiceNumber ||
                      expense.purchaseLines?.length ||
                      expense.workDocumentId ||
                      !isExpenseFiscalDeductible(expense) ||
                      signedExpenseTotal < 0) && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        {signedExpenseTotal < 0 && (
                          <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-800 ring-1 ring-sky-200">
                            Abono · saldo a favor
                          </span>
                        )}
                        {expense.purchaseDocument?.invoiceNumber && (
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            Fra. {expense.purchaseDocument.invoiceNumber}
                          </span>
                        )}
                        {isProviderSummaryPendingOriginal(expense) && (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">
                            Falta original
                          </span>
                        )}
                        {expense.purchaseLines?.length ? (
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                            {expense.purchaseLines.length} línea(s)
                          </span>
                        ) : null}
                        {!isExpenseFiscalDeductible(expense) && (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">
                            No desgravable
                          </span>
                        )}
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
                      vatExempt={vatExempt}
                      emptyLabel={
                        isProviderSummaryPendingOriginal(expense)
                          ? "Falta escanear la factura original"
                          : undefined
                      }
                      emptyClassName="md:text-center"
                    />
                  </Link>
                  <div className="flex items-center justify-end gap-2">
                    <span
                      className={`font-bold ${
                        signedExpenseTotal < 0
                          ? "text-sky-800"
                          : "text-red-700"
                      }`}
                    >
                      {formatMoney(signedExpenseTotal)}
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
                        const hasRecurringTemplate = Boolean(
                          expense.recurringExpenseId &&
                            recurringExpenseIds.has(expense.recurringExpenseId),
                        );
                        const prompt =
                          expense.recurringOccurrenceKey && hasRecurringTemplate
                            ? "¿Excluir este cargo concreto? La regla de gasto fijo seguirá activa y los demás cargos no cambiarán."
                            : "¿Borrar este gasto?";
                        if (confirm(prompt)) {
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
