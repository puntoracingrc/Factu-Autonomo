import { NextResponse } from "next/server";
import { isBillingEnforced } from "@/lib/billing/config";
import {
  buildReferralShareUrl,
  getOrCreateReferralCode,
  getReferralStats,
} from "@/lib/billing/referrals";
import { REFERRAL_BONUS_SCANS } from "@/lib/billing/referral-codes";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

const PRIVATE_NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
} as const;

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_NO_STORE });
}

export async function GET(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return privateJson({ error: "No autorizado" }, 401);
  }
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "referrals_me",
      limit: 120,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  if (!isBillingEnforced()) {
    return privateJson({
      code: "DEV",
      shareUrl: buildReferralShareUrl(new URL(request.url).origin, "DEV"),
      bonusPerReferral: REFERRAL_BONUS_SCANS,
      registeredCount: 0,
      payingCount: 0,
      inactiveCount: 0,
      rewardedSubscribersCount: 0,
      rewardEventsCount: 0,
      scansEarned: 0,
      planCounts: [],
      hasRedeemed: false,
      billingDisabled: true,
    });
  }

  const code = await getOrCreateReferralCode(user.id);
  if (!code) {
    return privateJson({
      code: null,
      shareUrl: null,
      bonusPerReferral: REFERRAL_BONUS_SCANS,
      registeredCount: 0,
      payingCount: 0,
      inactiveCount: 0,
      rewardedSubscribersCount: 0,
      rewardEventsCount: 0,
      scansEarned: 0,
      planCounts: [],
      hasRedeemed: false,
      referralsUnavailable: true,
    });
  }

  const stats = await getReferralStats(user.id);
  const origin = new URL(request.url).origin;

  return privateJson({
    code,
    shareUrl: buildReferralShareUrl(origin, code),
    bonusPerReferral: REFERRAL_BONUS_SCANS,
    registeredCount: stats.registeredCount,
    payingCount: stats.payingCount,
    inactiveCount: stats.inactiveCount,
    rewardedSubscribersCount: stats.rewardedSubscribersCount,
    rewardEventsCount: stats.rewardEventsCount,
    scansEarned: stats.scansEarned,
    planCounts: stats.planCounts,
    hasRedeemed: stats.hasRedeemed,
  });
}
