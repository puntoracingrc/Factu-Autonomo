import type { ExpenseInboxItem } from "@/lib/expense-inbox";
import type { Expense } from "@/lib/types";

export function expenseAlreadySavedFromInbox(
  expenses: readonly Pick<Expense, "sourceInboxItemId">[],
  inboxItemId: string | null | undefined,
): boolean {
  if (!inboxItemId) return false;
  return expenses.some(
    (expense) => expense.sourceInboxItemId === inboxItemId,
  );
}

export function closeExpenseInboxItemLocally(
  items: readonly ExpenseInboxItem[],
  itemId: string,
): { items: ExpenseInboxItem[]; removedPending: boolean } {
  const closed = items.find((item) => item.id === itemId);
  return {
    items: items.filter((item) => item.id !== itemId),
    removedPending: closed?.status === "pending",
  };
}
