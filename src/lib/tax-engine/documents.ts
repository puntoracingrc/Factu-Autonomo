import { booleanAnswer, stringAnswer } from "./answers";
import type { ExpenseAnswers, InvoiceType } from "./types";

const INVOICE_TYPES = new Set<InvoiceType>([
  "FULL_INVOICE",
  "SIMPLIFIED_INVOICE",
  "RECEIPT",
  "NO_DOCUMENT",
  "UNKNOWN",
]);

export function effectiveInvoiceType(
  inputType: InvoiceType,
  answers: ExpenseAnswers,
): InvoiceType {
  if (inputType !== "UNKNOWN") return inputType;
  const answer = stringAnswer(answers, "document.invoiceType") as
    InvoiceType | undefined;
  return answer && INVOICE_TYPES.has(answer) ? answer : "UNKNOWN";
}

export function isVatDocumentQualified(
  invoiceType: InvoiceType,
  answers: ExpenseAnswers,
): boolean | undefined {
  if (invoiceType === "FULL_INVOICE") return true;
  if (invoiceType === "SIMPLIFIED_INVOICE") {
    return booleanAnswer(answers, "document.simplifiedInvoiceQualified");
  }
  if (invoiceType === "RECEIPT" || invoiceType === "NO_DOCUMENT") return false;
  return undefined;
}

export function isInvoicePresent(invoiceType: InvoiceType): boolean {
  return invoiceType === "FULL_INVOICE" || invoiceType === "SIMPLIFIED_INVOICE";
}
