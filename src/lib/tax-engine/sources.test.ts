import { describe, expect, it } from "vitest";
import { EXPENSE_RULES } from "./rule-registry";
import { OFFICIAL_SOURCES } from "./sources";

describe("registro de fuentes oficiales", () => {
  it("solo usa autoridades y dominios oficiales", () => {
    for (const source of Object.values(OFFICIAL_SOURCES)) {
      expect(["BOE", "AEAT", "DGT"]).toContain(source.authority);
      expect(new URL(source.officialUrl).hostname).toMatch(
        /(?:boe\.es|agenciatributaria\.gob\.es|tributos\.hacienda\.gob\.es)$/,
      );
    }
  });

  it("no inventa fechas para consultas pendientes de reverificación", () => {
    for (const source of Object.values(OFFICIAL_SOURCES)) {
      if (source.verificationStatus === "PENDING_VERIFICATION") {
        expect(source.effectiveFrom).toBeNull();
      } else {
        expect(source.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("solo adjunta fuentes verificadas a reglas ejecutables", () => {
    for (const rule of EXPENSE_RULES) {
      expect(rule.officialSources.length).toBeGreaterThan(0);
      expect(
        rule.officialSources.every(
          (source) => source.verificationStatus === "VERIFIED",
        ),
      ).toBe(true);
    }
  });
});
