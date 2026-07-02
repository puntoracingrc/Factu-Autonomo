import { describe, expect, it } from "vitest";
import {
  ageDaysFromIso,
  aiUnitsToScanCredits,
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
});
