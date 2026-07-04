import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { buildAiUsageMeter } from "@/lib/billing/scan-limits";
import { getExpenseScanQuota } from "@/lib/billing/scan-usage-server";

export async function GET(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const quota = await getExpenseScanQuota(user.id);
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
