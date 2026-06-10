import { describe, expect, it } from "vitest";
import {
  SCAN_PACK_PRICE_EUR,
  SCAN_PACK_SIZE,
  formatScanPackPrice,
  scanPackLabel,
} from "./scan-packs";

describe("scan packs", () => {
  it("define tamaño y precio del pack", () => {
    expect(SCAN_PACK_SIZE).toBe(10);
    expect(SCAN_PACK_PRICE_EUR).toBeGreaterThan(0);
  });

  it("formatea el precio en español", () => {
    expect(formatScanPackPrice(1.99)).toContain("1,99");
  });

  it("genera etiqueta legible para la UI", () => {
    expect(scanPackLabel()).toContain("10 escaneos");
    expect(scanPackLabel()).toContain("1,99");
  });
});
