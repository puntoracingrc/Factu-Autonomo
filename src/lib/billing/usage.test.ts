import { describe, expect, it } from "vitest";
import { currentMonthKey } from "./usage";

describe("billing month", () => {
  it("genera la clave con calendario de Madrid", () => {
    expect(currentMonthKey(new Date("2026-03-15T12:00:00.000Z"))).toBe(
      "2026-03",
    );
  });

  it("respeta el cambio de mes aunque UTC siga en el día anterior", () => {
    expect(currentMonthKey(new Date("2026-04-30T22:30:00.000Z"))).toBe(
      "2026-05",
    );
  });
});
