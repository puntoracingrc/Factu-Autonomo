import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { fetchRateLimitAbuse } from "@/lib/admin/abuse-server";
import { adminEmailsFromEnv } from "@/lib/admin/access";
import { sendEmail } from "@/lib/email/send";
import { resetRateLimitBucketsForTests } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/admin/abuse-server", () => ({
  fetchRateLimitAbuse: vi.fn(),
}));

vi.mock("@/lib/admin/access", () => ({
  adminEmailsFromEnv: vi.fn(),
}));

vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function request(secret = "cron-test-secret") {
  return new Request("http://localhost/api/security/health-alert", {
    headers: { Authorization: `Bearer ${secret}` },
  });
}

function actionSummary() {
  const latestAt = new Date().toISOString();
  return {
    namespaces: [
      {
        namespace: "expenses_scan",
        buckets: 12,
        requests: 320,
        maxRequests: 140,
        latestAt,
      },
    ],
    totalBuckets: 12,
    totalRequests: 320,
    latestAt,
  };
}

describe("GET /api/security/health-alert", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    vi.stubEnv("SERVER_RATE_LIMIT_BACKEND", "memory");
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as never);
    vi.mocked(adminEmailsFromEnv).mockReturnValue(["admin@example.com"]);
    vi.mocked(sendEmail).mockResolvedValue({ ok: true, id: "email-1" });
    resetRateLimitBucketsForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
    resetRateLimitBucketsForTests();
  });

  it("rechaza llamadas sin el secreto programado", async () => {
    const response = await GET(request("incorrecto"));

    expect(response.status).toBe(401);
    expect(fetchRateLimitAbuse).not.toHaveBeenCalled();
  });

  it("no envia correo cuando no hay una senal roja", async () => {
    vi.mocked(fetchRateLimitAbuse).mockResolvedValue({
      namespaces: [],
      totalBuckets: 0,
      totalRequests: 0,
      latestAt: null,
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.alertSent).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("avisa una sola vez ante abuso rojo reciente", async () => {
    vi.mocked(fetchRateLimitAbuse).mockResolvedValue(actionSummary());

    const first = await GET(request());
    const second = await GET(request());
    const secondBody = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(secondBody.reason).toBe("deduplicated");
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "admin@example.com",
        subject: "Alerta de seguridad en Factu",
      }),
    );
  });
});
