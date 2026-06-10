import { describe, expect, it } from "vitest";
import { getProducerConfigStatus } from "./producer-config";

describe("getProducerConfigStatus", () => {
  it("reports missing fields when placeholders are set", () => {
    const status = getProducerConfigStatus();
    expect(status.complete).toBe(false);
    expect(status.missing).toContain("NEXT_PUBLIC_VERIFACTU_DEVELOPER_NIF");
  });
});
