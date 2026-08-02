import { describe, expect, it, vi } from "vitest";

import {
  createCentralInvoiceAuthorityCollectionRouteHandler,
  type CentralInvoiceAuthorityCollectionRouteDependencies,
} from "./collection-route-handler";

const userId = "00000000-0000-4000-8000-000000000001";

const body = {
  idempotencyKey: "central-collection:invoice-1:1:paid:20260728T090000000Z",
  documentRef: {
    serverDocumentId: "00000000-0000-4000-8000-000000000010",
    identityId: "00000000-0000-4000-8000-000000000011",
    expectedVersion: 1,
  },
  status: "pagado",
  paymentStatus: "paid",
  paidAt: "2026-07-28T09:00:00.000Z",
  documentPayload: {
    schema: "CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY_V1",
    localDocumentId: "invoice-1",
    document: {
      id: "invoice-1",
      number: "F-2026-0001",
      status: "pagado",
      paymentStatus: "paid",
      paidAt: "2026-07-28T09:00:00.000Z",
    },
  },
};

function deps(
  overrides: Partial<CentralInvoiceAuthorityCollectionRouteDependencies> = {},
): CentralInvoiceAuthorityCollectionRouteDependencies {
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
            },
          ],
        };
      },
    })),
    ...overrides,
  };
}

async function request(
  dependencies: CentralInvoiceAuthorityCollectionRouteDependencies,
  input: {
    method?: string;
    authorization?: string | null;
    deviceToken?: string | null;
    rawBody?: string;
  } = {},
) {
  const handler = createCentralInvoiceAuthorityCollectionRouteHandler(dependencies);
  const headers = new Headers();
  if (input.authorization !== null) {
    headers.set("authorization", input.authorization ?? "Bearer token");
  }
  if (input.deviceToken !== null) {
    headers.set("x-factu-device-token", input.deviceToken ?? "device-token");
  }
  headers.set("user-agent", "vitest");

  return handler.handle({
    method: input.method ?? "POST",
    headers,
    readBody: async () => input.rawBody ?? JSON.stringify(body),
  });
}

describe("central invoice authority collection route handler", () => {
  it("rechaza metodos no permitidos antes de autenticar", async () => {
    const dependencies = deps();
    const response = await request(dependencies, { method: "GET" });

    expect(response.status).toBe(405);
    expect(response.headers.Allow).toBe("POST, OPTIONS");
    expect(dependencies.authenticate).not.toHaveBeenCalled();
  });

  it("requiere sesion confirmada antes de rate limit o RPC", async () => {
    const dependencies = deps({ authenticate: vi.fn(async () => null) });
    const response = await request(dependencies, { authorization: null });

    expect(response.status).toBe(401);
    expect(dependencies.rateLimit).not.toHaveBeenCalled();
    expect(dependencies.getRpcClient).not.toHaveBeenCalled();
  });

  it("bloquea dispositivos invalidos antes de actualizar cobros", async () => {
    const dependencies = deps({
      verifyDevice: vi.fn(async () => ({
        allowed: false as const,
        status: 403,
        code: "device_revoked",
        message: "Dispositivo revocado.",
      })),
    });
    const response = await request(dependencies);

    expect(response.status).toBe(403);
    expect(dependencies.getRpcClient).not.toHaveBeenCalled();
  });

  it("actualiza cobro mediante RPC server-only con cabeceras privadas", async () => {
    const rpc = vi.fn(async (_name, args) => ({
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
          args,
        },
      ],
    }));
    const dependencies = deps({ getRpcClient: vi.fn(() => ({ rpc })) });
    const response = await request(dependencies);
    const payload = response.body as { ok: boolean; rpcResult: unknown };

    expect(response.status).toBe(200);
    expect(response.headers["Cache-Control"]).toContain("no-store");
    expect(rpc.mock.calls[0][0]).toBe("update_central_invoice_collection_v1");
    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_user_id: userId,
      p_device_id: "sha256:SYNTHETIC_ONLY_DEVICE_HASH",
      p_document_id: body.documentRef.serverDocumentId,
      p_identity_id: body.documentRef.identityId,
      p_status: "pagado",
      p_payment_status: "paid",
    });
    expect(payload.ok).toBe(true);
    expect(JSON.stringify(payload)).not.toContain("emittedSnapshot");
  });

  it("rechaza cuerpos invalidos sin llamar a Supabase", async () => {
    const dependencies = deps();
    const response = await request(dependencies, { rawBody: "{}" });

    expect(response.status).toBe(400);
    expect(dependencies.getRpcClient).not.toHaveBeenCalled();
  });

  it("devuelve el motivo seguro cuando la RPC rechaza un cobro", async () => {
    const dependencies = deps({
      getRpcClient: vi.fn(() => ({
        async rpc() {
          return {
            data: null,
            error: {
              code: "P0001",
              message: "central invoice collection payload mismatch",
            },
          };
        },
      })),
    });
    const response = await request(dependencies);
    const payload = response.body as {
      ok: boolean;
      error?: {
        code?: string;
        causeCode?: string;
        causeMessage?: string;
      };
    };

    expect(response.status).toBe(409);
    expect(payload.error).toMatchObject({
      code: "COLLECTION_RPC_REJECTED",
      causeCode: "P0001",
      causeMessage: "central invoice collection payload mismatch",
    });
  });
});
