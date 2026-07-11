const CONTACT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function normalizeContactEmail(email?: string | null): string {
  return email?.trim() ?? "";
}

export function normalizeContactPhone(phone?: string | null): string {
  return phone?.trim().replace(/\s+/g, " ") ?? "";
}

export function isValidContactEmail(email?: string | null): boolean {
  const value = normalizeContactEmail(email);
  if (!value) return true;
  return value.length <= 254 && CONTACT_EMAIL_PATTERN.test(value);
}
