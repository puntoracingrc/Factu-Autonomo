import { describe, expect, it } from "vitest";
import {
  ageDaysFromIso,
  aiUnitsToScanCredits,
  buildAdminAiUsageSnapshot,
  coerceAdminPlan,
  coerceAdminStatus,
  coerceNonNegativeInteger,
  dateOnlyFromIso,
  normalizeAdminDate,
  normalizeAdminAiCreditUnits,
  scanCreditsToAiUnits,
} from "./users";

describe("admin users helpers", () => {
  it("normaliza fechas para formularios y servidor", () => {
    expect(dateOnlyFromIso("2026-07-01T10:30:00.000Z")).toBe("2026-07-01");
    expect(normalizeAdminDate("2026-07-01")).toBe("2026-07-01T00:00:00.000Z");
    expect(normalizeAdminDate("nope")).toBeNull();
  });

  it("limita planes, estados y contadores a valores conocidos", () => {
    expect(coerceAdminPlan("pro")).toBe("pro");
    expect(coerceAdminPlan("enterprise")).toBe("free");
    expect(coerceAdminStatus("active")).toBe("active");
    expect(coerceAdminStatus("blocked")).toBe("inactive");
    expect(coerceNonNegativeInteger("12.9")).toBe(12);
    expect(coerceNonNegativeInteger("-3")).toBe(0);
  });

  it("calcula antiguedad en dias", () => {
    expect(
      ageDaysFromIso(
        "2026-06-01T00:00:00.000Z",
        new Date("2026-07-01T00:00:00.000Z"),
      ),
    ).toBe(30);
  });

  it("convierte creditos antiguos de escaneo a unidades IA", () => {
    expect(scanCreditsToAiUnits("3")).toBe(30);
    expect(aiUnitsToScanCredits(29)).toBe(2);
    expect(normalizeAdminAiCreditUnits("", 4)).toBe(40);
    expect(normalizeAdminAiCreditUnits(12, 4)).toBe(12);
    expect(normalizeAdminAiCreditUnits(0, 0)).toBe(0);
  });

  it("calcula el uso mensual de IA visible en admin", () => {
    const snapshot = buildAdminAiUsageSnapshot(
      {
        expense_scans_created: 2,
        customer_ai_autofills_created: 15,
      },
      { aiCreditUnits: 25, plan: "pro" },
      "2026-07",
    );

    expect(snapshot.monthlyIncludedUnits).toBe(300);
    expect(snapshot.monthlyUsedUnits).toBe(35);
    expect(snapshot.monthlyRemainingUnits).toBe(265);
    expect(snapshot.extraUnits).toBe(25);
    expect(snapshot.totalRemainingUnits).toBe(290);
    expect(snapshot.percentRemaining).toBe(88);
  });

  it("muestra IA mensual completa si el usuario aun no tiene uso del mes", () => {
    const snapshot = buildAdminAiUsageSnapshot(
      undefined,
      { aiCreditUnits: 0, plan: "pro" },
      "2026-07",
    );

    expect(snapshot.monthlyRemainingUnits).toBe(300);
    expect(snapshot.monthlyUsedUnits).toBe(0);
    expect(snapshot.percentRemaining).toBe(100);
  });

  it("calcula el uso mensual de IA de Pro+ con su cupo ampliado", () => {
    const snapshot = buildAdminAiUsageSnapshot(
      {
        expense_scans_created: 10,
      },
      { aiCreditUnits: 0, plan: "pro_plus" },
      "2026-07",
    );

    expect(snapshot.monthlyIncludedUnits).toBe(1500);
    expect(snapshot.monthlyUsedUnits).toBe(100);
    expect(snapshot.monthlyRemainingUnits).toBe(1400);
    expect(snapshot.percentRemaining).toBe(93);
  });
});
