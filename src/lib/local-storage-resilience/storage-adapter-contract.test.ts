import { describe, expect, it } from "vitest";
import {
  STORAGE_ADAPTER_DISABLED_REASON,
  createDisabledLocalStorageResilienceAdapter,
  evaluateLocalStorageResilienceAdapterReadiness,
} from "./storage-adapter-contract";

// PHASE2E2_STORAGE_ADAPTER_CONTRACT_DISABLED_V1

describe("disabled storage adapter contract", () => {
  it("blocks read, write and delete by default", () => {
    const adapter = createDisabledLocalStorageResilienceAdapter();

    expect(adapter.getItem("SYNTHETIC_ONLY_KEY").decision).toBe("blocked");
    expect(adapter.setItem("SYNTHETIC_ONLY_KEY", "value").decision).toBe("blocked");
    expect(adapter.removeItem("SYNTHETIC_ONLY_KEY").decision).toBe("blocked");
  });

  it("reports the review blocker and safe summary", () => {
    const summary = evaluateLocalStorageResilienceAdapterReadiness();

    expect(summary.blockers).toContain(STORAGE_ADAPTER_DISABLED_REASON);
    expect(summary.realStorageTouched).toBe(false);
    expect(summary.dataMutationAllowed).toBe(false);
    expect(summary.safe).toBe(true);
  });
});
