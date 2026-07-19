import { describe, expect, it } from "vitest";
import {
  buildRealCorpusEnforcementIdentityV5,
  internalDocumentRelationsV5,
  relateRealCorpusDocumentSetV5,
  relateRealCorpusDocumentsV5,
  type RealCorpusRelationDocumentV5,
} from "./real-corpus-relations.v5";

function document(
  input: Partial<RealCorpusRelationDocumentV5> &
    Pick<RealCorpusRelationDocumentV5, "documentId" | "familyId">,
): RealCorpusRelationDocumentV5 {
  return Object.freeze({
    ownerScope: "owner-v5",
    issuer: "AEAT",
    documentDate: "2027-07-17",
    debtKey: null,
    voluntaryEndDate: null,
    principalCents: null,
    ordinaryTotalCents: null,
    paymentFormReference: null,
    installments: Object.freeze([]),
    deniedDebt: null,
    existingExecutiveDebtsCitedAsReason: Object.freeze([]),
    seizureRows: Object.freeze([]),
    seizureAssetKind: "NONE",
    recipientRole: "NONE",
    thirdPartyRole: "NONE",
    deliveryCoverPartId: null,
    paymentFormPartIds: Object.freeze([]),
    ...input,
  });
}

describe("AEAT real corpus relations V5", () => {
  it("uses owner, issuer, key, voluntary end and payment form as enforcement identity", () => {
    const identity = buildRealCorpusEnforcementIdentityV5({
      ownerScope: "owner-v5",
      issuer: "AEAT",
      debtKey: "SYN-DEBT-01",
      voluntaryEndDate: "2027-06-20",
      paymentFormReference: "SYN-PAY-01",
    });
    expect(identity).toContain(
      "SYN-DEBT-01:2027-06-20:SYN-PAY-01",
    );
    expect(identity).not.toContain("10100");
  });

  it("links an enforcement to the exact debt and installment date without comparing amounts", () => {
    const grant = document({
      documentId: "grant",
      familyId: "collection.deferral_grant",
      debtKey: "SYN-DEBT-01",
      installments: Object.freeze([
        {
          dueDate: "2027-06-20",
          baseCents: 10_000,
          deferralInterestCents: 100,
          totalCents: 10_100,
        },
      ]),
    });
    const enforcement = document({
      documentId: "enforcement",
      familyId: "collection.enforcement_order",
      debtKey: "SYN-DEBT-01",
      voluntaryEndDate: "2027-06-20",
      principalCents: 10_100,
      ordinaryTotalCents: 12_120,
      paymentFormReference: "SYN-PAY-01",
    });
    expect(relateRealCorpusDocumentsV5(grant, enforcement)[0]).toMatchObject({
      relationType: "CLAIMS_UNPAID_INSTALLMENT",
      status: "SYSTEM_CONFIRMED_EXACT",
      observedAmountCents: null,
      phrase:
        "Esta providencia reclama la cuota del fraccionamiento identificada por la misma deuda y fecha de vencimiento.",
    });
    expect(
      relateRealCorpusDocumentsV5(grant, {
        ...enforcement,
        voluntaryEndDate: "2027-07-20",
      })[0],
    ).toMatchObject({
      relationType: "SAME_UNDERLYING_DEBT_NOT_INSTALLMENT_MATCH",
    });
    expect(
      relateRealCorpusDocumentsV5(grant, {
        ...enforcement,
        principalCents: 10_099,
      })[0],
    ).toMatchObject({
      relationType: "CLAIMS_UNPAID_INSTALLMENT",
      observedAmountCents: null,
    });
  });

  it("distinguishes strong installment identities without using principal", () => {
    const first = document({
      documentId: "first",
      familyId: "collection.enforcement_order",
      debtKey: "SYN-DEBT-01",
      voluntaryEndDate: "2027-06-20",
      principalCents: 10_100,
      paymentFormReference: "SYN-PAY-01",
    });
    const variants = [
      { ...first, documentId: "different-date", voluntaryEndDate: "2027-07-20" },
      { ...first, documentId: "different-form", paymentFormReference: "SYN-PAY-02" },
    ];
    for (const variant of variants) {
      expect(relateRealCorpusDocumentsV5(first, variant)[0]).toMatchObject({
        relationType: "SAME_PAYMENT_PLAN_DIFFERENT_INSTALLMENTS",
      });
    }
    expect(
      relateRealCorpusDocumentsV5(first, {
        ...first,
        documentId: "different-principal",
        principalCents: 10_200,
      }),
    ).toEqual([]);
  });

  it("keeps the denied debt and cited executive debts in different relations", () => {
    const denial = document({
      documentId: "denial",
      familyId: "collection.deferral_denial",
      deniedDebt: { debtKey: "SYN-DENIED-1", principalCents: 50_000 },
      existingExecutiveDebtsCitedAsReason: Object.freeze([
        { debtKey: "SYN-CITED-1", snapshotAmountCents: 12_120 },
      ]),
    });
    const deniedEnforcement = document({
      documentId: "denied-enforcement",
      familyId: "collection.enforcement_order",
      debtKey: "SYN-DENIED-1",
      voluntaryEndDate: "2027-06-20",
      principalCents: 50_000,
      ordinaryTotalCents: 60_000,
      paymentFormReference: "SYN-DENIED-PAY-1",
    });
    const citedEnforcement = document({
      documentId: "cited-enforcement",
      familyId: "collection.enforcement_order",
      debtKey: "SYN-CITED-1",
      voluntaryEndDate: "2027-05-20",
      principalCents: 10_100,
      ordinaryTotalCents: 12_120,
      paymentFormReference: "SYN-CITED-PAY-1",
    });
    expect(relateRealCorpusDocumentsV5(denial, deniedEnforcement)[0]).toMatchObject({
      relationType: "DENIAL_PRECEDES_ENFORCEMENT",
      observedAmountCents: null,
    });
    expect(relateRealCorpusDocumentsV5(denial, citedEnforcement)[0]).toMatchObject({
      relationType: "CITED_AS_EXISTING_EXECUTIVE_DEBT",
      observedAmountCents: null,
      phrase:
        "La denegación cita esta deuda como ya pendiente en vía ejecutiva y la utiliza como parte de su motivación. No la crea ni la incorpora al importe cuya solicitud se deniega.",
    });
  });

  it("creates one aggregation relation per distinctly identified source without amount matching", () => {
    const first = document({
      documentId: "enforcement-1",
      familyId: "collection.enforcement_order",
      documentDate: "2027-01-20",
      debtKey: "SYN-GROUP-1",
      voluntaryEndDate: "2026-12-20",
      principalCents: 10_000,
      ordinaryTotalCents: 12_000,
      paymentFormReference: "SYN-PAY-1",
    });
    const second = document({
      documentId: "enforcement-2",
      familyId: "collection.enforcement_order",
      documentDate: "2027-02-20",
      debtKey: "SYN-GROUP-1",
      voluntaryEndDate: "2027-01-20",
      principalCents: 20_000,
      ordinaryTotalCents: 24_000,
      paymentFormReference: "SYN-PAY-2",
    });
    const seizure = document({
      documentId: "seizure",
      familyId: "seizure.bank_account",
      documentDate: "2027-03-20",
      seizureRows: Object.freeze([
        { debtKey: "SYN-GROUP-1", amountCents: 36_000 },
      ]),
      seizureAssetKind: "BANK_ACCOUNT",
    });
    const exact = relateRealCorpusDocumentSetV5([first, second, seizure]);
    expect(exact).toHaveLength(2);
    expect(exact.every((item) => item.relationType === "AGGREGATES_PRIOR_ENFORCEMENT")).toBe(true);
    expect(exact[0]?.contributingDocumentIds).toEqual([
      "enforcement-1",
      "enforcement-2",
    ]);
    expect(
      relateRealCorpusDocumentSetV5([
        first,
        second,
        {
          ...seizure,
          seizureRows: [{ debtKey: "SYN-GROUP-1", amountCents: 35_999 }],
        },
      ]),
    ).toHaveLength(2);
  });

  it("links a single enforcement row and keeps different seizure assets on one debt", () => {
    const enforcement = document({
      documentId: "enforcement",
      familyId: "collection.enforcement_order",
      debtKey: "SYN-DEBT-1",
      voluntaryEndDate: "2027-01-20",
      principalCents: 10_000,
      ordinaryTotalCents: 12_000,
      paymentFormReference: "SYN-PAY-1",
    });
    const credits = document({
      documentId: "credits",
      familyId: "seizure.commercial_credits",
      seizureRows: [{ debtKey: "SYN-DEBT-1", amountCents: 12_000 }],
      seizureAssetKind: "COMMERCIAL_CREDITS",
    });
    const bank = document({
      documentId: "bank",
      familyId: "seizure.bank_account",
      seizureRows: [{ debtKey: "SYN-DEBT-1", amountCents: 12_000 }],
      seizureAssetKind: "BANK_ACCOUNT",
    });
    expect(relateRealCorpusDocumentsV5(enforcement, credits)[0]).toMatchObject({
      relationType: "ENFORCES",
      observedAmountCents: null,
    });
    expect(relateRealCorpusDocumentsV5(credits, bank)[0]).toMatchObject({
      relationType: "SAME_DEBT_MULTIPLE_SEIZURE_ASSETS",
    });
  });

  it("models the debtor copy, opaque third party, cover and duplicated payment form without asserting payment", () => {
    const seizure = document({
      documentId: "credits",
      familyId: "seizure.commercial_credits",
      recipientRole: "PRIMARY_DEBTOR",
      thirdPartyRole: "GARNISHED_THIRD_PARTY_WITHOUT_IDENTITY",
      seizureRows: [{ debtKey: "SYN-DEBT-1", amountCents: 25_000 }],
      seizureAssetKind: "COMMERCIAL_CREDITS",
      deliveryCoverPartId: "part:credits:delivery-cover",
      paymentFormReference: "SYN-PAY-1",
      paymentFormPartIds: ["part:credits:payment-form-1", "part:credits:payment-form-2"],
    });
    const relations = internalDocumentRelationsV5(seizure);
    expect(relations.map((item) => item.relationType)).toEqual([
      "DELIVERY_ATTEMPT_FOR",
      "PAYMENT_FORM_FOR",
      "ORDERS_THIRD_PARTY_WITHHOLDING",
    ]);
    expect(relations.filter((item) => item.relationType === "PAYMENT_FORM_FOR")).toHaveLength(1);
    expect(relations.every((item) => item.permitsAutomaticAction === false)).toBe(true);
    expect(relations.every((item) => item.observedAmountCents === null)).toBe(true);
  });

  it("isolates owner scopes", () => {
    const grant = document({
      documentId: "grant",
      familyId: "collection.deferral_grant",
      debtKey: "SYN-DEBT-1",
      installments: [
        { dueDate: "2027-06-20", baseCents: 10_000, deferralInterestCents: 100, totalCents: 10_100 },
      ],
    });
    const enforcement = document({
      documentId: "enforcement",
      familyId: "collection.enforcement_order",
      ownerScope: "other-owner",
      debtKey: "SYN-DEBT-1",
      voluntaryEndDate: "2027-06-20",
      principalCents: 10_100,
      paymentFormReference: "SYN-PAY-1",
    });
    expect(relateRealCorpusDocumentsV5(grant, enforcement)).toEqual([]);
  });
});
