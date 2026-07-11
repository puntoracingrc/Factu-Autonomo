import { formatShortDate } from "../calculations";
import {
  expenseFiscalAmounts,
  isExpenseMixedVatBlocked,
  resolveExpenseVat,
  type ExpenseVatResolution,
} from "../expenses";
import { isVatExempt } from "../vat-regime";
import type { BusinessProfile, Expense, Supplier } from "../types";
import { TaxExportBlockedError } from "../taxes";
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
  "Tratamiento fiscal",
  "Importe registrado (EUR)",
  "Tipos IVA aplicados",
  "Desglose IVA aplicado",
  "Origen cálculo IVA",
  "Cuota IVA informada (EUR)",
  "Recargo equivalencia (%)",
  "Recargo equivalencia (EUR)",
  "Coste registrado (EUR)",
  "Gasto deducible IRPF (EUR)",
  "Base deducible IVA (EUR)",
  "IVA deducible (EUR)",
  "Categoría",
  "Forma de pago",
  "Notas",
] as const;

function expenseTreatmentLabel(
  deductible: boolean,
  registeredTotal: number,
): string {
  const fiscalLabel = deductible ? "Deducible" : "No deducible";
  return registeredTotal < 0
    ? `Abono / saldo a favor · ${fiscalLabel}`
    : fiscalLabel;
}

function formatVatPercent(value: number): string {
  return `${new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function vatTypesLabel(resolution: ExpenseVatResolution): string {
  const rates = resolution.breakdown
    .map((row) => row.ivaPercent)
    .sort((left, right) => left - right);
  return rates.length > 0
    ? rates.map(formatVatPercent).join(" + ")
    : formatVatPercent(resolution.headerIvaPercent);
}

function vatBreakdownLabel(resolution: ExpenseVatResolution): string {
  if (resolution.breakdown.length === 0) return "—";
  return [...resolution.breakdown]
    .sort((left, right) => left.ivaPercent - right.ivaPercent)
    .map(
      (row) =>
        `${formatVatPercent(row.ivaPercent)}: base ${formatCsvAmount(row.base)} / IVA ${formatCsvAmount(row.iva)}`,
    )
    .join(" | ");
}

function vatSourceLabel(
  resolution: ExpenseVatResolution,
  vatExempt: boolean,
): string {
  if (vatExempt) return "Perfil exento";
  if (resolution.source === "lines") return "Líneas conciliadas";
  if (resolution.issue === "provider_summary_tax_mismatch") {
    return "Resumen fiscal bloqueado";
  }
  if (resolution.source === "blocked") return "Evidencia fiscal bloqueada";
  return "Cabecera o importe íntegro";
}

export function assertExpensesVatExportable(
  expenses: Expense[],
  vatExempt: boolean,
): void {
  const unsupportedMixedVatExpenses = expenses.filter((expense) =>
    isExpenseMixedVatBlocked(expense, vatExempt),
  ).length;
  if (unsupportedMixedVatExpenses === 0) return;

  throw new TaxExportBlockedError({
    integrityBlockedDocuments: 0,
    unsupportedRectificationDocuments: 0,
    unsupportedMixedVatExpenses,
  });
}

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
    {
      count: number;
      registeredTotal: number;
      deductibleIrpfExpense: number;
      deductibleVatBase: number;
      deductibleIva: number;
    }
  >();

  for (const expense of expenses) {
    const fiscal = expenseFiscalAmounts(expense, vatExempt);
    const current = byCategory.get(expense.category) ?? {
      count: 0,
      registeredTotal: 0,
      deductibleIrpfExpense: 0,
      deductibleVatBase: 0,
      deductibleIva: 0,
    };
    current.count += 1;
    current.registeredTotal += fiscal.registeredTotal;
    current.deductibleIrpfExpense += fiscal.deductibleIrpfExpense;
    current.deductibleVatBase += fiscal.deductibleVatBase;
    current.deductibleIva += fiscal.deductibleIva;
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
      "Coste registrado (EUR)",
      "Gasto deducible IRPF (EUR)",
      "Base deducible IVA (EUR)",
      "IVA deducible (EUR)",
    ]),
  ];

  for (const [category, totals] of sorted) {
    lines.push(
      csvRow([
        category,
        totals.count,
        formatCsvAmount(totals.registeredTotal),
        formatCsvAmount(totals.deductibleIrpfExpense),
        formatCsvAmount(totals.deductibleVatBase),
        formatCsvAmount(totals.deductibleIva),
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
  assertExpensesVatExportable(expenses, vatExempt);
  const nifs = supplierNifById(suppliers);
  const sorted = sortExpensesByDate(expenses);

  let totalRegisteredBase = 0;
  let totalRegisteredIva = 0;
  let totalRegisteredEquivalenceSurcharge = 0;
  let totalRegisteredCost = 0;
  let totalDeductibleIrpfExpense = 0;
  let totalDeductibleVatBase = 0;
  let totalDeductibleIva = 0;

  const lines: string[] = [];

  if (options?.sectionTitle) {
    lines.push(csvRow([options.sectionTitle]));
    lines.push("");
  }

  lines.push(csvRow([...EXPENSE_HEADERS]));

  for (const expense of sorted) {
    const fiscal = expenseFiscalAmounts(expense, vatExempt);
    const vat = resolveExpenseVat(expense, vatExempt);
    totalRegisteredBase += fiscal.registeredBase;
    totalRegisteredIva += fiscal.registeredIva;
    totalRegisteredEquivalenceSurcharge +=
      fiscal.registeredEquivalenceSurcharge ?? 0;
    totalRegisteredCost += fiscal.registeredTotal;
    totalDeductibleIrpfExpense += fiscal.deductibleIrpfExpense;
    totalDeductibleVatBase += fiscal.deductibleVatBase;
    totalDeductibleIva += fiscal.deductibleIva;

    lines.push(
      csvRow([
        formatShortDate(expense.date),
        expense.supplierName,
        resolveSupplierNif(expense, nifs),
        expense.description,
        expenseTreatmentLabel(
          fiscal.deductible,
          fiscal.registeredTotal,
        ),
        formatCsvAmount(fiscal.registeredBase),
        vatTypesLabel(vat),
        vatBreakdownLabel(vat),
        vatSourceLabel(vat, vatExempt),
        formatCsvAmount(fiscal.registeredIva),
        fiscal.registeredEquivalenceSurchargePercent === undefined
          ? ""
          : formatVatPercent(
              fiscal.registeredEquivalenceSurchargePercent,
            ),
        formatCsvAmount(fiscal.registeredEquivalenceSurcharge ?? 0),
        formatCsvAmount(fiscal.registeredTotal),
        formatCsvAmount(fiscal.deductibleIrpfExpense),
        formatCsvAmount(fiscal.deductibleVatBase),
        formatCsvAmount(fiscal.deductibleIva),
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
      `${sorted.length} registro${sorted.length === 1 ? "" : "s"} · neto de abonos`,
      "",
      formatCsvAmount(totalRegisteredBase),
      "",
      "",
      "",
      formatCsvAmount(totalRegisteredIva),
      "",
      formatCsvAmount(totalRegisteredEquivalenceSurcharge),
      formatCsvAmount(totalRegisteredCost),
      formatCsvAmount(totalDeductibleIrpfExpense),
      formatCsvAmount(totalDeductibleVatBase),
      formatCsvAmount(totalDeductibleIva),
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
