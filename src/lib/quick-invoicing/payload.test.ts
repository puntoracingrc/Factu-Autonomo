import { describe, expect, it } from "vitest";
import { deleteSharedQuote, editSharedQuote } from "@/lib/central-business-authority/shared-business-transitions";
import { deriveDocumentLifecycle, inspectDocumentSnapshotsIntegrity } from "@/lib/document-integrity";
import { getDeletePolicy } from "@/lib/rectificativas";
import { EMPTY_DATA, type Document } from "@/lib/types";
import { parseQuickIntent } from "./model";
import { buildQuickDocumentPayload } from "./payload";
import { quickIssuedDocument } from "./render";
import { syntheticIntent, syntheticProfile } from "./test-fixtures";

const now = "2026-10-21T10:00:00.000Z";

describe("quick payloads consumed by the main program", () => {
  it("creates an ordinary editable quote, then edits and deletes it via the existing transitions", () => {
    const intent = parseQuickIntent({ ...syntheticIntent(), kind: "presupuesto" });
    const payload = buildQuickDocumentPayload(intent, syntheticProfile, now);
    expect(payload).not.toHaveProperty("number");
    const quote: Document = JSON.parse(JSON.stringify({ ...payload, number: "P-2026-0001" }));
    expect(quote).toMatchObject({
      status: "enviado", documentLifecycle: "draft", integrityLock: "unlocked",
      paymentStatus: "not_applicable", deliveryStatus: "not_sent", acceptanceStatus: "pending",
    });
    for (const key of ["issuer", "issuedAt", "paidAt", "documentSnapshot", "pdfSnapshot", "snapshotSeal"])
      expect(quote).not.toHaveProperty(key);
    expect(deriveDocumentLifecycle(quote)).toBe("draft");
    expect(getDeletePolicy(quote).allowed).toBe(false); // Sent quotes still require returning to draft.
    const neighbor = { ...quote, id: "another-quote", number: "P-2026-0002" };
    const seed = { ...EMPTY_DATA, documents: [quote, neighbor] };
    const edited = editSharedQuote(seed, { ...quote, notes: "Texto corregido", number: "forged" }, now);
    expect(edited.value.number).toBe(quote.number);
    expect(edited.value.notes).toBe("Texto corregido");
    expect(edited.value.quickPdfContext).toEqual(quote.quickPdfContext);
    const draft = editSharedQuote(edited.data, { ...edited.value, status: "borrador" }, now);
    expect(getDeletePolicy(draft.value).allowed).toBe(true);
    const deleted = deleteSharedQuote(draft.data, quote.id);
    expect(deleted.data.documents).toEqual([neighbor]);
    expect(deleted.data.counters).toEqual(seed.counters);
  });

  it.each([false, true])("preserves fiscal issuer, snapshots and explicit invoice payment (paid=%s)", paid => {
    const intent = parseQuickIntent({ ...syntheticIntent(), paid });
    const payload = buildQuickDocumentPayload(intent, syntheticProfile, now);
    expect(payload).not.toHaveProperty("number");
    expect(payload).toMatchObject({ issuer: { name: syntheticProfile.name }, issuedAt: now,
      paymentStatus: paid ? "paid" : "pending" });
    expect(payload.paidAt).toBe(paid ? now : undefined);
    const invoice = quickIssuedDocument({ ...payload, number: "F-2026-0001" }, syntheticProfile);
    expect(inspectDocumentSnapshotsIntegrity(invoice).ok).toBe(true);
    expect(getDeletePolicy(invoice).allowed).toBe(false); // No generic invoice deletion.
  });

  it("retains quote validity, client snapshot, payment terms and minimal PDF context", () => {
    const intent = parseQuickIntent({ ...syntheticIntent(), kind: "presupuesto", date: "2026-12-20",
      customerId: "selected-customer", paymentMethod: "transferencia" });
    const payload = buildQuickDocumentPayload(intent, { ...syntheticProfile, quoteValidityDays: 30 }, now);
    expect(payload).toMatchObject({ dueDate: "2027-01-19", customerId: "selected-customer",
      client: { address: "Calle Prueba 1, 08001 Barcelona" },
      salesTerms: `Pago por transferencia · IBAN: ${syntheticProfile.iban}`,
      quickPdfContext: { schema: "FACTU_QUICK_PDF_V1" } });
    expect(payload).not.toHaveProperty("irpfPercent");
  });
});
