import { isDocumentUsableForFinancialCalculations } from "@/lib/document-integrity/legacy-import-attestation";
import { isFixedExpense } from "@/lib/expense-classification";
import { expenseAllocatedAmountForWorkIds } from "@/lib/expense-work-allocations";
import { expenseFiscalAmounts } from "@/lib/expenses";
import { documentStatusLabel } from "@/lib/invoice-status-actions";
import { rentabilidadRealDocumentClientName } from "@/lib/rentabilidad-real/document-client";
import {
  isSupersededRentabilidadRealDocument,
  rectificationChainDocumentIds,
  sourceQuoteDocumentIdForRentabilidadInvoice,
} from "@/lib/rentabilidad-real/document-chain";
import type { RentabilidadRealFixedCostAllocationMethod } from "./calculation";
import type { Document, Expense } from "@/lib/types";
import { documentAmounts } from "@/lib/vat-regime";

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
        item.type === "factura" &&
        !isSupersededRentabilidadRealDocument(item) &&
        sourceQuoteDocumentIdForRentabilidadInvoice(item, allDocuments) ===
          document.id,
    );
    return invoice ? `Factura vinculada ${invoice.number}` : undefined;
  }

  if (document.type === "factura") {
    const sourceQuoteDocumentId = sourceQuoteDocumentIdForRentabilidadInvoice(
      document,
      allDocuments,
    );
    const quote = sourceQuoteDocumentId
      ? allDocuments.find(
          (item) =>
            item.type === "presupuesto" &&
            item.id === sourceQuoteDocumentId,
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
  const ids = new Set<string>(
    rectificationChainDocumentIds(document, allDocuments),
  );
  if (document.type === "presupuesto") {
    for (const invoice of allDocuments) {
      if (
        invoice.type === "factura" &&
        !isSupersededRentabilidadRealDocument(invoice) &&
        sourceQuoteDocumentIdForRentabilidadInvoice(invoice, allDocuments) ===
          document.id
      ) {
        for (const id of rectificationChainDocumentIds(invoice, allDocuments)) {
          ids.add(id);
        }
      }
    }
  }
  if (document.type === "factura") {
    const sourceQuoteDocumentId = sourceQuoteDocumentIdForRentabilidadInvoice(
      document,
      allDocuments,
    );
    if (sourceQuoteDocumentId) ids.add(sourceQuoteDocumentId);
  }
  return ids;
}

function linkedExpensesCount(
  document: Document,
  allDocuments: Document[],
  expenses: Expense[],
) {
  const ids = relatedDocumentIds(document, allDocuments);
  return expenses.filter((expense) => {
    if (isFixedExpense(expense)) return false;
    const fiscal = expenseFiscalAmounts(expense);
    return (
      expenseAllocatedAmountForWorkIds(
        expense,
        ids,
        fiscal.operatingCost,
      ) !== 0
    );
  }).length;
}

export function buildRentabilidadRealWorkDocumentOptions({
  documents,
  allDocuments,
  expenses,
}: BuildRentabilidadRealWorkDocumentOptionsInput): RentabilidadRealWorkDocumentOption[] {
  return documents
    .filter(
      (document) =>
        !isSupersededRentabilidadRealDocument(document) &&
        isDocumentUsableForFinancialCalculations(document),
    )
    .map((document) => {
      const totals = documentAmounts(document, false);
      return {
        id: document.id,
        type: document.type,
        typeLabel:
          document.type === "factura" || document.type === "presupuesto"
            ? DOCUMENT_TYPE_LABELS[document.type]
            : document.type,
        number: document.number,
        customerName: rentabilidadRealDocumentClientName(document),
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
