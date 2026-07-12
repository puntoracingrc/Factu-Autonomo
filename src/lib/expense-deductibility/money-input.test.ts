import { describe, expect, it } from "vitest";
import {
  centsToEuroInput,
  formatCents,
  parseEuroInputToCents,
} from "./money-input";

describe("parseEuroInputToCents", () => {
  it.each([
    ["0", 0],
    ["0,00", 0],
    ["1", 100],
    ["1,2", 120],
    ["1.23", 123],
    ["001,05", 105],
    [" 42,50 ", 4_250],
    ["123456789,87", 12_345_678_987],
    ["1000000000,00", 100_000_000_000],
  ])("convierte %s exactamente a %i céntimos", (value, expectedCents) => {
    expect(parseEuroInputToCents(value)).toEqual({
      ok: true,
      cents: expectedCents,
    });
  });

  it.each([
    "",
    "   ",
    "-1",
    "+1",
    ".50",
    ",50",
    "1,234",
    "1.2.3",
    "1e3",
    "NaN",
    "Infinity",
    "1 000,00",
    "1.000,00",
    "12 €",
  ])("rechaza la entrada no canónica %j", (value) => {
    const result = parseEuroInputToCents(value);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/máximo de dos decimales/i);
  });

  it("rechaza importes superiores al máximo sin perder precisión", () => {
    expect(parseEuroInputToCents("1000000000,01")).toEqual({
      ok: false,
      error: "El importe supera el máximo permitido.",
    });
  });

  it("rechaza texto desproporcionado antes de construir BigInt", () => {
    expect(parseEuroInputToCents("9".repeat(100_000))).toEqual({
      ok: false,
      error: "El importe supera el máximo permitido.",
    });
  });
});

describe("formatCents", () => {
  it.each([
    [0, "0,00 €"],
    [5, "0,05 €"],
    [105, "1,05 €"],
    [123_456, "1234,56 €"],
    [-123_456, "-1234,56 €"],
  ])("formatea %i como %s", (cents, expected) => {
    expect(formatCents(cents)).toBe(expected);
  });

  it("adapta céntimos canónicos al campo decimal sin perder precisión", () => {
    expect(centsToEuroInput(12_345_678_987)).toBe("123456789,87");
    expect(centsToEuroInput(-105)).toBe("-1,05");
  });
});
