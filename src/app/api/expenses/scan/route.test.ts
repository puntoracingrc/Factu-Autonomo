import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { isAdminEmail, isAdminUser } from "@/lib/admin/access";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  consumeExpenseScan,
  getExpenseScanQuota,
} from "@/lib/billing/scan-usage-server";
import {
  extractExpenseFromImage,
  fileToBase64,
} from "@/lib/expense-scan/openai";
import {
  resolveScanMimeType,
  validateScanFile,
} from "@/lib/expense-scan/file-validation";
import { checkRateLimit } from "@/lib/server/rate-limit";
import {
  EXPENSE_LEARNING_HINTS_SCHEMA_VERSION,
  type ExpenseLearningHintsV1,
} from "@/lib/expense-engine/contracts";

vi.mock("@/lib/admin/access", () => ({
  isAdminEmail: vi.fn(),
  isAdminUser: vi.fn(),
}));

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

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  rateLimitExceededResponse: vi.fn(() =>
    Response.json({ error: "Rate limit" }, { status: 429 }),
  ),
}));

function request(token: string | null) {
  return new Request("http://localhost/api/expenses/scan", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function scanPostRequest(token: string | null) {
  const form = new FormData();
  form.set("file", new File(["factura"], "factura.pdf", { type: "application/pdf" }));
  return new Request("http://localhost/api/expenses/scan", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
}

function mockSuccessfulScan() {
  vi.mocked(checkRateLimit).mockResolvedValue({
    allowed: true,
    limit: 20,
    remaining: 19,
    resetAt: Date.now() + 600_000,
    retryAfterSeconds: 600,
    backend: "memory",
  });
  vi.mocked(validateScanFile).mockReturnValue(null);
  vi.mocked(resolveScanMimeType).mockReturnValue("application/pdf");
  vi.mocked(fileToBase64).mockResolvedValue("base64");
  vi.mocked(extractExpenseFromImage).mockResolvedValue({
    data: { expense: { description: "Factura proveedor" } },
  } as Awaited<ReturnType<typeof extractExpenseFromImage>>);
  vi.mocked(consumeExpenseScan).mockResolvedValue({
    allowed: true,
    quota: { remaining: 9, remainingUnits: 90 },
  } as Awaited<ReturnType<typeof consumeExpenseScan>>);
}

function learningHintsFixture(): ExpenseLearningHintsV1 {
  return {
    schemaVersion: EXPENSE_LEARNING_HINTS_SCHEMA_VERSION,
    layout: {
      pageMode: "SINGLE",
      readingOrder: "ROW_MAJOR",
      regionOrder: ["HEADER", "TOTALS"],
      tableCount: "NONE",
    },
    columns: [],
    labels: [{ role: "TOTAL", region: "TOTALS", confidence: "HIGH" }],
    formulas: [],
  };
}

describe("GET /api/expenses/scan", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("devuelve quota sin limite para cuentas de aprendizaje IA", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 180,
      remaining: 179,
      resetAt: Date.now() + 600_000,
      retryAfterSeconds: 600,
      backend: "memory",
    });
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "learning-user",
      email: "persianasalmar@gmail.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);

    const response = await GET(request("token"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getExpenseScanQuota).not.toHaveBeenCalled();
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      {
        namespace: "expense_scan_quota",
        limit: 180,
        windowMs: 600_000,
      },
      "learning-user",
    );
    expect(body.quota.remainingUnits).toBe(Number.MAX_SAFE_INTEGER);
    expect(body.quota.remaining).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("falla cerrado en produccion sin consultar cuota aunque billing este desactivado", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "false");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await GET(request(null));

    expect(response.status).toBe(401);
    expect(getExpenseScanQuota).not.toHaveBeenCalled();
    expect(checkRateLimit).not.toHaveBeenCalled();
  });
});

describe("POST /api/expenses/scan", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("mantiene el limite antiabuso normal para usuarios no admin", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    mockSuccessfulScan();
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-1",
      email: "cliente@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(isAdminUser).mockReturnValue(false);
    vi.mocked(isAdminEmail).mockReturnValue(false);

    const response = await POST(scanPostRequest("token"));

    expect(response.status).toBe(200);
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      {
        namespace: "expenses_scan",
        limit: 20,
        windowMs: 600_000,
      },
      "user-1",
    );
  });

  it("no expone learningHints en la respuesta pública", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    mockSuccessfulScan();
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-1",
      email: "cliente@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(isAdminUser).mockReturnValue(false);
    vi.mocked(extractExpenseFromImage).mockResolvedValue({
      data: { expense: { description: "Factura proveedor" } },
      learningHints: learningHintsFixture(),
    } as Awaited<ReturnType<typeof extractExpenseFromImage>>);

    const response = await POST(scanPostRequest("token"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.expense.description).toBe("Factura proveedor");
    expect(body).not.toHaveProperty("learningHints");
    expect(JSON.stringify(body)).not.toContain(
      EXPENSE_LEARNING_HINTS_SCHEMA_VERSION,
    );
  });

  it("permite lotes internos mas grandes para cuentas admin autenticadas", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    mockSuccessfulScan();
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(isAdminUser).mockReturnValue(true);
    vi.mocked(isAdminEmail).mockReturnValue(true);

    const response = await POST(scanPostRequest("token"));

    expect(response.status).toBe(200);
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      {
        namespace: "admin_expenses_scan",
        limit: 300,
        windowMs: 600_000,
      },
      "admin-1",
    );
    expect(consumeExpenseScan).not.toHaveBeenCalled();
  });

  it("falla cerrado en produccion antes de leer el body, cuota o proveedor IA", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "false");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await POST(
      new Request("https://facturacion-autonomos.app/api/expenses/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{body-no-formdata",
      }),
    );

    expect(response.status).toBe(401);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(validateScanFile).not.toHaveBeenCalled();
    expect(consumeExpenseScan).not.toHaveBeenCalled();
    expect(fileToBase64).not.toHaveBeenCalled();
    expect(extractExpenseFromImage).not.toHaveBeenCalled();
  });

  it("devuelve mantenimiento tipado sin filtrar el error de cuota del proveedor", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    mockSuccessfulScan();
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(isAdminUser).mockReturnValue(true);
    vi.mocked(extractExpenseFromImage).mockResolvedValue({
      error:
        "El servicio de escáner está en mantenimiento. Prueba de nuevo en las próximas 24 horas.",
      errorCode: "SCAN_SERVICE_UNAVAILABLE",
    });

    const response = await POST(scanPostRequest("token"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      code: "SCAN_SERVICE_UNAVAILABLE",
      error:
        "El servicio de escáner está en mantenimiento. Prueba de nuevo en las próximas 24 horas.",
    });
    expect(JSON.stringify(body)).not.toContain("current quota");
  });
});
