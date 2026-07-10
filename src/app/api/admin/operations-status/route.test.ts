import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import { resetRateLimitBucketsForTests } from "@/lib/server/rate-limit";

vi.mock("@/lib/admin/server-access", () => ({
  getAdminAccessFromRequest: vi.fn(),
}));

function request() {
  return new Request("http://localhost/api/admin/operations-status", {
    headers: { Authorization: "Bearer token" },
  });
}

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/admin/operations-status", () => {
  beforeEach(() => {
    vi.stubEnv("SERVER_RATE_LIMIT_BACKEND", "memory");
    vi.stubEnv("VERCEL_BILLING_API_TOKEN", "vercel-test-token");
    vi.stubEnv("VERCEL_TEAM_ID", "team_test");
    vi.stubEnv("VERCEL_PROJECT_ID", "prj_test");
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: true,
      user: { id: "admin-1" },
    } as never);
    resetRateLimitBucketsForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetRateLimitBucketsForTests();
  });

  it("requiere una sesion admin", async () => {
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
      }),
    } as never);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("combina GitHub, dominio, deployment y WAF sin exponer IPs", async () => {
    const sha = "a".repeat(40);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/commits/main")) {
        return jsonResponse({
          sha,
          commit: { committer: { date: "2026-07-10T17:00:00.000Z" } },
        });
      }
      if (url.includes("/actions/runs")) {
        return jsonResponse({
          workflow_runs: [
            {
              id: 1,
              name: "CI",
              status: "completed",
              conclusion: "success",
              head_sha: sha,
            },
            {
              id: 2,
              name: "CodeQL",
              status: "completed",
              conclusion: "success",
              head_sha: sha,
            },
          ],
        });
      }
      if (url.includes("/v4/aliases/")) {
        return jsonResponse({ deploymentId: "dpl_current" });
      }
      if (url.includes("/v7/deployments")) {
        return jsonResponse({
          deployments: [
            {
              uid: "dpl_current",
              meta: { githubCommitSha: sha, githubCommitRef: "main" },
            },
          ],
        });
      }
      if (url.includes("/config/active")) {
        return jsonResponse({
          firewallEnabled: true,
          managedRules: {
            bot_protection: { active: true, action: "log" },
            ai_bots: { active: true, action: "log" },
          },
        });
      }
      return jsonResponse({
        actions: [
          {
            action_type: "bot_protection",
            host: "facturacion-autonomos.app",
            public_ip: "203.0.113.10",
            count: 2,
          },
        ],
      });
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.operations.level).toBe("ok");
    expect(body.operations.deployment.alignedWithMain).toBe(true);
    expect(body.operations.firewall.events24h).toBe(2);
    expect(JSON.stringify(body)).not.toContain("203.0.113.10");
  });
});
