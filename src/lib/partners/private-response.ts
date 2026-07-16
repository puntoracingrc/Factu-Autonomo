import { NextResponse } from "next/server";

const PARTNER_PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

export function withPartnerPrivateHeaders<T extends Response>(response: T): T {
  for (const [name, value] of Object.entries(PARTNER_PRIVATE_RESPONSE_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export function partnerJsonResponse(
  body: unknown,
  init?: ResponseInit,
): NextResponse {
  return withPartnerPrivateHeaders(NextResponse.json(body, init));
}
