import { describe, expect, it, vi } from "vitest";

import {
  buildCentralBusinessBootstrapCommitCommand,
  CENTRAL_BUSINESS_BOOTSTRAP_CONFIRMATION,
} from "./bootstrap-commit";
import {
  buildCentralBusinessBootstrapCommitRpcArgs,
  commitCentralBusinessBootstrapThroughRpc,
  CentralBusinessBootstrapCommitRpcError,
} from "./bootstrap-commit-rpc-adapter";
import { buildCentralBusinessBootstrapPreview } from "./bootstrap-preview";

function command() {
  const entities = [
    {
      entityType: "customer" as const,
      entityId: "customer-a",
      payload: { id: "customer-a", name: "Cliente A" },
    },
  ];
  return buildCentralBusinessBootstrapCommitCommand({
    userId: "user-a",
    deviceId: "device-a",
    sessionId: "session-a",
    idempotencyKey: "bootstrap:synthetic:0001",
    confirmation: CENTRAL_BUSINESS_BOOTSTRAP_CONFIRMATION,
    entities,
    preview: buildCentralBusinessBootstrapPreview({
      localEntities: entities,
      centralEntities: [],
    }),
  });
}

describe("central business bootstrap commit RPC adapter", () => {
  it("elimina la sesion en claro y traduce el resultado", async () => {
    const built = command();
    const args = buildCentralBusinessBootstrapCommitRpcArgs(built);
    const rpc = vi.fn(async () => ({
      data: [
        {
          result_status: "committed",
          created_count: 1,
          identical_count: 0,
          first_event_sequence: 8,
          last_event_sequence: 8,
        },
      ],
      error: null,
    }));

    const result = await commitCentralBusinessBootstrapThroughRpc(
      { rpc },
      built,
    );

    expect(args.p_session_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(args)).not.toContain("session-a");
    expect(result).toMatchObject({
      status: "committed",
      createdCount: 1,
      firstEventSequence: 8,
    });
    expect(rpc).toHaveBeenCalledWith(
      "bootstrap_central_business_entities_v1",
      expect.objectContaining({ p_user_id: "user-a" }),
    );
  });

  it("conserva el SQLSTATE de un rechazo de PostgreSQL", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { code: "P4113", message: "stale" },
    }));

    await expect(
      commitCentralBusinessBootstrapThroughRpc({ rpc }, command()),
    ).rejects.toMatchObject({
      code: "RPC_REJECTED",
      causeCode: "P4113",
    } satisfies Partial<CentralBusinessBootstrapCommitRpcError>);
  });
});
