import { describe, expect, it } from "vitest";
import { centralSyncFailureMessage, recordCentralSyncOutcome } from "./sync-health";

describe("central sync health", () => {
  it("removes a recovered device error after a verified event read", () => {
    const failed = recordCentralSyncOutcome({}, "device", { ok: false, message: "Device failed" });
    const recovered = recordCentralSyncOutcome(failed, "business", { ok: true });
    expect(centralSyncFailureMessage(recovered)).toBeNull();
  });

  it("does not hide a different failure, or equate export success with sync success", () => {
    const failures = { device: "Device failed", invoices: "Invoice cache failed", fiscal: "Fiscal failed" };
    const partial = recordCentralSyncOutcome(failures, "business", { ok: true });
    expect(partial).toEqual({ invoices: "Invoice cache failed", fiscal: "Fiscal failed" });
    const stillPartial = recordCentralSyncOutcome(partial, "invoices", { ok: true });
    expect(centralSyncFailureMessage(stillPartial)).toBe("Fiscal failed");
    expect(centralSyncFailureMessage(recordCentralSyncOutcome(stillPartial, "fiscal", { ok: true }))).toBeNull();
  });

  it("does not clear a device failure just because an auxiliary read succeeded", () => {
    expect(recordCentralSyncOutcome({ device: "Denied" }, "fiscal", { ok: true })).toEqual({ device: "Denied" });
  });

  it("does not publish new React state for healthy idle reads or repeated failures", () => {
    const empty = {};
    expect(recordCentralSyncOutcome(empty, "invoices", { ok: true })).toBe(empty);
    const failed = { invoices: "Failed" };
    expect(recordCentralSyncOutcome(failed, "invoices", { ok: false, message: "Failed" })).toBe(failed);
  });
});
