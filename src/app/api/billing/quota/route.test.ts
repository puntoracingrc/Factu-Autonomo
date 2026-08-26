import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  commitBillingQuotaServer,
  getBillingQuotaSnapshotServer,
  removeBillingQuotaSubjectServer,
  reconcileBillingQuotaServer,
  releaseBillingQuotaServer,
  reserveBillingQuotaServer,
  resolveServerBillingPlan,
} from "@/lib/billing/quota-server";
import { emptyBillingQuotaSnapshot } from "@/lib/billing/quotas";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/billing/quota-server", () => ({
  commitBillingQuotaServer: vi.fn(),
  getBillingQuotaSnapshotServer: vi.fn(),
  removeBillingQuotaSubjectServer: vi.fn(),
  reconcileBillingQuotaServer: vi.fn(),
  releaseBillingQuotaServer: vi.fn(),
  reserveBillingQuotaServer: vi.fn(),
  resolveServerBillingPlan: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
  rateLimitExceededResponse: vi.fn(),
}));

const AUTHENTICATED_USER_ID = "11111111-1111-4111-8111-111111111111";
const snapshot = emptyBillingQuotaSnapshot(
  "free",
  new Date("2026-08-26T12:00:00.000Z"),
);

function request(body: Record<string, unknown>) {
  return new Request("https://example.test/api/billing/quota", {
    method: "POST",
    headers: {
      authorization: "Bearer test",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/billing/quota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: AUTHENTICATED_USER_ID,
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(resolveServerBillingPlan).mockResolvedValue("free");
    vi.mocked(getBillingQuotaSnapshotServer).mockResolvedValue(snapshot);
    vi.mocked(reconcileBillingQuotaServer).mockResolvedValue(snapshot);
  });

  it("autentica antes de consultar o escribir cuotas", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await POST(
      request({
        action: "reserve",
        metric: "documents",
        operationKey: "document:test",
      }),
    );

    expect(response.status).toBe(401);
    expect(resolveServerBillingPlan).not.toHaveBeenCalled();
    expect(reserveBillingQuotaServer).not.toHaveBeenCalled();
  });

  it("usa siempre el propietario autenticado aunque el cuerpo incluya otro id", async () => {
    vi.mocked(reserveBillingQuotaServer).mockResolvedValue({
      allowed: true,
      claimId: "22222222-2222-4222-8222-222222222222",
      metric: "documents",
      snapshot: snapshot.metrics.documents,
    });

    const response = await POST(
      request({
        action: "reserve",
        userId: "99999999-9999-4999-8999-999999999999",
        metric: "documents",
        operationKey: "document:test",
        source: "app",
      }),
    );

    expect(response.status).toBe(200);
    expect(reserveBillingQuotaServer).toHaveBeenCalledWith({
      userId: AUTHENTICATED_USER_ID,
      plan: "free",
      metric: "documents",
      operationKey: "document:test",
      subjectId: undefined,
      source: "app",
    });
  });

  it("rechaza métricas y fuentes manipuladas", async () => {
    const response = await POST(
      request({
        action: "reserve",
        metric: "unlimited_documents",
        operationKey: "document:test",
        source: "admin",
      }),
    );

    expect(response.status).toBe(400);
    expect(reserveBillingQuotaServer).not.toHaveBeenCalled();
  });

  it("solo libera fichas de capacidad total", async () => {
    const invalid = await POST(
      request({
        action: "remove_subject",
        metric: "documents",
        subjectId: "document-1",
      }),
    );
    expect(invalid.status).toBe(400);
    expect(removeBillingQuotaSubjectServer).not.toHaveBeenCalled();

    const valid = await POST(
      request({
        action: "remove_subject",
        metric: "customers",
        subjectId: "customer-1",
      }),
    );
    expect(valid.status).toBe(200);
    expect(removeBillingQuotaSubjectServer).toHaveBeenCalledWith({
      userId: AUTHENTICATED_USER_ID,
      metric: "customers",
      subjectId: "customer-1",
    });
  });

  it("no acepta confirmaciones o liberaciones sin identificadores válidos", async () => {
    expect(
      (await POST(request({ action: "commit", claimId: "", subjectId: "x" })))
        .status,
    ).toBe(400);
    expect(
      (await POST(request({ action: "release", claimId: "" }))).status,
    ).toBe(400);
    expect(commitBillingQuotaServer).not.toHaveBeenCalled();
    expect(releaseBillingQuotaServer).not.toHaveBeenCalled();
  });
});
