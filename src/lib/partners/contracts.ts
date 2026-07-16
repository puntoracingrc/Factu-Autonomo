import type { PlanId } from "@/lib/billing/plans";

export const PARTNER_COMMISSION_BPS = 1000;
export const PARTNER_PAYOUT_THRESHOLD_CENTS = 6000;
export const PARTNER_MAX_ACCOUNTS = 250;
export const PARTNER_MAX_REFERRALS = 10_000;

export type PartnerAccountStatus = "active" | "paused";
export type PartnerAccessRole = "admin" | "partner";
export type PartnerCommissionStatus =
  | "pending"
  | "available"
  | "paid"
  | "reversed";
export type PartnerPayoutStatus = "draft" | "approved" | "paid" | "canceled";

export interface PartnerPayoutProfile {
  holderName: string;
  ibanMasked: string | null;
  configured: boolean;
  updatedAt: string | null;
}

export interface PartnerAccountSummary {
  userId: string;
  email: string;
  status: PartnerAccountStatus;
  commissionBps: number;
  payoutThresholdCents: number;
  payoutProfile: PartnerPayoutProfile;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerPlanCount {
  plan: PlanId;
  label: string;
  registered: number;
  paying: number;
}

export interface PartnerCommissionSummary {
  pendingCents: number;
  availableCents: number;
  paidCents: number;
  reversedCents: number;
  thresholdCents: number;
  eligibleForPayout: boolean;
  automaticAccrualEnabled: false;
}

export interface PartnerCommissionEntryView {
  id: string;
  plan: "pro" | "pro_plus";
  sourceAmountCents: number;
  commissionCents: number;
  status: PartnerCommissionStatus;
  earnedAt: string;
  availableAt: string | null;
  paidAt: string | null;
}

export interface PartnerPayoutView {
  id: string;
  amountCents: number;
  status: PartnerPayoutStatus;
  createdAt: string;
  paidAt: string | null;
}

export interface PartnerDashboard {
  role: PartnerAccessRole;
  account: PartnerAccountSummary | null;
  referral: {
    code: string | null;
    shareUrl: string | null;
    registeredCount: number;
    payingCount: number;
    inactiveCount: number;
    planCounts: readonly PartnerPlanCount[];
    paidModules: readonly [];
  };
  commissions: PartnerCommissionSummary;
  recentCommissions: readonly PartnerCommissionEntryView[];
  recentPayouts: readonly PartnerPayoutView[];
}

export interface AdminPartnerRow extends PartnerAccountSummary {
  registeredCount: number;
  payingCount: number;
  availableCents: number;
  paidCents: number;
}

export interface PartnerPayoutInput {
  holderName?: unknown;
  iban?: unknown;
}

export type PartnerPayoutValidation =
  | { ok: true; holderName: string; iban: string }
  | { ok: false; error: string; field: "holderName" | "iban" };

export function normalizePartnerEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
}

export function normalizeIban(value: unknown): string {
  return typeof value === "string"
    ? value.toUpperCase().replace(/[^A-Z0-9]/g, "")
    : "";
}

export function isValidIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;

  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  let remainder = 0;
  for (const character of rearranged) {
    const expanded = /[A-Z]/.test(character)
      ? String(character.charCodeAt(0) - 55)
      : character;
    for (const digit of expanded) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

export function validatePartnerPayoutInput(
  input: PartnerPayoutInput,
): PartnerPayoutValidation {
  const holderName =
    typeof input.holderName === "string" ? input.holderName.trim() : "";
  if (!holderName || holderName.length > 160) {
    return {
      ok: false,
      error: "Indica el titular de la cuenta (máximo 160 caracteres).",
      field: "holderName",
    };
  }

  const iban = normalizeIban(input.iban);
  if (!isValidIban(iban)) {
    return { ok: false, error: "El IBAN no es válido.", field: "iban" };
  }
  return { ok: true, holderName, iban };
}

export function maskPartnerIban(value: unknown): string | null {
  const iban = normalizeIban(value);
  if (!iban) return null;
  return `${iban.slice(0, 4)} •••• •••• •••• ${iban.slice(-4)}`;
}

export function calculatePartnerCommissionCents(
  sourceAmountCents: number,
  commissionBps = PARTNER_COMMISSION_BPS,
): number {
  if (!Number.isSafeInteger(sourceAmountCents) || sourceAmountCents < 0) {
    throw new Error("sourceAmountCents debe ser un entero no negativo");
  }
  if (!Number.isSafeInteger(commissionBps) || commissionBps < 0 || commissionBps > 10_000) {
    throw new Error("commissionBps no válido");
  }
  return Math.floor((sourceAmountCents * commissionBps) / 10_000);
}

export function isPayingPartnerSubscription(input: {
  plan: unknown;
  status: unknown;
  currentPeriodEnd?: unknown;
}, now = new Date()): boolean {
  if (input.plan !== "pro" && input.plan !== "pro_plus") return false;
  if (input.status !== "active") return false;
  if (typeof input.currentPeriodEnd === "string") {
    const end = new Date(input.currentPeriodEnd);
    if (!Number.isFinite(end.getTime()) || end < now) return false;
  }
  return true;
}
