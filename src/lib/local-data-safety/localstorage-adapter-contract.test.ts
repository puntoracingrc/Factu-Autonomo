import { describe, expect, it, vi } from "vitest";
import {
  createDisabledLocalDataStorageAdapter,
  evaluateLocalDataStorageAdapterReadiness,
  summarizeLocalDataStorageAdapter,
} from "./localstorage-adapter-contract";

// PHASE2D16_DISABLED_LOCALSTORAGE_ADAPTER_CONTRACT_V1

describe("disabled local storage adapter contract", () => {
  it("reports disabled readiness", () => {
    const readiness = evaluateLocalDataStorageAdapterReadiness("2026-06-27T00:00:00.000Z");

    expect(readiness.status).toBe("disabled");
    expect(readiness.canRead).toBe(false);
    expect(readiness.canWrite).toBe(false);
  });

  it("blocks read and write through the disabled adapter", () => {
    const adapter = createDisabledLocalDataStorageAdapter("2026-06-27T00:00:00.000Z");

    expect(adapter.read().canRead).toBe(false);
    expect(adapter.write().canWrite).toBe(false);
    expect(summarizeLocalDataStorageAdapter(adapter)).toEqual(adapter.summarize());
  });

  it("does not access the browser storage global", () => {
    const storageName = "local" + "Storage";
    const original = Object.getOwnPropertyDescriptor(globalThis, storageName);
    const getter = vi.fn(() => {
      throw new Error("storage global must not be touched");
    });

    Object.defineProperty(globalThis, storageName, {
      configurable: true,
      get: getter,
    });

    try {
      const adapter = createDisabledLocalDataStorageAdapter("2026-06-27T00:00:00.000Z");
      expect(adapter.read().status).toBe("disabled");
      expect(adapter.write().status).toBe("disabled");
      expect(getter).not.toHaveBeenCalled();
    } finally {
      if (original) Object.defineProperty(globalThis, storageName, original);
      else Reflect.deleteProperty(globalThis, storageName);
    }
  });
});
