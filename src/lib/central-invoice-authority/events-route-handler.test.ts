import { describe, expect, it, vi } from "vitest";

import {
  createCentralInvoiceAuthorityEventsRouteHandler,
  type CentralInvoiceAuthorityEventsRouteDependencies,
} from "./events-route-handler";

const userId = "00000000-0000-4000-8000-000000000001";

function deps(
  overrides: Partial<CentralInvoiceAuthorityEventsRouteDependencies> = {},
): CentralInvoiceAuthorityEventsRouteDependencies {
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
              event_id: "00000000-0000-4000-8000-000000000020",
              document_id: "00000000-0000-4000-8000-000000000021",
              identity_id: "00000000-0000-4000-8000-000000000022",
              event_type: "invoice_issued",
              created_at: "2026-07-27T12:01:00.000Z",
              full_number: "F-2026-0001",
              sequence: 1,
              document_version: 1,
              document_payload: { document: { number: "F-2026-0001" } },
              emitted_hash: "sha256:materialized",
              safe_summary: { fullNumber: "F-2026-0001" },
            },
          ],
        };
      },
    })),
    ...overrides,
  };
}

async function request(
  dependencies: CentralInvoiceAuthorityEventsRouteDependencies,
  input: {
    method?: string;
    authorization?: string | null;
    deviceToken?: string | null;
    url?: string;
  } = {},
) {
  const handler = createCentralInvoiceAuthorityEventsRouteHandler(dependencies);
  const headers = new Headers();
  if (input.authorization !== null) {
    headers.set("authorization", input.authorization ?? "Bearer token");
  }
  if (input.deviceToken !== null) {
    headers.set("x-factu-device-token", input.deviceToken ?? "device-token");
  }
  headers.set("user-agent", "vitest");

  return handler.handle({
    method: input.method ?? "GET",
    headers,
    url:
      input.url ??
      "http://localhost/api/central-invoice-authority/events?limit=25",
  });
}

describe("central invoice authority events route handler", () => {
  it("rechaza metodos no permitidos antes de autenticar", async () => {
    const dependencies = deps();
    const response = await request(dependencies, { method: "POST" });

    expect(response.status).toBe(405);
    expect(response.headers.Allow).toBe("GET, OPTIONS");
    expect(dependencies.authenticate).not.toHaveBeenCalled();
  });

  it("requiere sesion confirmada antes de rate limit o RPC", async () => {
    const dependencies = deps({ authenticate: vi.fn(async () => null) });
    const response = await request(dependencies, { authorization: null });

    expect(response.status).toBe(401);
    expect(dependencies.rateLimit).not.toHaveBeenCalled();
    expect(dependencies.getRpcClient).not.toHaveBeenCalled();
  });

  it("bloquea dispositivos invalidos antes de consultar eventos", async () => {
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

  it("devuelve eventos con cursor siguiente y cabeceras privadas", async () => {
    const rpc = vi.fn(async (_name, args) => ({
      error: null,
      data: [
        {
          event_id: "00000000-0000-4000-8000-000000000020",
          document_id: "00000000-0000-4000-8000-000000000021",
          identity_id: "00000000-0000-4000-8000-000000000022",
          event_type: "invoice_issued",
          created_at: "2026-07-27T12:01:00.000Z",
          full_number: "F-2026-0001",
          sequence: 1,
          document_version: 1,
          document_payload: { document: { number: "F-2026-0001" } },
          emitted_hash: "sha256:materialized",
          safe_summary: { fullNumber: "F-2026-0001" },
          args,
        },
      ],
    }));
    const dependencies = deps({ getRpcClient: vi.fn(() => ({ rpc })) });
    const response = await request(dependencies, {
      url:
        "http://localhost/api/central-invoice-authority/events?afterCreatedAt=2026-07-27T12%3A00%3A00.000Z&afterEventId=00000000-0000-4000-8000-000000000010&limit=250",
    });
    const body = response.body as {
      ok: boolean;
      events: unknown[];
      nextCursor: { afterCreatedAt: string; afterEventId: string };
    };

    expect(response.status).toBe(200);
    expect(response.headers["Cache-Control"]).toContain("no-store");
    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_user_id: userId,
      p_device_id: "sha256:SYNTHETIC_ONLY_DEVICE_HASH",
      p_limit: 100,
    });
    expect(body.ok).toBe(true);
    expect(body.events).toHaveLength(1);
    expect(body.nextCursor).toEqual({
      afterCreatedAt: "2026-07-27T12:01:00.000Z",
      afterEventId: "00000000-0000-4000-8000-000000000020",
    });
    expect(JSON.stringify(body)).not.toContain("emittedSnapshot");
  });

  it("rechaza cursores mal formados", async () => {
    const dependencies = deps();

    await expect(
      request(dependencies, {
        url: "http://localhost/api/central-invoice-authority/events?limit=10abc",
      }),
    ).resolves.toMatchObject({ status: 400 });
    await expect(
      request(dependencies, {
        url:
          "http://localhost/api/central-invoice-authority/events?afterEventId=not-a-uuid",
      }),
    ).resolves.toMatchObject({ status: 400 });
  });
});
