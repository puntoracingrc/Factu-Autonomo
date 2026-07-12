import {
  centsToEuroInput,
  type ExistingExpenseAdaptation,
} from "@/lib/expense-deductibility";
import type { Expense } from "@/lib/types";
import type { ExpenseInput } from "@/lib/tax-engine";

export interface ExistingExpenseFormProjection {
  concept: string;
  expenseDate: string;
  supplierName: string;
  netAmount: string;
  vatAmount: string;
  totalAmount: string;
  paymentMethod: ExpenseInput["paymentMethod"];
  invoiceType: ExpenseInput["invoiceType"];
}

export const EMPTY_EXPENSE_FORM: ExistingExpenseFormProjection = {
  concept: "",
  expenseDate: "",
  supplierName: "",
  netAmount: "",
  vatAmount: "",
  totalAmount: "",
  paymentMethod: "UNKNOWN",
  invoiceType: "UNKNOWN",
};

export function projectExistingExpenseToForm(
  expense: Expense,
  adaptation: ExistingExpenseAdaptation,
): ExistingExpenseFormProjection {
  if (adaptation.status !== "READY") {
    return {
      ...EMPTY_EXPENSE_FORM,
      concept: expense.description.trim() || expense.category.trim(),
      expenseDate: expense.date,
      supplierName: expense.supplierName,
    };
  }
  return {
    concept: adaptation.input.concept,
    expenseDate: adaptation.input.expenseDate,
    supplierName: adaptation.input.supplierName ?? "",
    netAmount: centsToEuroInput(adaptation.input.netAmountCents),
    vatAmount: centsToEuroInput(adaptation.input.vatAmountCents),
    totalAmount: centsToEuroInput(adaptation.input.totalAmountCents),
    paymentMethod: adaptation.input.paymentMethod,
    invoiceType: adaptation.input.invoiceType,
  };
}
