import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CENTRAL_INVOICE_AUTHORITY_BASELINE_RECONCILED_KEY,
  CENTRAL_INVOICE_AUTHORITY_CANARY_USER_EMAILS_KEY,
  CENTRAL_INVOICE_AUTHORITY_ISOLATED_RESTORE_DRILL_PASSED_KEY,
  CENTRAL_INVOICE_AUTHORITY_MODE_KEY,
  CENTRAL_INVOICE_AUTHORITY_OPERATIONAL_SYNC_READY_KEY,
  CENTRAL_INVOICE_AUTHORITY_RESTORABLE_BACKUP_VERIFIED_KEY,
  CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION,
  CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION_KEY,
} from "./activation";
import {
  createCentralInvoiceAuthorityIssueRouteHandler,
  type CentralInvoiceAuthorityIssueRouteDependencies,
} from "./issue-route-handler";

const userId = "00000000-0000-4000-8000-000000000001";
const userEmail = "puntoracingrc@gmail.com";
const activeEnv = {
  [CENTRAL_INVOICE_AUTHORITY_MODE_KEY]: "canary",
  [CENTRAL_INVOICE_AUTHORITY_CANARY_USER_EMAILS_KEY]: userEmail,
  [CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION_KEY]:
    CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION,
  [CENTRAL_INVOICE_AUTHORITY_OPERATIONAL_SYNC_READY_KEY]: "true",
  [CENTRAL_INVOICE_AUTHORITY_BASELINE_RECONCILED_KEY]: "true",
  [CENTRAL_INVOICE_AUTHORITY_RESTORABLE_BACKUP_VERIFIED_KEY]: "true",
  [CENTRAL_INVOICE_AUTHORITY_ISOLATED_RESTORE_DRILL_PASSED_KEY]: "true",
};

function body(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    kind: "invoice",
    idempotencyKey: "SYNTHETIC_ONLY_ROUTE_KEY_A",
    draft: {
      localDocumentId: "SYNTHETIC_ONLY_LOCAL_DOC_A",
      expectedVersion: 0,
      draftHash: "sha256:SYNTHETIC_ONLY_DRAFT_HASH_A",
    },
    series: {
      environment: "test",
      issuerNif: "B00000000",
      seriesCode: "F-2026",
      fiscalYear: 2026,
    },
    issuedAt: "2026-07-27T12:00:00.000Z",
    documentPayload: {
      synthetic: true,
      fiscalPayloadShouldNotLeak: "line total 123.45",
    },
    emittedSnapshot: {
      synthetic: true,
      emittedSnapshotShouldNotLeak: "frozen customer",
    },
    emittedHash: "sha256:SYNTHETIC_ONLY_EMITTED_HASH_A",
    ...overrides,
  });
}

function deps(
  overrides: Partial<CentralInvoiceAuthorityIssueRouteDependencies> = {},
): CentralInvoiceAuthorityIssueRouteDependencies {
  return {
    authenticate: vi.fn(async () => ({
      userId,
      userEmail,
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
              document_id: "00000000-0000-4000-8000-000000000010",
              identity_id: "00000000-0000-4000-8000-000000000011",
              outbox_event_id: "00000000-0000-4000-8000-000000000012",
              full_number: "F-2026-0001",
              sequence: 1,
              document_version: 1,
            },
          ],
        };
      },
    })),
    ...overrides,
  };
}

async function request(
  dependencies: CentralInvoiceAuthorityIssueRouteDependencies,
  input: {
    method?: string;
    authorization?: string | null;
    deviceToken?: string | null;
    rawBody?: string;
  } = {},
) {
  const handler = createCentralInvoiceAuthorityIssueRouteHandler(dependencies);
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
    readBody: () => Promise.resolve(input.rawBody ?? body()),
  });
}

