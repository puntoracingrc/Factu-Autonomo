import { describe, expect, it } from "vitest";
import { FACTU_EMPTY_MESSAGES, FACTU_JOKES, pickFactuJoke } from "./copy";

describe("factu copy", () => {
  it("returns a known joke", () => {
    const joke = pickFactuJoke();
    expect(FACTU_JOKES).toContain(joke);
  });

  it("has empty messages for each section", () => {
    expect(FACTU_EMPTY_MESSAGES.factura.length).toBeGreaterThan(10);
    expect(FACTU_EMPTY_MESSAGES.cliente).toMatch(/cliente/i);
  });
});
