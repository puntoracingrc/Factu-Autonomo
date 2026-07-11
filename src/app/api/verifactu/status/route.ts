import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

function protectStatusResponse<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Authorization");
  return response;
}

export async function GET(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return protectStatusResponse(
      NextResponse.json({ error: "Sesión requerida" }, { status: 401 }),
    );
  }

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "verifactu_status",
      limit: 120,
      windowMs: 5 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) {
    return protectStatusResponse(rateLimitExceededResponse(rateLimit));
  }

  return protectStatusResponse(
    NextResponse.json({ submissionMode: "unknown" as const }),
  );
}
