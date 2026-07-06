import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getExpenseScanQuota } from "@/lib/billing/scan-usage-server";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/billing/scan-usage-server", () => ({
  consumeExpenseScan: vi.fn(),
  getExpenseScanQuota: vi.fn(),
}));

vi.mock("@/lib/expense-scan/openai", () => ({
  extractExpenseFromImage: vi.fn(),
  fileToBase64: vi.fn(),
}));

vi.mock("@/lib/expense-scan/file-validation", () => ({
  resolveScanMimeType: vi.fn(),
  validateScanFile: vi.fn(),
}));

function request(token: string | null) {
  return new Request("http://localhost/api/expenses/scan", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe("GET /api/expenses/scan", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("devuelve quota sin limite para cuentas de aprendizaje IA", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "learning-user",
      email: "persianasalmar@gmail.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);

    const response = await GET(request("token"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getExpenseScanQuota).not.toHaveBeenCalled();
    expect(body.quota.remainingUnits).toBe(Number.MAX_SAFE_INTEGER);
    expect(body.quota.remaining).toBe(Number.MAX_SAFE_INTEGER);
  });
});
