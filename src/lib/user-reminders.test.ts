import { describe, expect, it } from "vitest";
import {
  isReminderOverdue,
  pendingUserReminders,
  resolveReminderHref,
  sortUserReminders,
} from "./user-reminders";
import { EMPTY_DATA, type UserReminder } from "./types";

function reminder(overrides: Partial<UserReminder> = {}): UserReminder {
  return {
    id: "r1",
    text: "Factura a María",
    link: { kind: "none" },
    completed: false,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("user-reminders", () => {
  it("ordena vencidos primero y luego por fecha", () => {
    const sorted = sortUserReminders([
      reminder({ id: "later", dueDate: "2026-06-20" }),
      reminder({ id: "overdue", dueDate: "2026-06-01" }),
      reminder({ id: "none" }),
      reminder({ id: "soon", dueDate: "2026-06-10" }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual([
      "overdue",
      "soon",
      "later",
      "none",
    ]);
  });

  it("detecta recordatorios vencidos", () => {
    expect(
      isReminderOverdue(
        reminder({ dueDate: "2026-06-01", dueTime: "09:00" }),
        new Date("2026-06-09T12:00:00"),
      ),
    ).toBe(true);
  });

  it("resuelve enlaces a factura y rectificación", () => {
    const data = {
      ...EMPTY_DATA,
      customers: [
        {
          id: "c1",
          firstName: "María",
          lastName: "López",
          name: "María López",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ],
      documents: [
        {
          id: "f1",
          type: "factura" as const,
          number: "F-1",
          date: "2026-06-01",
          client: { name: "Paco" },
          items: [],
          status: "enviado" as const,
          createdAt: "2026-06-01",
          updatedAt: "2026-06-01",
        },
      ],
    };

    expect(
      resolveReminderHref(data, { kind: "customer", entityId: "c1" }),
    ).toBe("/facturas/nuevo?cliente=c1");
    expect(
      resolveReminderHref(data, { kind: "rectify", entityId: "f1" }),
    ).toBe("/facturas/f1/rectificar");
  });

  it("filtra pendientes", () => {
    const pending = pendingUserReminders([
      reminder({ id: "a", completed: false }),
      reminder({ id: "b", completed: true }),
    ]);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.id).toBe("a");
  });
});
