import { NextResponse } from "next/server";
import { ensureFreeSubscriptionServer } from "@/lib/billing/server-repository";
import { getCompanyRouteAuthFromBearer } from "@/lib/companies/server";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export async function POST(request: Request) {
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
      namespace: "billing_subscription",
      limit: 600,
      windowMs: 10 * 60_000,
    },
    auth.actorUserId,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const subscription = await ensureFreeSubscriptionServer(auth.billingUserId);
  if (!subscription) {
    return NextResponse.json(
      { error: "Servidor de suscripciones no disponible" },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { subscription },
    {
      headers: {
        "Cache-Control": "private, no-store",
        Vary: `Authorization, ${FACTU_COMPANY_HEADER}`,
      },
    },
  );
}
