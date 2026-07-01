import { describe, expect, it } from "vitest";
import {
  ageDaysFromIso,
  coerceAdminPlan,
  coerceAdminStatus,
  coerceNonNegativeInteger,
  dateOnlyFromIso,
  normalizeAdminDate,
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
});

