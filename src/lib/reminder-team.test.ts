import { describe, expect, it } from "vitest";
import {
  countUnseenOfficeReminders,
  normalizeUserReminder,
  sortTeamReminders,
} from "./reminder-team";
import type { UserReminder } from "./types";

function reminder(overrides: Partial<UserReminder> = {}): UserReminder {
  return normalizeUserReminder({
    id: "r1",
    text: "Tarea",
    link: { kind: "none" },
    completed: false,
    createdAt: "2026-06-09T10:00:00.000Z",
    updatedAt: "2026-06-09T10:00:00.000Z",
    ...overrides,
  });
}

describe("reminder-team", () => {
  it("normaliza recordatorios antiguos con target self", () => {
    const normalized = normalizeUserReminder({
      id: "x",
      text: "Hola",
      link: { kind: "none" },
    });
    expect(normalized.target).toBe("self");
  });

  it("prioriza tareas de oficina", () => {
    const sorted = sortTeamReminders([
      reminder({ id: "self", target: "self" }),
      reminder({ id: "office", target: "office" }),
    ]);
    expect(sorted[0]?.id).toBe("office");
  });

  it("cuenta recordatorios de oficina no vistos", () => {
    const items = [
      reminder({
        id: "o1",
        target: "office",
        createdAt: "2026-06-09T12:00:00.000Z",
      }),
    ];
    expect(
      countUnseenOfficeReminders(items, "2026-06-09T11:00:00.000Z"),
    ).toBe(1);
    expect(
      countUnseenOfficeReminders(items, "2026-06-09T13:00:00.000Z"),
    ).toBe(0);
  });
});
