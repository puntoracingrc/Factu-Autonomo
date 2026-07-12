import {
  expensePurchaseLineBaseTotal,
  expenseTotalsFromBase,
  resolveExpenseVat,
  type ExpenseVatInput,
  type ExpenseVatIssue,
  type ExpenseVatResolution,
} from "@/lib/expenses";
import { formatMoney } from "@/lib/calculations";
import { isFixedExpense } from "@/lib/expense-classification";
import type { ExpenseInboxItem } from "@/lib/expense-inbox";
import type { Expense, ExpensePurchaseLine } from "@/lib/types";

type ExpenseVatDraft = Pick<
  Expense,
  | "amount"
  | "ivaPercent"
  | "purchaseLines"
  | "businessKind"
  | "deductibility"
  | "origin"
  | "recurringExpenseId"
>;

type ExpenseVatContext = Pick<
  ExpenseVatInput,
  "businessKind" | "deductibility" | "origin" | "recurringExpenseId"
>;

function isFixedNonDeductible(context: ExpenseVatContext): boolean {
  return (
    isFixedExpense(context) &&
    context.deductibility === "non_deductible"
  );
}

export function canReconcileExpenseAmountWithLineBase(
  context: ExpenseVatContext,
): boolean {
  return !isFixedNonDeductible(context);
}

export type ExpenseVatSavePreparation =
  | {
      ok: true;
      purchaseLines: ExpensePurchaseLine[];
      resolution: ExpenseVatResolution;
    }
  | {
      ok: false;
      purchaseLines: ExpensePurchaseLine[];
      resolution: ExpenseVatResolution;
      reason: string;
    };

export function materializeExpensePurchaseLineVat(
  lines: ExpensePurchaseLine[] = [],
  headerIvaPercent: number,
): ExpensePurchaseLine[] {
  return lines.map((line) => ({
    ...line,
    ivaPercent: line.ivaPercent ?? headerIvaPercent,
  }));
}

export function expenseVatIssueMessage(
  issue: ExpenseVatIssue | null,
): string {
  switch (issue) {
    case "mixed_vat_missing_rate":
      return "Indica el IVA de todas las líneas antes de guardar este desglose.";
    case "mixed_vat_invalid_line":
      return "Revisa la base y el IVA de todas las líneas del desglose.";
    case "mixed_vat_base_mismatch":
      return "La base de las líneas no coincide con el importe del gasto. Concíliala antes de guardar.";
    case "provider_summary_tax_mismatch":
      return "El IVA, el recargo o el total del resumen no cuadran. Revisa el documento antes de usarlo fiscalmente.";
    default:
      return "Revisa el desglose de IVA antes de guardar.";
  }
}

/**
 * Debe ejecutarse antes de crear proveedor, mutar AppData o marcar un inbox.
 * La materialización solo ocurre cuando el desglose bruto no está bloqueado.
 */
export function prepareExpenseVatForSave(
  draft: ExpenseVatDraft,
  vatExempt = false,
): ExpenseVatSavePreparation {
  const rawResolution = resolveExpenseVat(draft, vatExempt);
  if (vatExempt || isFixedNonDeductible(draft) || draft.amount === 0) {
    return {
      ok: true,
      purchaseLines: draft.purchaseLines ?? [],
      resolution: rawResolution,
    };
  }
  if (rawResolution.blocked) {
    return {
      ok: false,
      purchaseLines: draft.purchaseLines ?? [],
      resolution: rawResolution,
      reason: expenseVatIssueMessage(rawResolution.issue),
    };
  }
  const purchaseLines = materializeExpensePurchaseLineVat(
    draft.purchaseLines,
    draft.ivaPercent,
  );
  return {
    ok: true,
    purchaseLines,
    resolution: resolveExpenseVat({ ...draft, purchaseLines }, vatExempt),
  };
}

export function canAutoSaveScannedExpenseVat(
  draft: ExpenseVatInput,
  vatExempt = false,
): boolean {
  if (draft.amount < 0) return false;
  return !resolveExpenseVat(draft, vatExempt).blocked;
}

