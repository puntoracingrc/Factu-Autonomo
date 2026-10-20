import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCompanyRouteAuthFromBearer } from "@/lib/companies/server";
import { ensureCloudDeviceAccess } from "@/lib/cloud/devices";
import { CLOUD_DEVICE_TOKEN_HEADER } from "@/lib/cloud/device-token";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import { checkRateLimit } from "@/lib/server/rate-limit";
import {
  attachExpenseOriginal,
  getExpenseOriginal,
  listExpenseOriginalStatuses,
} from "./server";
import { ExpenseOriginalError } from "./storage";
import { GET, POST } from "@/app/api/expenses/[id]/original/route";
import { POST as statusPOST } from "@/app/api/expenses/originals/status/route";
import { EXPENSE_ORIGINAL_MAX_BYTES } from "./types";

vi.mock("@/lib/companies/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/companies/server")>()),
  getCompanyRouteAuthFromBearer: vi.fn(),
}));
vi.mock("@/lib/cloud/devices", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/cloud/devices")>()),
  ensureCloudDeviceAccess: vi.fn(),
}));
vi.mock("@/lib/server/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/rate-limit")>()),
  checkRateLimit: vi.fn(),
}));
vi.mock("./server", () => ({
  attachExpenseOriginal: vi.fn(),
  getExpenseOriginal: vi.fn(),
  listExpenseOriginalStatuses: vi.fn(),
}));
const auth = {
  userId: "company-data-owner",
  actorUserId: "actor",
  billingUserId: "billing-owner",
  companyId: "company-id",
  sessionId: "session",
  userEmail: "synthetic@example.test",
};
const bytes = new TextEncoder().encode("%PDF-1.7\nSynthetic\n%%EOF");
function request(
  method = "GET",
  body?: BodyInit,
  extra: Record<string, string> = {},
) {
  return new Request("http://localhost/api/expenses/e1/original", {
    method,
    body,
    headers: {
      Authorization: "Bearer token",
      [FACTU_COMPANY_HEADER]: "11111111-1111-4111-8111-111111111111",
      [CLOUD_DEVICE_TOKEN_HEADER]:
        "synthetic-device-token-01234567890123456789",
      ...extra,
    },
  });
}
const context = { params: Promise.resolve({ id: "e1" }) };
function expectPrivate(response: Response) {
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
  expect(response.headers.get("Vary")).toContain(FACTU_COMPANY_HEADER);
}
describe("original file API: company, session, plan and file guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCompanyRouteAuthFromBearer).mockResolvedValue(auth);
    vi.mocked(ensureCloudDeviceAccess).mockResolvedValue({
      allowed: false,
      plan: "free",
      limit: 0,
      reason: "cloud_not_in_plan",
      message: "Sin nube",
      devices: [],
    });
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 180,
      remaining: 179,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 0,
      backend: "memory",
    });
  });
  function allowCloud() {
    vi.mocked(ensureCloudDeviceAccess).mockResolvedValue({
      allowed: true,
      plan: "pro",
      limit: null,
      device: {
        id: "device",
        name: "PC",
        kind: "computer",
        status: "active",
        createdAt: "2026-10-20",
        lastSeenAt: "2026-10-20",
        lastSyncAt: null,
        revokedAt: null,
        isCurrent: true,
      },
      devices: [],
    });
  }
  it("requires a selected company even for a valid bearer", async () => {
    const req = request();
    req.headers.delete(FACTU_COMPANY_HEADER);
    const response = await GET(req, context);
    expect(response.status).toBe(401);
    expectPrivate(response);
    expect(getCompanyRouteAuthFromBearer).not.toHaveBeenCalled();
    expect(getExpenseOriginal).not.toHaveBeenCalled();
  });
  it("rejects non-members and unconfirmed sessions without querying files", async () => {
    vi.mocked(getCompanyRouteAuthFromBearer).mockResolvedValue(null);
    const response = await GET(request(), context);
    expect(response.status).toBe(401);
    expectPrivate(response);
    expect(getExpenseOriginal).not.toHaveBeenCalled();
  });
  it("enforces current company billing and device session, not the actor's other company", async () => {
    const response = await GET(request(), context);
    expect(response.status).toBe(403);
    expectPrivate(response);
    expect(ensureCloudDeviceAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: auth.userId,
        billingUserId: auth.billingUserId,
        sessionId: auth.sessionId,
      }),
    );
    expect(getExpenseOriginal).not.toHaveBeenCalled();
  });
  it("requires a nonempty device token", async () => {
    const req = request();
    req.headers.delete(CLOUD_DEVICE_TOKEN_HEADER);
    expect((await GET(req, context)).status).toBe(403);
    expect(ensureCloudDeviceAccess).not.toHaveBeenCalled();
  });
  it("rate-limits uploads before reading their bodies", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 30,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
      backend: "memory",
    });
    const response = await POST(request("POST", bytes), context);
    expect(response.status).toBe(429);
    expectPrivate(response);
    expect(attachExpenseOriginal).not.toHaveBeenCalled();
  });
  it("downloads only exact bytes through the authenticated API without exposing Storage paths", async () => {
    allowCloud();
    vi.mocked(getExpenseOriginal).mockResolvedValue({
      bytes,
      record: {
        user_id: auth.userId,
        binding_kind: "expense",
        binding_id: "e1",
        sha256: "a".repeat(64),
        mime_type: "application/pdf",
        byte_size: bytes.length,
        file_name: "factura ñ.pdf",
      },
    });
    const response = await GET(request(), context);
    expect(response.status).toBe(200);
    expectPrivate(response);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    expect(response.headers.get("Content-Disposition")).toContain(
      "factura%20%C3%B1.pdf",
    );
    expect(response.headers.get("X-Factu-Source-Sha256")).toBe("a".repeat(64));
    expect(getExpenseOriginal).toHaveBeenCalledWith(auth.userId, "e1");
  });
  it("does not leak raw provider errors", async () => {
    allowCloud();
    vi.mocked(getExpenseOriginal).mockRejectedValue(
      new Error("secret-key signed-url supplier@example.test"),
    );
    const response = await GET(request(), context);
    expect(response.status).toBe(502);
    expectPrivate(response);
    expect(await response.text()).not.toMatch(
      /secret-key|signed-url|supplier@example/,
    );
  });
  it("uploads raw bytes and decoded filename under the authorized data-owner only", async () => {
    allowCloud();
    const response = await POST(
      request("POST", bytes, {
        "X-Factu-File-Name": encodeURIComponent("mi factura.pdf"),
      }),
      context,
    );
    expect(response.status).toBe(200);
    expectPrivate(response);
    expect(attachExpenseOriginal).toHaveBeenCalledWith(
      auth.userId,
      "e1",
      bytes,
      "mi factura.pdf",
    );
  });
  it("rejects oversized requests with and without declared content-length", async () => {
    allowCloud();
    const declared = await POST(
      request("POST", bytes, {
        "X-Factu-File-Name": "f.pdf",
        "Content-Length": String(EXPENSE_ORIGINAL_MAX_BYTES + 1),
      }),
      context,
    );
    expect(declared.status).toBe(413);
    expectPrivate(declared);
    const chunked = await POST(
      request("POST", new Uint8Array(EXPENSE_ORIGINAL_MAX_BYTES + 1), {
        "X-Factu-File-Name": "f.pdf",
      }),
      context,
    );
    expect(chunked.status).toBe(413);
    expect(attachExpenseOriginal).not.toHaveBeenCalled();
  });
  it("preserves explicit conflicts and never offers a replace command", async () => {
    allowCloud();
    vi.mocked(attachExpenseOriginal).mockRejectedValue(
      new ExpenseOriginalError(
        "ORIGINAL_EXISTS",
        409,
        "Ya existe un original distinto.",
      ),
    );
    const response = await POST(
      request("POST", bytes, { "X-Factu-File-Name": "f.pdf" }),
      context,
    );
    expect(response.status).toBe(409);
    expectPrivate(response);
  });
  it("looks up states in a bounded batch without downloading any file", async () => {
    allowCloud();
    vi.mocked(listExpenseOriginalStatuses).mockResolvedValue({
      e1: "archived",
    });
    const response = await statusPOST(
      request("POST", JSON.stringify({ expenseIds: ["e1", "e1"] })),
    );
    expect(response.status).toBe(200);
    expectPrivate(response);
    expect(listExpenseOriginalStatuses).toHaveBeenCalledWith(auth.userId, [
      "e1",
    ]);
    expect(getExpenseOriginal).not.toHaveBeenCalled();
    expect(
      (
        await statusPOST(
          request(
            "POST",
            JSON.stringify({
              expenseIds: Array.from({ length: 201 }, (_, i) => String(i)),
            }),
          ),
        )
      ).status,
    ).toBe(400);
  });
});
