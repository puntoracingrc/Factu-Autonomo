import { describe, expect, it } from "vitest";
import { expenseTotals } from "./expenses";
import {
  createProviderSummaryExpense,
  isProviderSummaryCompleted,
  isProviderSummaryPendingOriginal,
  mergeProviderSummaryWithOriginal,
  parseProviderInvoiceSummaryText,
  planProviderSummaryExpenseImport,
} from "./provider-summary-expenses";
import type { Expense } from "./types";

const SUMMARY_TEXT = `
Listado de Facturas Emitidas
Fechas 01/04/2026 -> 30/06/2026
Metalúrgica Arandes SL
Factura
Fecha
Cliente
Vto.
Base Imp.
%Iva
IVA
R.E.
Total
%Rec
FD/222386
01/04/2026
IBAÑEZ DE OPACUA MUÑOZ, ALBERT
01/04/2026
12,54
21
2,63
15,17
FD/222483
08/04/2026
IBAÑEZ DE OPACUA MUÑOZ, ALBERT
08/04/2026
170,43
21
35,79
206,22
Total Documentos: 2 182,97 38,42 0,00 221,39 0,00
`;

const COMPACT_SUMMARY_TEXT = `
Listado de Facturas Emitidas
Metalúrgica Arandes SL
FacturaFechaClienteVto.Base Imp.%IvaIVAR.E.
Total
%Rec
FD/222386
01/04/2026
IBAÑEZ DE OPACUA MUÑOZ, ALBERT
01/04/2026 12,54 21 2,63 15,17
`;

function expenseFixture(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense_1",
    date: "2026-04-01",
    origin: "import",
    businessKind: "purchase_invoice",
    supplierName: "Metalúrgica Arandes SL",
    description: "Factura FD/222386 pendiente de original",
    amount: 12.54,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    purchaseDocument: {
      invoiceNumber: "FD/222386",
      issueDate: "2026-04-01",
    },
    providerSummary: {
      status: "pending_original",
      summaryId: "summary_1",
      importedAt: "2026-07-07T10:00:00.000Z",
      providerName: "Metalúrgica Arandes SL",
    },
    workDocumentId: "work_1",
    createdAt: "2026-07-07T10:00:00.000Z",
    ...overrides,
  };
}

describe("provider summary expenses", () => {
  it("extrae facturas de un resumen de proveedor", () => {
    const parsed = parseProviderInvoiceSummaryText(SUMMARY_TEXT);

    expect(parsed.providerName).toBe("Metalúrgica Arandes SL");
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      invoiceNumber: "FD/222386",
      date: "2026-04-01",
      dueDate: "2026-04-01",
      customerName: "IBAÑEZ DE OPACUA MUÑOZ, ALBERT",
      base: 12.54,
      ivaPercent: 21,
      ivaAmount: 2.63,
      total: 15.17,
    });
  });

  it("extrae facturas aunque fecha de vencimiento e importes vengan en la misma línea", () => {
    const parsed = parseProviderInvoiceSummaryText(COMPACT_SUMMARY_TEXT);

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      invoiceNumber: "FD/222386",
      dueDate: "2026-04-01",
      base: 12.54,
      ivaAmount: 2.63,
      total: 15.17,
    });
  });

  it("crea gastos provisionales que ya cuentan como gasto", () => {
    const row = parseProviderInvoiceSummaryText(SUMMARY_TEXT).rows[0];
    const expense = createProviderSummaryExpense(row, {
      providerName: "Metalúrgica Arandes SL",
      supplierId: "supplier-1",
      summaryId: "summary_1",
      fileName: "resumen.pdf",
      importedAt: "2026-07-07T10:00:00.000Z",
    });

    expect(isProviderSummaryPendingOriginal(expense)).toBe(true);
    expect(expense.supplierId).toBe("supplier-1");
    expect(expense.amount).toBe(12.54);
    expect(expense.providerSummary?.summaryInvoiceTotal).toBe(15.17);
    expect(expenseTotals(expense)).toEqual({
      base: 12.54,
      iva: 2.63,
      total: 15.17,
      ivaPercent: 21,
    });
  });

  it("importa solo las facturas que no estaban registradas", () => {
    const parsed = parseProviderInvoiceSummaryText(SUMMARY_TEXT);
    const existing = expenseFixture();

    const plan = planProviderSummaryExpenseImport([existing], parsed.rows, {
      providerName: parsed.providerName,
      summaryId: "summary_2",
      importedAt: "2026-07-07T11:00:00.000Z",
    });

    expect(plan.expenses).toHaveLength(1);
    expect(plan.skippedExisting).toBe(1);
    expect(plan.expenses[0].purchaseDocument?.invoiceNumber).toBe("FD/222483");
  });

  it("enlaza las facturas del resumen con el proveedor existente", () => {
    const parsed = parseProviderInvoiceSummaryText(SUMMARY_TEXT);

    const plan = planProviderSummaryExpenseImport([], parsed.rows, {
      providerName: "METALURGICA ARANDES S.L.",
      supplierId: "supplier-arandes",
      summaryId: "summary_3",
      importedAt: "2026-07-07T12:00:00.000Z",
    });

    expect(plan.expenses).toHaveLength(2);
    expect(plan.expenses[0].supplierId).toBe("supplier-arandes");
    expect(plan.expenses[0].supplierName).toBe("METALURGICA ARANDES S.L.");
    expect(plan.expenses[0].providerSummary?.providerName).toBe(
      "METALURGICA ARANDES S.L.",
    );
  });

  it("completa el gasto provisional con la factura original sin perder el enlace al trabajo", () => {
    const summary = expenseFixture();
    const original: Omit<Expense, "id" | "createdAt"> = {
      date: "2026-04-01",
      origin: "scan",
      businessKind: "purchase_invoice",
      supplierName: "Metalúrgica Arandes SL",
      description: "Compra de materiales",
      amount: 12.54,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      purchaseDocument: {
        invoiceNumber: "FD/222386",
        issueDate: "2026-04-01",
      },
      purchaseLines: [
        {
          id: "line_1",
          description: "Guía aluminio",
          quantity: 1,
          unit: "ud",
          unitPrice: 12.54,
          ivaPercent: 21,
        },
      ],
    };

    const merged = mergeProviderSummaryWithOriginal(
      summary,
      original,
      "2026-07-07T12:00:00.000Z",
    );

    expect(merged.id).toBe(summary.id);
    expect(merged.workDocumentId).toBe("work_1");
    expect(merged.origin).toBe("scan");
    expect(merged.purchaseLines).toHaveLength(1);
    expect(isProviderSummaryCompleted(merged)).toBe(true);
    expect(merged.providerSummary?.completedAt).toBe(
      "2026-07-07T12:00:00.000Z",
    );
  });
});
