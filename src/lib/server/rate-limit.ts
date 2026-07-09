import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
  backend: "memory" | "supabase";
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

function requestIdentifier(request: Request, subject?: string | null): string {
  return subject?.trim() || clientIpFromRequest(request);
}

function shouldUseSupabaseRateLimit(): boolean {
  return process.env.SERVER_RATE_LIMIT_BACKEND === "supabase";
}

function identifierHash(namespace: string, identifier: string): string {
  const salt =
    process.env.SERVER_RATE_LIMIT_SALT ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "facturacion-autonomos";
  return createHash("sha256")
    .update(`${salt}:${namespace}:${identifier}`)
    .digest("hex");
}

type SupabaseRateLimitRow = {
  allowed?: boolean;
  limit_count?: number;
  remaining_count?: number;
  reset_at?: string;
  retry_after_seconds?: number;
};

function firstRpcRow(data: unknown): SupabaseRateLimitRow | null {
  if (Array.isArray(data)) return (data[0] as SupabaseRateLimitRow) ?? null;
  if (data && typeof data === "object") return data as SupabaseRateLimitRow;
  return null;
}

function warnSupabaseRateLimitFallback(error: unknown): void {
  if (process.env.NODE_ENV === "test") return;
  console.warn("rate_limit_supabase_fallback", error);
}

async function checkSupabaseRateLimit(
  request: Request,
  policy: RateLimitPolicy,
  subject?: string | null,
): Promise<RateLimitResult | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const identifier = requestIdentifier(request, subject);
  try {
    const { data, error } = await admin.rpc("claim_rate_limit_bucket", {
      p_identifier_hash: identifierHash(policy.namespace, identifier),
      p_limit: policy.limit,
      p_namespace: safePart(policy.namespace),
      p_window_ms: policy.windowMs,
    });

    if (error) {
      warnSupabaseRateLimitFallback(error);
      return null;
    }

    const row = firstRpcRow(data);
    if (!row || typeof row.allowed !== "boolean" || !row.reset_at) return null;

    const resetAt = new Date(row.reset_at).getTime();
    if (!Number.isFinite(resetAt)) return null;

    return {
      allowed: row.allowed,
      limit: Number(row.limit_count ?? policy.limit),
      remaining: Math.max(0, Number(row.remaining_count ?? 0)),
      resetAt,
      retryAfterSeconds: Math.max(
        1,
        Number(row.retry_after_seconds ?? Math.ceil((resetAt - Date.now()) / 1000)),
      ),
      backend: "supabase",
    };
  } catch (error) {
    warnSupabaseRateLimitFallback(error);
    return null;
  }
}

export function checkMemoryRateLimit(
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
    backend: "memory",
  };
}

export async function checkRateLimit(
  request: Request,
  policy: RateLimitPolicy,
  subject?: string | null,
  now = Date.now(),
): Promise<RateLimitResult> {
  if (shouldUseSupabaseRateLimit()) {
    const supabaseResult = await checkSupabaseRateLimit(request, policy, subject);
    if (supabaseResult) return supabaseResult;
  }

  return checkMemoryRateLimit(request, policy, subject, now);
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
