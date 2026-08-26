import { describe, expect, it, vi } from "vitest";

import {
  createCentralInvoiceAuthorityRelationshipRouteHandler,
  type CentralInvoiceAuthorityRelationshipRouteDependencies,
} from "./relationship-route-handler";

const userId = "00000000-0000-4000-8000-000000000001";
const body = {
  idempotencyKey: "central-relationship:invoice-1:1:unlink-quote",
  documentRef: {
    serverDocumentId: "00000000-0000-4000-8000-000000000010",
    identityId: "00000000-0000-4000-8000-000000000011",
    expectedVersion: 1,
  },
  quoteDocumentId: "quote-1",
};

function dependencies(
  overrides: Partial<CentralInvoiceAuthorityRelationshipRouteDependencies> = {},
): CentralInvoiceAuthorityRelationshipRouteDependencies {
  return {
    authenticate: vi.fn(async () => ({
      userId,
      sessionId: "00000000-0000-4000-8000-000000000002",
    })),
    rateLimit: vi.fn(async () => ({ allowed: true as const })),
    verifyDevice: vi.fn(async () => ({
      allowed: true as const,
      deviceId: "sha256:SYNTHETIC_ONLY_DEVICE_HASH",
    })),
    getRpcClient: vi.fn(() => ({
      async rpc() {
        return {
          error: null,
          data: [
            {
              result_status: "committed",
              document_id: body.documentRef.serverDocumentId,
              identity_id: body.documentRef.identityId,
              outbox_event_id: "00000000-0000-4000-8000-000000000012",
              full_number: "F-2026-0001",
              sequence: 1,
              document_version: 2,
              source_quote_document_id: body.quoteDocumentId,
              source_quote_number: "P-2026-0007",
            },
          ],
        };
      },
    })),
    ...overrides,
  };
}

async function request(
  deps: CentralInvoiceAuthorityRelationshipRouteDependencies,
  input: { method?: string; rawBody?: string } = {},
) {
  const handler = createCentralInvoiceAuthorityRelationshipRouteHandler(deps);
  return handler.handle({
    method: input.method ?? "POST",
    headers: new Headers({
      authorization: "Bearer token",
      "x-factu-device-token": "device-token",
      "user-agent": "vitest",
    }),
    readBody: async () => input.rawBody ?? JSON.stringify(body),
  });
}

describe("central invoice authority relationship route", () => {
  it("rechaza metodos no permitidos antes de autenticar", async () => {
    const deps = dependencies();
    const response = await request(deps, { method: "GET" });
    expect(response.status).toBe(405);
    expect(deps.authenticate).not.toHaveBeenCalled();
  });

  it("requiere sesion y dispositivo valido", async () => {
    const noSession = dependencies({ authenticate: vi.fn(async () => null) });
    expect((await request(noSession)).status).toBe(401);

    const noDevice = dependencies({
      verifyDevice: vi.fn(async () => ({
        allowed: false as const,
        status: 403,
        code: "device_revoked",
        message: "Dispositivo revocado.",
      })),
    });
    expect((await request(noDevice)).status).toBe(403);
  });

  it("asigna mediante RPC privada y devuelve cabeceras no cacheables", async () => {
    const rpc = vi.fn(async () => ({
      error: null,
      data: [
        {
          result_status: "committed",
          document_id: body.documentRef.serverDocumentId,
          identity_id: body.documentRef.identityId,
          outbox_event_id: "00000000-0000-4000-8000-000000000012",
          full_number: "F-2026-0001",
          sequence: 1,
          document_version: 2,
          source_quote_document_id: body.quoteDocumentId,
          source_quote_number: "P-2026-0007",
        },
      ],
    }));
    const deps = dependencies({ getRpcClient: vi.fn(() => ({ rpc })) });
    const response = await request(deps);

    expect(response.status).toBe(200);
    expect(response.headers["Cache-Control"]).toContain("no-store");
    expect(rpc).toHaveBeenCalledWith(
      "set_central_invoice_quote_relationship_v1",
      expect.objectContaining({
        p_user_id: userId,
        p_document_id: body.documentRef.serverDocumentId,
        p_identity_id: body.documentRef.identityId,
        p_quote_entity_id: body.quoteDocumentId,
      }),
    );
  });

  it("interpreta un cliente instalado antiguo como una desvinculacion", async () => {
    const rpc = vi.fn(async (_name, args) => {
      expect(args.p_quote_entity_id).toBeNull();
      return {
        error: null,
        data: [
          {
            result_status: "committed",
            document_id: body.documentRef.serverDocumentId,
            identity_id: body.documentRef.identityId,
            outbox_event_id: "00000000-0000-4000-8000-000000000014",
            full_number: "F-2026-0001",
            sequence: 1,
            document_version: 3,
            source_quote_document_id: null,
            source_quote_number: null,
          },
        ],
      };
    });
    const deps = dependencies({ getRpcClient: vi.fn(() => ({ rpc })) });
    const legacyBody = {
      idempotencyKey: body.idempotencyKey,
      documentRef: body.documentRef,
    };

    expect(
      (await request(deps, { rawBody: JSON.stringify(legacyBody) })).status,
    ).toBe(200);
  });

  it("rechaza cuerpos incompletos antes de llamar a Supabase", async () => {
    const deps = dependencies();
    const response = await request(deps, { rawBody: "{}" });
    expect(response.status).toBe(400);
    expect(deps.getRpcClient).not.toHaveBeenCalled();
  });
});
