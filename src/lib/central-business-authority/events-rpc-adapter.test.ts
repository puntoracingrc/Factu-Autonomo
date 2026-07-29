import { describe, expect, it, vi } from "vitest";

import {
  listCentralBusinessEventsThroughRpc,
  CentralBusinessEventsRpcError,
} from "./events-rpc-adapter";

const row = {
  event_id: "00000000-0000-4000-8000-000000000010",
  event_sequence: 7,
  entity_type: "customer",
  entity_id: "SYNTHETIC_CUSTOMER_A",
  entity_version: 2,
  operation_kind: "upsert",
  payload: { id: "SYNTHETIC_CUSTOMER_A", name: "Synthetic customer" },
  content_hash: "SYNTHETIC_CONTENT_HASH",
  actor_device_id: "sha256:SYNTHETIC_DEVICE",
  created_at: "2026-07-29T12:00:00.000Z",
};

describe("central business events RPC adapter", () => {
  it("pide solo eventos posteriores al cursor y normaliza el orden", async () => {
    const rpc = vi.fn(async () => ({ data: [row], error: null }));

    await expect(
      listCentralBusinessEventsThroughRpc({ rpc }, {
        userId: "00000000-0000-4000-8000-000000000001",
        deviceId: "sha256:SYNTHETIC_DEVICE",
        afterSequence: 6,
        limit: 900,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        eventSequence: 7,
        entityVersion: 2,
        operationKind: "upsert",
      }),
    ]);
    expect(rpc).toHaveBeenCalledWith("list_central_business_events_v1", {
      p_user_id: "00000000-0000-4000-8000-000000000001",
      p_device_id: "sha256:SYNTHETIC_DEVICE",
      p_after_sequence: 6,
      p_limit: 500,
    });
  });

  it("acepta tombstones y rechaza filas incoherentes o errores RPC", async () => {
    await expect(
      listCentralBusinessEventsThroughRpc(
        {
          rpc: async () => ({
            data: [{ ...row, operation_kind: "delete", payload: null }],
            error: null,
          }),
        },
        { userId: "user", deviceId: "device" },
      ),
    ).resolves.toEqual([
      expect.objectContaining({ operationKind: "delete", payload: null }),
    ]);

    await expect(
      listCentralBusinessEventsThroughRpc(
        {
          rpc: async () => ({
            data: [{ ...row, operation_kind: "delete" }],
            error: null,
          }),
        },
        { userId: "user", deviceId: "device" },
      ),
    ).rejects.toBeInstanceOf(CentralBusinessEventsRpcError);

    await expect(
      listCentralBusinessEventsThroughRpc(
        {
          rpc: async () => ({
            data: null,
            error: { code: "P0001", message: "denied" },
          }),
        },
        { userId: "user", deviceId: "device" },
      ),
    ).rejects.toMatchObject({
      code: "EVENTS_RPC_REJECTED",
      causeCode: "P0001",
    });
  });
});
