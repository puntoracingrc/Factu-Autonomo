import { describe, expect, it } from "vitest";
import {
  decideRealCorpusDuplicateV7,
  relateRealCorpusDocumentsV7,
  resolveActivePaymentPlansV7,
  type RealCorpusRelationDocumentV7,
} from "./real-corpus-relations.v7";

function document(overrides: Partial<RealCorpusRelationDocumentV7> & Pick<RealCorpusRelationDocumentV7, "documentId" | "familyId">): RealCorpusRelationDocumentV7 {
  return Object.freeze({
    ownerScope: "user:synthetic-v7",
    issuer: "AEAT",
    documentDate: "2027-07-17",
    sourceSha256: null,
    debtKey: null,
    principalCents: null,
    ordinaryTotalCents: null,
    adjustedDueDate: null,
    installments: Object.freeze([]),
    remainingInstallmentBasesCents: Object.freeze([]),
    agreementId: null,
    replacesAgreementId: null,
    planPrincipalCents: null,
    explicitlyModifiesPlan: false,
    offsetRows: Object.freeze([]),
    seizureOrderId: null,
    opaqueAssetOrdinal: null,
    seizedAmountCents: null,
    remittedAmountCents: null,
    sanctionReference: null,
    modelsPeriods: Object.freeze([]),
    ...overrides,
  } as RealCorpusRelationDocumentV7);
}

