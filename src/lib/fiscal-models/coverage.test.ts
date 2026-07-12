import { afterEach, describe, expect, it, vi } from "vitest";
import type { FiscalModelCoverageInput } from "./contracts";
import { calculateFiscalModelCoverage } from "./coverage";

const BASE_INPUT: FiscalModelCoverageInput = Object.freeze({
  taxYear: 2026,
  targetUnits: 2,
  validatedUnits: 2,
  pendingCriticalDiffs: 0,
  degradedUnits: 0,
  lastSuccessfulSyncAt: "2026-07-11T10:00:00+02:00",
  lastFiscalReviewAt: "2026-07-11T12:00:00+02:00",
  calculatedAt: "2026-07-12T10:00:00+02:00",
  freshnessThresholdMs: 7 * 24 * 60 * 60 * 1_000,
  sourceVerificationStatuses: ["VERIFIED", "VERIFIED"],
});

function calculate(overrides: Partial<FiscalModelCoverageInput> = {}) {
  return calculateFiscalModelCoverage({ ...BASE_INPUT, ...overrides });
}

function coverageStatus(result: ReturnType<typeof calculate>) {
  return result.status === "BLOCKED" ? undefined : result.data?.status;
}

describe("fiscal model coverage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts fail-closed when no unit, hash, or fiscal review is validated", () => {
    const result = calculate({
      validatedUnits: 0,
      lastSuccessfulSyncAt: null,
      lastFiscalReviewAt: null,
      sourceVerificationStatuses: ["HASH_PENDING", "HASH_PENDING"],
    });

    expect(result.status).toBe("MANUAL_REVIEW");
    expect(coverageStatus(result)).toBe("NO_COVERAGE");
    if (result.status === "MANUAL_REVIEW") {
      expect(result.reasons).toEqual([
        "SOURCE_HASH_PENDING",
        "FISCAL_REVIEW_MISSING",
        "COVERAGE_INCOMPLETE",
      ]);
      expect(result.data?.displayMessage).not.toContain("actualizada");
    }
  });

  it("reports partial coverage without promoting it to current", () => {
    const result = calculate({ validatedUnits: 1 });
    expect(result.status).toBe("MANUAL_REVIEW");
    expect(coverageStatus(result)).toBe("PARTIAL");
  });

  it("reports critical official changes and degraded sources", () => {
    const changed = calculate({
      pendingCriticalDiffs: 1,
      sourceVerificationStatuses: ["VERIFIED", "CHANGED"],
    });
    expect(changed.status).toBe("MANUAL_REVIEW");
    expect(coverageStatus(changed)).toBe("CHANGES_PENDING");

    const degraded = calculate({
      degradedUnits: 1,
      sourceVerificationStatuses: ["VERIFIED", "UNAVAILABLE"],
    });
    expect(degraded.status).toBe("MANUAL_REVIEW");
    expect(coverageStatus(degraded)).toBe("DEGRADED");
  });

  it("allows CURRENT only with complete review, verified sources, and fresh sync", () => {
    const result = calculate();
    expect(result.status).toBe("OK");
    expect(coverageStatus(result)).toBe("CURRENT");
    if (result.status === "OK") {
      expect(result.data.displayMessage).toContain(
        "2026-07-11T12:00:00+02:00",
      );
    }

    expect(
      coverageStatus(
        calculate({ sourceVerificationStatuses: ["VERIFIED", "HASH_PENDING"] }),
      ),
    ).toBe("PARTIAL");
    expect(coverageStatus(calculate({ lastFiscalReviewAt: null }))).toBe(
      "PARTIAL",
    );
    expect(
      coverageStatus(
        calculate({ lastSuccessfulSyncAt: "2026-06-01T10:00:00+02:00" }),
      ),
    ).toBe("DEGRADED");
  });

  it("rejects coerced, fractional, out-of-range, and inconsistent inputs", () => {
    expect(calculate({ taxYear: "2026" })).toEqual({
      status: "BLOCKED",
      reason: "INVALID_INPUT",
    });
    expect(calculate({ taxYear: 2025 })).toEqual({
      status: "BLOCKED",
      reason: "UNSUPPORTED_TAX_YEAR",
    });
    expect(calculate({ validatedUnits: 1.5 })).toEqual({
      status: "BLOCKED",
      reason: "INVALID_INPUT",
    });
    expect(calculate({ validatedUnits: 3 })).toEqual({
      status: "BLOCKED",
      reason: "INVALID_INPUT",
    });
    expect(calculate({ targetUnits: 10_001 })).toEqual({
      status: "BLOCKED",
      reason: "INVALID_INPUT",
    });
    expect(
      calculate({
        pendingCriticalDiffs: 3,
        sourceVerificationStatuses: ["CHANGED"],
      }),
    ).toEqual({ status: "BLOCKED", reason: "INVALID_INPUT" });
    expect(calculate({ freshnessThresholdMs: 367 * 24 * 60 * 60 * 1_000 })).toEqual(
      { status: "BLOCKED", reason: "INVALID_INPUT" },
    );
    expect(
      calculate({ lastFiscalReviewAt: "2026-07-13T10:00:00+02:00" }),
    ).toEqual({ status: "BLOCKED", reason: "INCONSISTENT_VERSION" });
  });

  it("rejects sparse or decorated source-status arrays", () => {
    const sparseStatuses = Array(2);
    const decoratedStatuses = ["VERIFIED"];
    Object.assign(decoratedStatuses, { unexpected: true });
    const accessorStatuses = ["VERIFIED"];
    Object.defineProperty(accessorStatuses, "0", {
      enumerable: true,
      get: () => {
        throw new Error("source-status accessors must not run");
      },
    });

    for (const sourceVerificationStatuses of [
      sparseStatuses,
      decoratedStatuses,
      accessorStatuses,
      ["VERIFIED", undefined],
      Array(10_001).fill("VERIFIED"),
    ]) {
      expect(calculate({ sourceVerificationStatuses })).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
      });
    }
  });

  it("rejects normalized calendar dates, hours, and offsets", () => {
    for (const calculatedAt of [
      "2026-02-29T10:00:00+02:00",
      "2026-02-30T10:00:00+02:00",
      "2026-04-31T10:00:00+02:00",
      "2026-07-12T24:00:00+02:00",
      "2026-07-12T10:00:00+14:30",
    ]) {
      expect(calculate({ calculatedAt })).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
      });
    }
  });

  it("blocks contradictory source states and counters", () => {
    for (const overrides of [
      { sourceVerificationStatuses: ["CHANGED"], pendingCriticalDiffs: 0 },
      { sourceVerificationStatuses: ["VERIFIED"], pendingCriticalDiffs: 1 },
      { sourceVerificationStatuses: ["UNAVAILABLE"], degradedUnits: 0 },
      { sourceVerificationStatuses: ["VERIFIED"], degradedUnits: 1 },
    ]) {
      expect(calculate(overrides)).toEqual({
        status: "BLOCKED",
        reason: "INCONSISTENT_VERSION",
      });
    }
  });

  it("keeps review reasons accurate for incomplete and stale evidence", () => {
    const none = calculate({ validatedUnits: 0 });
    expect(none.status).toBe("MANUAL_REVIEW");
    if (none.status === "MANUAL_REVIEW") {
      expect(none.reasons).toEqual(["COVERAGE_INCOMPLETE"]);
    }

    const partial = calculate({ validatedUnits: 1 });
    expect(partial.status).toBe("MANUAL_REVIEW");
    if (partial.status === "MANUAL_REVIEW") {
      expect(partial.reasons).toEqual(["COVERAGE_INCOMPLETE"]);
      expect(partial.reasons).not.toContain("FISCAL_REVIEW_MISSING");
    }

    const staleReview = calculate({
      lastSuccessfulSyncAt: "2026-07-11T12:00:00+02:00",
      lastFiscalReviewAt: "2026-07-11T10:00:00+02:00",
    });
    expect(coverageStatus(staleReview)).toBe("PARTIAL");
    if (staleReview.status === "MANUAL_REVIEW") {
      expect(staleReview.reasons).toContain("FISCAL_REVIEW_STALE");
    }

    const missingSync = calculate({ lastSuccessfulSyncAt: null });
    expect(coverageStatus(missingSync)).toBe("DEGRADED");
    if (missingSync.status === "MANUAL_REVIEW") {
      expect(missingSync.reasons).toContain("SOURCE_SYNC_MISSING");
    }
  });

  it("uses only the injected calculation timestamp and never Date.now", () => {
    vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("Date.now must not be used");
    });

    expect(calculate().status).toBe("OK");
  });

  it("freezes snapshots and review reasons", () => {
    const result = calculate({
      validatedUnits: 0,
      lastFiscalReviewAt: null,
      sourceVerificationStatuses: ["HASH_PENDING"],
    });

    expect(result.status).toBe("MANUAL_REVIEW");
    if (result.status === "MANUAL_REVIEW") {
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.data)).toBe(true);
      expect(Object.isFrozen(result.reasons)).toBe(true);
    }
  });
});
