import type { FocusEvent } from "react";

function dropLeadingZeros(digits: string): string {
  if (digits.length <= 1) return digits;
  return digits.replace(/^0+/, "") || "0";
}

/** Permite solo dígitos y un separador decimal (coma o punto). */
export function sanitizeDecimalTyping(raw: string): string {
  const withDot = raw.replace(",", ".");
  let out = "";
  let dotSeen = false;

  for (const ch of withDot) {
    if (ch >= "0" && ch <= "9") out += ch;
    else if (ch === "." && !dotSeen) {
      out += ch;
      dotSeen = true;
    }
  }

  if (out.includes(".")) {
    const [whole, ...rest] = out.split(".");
    const fraction = rest.join("");
    const wholeNorm =
      whole.length === 0 ? "0" : dropLeadingZeros(whole) || "0";
    if (!fraction && out.endsWith(".")) return `${wholeNorm}.`;
    return fraction ? `${wholeNorm}.${fraction}` : wholeNorm;
  }

  return dropLeadingZeros(out);
}

export function parseDecimalInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === ".") return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function decimalInputFromNumber(value: number): string {
  if (!value) return "";
  return String(value);
}

export function selectInputOnFocus(event: FocusEvent<HTMLInputElement>): void {
  event.target.select();
}
