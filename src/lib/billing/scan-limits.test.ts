import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AI_UNITS_PER_SCAN,
  buildAiUsageMeter,
  buildScanQuota,
  CUSTOMER_AI_AUTOFILL_UNITS,
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
    expect(q.remainingUnits).toBe((PRO_EXPENSE_SCANS_PER_MONTH - 3) * AI_UNITS_PER_SCAN);
    expect(q.bonusCredits).toBe(0);
    expect(q.period).toBe("month");
  });

  it("suma créditos extra comprados al cupo mensual", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    const q = buildScanQuota("pro", PRO_EXPENSE_SCANS_PER_MONTH, 2, "2026-06", 10);
    expect(q.remaining).toBe(10);
    expect(q.bonusCredits).toBe(10);
  });

  it("cobra el relleno de cliente como una decima parte de escaneo", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    const q = buildScanQuota("pro", 0, 2, "2026-06", 0, 9);
    expect(CUSTOMER_AI_AUTOFILL_UNITS).toBe(1);
    expect(q.remainingUnits).toBe(PRO_EXPENSE_SCANS_PER_MONTH * AI_UNITS_PER_SCAN - 9);
    expect(q.remaining).toBe(PRO_EXPENSE_SCANS_PER_MONTH - 1);
  });

  it("combina escaneos incluidos y extra", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    const q = buildScanQuota("pro", 27, 2, "2026-06", 5);
    expect(q.remaining).toBe(8);
  });

  it("muestra el saldo Pro como porcentaje de IA incluida", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    const q = buildScanQuota("pro", 15, 2, "2026-06");
    const meter = buildAiUsageMeter(q);

    expect(meter.mode).toBe("included");
    expect(meter.percentRemaining).toBe(50);
    expect(meter.scanEquivalentRemaining).toBe(15);
  });

  it("muestra una recarga extra cuando la IA incluida se agota", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    const q = buildScanQuota("pro", PRO_EXPENSE_SCANS_PER_MONTH, 2, "2026-06", 10);
    const meter = buildAiUsageMeter(q);

    expect(meter.mode).toBe("extra");
    expect(meter.percentRemaining).toBe(100);
    expect(meter.scanEquivalentRemaining).toBe(10);
  });

  it("marca el saldo IA como agotado sin incluida ni recarga", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    const q = buildScanQuota("pro", PRO_EXPENSE_SCANS_PER_MONTH, 2, "2026-06");
    const meter = buildAiUsageMeter(q);

    expect(meter.mode).toBe("empty");
    expect(meter.percentRemaining).toBe(0);
    expect(meter.smallUseEquivalentRemaining).toBe(0);
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
