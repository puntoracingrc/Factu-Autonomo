export const PENDING_REFERRAL_STORAGE_KEY = "fa_pending_referral_code";

export function storePendingReferralCode(code: string): void {
  if (typeof window === "undefined") return;
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.length < 6) return;
  window.localStorage.setItem(PENDING_REFERRAL_STORAGE_KEY, normalized);
}

export function readPendingReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(PENDING_REFERRAL_STORAGE_KEY);
  if (!value) return null;
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized.length >= 6 ? normalized : null;
}

export function clearPendingReferralCode(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_REFERRAL_STORAGE_KEY);
}

export function captureReferralFromSearchParams(
  searchParams: URLSearchParams | { get(name: string): string | null },
): void {
  const ref = searchParams.get("ref") ?? searchParams.get("referral");
  if (ref) storePendingReferralCode(ref);
}
