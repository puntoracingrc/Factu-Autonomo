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
  createCentralBusinessMutationRouteHandler,
  type CentralBusinessMutationRouteDependencies,
} from "./mutation-route-handler";

const userId = "00000000-0000-4000-8000-000000000001";
const userEmail = "puntoracingrc@gmail.com";

function body(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    idempotencyKey: "SYNTHETIC_MUTATION_KEY_A",
    operationKind: "upsert",
    entityType: "customer",
    entityId: "SYNTHETIC_CUSTOMER_A",
    expectedVersion: 0,
    payload: { id: "SYNTHETIC_CUSTOMER_A", name: "Synthetic customer" },
    ...overrides,
  });
}

function dependencies(
  overrides: Partial<CentralBusinessMutationRouteDependencies> = {},
): CentralBusinessMutationRouteDependencies {
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
      async rpc() {
        return {
          error: null,
          data: [{
            result_status: "committed",
            event_id: "00000000-0000-4000-8000-000000000010",
            event_sequence: 1,
            entity_version: 1,
            deleted: false,
            content_hash: "SYNTHETIC_CONTENT_HASH",
          }],
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
  deps: CentralBusinessMutationRouteDependencies,
  input: { method?: string; rawBody?: string } = {},
) {
  return createCentralBusinessMutationRouteHandler(deps).handle({
    method: input.method ?? "POST",
    headers: new Headers({
      authorization: "Bearer synthetic",
      "x-factu-device-token": "synthetic-device",
      "user-agent": "vitest",
    }),
    readBody: () => Promise.resolve(input.rawBody ?? body()),
  });
}

describe("central business mutation route", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rechaza metodo y sesion antes de leer cuerpo o abrir RPC", async () => {
    const deps = dependencies();
    expect((await request(deps, { method: "GET" })).status).toBe(405);
    expect(deps.authenticate).not.toHaveBeenCalled();

    const readBody = vi.fn(async () => body());
    const unauthorized = dependencies({
      authenticate: vi.fn(async () => null),
    });
    const result = await createCentralBusinessMutationRouteHandler(
      unauthorized,
    ).handle({
      method: "POST",
      headers: new Headers(),
      readBody,
    });
    expect(result.status).toBe(401);
    expect(readBody).not.toHaveBeenCalled();
    expect(unauthorized.getRpcClient).not.toHaveBeenCalled();
  });

  it("con autoridad apagada no lee datos ni invoca Supabase", async () => {
    const deps = dependencies();
    const readBody = vi.fn(async () => body());
    const result = await createCentralBusinessMutationRouteHandler(deps).handle({
      method: "POST",
      headers: new Headers({
        authorization: "Bearer synthetic",
        "x-factu-device-token": "synthetic-device",
      }),
      readBody,
    });

    expect(result.status).toBe(409);
    expect(readBody).not.toHaveBeenCalled();
    expect(deps.getRpcClient).not.toHaveBeenCalled();
    expect(result.headers["Cache-Control"]).toContain("no-store");
  });

  it("en canary deriva identidad del servidor y confirma la version central", async () => {
    enableCanary();
    const rpc = vi.fn(async (_name, args) => ({
      error: null,
      data: {
        result_status: "committed",
        event_id: "00000000-0000-4000-8000-000000000010",
        event_sequence: 7,
        entity_version: 1,
        deleted: false,
        content_hash: args.p_content_hash,
      },
    }));
    const deps = dependencies({
      getRpcClient: vi.fn(() => ({ rpc })),
    });

    const result = await request(deps);

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      result: { status: "committed", eventSequence: 7, entityVersion: 1 },
    });
    expect(rpc).toHaveBeenCalledWith(
      "mutate_central_business_entity_v1",
      expect.objectContaining({
        p_user_id: userId,
        p_device_id: "sha256:SYNTHETIC_DEVICE",
      }),
    );
  });

  it("rechaza payload grande, operacion invalida y conflicto de version", async () => {
    enableCanary();
    const deps = dependencies();
    expect(
      (await request(deps, { rawBody: "x".repeat(256 * 1024 + 1) })).status,
    ).toBe(413);
    expect(
      (
        await request(deps, {
          rawBody: body({ operationKind: "merge" }),
        })
      ).status,
    ).toBe(400);

    const conflict = dependencies({
      getRpcClient: vi.fn(() => ({
        async rpc() {
          return {
            data: null,
            error: { code: "P4103", message: "version mismatch" },
          };
        },
      })),
    });
    expect(await request(conflict)).toMatchObject({
      status: 409,
      body: {
        error: {
          code: "CENTRAL_BUSINESS_VERSION_CONFLICT",
          causeCode: "P4103",
        },
      },
    });
  });

  it("distingue idempotencia, entidad inexistente y ocurrencia recurrente", async () => {
    enableCanary();
    const rejected = (code: "P4102" | "P4104" | "P4105") =>
      dependencies({
        getRpcClient: vi.fn(() => ({
          async rpc() {
            return {
              data: null,
              error: { code, message: "synthetic rejection" },
            };
          },
        })),
      });

    expect(await request(rejected("P4102"))).toMatchObject({
      status: 409,
      body: {
        error: {
          code: "CENTRAL_BUSINESS_IDEMPOTENCY_CONFLICT",
          causeCode: "P4102",
        },
      },
    });
    expect(await request(rejected("P4104"))).toMatchObject({
      status: 404,
      body: {
        error: {
          code: "CENTRAL_BUSINESS_ENTITY_NOT_FOUND",
          causeCode: "P4104",
        },
      },
    });
    expect(await request(rejected("P4105"))).toMatchObject({
      status: 409,
      body: {
        error: {
          code: "CENTRAL_BUSINESS_RECURRING_OCCURRENCE_CONFLICT",
          causeCode: "P4105",
        },
      },
    });
  });
});
