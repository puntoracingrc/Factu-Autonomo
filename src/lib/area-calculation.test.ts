import { describe, expect, it } from "vitest";
import {
  areaQuantityFromDimensions,
  isAreaDocumentUnit,
  isLinearDocumentUnit,
  isVolumeDocumentUnit,
  lineMeasurementDescriptionSuffix,
  linearQuantityFromMeasurement,
  measurementQuantityForUnit,
  resolveLineMeasurementKind,
  volumeQuantityFromDimensions,
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

  it("calcula metros cúbicos con piezas y tres dimensiones", () => {
    expect(
      volumeQuantityFromDimensions({
        pieces: 2,
        length: 1.5,
        width: 0.5,
        height: 0.4,
        roundingDecimals: 3,
      }),
    ).toBe(0.6);
    expect(isVolumeDocumentUnit("m³")).toBe(true);
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
    ).toBe("2 uds x 1,2 x 2,3 m ≈ 5,52 m²");
    expect(
      lineMeasurementDescriptionSuffix("ml", { pieces: 2, length: 2.55 }),
    ).toBe("2 uds x 2,55 m ≈ 5,1 ml");
    expect(
      lineMeasurementDescriptionSuffix("m3", {
        kind: "volume",
        pieces: 2,
        length: 1.5,
        width: 0.5,
        height: 0.4,
        roundingDecimals: 3,
      }),
    ).toBe("2 uds x 1,5 x 0,5 x 0,4 m ≈ 0,6 m³");
  });

  it.each([0, 1, 2, 3, 4])(
    "mantiene operandos precisos y marca como aproximado el redondeo %i",
    (roundingDecimals) => {
      const linear = lineMeasurementDescriptionSuffix("m", {
        kind: "linear",
        pieces: 3,
        length: 1.2345,
        roundingDecimals,
      });
      const area = lineMeasurementDescriptionSuffix("m2", {
        kind: "area",
        pieces: 2,
        width: 1.234,
        height: 2.345,
        roundingDecimals,
      });
      const volume = lineMeasurementDescriptionSuffix("m3", {
        kind: "volume",
        pieces: 2,
        length: 1.2345,
        width: 2.3456,
        height: 0.6789,
        roundingDecimals,
      });

      expect(linear).toContain("3 uds x 1,2345 m ≈");
      expect(area).toContain("2 uds x 1,234 x 2,345 m ≈");
      expect(volume).toContain("2 uds x 1,2345 x 2,3456 x 0,6789 m ≈");
    },
  );

  it("separa la fórmula de la unidad sin romper borradores antiguos", () => {
    expect(resolveLineMeasurementKind("m2", { kind: "none" })).toBe("none");
    expect(
      measurementQuantityForUnit("m2", {
        kind: "none",
        pieces: 2,
        width: 1.2,
        height: 2.3,
      }),
    ).toBe(0);
    expect(
      lineMeasurementDescriptionSuffix("m2", {
        kind: "none",
        pieces: 2,
        width: 1.2,
        height: 2.3,
      }),
    ).toBeNull();

    expect(resolveLineMeasurementKind("m2", { width: 1, height: 2 })).toBe(
      "area",
    );
    expect(
      measurementQuantityForUnit("m2", {
        pieces: 2,
        width: 1.2,
        height: 2.3,
      }),
    ).toBe(5.52);
  });
});
