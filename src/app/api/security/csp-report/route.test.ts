import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => null,
}));

function reportRequest(body: unknown) {
  return new Request("http://localhost/api/security/csp-report", {
    method: "POST",
    headers: { "Content-Type": "application/csp-report" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/security/csp-report", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("accepts and sanitizes browser CSP reports", async () => {
    vi.stubEnv("SECURITY_CSP_REPORT_LOGGING", "false");

    const response = await POST(
      reportRequest({
        "csp-report": {
          "document-uri": "https://facturacion-autonomos.app/admin",
          "blocked-uri": "https://evil.example/script.js",
          "effective-directive": "script-src",
          extra: "<ignored>",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("rejects malformed reports", async () => {
    const response = await POST(reportRequest({ nope: { value: true } }));

    expect(response.status).toBe(400);
  });

  it("does not allow GET", async () => {
    const response = GET();

    expect(response.status).toBe(405);
  });
});
