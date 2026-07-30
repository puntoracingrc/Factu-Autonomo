import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CENTRAL_BUSINESS_AUTHORITY_CANARY_USER_EMAILS_KEY,
  CENTRAL_BUSINESS_AUTHORITY_MODE_KEY,
  CENTRAL_BUSINESS_AUTHORITY_MUTATIONS_READY_KEY,
  CENTRAL_BUSINESS_AUTHORITY_PRODUCTION_APPROVED_KEY,
  CENTRAL_BUSINESS_AUTHORITY_SCHEMA_VERSION,
  CENTRAL_BUSINESS_AUTHORITY_SCHEMA_VERSION_KEY,
} from "./activation";
import {
  createCentralBusinessBatchMutationRouteHandler,
  type CentralBusinessBatchMutationRouteDependencies,
} from "./batch-mutation-route-handler";
import type { CentralBusinessBatchMutationRpcArgs } from "./batch-mutation-rpc-adapter";

const userId = "00000000-0000-4000-8000-000000000001";
const userEmail = "puntoracingrc@gmail.com";

function body(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    operations: [
      {
        idempotencyKey: "SYNTHETIC_BATCH_SUPPLIER",
        operationKind: "upsert",
        entityType: "supplier",
        entityId: "supplier-1",
        expectedVersion: 0,
        payload: { id: "supplier-1", name: "Synthetic supplier" },
      },
      {
        idempotencyKey: "SYNTHETIC_BATCH_EXPENSE",
        operationKind: "upsert",
        entityType: "expense",
        entityId: "expense-1",
        expectedVersion: 0,
        payload: { id: "expense-1", description: "Synthetic expense" },
      },
    ],
    ...overrides,
  });
}

function dependencies(
  overrides: Partial<CentralBusinessBatchMutationRouteDependencies> = {},
): CentralBusinessBatchMutationRouteDependencies {
  return {
    authenticate: vi.fn(async () => ({
      userId,
      userEmail,
      sessionId: "00000000-0000-4000-8000-000000000002",
    })),
    rateLimit: vi.fn(async () => ({ allowed: true as const })),
    verifyDevice: vi.fn(async () => ({
      allowed: true as const,
      deviceId: "sha256:SYNTHETIC_DEVICE",
    })),
    getRpcClient: vi.fn(() => ({
      async rpc(
        _name: "mutate_central_business_batch_v1",
        args: CentralBusinessBatchMutationRpcArgs,
      ) {
        const operations = args.p_operations as Array<Record<string, unknown>>;
        return {
          error: null,
          data: operations.map((operation, index) => ({
            operation_index: index,
            result_status: "committed",
            event_id: `00000000-0000-4000-8000-00000000001${index}`,
            event_sequence: index + 1,
            entity_version: 1,
            deleted: false,
            content_hash: operation.contentHash,
          })),
        };
      },
    })),
    ...overrides,
  };
}

function enableCanary() {
  vi.stubEnv(CENTRAL_BUSINESS_AUTHORITY_MODE_KEY, "canary");
  vi.stubEnv(CENTRAL_BUSINESS_AUTHORITY_CANARY_USER_EMAILS_KEY, userEmail);
  vi.stubEnv(
    CENTRAL_BUSINESS_AUTHORITY_SCHEMA_VERSION_KEY,
    CENTRAL_BUSINESS_AUTHORITY_SCHEMA_VERSION,
  );
  vi.stubEnv(CENTRAL_BUSINESS_AUTHORITY_MUTATIONS_READY_KEY, "true");
  vi.stubEnv(CENTRAL_BUSINESS_AUTHORITY_PRODUCTION_APPROVED_KEY, "true");
}

async function request(
  deps: CentralBusinessBatchMutationRouteDependencies,
  rawBody = body(),
) {
  return createCentralBusinessBatchMutationRouteHandler(deps).handle({
    method: "POST",
    headers: new Headers({
      authorization: "Bearer synthetic",
      "x-factu-device-token": "synthetic-device",
      "user-agent": "vitest",
    }),
    readBody: async () => rawBody,
  });
}

