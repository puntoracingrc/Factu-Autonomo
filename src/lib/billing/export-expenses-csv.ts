import { formatShortDate } from "../calculations";
import { expenseIvaAmount } from "../taxes";
import { isVatExempt } from "../vat-regime";
import type { BusinessProfile, Expense, Supplier } from "../types";
import {
  csvRow,
  formatCsvAmount,
  formatCsvExportDate,
  downloadCsvFile,
} from "./csv-utils";

export interface ExpensesCsvMeta {
  profile: BusinessProfile;
  periodLabel: string;
  supplierFilterLabel?: string;
}

const EXPENSE_HEADERS = [
  "Fecha",
  "Proveedor",
  "NIF/CIF proveedor",
  "Concepto",
  "Base imponible (EUR)",
  "IVA (%)",
  "Cuota IVA (EUR)",
  "Total (EUR)",
  "Categoría",
  "Forma de pago",
  "Notas",
] as const;

function supplierNifById(suppliers: Supplier[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const supplier of suppliers) {
    if (supplier.nif?.trim()) {
      map.set(supplier.id, supplier.nif.trim());
    }
  }
  return map;
}

function resolveSupplierNif(
  expense: Expense,
  nifs: Map<string, string>,
): string {
  const historicalNif = expense.purchaseDocument?.supplierNif?.trim();
  if (historicalNif) return historicalNif;
  if (expense.supplierId && nifs.has(expense.supplierId)) {
    return nifs.get(expense.supplierId)!;
  }
  return "";
}

function sortExpensesByDate(expenses: Expense[]): Expense[] {
  return [...expenses].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

function buildProfileHeaderRows(
  title: string,
  profile: BusinessProfile,
  periodLabel: string,
  extraRows: (string | number)[][] = [],
): string[] {
  const rows: string[] = [
    csvRow([title]),
    csvRow([
      "Generado por Factu Autónomo",
      "https://facturacion-autonomos.app",
    ]),
    "",
    csvRow(["Empresa", profile.name || "—"]),
    csvRow(["NIF/CIF", profile.nif || "—"]),
    csvRow(["Periodo", periodLabel]),
    csvRow(["Fecha de exportación", formatCsvExportDate()]),
    ...extraRows.map((row) => csvRow(row)),
    csvRow([
      "Nota",
      "Importes en EUR. Separador ; y decimales con coma (compatible con Excel en español).",
    ]),
    "",
  ];
  return rows;
}

function buildCategorySummaryRows(
  expenses: Expense[],
  vatExempt: boolean,
): string[] {
  const byCategory = new Map<
    string,
    { count: number; base: number; iva: number; total: number }
  >();

  for (const expense of expenses) {
    const iva = vatExempt ? 0 : expenseIvaAmount(expense);
    const total = expense.amount + iva;
    const current = byCategory.get(expense.category) ?? {
      count: 0,
      base: 0,
      iva: 0,
      total: 0,
    };
    current.count += 1;
    current.base += expense.amount;
    current.iva += iva;
    current.total += total;
    byCategory.set(expense.category, current);
  }

  const sorted = [...byCategory.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "es"),
  );

  const lines: string[] = [
    "",
    csvRow(["RESUMEN POR CATEGORÍA"]),
    csvRow([
      "Categoría",
      "Nº gastos",
      "Base imponible (EUR)",
      "Cuota IVA (EUR)",
      "Total (EUR)",
    ]),
  ];

  for (const [category, totals] of sorted) {
    lines.push(
      csvRow([
        category,
        totals.count,
        formatCsvAmount(totals.base),
        formatCsvAmount(totals.iva),
        formatCsvAmount(totals.total),
      ]),
    );
  }

  return lines;
}

export function buildExpensesTableSection(
  expenses: Expense[],
  suppliers: Supplier[],
  profile: BusinessProfile,
  options?: { sectionTitle?: string },
): string[] {
  const vatExempt = isVatExempt(profile);
  const nifs = supplierNifById(suppliers);
  const sorted = sortExpensesByDate(expenses);

  let totalBase = 0;
  let totalIva = 0;
  let totalAmount = 0;

  const lines: string[] = [];

  if (options?.sectionTitle) {
    lines.push(csvRow([options.sectionTitle]));
    lines.push("");
  }

  lines.push(csvRow([...EXPENSE_HEADERS]));

  for (const expense of sorted) {
    const iva = vatExempt ? 0 : expenseIvaAmount(expense);
    const total = expense.amount + iva;
    totalBase += expense.amount;
    totalIva += iva;
    totalAmount += total;

    lines.push(
      csvRow([
        formatShortDate(expense.date),
        expense.supplierName,
        resolveSupplierNif(expense, nifs),
        expense.description,
        formatCsvAmount(expense.amount),
        expense.ivaPercent,
        formatCsvAmount(iva),
        formatCsvAmount(total),
        expense.category,
        expense.paymentMethod,
        expense.notes ?? "",
      ]),
    );
  }

  lines.push(
    csvRow([
      "TOTAL GASTOS",
      "",
      "",
      `${sorted.length} registro${sorted.length === 1 ? "" : "s"}`,
      formatCsvAmount(totalBase),
      "",
      formatCsvAmount(totalIva),
      formatCsvAmount(totalAmount),
      "",
      "",
      "",
    ]),
  );

  lines.push(...buildCategorySummaryRows(sorted, vatExempt));

  return lines;
}

export function buildExpensesExportCsv(
  expenses: Expense[],
  suppliers: Supplier[],
  meta: ExpensesCsvMeta,
): string {
  const extraRows: (string | number)[][] = [
    ["Número de registros", expenses.length],
  ];
  if (meta.supplierFilterLabel) {
    extraRows.push(["Filtro proveedor", meta.supplierFilterLabel]);
  }

  const lines = [
    ...buildProfileHeaderRows(
      "LIBRO DE GASTOS Y COMPRAS",
      meta.profile,
      meta.periodLabel,
      extraRows,
    ),
    ...buildExpensesTableSection(expenses, suppliers, meta.profile),
  ];

  return `${lines.join("\n")}\n`;
}

export function downloadExpensesCsv(
  csv: string,
  filenameStem: string,
): void {
  downloadCsvFile(csv, `${filenameStem}.csv`);
}
