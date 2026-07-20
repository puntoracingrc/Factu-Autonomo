import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { ensureFreeSubscriptionServer } from "@/lib/billing/server-repository";
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
      namespace: "billing_trial",
      limit: 5,
      windowMs: 60 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  // Compatibility endpoint for already deployed clients. Registration now
  // initializes Gratis; Pro trials only come from promotions or Admin.
  const subscription = await ensureFreeSubscriptionServer(user.id);
  if (!subscription) {
    return NextResponse.json(
      { error: "Servidor de suscripciones no disponible" },
      { status: 503 },
    );
  }

  return NextResponse.json({ subscription });
}
