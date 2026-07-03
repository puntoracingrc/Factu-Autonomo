import { describe, expect, it } from "vitest";
import { areaQuantityFromDimensions, isAreaDocumentUnit } from "./area-calculation";

describe("area calculation", () => {
  it("calcula m2 con redondeo configurable", () => {
    expect(
      areaQuantityFromDimensions({
        width: 1.234,
        height: 2.345,
        roundingDecimals: 2,
      }),
    ).toBe(2.89);
  });

  it("detecta aliases de metro cuadrado", () => {
    expect(isAreaDocumentUnit("m²")).toBe(true);
    expect(isAreaDocumentUnit("M2")).toBe(true);
    expect(isAreaDocumentUnit("ml")).toBe(false);
  });
});
