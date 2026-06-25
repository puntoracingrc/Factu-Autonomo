import type { SafeServerDocumentResponse } from "./safe-response";

assertServerOnlyModule();

export const SERVER_DOCUMENT_INGEST_ROUTE = "/api/server-documents/ingest";

export interface ServerDocumentIngestAuditEvent {
  timestamp: string;
  requestId: string;
  route: typeof SERVER_DOCUMENT_INGEST_ROUTE;
  status: SafeServerDocumentResponse["status"] | "rate_limited";
  action?: string;
  reason?: string;
  userId?: string;
}

export interface ServerDocumentIngestAuditRecorder {
  record(event: ServerDocumentIngestAuditEvent): void | Promise<void>;
}

export interface ServerDocumentIngestRateLimitInput {
  key: string;
  requestId: string;
  userId?: string;
}

export interface ServerDocumentIngestRateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

export interface ServerDocumentIngestRateLimiter {
  check(
    input: ServerDocumentIngestRateLimitInput,
  ): ServerDocumentIngestRateLimitResult | Promise<ServerDocumentIngestRateLimitResult>;
}

interface MemoryRateLimiterOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

interface MemoryBucket {
  count: number;
  resetAt: number;
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const IP_PATTERN = /^[A-Fa-f0-9:.]{1,64}$/;

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El hardening operativo de ingest documental solo puede cargarse en servidor.",
    );
  }
}

function defaultRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function isSafeToken(value: string, pattern: RegExp): boolean {
  return pattern.test(value);
}

function safeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveServerDocumentRequestId(
  rawRequestId: string | null,
  generateId: () => string = defaultRequestId,
): string {
  const candidate = safeString(rawRequestId);
  if (candidate && isSafeToken(candidate, REQUEST_ID_PATTERN)) return candidate;

  const generated = generateId();
  if (isSafeToken(generated, REQUEST_ID_PATTERN)) return generated;
  return defaultRequestId();
}

export function getSafeServerDocumentAction(body: unknown): string | undefined {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return undefined;
  }
  const action = safeString((body as Record<string, unknown>).action);
  if (!action || !isSafeToken(action, REQUEST_ID_PATTERN)) return undefined;
  return action.slice(0, 64);
}

export function buildServerDocumentRateLimitKey(
  request: Request,
  userId: string,
): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip =
    forwarded && isSafeToken(forwarded, IP_PATTERN)
      ? forwarded
      : realIp && isSafeToken(realIp, IP_PATTERN)
        ? realIp
        : "unknown";

  return `server-documents-ingest:user:${userId}:ip:${ip}`;
}

export function createMemoryServerDocumentIngestRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: MemoryRateLimiterOptions): ServerDocumentIngestRateLimiter {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Rate limit must be a positive integer.");
  }
  if (!Number.isInteger(windowMs) || windowMs < 1) {
    throw new Error("Rate limit window must be a positive integer.");
  }

  const buckets = new Map<string, MemoryBucket>();

  return {
    check({ key }) {
      const currentTime = now();
      const current = buckets.get(key);
      if (!current || current.resetAt <= currentTime) {
        buckets.set(key, { count: 1, resetAt: currentTime + windowMs });
        return { allowed: true };
      }

      if (current.count >= limit) {
        return {
          allowed: false,
          retryAfterMs: Math.max(0, current.resetAt - currentTime),
        };
      }

      current.count += 1;
      return { allowed: true };
    },
  };
}

export class MemoryServerDocumentIngestAuditRecorder
  implements ServerDocumentIngestAuditRecorder
{
  private readonly events: ServerDocumentIngestAuditEvent[] = [];

  constructor(private readonly maxEvents = 200) {}

  record(event: ServerDocumentIngestAuditEvent): void {
    const safeEvent: ServerDocumentIngestAuditEvent = {
      timestamp: event.timestamp,
      requestId: event.requestId,
      route: SERVER_DOCUMENT_INGEST_ROUTE,
      status: event.status,
      ...(event.action ? { action: event.action } : {}),
      ...(event.reason ? { reason: event.reason } : {}),
      ...(event.userId ? { userId: event.userId } : {}),
    };

    this.events.push(safeEvent);
    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }
  }

  snapshot(): ServerDocumentIngestAuditEvent[] {
    return this.events.map((event) => ({ ...event }));
  }
}

export const defaultServerDocumentIngestRateLimiter =
  createMemoryServerDocumentIngestRateLimiter({
    limit: 60,
    windowMs: 60_000,
  });

export const defaultServerDocumentIngestAuditRecorder =
  new MemoryServerDocumentIngestAuditRecorder();
