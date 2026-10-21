import { describe, expect, it } from "vitest";
import { applyQuickAiSuggestion, normalizeQuickAiSuggestion, quickAiReplacesData } from "./ai-fill";
import type { QuickIntent } from "./model";

const raw = (fields: Record<string, unknown> = {}) => ({ client: {}, items: [], notes: null, date: null, paymentMethod: null, warnings: [], ...fields });
const intent = (): QuickIntent => ({ operationId: "synthetic-operation", kind: "factura", date: "2026-10-21", client: { name: "" }, items: [{ id: "blank", description: "", quantity: 1, unitPrice: 0, ivaPercent: 21, unit: "ud" }], notes: "", paymentMethod: "efectivo", paid: false });
const vat = { defaultVat: 21, vatExempt: false };
describe("quick AI suggestions are editable fields, not business commands", () => {
  it("whitelists fields without number, IDs, issuer, paid or executable HTML", () => {
    const suggestion = normalizeQuickAiSuggestion(raw({ client: { name: "Cliente sintético", nif: " b-12345678 ", customerId: "alien" }, number: "F-0001", paid: true, companyId: "alien", issuer: { name: "alien" } }));
    expect(suggestion.client).toEqual({ name: "Cliente sintético", nif: "B12345678" });
    expect(suggestion).not.toHaveProperty("number"); expect(suggestion).not.toHaveProperty("paid");
    const original = intent();
    const next = applyQuickAiSuggestion(original, suggestion, "document", vat, () => "new");
    expect(next.paid).toBe(false); expect(next.operationId).toBe(original.operationId); expect(original.client.name).toBe("");
  });
  it("preserves unknown fields, uses company VAT and warns about missing prices", () => {
    const suggestion = normalizeQuickAiSuggestion(raw({ items: [{ description: "Cambio de cinta", quantity: null, unitPrice: null, ivaPercent: null, unit: null, priceIncludesVat: false }] }));
    expect(suggestion.warnings.join(" ")).toContain("Falta el precio");
    const next = applyQuickAiSuggestion(intent(), suggestion, "document", vat, () => "new");
    expect(next.items[0]).toMatchObject({ id: "new", quantity: 1, unitPrice: 0, ivaPercent: 21, unit: "ud" });
    expect(next.date).toBe("2026-10-21");
  });
  it("converts VAT-included unit prices once, without importing totals or margins", () => {
    const suggestion = normalizeQuickAiSuggestion(raw({ items: [{ description: "Motor", quantity: 2, unitPrice: 121, ivaPercent: 21, unit: "ud", priceIncludesVat: true, total: 242, costPrice: 50 }] }));
    expect(applyQuickAiSuggestion(intent(), suggestion, "document", vat, () => "new").items[0]).toEqual({ id: "new", description: "Motor", quantity: 2, unitPrice: 100, ivaPercent: 21, unit: "ud" });
    expect(applyQuickAiSuggestion(intent(), suggestion, "document", { ...vat, vatExempt: true }, () => "new").items[0].ivaPercent).toBe(0);
    expect(applyQuickAiSuggestion(intent(), suggestion, "document", { ...vat, vatExempt: true }, () => "new").items[0].unitPrice).toBe(100);
  });
  it("requires a deliberate replacement and does not mix a new recipient with the old NIF", () => {
    const original = intent(); original.customerId = "master"; original.client = { name: "Anterior", nif: "11111111H", address: "Antes 1", email: "old@example.test", streetType: "calle", addressExtra: "2º" };
    const suggestion = normalizeQuickAiSuggestion(raw({ client: { name: "Cliente nuevo", address: "Avenida Dos 2, 1º" } }));
    expect(quickAiReplacesData(original, suggestion, "client")).toBe(true);
    const next = applyQuickAiSuggestion(original, suggestion, "client", vat, () => "new");
    expect(next.client).toEqual({ name: "Cliente nuevo", address: "Avenida Dos 2, 1º" }); expect(next.customerId).toBeUndefined();
    expect(original.customerId).toBe("master");
  });
  it("keeps client-only and concepts-only changes in their requested sections", () => {
    const original = intent(); original.paid = true;
    const suggestion = normalizeQuickAiSuggestion(raw({ client: { name: "Nuevo" }, items: [{ description: "Cinta", unitPrice: 50 }], notes: "Avisar", paymentMethod: "bizum" }));
    const client = applyQuickAiSuggestion(original, suggestion, "client", vat, () => "new");
    expect(client.items).toEqual(original.items); expect(client.notes).toBe(""); expect(client.paymentMethod).toBe("efectivo"); expect(client.paid).toBe(true);
    const concepts = applyQuickAiSuggestion(original, suggestion, "concepts", vat, () => "new");
    expect(concepts.client).toEqual(original.client); expect(concepts.notes).toBe("Avisar"); expect(concepts.paymentMethod).toBe("efectivo");
  });
  it.each([
    raw(), raw({ client: [] }), raw({ client: { name: "a".repeat(201) } }),
    raw({ items: [{ description: "Cinta", quantity: -1 }] }), raw({ items: [{ description: "Cinta", unitPrice: Infinity }] }),
    raw({ items: [{ description: "Cinta", unitPrice: "50" }] }), raw({ items: [{ description: "Cinta", priceIncludesVat: "yes" }] }),
    raw({ date: "2026-02-31" }), raw({ paymentMethod: "bitcoin" }), raw({ items: Array.from({ length: 21 }, () => ({ description: "Cinta" })) }),
  ])("rejects invalid or incomplete output without partially applying it", value => { expect(() => normalizeQuickAiSuggestion(value)).toThrow(); });
});
