import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DELETE, POST, PUT } from "../src/app/api/document-sync/route";
import {
  resetDocumentSyncRouteLocalStateForTests,
} from "../src/lib/document-sync-integrity/route-local-state";
import {
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_IN_MEMORY,
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
} from "../src/lib/document-sync-integrity";

// PHASE2C46_SYNC_ROUTE_OPERATIONAL_HARDENING_ACCEPTANCE_V1

const envKeys = [
  DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_KEY,
  "NODE_ENV",
  "VERCEL",
  "VERCEL_ENV",
] as const;
const previousEnv = new Map<string, string | undefined>();

function setEnv(key: string, value: string | undefined): void {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

function enableFake() {
  setEnv(DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY, "true");
  setEnv(
    DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
    DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
  );
  setEnv(DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED_KEY, "true");
  setEnv(
    DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_KEY,
    DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_IN_MEMORY,
  );
}

function jsonRequest(
  body: unknown,
  requestId: string,
  extraHeaders: Record<string, string> = {},
) {
  return new Request("http://localhost/api/document-sync", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
      "x-document-sync-source": "SYNTHETIC_ONLY_HARDENING_SOURCE",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

function textRequest() {
  return new Request("http://localhost/api/document-sync", {
    method: "POST",
    headers: {
      "content-type": "text/plain",
      "x-request-id": "SYNTHETIC_ONLY_TEXT",
    },
    body: "plain",
  });
}

function applyBody(suffix: string) {
  return {
    kind: "apply_single",
    payload: {
      operationKind: "create_draft",
      documentId: `SYNTHETIC_ONLY_DOC_${suffix}`,
      localDocumentId: `SYNTHETIC_ONLY_LOCAL_${suffix}`,
      payloadHash: `hash:${suffix}`,
    },
  };
}

async function bodyText(response: Response): Promise<string> {
  return JSON.stringify(await response.json());
}

beforeEach(() => {
  previousEnv.clear();
  for (const key of envKeys) {
    previousEnv.set(key, process.env[key]);
    setEnv(key, undefined);
  }
  resetDocumentSyncRouteLocalStateForTests();
});

afterEach(() => {
  for (const key of envKeys) setEnv(key, previousEnv.get(key));
  resetDocumentSyncRouteLocalStateForTests();
});

describe("phase 2C.46 sync route operational hardening acceptance", () => {
  it("rate limit bloquea exceso", async () => {
    enableFake();
    let last: Response | undefined;
    for (let index = 0; index < 13; index += 1) {
      last = await POST(
        jsonRequest(
          { kind: "dry_run_single", payload: applyBody(`RL_${index}`).payload },
          `SYNTHETIC_ONLY_RATE_${index}`,
        ),
      );
    }
    expect(last?.status).toBe(429);
  });

  it("requestId inseguro e idempotency replay se detectan", async () => {
    enableFake();
    const badRequestId = await POST(
      jsonRequest(applyBody("BAD_REQ"), "bad cookie"),
    );
    const first = await POST(
      jsonRequest(applyBody("IDEMPOTENT"), "SYNTHETIC_ONLY_IDEMPOTENT_1", {
        "x-idempotency-key": "SYNTHETIC_ONLY_IDEMPOTENCY_ROUTE",
      }),
    );
    const replay = await POST(
      jsonRequest(applyBody("IDEMPOTENT"), "SYNTHETIC_ONLY_IDEMPOTENT_2", {
        "x-idempotency-key": "SYNTHETIC_ONLY_IDEMPOTENCY_ROUTE",
      }),
    );

    expect(badRequestId.status).toBe(400);
    expect(first.status).toBe(200);
    expect(await bodyText(replay)).toContain("route_fake_execution_replay");
  });

  it("method/content-type/cache/CORS quedan endurecidos", async () => {
    enableFake();
    const put = await PUT();
    const del = await DELETE();
    const text = await POST(textRequest());
    const ok = await POST(jsonRequest(applyBody("HEADERS"), "SYNTHETIC_ONLY_HEADERS"));

    expect(put.status).toBe(405);
    expect(del.status).toBe(405);
    expect(text.status).toBe(415);
    expect(ok.headers.get("cache-control")).toBe("no-store");
    expect(ok.headers.get("access-control-allow-origin")).not.toBe("*");
  });

  it("telemetry report seguro y payload rechazado no aparece", async () => {
    enableFake();
    const rejected = await POST(
      jsonRequest(
        { value: ["sec", "ret"].join(""), leak: "SHOULD_NOT_ECHO" },
        "SYNTHETIC_ONLY_REJECTED",
      ),
    );
    const accepted = await POST(
      jsonRequest(
        { kind: "get_safe_report" },
        "SYNTHETIC_ONLY_TELEMETRY_REPORT",
        { "x-document-sync-source": "SYNTHETIC_ONLY_REPORT_SOURCE" },
      ),
    );
    const rejectedText = await bodyText(rejected);
    const acceptedText = await bodyText(accepted);

    expect(rejected.status).toBe(400);
    expect(rejectedText).not.toContain("SHOULD_NOT_ECHO");
    expect(acceptedText).toContain("telemetry");
    expect(acceptedText).not.toContain("stack");
    expect(acceptedText).not.toContain(["sec", "ret"].join(""));
    expect(acceptedText).not.toContain("@supabase");
  });
});
