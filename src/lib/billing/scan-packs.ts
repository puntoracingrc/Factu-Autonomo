/** Escaneos extra comprables (pago único, no caducan al cambiar de mes). */
export const SCAN_PACK_SIZE = 10;

/**
 * Persistent Checkout provenance for the atomic fulfillment protocol.
 * Sessions without this exact marker predate the idempotent ledger and must
 * be reconciled manually instead of being credited automatically.
 */
export const SCAN_PACK_FULFILLMENT_CONTRACT = "scan_pack_atomic_v1";

/**
 * Conservative boundary after the atomic webhook was assigned to the
 * canonical domain and a later main deployment re-assigned it successfully.
 * PR #426 went live at 2026-07-13T01:20:54.494Z; PR #427 re-assigned a
 * descendant build at 2026-07-13T01:32:49.976Z. The 01:35 boundary also leaves
 * time for alias propagation and in-flight requests to finish.
 *
 * PR #424 started writing the v1 marker before PR #426 replaced the old
 * non-atomic worker. A v1 Checkout Session created before this boundary is
 * therefore ambiguous: the old worker may already have credited it without an
 * effect ledger. It must be reconciled manually, never auto-credited again.
 */
export const SCAN_PACK_ATOMIC_LEDGER_CUTOVER_UNIX = 1_783_906_500;

export function hasAtomicScanPackFulfillmentProvenance(input: {
  fulfillmentContract: string | null | undefined;
  checkoutCreatedAt: number | null | undefined;
}): boolean {
  return (
    input.fulfillmentContract === SCAN_PACK_FULFILLMENT_CONTRACT &&
    Number.isSafeInteger(input.checkoutCreatedAt) &&
    (input.checkoutCreatedAt ?? 0) >= SCAN_PACK_ATOMIC_LEDGER_CUTOVER_UNIX
  );
}

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
