import { describe, expect, it, vi } from "vitest";

import { mutateCentralBusinessFromBrowser } from "./mutation-client";

const input = {
  idempotencyKey: "synthetic-operation-0001",
  operationKind: "upsert" as const,
  entityType: "customer" as const,
  entityId: "customer-1",
  expectedVersion: 0,
  payload: { id: "customer-1", name: "Synthetic" },
};

describe("central business mutation client", () => {
  it("envia credenciales, idempotencia y version y valida la confirmacion", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        ok: true,
        schema: "CENTRAL_BUSINESS_MUTATION_ROUTE_V1",
        result: {
          schema: "CENTRAL_BUSINESS_MUTATION_RPC_ADAPTER_V1",
          status: "committed",
          eventId: "event-1",
          eventSequence: 1,
          entityVersion: 1,
          deleted: false,
          contentHash: "hash-1",
        },
      }),
    );
    const result = await mutateCentralBusinessFromBrowser(input, {
      fetchImpl,
      getAccessToken: async () => "access-token",
      getDeviceToken: () => "device-token",
    });

    expect(result).toMatchObject({
      ok: true,
      status: "committed",
      entityVersion: 1,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/central-business-authority/mutate",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          "X-Factu-Device-Token": "device-token",
        }),
        body: JSON.stringify(input),
      }),
    );
  });

  it("clasifica red como reintentable y version como conflicto no reintentable", async () => {
    await expect(
      mutateCentralBusinessFromBrowser(input, {
        fetchImpl: async () => {
          throw new Error("offline");
        },
        getAccessToken: async () => "token",
        getDeviceToken: () => "device",
      }),
    ).resolves.toMatchObject({
      ok: false,
      retryable: true,
      conflict: false,
      code: "CENTRAL_BUSINESS_MUTATION_NETWORK_ERROR",
    });

    await expect(
      mutateCentralBusinessFromBrowser(input, {
        fetchImpl: async () =>
          Response.json(
            {
              ok: false,
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
      retryable: false,
      conflict: true,
      code: "CENTRAL_BUSINESS_VERSION_CONFLICT",
      causeCode: "P4103",
    });
  });

  it("falla cerrado ante confirmacion incompleta", async () => {
    await expect(
      mutateCentralBusinessFromBrowser(input, {
        fetchImpl: async () => Response.json({ ok: true }),
        getAccessToken: async () => "token",
        getDeviceToken: () => "device",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "CENTRAL_BUSINESS_MUTATION_INVALID_RESPONSE",
      retryable: true,
    });
  });

  it("clasifica una ocurrencia recurrente duplicada como conflicto", async () => {
    await expect(
      mutateCentralBusinessFromBrowser(input, {
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
});
