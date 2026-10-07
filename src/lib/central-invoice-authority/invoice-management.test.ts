import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { issueDraftDocumentWithStatus } from "@/lib/document-integrity/issuance";
import { assertDocumentSnapshotsIntegrity } from "@/lib/document-integrity/snapshots";
import { DEFAULT_PROFILE, type Document } from "@/lib/types";
import { buildAmendedCentralInvoice, invoiceAmendmentPatch } from "./amendment";
import { canManageCentralIssuedInvoice, canDeleteReceiptCentrally } from "./management-policy";
import { applyCentralInvoiceAuthorityPulledEventsToDocuments } from "./events-local-apply";
import type { CentralInvoiceAuthorityPulledBrowserEvent } from "./events-client";

const profile = { ...DEFAULT_PROFILE, name: "Empresa sintetica", nif: "B12345678", address: "Calle Uno 1", postalCode: "08001", city: "Barcelona" };
const issuedAt = "2026-10-01T10:00:00.000Z";
function invoice(): Document {
  return { ...issueDraftDocumentWithStatus({
    id: "old-local-id", type: "factura", number: "F-2026-0001", date: "2026-10-01",
    client: { name: "Inquilina", nif: "12345678Z", address: "Calle Dos 2", postalCode: "08002", city: "Barcelona" },
    items: [{ id: "line", description: "Servicio", quantity: 1, unitPrice: 100, ivaPercent: 21 }],
    status: "borrador", createdAt: issuedAt, updatedAt: issuedAt,
  }, "pagado", profile, issuedAt), deliveryStatus: "sent", sentAt: issuedAt,
    centralInvoiceAuthority: { schemaVersion: 1, source: "central_invoice_authority",
      serverDocumentId: "old-server-id", identityId: "old-identity-id", outboxEventId: "issue-event",
      eventType: "invoice_issued", fullNumber: "F-2026-0001", sequence: 1, documentVersion: 1, receivedAt: issuedAt } };
}
function amended(current = invoice()) {
  return buildAmendedCentralInvoice({ current, originalSnapshot: current.documentSnapshot!,
    profile: { ...profile, name: "Nombre actual cambiado", vatExempt: true },
    patch: { ...invoiceAmendmentPatch(current), customerId: "owner-customer", client: { ...current.client, name: "Propietaria", nif: "87654321X" } },
    fiscalYear: 2026, issuedAt, now: "2026-10-07T10:00:00.000Z" });
}
function event(doc: Document, overrides: Partial<CentralInvoiceAuthorityPulledBrowserEvent> = {}): CentralInvoiceAuthorityPulledBrowserEvent {
  return { schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_RPC_ADAPTER_V1", eventId: "amend-event", documentId: "old-server-id", identityId: "old-identity-id",
    eventType: "invoice_updated", createdAt: "2026-10-07T10:00:00.000Z", fullNumber: doc.number, sequence: 1,
    documentVersion: 2, documentPayload: JSON.parse(JSON.stringify({ schema: "CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY_V1", document: doc, centralAmendmentVersion: 1 })),
    emittedHash: "server-hash", safeSummary: {}, ...overrides };
}
describe("central ordinary invoice management", () => {
  it("pins an edit to the version opened instead of a later realtime prop", () => {
    const form = readFileSync(new URL("../../components/forms/DocumentForm.tsx", import.meta.url), "utf8");
    const detail = readFileSync(new URL("../../components/documents/DocumentDetailView.tsx", import.meta.url), "utf8");
    expect(form).toContain("centralEditBaseRef = useRef(existing?.centralInvoiceAuthority)");
    expect(form).toContain("centralInvoiceAuthority: centralEditBaseRef.current");
    expect(form).toContain("customerId: findCustomerByClient(data.customers, correctedClient)?.id");
    expect(detail).toContain("<DocumentForm key={doc.id}");
  });
  it("changes tenant to landlord, rebuilds PDF and preserves number, issuer, payment and sent state", () => {
    const current = invoice(); const next = amended(current);
    expect(canManageCentralIssuedInvoice(current)).toBe(true);
    expect(next).toMatchObject({ id: current.id, number: current.number, issuedAt: current.issuedAt,
      status: "pagado", paymentStatus: "paid", paidAt: current.paidAt, deliveryStatus: "sent", sentAt: current.sentAt,
      client: { name: "Propietaria" }, issuer: current.issuer });
    expect(next.documentSnapshot!.customer.name).toBe("Propietaria");
    expect(next.documentSnapshot!.taxSummary).toEqual(current.documentSnapshot!.taxSummary);
    expect(next.pdfSnapshot!.contentHash).not.toBe(current.pdfSnapshot!.contentHash);
    expect(() => assertDocumentSnapshotsIntegrity(next, { requireDocumentSnapshot: true, requirePdfSnapshot: true, requireSnapshotSeal: true })).not.toThrow();
    expect(current.client.name).toBe("Inquilina");
  });
  it("applies the amended canonical content even when pulling an old issue event", () => {
    const next = amended();
    delete next.sentAt;
    delete next.deliveryStatus;
    const result = applyCentralInvoiceAuthorityPulledEventsToDocuments({ documents: [invoice()], profile,
      events: [event(next, { eventType: "invoice_issued" })] });
    expect(result.conflicts).toEqual([]);
    expect(result.documents[0].client.name).toBe("Propietaria");
    expect(result.documents[0].sentAt).toBe(issuedAt);
    expect(result.documents[0].deliveryStatus).toBe("sent");
    expect(result.documents[0].centralInvoiceAuthority!.documentVersion).toBe(2);
  });
  it("deletes by technical identity before inserting a new invoice that reuses its number", () => {
    const old = invoice(); const next = { ...amended(), id: "new-local-id" };
    // Reseal the different technical document via a new synthetic issue.
    const fresh = issueDraftDocumentWithStatus({ ...next, status: "borrador", documentLifecycle: "draft", integrityLock: "unlocked",
      documentSnapshot: undefined, pdfSnapshot: undefined, snapshotSeal: undefined, snapshotIntegrity: undefined,
      snapshotIntegrityRequired: undefined, issuedAt: undefined, sentAt: undefined, paidAt: undefined,
      deliveryStatus: undefined, paymentStatus: undefined }, "enviado", profile, issuedAt);
    const deleted = event(old, { eventType: "invoice_deleted", documentPayload: { deleted: true, localDocumentId: old.id } });
    const result = applyCentralInvoiceAuthorityPulledEventsToDocuments({ documents: [old], profile,
      events: [event(fresh, { documentId: "new-server-id", identityId: "new-identity-id", eventId: "new-event" }), deleted] });
    expect(result.conflicts).toEqual([]);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].id).toBe("new-local-id");
    const repeated = applyCentralInvoiceAuthorityPulledEventsToDocuments({ documents: result.documents, profile, events: [deleted] });
    expect(repeated.documents[0].id).toBe("new-local-id");
  });
  it("does not accept an older correction or a corrupt replacement PDF", () => {
    const current = invoice(); current.centralInvoiceAuthority!.documentVersion = 5;
    const stale = applyCentralInvoiceAuthorityPulledEventsToDocuments({ documents: [current], profile, events: [event(amended())] });
    expect(stale.documents[0]).toBe(current);
    const broken = amended(); broken.pdfSnapshot!.contentHash = "tampered";
    const blocked = applyCentralInvoiceAuthorityPulledEventsToDocuments({ documents: [invoice()], profile, events: [event(broken)] });
    expect(blocked.conflicts).toHaveLength(1);
    expect(blocked.documents[0].client.name).toBe("Inquilina");
  });
  it("allows deleting sent receipts without changing generic deletion protection", () => {
    expect(canDeleteReceiptCentrally({ ...invoice(), type: "recibo" })).toBe(true);
    expect(canManageCentralIssuedInvoice({ ...invoice(), rectifiedById: "rectification" })).toBe(false);
  });
});
