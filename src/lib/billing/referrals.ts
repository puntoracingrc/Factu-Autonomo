import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PLANS, type PlanId } from "./plans";
import { normalizeReferralCode } from "./referral-codes";

export {
  REFERRAL_BONUS_SCANS,
  buildReferralShareUrl,
  normalizeReferralCode,
} from "./referral-codes";

export function generateReferralCodeValue(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += alphabet[bytes[i]! % alphabet.length];
  }
  return code;
}

function isMissingReferralSchemaError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "42P01" ||
    /relation .*referral_(codes|redemptions).* does not exist/i.test(message)
  );
}

export async function getOrCreateReferralCode(
  userId: string,
  adminOverride?: SupabaseClient,
): Promise<string | null> {
  const admin = adminOverride ?? getSupabaseAdmin();
  if (!admin) return null;

  const { data: existing, error: existingError } = await admin
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();

  if (isMissingReferralSchemaError(existingError)) return null;
  if (existing?.code) return String(existing.code);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCodeValue();
    const { error } = await admin.from("referral_codes").insert({
      user_id: userId,
      code,
    });
    if (isMissingReferralSchemaError(error)) return null;
    if (!error) return code;
  }

  return null;
}

export type ReferralProgram = "affiliate" | "partner";

async function findReferrer(
  code: string,
  admin: SupabaseClient,
): Promise<{ userId: string; program: ReferralProgram } | null> {

  const normalized = normalizeReferralCode(code);
  if (normalized.length < 6) return null;

  const { data } = await admin
    .from("referral_codes")
    .select("user_id, code")
    .ilike("code", normalized)
    .maybeSingle();

  if (!data?.user_id) return null;
  const userId = String(data.user_id);
  const { data: partner, error: partnerError } = await admin
    .from("partner_accounts")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  if (partnerError) throw new Error("Referral program lookup failed");
  return {
    userId,
    program: partner?.status === "active" ? "partner" : "affiliate",
  };
}

export type ReferralRedeemResult =
  | {
      ok: true;
      bonusScans: number;
      program: ReferralProgram;
      alreadyRedeemed?: boolean;
    }
  | { ok: false; error: string };

export async function redeemReferralCode(
  refereeUserId: string,
  rawCode: string,
): Promise<ReferralRedeemResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: "El servidor de referidos no está disponible." };
  }

  const code = normalizeReferralCode(rawCode);
  if (code.length < 6) {
    return { ok: false, error: "Código de invitación no válido." };
  }

  const { data: existingRedemption } = await admin
    .from("referral_redemptions")
    .select("id,program")
    .eq("referee_user_id", refereeUserId)
    .maybeSingle();

  if (existingRedemption) {
    return {
      ok: true,
      bonusScans: 0,
      program:
        existingRedemption.program === "partner" ? "partner" : "affiliate",
      alreadyRedeemed: true,
    };
  }

  const referrer = await findReferrer(code, admin);
  if (!referrer) {
    return { ok: false, error: "No encontramos ese código de invitación." };
  }

  if (referrer.userId === refereeUserId) {
    return { ok: false, error: "No puedes usar tu propio código de invitación." };
  }

  const { error: insertError } = await admin.from("referral_redemptions").insert({
    referrer_user_id: referrer.userId,
    referee_user_id: refereeUserId,
    referral_code: code,
    program: referrer.program,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        ok: true,
        bonusScans: 0,
        program: referrer.program,
        alreadyRedeemed: true,
      };
    }
    return { ok: false, error: "No se pudo aplicar la invitación." };
  }

  // Attribution never grants value. Affiliate rewards are created only by the
  // signed Stripe invoice.paid flow; Partner rewards use their own ledger.
  return { ok: true, bonusScans: 0, program: referrer.program };
}

interface ReferralSubscriptionRow {
  user_id: string;
  plan: unknown;
  status: unknown;
  stripe_subscription_id: unknown;
  current_period_end: unknown;
}

interface AffiliateRewardRow {
  referee_user_id: string;
  scan_credits_per_user: unknown;
}

export interface ReferralPlanCount {
  plan: PlanId;
  label: string;
  count: number;
  paying: number;
}

export interface ReferralStats {
  registeredCount: number;
  payingCount: number;
  inactiveCount: number;
  rewardedSubscribersCount: number;
  rewardEventsCount: number;
  scansEarned: number;
  hasRedeemed: boolean;
  planCounts: ReferralPlanCount[];
}

