import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMAIL_CONFIRMATION_REQUIRED_MESSAGE } from "@/lib/auth/email-confirmation";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getExpenseInboxOriginalAttachment } from "@/lib/expense-inbox-server";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { GET } from "./route";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/expense-inbox-server", () => ({
  getExpenseInboxOriginalAttachment: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/rate-limit")>();
  return {
    ...actual,
    checkRateLimit: vi.fn(),
  };
});

function request(authorization = "Bearer test-token") {
  return new Request(
    "http://localhost/api/expense-inbox/inbox-item-1/original",
    { headers: authorization ? { Authorization: authorization } : {} },
  );
}

function context(id = "inbox-item-1") {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/expense-inbox/[id]/original", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-1",
      email: "ana@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 30,
      remaining: 29,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 0,
      backend: "memory",
    });
  });

  it("exige una cuenta autenticada y confirmada", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await GET(request(""), context());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: EMAIL_CONFIRMATION_REQUIRED_MESSAGE,
    });
    expect(getExpenseInboxOriginalAttachment).not.toHaveBeenCalled();
  });

  it("limita descargas repetidas sin consultar el original", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 30,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
      backend: "memory",
    });

    const response = await GET(request(), context());

    expect(response.status).toBe(429);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(getExpenseInboxOriginalAttachment).not.toHaveBeenCalled();
  });

  it("devuelve solo los bytes exactos del original y evita cache", async () => {
    const bytes = Buffer.from("%PDF-1.7\nfixture", "utf8");
    vi.mocked(getExpenseInboxOriginalAttachment).mockResolvedValue({
      buffer: bytes,
      contentType: "application/pdf",
      sourceSha256: "a".repeat(64),
    });

    const response = await GET(request(), context());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Length")).toBe(String(bytes.length));
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Factu-Source-Sha256")).toBe("a".repeat(64));
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    expect(getExpenseInboxOriginalAttachment).toHaveBeenCalledWith({
      userId: "user-1",
      itemId: "inbox-item-1",
    });
  });

  it("no filtra detalles del proveedor ni del adjunto en los errores", async () => {
    vi.mocked(getExpenseInboxOriginalAttachment).mockRejectedValue(
      new Error("resend-token subject@example.com factura-secreta.pdf"),
    );

    const response = await GET(request(), context());
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(JSON.stringify(payload)).not.toContain("resend-token");
    expect(JSON.stringify(payload)).not.toContain("subject@example.com");
    expect(JSON.stringify(payload)).not.toContain("factura-secreta.pdf");
  });

  it("responde 404 cuando el original ya no está disponible", async () => {
    vi.mocked(getExpenseInboxOriginalAttachment).mockResolvedValue(null);

    const response = await GET(request(), context());

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
