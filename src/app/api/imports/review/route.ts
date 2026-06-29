import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isBillingEnforced } from "@/lib/billing/config";
import { getPlanLimits, type PlanId } from "@/lib/billing/plans";
import { fetchUserSubscriptionServer } from "@/lib/billing/server-repository";
import { consumeImportAiReview } from "@/lib/billing/scan-usage-server";
import { resolveEffectivePlan } from "@/lib/billing/subscription";
import {
  normalizeImportAiReviewInput,
  reviewImportWithAi,
} from "@/lib/import-ai/review";

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
  const user = await getUserFromBearer(request.headers.get("authorization"));

  if (isBillingEnforced() && !user) {
    return NextResponse.json(
      { error: "Crea una cuenta e inicia sesión para usar la revisión IA." },
      { status: 401 },
    );
  }

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

  const userId = user?.id ?? "dev";
  const usage = await consumeImportAiReview(userId);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: usage.reason, quota: usage.quota },
      { status: usage.blockedByQuota ? 402 : 503 },
    );
  }

  const result = await reviewImportWithAi(input);
  if (result.error) {
    return NextResponse.json(
      { error: result.error, quota: usage.quota },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: result.data, quota: usage.quota });
}
