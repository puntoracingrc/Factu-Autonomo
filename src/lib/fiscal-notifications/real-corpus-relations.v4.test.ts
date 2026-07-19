import { describe, expect, it } from "vitest";
import {
  buildRealCorpusInstallmentIdentityV4,
  notificationEvidenceForDocumentV4,
  relateRealCorpusDocumentsV4,
  type RealCorpusRelationDocumentV4,
} from "./real-corpus-relations.v4";

function document(input: Partial<RealCorpusRelationDocumentV4> & Pick<RealCorpusRelationDocumentV4, "documentId" | "familyId">): RealCorpusRelationDocumentV4 {
  return Object.freeze({
    ownerScope: "owner-v4",
    issuer: "AEAT",
    procedureId: null,
    debtKey: null,
    dueDate: null,
    principalCents: null,
    paymentFormReference: null,
    installmentTotalCents: null,
    enforcementOrdinaryTotalCents: null,
    seizureOrderId: null,
    citedSeizureOrderId: null,
    seizedAmountCents: null,
    debtObservations: Object.freeze([]),
    taxModel: null,
    fiscalYear: null,
    citedNotificationDate: null,
    deliveryCoverPartId: null,
    ...input,
  });
}

describe("AEAT real corpus relations V4", () => {
  it("links proposal to final assessment only by the exact procedure reference", () => {
    const proposal = document({ documentId: "proposal", familyId: "assessment.allegations_and_proposal", procedureId: "SYNPROCEDURE180" });
    const final = document({ documentId: "final", familyId: "assessment.final_provisional_assessment", procedureId: "SYNPROCEDURE180" });
    expect(relateRealCorpusDocumentsV4(proposal, final)).toEqual([expect.objectContaining({ relationType: "RESOLVES", status: "SYSTEM_CONFIRMED_EXACT", phrase: "Esta resolución decide la propuesta anterior y fija el resultado final de la comprobación limitada." })]);
    expect(relateRealCorpusDocumentsV4(proposal, { ...final, procedureId: "OTHER" })).toEqual([]);
  });

  it("uses a strong installment identity without embedding an amount", () => {
    const identity = buildRealCorpusInstallmentIdentityV4({ ownerScope: "owner-v4", issuer: "AEAT", debtKey: "SYNDEBT010", dueDate: "2024-09-20", paymentFormReference: "SYNPAY010" });
    expect(identity).toContain("SYNDEBT010:2024-09-20:SYNPAY010");
    expect(identity).not.toContain("35467");
    const grant = document({ documentId: "grant", familyId: "collection.deferral_grant", debtKey: "SYNDEBT010", dueDate: "2024-09-20", installmentTotalCents: 35467 });
    const enforcement = document({ documentId: "enforcement", familyId: "collection.enforcement_order", debtKey: "SYNDEBT010", dueDate: "2024-09-20", principalCents: 35467, paymentFormReference: "SYNPAY010" });
    expect(relateRealCorpusDocumentsV4(grant, enforcement)[0]).toMatchObject({ relationType: "CLAIMS_UNPAID_INSTALLMENT", installmentIdentity: identity });
    expect(relateRealCorpusDocumentsV4(grant, { ...enforcement, principalCents: 35468 })[0]).toMatchObject({ relationType: "CLAIMS_UNPAID_INSTALLMENT", observedAmountCents: null });
    expect(relateRealCorpusDocumentsV4(grant, { ...enforcement, paymentFormReference: null })).toEqual([]);
  });

  it("links enforcement to bank seizure by debt key and never by amount", () => {
    const enforcement = document({ documentId: "enforcement", familyId: "collection.enforcement_order", debtKey: "SYNDEBT010", enforcementOrdinaryTotalCents: 42560 });
    const bank = document({ documentId: "bank", familyId: "seizure.bank_account", debtKey: "SYNDEBT010", seizedAmountCents: 42560 });
    expect(relateRealCorpusDocumentsV4(enforcement, { ...bank, seizedAmountCents: 1 })[0]).toMatchObject({ relationType: "ENFORCES", observedAmountCents: null, phrase: "Este embargo bancario continúa la providencia anterior identificada por la misma deuda." });
  });

  it("links third-party seizure, reiteration and release without confirming retention or payment", () => {
    const seizure = document({ documentId: "credit", familyId: "seizure.commercial_credits", seizureOrderId: "SYNSEIZURE008" });
    const reiteration = document({ documentId: "reiteration", familyId: "seizure.compliance_reiteration", citedSeizureOrderId: "SYNSEIZURE008" });
    const release = document({ documentId: "release", familyId: "seizure.release", citedSeizureOrderId: "SYNSEIZURE008" });
    expect(relateRealCorpusDocumentsV4(seizure, reiteration)[0]?.relationType).toBe("REITERATED_BY");
    expect(relateRealCorpusDocumentsV4(seizure, release)[0]).toMatchObject({ relationType: "RELEASES_SEIZURE", permitsAutomaticAction: false });
    expect(relateRealCorpusDocumentsV4(reiteration, release)[0]?.relationType).toBe("CLOSES_AFTER_REITERATION");
  });

  it("creates one exact relation per matching annex debt key without copying amounts", () => {
    const seizure = document({ documentId: "multi", familyId: "seizure.commercial_credits", debtObservations: Object.freeze([{ debtKey: "SYNDEBT017", outstandingAmountCents: 148074 }, { debtKey: "SYNDEBT020", outstandingAmountCents: 90000 }, { debtKey: "SYNDEBTOTHER", outstandingAmountCents: 158654 }]) });
    const exact = document({ documentId: "irpf", familyId: "collection.enforcement_order", debtKey: "SYNDEBT017", enforcementOrdinaryTotalCents: 148074 });
    const changed = document({ documentId: "iva", familyId: "collection.enforcement_order", debtKey: "SYNDEBT020", enforcementOrdinaryTotalCents: 96000 });
    expect(relateRealCorpusDocumentsV4(exact, seizure)[0]).toMatchObject({ relationType: "INCLUDED_IN_SEIZURE", exactReference: "SYNDEBT017", observedAmountCents: null, phrase: "La deuda identificada en esta providencia aparece entre las incluidas en el embargo de créditos posterior." });
    expect(relateRealCorpusDocumentsV4(changed, seizure)[0]).toMatchObject({ exactReference: "SYNDEBT020", observedAmountCents: null });
  });

  it("does not deduplicate different installments of the same plan", () => {
    const first = document({ documentId: "first", familyId: "collection.enforcement_order", debtKey: "SYNPLAN303", dueDate: "2022-06-20", principalCents: 37764, paymentFormReference: "SYNPAY019" });
    const second = document({ documentId: "second", familyId: "collection.enforcement_order", debtKey: "SYNPLAN303", dueDate: "2022-07-20", principalCents: 37882, paymentFormReference: "SYNPAY015" });
    expect(relateRealCorpusDocumentsV4(first, second)[0]).toMatchObject({ relationType: "SAME_PAYMENT_PLAN_DIFFERENT_INSTALLMENTS", exactReference: "SYNPLAN303" });
  });

  it("treats a delivery cover as notification evidence, not the substantive act", () => {
    const enclosed = document({ documentId: "enclosed", familyId: "collection.enforcement_order", deliveryCoverPartId: "part:enclosed:delivery-cover" });
    expect(notificationEvidenceForDocumentV4(enclosed)).toMatchObject({ relationType: "NOTIFICATION_EVIDENCE_FOR", sourceDocumentId: "part:enclosed:delivery-cover", targetDocumentId: "enclosed" });
  });

  it("isolates owners and does not link matching model, year and date without an exact reference", () => {
    const assessment = document({ documentId: "assessment", familyId: "assessment.final_provisional_assessment", taxModel: "180", fiscalYear: "2024", principalCents: 22800, citedNotificationDate: "2025-05-21" });
    const enforcement = document({ documentId: "enforcement", familyId: "collection.enforcement_order", taxModel: "180", fiscalYear: "2024", principalCents: 22800, citedNotificationDate: "2025-05-21" });
    expect(relateRealCorpusDocumentsV4(assessment, { ...enforcement, principalCents: 1 })).toEqual([]);
    expect(relateRealCorpusDocumentsV4(assessment, { ...enforcement, ownerScope: "other-owner" })).toEqual([]);
  });
});