const REFERRAL_STATS_LIMIT = 10_000;
const PLAN_ORDER: readonly PlanId[] = ["free", "trial", "pro", "pro_plus"];

function safePlan(value: unknown): PlanId {
  return value === "trial" || value === "pro" || value === "pro_plus"
    ? value
    : "free";
}

function isPayingSubscription(
  row: ReferralSubscriptionRow | undefined,
  now: Date,
): boolean {
  if (!row) return false;
  const plan = safePlan(row.plan);
  if (plan !== "pro" && plan !== "pro_plus") return false;
  if (row.status !== "active" || typeof row.stripe_subscription_id !== "string") {
    return false;
  }
  if (typeof row.current_period_end !== "string") return true;
  const periodEnd = new Date(row.current_period_end);
  return !Number.isNaN(periodEnd.getTime()) && periodEnd >= now;
}

export function summarizeReferralStats(
  refereeUserIds: readonly string[],
  subscriptions: readonly ReferralSubscriptionRow[],
  rewards: readonly AffiliateRewardRow[],
  hasRedeemed: boolean,
  now = new Date(),
): ReferralStats {
  const uniqueReferees = [...new Set(refereeUserIds)];
  const subscriptionByUser = new Map(
    subscriptions.map((row) => [row.user_id, row]),
  );
  const planCounts = PLAN_ORDER.map((plan) => ({
    plan,
    label: PLANS[plan].name,
    count: 0,
    paying: 0,
  }));
  let payingCount = 0;
  for (const refereeUserId of uniqueReferees) {
    const subscription = subscriptionByUser.get(refereeUserId);
    const plan = safePlan(subscription?.plan);
    const count = planCounts.find((entry) => entry.plan === plan)!;
    count.count += 1;
    if (isPayingSubscription(subscription, now)) {
      payingCount += 1;
      count.paying += 1;
    }
  }
  const scansEarned = rewards.reduce((total, reward) => {
    const credits = Number(reward.scan_credits_per_user);
    return total + (Number.isSafeInteger(credits) && credits > 0 ? credits : 0);
  }, 0);

  return {
    registeredCount: uniqueReferees.length,
    payingCount,
    inactiveCount: uniqueReferees.length - payingCount,
    rewardedSubscribersCount: new Set(
      rewards.map((reward) => reward.referee_user_id),
    ).size,
    rewardEventsCount: rewards.length,
    scansEarned,
    hasRedeemed,
    planCounts,
  };
}

export async function getReferralStats(
  userId: string,
  adminOverride?: SupabaseClient,
): Promise<ReferralStats> {
  const admin = adminOverride ?? getSupabaseAdmin();
  if (!admin) {
    return summarizeReferralStats([], [], [], false);
  }

  const { data: referrals, error: referralsError } = await admin
    .from("referral_redemptions")
    .select("referee_user_id")
    .eq("referrer_user_id", userId)
    .eq("program", "affiliate")
    .limit(REFERRAL_STATS_LIMIT);
  if (referralsError) throw new Error("Referral stats unavailable");
  const refereeUserIds = (referrals ?? []).map((row) =>
    String(row.referee_user_id),
  );

  const subscriptionsResult =
    refereeUserIds.length === 0
      ? { data: [] as ReferralSubscriptionRow[], error: null }
      : await admin
          .from("user_subscriptions")
          .select(
            "user_id,plan,status,stripe_subscription_id,current_period_end",
          )
          .in("user_id", refereeUserIds)
          .limit(REFERRAL_STATS_LIMIT);
  if (subscriptionsResult.error) throw new Error("Referral stats unavailable");

  const { data: rewards, error: rewardsError } = await admin
    .from("affiliate_reward_entries")
    .select("referee_user_id,scan_credits_per_user")
    .eq("referrer_user_id", userId)
    .order("paid_at", { ascending: false })
    .limit(REFERRAL_STATS_LIMIT);
  if (rewardsError) throw new Error("Referral stats unavailable");

  const { data: redeemed, error: redeemedError } = await admin
    .from("referral_redemptions")
    .select("id")
    .eq("referee_user_id", userId)
    .maybeSingle();
  if (redeemedError) throw new Error("Referral stats unavailable");

  return summarizeReferralStats(
    refereeUserIds,
    (subscriptionsResult.data ?? []) as ReferralSubscriptionRow[],
    (rewards ?? []) as AffiliateRewardRow[],
    Boolean(redeemed),
  );
}
