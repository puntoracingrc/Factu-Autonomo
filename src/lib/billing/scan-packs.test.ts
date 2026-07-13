import { describe, expect, it } from "vitest";
import {
  hasAtomicScanPackFulfillmentProvenance,
  SCAN_PACK_ATOMIC_LEDGER_CUTOVER_UNIX,
  SCAN_PACK_FULFILLMENT_CONTRACT,
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

  it("solo acepta el contrato v1 después de activar el ledger atómico", () => {
    expect(
      hasAtomicScanPackFulfillmentProvenance({
        fulfillmentContract: SCAN_PACK_FULFILLMENT_CONTRACT,
        checkoutCreatedAt: SCAN_PACK_ATOMIC_LEDGER_CUTOVER_UNIX,
      }),
    ).toBe(true);
    expect(
      hasAtomicScanPackFulfillmentProvenance({
        fulfillmentContract: SCAN_PACK_FULFILLMENT_CONTRACT,
        checkoutCreatedAt: SCAN_PACK_ATOMIC_LEDGER_CUTOVER_UNIX - 1,
      }),
    ).toBe(false);
    expect(
      hasAtomicScanPackFulfillmentProvenance({
        fulfillmentContract: SCAN_PACK_FULFILLMENT_CONTRACT,
        checkoutCreatedAt: undefined,
      }),
    ).toBe(false);
    expect(
      hasAtomicScanPackFulfillmentProvenance({
        fulfillmentContract: "scan_pack_legacy",
        checkoutCreatedAt: SCAN_PACK_ATOMIC_LEDGER_CUTOVER_UNIX + 1,
      }),
    ).toBe(false);
  });
});
