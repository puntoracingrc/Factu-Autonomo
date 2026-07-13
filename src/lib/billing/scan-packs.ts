/** Escaneos extra comprables (pago único, no caducan al cambiar de mes). */
export const SCAN_PACK_SIZE = 10;

/**
 * Persistent Checkout provenance for the atomic fulfillment protocol.
 * Sessions without this exact marker predate the idempotent ledger and must
 * be reconciled manually instead of being credited automatically.
 */
export const SCAN_PACK_FULFILLMENT_CONTRACT = "scan_pack_atomic_v1";

/** Precio orientativo sin IVA; el cobro real lo define Stripe. */
export const SCAN_PACK_PRICE_EUR = 1.99;

export function formatScanPackPrice(amount = SCAN_PACK_PRICE_EUR): string {
  return `${amount.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

export function scanPackLabel(): string {
  return `${SCAN_PACK_SIZE} escaneos extra — ${formatScanPackPrice()} (+ IVA)`;
}
