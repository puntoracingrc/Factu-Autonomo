import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROFILE } from "@/lib/types";
import { buildCentralInvoiceAuthorityDocumentFormIssueRequest } from "@/lib/central-invoice-authority/document-form-canary";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), device: vi.fn(), rpc: vi.fn(),
  queries: [] as Array<[string, string, unknown]>, tables: {} as Record<string, unknown> }));
vi.mock("@/lib/companies/server", () => ({ getCompanyRouteAuthFromBearer: mocks.auth }));
vi.mock("@/lib/cloud/devices", () => ({ ensureCloudDeviceAccess: mocks.device,
  normalizeCloudDeviceToken: (token: string) => token || null, hashCloudDeviceToken: () => "device-hash" }));
vi.mock("@/lib/central-invoice-authority/activation", () => ({ evaluateCentralInvoiceAuthorityActivation: () => ({ fiscalWritesEnabled: true }) }));
vi.mock("@/lib/server/rate-limit", () => ({ checkRateLimit: async () => ({ allowed: true }) }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => ({
  rpc: mocks.rpc, from: (table: string) => {
    const query = { select: () => query, eq: (key: string, value: unknown) => {
      mocks.queries.push([table, key, value]); return query;
    }, maybeSingle: async () => ({ data: mocks.tables[table] ?? null, error: null }) };
    return query;
  },
}) }));
import { POST } from "./route";
const serverId = "11111111-1111-4111-8111-111111111111";
const identityId = "22222222-2222-4222-8222-222222222222";
const auth = { userId: "company-owner", actorUserId: "member-admin", billingUserId: "billing-owner", companyId: "company-id", sessionId: "session", userEmail: "synthetic@example.test" };
function body(extra = {}) {
  return { action: "delete", idempotencyKey: "INVOICE_MANAGE:synthetic", documentRef: {
    serverDocumentId: serverId, identityId, expectedVersion: 1 }, ...extra };
}
function request(value: unknown) {
  return new Request("http://localhost/api/central-invoice-authority/manage", { method: "POST",
    headers: { Authorization: "Bearer synthetic", "X-Factu-Company-Id": "company-id", "X-Factu-Device-Token": "device", "Content-Type": "application/json" }, body: JSON.stringify(value) });
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.queries.length = 0; mocks.tables = {};
  mocks.auth.mockResolvedValue(auth); mocks.device.mockResolvedValue({ allowed: true });
  mocks.rpc.mockResolvedValue({ data: [{ outbox_event_id: "event-id" }], error: null });
});
describe("authenticated invoice management API", () => {
  it("does not read or write invoices without membership or a verified device", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    expect((await POST(request(body()))).status).toBe(401);
    mocks.device.mockResolvedValueOnce({ allowed: false, reason: "DEVICE_REVOKED", message: "Dispositivo revocado" });
    expect((await POST(request(body()))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.queries).toEqual([]);
  });
  it("scopes invoice lookup to the verified company, never a body userId", async () => {
    expect((await POST(request(body({ userId: "other-company" })))).status).toBe(404);
    expect(mocks.queries).toContainEqual(["central_invoice_documents", "user_id", "company-owner"]);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("keeps the central expected version and translates a conflict without local success", async () => {
    mocks.tables.central_invoice_documents = { current_version: 2, current_payload: {}, emitted_snapshot: {} };
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "P4103" } });
    const result = await POST(request(body()));
    expect(result.status).toBe(409); expect((await result.json()).error.message).toContain("Otro dispositivo");
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({ p_user_id: "company-owner", p_expected_version: 1, p_action: "delete" });
    expect(result.headers.get("Cache-Control")).toContain("no-store");
  });
  it("builds the corrected invoice from central issuer data and ignores injected top-level identities", async () => {
    const profile = { ...DEFAULT_PROFILE, name: "Empresa de prueba", nif: "B12345678", address: "Calle Uno 1", city: "Barcelona", postalCode: "08001" };
    const form = buildCentralInvoiceAuthorityDocumentFormIssueRequest({ profile, issuedAt: "2026-10-01T10:00:00.000Z", localDocumentId: "invoice-local",
      payload: { type: "factura", date: "2026-10-01", status: "enviado",
        client: { name: "Inquilina", nif: "12345678Z", address: "Calle Dos 2", city: "Barcelona", postalCode: "08002" },
        items: [{ id: "line", description: "Servicio", quantity: 1, unitPrice: 100, ivaPercent: 21 }] } });
    const payload = JSON.parse(JSON.stringify(form.documentPayload).replaceAll("__CENTRAL_AUTHORITY_FULL_NUMBER__", "F-2026-0001"));
    const snapshot = JSON.parse(JSON.stringify(form.emittedSnapshot).replaceAll("__CENTRAL_AUTHORITY_FULL_NUMBER__", "F-2026-0001"));
    mocks.tables = { central_invoice_documents: { current_payload: payload, emitted_snapshot: snapshot, current_version: 1 },
      central_invoice_identities: { issued_at: "2026-10-01T10:00:00.000Z", fiscal_year: 2026 },
      central_business_entities: { current_payload: profile } };
    const patch = { date: "2026-10-01", client: { ...payload.document.client, name: "Propietaria" }, items: payload.document.items };
    expect((await POST(request(body({ action: "update", patch: { ...patch, number: "HACK" } })))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
    const result = await POST(request(body({ action: "update", patch, userId: "other", issuer: { nif: "HACK" } })));
    expect(result.status).toBe(200);
    const rpc = mocks.rpc.mock.calls[0][1];
    expect(rpc.p_document_payload.document).toMatchObject({ number: "F-2026-0001", client: { name: "Propietaria" }, issuer: { nif: profile.nif } });
    expect(rpc.p_user_id).toBe(auth.userId);
  });
});
