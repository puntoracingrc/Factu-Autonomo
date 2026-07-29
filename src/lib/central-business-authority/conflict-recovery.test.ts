import { describe, expect, it, vi } from "vitest";

import { resolveCentralBusinessConflictKeepingServer } from "./conflict-recovery";

const input = {
  ownerScope: "synthetic-user-0001",
  entityType: "customer" as const,
  entityId: "customer-1",
};

describe("central business conflict recovery", () => {
  it("prepara, descarga y solo entonces finaliza", async () => {
    const order: string[] = [];
    const result = await resolveCentralBusinessConflictKeepingServer(input, {
      withLock: async (_ownerScope, task) => task(),
      prepare: () => {
        order.push("prepare");
        return { prepared: 1, state: {} as never };
      },
      syncServerEvents: async () => {
        order.push("sync");
        return {
          ok: true,
          schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
          pulled: 1,
          applied: 1,
          skipped: 0,
          nextSequence: 8,
          hasMore: false,
        };
      },
      finalize: () => {
        order.push("finalize");
        return { discarded: 1, state: {} as never };
      },
    });

    expect(order).toEqual(["prepare", "sync", "finalize"]);
    expect(result).toEqual({
      ok: true,
      schema: "CENTRAL_BUSINESS_CONFLICT_RECOVERY_V1",
      discarded: 1,
      pulled: 1,
      applied: 1,
      nextSequence: 8,
    });
  });

  it("conserva la operacion preparada si la descarga no se confirma", async () => {
    const finalize = vi.fn();
    const result = await resolveCentralBusinessConflictKeepingServer(input, {
      withLock: async (_ownerScope, task) => task(),
      prepare: () => ({ prepared: 1, state: {} as never }),
      syncServerEvents: async () => ({
        ok: false,
        schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
        code: "CENTRAL_BUSINESS_EVENTS_NETWORK_ERROR",
        message: "offline",
        retryable: true,
        nextSequence: 7,
      }),
      finalize,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "CENTRAL_BUSINESS_EVENTS_NETWORK_ERROR",
      retryable: true,
      nextSequence: 7,
    });
    expect(finalize).not.toHaveBeenCalled();
  });
});
