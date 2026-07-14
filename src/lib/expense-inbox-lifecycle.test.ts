import { describe, expect, it } from "vitest";
import type { ExpenseInboxItem } from "./expense-inbox";
import {
  closeExpenseInboxItemLocally,
  expenseAlreadySavedFromInbox,
} from "./expense-inbox-lifecycle";

function item(id: string, status: ExpenseInboxItem["status"]): ExpenseInboxItem {
  return {
    id,
    receivedAt: "2026-07-14T00:00:00.000Z",
    attachmentFilename: "factura.pdf",
    attachmentContentType: "application/pdf",
    attachmentSize: 1,
    attachmentHash: `hash-${id}`,
    status,
    createdAt: "2026-07-14T00:00:00.000Z",
  };
}

describe("expense inbox lifecycle", () => {
  it("reconoce de forma exacta un gasto ya guardado desde el buzón", () => {
    const expenses = [
      { sourceInboxItemId: "inbox-1" },
      { sourceInboxItemId: undefined },
    ];

    expect(expenseAlreadySavedFromInbox(expenses, "inbox-1")).toBe(true);
    expect(expenseAlreadySavedFromInbox(expenses, "inbox-2")).toBe(false);
    expect(expenseAlreadySavedFromInbox(expenses, null)).toBe(false);
  });

  it("retira solo la entrada cerrada y ajusta pendientes una vez", () => {
    const closed = closeExpenseInboxItemLocally(
      [item("pending", "pending"), item("error", "error")],
      "pending",
    );

    expect(closed.items.map((entry) => entry.id)).toEqual(["error"]);
    expect(closed.removedPending).toBe(true);
    expect(
      closeExpenseInboxItemLocally(closed.items, "pending").removedPending,
    ).toBe(false);
  });
});
