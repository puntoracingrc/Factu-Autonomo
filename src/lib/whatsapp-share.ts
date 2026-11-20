import { normalizePhoneForWhatsApp } from "./whatsapp-phone";

export function buildWhatsAppChatUrl(phone: string, message: string) {
  const number = normalizePhoneForWhatsApp(phone) ?? "";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function canShareWhatsAppPdf(file: File): boolean {
  try {
    return typeof navigator.share === "function" &&
      Boolean(navigator.canShare?.({ files: [file] }));
  } catch {
    return false;
  }
}

export async function shareWhatsAppPdf(file: File): Promise<"shared" | "cancelled" | "unavailable"> {
  if (!canShareWhatsAppPdf(file)) return "unavailable";
  try {
    // Call from the tap with the ready file so the browser can open the
    // system share sheet while this gesture is still active.
    await navigator.share({ files: [file] });
    return "shared";
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError"
      ? "cancelled"
      : "unavailable";
  }
}
