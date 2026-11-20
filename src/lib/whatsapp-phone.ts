export function normalizePhoneForWhatsApp(
  phone: string,
  defaultCountryCode = "34",
): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9) return null;

  if (trimmed.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.length === 9) return `${defaultCountryCode}${digits}`;
  if (digits.length >= 11 && digits.startsWith(defaultCountryCode)) return digits;
  return digits;
}