describe("central invoice authority issue route handler", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rechaza metodos que no sean POST/OPTIONS sin autenticar ni llamar RPC", async () => {
    const dependencies = deps();
    const response = await request(dependencies, { method: "GET" });

    expect(response.status).toBe(405);
    expect(response.headers.Allow).toBe("POST, OPTIONS");
    expect(dependencies.authenticate).not.toHaveBeenCalled();
    expect(dependencies.getRpcClient).not.toHaveBeenCalled();
  });

  it("rechaza una sesion ausente antes de rate limit, dispositivo o RPC", async () => {
    const dependencies = deps({ authenticate: vi.fn(async () => null) });
    const response = await request(dependencies, { authorization: null });

    expect(response.status).toBe(401);
    expect(dependencies.rateLimit).not.toHaveBeenCalled();
    expect(dependencies.verifyDevice).not.toHaveBeenCalled();
    expect(dependencies.getRpcClient).not.toHaveBeenCalled();
  });

  it("bloquea dispositivo no valido antes de leer el payload fiscal", async () => {
    const readBody = vi.fn(async () => body());
    const dependencies = deps({
      verifyDevice: vi.fn(async () => ({
        allowed: false as const,
        status: 400,
        code: "INVALID_DEVICE_TOKEN",
        message: "Identificador de dispositivo no valido.",
      })),
    });
    const handler = createCentralInvoiceAuthorityIssueRouteHandler(dependencies);
    const response = await handler.handle({
      method: "POST",
      headers: new Headers({ authorization: "Bearer token" }),
      readBody,
    });

    expect(response.status).toBe(400);
    expect(readBody).not.toHaveBeenCalled();
    expect(dependencies.getRpcClient).not.toHaveBeenCalled();
  });

  it("con activacion apagada devuelve bloqueo seguro sin invocar RPC", async () => {
    const rpc = vi.fn();
    const dependencies = deps({
      getRpcClient: vi.fn(() => ({ rpc })),
    });
    const response = await request(dependencies);

    expect(response.status).toBe(409);
    expect(JSON.stringify(response.body)).toContain(
      "CENTRAL_AUTHORITY_DISABLED",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("en canary activo deriva auth servidor y devuelve solo resumen seguro", async () => {
    vi.stubEnv(CENTRAL_INVOICE_AUTHORITY_MODE_KEY, activeEnv[CENTRAL_INVOICE_AUTHORITY_MODE_KEY]);
    vi.stubEnv(
      CENTRAL_INVOICE_AUTHORITY_CANARY_USER_EMAILS_KEY,
      activeEnv[CENTRAL_INVOICE_AUTHORITY_CANARY_USER_EMAILS_KEY],
    );
    vi.stubEnv(
      CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION_KEY,
      activeEnv[CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION_KEY],
    );
    vi.stubEnv(
      CENTRAL_INVOICE_AUTHORITY_OPERATIONAL_SYNC_READY_KEY,
      activeEnv[CENTRAL_INVOICE_AUTHORITY_OPERATIONAL_SYNC_READY_KEY],
    );
    vi.stubEnv(
      CENTRAL_INVOICE_AUTHORITY_BASELINE_RECONCILED_KEY,
      activeEnv[CENTRAL_INVOICE_AUTHORITY_BASELINE_RECONCILED_KEY],
    );
    vi.stubEnv(
      CENTRAL_INVOICE_AUTHORITY_RESTORABLE_BACKUP_VERIFIED_KEY,
      activeEnv[CENTRAL_INVOICE_AUTHORITY_RESTORABLE_BACKUP_VERIFIED_KEY],
    );
    vi.stubEnv(
      CENTRAL_INVOICE_AUTHORITY_ISOLATED_RESTORE_DRILL_PASSED_KEY,
      activeEnv[CENTRAL_INVOICE_AUTHORITY_ISOLATED_RESTORE_DRILL_PASSED_KEY],
    );
    const rpc = vi.fn(async (_name, args) => ({
      error: null,
      data: {
        result_status: "committed",
        document_id: "00000000-0000-4000-8000-000000000010",
        identity_id: "00000000-0000-4000-8000-000000000011",
        outbox_event_id: "00000000-0000-4000-8000-000000000012",
        full_number: "F-2026-0001",
        sequence: 1,
        document_version: 1,
        args,
      },
    }));
    const dependencies = deps({
      getRpcClient: vi.fn(() => ({ rpc })),
    });

    const response = await request(dependencies);
    const serialized = JSON.stringify(response.body);

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc.mock.calls[0][1].p_user_id).toBe(userId);
    expect(rpc.mock.calls[0][1].p_device_id).toBe(
      "sha256:SYNTHETIC_ONLY_DEVICE_HASH",
    );
    expect(rpc.mock.calls[0][1].p_session_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(serialized).toContain("F-2026-0001");
    expect(serialized).not.toContain("fiscalPayloadShouldNotLeak");
    expect(serialized).not.toContain("emittedSnapshotShouldNotLeak");
  });

  it("rechaza payloads demasiado grandes antes del servicio", async () => {
    const dependencies = deps();
    const response = await request(dependencies, {
      rawBody: "x".repeat(512 * 1024 + 1),
    });

    expect(response.status).toBe(413);
    expect(dependencies.getRpcClient).not.toHaveBeenCalled();
  });
});
