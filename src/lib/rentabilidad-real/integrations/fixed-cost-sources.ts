import {
  isRecurringExpenseApplicableOn,
  isRecurringExpenseWithinDurationOn,
} from "@/lib/recurring-expenses";
import type { AppData, Expense } from "@/lib/types";
import {
  mapExistingExpenseToProfitabilityFixedCost,
  mapExistingRecurringExpenseToProfitabilityFixedCost,
  mapExistingRecurringOccurrenceToProfitabilityFixedCost,
} from "./expense-adapter";
import type { ProfitabilityFixedCostSource } from "./types";

function linkedRecurringTemplateId(
  expense: Expense,
  recurringTemplateIds: ReadonlySet<string>,
): string | null {
  if (
    expense.recurringExpenseId &&
    recurringTemplateIds.has(expense.recurringExpenseId)
  ) {
    return expense.recurringExpenseId;
  }

  const key = expense.recurringOccurrenceKey;
  const separator = key?.lastIndexOf(":") ?? -1;
  if (!key || separator <= 0) return null;
  const templateId = key.slice(0, separator);
  return recurringTemplateIds.has(templateId) ? templateId : null;
}

export function mapExistingDataToProfitabilityFixedCosts(
  data: AppData,
  referenceDate: string,
): ProfitabilityFixedCostSource[] {
  const recurringTemplateIds = new Set(
    data.recurringExpenses.map((expense) => expense.id),
  );
  const linkedTemplateByExpenseId = new Map(
    data.expenses.map((expense) => [
      expense.id,
      linkedRecurringTemplateId(expense, recurringTemplateIds),
    ]),
  );

  const standaloneFixedCosts = data.expenses
    .filter((expense) => !linkedTemplateByExpenseId.get(expense.id))
    .map(mapExistingExpenseToProfitabilityFixedCost)
    .filter((cost): cost is ProfitabilityFixedCostSource => Boolean(cost));
  const applicableRecurringCosts = data.recurringExpenses
    .filter((expense) =>
      isRecurringExpenseApplicableOn(expense, referenceDate),
    )
    .map(mapExistingRecurringExpenseToProfitabilityFixedCost);

  // `enabled` expresa el estado actual y no conserva cuándo se pulsó Pausar.
  // Para un histórico usamos solo evidencia materializada del mismo mes; no
  // proyectamos una plantilla pausada hacia meses sin una ocurrencia real.
  const referenceMonth = referenceDate.slice(0, 7);
  const pausedHistoricalFallbacks = data.recurringExpenses
    .filter(
      (expense) =>
        !expense.enabled &&
        isRecurringExpenseWithinDurationOn(expense, referenceDate),
    )
    .flatMap((recurringExpense) => {
      const occurrence = data.expenses
        .filter(
          (expense) =>
            linkedTemplateByExpenseId.get(expense.id) ===
              recurringExpense.id &&
            expense.date.slice(0, 7) === referenceMonth,
        )
        .sort((a, b) =>
          `${b.date}:${b.createdAt}`.localeCompare(
            `${a.date}:${a.createdAt}`,
          ),
        )[0];

      return occurrence
        ? [
            mapExistingRecurringOccurrenceToProfitabilityFixedCost(
              occurrence,
              recurringExpense,
            ),
          ]
        : [];
    });

  return [
    ...standaloneFixedCosts,
    ...applicableRecurringCosts,
    ...pausedHistoricalFallbacks,
  ];
}
