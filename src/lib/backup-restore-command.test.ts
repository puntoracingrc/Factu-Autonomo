import { describe, expect, it, vi } from "vitest";
import { commitAppDataDurably } from "@/lib/app-data-durability";
import { EMPTY_DATA } from "@/lib/types";
import { runBackupRestoreCommand } from "./backup-restore-command";

describe("durable backup restore command", () => {
  it("persiste el reemplazo completo antes de devolver el estado publicable", () => {
    const expected = {
      ...EMPTY_DATA,
      meta: {
        lastModified: "2026-07-13T16:59:00.000Z",
        lastSyncedAt: "2026-07-13T16:58:00.000Z",
        pendingChanges: [
          {
            entityType: "expense" as const,
            entityId: "expense-unrelated",
            deleted: false,
            payload: { id: "expense-unrelated" },
            updatedAt: "2026-07-13T16:59:00.000Z",
          },
        ],
      },
      customers: [
        {
          id: "customer-current",
          firstName: "Actual",
          lastName: "Sintético",
          name: "Actual Sintético",
          createdAt: "2026-07-13T17:00:00.000Z",
          updatedAt: "2026-07-13T17:00:00.000Z",
        },
      ],
    };
    const restored = { ...EMPTY_DATA, customers: [] };
    const persist = vi.fn(() => ({ status: "applied" as const }));

    const result = runBackupRestoreCommand({
      expected,
      restored,
      commit: (current, build) =>
        commitAppDataDurably({
          expected: current,
          getCurrent: () => expected,
          build,
          persist,
        }),
    });

    expect(result.status).toBe("applied");
    expect(persist).toHaveBeenCalledTimes(1);
    if (result.status !== "applied") return;
    expect(result.value).toEqual({ restored: true });
    expect(result.data.customers).toEqual([]);
    expect(result.data.meta?.lastSyncedAt).toBe("2026-07-13T16:58:00.000Z");
    expect(result.data.meta?.pendingChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: "expense",
          entityId: "expense-unrelated",
        }),
        expect.objectContaining({
          entityType: "customer",
          entityId: "customer-current",
          deleted: true,
        }),
      ]),
    );
  });

  it.each([
    [
      "blocked",
      { status: "blocked" as const, reason: "quota_exceeded" as const },
    ],
    [
      "indeterminate",
      {
        status: "indeterminate" as const,
        reason: "storage_state_unknown" as const,
      },
    ],
  ])(
    "no devuelve datos publicables cuando persistir queda %s",
    (_label, outcome) => {
      const expected = { ...EMPTY_DATA };
      const result = runBackupRestoreCommand({
        expected,
        restored: { ...EMPTY_DATA, documents: [] },
        commit: (current, build) =>
          commitAppDataDurably({
            expected: current,
            getCurrent: () => expected,
            build,
            persist: () => outcome,
          }),
      });

      expect(result).toEqual(outcome);
      expect(result).not.toHaveProperty("data");
    },
  );

  it("bloquea una restauración stale antes de escribir", () => {
    const expected = { ...EMPTY_DATA };
    const persist = vi.fn(() => ({ status: "applied" as const }));
    const result = runBackupRestoreCommand({
      expected,
      restored: { ...EMPTY_DATA },
      commit: (current, build) =>
        commitAppDataDurably({
          expected: current,
          getCurrent: () => ({ ...expected }),
          build,
          persist,
        }),
    });

    expect(result).toEqual({
      status: "blocked",
      reason: "stale_precondition",
    });
    expect(persist).not.toHaveBeenCalled();
  });
});
