import { beforeEach, describe, expect, it, vi } from "vitest";

const USER_ID = "1bb4023e-97de-4960-9b35-27a3a8a3a0f5";
const SESSION_ID = "2bb4023e-97de-4960-9b35-27a3a8a3a0f5";
const DOCUMENT_ID = "synthetic-central-invoice-1";
const DEVICE_TOKEN = "synthetic-device-token-000000000000000001";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  normalizeDeviceToken: vi.fn(),
  ensureDevice: vi.fn(),
  rateLimit: vi.fn(),
  rateLimitResponse: vi.fn(),
  submit: vi.fn(),
}));

vi.mock("@/lib/billing/server-auth", () => ({
  getUserSessionFromBearer: mocks.auth,
}));

vi.mock("@/lib/cloud/devices", () => ({
  normalizeCloudDeviceToken: mocks.normalizeDeviceToken,
  ensureCloudDeviceAccess: mocks.ensureDevice,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: mocks.rateLimit,
  rateLimitExceededResponse: mocks.rateLimitResponse,
}));

vi.mock("@/lib/verifactu/central-submission-service", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/lib/verifactu/central-submission-service")
  >();
  return {
    ...original,
    submitCentralInvoiceToAeatPreproduction: mocks.submit,
  };
});

import { CentralVerifactuSubmissionError } from "@/lib/verifactu/central-submission-service";
import { POST } from "./route";

function request(input?: {
  body?: string;
  deviceToken?: string | null;
  contentLength?: string;
}): Request {
  const body = input?.body ?? JSON.stringify({ localDocumentId: DOCUMENT_ID });
  const headers = new Headers({
    Authorization: "Bearer test",
    "Content-Type": "application/json",
  });
  if (input?.deviceToken !== null) {
    headers.set("X-Factu-Device-Token", input?.deviceToken ?? DEVICE_TOKEN);
  }
  if (input?.contentLength) {
    headers.set("Content-Length", input.contentLength);
  }
  return new Request("http://localhost/api/verifactu/register", {
    method: "POST",
    headers,
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({
    user: { id: USER_ID },
    sessionId: SESSION_ID,
    aal: "aal1",
  });
  mocks.rateLimit.mockResolvedValue({ allowed: true });
  mocks.normalizeDeviceToken.mockImplementation((value) => value);
  mocks.ensureDevice.mockResolvedValue({ allowed: true });
  mocks.submit.mockResolvedValue({
    ok: true,
    status: "accepted",
    recordId: "3bb4023e-97de-4960-9b35-27a3a8a3a0f5",
    fullNumber: "F-2026-0001",
    csv: "CSV-TEST",
    qrUrl: "https://prewww2.aeat.es/qr",
  });
});

describe("POST /api/verifactu/register preproduction containment", () => {
  it("requires a confirmed session before doing any work", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.rateLimit).not.toHaveBeenCalled();
  });

  it("keeps the endpoint behind a narrow distributed rate limit", async () => {
    const limited = new Response("limit", { status: 429 });
    mocks.rateLimit.mockResolvedValue({ allowed: false });
    mocks.rateLimitResponse.mockReturnValue(limited);

    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.ensureDevice).not.toHaveBeenCalled();
  });

  it("requires the session-bound cloud device", async () => {
    mocks.normalizeDeviceToken.mockReturnValue(null);

    const response = await POST(request({ deviceToken: null }));

    expect(response.status).toBe(400);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("rejects a device outside the account plan", async () => {
    mocks.ensureDevice.mockResolvedValue({
      allowed: false,
      reason: "device_limit_reached",
      message: "Dispositivo no autorizado.",
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("accepts only one small central document reference", async () => {
    const response = await POST(
      request({
        body: JSON.stringify({
          localDocumentId: DOCUMENT_ID,
          document: { nif: "B12345674" },
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.submit).not.toHaveBeenCalled();

    const oversized = await POST(
      request({ contentLength: "2048" }),
    );
    expect(oversized.status).toBe(413);
  });

  it("submits only the authenticated user's central document id", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      status: "accepted",
      csv: "CSV-TEST",
    });
    expect(mocks.ensureDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        sessionId: SESSION_ID,
        token: DEVICE_TOKEN,
      }),
    );
    expect(mocks.submit).toHaveBeenCalledWith({
      userId: USER_ID,
      localDocumentId: DOCUMENT_ID,
    });
    expect(response.headers.get("vary")).toContain("X-Factu-Device-Token");
  });

  it("keeps an ambiguous AEAT delivery pending instead of inventing success", async () => {
    mocks.submit.mockResolvedValue({
      ok: false,
      status: "delivery_unknown",
      recordId: "3bb4023e-97de-4960-9b35-27a3a8a3a0f5",
      fullNumber: "F-2026-0001",
      errorMessage: "Resultado pendiente de confirmar.",
    });

    const response = await POST(request());

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      status: "delivery_unknown",
    });
  });

  it("stays closed when the exact preproduction scope is not enabled", async () => {
    mocks.submit.mockRejectedValue(
      new CentralVerifactuSubmissionError("PREPRODUCTION_DISABLED"),
    );

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "La prueba de preproducción no está habilitada.",
    });
  });
});
