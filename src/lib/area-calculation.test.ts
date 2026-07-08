import { describe, expect, it } from "vitest";
import {
  areaQuantityFromDimensions,
  isAreaDocumentUnit,
  isLinearDocumentUnit,
  lineMeasurementDescriptionSuffix,
  linearQuantityFromMeasurement,
} from "./area-calculation";

describe("area calculation", () => {
  it("calcula m2 con redondeo configurable", () => {
    expect(
      areaQuantityFromDimensions({
        pieces: 2,
        width: 1.234,
        height: 2.345,
        roundingDecimals: 2,
      }),
    ).toBe(5.79);
  });

  it("calcula metros lineales con piezas", () => {
    expect(
      linearQuantityFromMeasurement({
        pieces: 2,
        length: 2.55,
        roundingDecimals: 2,
      }),
    ).toBe(5.1);
  });

  it("detecta aliases de metro cuadrado", () => {
    expect(isAreaDocumentUnit("m²")).toBe(true);
    expect(isAreaDocumentUnit("M2")).toBe(true);
    expect(isAreaDocumentUnit("ml")).toBe(false);
  });

  it("detecta metros lineales", () => {
    expect(isLinearDocumentUnit("ml")).toBe(true);
    expect(isLinearDocumentUnit("m")).toBe(true);
    expect(isLinearDocumentUnit("m2")).toBe(false);
  });

  it("genera una explicación legible para el documento", () => {
    expect(
      lineMeasurementDescriptionSuffix("m2", {
        pieces: 2,
        width: 1.2,
        height: 2.3,
      }),
    ).toBe("2 uds x 1,2 x 2,3 m = 5,52 m²");
    expect(
      lineMeasurementDescriptionSuffix("ml", { pieces: 2, length: 2.55 }),
    ).toBe("2 uds x 2,55 m = 5,1 ml");
  });
});
