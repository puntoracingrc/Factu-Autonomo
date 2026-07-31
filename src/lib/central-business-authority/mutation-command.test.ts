import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import {
  buildCentralBusinessMutationCommand,
  CentralBusinessMutationCommandError,
} from "./mutation-command";
import {
  buildCentralBusinessMutationRpcArgs,
  mutateCentralBusinessThroughRpc,
} from "./mutation-rpc-adapter";

function input() {
  return {
    auth: {
      userId: "00000000-0000-4000-8000-000000000001",
      deviceId: "sha256:SYNTHETIC_DEVICE",
      sessionId: "SYNTHETIC_SESSION",
      userIdSource: "test" as const,
    },
    idempotencyKey: "SYNTHETIC_MUTATION_KEY_A",
    operationKind: "upsert" as const,
    entityType: "customer" as const,
    entityId: "SYNTHETIC_CUSTOMER_A",
    expectedVersion: 0,
    payload: {
      id: "SYNTHETIC_CUSTOMER_A",
      name: "Synthetic customer",
      nested: { b: 2, a: 1 },
    },
  };
}

describe("central business mutation command", () => {
  it("produce hashes estables sin enviar clave idempotente ni sesion en claro", () => {
    const first = buildCentralBusinessMutationCommand(
      input(),
      "SYNTHETIC_REQUEST_A",
    );
    const second = buildCentralBusinessMutationCommand(
      {
        ...input(),
        payload: {
          nested: { a: 1, b: 2 },
          name: "Synthetic customer",
          id: "SYNTHETIC_CUSTOMER_A",
        },
      },
      "SYNTHETIC_REQUEST_B",
    );
    const args = buildCentralBusinessMutationRpcArgs(first);
    const serialized = JSON.stringify(args);

    expect(first.contentHash).toBe(second.contentHash);
    expect(first.requestHash).toBe(second.requestHash);
    expect(args.p_session_hash).toBe(
      createHash("sha256").update("SYNTHETIC_SESSION").digest("hex"),
    );
    expect(serialized).not.toContain("SYNTHETIC_MUTATION_KEY_A");
    expect(serialized).not.toContain("SYNTHETIC_SESSION");
  });

  it("exige objeto para upsert, null para delete y profile con id fijo", () => {
    expect(() =>
      buildCentralBusinessMutationCommand({
        ...input(),
        payload: null,
      }),
    ).toThrow(CentralBusinessMutationCommandError);
    expect(() =>
      buildCentralBusinessMutationCommand({
        ...input(),
        operationKind: "delete",
      }),
    ).toThrow(CentralBusinessMutationCommandError);
    expect(() =>
      buildCentralBusinessMutationCommand({
        ...input(),
        entityType: "profile",
        entityId: "otro",
      }),
    ).toThrow(CentralBusinessMutationCommandError);
  });

  it.each(["quote", "receipt"] as const)(
    "admite %s sin abrir la autoridad operativa a facturas",
    (entityType) => {
      expect(
        buildCentralBusinessMutationCommand({
          ...input(),
          entityType,
          entityId: "SYNTHETIC_DOCUMENT_A",
        }),
      ).toMatchObject({ entityType });
      expect(() =>
        buildCentralBusinessMutationCommand({
          ...input(),
          entityType: "invoice" as never,
        }),
      ).toThrow(CentralBusinessMutationCommandError);
    },
  );

  it("normaliza committed/replayed y falla cerrado ante errores RPC", async () => {
    const command = buildCentralBusinessMutationCommand(input());
    const rpc = vi.fn(async () => ({
      error: null,
      data: [
        {
          result_status: "committed",
          event_id: "00000000-0000-4000-8000-000000000010",
          event_sequence: 1,
          entity_version: 1,
          deleted: false,
          content_hash: command.contentHash,
        },
      ],
    }));

    await expect(
      mutateCentralBusinessThroughRpc({ rpc }, command),
    ).resolves.toMatchObject({
      status: "committed",
      eventSequence: 1,
      entityVersion: 1,
      deleted: false,
    });
    expect(rpc).toHaveBeenCalledWith(
      "mutate_central_business_entity_v1",
      expect.objectContaining({
        p_user_id: input().auth.userId,
        p_expected_version: 0,
      }),
    );

    await expect(
      mutateCentralBusinessThroughRpc(
        {
          rpc: async () => ({
            data: null,
            error: { code: "P0001", message: "version mismatch" },
          }),
        },
        command,
      ),
    ).rejects.toMatchObject({ code: "RPC_REJECTED", causeCode: "P0001" });
  });
});
