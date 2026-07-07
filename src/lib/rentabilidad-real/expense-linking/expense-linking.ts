import { isFixedExpense } from "@/lib/expense-classification";
import { isProviderSummaryPendingOriginal } from "@/lib/provider-summary-expenses";
import type { AppData, Document, Expense } from "@/lib/types";
import type {
  RentabilidadRealExpenseLinkCandidate,
  RentabilidadRealExpenseLinkImpact,
  RentabilidadRealExpenseLinkWarning,
  RentabilidadRealIgnoredExpenseReason,
} from "./types";

function dateDistanceDays(a: string, b: string): number | null {
  const first = new Date(a).getTime();
  const second = new Date(b).getTime();
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
  return Math.abs(first - second) / (24 * 60 * 60 * 1000);
}

function documentsByIds(data: AppData, workDocumentIds: readonly string[]) {
  const ids = new Set(workDocumentIds);
  return data.documents.filter((doc) => ids.has(doc.id));
}

function nearestDocumentDateDistance(
  expense: Expense,
  documents: Document[],
): number | null {
  const distances = documents
    .map((doc) => dateDistanceDays(expense.date, doc.date))
    .filter((distance): distance is number => distance !== null);
  if (distances.length === 0) return null;
  return Math.min(...distances);
}

function warningsForExpense(
  expense: Expense,
): RentabilidadRealExpenseLinkWarning[] {
  const warnings: RentabilidadRealExpenseLinkWarning[] = [
    {
      code: "expense_amount_unchanged",
      message:
        "No se modificará el importe ni el IVA del gasto; solo se cambiará su vínculo con este trabajo.",
      severity: "info",
    },
  ];

  if (!expense.workDocumentId) {
    warnings.push({
      code: "expense_unlinked",
      message: "Este gasto no está enlazado a ningún trabajo.",
      severity: "info",
    });
  } else {
    warnings.push({
      code: "expense_linked_to_other_document",
      message: "Este gasto ya está enlazado a otro documento.",
      severity: "warning",
    });
  }

  if (isFixedExpense(expense)) {
    warnings.push({
      code: "fixed_expense_as_direct_cost",
      message:
        "Este gasto parece recurrente/fijo; quizá debe tratarse como gasto fijo imputado, no como coste directo.",
      severity: "warning",
    });
  }

  if (expense.origin === "scan") {
    warnings.push({
      code: "scanned_expense_review",
      message:
        "Este gasto procede de escaneo IA; revisa que los datos estén confirmados.",
      severity: "info",
    });
  }

  if (isProviderSummaryPendingOriginal(expense)) {
    warnings.push({
      code: "provider_summary_missing_original",
      message:
        "Este gasto viene de un resumen de proveedor. Cuenta como gasto, pero falta escanear la factura original.",
      severity: "warning",
    });
  }

  return warnings;
}

function candidateReason(expense: Expense, distanceDays: number | null): string {
  if (isProviderSummaryPendingOriginal(expense)) {
    return "Registrado desde resumen de proveedor; falta la factura original.";
  }
  if (expense.origin === "scan") {
    return "Gasto escaneado por IA pendiente de asignar.";
  }
  if (expense.purchaseDocument || expense.purchaseLines?.length) {
    return "Gasto de proveedor con datos de compra estructurados.";
  }
  if (distanceDays !== null && distanceDays <= 45) {
    return "Fecha cercana al documento seleccionado.";
  }
  if (expense.category || expense.supplierName) {
    return "Gasto sin enlazar con proveedor o categoría útil.";
  }
  return "Gasto existente sin trabajo asignado.";
}

function candidateScore(expense: Expense, distanceDays: number | null): number {
  let score = 0;
  if (isProviderSummaryPendingOriginal(expense)) score += 15;
  if (expense.origin === "scan") score += 30;
  if (expense.purchaseDocument || expense.purchaseLines?.length) score += 20;
  if (distanceDays !== null && distanceDays <= 14) score += 20;
  if (distanceDays !== null && distanceDays > 14 && distanceDays <= 45) {
    score += 10;
  }
  if (expense.category.toLowerCase().includes("material")) score += 10;
  if (expense.supplierName.trim()) score += 5;
  return score;
}

