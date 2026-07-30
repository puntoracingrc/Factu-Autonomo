import { describe, expect, it } from "vitest";

import type { UserReminder } from "./types";
import {
  createUserReminderWithIdentity,
  deleteUserReminderFromCollection,
  updateUserReminderInCollection,
} from "./user-reminder-mutations";

const BASE: UserReminder = {
  id: "reminder-1",
  text: "Preparar factura",
  link: { kind: "new_invoice" },
  target: "self",
  completed: false,
  createdAt: "2026-07-30T08:00:00.000Z",
  updatedAt: "2026-07-30T08:00:00.000Z",
};

describe("user reminder mutations", () => {
  it("creates a reminder with caller-owned identity and timestamps", () => {
    expect(
      createUserReminderWithIdentity(
        {
          text: "Llamar al cliente",
          link: { kind: "customer", entityId: "customer-1" },
          target: "office",
          origin: "field",
        },
        {
          id: "reminder-2",
          now: "2026-07-30T09:00:00.000Z",
        },
      ),
    ).toEqual({
      id: "reminder-2",
      text: "Llamar al cliente",
      link: { kind: "customer", entityId: "customer-1" },
      target: "office",
      origin: "field",
      completed: false,
      createdAt: "2026-07-30T09:00:00.000Z",
      updatedAt: "2026-07-30T09:00:00.000Z",
    });
  });

  it("updates exactly one reminder while preserving its creation time", () => {
    const result = updateUserReminderInCollection(
      [BASE],
      {
        ...BASE,
        text: "Factura preparada",
        completed: true,
        completedAt: "2026-07-30T10:00:00.000Z",
        createdAt: "tampered",
      },
      "2026-07-30T10:00:00.000Z",
    );

    expect(result).toEqual({
      ok: true,
      reminders: [
        {
          ...BASE,
          text: "Factura preparada",
          completed: true,
          completedAt: "2026-07-30T10:00:00.000Z",
          updatedAt: "2026-07-30T10:00:00.000Z",
        },
      ],
      reminder: {
        ...BASE,
        text: "Factura preparada",
        completed: true,
        completedAt: "2026-07-30T10:00:00.000Z",
        updatedAt: "2026-07-30T10:00:00.000Z",
      },
    });
  });

  it("fails closed for missing or duplicated reminder identities", () => {
    expect(updateUserReminderInCollection([], BASE, BASE.updatedAt)).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(
      deleteUserReminderFromCollection([BASE, { ...BASE }], BASE.id),
    ).toEqual({ ok: false, reason: "identifier_collision" });
  });

  it("deletes exactly one reminder", () => {
    const other = { ...BASE, id: "reminder-2" };
    expect(deleteUserReminderFromCollection([BASE, other], BASE.id)).toEqual({
      ok: true,
      reminders: [other],
      reminder: BASE,
    });
  });
});
