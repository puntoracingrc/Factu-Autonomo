import { describe, expect, it } from "vitest";
import {
  createInMemoryDocumentSyncRouteRateLimiter,
  evaluateDocumentSyncRouteRateLimit,
  generateSafeDocumentSyncRouteRequestId,
  normalizeDocumentSyncRouteRequestId,
  summarizeDocumentSyncRouteRateLimit,
} from "./route-rate-limit";

// PHASE2C41_SYNC_ROUTE_IN_MEMORY_RATE_LIMIT_REQUEST_ID_V1

describe("document sync route rate limit and request id", () => {
  it("permite primeras N requests y bloquea exceso", () => {
    const limiter = createInMemoryDocumentSyncRouteRateLimiter({
      limit: 2,
      windowMs: 1000,
      now: 0,
    });
    expect(evaluateDocumentSyncRouteRateLimit(limiter, "source").status).toBe("allowed");
    expect(evaluateDocumentSyncRouteRateLimit(limiter, "source").status).toBe("allowed");
    expect(evaluateDocumentSyncRouteRateLimit(limiter, "source").status).toBe(
      "rate_limited",
    );
    limiter.reset();
    expect(evaluateDocumentSyncRouteRateLimit(limiter, "source").status).toBe("allowed");
  });

  it("normaliza requestId seguro y rechaza inseguro", () => {
    expect(generateSafeDocumentSyncRouteRequestId()).toMatch(/^SYNTHETIC_ONLY_ROUTE_/);
    expect(normalizeDocumentSyncRouteRequestId("SYNTHETIC_ONLY_REQ").status).toBe(
      "accepted",
    );
    expect(normalizeDocumentSyncRouteRequestId("bad cookie").status).toBe("rejected");
  });

  it("summary no expone IP completa ni material sensible", () => {
    const limiter = createInMemoryDocumentSyncRouteRateLimiter();
    const sensitiveWord = ["sec", "ret"].join("");
    const summary = summarizeDocumentSyncRouteRateLimit(
      evaluateDocumentSyncRouteRateLimit(limiter, `127.0.0.1 ${sensitiveWord}`),
    );
    expect(JSON.stringify(summary)).not.toContain(sensitiveWord);
    expect(summary.sourceKey).toContain("_");
  });
});
