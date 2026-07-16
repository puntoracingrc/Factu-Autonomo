import { describe, expect, it } from "vitest";
import {
  buildRealCorpusInstallmentIdentityV3,
  relateRealCorpusDocumentsV3,
  type RealCorpusRelationDocumentV3,
} from "./real-corpus-relations.v3";

const OWNER = "owner-synthetic-v3";

function item(
  overrides: Partial<RealCorpusRelationDocumentV3> &
    Pick<RealCorpusRelationDocumentV3, "documentId" | "familyId">,
): RealCorpusRelationDocumentV3 {
  return {
    ownerScope: OWNER,
    issuer: "AEAT",
    debtKey: null,
    installmentDueDate: null,
    installmentSequence: null,
    installmentTotalCents: null,
    enforcementPrincipalCents: null,
    enforcementOrdinaryTotalCents: null,
    paymentFormReference: null,
    seizureOrderId: null,
    citedSeizureOrderId: null,
    seizedAmountCents: null,
    pendingDebtCents: null,
    taxModel: null,
    fiscalYear: null,
    ...overrides,
  };
}

describe("AEAT real corpus relations V3", () => {
  it("builds stable installment identity from owner, issuer, debt, due date and sequence", () => {
    const identity = buildRealCorpusInstallmentIdentityV3({
      ownerScope: OWNER,
      issuer: "AEAT",
      debtKey: "A9999900010002002",
      installmentDueDate: "2026-04-20",
      installmentSequence: 4,
    });
    expect(identity).toBe(
      "aeat-installment-v3:owner-synthetic-v3:AEAT:A9999900010002002:2026-04-20:4",
    );
    expect(
      buildRealCorpusInstallmentIdentityV3({
        ownerScope: OWNER,
        issuer: "AEAT",
        debtKey: "A9999900010002002",
        installmentDueDate: "2026-04-20",
        installmentSequence: 4,
      }),
    ).toBe(identity);
  });

  it("confirms a claimed installment only with the complete exact tuple", () => {
    const enforcement = item({
      documentId: "SYN-V3-APREMIO-B4",
      familyId: "collection.enforcement_order",
      debtKey: "A9999900010002002",
      installmentDueDate: "2026-04-20",
      enforcementPrincipalCents: 30000,
      paymentFormReference: "SYN-PAYFORM-B4",
    });
    const plan = item({
      documentId: "SYN-V3-DEFERRAL-B",
      familyId: "collection.deferral_grant",
      debtKey: "A9999900010002002",
      installmentDueDate: "2026-04-20",
      installmentSequence: 4,
      installmentTotalCents: 30000,
    });
    expect(relateRealCorpusDocumentsV3(enforcement, plan)).toEqual([
      expect.objectContaining({
        relationType: "CLAIMS_UNPAID_INSTALLMENT",
        status: "SYSTEM_CONFIRMED_EXACT",
        exactReference: "A9999900010002002",
        installmentIdentity:
          "aeat-installment-v3:owner-synthetic-v3:AEAT:A9999900010002002:2026-04-20:4",
      }),
    ]);
    expect(
      relateRealCorpusDocumentsV3(enforcement, {
        ...plan,
        installmentDueDate: "2026-05-20",
      }),
    ).toEqual([]);
    expect(
      relateRealCorpusDocumentsV3(enforcement, {
        ...plan,
        installmentTotalCents: 30001,
      }),
    ).toEqual([]);
  });

  it("keeps two enforcement orders for different installments of one debt key", () => {
    const fourth = item({
      documentId: "SYN-V3-APREMIO-B4",
      familyId: "collection.enforcement_order",
      debtKey: "A9999900010002002",
      installmentDueDate: "2026-04-20",
      enforcementPrincipalCents: 30000,
      paymentFormReference: "SYN-PAYFORM-B4",
    });
    const fifth = item({
      documentId: "SYN-V3-APREMIO-B5",
      familyId: "collection.enforcement_order",
      debtKey: "A9999900010002002",
      installmentDueDate: "2026-05-20",
      enforcementPrincipalCents: 30100,
      paymentFormReference: "SYN-PAYFORM-B5",
    });
    expect(relateRealCorpusDocumentsV3(fourth, fifth)).toEqual([
      expect.objectContaining({
        relationType: "SAME_PAYMENT_PLAN_DIFFERENT_INSTALLMENTS",
        status: "SYSTEM_CONFIRMED_EXACT",
      }),
    ]);
  });

  it("links a bank seizure without interpreting seized funds as remitted", () => {
    const enforcement = item({
      documentId: "SYN-V3-APREMIO-D",
      familyId: "collection.enforcement_order",
      debtKey: "A9999900010004004",
      enforcementPrincipalCents: 23000,
      enforcementOrdinaryTotalCents: 27600,
    });
    const seizure = item({
      documentId: "SYN-V3-BANK-SEIZURE-D",
      familyId: "seizure.bank_account",
      debtKey: "A9999900010004004",
      pendingDebtCents: 27600,
      seizedAmountCents: 27600,
    });
    const relations = relateRealCorpusDocumentsV3(seizure, enforcement);
    expect(relations).toEqual([
      expect.objectContaining({
        relationType: "ENFORCES",
        status: "SYSTEM_CONFIRMED_EXACT",
      }),
    ]);
    expect(JSON.stringify(relations)).not.toContain("REMITTED");
  });

  it("requires the exact cited seizure ID for a release", () => {
    const release = item({
      documentId: "SYN-V3-MOVABLE-RELEASE",
      familyId: "seizure.release",
      citedSeizureOrderId: "SYN-MOVABLE-SEIZURE-1",
    });
    const seizure = item({
      documentId: "SYN-V3-MOVABLE-SEIZURE",
      familyId: "seizure.movable_asset",
      seizureOrderId: "SYN-MOVABLE-SEIZURE-1",
    });
    expect(relateRealCorpusDocumentsV3(release, seizure)).toEqual([
      expect.objectContaining({
        relationType: "RELEASES_SEIZURE",
        status: "SYSTEM_CONFIRMED_EXACT",
      }),
    ]);
    expect(
      relateRealCorpusDocumentsV3(release, {
        ...seizure,
        seizureOrderId: "SYN-MOVABLE-SEIZURE-2",
      }),
    ).toEqual([]);
  });

  it("uses model/year only as a suggestion and blocks cross-owner links", () => {
    const enforcement = item({
      documentId: "SYN-V3-APREMIO-D",
      familyId: "collection.enforcement_order",
      taxModel: "180",
      fiscalYear: "2024",
    });
    const reminder = item({
      documentId: "SYN-V3-MODEL180-REMINDER",
      familyId: "information.model_filing_reminder",
      taxModel: "180",
      fiscalYear: "2024",
    });
    expect(relateRealCorpusDocumentsV3(enforcement, reminder)).toEqual([
      expect.objectContaining({
        relationType: "POSSIBLY_RELATED",
        status: "SUGGESTED",
        exactReference: null,
      }),
    ]);
    expect(
      relateRealCorpusDocumentsV3(enforcement, {
        ...reminder,
        ownerScope: "another-owner",
      }),
    ).toEqual([]);
  });

  it("fails closed on malformed and private-looking relation inputs", () => {
    const source = item({
      documentId: "SYN-V3-SOURCE",
      familyId: "collection.enforcement_order",
      debtKey: "12345678Z",
    });
    const target = item({
      documentId: "SYN-V3-TARGET",
      familyId: "collection.deferral_grant",
      debtKey: "12345678Z",
    });
    expect(relateRealCorpusDocumentsV3(source, target)).toEqual([]);
    expect(() =>
      buildRealCorpusInstallmentIdentityV3({
        ownerScope: OWNER,
        issuer: "AEAT",
        debtKey: "12345678Z",
        installmentDueDate: "2026-04-20",
        installmentSequence: 1,
      }),
    ).toThrow("INVALID_REAL_CORPUS_INSTALLMENT_IDENTITY_V3");
    expect(() =>
      buildRealCorpusInstallmentIdentityV3({
        ownerScope: OWNER,
        issuer: "AEAT",
        debtKey: "A9999900010002002",
        installmentDueDate: "2026-02-31",
        installmentSequence: 1,
      }),
    ).toThrow("INVALID_REAL_CORPUS_INSTALLMENT_IDENTITY_V3");
  });
});
