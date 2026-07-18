/** Escaneos extra que reciben quien invita y quien se registra con su código. */
export const REFERRAL_BONUS_SCANS = 5;

export function normalizeReferralCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function buildReferralShareUrl(origin: string, code: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/cuenta?modo=crear&ref=${encodeURIComponent(code)}#inicio-sesion`;
}
