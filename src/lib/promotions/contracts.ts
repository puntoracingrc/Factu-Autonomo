import type { PaidPlanId } from "@/lib/billing/plans";

export const PROMO_LIMITS = Object.freeze({
  maxNameLength: 80,
  maxCodeLength: 64,
  maxRedemptions: 100_000,
  maxScanCredits: 10_000,
  maxDurationDays: 365,
});

export type PromoCampaignStatus = "active" | "paused";

export type PromoBenefit =
  | { kind: "ai_scans"; scanCredits: number }
  | { kind: "plan_access"; plan: PaidPlanId; durationDays: number }
  | { kind: "module_access"; moduleKey: string; durationDays: number };

export interface PromoCampaignSummary {
  id: string;
  name: string;
  codeMasked: string;
  status: PromoCampaignStatus;
  benefit: PromoBenefit;
  startsAt: string;
  expiresAt: string;
  maxRedemptions: number;
  redeemedCount: number;
  createdAt: string;
}

export type PromoRedeemStatus =
  | "applied"
  | "invalid_code"
  | "inactive"
  | "not_started"
  | "expired"
  | "exhausted"
  | "already_redeemed"
  | "paid_plan_active"
  | "promo_plan_active"
  | "unsupported_module";

export const PROMO_MODULE_REGISTRY = Object.freeze([] as const);

export function normalizePromoCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  if (
    normalized.length < 8 ||
    normalized.length > PROMO_LIMITS.maxCodeLength ||
    !/^[A-Z0-9-]+$/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export function maskPromoCode(code: string): string {
  const normalized = normalizePromoCode(code);
  if (!normalized) return "****";
  return `FACTU-****-${normalized.slice(-4)}`;
}

function safeInteger(value: unknown, min: number, max: number): number | null {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max
    ? Number(value)
    : null;
}

export function parsePromoBenefit(value: unknown): PromoBenefit | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (input.kind === "ai_scans") {
    const scanCredits = safeInteger(
      input.scanCredits,
      1,
      PROMO_LIMITS.maxScanCredits,
    );
    return scanCredits ? { kind: "ai_scans", scanCredits } : null;
  }
  if (input.kind === "plan_access") {
    const durationDays = safeInteger(
      input.durationDays,
      1,
      PROMO_LIMITS.maxDurationDays,
    );
    const plan = input.plan === "pro" || input.plan === "pro_plus" ? input.plan : null;
    return plan && durationDays ? { kind: "plan_access", plan, durationDays } : null;
  }
  if (input.kind === "module_access") {
    const durationDays = safeInteger(
      input.durationDays,
      1,
      PROMO_LIMITS.maxDurationDays,
    );
    const moduleKey =
      typeof input.moduleKey === "string" &&
      (PROMO_MODULE_REGISTRY as readonly string[]).includes(input.moduleKey)
        ? input.moduleKey
        : null;
    return moduleKey && durationDays
      ? { kind: "module_access", moduleKey, durationDays }
      : null;
  }
  return null;
}

export function parsePromoCampaignInput(value: unknown): {
  name: string;
  benefit: PromoBenefit;
  startsAt: string;
  expiresAt: string;
  maxRedemptions: number;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const benefit = parsePromoBenefit(input.benefit);
  const startsAt = typeof input.startsAt === "string" ? input.startsAt : "";
  const expiresAt = typeof input.expiresAt === "string" ? input.expiresAt : "";
  const starts = new Date(startsAt);
  const expires = new Date(expiresAt);
  const maxRedemptions = safeInteger(
    input.maxRedemptions,
    1,
    PROMO_LIMITS.maxRedemptions,
  );
  if (
    name.length < 3 ||
    name.length > PROMO_LIMITS.maxNameLength ||
    !benefit ||
    !Number.isFinite(starts.getTime()) ||
    !Number.isFinite(expires.getTime()) ||
    expires <= starts ||
    !maxRedemptions
  ) {
    return null;
  }
  return {
    name,
    benefit,
    startsAt: starts.toISOString(),
    expiresAt: expires.toISOString(),
    maxRedemptions,
  };
}

export function promoRedeemMessage(status: PromoRedeemStatus): string {
  switch (status) {
    case "applied":
      return "Código aplicado correctamente.";
    case "already_redeemed":
      return "Este código ya se utilizó en tu cuenta.";
    case "paid_plan_active":
      return "Tu suscripción de pago ya está activa. Este código no modifica ni sustituye ese plan.";
    case "promo_plan_active":
      return "Ya tienes un acceso promocional activo.";
    case "inactive":
      return "Esta promoción está pausada.";
    case "not_started":
      return "Esta promoción todavía no ha comenzado.";
    case "expired":
      return "Este código ha caducado.";
    case "exhausted":
      return "Esta promoción ha alcanzado su límite de usos.";
    case "unsupported_module":
      return "El módulo asociado todavía no está disponible.";
    default:
      return "El código no es válido.";
  }
}
