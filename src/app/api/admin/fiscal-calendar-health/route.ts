import { NextResponse } from "next/server";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import { probeAeatFiscalCalendarAdminHealth } from "@/lib/fiscal-calendar/admin-health";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

function withPrivateResponseHeaders<T extends Response>(response: T): T {
  for (const [key, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function privateJson(body: unknown, init?: ResponseInit): NextResponse {
  return withPrivateResponseHeaders(NextResponse.json(body, init));
}

export async function GET(request: Request) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return withPrivateResponseHeaders(access.response);

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "admin_fiscal_calendar_health",
      limit: 30,
      windowMs: 10 * 60_000,
    },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return withPrivateResponseHeaders(rateLimitExceededResponse(rateLimit));
  }

  try {
    const health = await probeAeatFiscalCalendarAdminHealth();
    return privateJson({ health });
  } catch {
    return privateJson(
      { error: "No se pudo comprobar el calendario fiscal." },
      { status: 503 },
    );
  }
}
