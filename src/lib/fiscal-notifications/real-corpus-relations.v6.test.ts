import { describe, expect, it } from "vitest";
import {
  internalDocumentRelationsV6,
  relateRealCorpusDocumentSetV6,
  relateRealCorpusDocumentsV6,
  type RealCorpusRelationDocumentV6,
  type RealCorpusRelationV6,
} from "./real-corpus-relations.v6";

function document(
  input: Partial<RealCorpusRelationDocumentV6> &
    Pick<RealCorpusRelationDocumentV6, "documentId" | "familyId">,
): RealCorpusRelationDocumentV6 {
  return Object.freeze({
    ownerScope: "owner-v6",
    issuer: "AEAT",
    documentDate: "2027-01-01",
    debtKey: null,
    voluntaryEndDate: null,
    principalCents: null,
    ordinaryTotalCents: null,
    paymentFormReference: null,
    installments: Object.freeze([]),
    agreementId: null,
    deniedDebt: null,
    interestLiquidationKey: null,
    interestSourceDebtKey: null,
    interestSourcePrincipalCents: null,
    interestCents: null,
    sanctionReference: null,
    sanctionDebtKey: null,
    initialSanctionCents: null,
    historicalReductionPercent: null,
    reductionCents: null,
    reducedSanctionCents: null,
    originSanctionDebtKey: null,
    clawbackDebtKey: null,
    clawbackCents: null,
    modelsPeriods: Object.freeze([]),
    exactReferenceToSanction: null,
    seizureOrderId: null,
    citedSeizureOrderId: null,
    seizureRows: Object.freeze([]),
    seizureAssetKind: "NONE",
    debtSubtotalCents: null,
    printedInterestCents: null,
    printedCostsCents: null,
    seizeLimitCents: null,
    paymentFormPrintedTotalCents: null,
    paymentFormAmountCents: null,
    deliveryCoverPartId: null,
    paymentFormPartIds: Object.freeze([]),
    ...input,
  });
}

function enforcement(input: {
  id: string;
  debtKey: string;
  voluntaryEndDate: string;
  principalCents: number;
  ordinaryTotalCents: number;
}): RealCorpusRelationDocumentV6 {
  return document({
    documentId: input.id,
    familyId: "collection.enforcement_order",
    documentDate: input.voluntaryEndDate,
    debtKey: input.debtKey,
    voluntaryEndDate: input.voluntaryEndDate,
    principalCents: input.principalCents,
    ordinaryTotalCents: input.ordinaryTotalCents,
    paymentFormReference: `SYN-PAY-1-${input.id.toUpperCase()}`,
  });
}

function grant(input: {
  id: string;
  debtKey: string;
  installments: readonly Readonly<{
    dueDate: string;
    baseCents: number;
    deferralInterestCents: number;
    totalCents: number;
  }>[];
}): RealCorpusRelationDocumentV6 {
  return document({
    documentId: input.id,
    familyId: "collection.deferral_grant",
    documentDate: "2026-12-01",
    debtKey: input.debtKey,
    installments: Object.freeze([...input.installments]),
  });
}

function findRelation(
  source: RealCorpusRelationDocumentV6,
  target: RealCorpusRelationDocumentV6,
  type: RealCorpusRelationV6["relationType"],
): RealCorpusRelationV6 | undefined {
  return relateRealCorpusDocumentsV6(source, target).find(
    (item) => item.relationType === type,
  );
}