describe("central business batch mutation route", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("confirma todas las operaciones con identidad derivada del servidor", async () => {
    enableCanary();
    const rpc = vi.fn(async (_name, args) => ({
      error: null,
      data: (args.p_operations as Array<Record<string, unknown>>).map(
        (operation, index) => ({
          operation_index: index,
          result_status: "committed",
          event_id: `00000000-0000-4000-8000-00000000001${index}`,
          event_sequence: index + 10,
          entity_version: 1,
          deleted: false,
          content_hash: operation.contentHash,
        }),
      ),
    }));
    const result = await request(
      dependencies({ getRpcClient: () => ({ rpc }) }),
    );

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      result: {
        operations: [
          { operationIndex: 0, entityVersion: 1 },
          { operationIndex: 1, entityVersion: 1 },
        ],
      },
    });
    expect(rpc).toHaveBeenCalledWith(
      "mutate_central_business_batch_v1",
      expect.objectContaining({
        p_user_id: userId,
        p_device_id: "sha256:SYNTHETIC_DEVICE",
      }),
    );
    expect(JSON.stringify(rpc.mock.calls[0]?.[1])).not.toContain(
      "SYNTHETIC_BATCH_SUPPLIER",
    );
  });

  it("rechaza lotes vacios, grandes o con una ficha repetida", async () => {
    enableCanary();
    expect(await request(dependencies(), body({ operations: [] }))).toMatchObject(
      {
        status: 400,
        body: { error: { code: "INVALID_BODY" } },
      },
    );
    const repeated = JSON.stringify({
      operations: [
        JSON.parse(body()).operations[0],
        {
          ...JSON.parse(body()).operations[0],
          idempotencyKey: "SYNTHETIC_BATCH_DUPLICATE",
        },
      ],
    });
    expect(await request(dependencies(), repeated)).toMatchObject({
      status: 400,
      body: { error: { code: "DUPLICATE_ENTITY" } },
    });
    const tooMany = JSON.stringify({
      operations: Array.from({ length: 21 }, (_, index) => ({
        idempotencyKey: `SYNTHETIC_BATCH_${index.toString().padStart(2, "0")}`,
        operationKind: "upsert",
        entityType: "customer",
        entityId: `customer-${index}`,
        expectedVersion: 0,
        payload: { id: `customer-${index}` },
      })),
    });
    expect(await request(dependencies(), tooMany)).toMatchObject({
      status: 400,
      body: { error: { code: "INVALID_BODY" } },
    });
  });

  it("mapea un conflicto de version sin confirmar parcialmente", async () => {
    enableCanary();
    const result = await request(
      dependencies({
        getRpcClient: () => ({
          async rpc() {
            return {
              data: null,
              error: { code: "P4103", message: "version mismatch" },
            };
          },
        }),
      }),
    );
    expect(result).toMatchObject({
      status: 409,
      body: {
        error: {
          code: "CENTRAL_BUSINESS_VERSION_CONFLICT",
          causeCode: "P4103",
        },
      },
    });
  });

  it("mapea una ocurrencia recurrente duplicada como conflicto atomico", async () => {
    enableCanary();
    const result = await request(
      dependencies({
        getRpcClient: () => ({
          async rpc() {
            return {
              data: null,
              error: {
                code: "P4105",
                message: "recurring occurrence exists",
              },
            };
          },
        }),
      }),
    );
    expect(result).toMatchObject({
      status: 409,
      body: {
        error: {
          code: "CENTRAL_BUSINESS_RECURRING_OCCURRENCE_CONFLICT",
          causeCode: "P4105",
          message: expect.stringContaining(
            "No se aplico ninguna operacion del lote",
          ),
        },
      },
    });
  });
});
