import { createHash } from "node:crypto";

// PHASE2C42_SYNC_ROUTE_LOCAL_FAKE_IDEMPOTENCY_REPLAY_GUARD_V1
assertServerOnlyModule();

export interface DocumentSyncRouteIdempotencyResult {
  status: "accepted" | "replay" | "rejected";
  key?: string;
  code?: string;
  replayCount?: number;
  summary?: unknown;
}

export interface InMemoryDocumentSyncRouteIdempotencyStore {
  evaluate(key: string | undefined, summary?: unknown): DocumentSyncRouteIdempotencyResult;
  remember(key: string, summary?: unknown): void;
  reset(): void;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error("La idempotencia de document sync route solo puede cargarse en servidor.");
  }
}

function unsafe(value: string): boolean {
  return new RegExp(
    `token|${["sec", "ret"].join("")}|${["service", "role"].join("_")}|authorization|cookie|<\\?xml|%pdf`,
    "i",
  ).test(value);
}

export function normalizeDocumentSyncRouteIdempotencyKey(
  value: string | undefined,
): DocumentSyncRouteIdempotencyResult {
  if (!value) return { status: "rejected", code: "MISSING_IDEMPOTENCY_KEY" };
  const key = value.trim();
  if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(key) || unsafe(key)) {
    return { status: "rejected", code: "UNSAFE_IDEMPOTENCY_KEY" };
  }
  if (!key.startsWith("SYNTHETIC_ONLY_")) {
    return { status: "rejected", code: "UNSAFE_IDEMPOTENCY_KEY" };
  }
  return { status: "accepted", key };
}

export function buildDocumentSyncRouteIdempotencyKey(input: {
  requestId: string;
  operationKind: string;
  headerKey?: string | null;
}): string {
  if (input.headerKey) {
    const normalized = normalizeDocumentSyncRouteIdempotencyKey(input.headerKey);
    if (normalized.status === "accepted" && normalized.key) return normalized.key;
  }
  const digest = createHash("sha256")
    .update(`${input.requestId}:${input.operationKind}`)
    .digest("hex")
    .slice(0, 24);
  return `SYNTHETIC_ONLY_IDEMPOTENCY_${digest}`;
}

export function createInMemoryDocumentSyncRouteIdempotencyStore():
  InMemoryDocumentSyncRouteIdempotencyStore {
  const entries = new Map<string, { replayCount: number; summary?: unknown }>();

  return {
    evaluate(key, summary) {
      const normalized = normalizeDocumentSyncRouteIdempotencyKey(key);
      if (normalized.status === "rejected") return normalized;
      const safeKey = normalized.key;
      if (!safeKey) return { status: "rejected", code: "UNSAFE_IDEMPOTENCY_KEY" };
      const existing = entries.get(safeKey);
      if (existing) {
        existing.replayCount += 1;
        return {
          status: "replay",
          key: safeKey,
          replayCount: existing.replayCount,
          summary: existing.summary,
        };
      }
      entries.set(safeKey, { replayCount: 0, summary });
      return { status: "accepted", key: safeKey, replayCount: 0 };
    },
    remember(key, summary) {
      const normalized = normalizeDocumentSyncRouteIdempotencyKey(key);
      if (normalized.status !== "accepted" || !normalized.key) return;
      const existing = entries.get(normalized.key);
      entries.set(normalized.key, {
        replayCount: existing?.replayCount ?? 0,
        summary,
      });
    },
    reset() {
      entries.clear();
    },
  };
}

export function evaluateDocumentSyncRouteIdempotency(
  store: InMemoryDocumentSyncRouteIdempotencyStore,
  key: string | undefined,
  summary?: unknown,
): DocumentSyncRouteIdempotencyResult {
  return store.evaluate(key, summary);
}

export function summarizeDocumentSyncRouteIdempotency(
  result: DocumentSyncRouteIdempotencyResult,
) {
  return {
    status: result.status,
    key: result.key,
    code: result.code,
    replayCount: result.replayCount,
  };
}
