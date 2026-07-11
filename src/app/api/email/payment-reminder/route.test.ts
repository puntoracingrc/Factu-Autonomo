import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isEmailConfigured } from "@/lib/email/config";
import {
  paymentReminderRecipientRateLimitSubject,
  resolvePaymentReminderRecords,
} from "@/lib/email/payment-reminder-records";
import { sendPaymentReminderEmail } from "@/lib/email/send-payment-reminder";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { DEFAULT_PROFILE, type Document } from "@/lib/types";
import { POST } from "./route";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/email/config", () => ({
  isEmailConfigured: vi.fn(),
}));

vi.mock("@/lib/email/payment-reminder-records", () => ({
  resolvePaymentReminderRecords: vi.fn(),
  paymentReminderRecipientRateLimitSubject: vi.fn(() =>
    "recipient:0000000000000000000000000000000000000000000000000000000000000000"
  ),
}));

vi.mock("@/lib/email/send-payment-reminder", () => ({
  validatePaymentReminderInput: vi.fn(() => null),
  sendPaymentReminderEmail: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  rateLimitExceededResponse: vi.fn(() =>
    Response.json({ error: "rate_limited" }, { status: 429 }),
  ),
}));

const storedDocument: Document = {
  id: "invoice-1",
  type: "factura",
  number: "F-2026-0001",
  date: "2026-07-01",
  client: { name: "Cliente real", email: "real@example.com" },
  items: [
    {
      id: "line-1",
      description: "Servicio",
      quantity: 1,
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  status: "enviado",
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-01T10:00:00.000Z",
};

const storedProfile = {
  ...DEFAULT_PROFILE,
  name: "Emisor real",
  email: "issuer@example.com",
};

function request(body: unknown, authorization = "Bearer test-token") {
  return new Request("http://localhost/api/email/payment-reminder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const allowedRateLimit = {
  allowed: true,
  limit: 20,
  remaining: 19,
  resetAt: Date.now() + 60_000,
  retryAfterSeconds: 60,
  backend: "memory" as const,
};

describe("POST /api/email/payment-reminder", () => {
  beforeEach(() => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "owner-user",
      email: "account@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(isEmailConfigured).mockReturnValue(true);
    vi.mocked(checkRateLimit).mockResolvedValue(allowedRateLimit);
    vi.mocked(resolvePaymentReminderRecords).mockResolvedValue({
      ok: true,
      doc: storedDocument,
      profile: storedProfile,
    });
    vi.mocked(sendPaymentReminderEmail).mockResolvedValue({
      ok: true,
      emailId: "email-1",
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("envía únicamente con factura y perfil resueltos para el usuario", async () => {
    const response = await POST(
      request({ documentId: "invoice-1", message: " Recordatorio amable " }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      emailId: "email-1",
    });
    expect(resolvePaymentReminderRecords).toHaveBeenCalledWith(
      "owner-user",
      "invoice-1",
    );
    expect(sendPaymentReminderEmail).toHaveBeenCalledWith({
      doc: storedDocument,
      profile: storedProfile,
      message: "Recordatorio amable",
      replyTo: "account@example.com",
    });
    expect(paymentReminderRecipientRateLimitSubject).toHaveBeenCalledWith(
      "real@example.com",
    );
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        namespace: "email_payment_reminder_recipient",
      }),
      expect.stringMatching(/^recipient:/),
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toBe("Authorization");
  });

  it("rechaza intentos de sustituir destinatario, emisor o PDF desde el body", async () => {
    const response = await POST(
      request({
        documentId: "invoice-1",
        message: "Recordatorio",
        doc: {
          ...storedDocument,
          client: { name: "Atacante", email: "attacker@example.com" },
        },
        profile: { ...storedProfile, name: "Emisor manipulado" },
      }),
    );

    expect(response.status).toBe(400);
    expect(resolvePaymentReminderRecords).not.toHaveBeenCalled();
    expect(sendPaymentReminderEmail).not.toHaveBeenCalled();
  });

  it("no usa Resend y habilita solo fallback local si no está sincronizada", async () => {
    vi.mocked(resolvePaymentReminderRecords).mockResolvedValue({
      ok: false,
      reason: "not_found",
    });

    const response = await POST(
      request({ documentId: "foreign-invoice", message: "Recordatorio" }),
    );

    expect(response.status).toBe(404);
    expect(sendPaymentReminderEmail).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body).toMatchObject({ ok: false, skipped: true });
    expect(JSON.stringify(body)).not.toContain("foreign-invoice");
  });

  it("rechaza payload sincronizado inválido sin intentar Resend", async () => {
    vi.mocked(resolvePaymentReminderRecords).mockResolvedValue({
      ok: false,
      reason: "invalid_document",
    });

    const response = await POST(
      request({ documentId: "invoice-1", message: "Recordatorio" }),
    );

    expect(response.status).toBe(422);
    expect(sendPaymentReminderEmail).not.toHaveBeenCalled();
  });

  it("marca el envío como omitido solo si el servidor no está configurado", async () => {
    vi.mocked(isEmailConfigured).mockReturnValue(false);

    const response = await POST(
      request({ documentId: "invoice-1", message: "Recordatorio" }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      skipped: true,
    });
    expect(resolvePaymentReminderRecords).not.toHaveBeenCalled();
    expect(sendPaymentReminderEmail).not.toHaveBeenCalled();
  });

  it("requiere cuenta confirmada y conserva el rate limit privado", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);
    const unauthorized = await POST(
      request({ documentId: "invoice-1", message: "Recordatorio" }, ""),
    );
    expect(unauthorized.status).toBe(401);
    expect(resolvePaymentReminderRecords).not.toHaveBeenCalled();

    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "owner-user",
      email: "account@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(checkRateLimit).mockResolvedValue({
      ...allowedRateLimit,
      allowed: false,
      remaining: 0,
    });
    const limited = await POST(
      request({ documentId: "invoice-1", message: "Recordatorio" }),
    );

    expect(limited.status).toBe(429);
    expect(rateLimitExceededResponse).toHaveBeenCalled();
    expect(limited.headers.get("cache-control")).toContain("no-store");
  });
});
