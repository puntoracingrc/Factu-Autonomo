import { formatMoney } from "@/lib/calculations";

const MAX_CENTS = BigInt(100_000_000_000);

export type CentsParseResult =
  | { ok: true; cents: number }
  | { ok: false; error: string };

export function parseEuroInputToCents(value: string): CentsParseResult {
  const trimmed = value.trim();
  if (trimmed.length > 16) {
    return { ok: false, error: "El importe supera el máximo permitido." };
  }
  const normalized = trimmed.replace(",", ".");
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) {
    return {
      ok: false,
      error: "Usa un importe positivo con un máximo de dos decimales.",
    };
  }
  const [eurosPart, centsPart = ""] = normalized.split(".");
  const cents =
    BigInt(eurosPart) * BigInt(100) +
    BigInt(centsPart.padEnd(2, "0") || "0");
  if (cents > MAX_CENTS) {
    return { ok: false, error: "El importe supera el máximo permitido." };
  }
  return { ok: true, cents: Number(cents) };
}

export function formatCents(cents: number): string {
  return formatMoney(cents / 100).replace(/\u00a0/g, " ");
}

export function centsToEuroInput(cents: number): string {
  if (!Number.isSafeInteger(cents)) return "";
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)},${String(absolute % 100).padStart(2, "0")}`;
}
