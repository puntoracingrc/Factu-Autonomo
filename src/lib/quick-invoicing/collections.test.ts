import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseQuickCollection } from "./collections-model";
import { finishQuickCollectionInvoice } from "./collections-server";
import type { QuickContext } from "./server";
import type { QuickReceipt } from "./model";
const id = "a1234567-1234-4123-8123-123456789012";
const f = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("./server", () => ({ QuickError: class extends Error {}, readQuickDocument: f.read }));
const intent = { id, amount: 10000, description: "Reparación de persiana", customerName: "" };
beforeEach(() => vi.clearAllMocks());
describe("independent collection intent and invoice completion", () => {
  it("takes a bounded EUR amount and concept without requiring an invoice or customer registration", () => {
    expect(parseQuickCollection({ ...intent, paid: true, companyId: "forged", invoiceId: "forged" })).toEqual(intent);
  });
  it.each([0, 49, 100000000, 100.5, NaN, Infinity, "10000"])("rejects invalid cents %s", amount => {
    expect(() => parseQuickCollection({ ...intent, amount })).toThrow("importe");
  });
  it.each([{ id: "forged" }, { description: " " }, { description: "x".repeat(501) }, { customerName: "x".repeat(201) }])("bounds the request %s", changes => {
    expect(() => parseQuickCollection({ ...intent, ...changes })).toThrow();
  });
  it("preserves the issued invoice if the optional collection link cannot be confirmed", async () => {
    const q = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ error: { code: "synthetic" } }) };
    q.select.mockReturnValue(q); q.eq.mockReturnValue(q);
    const context = { scope: { company_id: id, actor_id: id }, admin: { from: vi.fn().mockReturnValue(q) } } as unknown as QuickContext;
    const receipt = { operationId: id, document: { number: "F-2026-0001" } } as QuickReceipt;
    expect(await finishQuickCollectionInvoice(context, receipt)).toEqual({ ...receipt, collectionLinkPending: true });
    expect(f.read).not.toHaveBeenCalled();
  });
});
