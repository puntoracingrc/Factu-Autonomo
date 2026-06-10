/** Escaneos extra comprables (pago único, no caducan al cambiar de mes). */
export const SCAN_PACK_SIZE = 10;

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
