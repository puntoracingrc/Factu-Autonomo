import { describe, expect, it } from "vitest";
import {
  decimalInputFromNumber,
  parseDecimalInput,
  sanitizeDecimalTyping,
} from "./decimal-input";

describe("sanitizeDecimalTyping", () => {
  it("elimina ceros a la izquierda al escribir", () => {
    expect(sanitizeDecimalTyping("032")).toBe("32");
    expect(parseDecimalInput("32")).toBe(32);
  });

  it("permite decimales que empiezan en 0", () => {
    expect(sanitizeDecimalTyping("0.5")).toBe("0.5");
  });

  it("acepta coma decimal", () => {
    expect(sanitizeDecimalTyping("12,5")).toBe("12.5");
  });

  it("rechaza caracteres no numéricos", () => {
    expect(sanitizeDecimalTyping("1a2.3.4")).toBe("12.34");
  });
});

describe("parseDecimalInput", () => {
  it("vacío o punto suelto es 0", () => {
    expect(parseDecimalInput("")).toBe(0);
    expect(parseDecimalInput(".")).toBe(0);
  });

  it("parsea decimales", () => {
    expect(parseDecimalInput("96.8")).toBe(96.8);
  });
});

describe("decimalInputFromNumber", () => {
  it("0 se muestra vacío para no bloquear la escritura", () => {
    expect(decimalInputFromNumber(0)).toBe("");
    expect(decimalInputFromNumber(32)).toBe("32");
  });
});
