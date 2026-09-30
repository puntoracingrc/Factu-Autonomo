import { NextResponse } from "next/server";
import { getCompanyRouteAuthFromBearer } from "@/lib/companies/server";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import { buildAiUsageMeter } from "@/lib/billing/scan-limits";
import { getExpenseScanQuota } from "@/lib/billing/scan-usage-server";
import {
  buildUnlimitedAiQuota,
  hasUnlimitedAiAccessForCompany,
} from "@/lib/billing/unlimited-ai-access";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export async function GET(request: Request) {
  const auth = await getCompanyRouteAuthFromBearer(
    request.headers.get("authorization"),
    request.headers.get(FACTU_COMPANY_HEADER),
  );
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "billing_ai_usage",
      limit: 120,
      windowMs: 10 * 60_000,
    },
    auth.actorUserId,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const unlimitedAiAccess = await hasUnlimitedAiAccessForCompany({
    user: { email: auth.userEmail ?? undefined },
    companyId: auth.companyId,
  });
  const quota = unlimitedAiAccess
    ? buildUnlimitedAiQuota()
    : await getExpenseScanQuota(auth.billingUserId);
  const meter = buildAiUsageMeter(quota);

  return NextResponse.json({
    meter,
    quota: {
      plan: quota.plan,
      period: quota.period,
      monthKey: quota.monthKey,
      limit: quota.limit,
      remaining: quota.remaining,
      bonusCredits: quota.bonusCredits,
      remainingUnits: quota.remainingUnits,
      unitScale: quota.unitScale,
    },
  });
}
