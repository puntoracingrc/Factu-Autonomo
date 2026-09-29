import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getCompanyRouteAuthFromBearer } from "@/lib/companies/server";
import { getExpenseScanQuota } from "@/lib/billing/scan-usage-server";
import {
  buildScanQuota,
  PRO_EXPENSE_SCANS_PER_MONTH,
} from "@/lib/billing/scan-limits";

vi.mock("@/lib/companies/server", () => ({
  getCompanyRouteAuthFromBearer: vi.fn(),
}));

vi.mock("@/lib/billing/scan-usage-server", () => ({
  getExpenseScanQuota: vi.fn(),
}));

function request(token: string | null) {
  return new Request("http://localhost/api/billing/ai-usage", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function companyAuth(userId: string, email?: string) {
  return {
    userId,
    actorUserId: userId,
    billingUserId: userId,
    companyId: userId,
    sessionId: "session-1",
    userEmail: email ?? null,
  };
}

describe("GET /api/billing/ai-usage", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("requiere usuario autenticado", async () => {
    vi.mocked(getCompanyRouteAuthFromBearer).mockResolvedValue(null);

    const response = await GET(request(null));

    expect(response.status).toBe(401);
    expect(getExpenseScanQuota).not.toHaveBeenCalled();
  });

  it("devuelve el porcentaje de IA del usuario", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getCompanyRouteAuthFromBearer).mockResolvedValue(
      companyAuth("user-pro"),
    );
    vi.mocked(getExpenseScanQuota).mockResolvedValue(
      buildScanQuota("pro", PRO_EXPENSE_SCANS_PER_MONTH, 2, "2026-07", 10),
    );

    const response = await GET(request("token"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meter.mode).toBe("extra");
    expect(body.meter.percentRemaining).toBe(100);
    expect(body.quota.bonusCredits).toBe(10);
  });

  it("devuelve modo sin limite para cuentas de aprendizaje IA", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getCompanyRouteAuthFromBearer).mockResolvedValue(
      companyAuth("learning-user", "persianasalmar@gmail.com"),
    );

    const response = await GET(request("token"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getExpenseScanQuota).not.toHaveBeenCalled();
    expect(body.meter.mode).toBe("unlimited");
    expect(body.quota.remainingUnits).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("devuelve modo sin limite a cualquier email incluido en ADMIN_EMAILS", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.stubEnv("ADMIN_EMAILS", "admin-one@example.com,admin-two@example.com");
    vi.mocked(getCompanyRouteAuthFromBearer).mockResolvedValue(
      companyAuth("admin-two", "admin-two@example.com"),
    );

    const response = await GET(request("token"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getExpenseScanQuota).not.toHaveBeenCalled();
    expect(body.meter.mode).toBe("unlimited");
    expect(body.quota.remainingUnits).toBe(Number.MAX_SAFE_INTEGER);
  });
});
