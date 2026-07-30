import { describe, expect, it, vi } from "vitest";

import { CENTRAL_BUSINESS_BOOTSTRAP_CONFIRMATION } from "./bootstrap-commit";
import {
  createCentralBusinessBootstrapCommitRouteHandler,
} from "./bootstrap-commit-route-handler";
import {
  CENTRAL_BUSINESS_BOOTSTRAP_COMMIT_RPC_ADAPTER,
  CentralBusinessBootstrapCommitRpcError,
} from "./bootstrap-commit-rpc-adapter";
import { buildCentralBusinessBootstrapPreview } from "./bootstrap-preview";

const entities = [
  {
    entityType: "customer" as const,
    entityId: "customer-a",
    payload: { id: "customer-a", name: "Cliente A" },
  },
];

function body(overrides: Record<string, unknown> = {}) {
  const preview = buildCentralBusinessBootstrapPreview({
    localEntities: entities,
    centralEntities: [],
  });
  return JSON.stringify({
    idempotencyKey: "bootstrap:synthetic:0001",
    confirmation: CENTRAL_BUSINESS_BOOTSTRAP_CONFIRMATION,
    snapshotDigest: preview.snapshotDigest,
    centralStateDigest: preview.centralStateDigest,
    previewDigest: preview.previewDigest,
    entities,
    ...overrides,
  });
}

function request(raw = body()) {
  return {
    method: "POST",
    headers: new Headers({
      authorization: "Bearer synthetic",
      "x-factu-device-token": "synthetic-device",
    }),
    readBody: async () => raw,
  };
}

function dependencies() {
  return {
    authenticate: vi.fn(
      async (): Promise<{
        userId: string;
        sessionId: string;
      } | null> => ({
        userId: "user-a",
        sessionId: "session-a",
      }),
    ),
    rateLimit: vi.fn(async () => ({ allowed: true as const })),
    verifyDevice: vi.fn(async () => ({
      allowed: true as const,
      deviceId: "device-a",
    })),
    listCentralEntities: vi.fn(async () => []),
    commit: vi.fn(async () => ({
      schema:
        CENTRAL_BUSINESS_BOOTSTRAP_COMMIT_RPC_ADAPTER as typeof CENTRAL_BUSINESS_BOOTSTRAP_COMMIT_RPC_ADAPTER,
      status: "committed" as const,
      createdCount: 1,
      identicalCount: 0,
      firstEventSequence: 10,
      lastEventSequence: 10,
    })),
  };
}

describe("central business bootstrap commit route", () => {
  it("revalida y confirma un lote sin devolver payloads", async () => {
    const deps = dependencies();
    const handler = createCentralBusinessBootstrapCommitRouteHandler(deps);

    const result = await handler.handle(request());

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      result: { status: "committed", createdCount: 1 },
    });
    expect(JSON.stringify(result.body)).not.toContain("Cliente A");
    expect(deps.commit).toHaveBeenCalledTimes(1);
    expect(result.headers["Cache-Control"]).toContain("no-store");
  });

  it("aborta antes de la RPC cuando la vista previa ha caducado", async () => {
    const deps = dependencies();
    const handler = createCentralBusinessBootstrapCommitRouteHandler(deps);

    const result = await handler.handle(
      request(body({ previewDigest: "0".repeat(64) })),
    );

    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({
      error: { code: "BOOTSTRAP_PREVIEW_STALE" },
    });
    expect(deps.commit).not.toHaveBeenCalled();
  });

  it("traduce una carrera detectada dentro de PostgreSQL", async () => {
    const deps = dependencies();
    deps.commit.mockRejectedValueOnce(
      new CentralBusinessBootstrapCommitRpcError(
        "RPC_REJECTED",
        "stale",
        "P4113",
      ),
    );
    const handler = createCentralBusinessBootstrapCommitRouteHandler(deps);

    const result = await handler.handle(request());

    expect(result.status).toBe(409);
    expect(result.body).toEqual({
      ok: false,
      error: { code: "BOOTSTRAP_PREVIEW_STALE" },
    });
  });

  it("no lee ni escribe sin autenticacion", async () => {
    const deps = dependencies();
    deps.authenticate.mockResolvedValueOnce(null);
    const handler = createCentralBusinessBootstrapCommitRouteHandler(deps);

    const result = await handler.handle(request());

    expect(result.status).toBe(401);
    expect(deps.listCentralEntities).not.toHaveBeenCalled();
    expect(deps.commit).not.toHaveBeenCalled();
  });
});
