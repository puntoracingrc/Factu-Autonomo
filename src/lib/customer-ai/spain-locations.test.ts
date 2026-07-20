import { describe, expect, it } from "vitest";
import {
  resolveSpanishMunicipality,
  SPAIN_MUNICIPALITIES_SOURCE,
  spanishMunicipalitiesByProvince,
  spanishMunicipalityCount,
} from "./spain-locations";

describe("Spanish municipality index", () => {
  it("contains the complete versioned INE 2026 municipality register", () => {
    expect(SPAIN_MUNICIPALITIES_SOURCE).toMatchObject({
      publisher: "Instituto Nacional de Estadística",
      referenceDate: "2026-01-01",
      municipalityCount: 8132,
    });
    expect(spanishMunicipalityCount()).toBe(8132);
    expect(Object.keys(spanishMunicipalitiesByProvince())).toHaveLength(52);
  });

  it("recognizes every official municipality inside its postal province", () => {
    for (const [provinceCode, municipalities] of Object.entries(
      spanishMunicipalitiesByProvince(),
    )) {
      for (const officialName of municipalities) {
        const resolution = resolveSpanishMunicipality(
          officialName,
          `${provinceCode}000`,
        );
        expect(resolution, `${provinceCode} ${officialName}`).not.toBeNull();
        expect(resolution?.provinceCode, `${provinceCode} ${officialName}`).toBe(
          provinceCode,
        );
        expect(
          ["exact", "corrected"],
          `${provinceCode} ${officialName}`,
        ).toContain(resolution?.status);
      }
    }
  });

  it.each([
    ["Barna", "08001", "Barcelona"],
    ["BCN", "08013", "Barcelona"],
    ["Madird", "28013", "Madrid"],
    ["Valenca", "46001", "València"],
    ["Bilbo", "48009", "Bilbao"],
    ["Donosti", "20001", "Donostia/San Sebastián"],
    ["Gasteiz", "01001", "Vitoria-Gasteiz"],
    ["Iruña", "31001", "Pamplona/Iruña"],
    ["Uvieu", "33001", "Oviedo"],
    ["Xixón", "33201", "Gijón"],
    ["Palma de Mallorca", "07001", "Palma"],
    ["Santiago de Compstela", "15701", "Santiago de Compostela"],
  ])("normalizes %s with unique geographical evidence", (input, postalCode, expected) => {
    expect(resolveSpanishMunicipality(input, postalCode)?.value).toBe(expected);
  });

  it("does not overcorrect ambiguous or contradictory place names", () => {
    expect(resolveSpanishMunicipality("Arroyomolinos")).toMatchObject({
      value: "Arroyomolinos",
      status: "unmatched",
    });
    expect(resolveSpanishMunicipality("Sada")).toMatchObject({
      value: "Sada",
      status: "unmatched",
    });
    expect(resolveSpanishMunicipality("Madrid", "08001")).toMatchObject({
      value: "Madrid",
      status: "conflict",
    });
    expect(resolveSpanishMunicipality("Madriz", "08001")).toMatchObject({
      value: "Madriz",
      status: "unmatched",
    });
    expect(resolveSpanishMunicipality("Viga")).toMatchObject({
      value: "Viga",
      status: "unmatched",
    });
  });
});
