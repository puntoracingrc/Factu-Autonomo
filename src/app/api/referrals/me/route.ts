import { NextResponse } from "next/server";
import { isBillingEnforced } from "@/lib/billing/config";
import {
  buildReferralShareUrl,
  getOrCreateReferralCode,
  getReferralStats,
} from "@/lib/billing/referrals";
import { REFERRAL_BONUS_SCANS } from "@/lib/billing/referral-codes";
import { getUserFromBearer } from "@/lib/billing/server-auth";

export async function GET(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isBillingEnforced()) {
    return NextResponse.json({
      code: "DEV",
      shareUrl: buildReferralShareUrl(new URL(request.url).origin, "DEV"),
      bonusPerReferral: REFERRAL_BONUS_SCANS,
      referralsCount: 0,
      scansEarned: 0,
      hasRedeemed: false,
      billingDisabled: true,
    });
  }

  const code = await getOrCreateReferralCode(user.id);
  if (!code) {
    return NextResponse.json({
      code: null,
      shareUrl: null,
      bonusPerReferral: REFERRAL_BONUS_SCANS,
      referralsCount: 0,
      scansEarned: 0,
      hasRedeemed: false,
      referralsUnavailable: true,
    });
  }

  const stats = await getReferralStats(user.id);
  const origin = new URL(request.url).origin;

  return NextResponse.json({
    code,
    shareUrl: buildReferralShareUrl(origin, code),
    bonusPerReferral: REFERRAL_BONUS_SCANS,
    referralsCount: stats.referralsCount,
    scansEarned: stats.scansEarned,
    hasRedeemed: stats.hasRedeemed,
  });
}
