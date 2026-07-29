import { describe, expect, it } from "vitest";

import { EMPTY_DATA } from "@/lib/types";
import type { CentralBusinessQueuedOperation } from "@/lib/central-business-authority/durable-queue";

import { buildCentralBusinessConflictReviewItems } from "./central-business-conflict-presentation";

function operation(
  overrides: Partial<CentralBusinessQueuedOperation> = {},
): CentralBusinessQueuedOperation {
  return {
    operationId: "CENTRAL_OP_SYNTHETIC_0001",
    status: "conflict",
    enqueuedAt: "2026-07-29T17:00:00.000Z",
    attemptCount: 1,
    input: {
      idempotencyKey: "CENTRAL_OP_SYNTHETIC_0001",
      operationKind: "upsert",
      entityType: "customer",
      entityId: "customer-1",
      expectedVersion: 1,
      payload: { id: "customer-1", name: "Cliente sintético" },
    },
    lastError: {
      code: "CENTRAL_BUSINESS_VERSION_CONFLICT",
      message: "stale",
      status: 409,
    },
    ...overrides,
  };
}

describe("central business conflict presentation", () => {
  it("agrupa todos los cambios del mismo elemento sin mostrar el payload", () => {
    const items = buildCentralBusinessConflictReviewItems(EMPTY_DATA, [
      operation(),
      operation({
        operationId: "CENTRAL_OP_SYNTHETIC_0002",
        input: {
          ...operation().input,
          idempotencyKey: "CENTRAL_OP_SYNTHETIC_0002",
          operationKind: "delete",
        },
      }),
    ]);

    expect(items).toEqual([
      expect.objectContaining({
        key: "customer:customer-1",
        label: "Cliente sintético",
        operationCount: 2,
        operationText: "varios cambios locales",
        expectedVersionText: "versión 1",
        canKeepServer: true,
      }),
    ]);
    expect(JSON.stringify(items)).not.toContain("idempotencyKey");
  });

  it("impide la reparación automática de una identidad reutilizada", () => {
    const items = buildCentralBusinessConflictReviewItems(EMPTY_DATA, [
      operation({
        lastError: {
          code: "CENTRAL_BUSINESS_IDEMPOTENCY_CONFLICT",
          message: "identity mismatch",
          status: 409,
        },
      }),
    ]);

    expect(items[0].canKeepServer).toBe(false);
  });
});
