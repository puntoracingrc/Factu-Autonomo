import { describe, expect, it, vi } from "vitest";
import type { DurableStorageBaseline } from "@/lib/app-data-durability";
import { EMPTY_DATA, type AppData } from "@/lib/types";
import {
  commitCloudSnapshotDurably,
  runCloudDeviceRepair,
} from "./device-repair";

function withCustomer(id: string): AppData {
  return {
    ...structuredClone(EMPTY_DATA),
    customers: [
      {
        id,
        firstName: "Cliente",
        lastName: "Sintético",
        name: "Cliente Sintético",
        createdAt: "2026-07-20T08:00:00.000Z",
        updatedAt: "2026-07-20T08:00:00.000Z",
      },
    ],
  };
}

describe("durable cloud snapshot replacement", () => {
  it("publica exactamente el snapshot solo después de persistirlo", () => {
    const expected = withCustomer("local");
    const replacement: AppData = {
      ...withCustomer("cloud"),
      meta: {
        lastModified: "2026-07-20T08:02:00.000Z",
        lastSyncedAt: "2026-07-20T08:02:00.000Z",
      },
    };
    const baseline: DurableStorageBaseline = {
      status: "known",
      data: expected,
    };
    const persist = vi.fn(() => ({ status: "applied" as const }));

    const result = commitCloudSnapshotDurably({
      expected,
      replacement,
      storageBaseline: baseline,
      getCurrent: () => expected,
      persist,
    });

    expect(persist).toHaveBeenCalledWith(replacement, expected);
    expect(result).toEqual({
      status: "applied",
      data: replacement,
      value: { replacedFromCloud: true },
      replayed: false,
    });
    expect(replacement.meta?.pendingChanges).toBeUndefined();
  });

  it.each([
    { status: "blocked" as const, reason: "quota_exceeded" as const },
    {
      status: "indeterminate" as const,
      reason: "storage_state_unknown" as const,
    },
  ])("no publica memoria cuando el guardado devuelve $status", (outcome) => {
    const expected = withCustomer("local");
    const replacement = withCustomer("cloud");
    const result = commitCloudSnapshotDurably({
      expected,
      replacement,
      storageBaseline: { status: "known", data: expected },
      getCurrent: () => expected,
      persist: () => outcome,
    });

    expect(result).toEqual(outcome);
    expect(result).not.toHaveProperty("data");
  });

  it("bloquea una precondición stale antes de escribir", () => {
    const expected = withCustomer("local");
    const persist = vi.fn(() => ({ status: "applied" as const }));

    const result = commitCloudSnapshotDurably({
      expected,
      replacement: withCustomer("cloud"),
      storageBaseline: { status: "known", data: expected },
      getCurrent: () => ({ ...expected }),
      persist,
    });

    expect(result).toEqual({
      status: "blocked",
      reason: "stale_precondition",
    });
    expect(persist).not.toHaveBeenCalled();
  });
});

