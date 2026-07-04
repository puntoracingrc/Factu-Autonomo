import { describe, expect, it } from "vitest";
import {
  buildManualHref,
  returnPathLabel,
  sanitizeReturnPath,
} from "./return-url";

describe("manual return url", () => {
  it("acepta rutas internas y rechaza externas", () => {
    expect(sanitizeReturnPath("/facturas")).toBe("/facturas");
    expect(sanitizeReturnPath("/facturas/abc")).toBe("/facturas/abc");
    expect(sanitizeReturnPath("//evil.com")).toBeNull();
    expect(sanitizeReturnPath("https://evil.com")).toBeNull();
    expect(sanitizeReturnPath("/ayuda/facturas")).toBeNull();
  });

  it("añade el parámetro from al enlace del manual", () => {
    expect(buildManualHref("/ayuda/facturas", "/facturas")).toBe(
      "/ayuda/facturas?from=%2Ffacturas",
    );
    expect(buildManualHref("/ayuda", null)).toBe("/ayuda");
  });

  it("etiqueta legible para volver", () => {
    expect(returnPathLabel("/facturas/nuevo")).toBe("Facturas");
    expect(returnPathLabel("/")).toBe("Panel");
  });
});
