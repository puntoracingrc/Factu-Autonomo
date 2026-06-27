import { describe, expect, it } from "vitest";
import {
  createDocumentSyncRouteFakeService,
} from "./route-fake-adapter";
import {
  createDocumentSyncSupabaseLocalHandlerHarness,
  DocumentSyncSupabaseLocalHandlerHarnessError,
} from "./route-supabase-local-harness";

// PHASE2C51_SUPABASE_LOCAL_SYNC_HANDLER_HARNESS_OPT_IN_V1

const scope = {
  userId: "SYNTHETIC_ONLY_SUPABASE_LOCAL_USER",
  scopeId: "SYNTHETIC_ONLY_SUPABASE_LOCAL_SCOPE",
};

function body(suffix: string) {
  return JSON.stringify({
    kind: "apply_single",
    payload: {
      operationKind: "create_draft",
      documentId: `SYNTHETIC_ONLY_SUPABASE_LOCAL_DOC_${suffix}`,
      localDocumentId: `SYNTHETIC_ONLY_SUPABASE_LOCAL_LOCAL_${suffix}`,
      payloadHash: `hash:${suffix}`,
    },
  });
}

describe("Supabase local handler harness", () => {
  it("rechaza metadata remota o no local antes de crear handler", () => {
    const service = createDocumentSyncRouteFakeService().service;
    expect(() =>
      createDocumentSyncSupabaseLocalHandlerHarness({
        serverScope: scope,
        service,
        metadata: { databaseUrl: ["http", "://", "example.test"].join("") },
      }),
    ).toThrow(DocumentSyncSupabaseLocalHandlerHarnessError);
    expect(() =>
      createDocumentSyncSupabaseLocalHandlerHarness({
        serverScope: scope,
        service,
        metadata: { databaseTarget: "staging" as "local" },
      }),
    ).toThrow("destino local");
  });

  it("requiere scope sintetico derivado por servidor", () => {
    expect(() =>
      createDocumentSyncSupabaseLocalHandlerHarness({
        serverScope: { userId: "real-user" },
        service: createDocumentSyncRouteFakeService().service,
      }),
    ).toThrow("scope sintetico");
  });

  it("ejecuta handler con servicio inyectado sin env ni cliente real", async () => {
    const harness = createDocumentSyncSupabaseLocalHandlerHarness({
      serverScope: scope,
      service: createDocumentSyncRouteFakeService().service,
      metadata: {
        mode: "local_staging_only",
        databaseTarget: "local",
        remote: false,
        databaseUrl: "http://localhost:54321",
      },
      requestIdFactory: () => "SYNTHETIC_ONLY_SUPABASE_LOCAL_REQUEST",
    });

    const response = await harness.handler.handleDocumentSyncRouteRequest({
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "SYNTHETIC_ONLY_SUPABASE_LOCAL_REQUEST",
      },
      readBody: () => body("HARNESS"),
    });
    const serialized = JSON.stringify(response.body);

    expect(harness.mode).toBe("local_staging_only");
    expect(harness.remote).toBe(false);
    expect(harness.syntheticOnly).toBe(true);
    expect(response.status).toBe(200);
    expect(serialized).toContain("route_supabase_local_harness_completed");
    expect(serialized).not.toContain("@supabase");
  });
});
