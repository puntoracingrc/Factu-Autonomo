import { describe, expect, it } from "vitest";
import {
  cloneInMemoryStorageState,
  createInMemoryLocalStorageResilienceAdapter,
  summarizeInMemoryStorageState,
} from "./in-memory-storage-adapter";

// PHASE2E3_IN_MEMORY_STORAGE_ADAPTER_V1

describe("in-memory storage adapter", () => {
  it("sets and gets synthetic keys only", () => {
    const adapter = createInMemoryLocalStorageResilienceAdapter();

    expect(adapter.setItem("SYNTHETIC_ONLY_APP_DATA", "{\"ok\":true}").decision).toBe("allowed_in_memory");
    expect(adapter.getItem("SYNTHETIC_ONLY_APP_DATA").value).toBe("{\"ok\":true}");
    expect(adapter.getItem("real-key").decision).toBe("blocked");
  });

  it("removes and clears synthetic entries", () => {
    const adapter = createInMemoryLocalStorageResilienceAdapter();
    adapter.setItem("SYNTHETIC_ONLY_A", "1");
    adapter.setItem("SYNTHETIC_ONLY_B", "2");

    expect(adapter.removeItem("SYNTHETIC_ONLY_A").decision).toBe("allowed_in_memory");
    expect(adapter.clearSyntheticOnly().value).toEqual(["SYNTHETIC_ONLY_B"]);
    expect(adapter.listKeys().value).toEqual([]);
  });

  it("clones state to prevent mutation leaks", () => {
    const source = { entries: { SYNTHETIC_ONLY_A: "1" } };
    const clone = cloneInMemoryStorageState(source);
    clone.entries.SYNTHETIC_ONLY_A = "2";

    expect(source.entries.SYNTHETIC_ONLY_A).toBe("1");
    expect(summarizeInMemoryStorageState(source).syntheticKeyCount).toBe(1);
  });
});
