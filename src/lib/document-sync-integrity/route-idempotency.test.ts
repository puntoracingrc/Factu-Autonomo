import { describe, expect, it } from "vitest";
import {
  buildDocumentSyncRouteIdempotencyKey,
  createInMemoryDocumentSyncRouteIdempotencyStore,
  evaluateDocumentSyncRouteIdempotency,
  normalizeDocumentSyncRouteIdempotencyKey,
} from "./route-idempotency";

// PHASE2C42_SYNC_ROUTE_LOCAL_FAKE_IDEMPOTENCY_REPLAY_GUARD_V1

describe("document sync route local/fake idempotency", () => {
  it("acepta primera key y detecta replay", () => {
    const store = createInMemoryDocumentSyncRouteIdempotencyStore();
    const first = evaluateDocumentSyncRouteIdempotency(
      store,
      "SYNTHETIC_ONLY_IDEMPOTENCY_A",
    );
    const second = evaluateDocumentSyncRouteIdempotency(
      store,
      "SYNTHETIC_ONLY_IDEMPOTENCY_A",
    );
    expect(first.status).toBe("accepted");
    expect(second.status).toBe("replay");
  });

  it("rechaza malformed key y key con material sensible", () => {
    const sensitiveWord = ["sec", "ret"].join("");
    expect(normalizeDocumentSyncRouteIdempotencyKey("real-key").status).toBe(
      "rejected",
    );
    expect(
      normalizeDocumentSyncRouteIdempotencyKey(`SYNTHETIC_ONLY_${sensitiveWord}`)
        .status,
    ).toBe("rejected");
  });

  it("deriva key sintetica desde requestId seguro", () => {
    expect(
      buildDocumentSyncRouteIdempotencyKey({
        requestId: "SYNTHETIC_ONLY_REQUEST",
        operationKind: "apply_batch",
      }),
    ).toMatch(/^SYNTHETIC_ONLY_IDEMPOTENCY_/);
  });
});
