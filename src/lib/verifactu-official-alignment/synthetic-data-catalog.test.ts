import { describe, expect, it } from "vitest";
import {
  OFFICIAL_SAFE_SYNTHETIC_DATA_CATALOG,
  OFFICIAL_SAFE_SYNTHETIC_DATA_GATE,
  officialSafeSyntheticDataForXml,
} from "./synthetic-data-catalog";

describe("OFFICIAL_SAFE_SYNTHETIC_DATA_CATALOG", () => {
  it("registra requisitos sinteticos sin valores XML usables", () => {
    expect(OFFICIAL_SAFE_SYNTHETIC_DATA_CATALOG.length).toBeGreaterThan(0);

    for (const entry of OFFICIAL_SAFE_SYNTHETIC_DATA_CATALOG) {
      expect(entry.syntheticOnly).toBe(true);
      expect(entry.source).toBe("blocked");
      expect(entry.usableForXml).toBe(false);
      expect(entry.value).toBeNull();
      expect(entry.reason).toContain("official");
    }
  });

  it("mantiene bloqueadas alta y anulacion", () => {
    expect(
      OFFICIAL_SAFE_SYNTHETIC_DATA_CATALOG.some(
        (entry) => entry.recordKind === "registro_alta",
      ),
    ).toBe(true);
    expect(
      OFFICIAL_SAFE_SYNTHETIC_DATA_CATALOG.some(
        (entry) => entry.recordKind === "registro_anulacion",
      ),
    ).toBe(true);
    expect(officialSafeSyntheticDataForXml()).toEqual([]);
  });

  it("publica una puerta bloqueada y no transportable a XML", () => {
    expect(OFFICIAL_SAFE_SYNTHETIC_DATA_GATE).toMatchObject({
      status: "blocked",
      syntheticOnly: true,
      usableForXml: false,
      completeAltaCaseAvailable: false,
      completeAnulacionCaseAvailable: false,
      blocker: "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
    });
  });
});
