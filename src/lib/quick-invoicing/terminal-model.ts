export const QUICK_TERMINAL_FLOW = "factu_quick_terminal_v1";
export const FAST_NFC_PACKAGE = "app.factu.fast.nfc";

/** An explicit Android package prevents another app claiming the URI scheme. */
export function quickTerminalIntent(grant: string): string {
  if (!/^[A-Za-z0-9_-]{43}$/.test(grant)) throw new Error("Acceso NFC no válido.");
  return `intent://collect#Intent;scheme=fastnfc;package=${FAST_NFC_PACKAGE};S.grant=${grant};end`;
}
