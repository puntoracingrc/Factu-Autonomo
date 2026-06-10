import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildScanQuota,
  FREE_EXPENSE_SCAN_TRIAL,
  PRO_EXPENSE_SCANS_PER_MONTH,
  scanBlockedMessage,
} from "./scan-limits";

describe("scan limits", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("asigna 15 escaneos mensuales en pro", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    const q = buildScanQuota("pro", 3, 2, "2026-06");
    expect(q.limit).toBe(PRO_EXPENSE_SCANS_PER_MONTH);
    expect(q.remaining).toBe(12);
    expect(q.period).toBe("month");
  });

  it("usa escaneos de prueba en gratis", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    const q = buildScanQuota("free", 0, FREE_EXPENSE_SCAN_TRIAL, "2026-06");
    expect(q.remaining).toBe(2);
    expect(q.period).toBe("lifetime");
  });

  it("bloquea cuando se agotan", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    expect(scanBlockedMessage("free")).toContain("prueba");
    expect(scanBlockedMessage("pro")).toContain("15");
  });
});
