import { NextResponse } from "next/server";
import { getCompanyRouteAuthFromBearer } from "@/lib/companies/server";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

function protectStatusResponse<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", `Authorization, ${FACTU_COMPANY_HEADER}`);
  return response;
}

export async function GET(request: Request) {
  const auth = await getCompanyRouteAuthFromBearer(
    request.headers.get("authorization"),
    request.headers.get(FACTU_COMPANY_HEADER),
  );
  if (!auth) {
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
    auth.actorUserId,
  );
  if (!rateLimit.allowed) {
    return protectStatusResponse(rateLimitExceededResponse(rateLimit));
  }

  return protectStatusResponse(
    NextResponse.json({ submissionMode: "disabled" as const }),
  );
}