export function canLinkExpenseToWork(
  expense: Expense,
  targetDocumentId: string,
): boolean {
  return Boolean(targetDocumentId) && !isFixedExpense(expense);
}

export function getAlreadyLinkedExpensesForWork(
  appData: AppData,
  workDocumentIds: readonly string[],
): RentabilidadRealExpenseLinkCandidate[] {
  const ids = new Set(workDocumentIds);
  return appData.expenses
    .filter((expense) => expense.workDocumentId && ids.has(expense.workDocumentId))
    .filter((expense) => !isFixedExpense(expense))
    .map((expense) => ({
      expense,
      status: "linked_to_current_work",
      suggestedReason: "Ya está enlazado a este trabajo.",
      warnings: warningsForExpense(expense).filter(
        (warning) => warning.code !== "expense_linked_to_other_document",
      ),
      score: 100,
    }));
}

export function getExpenseLinkCandidatesForWork(
  appData: AppData,
  workDocumentIds: readonly string[],
): RentabilidadRealExpenseLinkCandidate[] {
  const relatedDocuments = documentsByIds(appData, workDocumentIds);
  return appData.expenses
    .filter((expense) => !expense.workDocumentId)
    .filter((expense) => !isFixedExpense(expense))
    .map((expense) => {
      const distanceDays = nearestDocumentDateDistance(expense, relatedDocuments);
      return {
        expense,
        status: "unlinked_candidate" as const,
        suggestedReason: candidateReason(expense, distanceDays),
        warnings: warningsForExpense(expense),
        score: candidateScore(expense, distanceDays),
      };
    })
    .sort((a, b) => b.score - a.score || b.expense.date.localeCompare(a.expense.date));
}

export function getIgnoredExpensesForWork(
  appData: AppData,
  workDocumentIds: readonly string[],
): RentabilidadRealIgnoredExpenseReason[] {
  const ids = new Set(workDocumentIds);
  return appData.expenses.flatMap((expense) => {
    if (expense.workDocumentId && ids.has(expense.workDocumentId)) return [];
    if (isFixedExpense(expense)) {
      return [
        {
          expenseId: expense.id,
          reason:
            "Los gastos fijos se imputan por regla de reparto, no como coste directo.",
          warnings: warningsForExpense(expense),
        },
      ];
    }
    return [];
  });
}

export function buildExpenseLinkImpact(
  expense: Expense,
  targetDocumentId: string,
): RentabilidadRealExpenseLinkImpact {
  const reassign =
    Boolean(expense.workDocumentId) && expense.workDocumentId !== targetDocumentId;
  return {
    action: reassign ? "reassign" : "link",
    expenseId: expense.id,
    previousWorkDocumentId: expense.workDocumentId,
    nextWorkDocumentId: targetDocumentId,
    requiresConfirmation: reassign || isFixedExpense(expense),
    warnings: warningsForExpense(expense),
    message: reassign
      ? "Este gasto ya está enlazado a otro documento. Si lo reasignas, dejará de estar asociado al anterior."
      : "Se enlazará este gasto existente al trabajo seleccionado. No se creará un gasto nuevo.",
  };
}

export function buildExpenseUnlinkImpact(
  expense: Expense,
): RentabilidadRealExpenseLinkImpact {
  return {
    action: "unlink",
    expenseId: expense.id,
    previousWorkDocumentId: expense.workDocumentId,
    nextWorkDocumentId: undefined,
    requiresConfirmation: false,
    warnings: warningsForExpense(expense),
    message:
      "Se quitará el vínculo de este gasto con el trabajo. El gasto no se borrará.",
  };
}

export function createExpenseWorkDocumentUpdatePayload(
  expense: Expense,
  targetDocumentId: string,
): Expense {
  return {
    ...expense,
    workDocumentId: targetDocumentId,
  };
}

export function createExpenseWorkDocumentUnlinkPayload(expense: Expense): Expense {
  return {
    ...expense,
    workDocumentId: undefined,
  };
}
