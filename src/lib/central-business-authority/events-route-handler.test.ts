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
  createCentralBusinessEventsRouteHandler,
  type CentralBusinessEventsRouteDependencies,
} from "./events-route-handler";

const userId = "00000000-0000-4000-8000-000000000001";
const userEmail = "puntoracingrc@gmail.com";

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

function dependencies(
  overrides: Partial<CentralBusinessEventsRouteDependencies> = {},
): CentralBusinessEventsRouteDependencies {
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
            event_id: "00000000-0000-4000-8000-000000000010",
            event_sequence: 8,
            entity_type: "customer",
            entity_id: "SYNTHETIC_CUSTOMER_A",
            entity_version: 1,
            operation_kind: "upsert",
            payload: { id: "SYNTHETIC_CUSTOMER_A" },
            content_hash: "SYNTHETIC_CONTENT_HASH",
            actor_device_id: "sha256:SYNTHETIC_DEVICE",
            created_at: "2026-07-29T12:00:00.000Z",
          }],
        };
      },
    })),
    ...overrides,
  };
}

function request(
  deps: CentralBusinessEventsRouteDependencies,
  input: { method?: string; url?: string } = {},
) {
  return createCentralBusinessEventsRouteHandler(deps).handle({
    method: input.method ?? "GET",
    headers: new Headers({
      authorization: "Bearer synthetic",
      "x-factu-device-token": "synthetic-device",
      "user-agent": "vitest",
    }),
    url:
      input.url ??
      "https://example.test/api/central-business-authority/events?afterSequence=7",
  });
}

describe("central business events route", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rechaza metodos y sesion antes de abrir la capacidad central", async () => {
    const deps = dependencies();
    expect((await request(deps, { method: "POST" })).status).toBe(405);
    expect(deps.authenticate).not.toHaveBeenCalled();

    const unauthorized = dependencies({
      authenticate: vi.fn(async () => null),
    });
    expect((await request(unauthorized)).status).toBe(401);
    expect(unauthorized.verifyDevice).not.toHaveBeenCalled();
    expect(unauthorized.getRpcClient).not.toHaveBeenCalled();
  });

  it("apagada devuelve no-store sin consultar el outbox", async () => {
    const deps = dependencies();
    const response = await request(deps);
    expect(response.status).toBe(409);
    expect(response.headers["Cache-Control"]).toContain("no-store");
    expect(deps.getRpcClient).not.toHaveBeenCalled();
  });

  it("en canary devuelve eventos y cursor monotono", async () => {
    enableCanary();
    const rpc = vi.fn(async () => ({
      error: null,
      data: [{
        event_id: "00000000-0000-4000-8000-000000000010",
        event_sequence: 8,
        entity_type: "customer",
        entity_id: "SYNTHETIC_CUSTOMER_A",
        entity_version: 1,
        operation_kind: "upsert",
        payload: { id: "SYNTHETIC_CUSTOMER_A" },
        content_hash: "SYNTHETIC_CONTENT_HASH",
        actor_device_id: "sha256:SYNTHETIC_DEVICE",
        created_at: "2026-07-29T12:00:00.000Z",
      }],
    }));
    const response = await request(
      dependencies({ getRpcClient: vi.fn(() => ({ rpc })) }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      nextSequence: 8,
      hasMore: false,
      events: [expect.objectContaining({ eventSequence: 8 })],
    });
    expect(rpc).toHaveBeenCalledWith(
      "list_central_business_events_v1",
      expect.objectContaining({ p_after_sequence: 7 }),
    );
  });

  it("rechaza cursores invalidos y limita cada pagina", async () => {
    enableCanary();
    expect(
      (
        await request(dependencies(), {
          url: "https://example.test/api/events?afterSequence=-1",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(dependencies(), {
          url: "https://example.test/api/events?afterSequence=NaN",
        })
      ).status,
    ).toBe(400);
  });
});
