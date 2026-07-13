import type { Document } from "@/lib/types";

/**
 * A recovery claim is a permanent fail-closed boundary for protected actions.
 *
 * Consumers deliberately check presence rather than validity: an active,
 * rolled-back or malformed claim must never re-enable rendering, sharing or
 * document-state mutations by falling through to the ordinary app-issued path.
 */
export function hasAppIssuedRecoveryProtectionClaim(
  document: Pick<Document, "appIssuedRecoveryAttestation">,
): boolean {
  return document.appIssuedRecoveryAttestation !== undefined;
}
