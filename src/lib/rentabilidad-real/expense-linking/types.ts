import type { Expense } from "@/lib/types";

export type RentabilidadRealExpenseLinkStatus =
  | "linked_to_current_work"
  | "unlinked_candidate"
  | "partially_linked_elsewhere"
  | "linked_to_other_document"
  | "not_linkable";

export interface RentabilidadRealExpenseLinkWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "risk";
}

export interface RentabilidadRealExpenseLinkCandidate {
  expense: Expense;
  status: RentabilidadRealExpenseLinkStatus;
  suggestedReason: string;
  warnings: RentabilidadRealExpenseLinkWarning[];
  score: number;
  availableLineIds?: string[];
  allocatedElsewhereAmount?: number;
  remainingAmount?: number;
}

export interface RentabilidadRealExpenseLinkImpact {
  action: RentabilidadRealExpenseLinkAction;
  expenseId: string;
  previousWorkDocumentId?: string;
  nextWorkDocumentId?: string;
  requiresConfirmation: boolean;
  warnings: RentabilidadRealExpenseLinkWarning[];
  message: string;
}

export type RentabilidadRealExpenseLinkAction = "link" | "reassign" | "unlink";

export interface RentabilidadRealIgnoredExpenseReason {
  expenseId: string;
  reason: string;
  warnings: RentabilidadRealExpenseLinkWarning[];
}
