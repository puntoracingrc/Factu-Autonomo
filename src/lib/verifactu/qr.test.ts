import { describe, expect, it } from "vitest";
import {
  buildQrUrl,
  formatQrAmount,
  formatQrDate,
  normalizeIssuerNif,
} from "./qr";

describe("verifactu qr", () => {
  it("formats date as DD-MM-AAAA", () => {
    expect(formatQrDate("2026-06-09")).toBe("09-06-2026");
  });

  it("formats amount with dot decimal", () => {
    expect(formatQrAmount(1234.5)).toBe("1234.50");
    expect(formatQrAmount(-8.38)).toBe("-8.38");
  });

  it("normalizes issuer NIF", () => {
    expect(normalizeIssuerNif(" 12345678z ")).toBe("12345678Z");
  });

  it("builds AEAT test QR URL with four params", () => {
    const url = buildQrUrl({
      nif: "12345678Z",
      numserie: "F-2026-0001",
      fecha: "2026-06-09",
      importe: 121,
      environment: "test",
    });
    expect(url).toContain("https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?");
    expect(url).toContain("nif=12345678Z");
    expect(url).toContain("numserie=F-2026-0001");
    expect(url).toContain("fecha=09-06-2026");
    expect(url).toContain("importe=121.00");
  });
});
