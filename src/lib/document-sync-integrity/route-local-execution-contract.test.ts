import { describe, expect, it } from "vitest";
import {
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_IN_MEMORY,
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_KEY,
  evaluateDocumentSyncLocalExecutionMode,
  summarizeDocumentSyncLocalExecutionMode,
} from "./route-local-execution-contract";
import {
  DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
} from "./route-shell-flag";

// PHASE2C37_PRIVATE_LOCAL_SYNC_ROUTE_EXECUTION_CONTRACT_V1

const localFlags = {
  [DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY]: "true",
  [DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY]:
    DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
  [DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED_KEY]: "true",
  [DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_KEY]:
    DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_IN_MEMORY,
};

describe("document sync route local/fake execution contract", () => {
  it("queda disabled por defecto", () => {
    const result = evaluateDocumentSyncLocalExecutionMode({});
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("route_shell_disabled");
  });

  it("shell enabled sin fake adapter sigue disabled", () => {
    const result = evaluateDocumentSyncLocalExecutionMode({
      [DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY]: "true",
      [DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY]:
        DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
    });
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("fake_adapter_missing");
  });

  it("fake enabled sin shell sigue disabled", () => {
    const result = evaluateDocumentSyncLocalExecutionMode({
      [DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED_KEY]: "true",
      [DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_KEY]:
        DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_IN_MEMORY,
    });
    expect(result.enabled).toBe(false);
  });

  it("production y remote bloquean ejecucion", () => {
    expect(
      evaluateDocumentSyncLocalExecutionMode({ ...localFlags, NODE_ENV: "production" })
        .reason,
    ).toBe("production_environment");
    expect(
      evaluateDocumentSyncLocalExecutionMode({ ...localFlags, VERCEL_ENV: "preview" })
        .reason,
    ).toBe("remote_environment");
  });

  it("combinacion local completa permite local_fake_execution_allowed", () => {
    const result = evaluateDocumentSyncLocalExecutionMode(localFlags);
    expect(result.status).toBe("local_fake_execution_allowed");
    expect(result.adapterMode).toBe("in_memory_local_staging");
  });

  it("summary no expone valores de entorno", () => {
    const summary = summarizeDocumentSyncLocalExecutionMode(
      evaluateDocumentSyncLocalExecutionMode(localFlags),
    );
    expect(JSON.stringify(summary)).not.toContain("DOCUMENT_SYNC_ROUTE");
    expect(summary.enabled).toBe(true);
  });
});
