import { documentTotals } from "../calculations";
import { isTaxableSaleDocument } from "../taxes";
import type { BusinessProfile, Document, Expense } from "../types";
import { expenseIvaAmount } from "../taxes";
import { isVatExempt } from "../vat-regime";
import { quarterLabel, type Quarter } from "../periods";
import { filterDocumentsByQuarter, filterExpensesByQuarter } from "../periods";
import { calculateTaxSummary } from "../taxes";

function csvEscape(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function row(values: (string | number)[]): string {
  return values.map(csvEscape).join(",");
}

export function buildQuarterlyExportCsv(
  documents: Document[],
  expenses: Expense[],
  profile: BusinessProfile,
  year: number,
  quarter: Quarter,
): string {
  const vatExempt = isVatExempt(profile);
  const quarterDocs = filterDocumentsByQuarter(documents, year, quarter);
  const quarterExpenses = filterExpensesByQuarter(expenses, year, quarter);
  const taxes = calculateTaxSummary(quarterDocs, quarterExpenses, {
    irpfPercent: profile.irpfPercent,
    vatExempt,
  });

  const lines: string[] = [
    row(["Factura Autónomo — export trimestral"]),
    row(["Periodo", quarterLabel(year, quarter)]),
    row(["Generado", new Date().toISOString().split("T")[0]]),
    "",
    row(["RESUMEN"]),
    row(["Base ventas", taxes.salesBase.toFixed(2)]),
    row(["IVA repercutido", taxes.salesIva.toFixed(2)]),
    row(["Base gastos", taxes.expenseBase.toFixed(2)]),
    row(["IVA deducible", taxes.expenseIva.toFixed(2)]),
    row(["IVA neto", taxes.netIva.toFixed(2)]),
    row(["Beneficio bruto", taxes.grossProfit.toFixed(2)]),
    row(["IRPF estimado", taxes.irpfEstimate.toFixed(2)]),
    "",
    row([
      "VENTAS",
      "Fecha",
      "Número",
      "Tipo",
      "Cliente",
      "Base",
      "IVA",
      "Total",
      "Estado",
    ]),
  ];

  for (const doc of quarterDocs.filter(isTaxableSaleDocument)) {
    const totals = documentTotals(doc);
    lines.push(
      row([
        "",
        doc.date,
        doc.number,
        doc.type,
        doc.client.name,
        totals.subtotal.toFixed(2),
        totals.iva.toFixed(2),
        totals.total.toFixed(2),
        doc.status,
      ]),
    );
  }

  lines.push("");
  lines.push(
    row([
      "GASTOS",
      "Fecha",
      "Proveedor",
      "Descripción",
      "Base",
      "IVA %",
      "IVA",
      "Total",
      "Categoría",
    ]),
  );

  for (const expense of quarterExpenses) {
    const iva = vatExempt ? 0 : expenseIvaAmount(expense);
    const total = expense.amount + iva;
    lines.push(
      row([
        "",
        expense.date,
        expense.supplierName,
        expense.description,
        expense.amount.toFixed(2),
        expense.ivaPercent,
        iva.toFixed(2),
        total.toFixed(2),
        expense.category,
      ]),
    );
  }

  return `${lines.join("\n")}\n`;
}

export function downloadQuarterlyCsv(
  csv: string,
  year: number,
  quarter: Quarter,
): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `factura-autonomo-T${quarter}-${year}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