describe("safe cloud device repair", () => {
  it("no solicita copia ni pull cuando el estado local ya no coincide con la vista previa", async () => {
    const downloadCurrent = vi.fn();
    const loadRemote = vi.fn();
    const replace = vi.fn();

    const result = await runCloudDeviceRepair({
      getCurrent: () => withCustomer("changed-local"),
      downloadCurrent,
      loadRemote,
      replace,
      validateExpected: () => false,
    });

    expect(result).toEqual({ status: "preview_stale" });
    expect(downloadCurrent).not.toHaveBeenCalled();
    expect(loadRemote).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("hace copia, pull y reemplazo durable en ese orden", async () => {
    const current = withCustomer("local");
    const remote = withCustomer("cloud");
    const order: string[] = [];

    const result = await runCloudDeviceRepair({
      getCurrent: () => current,
      downloadCurrent: async () => {
        order.push("backup");
        return { ok: true, filename: "safety.json" };
      },
      loadRemote: async () => {
        order.push("pull");
        return { data: remote, details: { source: "entities" as const } };
      },
      replace: () => {
        order.push("replace");
        return {
          status: "applied",
          data: remote,
          value: { replacedFromCloud: true },
          replayed: false,
        };
      },
    });

    expect(order).toEqual(["backup", "pull", "replace"]);
    expect(result).toEqual({
      status: "repair_attempted",
      safetyCopyFilename: "safety.json",
      remote: { source: "entities" },
      result: {
        status: "applied",
        data: remote,
        value: { replacedFromCloud: true },
        replayed: false,
      },
    });
  });

  it("no consulta la nube si falla la copia de seguridad", async () => {
    const loadRemote = vi.fn();
    const replace = vi.fn();

    const result = await runCloudDeviceRepair({
      getCurrent: () => EMPTY_DATA,
      downloadCurrent: async () => ({
        ok: false,
        error: "backup unavailable",
      }),
      loadRemote,
      replace,
    });

    expect(result).toEqual({
      status: "backup_failed",
      error: "backup unavailable",
    });
    expect(loadRemote).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("no reemplaza si los datos cambian mientras descarga la nube", async () => {
    const initial = withCustomer("local");
    let current = initial;
    const replace = vi.fn();

    const result = await runCloudDeviceRepair({
      getCurrent: () => current,
      downloadCurrent: async () => ({ ok: true, filename: "safety.json" }),
      loadRemote: async () => {
        current = { ...initial };
        return { data: withCustomer("cloud"), details: null };
      },
      replace,
    });

    expect(result).toEqual({
      status: "stale_precondition",
      safetyCopyFilename: "safety.json",
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it("no reemplaza cuando la nube cambió desde la vista previa", async () => {
    const replace = vi.fn();

    const result = await runCloudDeviceRepair({
      getCurrent: () => EMPTY_DATA,
      downloadCurrent: async () => ({ ok: true, filename: "safety.json" }),
      loadRemote: async () => ({
        data: withCustomer("new-cloud"),
        details: { fingerprint: "new" },
      }),
      validateRemote: (remote) => remote.details.fingerprint === "previewed",
      replace,
    });

    expect(result).toEqual({
      status: "preview_stale",
      safetyCopyFilename: "safety.json",
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it("no consulta ni reemplaza si la sesión cambia durante la copia", async () => {
    let currentSession = true;
    const loadRemote = vi.fn();
    const replace = vi.fn();

    const result = await runCloudDeviceRepair({
      getCurrent: () => EMPTY_DATA,
      downloadCurrent: async () => {
        currentSession = false;
        return { ok: true, filename: "safety.json" };
      },
      loadRemote,
      replace,
      isOperationCurrent: () => currentSession,
    });

    expect(result).toEqual({
      status: "operation_invalidated",
      safetyCopyFilename: "safety.json",
    });
    expect(loadRemote).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("no reemplaza si la sesión cambia durante el pull", async () => {
    let currentSession = true;
    const replace = vi.fn();

    const result = await runCloudDeviceRepair({
      getCurrent: () => EMPTY_DATA,
      downloadCurrent: async () => ({ ok: true, filename: "safety.json" }),
      loadRemote: async () => {
        currentSession = false;
        return { data: withCustomer("cloud"), details: null };
      },
      replace,
      isOperationCurrent: () => currentSession,
    });

    expect(result).toEqual({
      status: "operation_invalidated",
      safetyCopyFilename: "safety.json",
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it("conserva el estado local cuando la cuenta no tiene copia cloud", async () => {
    const replace = vi.fn();

    const result = await runCloudDeviceRepair({
      getCurrent: () => EMPTY_DATA,
      downloadCurrent: async () => ({ ok: true, filename: "safety.json" }),
      loadRemote: async () => null,
      replace,
    });

    expect(result).toEqual({
      status: "cloud_empty",
      safetyCopyFilename: "safety.json",
    });
    expect(replace).not.toHaveBeenCalled();
  });
});
