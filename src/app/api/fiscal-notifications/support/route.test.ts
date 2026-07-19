import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isEmailConfigured } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/send";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { POST } from "./route";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));
vi.mock("@/lib/email/config", () => ({ isEmailConfigured: vi.fn() }));
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  rateLimitExceededResponse: vi.fn(() =>
    Response.json({ ok: false, error: "rate_limited" }, { status: 429 }),
  ),
}));

const report = {
  schemaVersion: 1,
  caseId: "case:00000000-0000-4000-8000-000000000001",
  stage: "STRUCTURED_SAVE",
  status: "DURABILITY_CONFLICT:stale_precondition",
  message: "No se pudo confirmar el guardado.",
  route: "/consultor-fiscal/notificaciones",
  fileByteLength: 49_000,
  mimeType: "application/pdf",
  pageCount: 6,
  persistenceState: "blocked",
};

function request(body: unknown, authorization = "Bearer access-token") {
  return new Request("http://localhost/api/fiscal-notifications/support", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/fiscal-notifications/support", () => {
  beforeEach(() => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "owner-user",
      email: "owner@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(isEmailConfigured).mockReturnValue(true);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 8,
      remaining: 7,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
      backend: "memory",
    });
    vi.mocked(sendEmail).mockResolvedValue({ ok: true, id: "email-1" });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("envía a la dirección fija de soporte sin adjuntar datos del documento", async () => {
    const response = await POST(request(report));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      caseId: report.caseId,
    });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "soporte-tecnico@facturacion-autonomos.app",
        subject: `Caso lector AEAT · ${report.caseId}`,
        idempotencyKey: `fiscal-notification-support-v1/owner-user/${report.caseId}`,
        text: expect.stringContaining("privacy=no_pdf_no_text_no_filename"),
      }),
    );
    const email = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(email).not.toHaveProperty("attachments");
    expect(email).not.toHaveProperty("replyTo");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toBe("Authorization");
  });

  it("requiere cuenta confirmada y rate limit distribuido", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);
    expect((await POST(request(report, ""))).status).toBe(401);
    expect(sendEmail).not.toHaveBeenCalled();

    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "owner-user",
      email: "owner@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 8,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
      backend: "memory",
    });
    expect((await POST(request(report))).status).toBe(429);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("rechaza campos extra y cuerpos grandes antes de enviar", async () => {
    const extra = await POST(request({ ...report, rawText: "dato privado" }));
    const oversized = await POST(request({ ...report, message: "x".repeat(9_000) }));

    expect(extra.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("mantiene visible un fallo real del proveedor", async () => {
    vi.mocked(sendEmail).mockResolvedValue({
      ok: false,
      retryable: true,
      failureKind: "ambiguous",
    });

    const response = await POST(request(report));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "No se pudo enviar el caso. Inténtalo de nuevo.",
    });
  });
});
