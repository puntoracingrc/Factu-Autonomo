import { documentTotals } from "@/lib/calculations";
import { isFixedExpense } from "@/lib/expense-classification";
import { documentStatusLabel } from "@/lib/invoice-status-actions";
import type { RentabilidadRealFixedCostAllocationMethod } from "./calculation";
import type { Document, Expense } from "@/lib/types";

export interface RentabilidadRealWorkDocumentOption {
  id: string;
  type: Document["type"];
  typeLabel: string;
  number: string;
  customerName: string;
  date: string;
  statusLabel: string;
  subtotal: number;
  total: number;
  linkedDocumentLabel?: string;
  linkedExpensesCount: number;
}

export interface BuildRentabilidadRealWorkDocumentOptionsInput {
  documents: Document[];
  allDocuments: Document[];
  expenses: Expense[];
}

export interface RentabilidadRealFixedCostDisplay {
  totalLabel: string;
  totalAmount: number;
  appliedLabel: string;
  appliedAmount: number;
  helperText?: string;
  showSelectionControls: boolean;
}

const DOCUMENT_TYPE_LABELS: Record<"factura" | "presupuesto", string> = {
  factura: "Factura",
  presupuesto: "Presupuesto",
};

function linkedDocumentLabel(
  document: Document,
  allDocuments: Document[],
): string | undefined {
  if (document.type === "presupuesto") {
    const invoice = allDocuments.find(
      (item) =>
        item.type === "factura" && item.sourceQuoteDocumentId === document.id,
    );
    return invoice ? `Factura vinculada ${invoice.number}` : undefined;
  }

  if (document.type === "factura") {
    const quote = document.sourceQuoteDocumentId
      ? allDocuments.find(
          (item) =>
            item.type === "presupuesto" &&
            item.id === document.sourceQuoteDocumentId,
        )
      : undefined;
    if (quote) return `Presupuesto origen ${quote.number}`;
    if (document.sourceQuoteNumber) {
      return `Presupuesto origen ${document.sourceQuoteNumber}`;
    }
  }

  return undefined;
}

function relatedDocumentIds(document: Document, allDocuments: Document[]) {
  const ids = new Set<string>([document.id]);
  if (document.type === "presupuesto") {
    for (const invoice of allDocuments) {
      if (
        invoice.type === "factura" &&
        invoice.sourceQuoteDocumentId === document.id
      ) {
        ids.add(invoice.id);
      }
    }
  }
  if (document.type === "factura" && document.sourceQuoteDocumentId) {
    ids.add(document.sourceQuoteDocumentId);
  }
  return ids;
}

function linkedExpensesCount(
  document: Document,
  allDocuments: Document[],
  expenses: Expense[],
) {
  const ids = relatedDocumentIds(document, allDocuments);
  return expenses.filter(
    (expense) =>
      Boolean(expense.workDocumentId) &&
      ids.has(expense.workDocumentId!) &&
      !isFixedExpense(expense),
  ).length;
}

export function buildRentabilidadRealWorkDocumentOptions({
  documents,
  allDocuments,
  expenses,
}: BuildRentabilidadRealWorkDocumentOptionsInput): RentabilidadRealWorkDocumentOption[] {
  return documents
    .map((document) => {
      const totals = documentTotals(document);
      return {
        id: document.id,
        type: document.type,
        typeLabel:
          document.type === "factura" || document.type === "presupuesto"
            ? DOCUMENT_TYPE_LABELS[document.type]
            : document.type,
        number: document.number,
        customerName: document.client.name,
        date: document.date,
        statusLabel: documentStatusLabel(document),
        subtotal: totals.subtotal,
        total: totals.total,
        linkedDocumentLabel: linkedDocumentLabel(document, allDocuments),
        linkedExpensesCount: linkedExpensesCount(
          document,
          allDocuments,
          expenses,
        ),
      };
    })
    .sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.number.localeCompare(a.number, "es");
    });
}

export function filterRentabilidadRealWorkDocumentOptions(
  options: RentabilidadRealWorkDocumentOption[],
  query: string,
): RentabilidadRealWorkDocumentOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return options;

  return options.filter((option) =>
    [
      option.number,
      option.customerName,
      option.typeLabel,
      option.statusLabel,
      option.linkedDocumentLabel ?? "",
      String(option.subtotal),
      String(option.total),
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

export function buildRentabilidadRealFixedCostDisplay({
  method,
  selectedTotal,
  allocatedFixedCosts,
}: {
  method: RentabilidadRealFixedCostAllocationMethod;
  selectedTotal: number;
  allocatedFixedCosts: number;
}): RentabilidadRealFixedCostDisplay {
  if (method === "none") {
    return {
      totalLabel: "Gastos fijos detectados",
      totalAmount: selectedTotal,
      appliedLabel: "Aplicado a este cálculo",
      appliedAmount: 0,
      helperText:
        "Estos gastos no se aplicarán hasta que elijas una regla de reparto.",
      showSelectionControls: false,
    };
  }

  return {
    totalLabel: "Gastos fijos seleccionados",
    totalAmount: selectedTotal,
    appliedLabel: "Aplicado a este cálculo",
    appliedAmount: allocatedFixedCosts,
    showSelectionControls: true,
  };
}
