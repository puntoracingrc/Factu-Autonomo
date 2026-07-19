import {
  isExpenseFiscalDeductible,
  resolveExpenseVat,
  type ExpenseVatIssue,
} from "@/lib/expenses";
import type { BusinessProfile, Expense } from "@/lib/types";
import {
  normalizeComparableText,
  type ExpenseInput,
  type InvoiceType,
  type PaymentMethod,
} from "@/lib/tax-engine";
import { parseEuroInputToCents } from "./money-input";

export type ExistingExpenseAdaptation =
  | {
      status: "READY";
      sourceExpenseId: string;
      input: ExpenseInput;
      warnings: readonly string[];
    }
  | {
      status: "NEEDS_INPUT" | "NEEDS_REVIEW" | "UNSUPPORTED";
      sourceExpenseId: string;
      input: null;
      missingInformation: readonly string[];
      warnings: readonly string[];
      vatIssue?: ExpenseVatIssue;
    };

function paymentMethodFromExpense(value: string): PaymentMethod {
  const normalized = normalizeComparableText(value);
  if (normalized.includes("tarjeta")) return "CARD";
  if (normalized.includes("transferencia")) return "BANK_TRANSFER";
  if (normalized.includes("domiciliacion")) return "DIRECT_DEBIT";
  if (normalized.includes("efectivo")) return "CASH";
  return normalized ? "OTHER" : "UNKNOWN";
}

function invoiceTypeFromExpense(expense: Expense): InvoiceType {
  if (expense.businessKind === "quick_ticket") return "RECEIPT";
  // El modelo canónico conserva datos leídos del proveedor, pero no acredita
  // que un escaneo legacy sea un ticket ni que una factura identifique al
  // destinatario. Esa conclusión debe confirmarla el usuario.
  return "UNKNOWN";
}

function canonicalEurosToCents(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const parsed = parseEuroInputToCents(value.toFixed(2));
  return parsed.ok ? parsed.cents : null;
}

/**
 * Adapta la entidad Expense canónica sin persistir una segunda copia.
 * Las inconsistencias fiscales existentes se conservan como bloqueos y nunca
 * se transforman en importes cero aparentemente válidos.
 */
export function adaptExistingExpenseForEvaluation(
  expense: Expense,
  profile: Pick<BusinessProfile, "vatExempt">,
): ExistingExpenseAdaptation {
  if (expense.providerSummary?.status === "pending_original") {
    return {
      status: "NEEDS_REVIEW",
      sourceExpenseId: expense.id,
      input: null,
      missingInformation: [
        "El gasto procede de un resumen de proveedor y todavía falta el documento original.",
      ],
      warnings: ["No se han convertido los importes pendientes en ceros."],
    };
  }

  const vat = resolveExpenseVat(expense, profile.vatExempt ?? false);
  if (vat.blocked) {
    return {
      status: "NEEDS_REVIEW",
      sourceExpenseId: expense.id,
      input: null,
      missingInformation: [
        "El desglose de IVA del gasto está bloqueado por una inconsistencia documental.",
      ],
      warnings: ["Resuelve el bloqueo fiscal canónico antes de analizar."],
      ...(vat.issue ? { vatIssue: vat.issue } : {}),
    };
  }

  const netAmountCents = canonicalEurosToCents(vat.base);
  const vatAmountCents = canonicalEurosToCents(vat.iva);
  const totalAmountCents = canonicalEurosToCents(vat.total);
  if (
    netAmountCents === null ||
    vatAmountCents === null ||
    totalAmountCents === null
  ) {
    return {
      status: "UNSUPPORTED",
      sourceExpenseId: expense.id,
      input: null,
      missingInformation: [
        "La versión 1 no analiza abonos ni importes fuera de los límites monetarios del motor.",
      ],
      warnings: [],
    };
  }

  const concept = expense.description.trim() || expense.category.trim();
  if (!concept) {
    return {
      status: "NEEDS_INPUT",
      sourceExpenseId: expense.id,
      input: null,
      missingInformation: [
        "El gasto necesita un concepto antes de analizarlo.",
      ],
      warnings: [],
    };
  }

  return {
    status: "READY",
    sourceExpenseId: expense.id,
    input: {
      concept,
      ...(expense.supplierName.trim()
        ? { supplierName: expense.supplierName.trim() }
        : {}),
      expenseDate: expense.date,
      netAmountCents,
      vatAmountCents,
      totalAmountCents,
      currency: "EUR",
      paymentMethod: paymentMethodFromExpense(expense.paymentMethod),
      invoiceType: invoiceTypeFromExpense(expense),
    },
    warnings: !isExpenseFiscalDeductible(expense)
        ? [
            "El gasto ya está marcado como no deducible; el análisis no modifica esa decisión.",
          ]
        : [],
  };
}
