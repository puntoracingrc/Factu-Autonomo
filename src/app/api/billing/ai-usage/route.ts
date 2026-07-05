import { NextResponse } from "next/server";
import { aiLearningAccountForEmail } from "@/lib/ai-learning";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  buildAiUsageMeter,
  buildScanQuota,
  UNLIMITED_AI_CREDIT_UNITS,
} from "@/lib/billing/scan-limits";
import { getExpenseScanQuota } from "@/lib/billing/scan-usage-server";
import { currentMonthKey } from "@/lib/billing/usage";

function buildAiLearningTestQuota() {
  return buildScanQuota(
    "pro_plus",
    0,
    0,
    currentMonthKey(),
    0,
    0,
    UNLIMITED_AI_CREDIT_UNITS,
  );
}

export async function GET(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const quota = aiLearningAccountForEmail(user.email).allowed
    ? buildAiLearningTestQuota()
    : await getExpenseScanQuota(user.id);
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
