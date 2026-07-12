import { roundMoneySymmetric } from "./calculations";
import { findDuplicatePurchaseExpense } from "./expenses";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type Expense,
} from "./types";

export interface ProviderInvoiceSummaryRow {
  invoiceNumber: string;
  date: string;
  customerName?: string;
  dueDate?: string;
  base: number;
  ivaPercent: number;
  ivaAmount: number;
  recargoPercent?: number;
  recargoAmount?: number;
  total: number;
}

export interface ParsedProviderInvoiceSummary {
  providerName?: string;
  rows: ProviderInvoiceSummaryRow[];
  warnings: string[];
}

export interface ProviderSummaryExpenseOptions {
  providerName?: string;
  supplierId?: string;
  summaryId: string;
  fileName?: string;
  importedAt?: string;
}

export interface ProviderSummaryExpenseImportPlan {
  expenses: Array<Omit<Expense, "id" | "createdAt">>;
  skippedExisting: number;
  skippedCompleted: number;
}

const DEFAULT_SUMMARY_CATEGORY = EXPENSE_CATEGORIES.includes("Material")
  ? "Material"
  : EXPENSE_CATEGORIES[0];

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseSpanishDate(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${month}-${day}`;
}

function isDateCell(value: string): boolean {
  return parseSpanishDate(value) !== null;
}

function parseEuropeanNumber(value: string): number | null {
  const cleaned = value.trim();
  if (!/^-?\d+(?:[.,]\d+)*(?:,\d+)?$/.test(cleaned)) return null;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function isNumericCell(value: string): boolean {
  return parseEuropeanNumber(value) !== null;
}

function isHeaderCell(value: string): boolean {
  return /^(listado|orden|fechas|vto\.?|cliente|factura|fecha|base|base imp\.?|%iva|iva|%rec|r\.e\.|total|p[aá]gina)(?:\b|$)/i.test(
    value.trim(),
  );
}

function isPossibleInvoiceToken(
  current: string | undefined,
  next: string | undefined,
): boolean {
  if (!current || !next) return false;
  const value = normalizeText(current);
  if (!value || isHeaderCell(value) || isDateCell(value) || isNumericCell(value)) {
    return false;
  }
  if (!/\d/.test(value)) return false;
  if (!isDateCell(next)) return false;
  return /^[A-Z0-9][A-Z0-9./ -]*$/i.test(value);
}

function linesFromText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(normalizeText)
    .filter(Boolean)
    .flatMap((line) => {
      const compactTail = line.match(
        /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+)$/,
      );
      if (!compactTail) return [line];
      const tailTokens = compactTail[2].split(/\s+/).filter(Boolean);
      if (!tailTokens.some((token) => parseEuropeanNumber(token) !== null)) {
        return [line];
      }
      return [compactTail[1], ...tailTokens];
    });
}

function detectProviderName(lines: string[], firstInvoiceIndex: number): string | undefined {
  return lines
    .slice(0, Math.max(firstInvoiceIndex, 0))
    .reverse()
    .find((line) => {
      if (isHeaderCell(line) || isDateCell(line) || isNumericCell(line)) {
        return false;
      }
      if (/^cliente\s+\d+/i.test(line)) return false;
      return /[a-záéíóúñ]/i.test(line);
    });
}

function parseNumericTail(numbers: number[]): Omit<
  ProviderInvoiceSummaryRow,
  "invoiceNumber" | "date" | "customerName" | "dueDate"
> | null {
  if (numbers.length < 4) return null;

  const base = roundMoneySymmetric(numbers[0]);
  const ivaPercent = numbers[1];
  const ivaAmount = roundMoneySymmetric(numbers[2]);
  const noRecargoTotal = roundMoneySymmetric(numbers[3]);
  const noRecargoExpectedTotal = roundMoneySymmetric(base + ivaAmount);
  if (Math.abs(noRecargoExpectedTotal - noRecargoTotal) <= 0.05) {
    return {
      base,
      ivaPercent,
      ivaAmount,
      total: noRecargoTotal,
    };
  }

  if (numbers.length >= 6) {
    const candidates = [
      {
        recargoPercent: numbers[3],
        recargoAmount: roundMoneySymmetric(numbers[4]),
        total: roundMoneySymmetric(numbers[5]),
      },
      {
        recargoPercent: numbers[5],
        recargoAmount: roundMoneySymmetric(numbers[3]),
        total: roundMoneySymmetric(numbers[4]),
      },
    ];
    const candidate = candidates.find((item) => {
      if (
        !Number.isFinite(item.recargoPercent) ||
        item.recargoPercent <= 0 ||
        item.recargoPercent > 100
      ) {
        return false;
      }
      const expectedRecargo = roundMoneySymmetric(
        base * (item.recargoPercent / 100),
      );
      const expectedTotal = roundMoneySymmetric(
        base + ivaAmount + item.recargoAmount,
      );
      return (
        Math.abs(expectedRecargo - item.recargoAmount) <= 0.05 &&
        Math.abs(expectedTotal - item.total) <= 0.05
      );
    });
    if (candidate) {
      return { base, ivaPercent, ivaAmount, ...candidate };
    }
  }

  return null;
}

export function parseProviderInvoiceSummaryText(
  text: string,
): ParsedProviderInvoiceSummary {
  const lines = linesFromText(text);
  const warnings: string[] = [];
  const rows: ProviderInvoiceSummaryRow[] = [];
  const firstInvoiceIndex = lines.findIndex((line, index) =>
    isPossibleInvoiceToken(line, lines[index + 1]),
  );
  const providerName =
    firstInvoiceIndex >= 0 ? detectProviderName(lines, firstInvoiceIndex) : undefined;

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!isPossibleInvoiceToken(lines[index], lines[index + 1])) continue;

    const invoiceNumber = lines[index].replace(/\s+/g, "");
    const date = parseSpanishDate(lines[index + 1]);
    if (!date) continue;

    let dueDateIndex = -1;
    for (
      let candidateIndex = index + 2;
      candidateIndex < Math.min(index + 10, lines.length);
      candidateIndex += 1
    ) {
      if (isDateCell(lines[candidateIndex])) {
        dueDateIndex = candidateIndex;
        break;
      }
    }
    if (dueDateIndex < 0) continue;

    const customerName = normalizeText(lines.slice(index + 2, dueDateIndex).join(" "));
    const dueDate = parseSpanishDate(lines[dueDateIndex]) ?? undefined;
    const numbers: number[] = [];
    let cursor = dueDateIndex + 1;
    while (cursor < lines.length) {
      if (isPossibleInvoiceToken(lines[cursor], lines[cursor + 1])) break;
      if (/^total\s+documentos/i.test(lines[cursor])) break;
      const number = parseEuropeanNumber(lines[cursor]);
      if (number !== null) {
        numbers.push(number);
      }
      cursor += 1;
    }

    const numericTail = parseNumericTail(numbers);
    if (!numericTail) {
      warnings.push(`No se pudo interpretar la factura ${invoiceNumber}.`);
      continue;
    }

    const expectedTotal = roundMoneySymmetric(
      numericTail.base +
        numericTail.ivaAmount +
        (numericTail.recargoAmount ?? 0),
    );
    if (Math.abs(expectedTotal - numericTail.total) > 0.05) {
      warnings.push(
        `La factura ${invoiceNumber} no cuadra exactamente con base + impuestos.`,
      );
    }

    rows.push({
      invoiceNumber,
      date,
      customerName: customerName || undefined,
      dueDate,
      ...numericTail,
    });
    index = Math.max(index, cursor - 1);
  }

  if (rows.length === 0) {
    warnings.push("No se han encontrado filas de facturas en el resumen.");
  }

  return { providerName, rows, warnings };
}

export function isProviderSummaryPendingOriginal(expense: Pick<Expense, "providerSummary">): boolean {
  return expense.providerSummary?.status === "pending_original";
}

export function isProviderSummaryCompleted(expense: Pick<Expense, "providerSummary">): boolean {
  return expense.providerSummary?.status === "completed_with_original";
}

export function createProviderSummaryExpense(
  row: ProviderInvoiceSummaryRow,
  options: ProviderSummaryExpenseOptions,
): Omit<Expense, "id" | "createdAt"> {
  const providerName = options.providerName?.trim() || "Proveedor del resumen";
  const importedAt = options.importedAt ?? new Date().toISOString();

  return {
    date: row.date,
    origin: "import",
    businessKind: "purchase_invoice",
    supplierId: options.supplierId,
    supplierName: providerName,
    description: `Factura ${row.invoiceNumber} pendiente de original`,
    amount: row.base,
    ivaPercent: row.ivaPercent,
    category: DEFAULT_SUMMARY_CATEGORY,
    paymentMethod: PAYMENT_METHODS[0],
    notes:
      "Registrada desde resumen de proveedor. Falta escanear la factura original para ver líneas y detalle.",
    purchaseDocument: {
      invoiceNumber: row.invoiceNumber,
      issueDate: row.date,
      dueDate: row.dueDate,
    },
    providerSummary: {
      status: "pending_original",
      summaryId: options.summaryId,
      fileName: options.fileName,
      importedAt,
      providerName,
      summaryInvoiceTotal: row.total,
      summaryIvaPercent: row.ivaPercent,
      summaryIvaAmount: row.ivaAmount,
      summaryRecargoPercent: row.recargoPercent,
      summaryRecargoAmount: row.recargoAmount,
    },
  };
}

export function mergeProviderSummaryWithOriginal(
  summaryExpense: Expense,
  originalExpense: Omit<Expense, "id" | "createdAt">,
  completedAt = new Date().toISOString(),
): Expense {
  return {
    ...summaryExpense,
    ...originalExpense,
    id: summaryExpense.id,
    createdAt: summaryExpense.createdAt,
    workDocumentId: originalExpense.workDocumentId ?? summaryExpense.workDocumentId,
    providerSummary: {
      ...summaryExpense.providerSummary,
      status: "completed_with_original",
      summaryId:
        summaryExpense.providerSummary?.summaryId ??
        `summary-${summaryExpense.id}`,
      importedAt:
        summaryExpense.providerSummary?.importedAt ?? summaryExpense.createdAt,
      completedAt,
    },
  };
}

export function planProviderSummaryExpenseImport(
  existingExpenses: Expense[],
  rows: ProviderInvoiceSummaryRow[],
  options: ProviderSummaryExpenseOptions,
): ProviderSummaryExpenseImportPlan {
  const expenses: Array<Omit<Expense, "id" | "createdAt">> = [];
  const plannedAsExisting: Expense[] = [];
  let skippedExisting = 0;
  let skippedCompleted = 0;

  for (const row of rows) {
    const expense = createProviderSummaryExpense(row, options);
    const duplicate = findDuplicatePurchaseExpense(
      [...existingExpenses, ...plannedAsExisting],
      {
        invoiceNumber: expense.purchaseDocument?.invoiceNumber,
        supplierName: expense.supplierName,
        amount: expense.amount,
      },
    );

    if (duplicate) {
      if (isProviderSummaryPendingOriginal(duplicate)) {
        skippedExisting += 1;
      } else {
        skippedCompleted += 1;
      }
      continue;
    }

    expenses.push(expense);
    plannedAsExisting.push({
      ...expense,
      id: `planned-${plannedAsExisting.length}`,
      createdAt: options.importedAt ?? new Date().toISOString(),
    });
  }

  return { expenses, skippedExisting, skippedCompleted };
}
