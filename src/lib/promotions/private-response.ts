import { NextResponse } from "next/server";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

export function withPromotionPrivateHeaders<T extends Response>(response: T): T {
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export function promotionJsonResponse(body: unknown, init?: ResponseInit) {
  return withPromotionPrivateHeaders(NextResponse.json(body, init));
}
