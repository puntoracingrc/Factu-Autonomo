import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { QuickError } from "@/lib/quick-invoicing/server";
const f = vi.hoisted(() => ({ auth: vi.fn(), create: vi.fn(), list: vi.fn(), read: vi.fn(), prepare: vi.fn(), invoice: vi.fn(), search: vi.fn(), link: vi.fn() }));
vi.mock("@/lib/quick-invoicing/server", () => ({ authenticateQuick: f.auth, QuickError: class extends Error { constructor(readonly status: number, readonly code: string, message: string) { super(message); } } }));
vi.mock("@/lib/quick-invoicing/collections-server", () => ({ createQuickCollection: f.create, listQuickCollections: f.list, readQuickCollection: f.read, prepareQuickCollectionPayment: f.prepare, prepareQuickCollectionInvoice: f.invoice, searchQuickCollectionInvoices: f.search, linkQuickCollectionToInvoice: f.link }));
const id = "a1234567-1234-4123-8123-123456789012", context = { scope: { company_id: id } };
const intent = { id, amount: 10000, description: "Reparación", customerName: "" };
const post = (body: unknown) => new Request("http://localhost/api/factu-rapido/collection", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); f.auth.mockResolvedValue(context); f.create.mockResolvedValue(intent); f.list.mockResolvedValue({ collections: [] }); });
describe("authenticated collection creation, history and invoice preparation", () => {
  it("creates only the explicit amount/concept, excluding browser payment proof or merchant routing", async () => {
    const result = await POST(post({ action: "create", ...intent, paid: true, invoiceId: "forged", companyId: "forged" }));
    expect(result.status).toBe(200); expect(f.create).toHaveBeenCalledWith(context, intent);
    expect(result.headers.get("cache-control")).toContain("no-store");
  });
  it("lists private history with a validated cursor", async () => {
    expect((await GET(new Request(`http://localhost/api/factu-rapido/collection?before=${id}`))).status).toBe(200);
    expect(f.list).toHaveBeenCalledWith(context, id);
    expect((await GET(new Request("http://localhost/api/factu-rapido/collection?before=forged"))).status).toBe(400);
  });
  it.each(["prepare", "invoice"])("passes only the request identity for %s", async action => {
    expect((await POST(post({ action, id, amount: 1, invoiceOperationId: "forged" }))).status).toBe(200);
    expect(action === "prepare" ? f.prepare : f.invoice).toHaveBeenCalledWith(context, id);
  });
  it("authenticates before touching collection data", async () => {
    f.auth.mockRejectedValue(new QuickError(401, "SIGN_IN_REQUIRED", "Inicia sesión"));
    expect((await POST(post({ action: "create", ...intent }))).status).toBe(401); expect(f.create).not.toHaveBeenCalled();
  });
  it("searches Factu invoice numbers and links only explicit technical identity/version, never browser payment proof", async () => {
    f.search.mockResolvedValue([]);
    expect((await GET(new Request("http://localhost/api/factu-rapido/collection?action=invoices&q=F-2026-1"))).status).toBe(200);
    expect(f.search).toHaveBeenCalledWith(context, "F-2026-1");
    expect((await POST(post({ action: "link", id, invoiceId: id, version: 1, amount: 1, paid: true }))).status).toBe(200);
    expect(f.link).toHaveBeenCalledWith(context, id, id, 1);
    expect((await POST(post({ action: "link", id, invoiceId: id, version: -1 }))).status).toBe(400);
  });
  it.each([null, {}, { action: "create", ...intent, amount: 1 }, { action: "prepare", id: "forged" }, { action: "paid", id }])("rejects malformed or unsupported commands %s", async body => {
    expect((await POST(post(body))).status).toBe(400);
  });
  it("bounds the body before persisting a new request", async () => {
    expect((await POST(post({ action: "create", ...intent, padding: "x".repeat(4096) }))).status).toBe(413);
    expect(f.create).not.toHaveBeenCalled();
  });
});
