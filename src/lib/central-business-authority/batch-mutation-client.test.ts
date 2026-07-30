import { describe, expect, it, vi } from "vitest";

import {
  mutateCentralBusinessBatchFromBrowser,
  type CentralBusinessBrowserBatchMutationInput,
} from "./batch-mutation-client";
import { CENTRAL_BUSINESS_ATOMIC_BATCH_MAX_OPERATIONS } from "./batch-contract";

const operations: CentralBusinessBrowserBatchMutationInput[] = [
  {
    idempotencyKey: "synthetic-batch-supplier",
    operationKind: "upsert" as const,
    entityType: "supplier" as const,
    entityId: "supplier-1",
    expectedVersion: 0,
    payload: { id: "supplier-1", name: "Synthetic supplier" },
  },
  {
    idempotencyKey: "synthetic-batch-expense",
    operationKind: "upsert" as const,
    entityType: "expense" as const,
    entityId: "expense-1",
    expectedVersion: 0,
    payload: { id: "expense-1", description: "Synthetic expense" },
  },
];

describe("central business batch mutation client", () => {
  it("envia un lote autenticado y valida cada confirmacion", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        ok: true,
        schema: "CENTRAL_BUSINESS_BATCH_MUTATION_ROUTE_V1",
        result: {
          schema: "CENTRAL_BUSINESS_BATCH_MUTATION_RPC_ADAPTER_V1",
          operations: operations.map((_, operationIndex) => ({
            operationIndex,
            status: "committed",
            eventId: `event-${operationIndex}`,
            eventSequence: operationIndex + 1,
            entityVersion: 1,
            deleted: false,
            contentHash: `hash-${operationIndex}`,
          })),
        },
      }),
    );
    const result = await mutateCentralBusinessBatchFromBrowser(operations, {
      fetchImpl,
      getAccessToken: async () => "access-token",
      getDeviceToken: () => "device-token",
    });

    expect(result).toMatchObject({
      ok: true,
      operations: [
        { operationIndex: 0, entityVersion: 1 },
        { operationIndex: 1, entityVersion: 1 },
      ],
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/central-business-authority/mutate-batch",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({ operations }),
      }),
    );
  });

  it("falla cerrado ante conflicto o confirmacion incompleta", async () => {
    await expect(
      mutateCentralBusinessBatchFromBrowser(operations, {
        fetchImpl: async () =>
          Response.json(
            {
              error: {
                code: "CENTRAL_BUSINESS_VERSION_CONFLICT",
                causeCode: "P4103",
                message: "Version conflict",
              },
            },
            { status: 409 },
          ),
        getAccessToken: async () => "token",
        getDeviceToken: () => "device",
      }),
    ).resolves.toMatchObject({
      ok: false,
      conflict: true,
      retryable: false,
      causeCode: "P4103",
    });
    await expect(
      mutateCentralBusinessBatchFromBrowser(operations, {
        fetchImpl: async () =>
          Response.json({
            ok: true,
            schema: "CENTRAL_BUSINESS_BATCH_MUTATION_ROUTE_V1",
            result: {
              schema: "CENTRAL_BUSINESS_BATCH_MUTATION_RPC_ADAPTER_V1",
              operations: [],
            },
          }),
        getAccessToken: async () => "token",
        getDeviceToken: () => "device",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "CENTRAL_BUSINESS_BATCH_INVALID_RESPONSE",
      retryable: true,
    });
  });

  it("clasifica una ocurrencia recurrente duplicada como conflicto atomico", async () => {
    await expect(
      mutateCentralBusinessBatchFromBrowser(operations, {
        fetchImpl: async () =>
          Response.json(
            {
              error: {
                code: "CENTRAL_BUSINESS_RECURRING_OCCURRENCE_CONFLICT",
                causeCode: "P4105",
                message: "Recurring occurrence conflict",
              },
            },
            { status: 409 },
          ),
        getAccessToken: async () => "token",
        getDeviceToken: () => "device",
      }),
    ).resolves.toMatchObject({
      ok: false,
      conflict: true,
      retryable: false,
      causeCode: "P4105",
    });
  });

  it("acepta el maximo atomico y rechaza una operacion adicional", async () => {
    const maximum = Array.from(
      { length: CENTRAL_BUSINESS_ATOMIC_BATCH_MAX_OPERATIONS },
      (_, index): CentralBusinessBrowserBatchMutationInput => ({
        idempotencyKey: `synthetic-capacity-${index}`,
        operationKind: "upsert",
        entityType: "expense",
        entityId: `expense-capacity-${index}`,
        expectedVersion: 0,
        payload: {
          id: `expense-capacity-${index}`,
          description: `Synthetic expense ${index}`,
        },
      }),
    );
    const fetchImpl = vi.fn(async () =>
      Response.json({
        ok: true,
        schema: "CENTRAL_BUSINESS_BATCH_MUTATION_ROUTE_V1",
        result: {
          schema: "CENTRAL_BUSINESS_BATCH_MUTATION_RPC_ADAPTER_V1",
          operations: maximum.map((_, operationIndex) => ({
            operationIndex,
            status: "committed",
            eventId: `event-capacity-${operationIndex}`,
            eventSequence: operationIndex + 1,
            entityVersion: 1,
            deleted: false,
            contentHash: `hash-capacity-${operationIndex}`,
          })),
        },
      }),
    );

    await expect(
      mutateCentralBusinessBatchFromBrowser(maximum, {
        fetchImpl,
        getAccessToken: async () => "token",
        getDeviceToken: () => "device",
      }),
    ).resolves.toMatchObject({
      ok: true,
      operations: { length: CENTRAL_BUSINESS_ATOMIC_BATCH_MAX_OPERATIONS },
    });
    await expect(
      mutateCentralBusinessBatchFromBrowser(
        [
          ...maximum,
          {
            ...maximum[0],
            idempotencyKey: "synthetic-capacity-overflow",
            entityId: "expense-capacity-overflow",
          },
        ],
        {
          fetchImpl,
          getAccessToken: async () => "token",
          getDeviceToken: () => "device",
        },
      ),
    ).resolves.toMatchObject({
      ok: false,
      code: "CENTRAL_BUSINESS_BATCH_INVALID_SIZE",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