describe("AEAT real corpus relations V6", () => {
  it("creates the 15 exact installment relations required by V6", () => {
    const plans = [
      grant({ id: "V6-S09", debtKey: "SYN-DEBT-IVA-2T", installments: [
        { dueDate: "2027-01-20", baseCents: 10_000, deferralInterestCents: 100, totalCents: 10_100 },
        { dueDate: "2027-02-20", baseCents: 10_000, deferralInterestCents: 200, totalCents: 10_200 },
        { dueDate: "2027-03-20", baseCents: 10_000, deferralInterestCents: 300, totalCents: 10_300 },
      ] }),
      grant({ id: "V6-S10", debtKey: "SYN-DEBT-IRPF-2T", installments: [
        { dueDate: "2027-01-20", baseCents: 8_000, deferralInterestCents: 100, totalCents: 8_100 },
        { dueDate: "2027-02-20", baseCents: 8_000, deferralInterestCents: 200, totalCents: 8_200 },
        { dueDate: "2027-03-20", baseCents: 8_000, deferralInterestCents: 300, totalCents: 8_300 },
      ] }),
      grant({ id: "V6-S07", debtKey: "SYN-DEBT-IVA-3T", installments: [
        { dueDate: "2027-04-20", baseCents: 12_000, deferralInterestCents: 100, totalCents: 12_100 },
        { dueDate: "2027-05-20", baseCents: 12_000, deferralInterestCents: 200, totalCents: 12_200 },
        { dueDate: "2027-06-20", baseCents: 12_000, deferralInterestCents: 300, totalCents: 12_300 },
      ] }),
      grant({ id: "V6-S08", debtKey: "SYN-DEBT-IRPF-3T", installments: [
        { dueDate: "2027-04-20", baseCents: 6_000, deferralInterestCents: 100, totalCents: 6_100 },
        { dueDate: "2027-05-20", baseCents: 6_000, deferralInterestCents: 200, totalCents: 6_200 },
        { dueDate: "2027-06-20", baseCents: 6_000, deferralInterestCents: 300, totalCents: 6_300 },
      ] }),
      grant({ id: "V6-S01", debtKey: "SYN-DEBT-IVA-4T", installments: [
        { dueDate: "2027-01-20", baseCents: 10_000, deferralInterestCents: 10, totalCents: 10_010 },
        { dueDate: "2027-02-20", baseCents: 10_000, deferralInterestCents: 20, totalCents: 10_020 },
        { dueDate: "2027-03-20", baseCents: 10_000, deferralInterestCents: 30, totalCents: 10_030 },
      ] }),
    ];
    const enforcements = [
      [plans[0]!, enforcement({ id: "V6-S04", debtKey: "SYN-DEBT-IVA-2T", voluntaryEndDate: "2027-01-20", principalCents: 10_100, ordinaryTotalCents: 12_120 })],
      [plans[0]!, enforcement({ id: "V6-S03", debtKey: "SYN-DEBT-IVA-2T", voluntaryEndDate: "2027-02-20", principalCents: 10_200, ordinaryTotalCents: 12_240 })],
      [plans[0]!, enforcement({ id: "V6-S02", debtKey: "SYN-DEBT-IVA-2T", voluntaryEndDate: "2027-03-20", principalCents: 10_300, ordinaryTotalCents: 12_360 })],
      [plans[1]!, enforcement({ id: "V6-S05", debtKey: "SYN-DEBT-IRPF-2T", voluntaryEndDate: "2027-01-20", principalCents: 8_100, ordinaryTotalCents: 9_720 })],
      [plans[1]!, enforcement({ id: "V6-S06", debtKey: "SYN-DEBT-IRPF-2T", voluntaryEndDate: "2027-02-20", principalCents: 8_200, ordinaryTotalCents: 9_840 })],
      [plans[1]!, enforcement({ id: "V6-EXT-P69-Q3", debtKey: "SYN-DEBT-IRPF-2T", voluntaryEndDate: "2027-03-20", principalCents: 8_300, ordinaryTotalCents: 9_960 })],
      [plans[2]!, enforcement({ id: "V6-EXT-P66-Q1", debtKey: "SYN-DEBT-IVA-3T", voluntaryEndDate: "2027-04-20", principalCents: 12_100, ordinaryTotalCents: 14_520 })],
      [plans[2]!, enforcement({ id: "V6-EXT-P66-Q2", debtKey: "SYN-DEBT-IVA-3T", voluntaryEndDate: "2027-05-20", principalCents: 12_200, ordinaryTotalCents: 14_640 })],
      [plans[2]!, enforcement({ id: "V6-EXT-P66-Q3", debtKey: "SYN-DEBT-IVA-3T", voluntaryEndDate: "2027-06-20", principalCents: 12_300, ordinaryTotalCents: 14_760 })],
      [plans[3]!, enforcement({ id: "V6-EXT-P67-Q1", debtKey: "SYN-DEBT-IRPF-3T", voluntaryEndDate: "2027-04-20", principalCents: 6_100, ordinaryTotalCents: 7_320 })],
      [plans[3]!, enforcement({ id: "V6-EXT-P67-Q2", debtKey: "SYN-DEBT-IRPF-3T", voluntaryEndDate: "2027-05-20", principalCents: 6_200, ordinaryTotalCents: 7_440 })],
      [plans[3]!, enforcement({ id: "V6-EXT-P67-Q3", debtKey: "SYN-DEBT-IRPF-3T", voluntaryEndDate: "2027-06-20", principalCents: 6_300, ordinaryTotalCents: 7_560 })],
      [plans[4]!, enforcement({ id: "V6-EXT-P60-Q1", debtKey: "SYN-DEBT-IVA-4T", voluntaryEndDate: "2027-01-20", principalCents: 10_010, ordinaryTotalCents: 12_012 })],
      [plans[4]!, enforcement({ id: "V6-EXT-P60-Q2", debtKey: "SYN-DEBT-IVA-4T", voluntaryEndDate: "2027-02-20", principalCents: 10_020, ordinaryTotalCents: 12_024 })],
      [plans[4]!, enforcement({ id: "V6-EXT-P60-Q3", debtKey: "SYN-DEBT-IVA-4T", voluntaryEndDate: "2027-03-20", principalCents: 10_030, ordinaryTotalCents: 12_036 })],
    ] as const;
    const relations = enforcements.map(([plan, act]) =>
      findRelation(plan, act, "CLAIMS_UNPAID_INSTALLMENT"),
    );
    expect(relations).toHaveLength(15);
    expect(relations.every((item) => item?.status === "SYSTEM_CONFIRMED_EXACT")).toBe(true);
  });

  it("uses same debt without date-and-amount match only as an unmatched relation", () => {
    const plan = grant({
      id: "plan",
      debtKey: "SYN-DEBT-IVA-4T",
      installments: [{ dueDate: "2027-01-20", baseCents: 10_000, deferralInterestCents: 10, totalCents: 10_010 }],
    });
    const unmatched = enforcement({
      id: "unmatched",
      debtKey: "SYN-DEBT-IVA-4T",
      voluntaryEndDate: "2027-04-20",
      principalCents: 40_000,
      ordinaryTotalCents: 48_000,
    });
    expect(findRelation(plan, unmatched, "SAME_UNDERLYING_DEBT_NOT_INSTALLMENT_MATCH")).toBeDefined();
    expect(findRelation(plan, unmatched, "CLAIMS_UNPAID_INSTALLMENT")).toBeUndefined();
  });

  it("models the two sanction branches without turning the lost reduction into a second sanction", () => {
    const initiation = document({
      documentId: "initiation",
      familyId: "sanction.initiation_and_hearing",
      documentDate: "2027-05-01",
      sanctionReference: "SYN-SANCTION-CASE-01",
      modelsPeriods: ["130:2026:1T", "303:2026:1T"],
    });
    const requirement = document({
      documentId: "requirement",
      familyId: "compliance.formal_filing_requirement",
      documentDate: "2027-04-01",
      modelsPeriods: ["130:2026:1T", "303:2026:1T"],
    });
    const resolution = document({
      documentId: "resolution",
      familyId: "sanction.resolution",
      documentDate: "2027-06-01",
      sanctionReference: "SYN-SANCTION-CASE-01",
      sanctionDebtKey: "SYN-SANCTION-DEBT-01",
      initialSanctionCents: 20_000,
      historicalReductionPercent: 25,
      reductionCents: 5_000,
      reducedSanctionCents: 15_000,
    });
    const sanctionEnforcement = enforcement({
      id: "sanction-enforcement",
      debtKey: "SYN-SANCTION-DEBT-01",
      voluntaryEndDate: "2027-07-20",
      principalCents: 15_000,
      ordinaryTotalCents: 18_000,
    });
    const loss = document({
      documentId: "loss",
      familyId: "sanction.loss_of_reduction",
      documentDate: "2027-07-01",
      originSanctionDebtKey: "SYN-SANCTION-DEBT-01",
      clawbackDebtKey: "SYN-CLAWBACK-DEBT-01",
      historicalReductionPercent: 25,
      clawbackCents: 5_000,
    });
    const clawbackEnforcement = enforcement({
      id: "clawback-enforcement",
      debtKey: "SYN-CLAWBACK-DEBT-01",
      voluntaryEndDate: "2027-08-20",
      principalCents: 5_000,
      ordinaryTotalCents: 6_000,
    });
    expect(findRelation(initiation, resolution, "RESOLVES_SANCTION_PROCEEDING")).toBeDefined();
    expect(findRelation(requirement, initiation, "POSSIBLY_PRECEDES_SANCTION")).toMatchObject({
      status: "SYSTEM_SUGGESTED",
    });
    expect(findRelation(resolution, sanctionEnforcement, "SANCTION_DECISION_ENFORCED")).toBeDefined();
    expect(findRelation(resolution, loss, "CLAIMS_LOST_SANCTION_REDUCTION")).toMatchObject({
      observedAmountCents: 5_000,
    });
    expect(findRelation(loss, clawbackEnforcement, "ENFORCES_LOST_REDUCTION")).toBeDefined();
    expect(findRelation(resolution, clawbackEnforcement, "SANCTION_DECISION_ENFORCED")).toBeUndefined();
  });

  it("keeps denial principal, interest assessment and later enforcement in separate branches", () => {
    const denial = document({
      documentId: "denial",
      familyId: "collection.deferral_denial",
      documentDate: "2027-04-01",
      agreementId: "SYN-DENIAL-01",
      deniedDebt: { debtKey: "SYN-DENIED-DEBT-01", principalCents: 50_000 },
    });
    const principalEnforcement = enforcement({
      id: "principal-enforcement",
      debtKey: "SYN-DENIED-DEBT-01",
      voluntaryEndDate: "2027-09-20",
      principalCents: 50_000,
      ordinaryTotalCents: 60_000,
    });
    const interest = document({
      documentId: "interest",
      familyId: "collection.interest_assessment",
      documentDate: "2027-06-01",
      agreementId: "SYN-DENIAL-01",
      interestLiquidationKey: "SYN-INTEREST-LIQ-01",
      interestSourceDebtKey: "SYN-DENIED-DEBT-01",
      interestSourcePrincipalCents: 50_000,
      interestCents: 550,
    });
    const interestEnforcement = enforcement({
      id: "interest-enforcement",
      debtKey: "SYN-INTEREST-LIQ-01",
      voluntaryEndDate: "2027-10-20",
      principalCents: 550,
      ordinaryTotalCents: 660,
    });
    expect(findRelation(denial, principalEnforcement, "DENIAL_PRECEDES_ENFORCEMENT")).toBeDefined();
    expect(findRelation(denial, interest, "INTEREST_ASSESSMENT_FROM_DENIED_DEFERRAL")).toBeDefined();
    expect(findRelation(interest, interestEnforcement, "ENFORCES_INTEREST_ASSESSMENT")).toBeDefined();
    expect(findRelation(denial, interestEnforcement, "DENIAL_PRECEDES_ENFORCEMENT")).toBeUndefined();
  });

  it("relates two asset seizures to one exact debt set without adding their limits", () => {
    const rows = Object.freeze([
      { debtKey: "SYN-SANCTION-DEBT-01", amountCents: 18_000 },
      { debtKey: "SYN-DENIED-DEBT-01", amountCents: 60_000 },
      { debtKey: "SYN-INTEREST-LIQ-01", amountCents: 660 },
      { debtKey: "SYN-CLAWBACK-DEBT-01", amountCents: 6_000 },
      { debtKey: "SYN-OTHER-DEBT-01", amountCents: 250_000 },
    ]);
    const movable = document({
      documentId: "movable",
      familyId: "seizure.movable_asset",
      documentDate: "2027-11-01",
      seizureOrderId: "SYN-SEIZURE-MOVABLE-01",
      seizureRows: rows,
      seizureAssetKind: "MOVABLE_ASSET",
      debtSubtotalCents: 334_660,
      printedInterestCents: 10_000,
      printedCostsCents: 0,
      seizeLimitCents: 344_660,
      paymentFormAmountCents: 344_660,
    });
    const realEstate = document({
      documentId: "real-estate",
      familyId: "seizure.real_estate",
      documentDate: "2027-12-01",
      seizureOrderId: "SYN-SEIZURE-REAL-01",
      seizureRows: rows,
      seizureAssetKind: "REAL_ESTATE",
      debtSubtotalCents: 334_660,
      printedInterestCents: 20_000,
      printedCostsCents: 50_000,
      seizeLimitCents: 404_660,
      paymentFormPrintedTotalCents: 354_660,
      paymentFormAmountCents: 349_660,
    });
    expect(findRelation(movable, realEstate, "SAME_DEBT_SET_MULTIPLE_SEIZURE_ASSETS")).toMatchObject({
      observedAmountCents: 334_660,
      confirmsPayment: false,
      confirmsDebtExtinction: false,
    });
    const changed = { ...realEstate, seizureRows: [...rows.slice(0, 4), { debtKey: "SYN-OTHER-DEBT-01", amountCents: 249_999 }] };
    expect(findRelation(movable, changed, "SAME_DEBT_SET_MULTIPLE_SEIZURE_ASSETS")).toBeUndefined();

    const enforcements = [
      enforcement({ id: "sanction", debtKey: "SYN-SANCTION-DEBT-01", voluntaryEndDate: "2027-07-20", principalCents: 15_000, ordinaryTotalCents: 18_000 }),
      enforcement({ id: "denied", debtKey: "SYN-DENIED-DEBT-01", voluntaryEndDate: "2027-09-20", principalCents: 50_000, ordinaryTotalCents: 60_000 }),
      enforcement({ id: "interest", debtKey: "SYN-INTEREST-LIQ-01", voluntaryEndDate: "2027-10-20", principalCents: 550, ordinaryTotalCents: 660 }),
      enforcement({ id: "clawback", debtKey: "SYN-CLAWBACK-DEBT-01", voluntaryEndDate: "2027-08-20", principalCents: 5_000, ordinaryTotalCents: 6_000 }),
    ];
    const links = enforcements.flatMap((act) => [
      findRelation(act, movable, "ENFORCES"),
      findRelation(act, realEstate, "ENFORCES"),
    ]);
    expect(links).toHaveLength(8);
    expect(links.every(Boolean)).toBe(true);

    const movableRelease = document({
      documentId: "movable-release",
      familyId: "seizure.release",
      documentDate: "2028-01-01",
      citedSeizureOrderId: "SYN-SEIZURE-MOVABLE-01",
    });
    const realRelease = document({
      documentId: "real-release",
      familyId: "seizure.release",
      documentDate: "2028-02-01",
      citedSeizureOrderId: "SYN-SEIZURE-REAL-01",
    });
    expect(findRelation(movable, movableRelease, "RELEASES_SEIZURE")).toMatchObject({
      confirmsPayment: false,
      confirmsDebtExtinction: false,
    });
    expect(findRelation(realEstate, realRelease, "RELEASES_SEIZURE")).toBeDefined();
    expect(findRelation(movable, realRelease, "RELEASES_SEIZURE")).toBeUndefined();
  });

  it("creates one aggregation relation per prior act only for an exact full sum", () => {
    const prior = [
      enforcement({ id: "p1", debtKey: "SYN-DEBT-IVA-4T", voluntaryEndDate: "2026-12-31", principalCents: 40_000, ordinaryTotalCents: 48_000 }),
      enforcement({ id: "p2", debtKey: "SYN-DEBT-IVA-4T", voluntaryEndDate: "2027-01-20", principalCents: 10_010, ordinaryTotalCents: 12_012 }),
      enforcement({ id: "p3", debtKey: "SYN-DEBT-IVA-4T", voluntaryEndDate: "2027-02-20", principalCents: 10_020, ordinaryTotalCents: 12_024 }),
      enforcement({ id: "p4", debtKey: "SYN-DEBT-IVA-4T", voluntaryEndDate: "2027-03-20", principalCents: 10_030, ordinaryTotalCents: 12_036 }),
    ];
    const seizure = document({
      documentId: "aggregate-seizure",
      familyId: "seizure.commercial_credits",
      documentDate: "2027-12-01",
      seizureOrderId: "SYN-AGG-SEIZURE-01",
      seizureAssetKind: "COMMERCIAL_CREDITS",
      seizureRows: [{ debtKey: "SYN-DEBT-IVA-4T", amountCents: 84_072 }],
      debtSubtotalCents: 84_072,
    });
    const relations = relateRealCorpusDocumentSetV6([...prior, seizure]);
    expect(relations).toHaveLength(4);
    expect(relations.every((item) => item.relationType === "AGGREGATES_PRIOR_ENFORCEMENT")).toBe(true);
    expect(relations[0]?.contributingDocumentIds).toEqual(["p1", "p2", "p3", "p4"]);
    expect(relateRealCorpusDocumentSetV6([
      ...prior,
      { ...seizure, seizureRows: [{ debtKey: "SYN-DEBT-IVA-4T", amountCents: 84_071 }] },
    ])).toEqual([]);
  });

  it("keeps one payment operation and never turns the form into evidence", () => {
    const act = document({
      documentId: "act",
      familyId: "collection.enforcement_order",
      paymentFormReference: "SYN-PAY-01",
      paymentFormAmountCents: 12_000,
      deliveryCoverPartId: "part:act:cover",
      paymentFormPartIds: ["part:act:payment-1", "part:act:payment-2"],
    });
    const relations = internalDocumentRelationsV6(act);
    expect(relations.map((item) => item.relationType)).toEqual([
      "DELIVERY_ATTEMPT_FOR",
      "PAYMENT_FORM_FOR",
    ]);
    expect(relations.every((item) => !item.confirmsPayment && !item.permitsAutomaticAction)).toBe(true);
  });

  it("isolates owner scopes and rejects invalid high-cardinality input", () => {
    const plan = grant({
      id: "plan",
      debtKey: "SYN-DEBT-01",
      installments: [{ dueDate: "2027-01-20", baseCents: 10_000, deferralInterestCents: 100, totalCents: 10_100 }],
    });
    const act = {
      ...enforcement({ id: "act", debtKey: "SYN-DEBT-01", voluntaryEndDate: "2027-01-20", principalCents: 10_100, ordinaryTotalCents: 12_120 }),
      ownerScope: "other-owner",
    };
    expect(relateRealCorpusDocumentsV6(plan, act)).toEqual([]);
    expect(relateRealCorpusDocumentSetV6(Array.from({ length: 1_001 }, (_, index) => document({
      documentId: `doc-${index}`,
      familyId: "collection.enforcement_order",
    })))).toEqual([]);
  });
});
