import { describe, expect, it } from "vitest";
import {
  FACTU_AVISOS_EMPTY_MESSAGES,
  FACTU_EMPTY_MESSAGES,
  FACTU_JOKES,
  pickFactuAvisosEmptyMessages,
  pickFactuJoke,
} from "./copy";

describe("factu copy", () => {
  it("returns a known joke", () => {
    const joke = pickFactuJoke();
    expect(FACTU_JOKES).toContain(joke);
  });

  it("has empty messages for each section", () => {
    expect(FACTU_EMPTY_MESSAGES.factura.length).toBeGreaterThan(10);
    expect(FACTU_EMPTY_MESSAGES.cliente).toMatch(/cliente/i);
  });

  it("returns distinct avisos empty messages", () => {
    const messages = pickFactuAvisosEmptyMessages(3);
    expect(messages).toHaveLength(3);
    expect(new Set(messages).size).toBe(3);
    for (const message of messages) {
      expect(FACTU_AVISOS_EMPTY_MESSAGES).toContain(message);
    }
  });
});
