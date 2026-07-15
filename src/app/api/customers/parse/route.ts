import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isBillingEnforced } from "@/lib/billing/config";
import { getPlanLimits, type PlanId } from "@/lib/billing/plans";
import { fetchUserSubscriptionServer } from "@/lib/billing/server-repository";
import { consumeCustomerAiAutofill } from "@/lib/billing/scan-usage-server";
import {
  hasUnlimitedAiAccess,
  unlimitedAiUsageResult,
} from "@/lib/billing/unlimited-ai-access";
import { resolveEffectivePlan } from "@/lib/billing/subscription";
import { enrichCustomerPostalCode } from "@/lib/customer-ai/geocoding";
import { extractCustomerFromText } from "@/lib/customer-ai/openai";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { isAiRouteAuthenticationRequired } from "@/lib/server/ai-route-auth-policy";
import { readJsonBody } from "@/lib/server/request-body";

async function canUseCustomerAi(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  if (!isBillingEnforced()) return { allowed: true };

  const subscription = await fetchUserSubscriptionServer(userId);
  const plan: PlanId = resolveEffectivePlan(subscription);
  if (!getPlanLimits(plan).aiTextAutofill) {
    return {
      allowed: false,
      reason:
        "El autorrelleno con IA requiere plan Pro. Ve a Precios para activarlo.",
    };
  }

  return { allowed: true };
}

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });

  if (isAiRouteAuthenticationRequired(request) && !user) {
    return NextResponse.json(
      {
        error: "Crea una cuenta e inicia sesión para usar el autorrelleno IA.",
      },
      { status: 401 },
    );
  }
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "customers_parse",
      limit: 30,
      windowMs: 10 * 60_000,
    },
    user?.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const unlimitedAccess = hasUnlimitedAiAccess(user);
  const gate =
    user && !unlimitedAccess
      ? await canUseCustomerAi(user.id)
      : { allowed: true };
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.reason }, { status: 402 });
  }

  const bodyResult = await readJsonBody<{
    text?: unknown;
  }>(request, {
    maxBytes: 8 * 1024,
    invalidMessage: "Petición no válida.",
  });
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (text.length < 10) {
    return NextResponse.json(
      { error: "Pega al menos una línea con datos de facturación." },
      { status: 400 },
    );
  }

  if (text.length > 4000) {
    return NextResponse.json(
      {
        error: "El texto es demasiado largo. Usa como máximo 4.000 caracteres.",
      },
      { status: 400 },
    );
  }

  const userId = user?.id ?? "dev";
  const usage = unlimitedAccess
    ? unlimitedAiUsageResult()
    : await consumeCustomerAiAutofill(userId);
  const softUsageWarning =
    usage.allowed || usage.blockedByQuota ? undefined : usage.reason;
  if (!usage.allowed && usage.blockedByQuota) {
    return NextResponse.json(
      { error: usage.reason, quota: usage.quota },
      { status: 402 },
    );
  }

  const result = await extractCustomerFromText(text);
  if (result.error) {
    return NextResponse.json(
      { error: result.error, quota: usage.quota },
      { status: 422 },
    );
  }

  const data = result.data
    ? await enrichCustomerPostalCode(result.data)
    : undefined;

  return NextResponse.json({
    data,
    quota: usage.quota,
    ...(softUsageWarning ? { usageWarning: softUsageWarning } : {}),
  });
}
