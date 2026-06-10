import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSyncPending,
  hasUnsyncedChanges,
  isSyncPendingFlag,
  markSyncPending,
} from "./sync-queue";
import { EMPTY_DATA } from "../types";

describe("sync queue", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    vi.stubGlobal("window", { navigator: { onLine: true } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detecta cambios pendientes", () => {
    const data = {
      ...EMPTY_DATA,
      meta: {
        lastModified: "2026-06-10T12:00:00.000Z",
        lastSyncedAt: "2026-06-09T12:00:00.000Z",
      },
    };
    expect(hasUnsyncedChanges(data)).toBe(true);
  });

  it("marca y limpia la cola local", () => {
    markSyncPending();
    expect(isSyncPendingFlag()).toBe(true);
    clearSyncPending();
    expect(isSyncPendingFlag()).toBe(false);
  });
});
