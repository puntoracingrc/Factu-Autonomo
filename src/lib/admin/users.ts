import type { User } from "@supabase/supabase-js";
import type { PlanId } from "@/lib/billing/plans";
import type { SubscriptionStatus } from "@/lib/billing/subscription";

export const ADMIN_PLAN_OPTIONS: PlanId[] = ["free", "trial", "pro"];
export const ADMIN_STATUS_OPTIONS: SubscriptionStatus[] = [
  "inactive",
  "trialing",
  "active",
  "past_due",
  "canceled",
];

export interface AdminSubscriptionSnapshot {
  plan: PlanId;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  scanTrialRemaining: number;
  scanCredits: number;
  aiCreditUnits: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminPaymentSnapshot {
  count: number;
  totalCents: number;
  latestPaidAt: string | null;
  latestDescription: string | null;
}

export interface AdminBanSnapshot {
  banned: boolean;
  bannedAt: string | null;
  reason: string | null;
}

export interface AdminUserRow {
  id: string;
  email: string;
  provider: string;
  createdAt: string | null;
  lastSignInAt: string | null;
  ageDays: number | null;
  subscription: AdminSubscriptionSnapshot;
  payments: AdminPaymentSnapshot;
  ban: AdminBanSnapshot;
}

export function normalizeAdminDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function dateOnlyFromIso(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function ageDaysFromIso(value: string | null, now = new Date()): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

export function providerLabel(user: Pick<User, "app_metadata">): string {
  const provider = user.app_metadata?.provider;
  if (typeof provider === "string" && provider.trim()) return provider;
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.length > 0) {
    return providers.filter((item) => typeof item === "string").join(", ");
  }
  return "email";
}

export function emptySubscription(userId: string): AdminSubscriptionSnapshot {
  void userId;
  return {
    plan: "free",
    status: "inactive",
    trialEndsAt: null,
    currentPeriodEnd: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    scanTrialRemaining: 0,
    scanCredits: 0,
    aiCreditUnits: 0,
    createdAt: null,
    updatedAt: null,
  };
}

export function coerceAdminPlan(value: unknown): PlanId {
  return ADMIN_PLAN_OPTIONS.includes(value as PlanId) ? (value as PlanId) : "free";
}

export function coerceAdminStatus(value: unknown): SubscriptionStatus {
  return ADMIN_STATUS_OPTIONS.includes(value as SubscriptionStatus)
    ? (value as SubscriptionStatus)
    : "inactive";
}

export function coerceNonNegativeInteger(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric));
}