describe("AEAT real corpus relations V7", () => {
  it("deduplicates only the same SHA-256 in the same owner scope and creates no chronology", () => {
    const hash = "a".repeat(64);
    const stored = document({ documentId: "stored-1", familyId: "collection.offset_requested", sourceSha256: hash });
    const copy = document({ documentId: "incoming-1", familyId: "collection.offset_requested", sourceSha256: hash });
    expect(decideRealCorpusDuplicateV7(copy, [stored])).toEqual(expect.objectContaining({
      duplicate: true,
      shouldCreateDocument: false,
      shouldCreateDebt: false,
      shouldCreateChronologyEntry: false,
      relation: expect.objectContaining({
        relationType: "DUPLICATE_COPY_OF",
        phrase: "Este archivo es una copia exacta de un documento ya guardado.",
      }),
    }));
    expect(decideRealCorpusDuplicateV7({ ...copy, ownerScope: "user:other-v7" }, [stored])).toEqual(expect.objectContaining({
      duplicate: false,
      shouldCreateDocument: true,
      shouldCreateChronologyEntry: true,
    }));
    expect(decideRealCorpusDuplicateV7({ ...copy, sourceSha256: "b".repeat(64) }, [stored]).duplicate).toBe(false);
  });

  it("distinguishes one unpaid installment from the remaining plan principal", () => {
    const grant = document({
      documentId: "grant-1",
      familyId: "collection.deferral_grant",
      documentDate: "2027-03-01",
      debtKey: "SYN-DEBT-A1",
      installments: Object.freeze([{ dueDate: "2027-05-05", baseCents: 30_000, deferralInterestCents: 300, totalCents: 30_300 }]),
      remainingInstallmentBasesCents: Object.freeze([30_000, 30_000, 30_000, 30_000, 30_000, 30_005]),
    });
    const installment = document({
      documentId: "enforcement-installment-1",
      familyId: "collection.enforcement_order",
      documentDate: "2027-06-01",
      debtKey: "SYN-DEBT-A1",
      adjustedDueDate: "2027-05-05",
      principalCents: 30_300,
    });
    const remaining = document({
      documentId: "enforcement-remaining-1",
      familyId: "collection.enforcement_order",
      documentDate: "2027-10-01",
      debtKey: "SYN-DEBT-A1",
      principalCents: 180_005,
    });
    expect(relateRealCorpusDocumentsV7(grant, installment)).toEqual([
      expect.objectContaining({ relationType: "CLAIMS_UNPAID_INSTALLMENT" }),
    ]);
    expect(relateRealCorpusDocumentsV7(grant, remaining)).toEqual([
      expect.objectContaining({
        relationType: "ENFORCES_REMAINING_PLAN_PRINCIPAL",
        phrase: "Esta providencia reclama conjuntamente el principal de las fracciones restantes del plan. No es una cuota aislada.",
      }),
    ]);
  });

  it("relates full, partial and residual offset rows without merging them", () => {
    const full = document({ documentId: "enforcement-full-1", familyId: "collection.enforcement_order", documentDate: "2027-01-01", debtKey: "SYN-DEBT-FULL1", ordinaryTotalCents: 42_000 });
    const partial = document({ documentId: "enforcement-partial-1", familyId: "collection.enforcement_order", documentDate: "2027-01-01", debtKey: "SYN-DEBT-A1", ordinaryTotalCents: 43_000 });
    const offset = document({
      documentId: "offset-1",
      familyId: "collection.offset_ex_officio",
      documentDate: "2027-02-01",
      offsetRows: Object.freeze([
        { debtKey: "SYN-DEBT-FULL1", beforeCents: 42_000, appliedCents: 42_000, remainingCents: 0 },
        { debtKey: "SYN-DEBT-A1", beforeCents: 43_000, appliedCents: 8_000, remainingCents: 35_000 },
      ]),
    });
    const seizure = document({ documentId: "seizure-after-offset-1", familyId: "seizure.bank_account", documentDate: "2027-03-01", debtKey: "SYN-DEBT-A1", principalCents: 35_000, seizureOrderId: "SYN-SEIZURE-A1", opaqueAssetOrdinal: 1, seizedAmountCents: 35_000 });
    expect(relateRealCorpusDocumentsV7(full, offset)[0]).toEqual(expect.objectContaining({ relationType: "OFFSET_FULLY_EXTINGUISHES_ENFORCEMENT" }));
    expect(relateRealCorpusDocumentsV7(partial, offset)[0]).toEqual(expect.objectContaining({
      relationType: "OFFSET_PARTIALLY_EXTINGUISHES_ENFORCEMENT",
      observedAmountCents: 8_000,
      phrase: "La compensación reduce parcialmente esta deuda y deja un saldo pendiente concreto.",
    }));
    expect(relateRealCorpusDocumentsV7(offset, seizure)[0]).toEqual(expect.objectContaining({ relationType: "ENFORCES_REMAINING_AFTER_OFFSET", observedAmountCents: 35_000 }));
  });

  it("keeps parallel bank seizures distinct and never converts seizure into remittance", () => {
    const first = document({ documentId: "bank-seizure-1", familyId: "seizure.bank_account", debtKey: "SYN-DEBT-B1", seizureOrderId: "SYN-BANK-SEIZURE-1", opaqueAssetOrdinal: 1, seizedAmountCents: 11_000 });
    const second = document({ documentId: "bank-seizure-2", familyId: "seizure.bank_account", debtKey: "SYN-DEBT-B1", seizureOrderId: "SYN-BANK-SEIZURE-2", opaqueAssetOrdinal: 2, seizedAmountCents: 3_000 });
    expect(relateRealCorpusDocumentsV7(first, second)).toEqual([
      expect.objectContaining({
        relationType: "SAME_DEBT_MULTIPLE_BANK_SEIZURES",
        phrase: "Son embargos sobre cuentas distintas para una sola deuda.",
        confirmsRemittance: false,
        confirmsDebtExtinction: false,
      }),
    ]);
  });

  it("replaces the original plan instead of keeping two active schedules", () => {
    const original = document({ documentId: "plan-original-1", familyId: "collection.deferral_grant", documentDate: "2027-01-01", debtKey: "SYN-DEBT-C1", agreementId: "SYN-PLAN-C1", planPrincipalCents: 300_000 });
    const modified = document({ documentId: "plan-modified-1", familyId: "collection.deferral_modification", documentDate: "2027-02-01", debtKey: "SYN-DEBT-C1", agreementId: "SYN-PLAN-C2", replacesAgreementId: "SYN-PLAN-C1", planPrincipalCents: 300_000, explicitlyModifiesPlan: true });
    expect(relateRealCorpusDocumentsV7(original, modified)).toEqual([
      expect.objectContaining({
        relationType: "MODIFIES_PAYMENT_PLAN",
        phrase: "El acuerdo posterior sustituye el calendario anterior para la misma deuda.",
      }),
    ]);
    expect(resolveActivePaymentPlansV7([original, modified])).toEqual(expect.arrayContaining([
      { documentId: "plan-original-1", agreementId: "SYN-PLAN-C1", active: false, replacedByDocumentId: "plan-modified-1" },
      { documentId: "plan-modified-1", agreementId: "SYN-PLAN-C2", active: true, replacedByDocumentId: null },
    ]));
  });

  it("confirms sanction resolution only by exact reference and suggests the earlier requirement", () => {
    const requirement = document({ documentId: "requirement-1", familyId: "compliance.formal_filing_requirement", documentDate: "2027-01-01", modelsPeriods: Object.freeze(["130:2027:1T", "303:2027:1T"]) });
    const initiation = document({ documentId: "sanction-start-1", familyId: "sanction.initiation_and_hearing", documentDate: "2027-02-01", sanctionReference: "SYN-SANCTION-CASE1", modelsPeriods: Object.freeze(["130:2027:1T", "303:2027:1T"]) });
    const resolution = document({ documentId: "sanction-resolution-1", familyId: "sanction.resolution", documentDate: "2027-03-01", sanctionReference: "SYN-SANCTION-CASE1", principalCents: 15_000 });
    expect(relateRealCorpusDocumentsV7(requirement, initiation)[0]).toEqual(expect.objectContaining({ relationType: "POSSIBLY_PRECEDES_SANCTION", status: "SYSTEM_SUGGESTED" }));
    expect(relateRealCorpusDocumentsV7(initiation, resolution)[0]).toEqual(expect.objectContaining({ relationType: "RESOLVES_SANCTION_PROCEEDING", status: "SYSTEM_CONFIRMED_EXACT" }));
    expect(relateRealCorpusDocumentsV7(initiation, { ...resolution, sanctionReference: "SYN-SANCTION-OTHER2" })).toEqual([]);
  });

  it("fails closed for invalid money and cross-owner relations", () => {
    const source = document({ documentId: "invalid-source-1", familyId: "collection.enforcement_order", debtKey: "SYN-DEBT-A1", principalCents: Number.NaN });
    const target = document({ documentId: "target-1", familyId: "seizure.bank_account", ownerScope: "user:other-v7", debtKey: "SYN-DEBT-A1", seizureOrderId: "SYN-SEIZURE-A2", opaqueAssetOrdinal: 1 });
    expect(relateRealCorpusDocumentsV7(source, target)).toEqual([]);
    expect(resolveActivePaymentPlansV7([source])).toEqual([]);
  });
});
