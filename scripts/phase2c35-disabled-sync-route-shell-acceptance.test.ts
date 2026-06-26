import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
} from "../src/lib/document-sync-integrity";
import { GET, POST } from "../src/app/api/document-sync/route";

// PHASE2C35_DISABLED_SYNC_ROUTE_SHELL_ACCEPTANCE_V1

const managedEnvKeys = [
  DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
  "NODE_ENV",
  "VERCEL",
  "VERCEL_ENV",
] as const;

const previousEnv = new Map<string, string | undefined>();

function setEnv(key: string, value: string | undefined): void {
  const mutableEnv = process.env as Record<string, string | undefined>;
  if (value === undefined) delete mutableEnv[key];
  else mutableEnv[key] = value;
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/document-sync", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function bodyText(response: Response): Promise<string> {
  return JSON.stringify(await response.json());
}

beforeEach(() => {
  previousEnv.clear();
  for (const key of managedEnvKeys) {
    previousEnv.set(key, process.env[key]);
    setEnv(key, undefined);
  }
});

afterEach(() => {
  for (const key of managedEnvKeys) {
    setEnv(key, previousEnv.get(key));
  }
});

describe("phase 2C.35 disabled document sync route shell acceptance", () => {
  it("route shell queda disabled por defecto en GET y POST", async () => {
    const getResponse = await GET();
    const postResponse = await POST(request({ safe: true }));

    expect(getResponse.status).toBe(404);
    expect(postResponse.status).toBe(404);
    expect(await bodyText(getResponse)).toContain("document_sync_route_disabled");
  });

  it("GET y POST disabled no ejecutan servicio ni reflejan body malicioso", async () => {
    const response = await POST(
      request({
        ["document" + "Snapshot"]: { lines: ["SHOULD_NOT_ECHO"] },
      }),
    );
    const serialized = await bodyText(response);

    expect(response.status).toBe(404);
    expect(serialized).not.toContain("SHOULD_NOT_ECHO");
    expect(serialized).not.toContain("documentSnapshot");
  });

  it("payload con markup externo queda rechazado con flag local shell", async () => {
    process.env[DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY] = "true";
    process.env[DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY] =
      DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL;

    const response = await POST(
      request({
        body: "<" + "?xm" + "l version=\"1.0\"?>",
      }),
    );
    const serialized = await bodyText(response);

    expect(response.status).toBe(400);
    expect(serialized).toContain("UNSAFE_BODY");
    expect(serialized).not.toContain("?xm");
  });

  it("payload con token o credencial sensible queda rechazado sin eco", async () => {
    process.env[DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY] = "true";
    process.env[DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY] =
      DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL;

    for (const value of [["tok", "en"].join(""), ["sec", "ret"].join("")]) {
      const response = await POST(request({ value }));
      const serialized = await bodyText(response);
      expect(response.status).toBe(400);
      expect(serialized).not.toContain(value);
    }
  });

  it("flag local shell no habilita operaciones", async () => {
    process.env[DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY] = "true";
    process.env[DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY] =
      DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL;

    const getResponse = await GET();
    const postResponse = await POST(
      request({ command: "dry_run_single" }, { "x-request-id": "SYNTHETIC_ONLY_ACCEPTANCE" }),
    );

    expect(getResponse.status).toBe(501);
    expect(postResponse.status).toBe(501);
    expect(await bodyText(postResponse)).toContain(
      "route_shell_enabled_but_operations_disabled",
    );
  });

  it("production y remote siguen disabled", async () => {
    process.env[DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY] = "true";
    process.env[DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY] =
      DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL;
    process.env.VERCEL_ENV = "preview";

    const response = await GET();
    expect(response.status).toBe(404);
    expect(await bodyText(response)).toContain("remote_environment");
  });

  it("la ruta no importa Supabase ni servicio operativo", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        new URL("../src/app/api/document-sync/route.ts", import.meta.url),
        "utf8",
      ),
    );

    expect(source).not.toContain("@supabase");
    expect(source).not.toContain("createClient");
    expect(source).not.toContain("createDocumentSyncServerService");
    expect(source).not.toContain("fiscal_records");
    expect(source).not.toContain("fiscal_chain_state");
    expect(source).not.toContain("routeOperationsEnabled");
  });
});
