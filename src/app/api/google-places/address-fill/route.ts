import { NextResponse } from "next/server";
import { getCompanyRouteAuthFromBearer } from "@/lib/companies/server";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import { isBillingEnforced } from "@/lib/billing/config";
import { getPlanLimits, type PlanId } from "@/lib/billing/plans";
import { fetchUserSubscriptionServer } from "@/lib/billing/server-repository";
import { consumeAddressAutofill } from "@/lib/billing/scan-usage-server";
import {
  hasUnlimitedAiAccessForCompany,
  unlimitedAiUsageResult,
} from "@/lib/billing/unlimited-ai-access";
import { resolveEffectivePlan } from "@/lib/billing/subscription";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { isAiRouteAuthenticationRequired } from "@/lib/server/ai-route-auth-policy";

async function canUseAddressAutofill(userId: string): Promise<{
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
        "El autorrelleno de direcciones con Google requiere plan Pro. Puedes escribir la dirección a mano.",
    };
  }

  return { allowed: true };
}

export async function POST(request: Request) {
  const auth = await getCompanyRouteAuthFromBearer(
    request.headers.get("authorization"),
    request.headers.get(FACTU_COMPANY_HEADER),
  );

  if (isAiRouteAuthenticationRequired(request) && !auth) {
    return NextResponse.json(
      {
        error:
          "Inicia sesión para usar el autorrelleno de direcciones con Google.",
      },
      { status: 401 },
    );
  }
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "google_places_address_fill",
      limit: 60,
      windowMs: 5 * 60_000,
    },
    auth?.actorUserId,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const unlimitedAccess = auth
    ? await hasUnlimitedAiAccessForCompany({
        user: { email: auth.userEmail ?? undefined },
        companyId: auth.companyId,
      })
    : false;
  const gate =
    auth && !unlimitedAccess
      ? await canUseAddressAutofill(auth.billingUserId)
      : { allowed: true };
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.reason }, { status: 402 });
  }

  if (!auth) {
    return NextResponse.json({ quota: null });
  }

  const usage = unlimitedAccess
    ? unlimitedAiUsageResult()
    : await consumeAddressAutofill(auth.billingUserId);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: usage.reason, quota: usage.quota },
      { status: usage.blockedByQuota ? 402 : 503 },
    );
  }

  return NextResponse.json({ quota: usage.quota });
}
