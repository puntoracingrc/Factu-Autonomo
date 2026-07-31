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
  createCentralBusinessNumberedDocumentRouteHandler,
  type CentralBusinessNumberedDocumentRouteDependencies,
} from "./numbered-document-route-handler";

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

function reconciliationBody() {
  return JSON.stringify({
    action: "reconcile_series",
    idempotencyKey: "SYNTHETIC_RECONCILIATION_A",
    entityType: "quote",
    numberTemplate: "P-{year}-{num}",
    fiscalYear: 2026,
    observedMaxSequence: 8,
    sourceDocumentCount: 8,
    sourceDigest: `sha256:${"a".repeat(64)}`,
  });
}

function creationBody() {
  return JSON.stringify({
    action: "create",
    idempotencyKey: "SYNTHETIC_NUMBERED_CREATE_A",
    entityType: "quote",
    entityId: "quote-a",
    numberTemplate: "P-{year}-{num}",
    padding: 4,
    fiscalYear: 2026,
    payloadWithoutNumber: {
      id: "quote-a",
      type: "presupuesto",
      date: "2026-07-31",
    },
  });
}

function dependencies(
  overrides: Partial<CentralBusinessNumberedDocumentRouteDependencies> = {},
): CentralBusinessNumberedDocumentRouteDependencies {
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
        name:
          | "reconcile_central_business_document_series_v1"
          | "create_central_business_document_v1",
      ) {
        if (name === "reconcile_central_business_document_series_v1") {
          return {
            error: null,
            data: {
              result_status: "committed",
              reconciliation_id:
                "00000000-0000-4000-8000-000000000010",
              scope_year: 2026,
              previous_sequence: 4,
              resulting_sequence: 8,
            },
          };
        }
        return {
          error: null,
          data: {
            result_status: "committed",
            event_id: "00000000-0000-4000-8000-000000000011",
            event_sequence: 12,
            entity_version: 1,
            full_number: "P-2026-0009",
            sequence: 9,
            scope_year: 2026,
            content_hash: "a".repeat(64),
            document_payload: {
              id: "quote-a",
              type: "presupuesto",
              date: "2026-07-31",
              number: "P-2026-0009",
            },
          },
        };
      },
    })),
    ...overrides,
  };
}

async function request(
  deps: CentralBusinessNumberedDocumentRouteDependencies,
  rawBody: string,
) {
  return createCentralBusinessNumberedDocumentRouteHandler(deps).handle({
    method: "POST",
    headers: new Headers({
      authorization: "Bearer synthetic",
      "x-factu-device-token": "synthetic-device",
      "user-agent": "vitest",
    }),
    readBody: async () => rawBody,
  });
}

describe("central business numbered document route", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("no lee negocio con sesion ausente o autoridad apagada", async () => {
    const readBody = vi.fn(async () => creationBody());
    const unauthorized = dependencies({
      authenticate: vi.fn(async () => null),
    });
    const result = await createCentralBusinessNumberedDocumentRouteHandler(
      unauthorized,
    ).handle({
      method: "POST",
      headers: new Headers(),
      readBody,
    });
    expect(result.status).toBe(401);
    expect(readBody).not.toHaveBeenCalled();

    const disabled = dependencies();
    const disabledRead = vi.fn(async () => creationBody());
    const disabledResult =
      await createCentralBusinessNumberedDocumentRouteHandler(
        disabled,
      ).handle({
        method: "POST",
        headers: new Headers({
          authorization: "Bearer synthetic",
          "x-factu-device-token": "synthetic-device",
        }),
        readBody: disabledRead,
      });
    expect(disabledResult.status).toBe(409);
    expect(disabledRead).not.toHaveBeenCalled();
    expect(disabledResult.headers["Cache-Control"]).toContain("no-store");
  });

  it("concilia y crea usando exclusivamente la identidad del servidor", async () => {
    enableCanary();
    const deps = dependencies();
    const reconciled = await request(deps, reconciliationBody());
    expect(reconciled).toMatchObject({
      status: 200,
      body: {
        ok: true,
        result: { action: "reconcile_series", resultingSequence: 8 },
      },
    });

    const created = await request(deps, creationBody());
    expect(created).toMatchObject({
      status: 200,
      body: {
        ok: true,
        result: {
          action: "create",
          fullNumber: "P-2026-0009",
          documentPayload: { number: "P-2026-0009" },
        },
      },
    });
  });

  it("traduce la falta de conciliacion y rechaza cuerpos ambiguos", async () => {
    enableCanary();
    const conflict = dependencies({
      getRpcClient: vi.fn(() => ({
        async rpc() {
          return {
            data: null,
            error: { code: "P4134", message: "baseline missing" },
          };
        },
      })),
    });
    expect(await request(conflict, creationBody())).toMatchObject({
      status: 409,
      body: {
        error: {
          code: "CENTRAL_BUSINESS_SERIES_RECONCILIATION_REQUIRED",
          causeCode: "P4134",
        },
      },
    });
    expect(await request(dependencies(), "{}")).toMatchObject({
      status: 400,
      body: { error: { code: "INVALID_BODY" } },
    });
  });
});
