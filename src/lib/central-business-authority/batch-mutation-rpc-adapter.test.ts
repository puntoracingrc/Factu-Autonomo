import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import {
  buildCentralBusinessBatchMutationRpcArgs,
  mutateCentralBusinessBatchThroughRpc,
} from "./batch-mutation-rpc-adapter";
import { buildCentralBusinessMutationCommand } from "./mutation-command";

const auth = {
  userId: "00000000-0000-4000-8000-000000000001",
  deviceId: "sha256:SYNTHETIC_DEVICE",
  sessionId: "SYNTHETIC_SESSION",
  userIdSource: "test" as const,
};

function commands() {
  return [
    buildCentralBusinessMutationCommand({
      auth,
      idempotencyKey: "SYNTHETIC_BATCH_SUPPLIER",
      operationKind: "upsert",
      entityType: "supplier",
      entityId: "supplier-1",
      expectedVersion: 0,
      payload: { id: "supplier-1", name: "Synthetic supplier" },
    }),
    buildCentralBusinessMutationCommand({
      auth,
      idempotencyKey: "SYNTHETIC_BATCH_EXPENSE",
      operationKind: "upsert",
      entityType: "expense",
      entityId: "expense-1",
      expectedVersion: 0,
      payload: { id: "expense-1", supplierId: "supplier-1" },
    }),
  ];
}

describe("central business batch mutation RPC adapter", () => {
  it("solo envia hashes, versiones y un indice estable por operacion", () => {
    const args = buildCentralBusinessBatchMutationRpcArgs(commands());
    const serialized = JSON.stringify(args);

    expect(args.p_session_hash).toBe(
      createHash("sha256").update(auth.sessionId).digest("hex"),
    );
    expect(args.p_operations).toEqual([
      expect.objectContaining({
        operationIndex: 0,
        entityType: "supplier",
        expectedVersion: 0,
      }),
      expect.objectContaining({
        operationIndex: 1,
        entityType: "expense",
        expectedVersion: 0,
      }),
    ]);
    expect(serialized).not.toContain("SYNTHETIC_BATCH_SUPPLIER");
    expect(serialized).not.toContain("SYNTHETIC_SESSION");
  });

  it("normaliza el orden original y falla cerrado si faltan resultados", async () => {
    const batchCommands = commands();
    const rpc = vi.fn(async () => ({
      error: null,
      data: [1, 0].map((operationIndex) => ({
        operation_index: operationIndex,
        result_status: "committed",
        event_id: `00000000-0000-4000-8000-00000000001${operationIndex}`,
        event_sequence: operationIndex + 1,
        entity_version: 1,
        deleted: false,
        content_hash: batchCommands[operationIndex]?.contentHash,
      })),
    }));
    await expect(
      mutateCentralBusinessBatchThroughRpc({ rpc }, batchCommands),
    ).resolves.toMatchObject({
      operations: [
        { operationIndex: 0 },
        { operationIndex: 1 },
      ],
    });
    expect(rpc).toHaveBeenCalledWith(
      "mutate_central_business_batch_v1",
      expect.objectContaining({ p_user_id: auth.userId }),
    );

    await expect(
      mutateCentralBusinessBatchThroughRpc(
        { rpc: async () => ({ data: [], error: null }) },
        batchCommands,
      ),
    ).rejects.toMatchObject({ code: "INVALID_RPC_RESULT" });
  });
});
