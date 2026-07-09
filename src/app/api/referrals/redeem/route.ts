import { NextResponse } from "next/server";
import { isBillingEnforced } from "@/lib/billing/config";
import { redeemReferralCode } from "@/lib/billing/referrals";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "referrals_redeem",
      limit: 10,
      windowMs: 60 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  if (!isBillingEnforced()) {
    return NextResponse.json({
      ok: true,
      bonusScans: 0,
      alreadyRedeemed: false,
      billingDisabled: true,
    });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "Introduce un código" }, { status: 400 });
  }

  const result = await redeemReferralCode(user.id, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    bonusScans: result.bonusScans,
    alreadyRedeemed: result.alreadyRedeemed ?? false,
  });
}
