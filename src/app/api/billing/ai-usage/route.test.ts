import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getExpenseScanQuota } from "@/lib/billing/scan-usage-server";
import { buildScanQuota, PRO_EXPENSE_SCANS_PER_MONTH } from "@/lib/billing/scan-limits";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/billing/scan-usage-server", () => ({
  getExpenseScanQuota: vi.fn(),
}));

function request(token: string | null) {
  return new Request("http://localhost/api/billing/ai-usage", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe("GET /api/billing/ai-usage", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("requiere usuario autenticado", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await GET(request(null));

    expect(response.status).toBe(401);
    expect(getExpenseScanQuota).not.toHaveBeenCalled();
  });

  it("devuelve el porcentaje de IA del usuario", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-pro",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
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
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "learning-user",
      email: "persianasalmar@gmail.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);

    const response = await GET(request("token"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getExpenseScanQuota).not.toHaveBeenCalled();
    expect(body.meter.mode).toBe("unlimited");
    expect(body.quota.remainingUnits).toBe(Number.MAX_SAFE_INTEGER);
  });
});
