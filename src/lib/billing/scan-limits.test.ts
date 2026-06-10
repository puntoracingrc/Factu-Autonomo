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

  it("asigna escaneos mensuales en pro", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    const q = buildScanQuota("pro", 3, 2, "2026-06");
    expect(q.limit).toBe(PRO_EXPENSE_SCANS_PER_MONTH);
    expect(q.remaining).toBe(PRO_EXPENSE_SCANS_PER_MONTH - 3);
    expect(q.bonusCredits).toBe(0);
    expect(q.period).toBe("month");
  });

  it("suma créditos extra comprados al cupo mensual", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    const q = buildScanQuota("pro", PRO_EXPENSE_SCANS_PER_MONTH, 2, "2026-06", 10);
    expect(q.remaining).toBe(10);
    expect(q.bonusCredits).toBe(10);
  });

  it("combina escaneos incluidos y extra", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    const q = buildScanQuota("pro", 27, 2, "2026-06", 5);
    expect(q.remaining).toBe(8);
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
    expect(scanBlockedMessage("pro")).toContain(String(PRO_EXPENSE_SCANS_PER_MONTH));
  });
});
