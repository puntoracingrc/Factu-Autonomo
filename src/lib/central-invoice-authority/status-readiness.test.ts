import { describe, expect, it } from "vitest";

import {
  CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS,
  CENTRAL_INVOICE_AUTHORITY_STATUS_REQUIRED_TABLES,
  probeCentralInvoiceAuthorityStatusReadiness,
  type CentralInvoiceAuthorityStatusProbeClient,
} from "./status-readiness";

function client(
  overrides: {
    tableError?: { code?: string; message?: string } | null;
    issueError?: { code?: string; message?: string } | null;
    eventsError?: { code?: string; message?: string } | null;
  } = {},
) {
  const tableCalls: unknown[] = [];
  const rpcCalls: unknown[] = [];
  const probeClient: CentralInvoiceAuthorityStatusProbeClient = {
    from(table) {
      return {
        select(columns, options) {
          return {
            async limit(count) {
              tableCalls.push({ table, columns, options, count });
              return { data: null, error: overrides.tableError ?? null };
            },
          };
        },
      };
    },
    async rpc(name, args) {
      rpcCalls.push({ name, args });
      if (name === "issue_central_invoice_v1") {
        return {
          data: null,
          error: Object.hasOwn(overrides, "issueError")
            ? overrides.issueError ?? null
            : {
                code: "P0001",
                message: "invalid central invoice issue command",
              },
        };
      }
      return {
        data: null,
        error: Object.hasOwn(overrides, "eventsError")
          ? overrides.eventsError ?? null
          : {
              code: "P0001",
              message: "invalid central invoice event pull request",
            },
      };
    },
  };
  return { probeClient, tableCalls, rpcCalls };
}

describe("central invoice authority status readiness", () => {
  it("marca preparado el esquema cuando tablas y RPC responden con dry-run seguro", async () => {
    const { probeClient, tableCalls, rpcCalls } = client();
    const result = await probeCentralInvoiceAuthorityStatusReadiness({
      client: probeClient,
      checkedAt: "2026-07-27T12:00:00.000Z",
    });

    expect(result).toMatchObject({
      schema: CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS,
      checkedAt: "2026-07-27T12:00:00.000Z",
      ready: true,
      blockers: [],
    });
    expect(tableCalls).toHaveLength(
      CENTRAL_INVOICE_AUTHORITY_STATUS_REQUIRED_TABLES.length,
    );
    expect(tableCalls).toEqual(
      CENTRAL_INVOICE_AUTHORITY_STATUS_REQUIRED_TABLES.map((table) => ({
        table,
        columns: "id",
        options: { count: "exact", head: true },
        count: 1,
      })),
    );
    expect(rpcCalls).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain("documentPayload");
    expect(JSON.stringify(result)).not.toContain("emittedSnapshot");
  });

  it("usa RPC invalidas a proposito para no escribir ni leer negocio", async () => {
    const { probeClient, rpcCalls } = client();

    await probeCentralInvoiceAuthorityStatusReadiness({ client: probeClient });

    expect(rpcCalls[0]).toMatchObject({
      name: "issue_central_invoice_v1",
      args: {
        p_user_id: null,
        p_device_id: "",
        p_kind: "__factu_status_preflight_invalid__",
        p_expected_version: -1,
        p_document_payload: null,
        p_emitted_snapshot: null,
      },
    });
    expect(rpcCalls[1]).toMatchObject({
      name: "list_central_invoice_events_v1",
      args: {
        p_user_id: null,
        p_device_id: "",
        p_limit: 1,
      },
    });
  });

  it("bloquea sin cliente admin antes de tocar Supabase", async () => {
    const result = await probeCentralInvoiceAuthorityStatusReadiness({
      client: null,
      checkedAt: "2026-07-27T12:00:00.000Z",
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(["missing_admin_client"]);
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0]).toMatchObject({
      id: "admin_client",
      status: "blocked",
      noBusinessRows: true,
      destructive: false,
    });
  });

  it("clasifica tablas centrales no disponibles sin exponer mensajes crudos", async () => {
    const { probeClient } = client({
      tableError: {
        code: "42P01",
        message: "relation central_invoice_series_state does not exist",
      },
    });

    const result = await probeCentralInvoiceAuthorityStatusReadiness({
      client: probeClient,
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("central_invoice_table_unavailable");
    expect(result.checks.filter((check) => check.kind === "table")).toHaveLength(
      CENTRAL_INVOICE_AUTHORITY_STATUS_REQUIRED_TABLES.length,
    );
    expect(JSON.stringify(result)).not.toContain("does not exist");
  });

  it("bloquea si la RPC de emision falta o no corta con el error esperado", async () => {
    const missing = client({
      issueError: { code: "42883", message: "function does not exist" },
    });
    const unexpectedSuccess = client({ issueError: null });

    await expect(
      probeCentralInvoiceAuthorityStatusReadiness({
        client: missing.probeClient,
      }),
    ).resolves.toMatchObject({
      ready: false,
      blockers: ["central_invoice_issue_rpc_unavailable"],
    });
    await expect(
      probeCentralInvoiceAuthorityStatusReadiness({
        client: unexpectedSuccess.probeClient,
      }),
    ).resolves.toMatchObject({
      ready: false,
      blockers: ["central_invoice_issue_rpc_unavailable"],
    });
  });

  it("bloquea si la RPC de eventos falta o no corta con el error esperado", async () => {
    const missing = client({
      eventsError: { code: "PGRST202", message: "function not found" },
    });
    const unexpectedSuccess = client({ eventsError: null });

    await expect(
      probeCentralInvoiceAuthorityStatusReadiness({
        client: missing.probeClient,
      }),
    ).resolves.toMatchObject({
      ready: false,
      blockers: ["central_invoice_events_rpc_unavailable"],
    });
    await expect(
      probeCentralInvoiceAuthorityStatusReadiness({
        client: unexpectedSuccess.probeClient,
      }),
    ).resolves.toMatchObject({
      ready: false,
      blockers: ["central_invoice_events_rpc_unavailable"],
    });
  });
});
