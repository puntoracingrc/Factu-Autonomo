import { NextResponse } from "next/server";

assertServerOnlyModule();

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitPolicy {
  namespace: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 5_000;

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error("Rate limiting can only run on the server.");
  }
}

function safePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9:._-]/g, "_").slice(0, 160) || "unknown";
}

function headerValue(request: Request, name: string): string {
  return request.headers.get(name)?.trim() ?? "";
}

function firstForwardedIp(value: string): string {
  return (
    value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)[0] ?? ""
  );
}

function clientIpFromRequest(request: Request): string {
  return (
    firstForwardedIp(headerValue(request, "x-vercel-forwarded-for")) ||
    firstForwardedIp(headerValue(request, "x-forwarded-for")) ||
    headerValue(request, "x-real-ip") ||
    headerValue(request, "cf-connecting-ip") ||
    "unknown"
  );
}

function cleanupExpiredBuckets(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function bucketKey(
  request: Request,
  policy: RateLimitPolicy,
  subject?: string | null,
): string {
  const identifier = subject?.trim() || clientIpFromRequest(request);
  return `${safePart(policy.namespace)}:${safePart(identifier)}`;
}

export function checkRateLimit(
  request: Request,
  policy: RateLimitPolicy,
  subject?: string | null,
  now = Date.now(),
): RateLimitResult {
  cleanupExpiredBuckets(now);

  const key = bucketKey(request, policy, subject);
  const existing = buckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + policy.windowMs };

  bucket.count += 1;
  buckets.set(key, bucket);

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - now) / 1000),
  );
  const remaining = Math.max(0, policy.limit - bucket.count);

  return {
    allowed: bucket.count <= policy.limit,
    limit: policy.limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

export function rateLimitExceededResponse(
  result: RateLimitResult,
  message = "Demasiados intentos. Prueba de nuevo en unos instantes.",
): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}

export function resetRateLimitBucketsForTests(): void {
  buckets.clear();
}
