import { describe, expect, it, vi } from "vitest";

import {
  reconcileCentralBusinessEventHistory,
  type CentralBusinessEventReconciliationDependencies,
} from "./event-reconciliation";

function successfulPage(
  overrides: Partial<Extract<
    Awaited<ReturnType<CentralBusinessEventReconciliationDependencies["syncPage"]>>,
    { ok: true }
  >> = {},
) {
  return {
    ok: true as const,
    schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1" as const,
    pulled: 1,
    applied: 1,
    skipped: 0,
    nextSequence: 1,
    hasMore: false,
    ...overrides,
  };
}

describe("central business event reconciliation", () => {
  it("rebobina y agrega todas las paginas hasta restaurar la copia local", async () => {
    const syncPage = vi
      .fn()
      .mockResolvedValueOnce(
        successfulPage({
          pulled: 500,
          applied: 2,
          skipped: 498,
          nextSequence: 500,
          hasMore: true,
        }),
      )
      .mockResolvedValueOnce(
        successfulPage({
          pulled: 4,
          applied: 1,
          skipped: 3,
          nextSequence: 504,
        }),
      );

    const result = await reconcileCentralBusinessEventHistory(
      {},
      {
        rewind: async () => ({ lastAppliedEventSequence: 0 }),
        hasPendingOperations: () => false,
        syncPage,
      },
    );

    expect(result).toEqual({
      ok: true,
      schema: "CENTRAL_BUSINESS_EVENT_RECONCILIATION_V1",
      pages: 2,
      pulled: 504,
      applied: 3,
      skipped: 501,
      nextSequence: 504,
    });
  });

  it("se detiene si aparece una operacion local despues del rebobinado", async () => {
    const syncPage = vi.fn();
    const result = await reconcileCentralBusinessEventHistory(
      {},
      {
        rewind: async () => ({ lastAppliedEventSequence: 0 }),
        hasPendingOperations: () => true,
        syncPage,
      },
    );

    expect(result).toMatchObject({
      ok: false,
      code: "CENTRAL_BUSINESS_RECONCILIATION_PENDING_OPERATIONS",
      nextSequence: 0,
    });
    expect(syncPage).not.toHaveBeenCalled();
  });

  it("conserva el error y el cursor de una pagina no aplicada", async () => {
    const result = await reconcileCentralBusinessEventHistory(
      {},
      {
        rewind: async () => ({ lastAppliedEventSequence: 0 }),
        hasPendingOperations: () => false,
        syncPage: async () => ({
          ok: false,
          schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
          code: "CENTRAL_BUSINESS_LOCAL_STORAGE_UNKNOWN",
          message: "No se confirmo el guardado local.",
          retryable: false,
          nextSequence: 500,
        }),
      },
    );

    expect(result).toEqual({
      ok: false,
      schema: "CENTRAL_BUSINESS_EVENT_RECONCILIATION_V1",
      code: "CENTRAL_BUSINESS_LOCAL_STORAGE_UNKNOWN",
      message: "No se confirmo el guardado local.",
      retryable: false,
      nextSequence: 500,
    });
  });
});