export function countBlockedExpenseVat(
  expenses: ExpenseVatInput[],
  vatExempt = false,
): number {
  return expenses.reduce(
    (count, expense) =>
      count + (resolveExpenseVat(expense, vatExempt).blocked ? 1 : 0),
    0,
  );
}

export function expenseVatRatesLabel(
  resolution: ExpenseVatResolution,
): string {
  return resolution.breakdown
    .map((row) => row.ivaPercent)
    .filter((rate, index, rates) => rates.indexOf(rate) === index)
    .sort((left, right) => right - left)
    .map((rate) => `${rate}%`)
    .join(" + ");
}

export function expenseVatSourceLabel(
  resolution: ExpenseVatResolution,
  vatExempt = false,
  context: ExpenseVatContext = {},
): string {
  if (isFixedNonDeductible(context)) {
    return "No desgravable · importe íntegro";
  }
  if (vatExempt) return "Perfil exento · IVA 0%";
  if (resolution.issue === "provider_summary_tax_mismatch") {
    return "Resumen fiscal por revisar";
  }
  if (resolution.blocked) return "IVA por revisar";
  if (resolution.source === "lines") {
    return `IVA por líneas · ${expenseVatRatesLabel(resolution)}`;
  }
  return `IVA cabecera · ${resolution.headerIvaPercent}%`;
}

export interface ExpenseAmountVatView {
  resolution: ExpenseVatResolution;
  ratesLabel: string;
}

export function expenseAmountVatView(
  expense: ExpenseVatInput,
  vatExempt = false,
): ExpenseAmountVatView {
  const resolution = resolveExpenseVat(expense, vatExempt);
  return {
    resolution,
    ratesLabel: expenseVatRatesLabel(resolution),
  };
}

export interface ExpensePurchaseLineVatView {
  line: ExpensePurchaseLine;
  description: string;
  base: number;
  ivaPercent: number;
  documentIvaPercent?: number;
  ivaOrigin: "línea" | "cabecera" | "perfil exento";
  amounts: ReturnType<typeof expenseTotalsFromBase>;
}

export function expensePurchaseLinesVatView(
  expense: Expense,
  vatExempt = false,
): {
  resolution: ExpenseVatResolution;
  lines: ExpensePurchaseLineVatView[];
} {
  return {
    resolution: resolveExpenseVat(expense, vatExempt),
    lines: (expense.purchaseLines ?? []).map((line) => {
      const base = expensePurchaseLineBaseTotal(line);
      const ivaPercent = vatExempt
        ? 0
        : (line.ivaPercent ?? expense.ivaPercent);
      const documentIvaPercent = line.ivaPercent;
      return {
        line,
        description: line.description.trim(),
        base,
        ivaPercent,
        documentIvaPercent,
        ivaOrigin: vatExempt
          ? "perfil exento"
          : line.ivaPercent === undefined
            ? "cabecera"
            : "línea",
        amounts: expenseTotalsFromBase(base, ivaPercent, vatExempt),
      };
    }),
  };
}

export interface ExpenseInboxItemVatView {
  resolution: ExpenseVatResolution;
  amountLabel: string;
  sourceLabel: string;
}

export function expenseInboxItemVatView(
  item: ExpenseInboxItem,
  vatExempt = false,
): ExpenseInboxItemVatView | null {
  const expense = item.scanPayload?.expense;
  if (
    !expense ||
    typeof expense.amount !== "number" ||
    !Number.isFinite(expense.amount)
  ) {
    return null;
  }

  const resolution = resolveExpenseVat(
    {
      amount: expense.amount,
      ivaPercent: expense.ivaPercent,
      purchaseLines: expense.purchaseLines,
    },
    vatExempt,
  );
  return {
    resolution,
    amountLabel: resolution.blocked
      ? `Base ${formatMoney(resolution.base)} · total por revisar`
      : formatMoney(resolution.total),
    sourceLabel: expenseVatSourceLabel(resolution, vatExempt),
  };
}
