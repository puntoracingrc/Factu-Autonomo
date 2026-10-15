import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20261015191504_central_invoice_delete_related_records.sql", import.meta.url), "utf8");
describe("central invoice deletion relationships contract", () => {
  it("uses the existing private CAS batch inside the invoice transaction, without touching quotes", () => {
    expect(migration).toContain("p_action = ''update'' and exists");
    expect(migration).toContain("public.mutate_central_business_batch_v1");
    expect(migration).toContain("'expectedVersion', v_entity.current_version");
    expect(migration).toContain("e.user_id = p_user_id and not e.deleted");
    expect(migration).toContain("order by e.entity_type, e.entity_id for update");
    expect(migration).not.toMatch(/entity_type\s*=\s*'quote'/);
    expect(migration).toContain("v_doc.id, v_doc.local_document_id, v_old ->> 'receiptDocumentId', v_key");
  });
  it("uses canonical operational hashes so the second device can verify the events", () => {
    expect(migration).toContain("'central-business-tombstone-v1'");
    expect(migration).toContain("public.central_business_stable_json_text_v1(v_payload)");
    expect(migration).toContain("is distinct from p_local_document_id");
    expect(migration).toContain("from public, anon, authenticated, service_role");
    expect(migration).toContain("message = 'protected or ambiguous linked receipt; deletion rolled back'");
    expect(migration).toContain("jsonb_array_length(v_operations) >= 100");
  });
  it("receives all related operational changes before confirming the fiscal deletion locally", () => {
    const store = readFileSync(new URL("../../context/AppStore.tsx", import.meta.url), "utf8");
    const start = store.indexOf('action: "delete", document: doc, expectedOwnerScope: ownerScope');
    const end = store.indexOf("return true;", start);
    const flow = store.slice(start, end);
    expect(flow).toContain("syncCentralBusinessBeforeWrite");
    expect(flow).toContain("pullCentralBusinessEvents(ownerScope");
    expect(flow.indexOf("if (!related.ok)")).toBeLessThan(flow.indexOf("await receiveConfirmedCentralInvoiceChange"));
    const button = readFileSync(new URL("../../components/documents/DeleteDocumentButton.tsx", import.meta.url), "utf8");
    expect(button).toContain("El presupuesto se conservará y los gastos solo quedarán desvinculados");
    expect(button).toContain("y sus recibos asociados");
  });
});
