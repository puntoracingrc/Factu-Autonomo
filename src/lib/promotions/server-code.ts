import { createHash, randomBytes } from "node:crypto";

export function hashPromoCode(code: string): string {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

export function generatePromoCode(): string {
  const value = randomBytes(12).toString("hex").toUpperCase();
  return `FACTU-${value.slice(0, 8)}-${value.slice(8, 16)}-${value.slice(16)}`;
}
