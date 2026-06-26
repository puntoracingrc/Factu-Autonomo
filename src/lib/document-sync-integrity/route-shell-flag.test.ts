import { describe, expect, it } from "vitest";
import {
  DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
  assertDocumentSyncRouteShellDisabledByDefault,
  evaluateDocumentSyncRouteShellFlag,
  summarizeDocumentSyncRouteShellFlag,
} from "./route-shell-flag";

describe("document sync route shell private flag", () => {
  it("queda disabled sin env", () => {
    const result = assertDocumentSyncRouteShellDisabledByDefault({});
    expect(result.status).toBe("disabled");
    expect(result.reason).toBe("missing_enabled_flag");
  });

  it("queda disabled con true incompleto", () => {
    const result = evaluateDocumentSyncRouteShellFlag({
      [DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY]: "true",
    });
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("missing_private_mode");
  });

  it("habilita solo la shell local/staging con las dos flags exactas", () => {
    const result = evaluateDocumentSyncRouteShellFlag({
      [DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY]: "true",
      [DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY]:
        DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
    });
    expect(result.status).toBe("enabled_for_local_staging_shell_only");
    expect(result.localStagingOnly).toBe(true);
  });

  it("production queda disabled aunque la flag este completa", () => {
    const result = evaluateDocumentSyncRouteShellFlag({
      NODE_ENV: "production",
      [DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY]: "true",
      [DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY]:
        DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
    });
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("production_environment");
  });

  it("remote/staging queda disabled", () => {
    const result = evaluateDocumentSyncRouteShellFlag({
      VERCEL_ENV: "preview",
      [DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY]: "true",
      [DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY]:
        DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
    });
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("remote_environment");
  });

  it("summary seguro no filtra valores de entorno", () => {
    const result = evaluateDocumentSyncRouteShellFlag({
      [DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY]: "true",
      [DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY]:
        DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
      PRIVATE_VALUE: ["sec", "ret"].join(""),
    });
    const serialized = JSON.stringify(summarizeDocumentSyncRouteShellFlag(result));
    expect(serialized).toContain("enabled_for_local_staging_shell_only");
    expect(serialized).not.toContain("PRIVATE_VALUE");
    expect(serialized).not.toContain(["sec", "ret"].join(""));
  });
});
