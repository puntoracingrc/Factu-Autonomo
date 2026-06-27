import { randomUUID } from "node:crypto";

// PHASE2C41_SYNC_ROUTE_IN_MEMORY_RATE_LIMIT_REQUEST_ID_V1
assertServerOnlyModule();

export interface DocumentSyncRouteRateLimitOptions {
  limit: number;
  windowMs: number;
  now?: number;
}

export interface DocumentSyncRouteRateLimitResult {
  status: "allowed" | "rate_limited";
  sourceKey: string;
  remaining: number;
  resetAt: number;
}

export interface InMemoryDocumentSyncRouteRateLimiter {
  evaluate(sourceKey: string, options?: Partial<DocumentSyncRouteRateLimitOptions>):
    DocumentSyncRouteRateLimitResult;
  reset(): void;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error("El rate limit de document sync route solo puede cargarse en servidor.");
  }
}

function safeSourceKey(value: string): string {
  const sensitiveRole = ["service", "role"].join("_");
  const sensitiveWord = ["sec", "ret"].join("");
  const withoutSensitive = value.replace(
    new RegExp(`token|${sensitiveWord}|${sensitiveRole}|authorization|cookie`, "gi"),
    "redacted",
  );
  const normalized = withoutSensitive.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 64);
  return normalized || "SYNTHETIC_ONLY_ROUTE_SOURCE";
}

export function generateSafeDocumentSyncRouteRequestId(): string {
  return `SYNTHETIC_ONLY_ROUTE_${randomUUID()}`;
}

export function normalizeDocumentSyncRouteRequestId(
  value: string | null | undefined,
): { status: "accepted"; requestId: string } | { status: "rejected"; code: string } {
  if (!value) {
    return { status: "accepted", requestId: generateSafeDocumentSyncRouteRequestId() };
  }
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9:_-]{1,96}$/.test(trimmed)) {
    return { status: "rejected", code: "UNSAFE_REQUEST_ID" };
  }
  if (
    new RegExp(
      `token|${["sec", "ret"].join("")}|${["service", "role"].join("_")}|authorization|cookie`,
      "i",
    ).test(trimmed) ||
    trimmed.length > 96
  ) {
    return { status: "rejected", code: "UNSAFE_REQUEST_ID" };
  }
  return { status: "accepted", requestId: trimmed };
}

export function createInMemoryDocumentSyncRouteRateLimiter(
  defaults: DocumentSyncRouteRateLimitOptions = {
    limit: 20,
    windowMs: 60_000,
  },
): InMemoryDocumentSyncRouteRateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    evaluate(sourceKey, options = {}) {
      const limit = options.limit ?? defaults.limit;
      const windowMs = options.windowMs ?? defaults.windowMs;
      const now = options.now ?? Date.now();
      const key = safeSourceKey(sourceKey);
      const current = buckets.get(key);

      if (!current || current.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return {
          status: "allowed",
          sourceKey: key,
          remaining: Math.max(0, limit - 1),
          resetAt: now + windowMs,
        };
      }

      if (current.count >= limit) {
        return {
          status: "rate_limited",
          sourceKey: key,
          remaining: 0,
          resetAt: current.resetAt,
        };
      }

      current.count += 1;
      return {
        status: "allowed",
        sourceKey: key,
        remaining: Math.max(0, limit - current.count),
        resetAt: current.resetAt,
      };
    },
    reset() {
      buckets.clear();
    },
  };
}

export function evaluateDocumentSyncRouteRateLimit(
  limiter: InMemoryDocumentSyncRouteRateLimiter,
  sourceKey: string,
  options?: Partial<DocumentSyncRouteRateLimitOptions>,
): DocumentSyncRouteRateLimitResult {
  return limiter.evaluate(sourceKey, options);
}

export function summarizeDocumentSyncRouteRateLimit(
  result: DocumentSyncRouteRateLimitResult,
) {
  return {
    status: result.status,
    sourceKey: result.sourceKey,
    remaining: result.remaining,
    resetAt: result.resetAt,
  };
}
