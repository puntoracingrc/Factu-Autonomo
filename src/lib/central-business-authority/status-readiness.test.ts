import { describe, expect, it } from "vitest";

import {
  CENTRAL_BUSINESS_AUTHORITY_STATUS_REQUIRED_TABLES,
  probeCentralBusinessAuthorityStatusReadiness,
  type CentralBusinessAuthorityStatusProbeClient,
} from "./status-readiness";

function client(
  overrides: {
    tableError?: { code?: string; message?: string } | null;
    mutationError?: { code?: string; message?: string } | null;
    batchMutationError?: { code?: string; message?: string } | null;
    eventsError?: { code?: string; message?: string } | null;
    bootstrapError?: { code?: string; message?: string } | null;
  } = {},
) {
  const calls: unknown[] = [];
  const probeClient: CentralBusinessAuthorityStatusProbeClient = {
    from(table) {
      return {
        select(columns, options) {
          return {
            async limit(limit) {
              calls.push({ table, columns, options, limit });
              return { error: overrides.tableError ?? null };
            },
          };
        },
      };
    },
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === "mutate_central_business_entity_v1") {
        return {
          error: Object.hasOwn(overrides, "mutationError")
            ? overrides.mutationError ?? null
            : {
                code: "P0001",
                message: "invalid central business mutation command",
              },
        };
      }
      if (name === "mutate_central_business_batch_v1") {
        return {
          error: Object.hasOwn(overrides, "batchMutationError")
            ? overrides.batchMutationError ?? null
            : {
                code: "P4120",
                message: "invalid central business batch command",
              },
        };
      }
      if (name === "bootstrap_central_business_entities_v1") {
        return {
          error: Object.hasOwn(overrides, "bootstrapError")
            ? overrides.bootstrapError ?? null
            : {
                code: "P4110",
                message: "invalid central business bootstrap command",
              },
        };
      }
      return {
        error: Object.hasOwn(overrides, "eventsError")
          ? overrides.eventsError ?? null
          : {
              code: "P0001",
              message: "invalid central business event pull request",
            },
      };
    },
  };
  return { probeClient, calls };
}

describe("central business authority status readiness", () => {
  it("comprueba las tablas y las RPC mediante dry-runs sin negocio", async () => {
    const { probeClient, calls } = client();
    const result = await probeCentralBusinessAuthorityStatusReadiness({
      client: probeClient,
      checkedAt: "2026-07-29T15:00:00.000Z",
    });

    expect(result).toMatchObject({
      ready: true,
      blockers: [],
      checkedAt: "2026-07-29T15:00:00.000Z",
    });
    expect(
      calls.filter((call) => "table" in (call as Record<string, unknown>)),
    ).toHaveLength(CENTRAL_BUSINESS_AUTHORITY_STATUS_REQUIRED_TABLES.length);
    expect(calls).toContainEqual({
      name: "mutate_central_business_entity_v1",
      args: expect.objectContaining({
        p_user_id: null,
        p_expected_version: -1,
        p_payload: null,
      }),
    });
    expect(calls).toContainEqual({
      name: "mutate_central_business_batch_v1",
      args: expect.objectContaining({
        p_user_id: null,
        p_operations: [],
      }),
    });
    expect(calls).toContainEqual({
      name: "list_central_business_events_v1",
      args: expect.objectContaining({
        p_user_id: null,
        p_after_sequence: -1,
      }),
    });
    expect(calls).toContainEqual({
      name: "bootstrap_central_business_entities_v1",
      args: expect.objectContaining({
        p_user_id: null,
        p_entities: [],
      }),
    });
    expect(result.checks.every((check) => check.noBusinessRows)).toBe(true);
    expect(result.checks.every((check) => !check.destructive)).toBe(true);
  });

  it("falla cerrado sin cliente servidor o ante cualquier probe inesperado", async () => {
    await expect(
      probeCentralBusinessAuthorityStatusReadiness({ client: null }),
    ).resolves.toMatchObject({
      ready: false,
      blockers: ["missing_admin_client"],
    });
    await expect(
      probeCentralBusinessAuthorityStatusReadiness({
        client: client({ eventsError: null }).probeClient,
      }),
    ).resolves.toMatchObject({
      ready: false,
      blockers: ["central_business_events_rpc_unavailable"],
    });
  });
});
