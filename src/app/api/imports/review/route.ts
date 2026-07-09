import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isBillingEnforced } from "@/lib/billing/config";
import { getPlanLimits, type PlanId } from "@/lib/billing/plans";
import { fetchUserSubscriptionServer } from "@/lib/billing/server-repository";
import { consumeImportAiReview } from "@/lib/billing/scan-usage-server";
import { resolveEffectivePlan } from "@/lib/billing/subscription";
import {
  isImportAiReviewConfigured,
  normalizeImportAiReviewInput,
  reviewImportWithAi,
} from "@/lib/import-ai/review";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

async function canUseImportAi(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  if (!isBillingEnforced()) return { allowed: true };

  const subscription = await fetchUserSubscriptionServer(userId);
  const plan: PlanId = resolveEffectivePlan(subscription);
  const limits = getPlanLimits(plan);
  if (!limits.databaseImport || !limits.aiTextAutofill) {
    return {
      allowed: false,
      reason:
        "La revisión de importaciones con IA requiere plan Pro. Puedes revisar la previsualización normal sin usar IA.",
    };
  }

  return { allowed: true };
}

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });

  if (isBillingEnforced() && !user) {
    return NextResponse.json(
      { error: "Crea una cuenta e inicia sesión para usar la revisión IA." },
      { status: 401 },
    );
  }
  const rateLimit = checkRateLimit(
    request,
    {
      namespace: "imports_review",
      limit: 20,
      windowMs: 10 * 60_000,
    },
    user?.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const body = await request.json().catch(() => null);
  const input = normalizeImportAiReviewInput(body);
  if (!input) {
    return NextResponse.json(
      { error: "Falta una previsualización válida para revisar." },
      { status: 400 },
    );
  }

  const gate = user ? await canUseImportAi(user.id) : { allowed: true };
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.reason }, { status: 402 });
  }

  if (!isImportAiReviewConfigured()) {
    return NextResponse.json(
      { error: "La revisión IA no está configurada en el servidor." },
      { status: 503 },
    );
  }

  const userId = user?.id ?? "dev";
  const usage = await consumeImportAiReview(userId);
  const softUsageWarning =
    usage.allowed || usage.blockedByQuota ? undefined : usage.reason;
  if (!usage.allowed && usage.blockedByQuota) {
    return NextResponse.json(
      { error: usage.reason, quota: usage.quota },
      { status: 402 },
    );
  }

  const result = await reviewImportWithAi(input);
  if (result.error) {
    return NextResponse.json(
      { error: result.error, quota: usage.quota },
      { status: 422 },
    );
  }

  return NextResponse.json({
    data: result.data,
    quota: usage.quota,
    ...(softUsageWarning ? { usageWarning: softUsageWarning } : {}),
  });
}
