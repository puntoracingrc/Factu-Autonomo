import { describe, expect, it, vi } from "vitest";
import { commitAppDataDurably } from "@/lib/app-data-durability";
import { EMPTY_DATA } from "@/lib/types";
import {
  runBackupRestoreCommand,
  runBackupRestoreWithSafetyCopy,
} from "./backup-restore-command";

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

  it("descarga la copia del estado exacto y restaura sin ceder entre pasos", () => {
    const expected = { ...EMPTY_DATA };
    const restored = { ...EMPTY_DATA, customers: [] };
    const order: string[] = [];
    const restore = vi.fn((candidate, current) => {
      order.push("restore");
      expect(candidate).toBe(restored);
      expect(current).toBe(expected);
      return {
        status: "applied" as const,
        data: candidate,
        value: { restored: true as const },
        replayed: false,
      };
    });

    const result = runBackupRestoreWithSafetyCopy({
      restored,
      getCurrent: () => expected,
      downloadCurrent: (current) => {
        order.push("backup");
        expect(current).toBe(expected);
        return { ok: true, filename: "copia-actual.json" };
      },
      restore,
    });

    expect(order).toEqual(["backup", "restore"]);
    expect(result).toMatchObject({
      status: "restore_attempted",
      safetyCopyFilename: "copia-actual.json",
      result: { status: "applied" },
    });
  });

  it("no restaura si no puede descargar la copia de seguridad automática", () => {
    const restore = vi.fn();
    const result = runBackupRestoreWithSafetyCopy({
      restored: { ...EMPTY_DATA },
      getCurrent: () => EMPTY_DATA,
      downloadCurrent: () => ({ ok: false, error: "download_failed" }),
      restore,
    });

    expect(result).toEqual({
      status: "backup_failed",
      error: "download_failed",
    });
    expect(restore).not.toHaveBeenCalled();
  });

  it("bloquea si el contenido cambia durante la copia y no intenta restaurar", () => {
    const expected = { ...EMPTY_DATA };
    const changed = { ...EMPTY_DATA, customers: [] };
    let current = expected;
    const restore = vi.fn();
    const result = runBackupRestoreWithSafetyCopy({
      restored: { ...EMPTY_DATA },
      getCurrent: () => current,
      downloadCurrent: () => {
        current = changed;
        return { ok: true, filename: "copia-actual.json" };
      },
      restore,
    });

    expect(result).toEqual({
      status: "stale_precondition",
      safetyCopyFilename: "copia-actual.json",
    });
    expect(restore).not.toHaveBeenCalled();
  });

  it("captura al pulsar la referencia vigente aunque el render conserve otra anterior", () => {
    const staleRenderReference = { ...EMPTY_DATA };
    const metadataRefreshedReference = { ...EMPTY_DATA };
    const restore = vi.fn((candidate, expected) => ({
      status: "applied" as const,
      data: candidate,
      value: { restored: true as const },
      replayed: false,
      expected,
    }));

    const result = runBackupRestoreWithSafetyCopy({
      restored: staleRenderReference,
      getCurrent: () => metadataRefreshedReference,
      downloadCurrent: (current) => {
        expect(current).toBe(metadataRefreshedReference);
        return { ok: true, filename: "copia-vigente.json" };
      },
      restore,
    });

    expect(result.status).toBe("restore_attempted");
    expect(restore).toHaveBeenCalledWith(
      staleRenderReference,
      metadataRefreshedReference,
    );
  });

  it.each(["getCurrent", "downloadCurrent", "restore"] as const)(
    "convierte una excepción de %s en fallo seguro sin propagar datos",
    (failingStep) => {
      const expected = { ...EMPTY_DATA };
      const result = runBackupRestoreWithSafetyCopy({
        restored: { ...EMPTY_DATA },
        getCurrent: () => {
          if (failingStep === "getCurrent") throw new Error("private-payload");
          return expected;
        },
        downloadCurrent: () => {
          if (failingStep === "downloadCurrent") {
            throw new Error("private-payload");
          }
          return { ok: true, filename: "copia-actual.json" };
        },
        restore: () => {
          if (failingStep === "restore") throw new Error("private-payload");
          return {
            status: "applied" as const,
            data: expected,
            value: { restored: true as const },
            replayed: false,
          };
        },
      });

      expect(result).toEqual({ status: "unexpected_failure" });
      expect(JSON.stringify(result)).not.toContain("private-payload");
    },
  );
});
