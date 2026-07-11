import { NextResponse } from "next/server";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

function containDraftResponse<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export async function GET(request: Request) {
  const rateLimit = await checkRateLimit(request, {
    namespace: "verifactu_declaration",
    limit: 120,
    windowMs: 5 * 60_000,
  });
  if (!rateLimit.allowed) {
    return containDraftResponse(rateLimitExceededResponse(rateLimit));
  }

  return containDraftResponse(
    NextResponse.json(
      { status: "draft_not_published" },
      { status: 404 },
    ),
  );
}
