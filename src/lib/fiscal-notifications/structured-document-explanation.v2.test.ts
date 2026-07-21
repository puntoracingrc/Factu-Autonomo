import { describe, expect, it } from "vitest";
import {
  AEAT_DOCUMENT_KNOWLEDGE_V1,
  AEAT_DOCUMENT_PROFILES_V1,
  AEAT_DOCUMENT_PROFILE_IDS_V1,
  AEAT_DOCUMENT_RELATION_TYPES_V1,
} from "./knowledge/aeat-document-knowledge.v1";
import {
  FISCAL_NOTIFICATION_SUGGESTED_RELATION_PHRASE_V2,
} from "./relation-explanation.v2";
import {
  FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V2,
  FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_V2_CANONICAL_SECTIONS,
  FISCAL_NOTIFICATION_EXPLANATION_ASSERTION_LEVELS_V2,
  FiscalNotificationDocumentExplanationErrorV2,
  adaptFiscalNotificationDocumentExplanationInputV1ToV2,
  adaptFiscalNotificationDocumentExplanationV2ToV1,
  explainFiscalNotificationDocumentV2,
  explainFiscalNotificationDocumentV2FromV1,
  resolveFiscalNotificationExplanationSectionV2,
  type FiscalNotificationDocumentExplanationInputV2,
  type FiscalNotificationDocumentExplanationV2,
  type FiscalNotificationDocumentFamilyIdV2,
  type FiscalNotificationPrintedEffectCodeV2,
} from "./structured-document-explanation.v2";

type ExplanationOverrides = Record<string, unknown>;

function withSyntheticEvidence(
  familyId: FiscalNotificationDocumentFamilyIdV2,
  overrides: ExplanationOverrides,
): FiscalNotificationDocumentExplanationInputV2 {
  const evidenceIds = new Set<string>();
  let sequence = 0;
  const attach = (item: Record<string, unknown>, prefix: string) => {
    const evidenceId =
      typeof item.evidenceId === "string"
        ? item.evidenceId
        : `evidence:test:${prefix}:${++sequence}`;
    evidenceIds.add(evidenceId);
    return { ...item, evidenceId };
  };
  const references = ((overrides.references ?? []) as Record<string, unknown>[]).map(
    (item) => attach(item, "reference"),
  );
  const dates = ((overrides.dates ?? []) as Record<string, unknown>[]).map((item) =>
    attach(item, "date"),
  );
  const money = ((overrides.money ?? []) as Record<string, unknown>[]).map((item) =>
    attach(item, "money"),
  );
  const factCodes = ((overrides.factCodes ?? []) as unknown[]).map((item) =>
    attach(
      typeof item === "string" ? { factCode: item } : (item as Record<string, unknown>),
      "fact",
    ),
  );
  const roleCodes = ((overrides.roleCodes ?? []) as unknown[]).map((item) =>
    attach(
      typeof item === "string" ? { roleCode: item } : (item as Record<string, unknown>),
      "role",
    ),
  );
  const printedEffects = ((overrides.printedEffects ?? []) as Record<string, unknown>[]).map(
    (item) => attach(item, "effect"),
  );
  const documentEvidence = [
    ...((overrides.documentEvidence ?? []) as Record<string, unknown>[]),
    ...[...evidenceIds].map((evidenceId) => ({
      evidenceId,
      pageNumber: 1,
      extractionMethod: "TEXT_LAYER",
      confidence: 1,
      assertionType: "EXPLICIT_IN_DOCUMENT",
      ruleId: "test.synthetic-evidence",
      ruleVersion: "1.0.0",
    })),
  ];
  return {
    ...(overrides as unknown as FiscalNotificationDocumentExplanationInputV2),
    familyId,
    documentEvidence,
    references,
    dates,
    money,
    factCodes,
    roleCodes,
    printedEffects,
  } as unknown as FiscalNotificationDocumentExplanationInputV2;
}

function explain(
  familyId: FiscalNotificationDocumentFamilyIdV2,
  overrides: ExplanationOverrides = {},
): FiscalNotificationDocumentExplanationV2 {
  return explainFiscalNotificationDocumentV2(
    withSyntheticEvidence(familyId, overrides),
  );
}

function sectionText(
  output: FiscalNotificationDocumentExplanationV2,
  sectionId: Parameters<
    typeof resolveFiscalNotificationExplanationSectionV2
  >[1],
): string {
  return resolveFiscalNotificationExplanationSectionV2(output, sectionId)
    .assertions.map((item) => item.text)
    .join(" ");
}

function assertionCodes(
  output: FiscalNotificationDocumentExplanationV2,
  sectionId: Parameters<
    typeof resolveFiscalNotificationExplanationSectionV2
  >[1],
): readonly string[] {
  return resolveFiscalNotificationExplanationSectionV2(output, sectionId)
    .assertions.map((item) => item.code);
}

function expectPrintedEffect(
  familyId: FiscalNotificationDocumentFamilyIdV2,
  effectCode: FiscalNotificationPrintedEffectCodeV2,
  expectedSpecialization: string,
): void {
  const output = explain(familyId, {
    printedEffects: [
      { effectCode, evidenceId: `evidence:${effectCode.toLowerCase()}` },
    ],
  });
  expect(output.specializationId).toBe(expectedSpecialization);
  expect(assertionCodes(output, "RESULT")).toContain(
    `PRINTED_EFFECT_${effectCode}`,
  );
  expect(output.ambiguities).toEqual([]);
}

describe("structured document explanation v2", () => {
  it("explains exactly all 87 registered families through their own metadata and ten sections", () => {
    expect(AEAT_DOCUMENT_PROFILE_IDS_V1).toHaveLength(87);
    expect(new Set(AEAT_DOCUMENT_PROFILE_IDS_V1).size).toBe(87);

    for (const profile of AEAT_DOCUMENT_PROFILES_V1) {
      const output = explain(profile.id);
      const expectedSourceIds = [...profile.officialSourceIds].sort(
        (left, right) =>
          left === "DOC_PRIMARY" ? -1 : right === "DOC_PRIMARY" ? 1 : 0,
      );

      expect(output).toMatchObject({
        engineVersion:
          FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V2,
        familyId: profile.id,
        familyName: profile.nameEs,
        fallbackUsed: false,
        networkPolicy: "NO_NETWORK",
        privacyPolicy: "NO_FREE_TEXT_PII_OR_SENSITIVE_REFERENCE_VALUES",
        materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      });
      expect(output.sections.map((item) => item.id)).toEqual(
        FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_V2_CANONICAL_SECTIONS,
      );
      expect(output.sections).toHaveLength(10);
      expect(sectionText(output, "WHAT_DOCUMENT_SAYS")).toBe(
        profile.plainLanguage.whatItIs,
      );
      expect(sectionText(output, "WHY_RECEIVED")).toBe(
        profile.plainLanguage.whyReceived,
      );
      expect(sectionText(output, "RESULT")).toContain(
        profile.plainLanguage.resultRule,
      );
      expect(sectionText(output, "NEXT_STEP")).toBe(
        profile.plainLanguage.nextStepRule,
      );
      for (const notProven of profile.plainLanguage.notProvenByThisDocument) {
        expect(sectionText(output, "NOT_PROVEN")).toContain(notProven);
      }
      expect(output.officialSources.map((source) => source.id)).toEqual(
        expectedSourceIds,
      );
      expect(output.officialSources[0]?.id).toBe("DOC_PRIMARY");
      expect(
        output.sections.every(
          (item) =>
            item.assertions.length > 0 &&
            item.assertions.every(
              (assertion) =>
                assertion.text.length > 0 &&
                FISCAL_NOTIFICATION_EXPLANATION_ASSERTION_LEVELS_V2.includes(
                  assertion.level,
                ),
            ),
        ),
      ).toBe(true);
    }
  });

  it("uses the generic fallback only for an explicit UNKNOWN or null family", () => {
    for (const familyId of ["UNKNOWN", null] as const) {
      const output = explainFiscalNotificationDocumentV2({ familyId });
      expect(output).toMatchObject({
        familyId: null,
        familyName: null,
        fallbackUsed: true,
        specializationId: "UNKNOWN_EXPLICIT",
        status: "INFORMATION_PENDING",
      });
      expect(output.sections).toHaveLength(10);
      expect(output.sections.flatMap((item) => item.assertions)).toSatisfy(
        (assertions: readonly { level: string }[]) =>
          assertions.every((item) => item.level === "NOT_PROVEN_BY_DOCUMENT"),
      );
    }

    expect(() =>
      explainFiscalNotificationDocumentV2({
        familyId: "unknown.family" as never,
      }),
    ).toThrowError(FiscalNotificationDocumentExplanationErrorV2);
    expect(() =>
      explainFiscalNotificationDocumentV2({
        familyId: " assessment.final_provisional_assessment" as never,
      }),
    ).toThrowError(FiscalNotificationDocumentExplanationErrorV2);
  });

  it("keeps an assessment proposal distinct from a final assessment", () => {
    const proposal = explain("assessment.allegations_and_proposal", {
      printedEffects: [
        { effectCode: "ASSESSMENT_PROPOSED", evidenceId: "evidence:proposal" },
      ],
    });
    const final = explain("assessment.final_provisional_assessment", {
      printedEffects: [
        { effectCode: "ASSESSMENT_FINAL", evidenceId: "evidence:final" },
      ],
    });

    expect(proposal.specializationId).toBe("ASSESSMENT_PROPOSAL");
    expect(final.specializationId).toBe("ASSESSMENT_FINAL");
    expect(assertionCodes(proposal, "RESULT")).toContain(
      "PRINTED_EFFECT_ASSESSMENT_PROPOSED",
    );
    expect(assertionCodes(proposal, "RESULT")).not.toContain(
      "PRINTED_EFFECT_ASSESSMENT_FINAL",
    );
    expect(assertionCodes(final, "RESULT")).toContain(
      "PRINTED_EFFECT_ASSESSMENT_FINAL",
    );

    const incompatible = explain("assessment.allegations_and_proposal", {
      printedEffects: [
        { effectCode: "ASSESSMENT_FINAL", evidenceId: "evidence:wrong-final" },
      ],
    });
    expect(incompatible.status).toBe("REVIEW_REQUIRED");
    expect(incompatible.ambiguities).toContain("INCOMPATIBLE_EFFECT_CODE");
    expect(assertionCodes(incompatible, "RESULT")).not.toContain(
      "PRINTED_EFFECT_ASSESSMENT_FINAL",
    );
  });

  it("specializes sanction initiation, resolution and loss of reduction", () => {
    const cases = [
      [
        "sanction.initiation_and_hearing",
        "SANCTION_INITIATED",
        "SANCTION_INITIATION",
      ],
      ["sanction.resolution", "SANCTION_RESOLVED", "SANCTION_RESOLUTION"],
      [
        "sanction.loss_of_reduction",
        "SANCTION_REDUCTION_LOST",
        "SANCTION_REDUCTION_LOSS",
      ],
    ] as const;
    for (const [familyId, effectCode, specialization] of cases) {
      expectPrintedEffect(familyId, effectCode, specialization);
    }
  });

  it("specializes every deferral state and its separate interest assessment", () => {
    const cases = [
      [
        "collection.deferral_request_receipt",
        "DEFERRAL_REQUESTED",
        "DEFERRAL_REQUEST",
      ],
      [
        "collection.deferral_substantiation_requirement",
        "DEFERRAL_SUBSTANTIATION_REQUIRED",
        "DEFERRAL_SUBSTANTIATION",
      ],
      ["collection.deferral_grant", "DEFERRAL_GRANTED", "DEFERRAL_GRANT"],
      [
        "collection.deferral_modification",
        "DEFERRAL_MODIFIED",
        "DEFERRAL_MODIFICATION",
      ],
      ["collection.deferral_denial", "DEFERRAL_DENIED", "DEFERRAL_DENIAL"],
      [
        "collection.deferral_inadmissibility_or_archival",
        "DEFERRAL_INADMISSIBLE_OR_ARCHIVED",
        "DEFERRAL_CLOSED",
      ],
      ["collection.deferral_breach", "DEFERRAL_BREACHED", "DEFERRAL_BREACH"],
      [
        "collection.interest_assessment",
        "INTEREST_ASSESSED",
        "DEFERRAL_OR_DEBT_INTEREST",
      ],
    ] as const;
    for (const [familyId, effectCode, specialization] of cases) {
      expectPrintedEffect(familyId, effectCode, specialization);
    }

    const request = explain("collection.deferral_request_receipt", {
      printedEffects: [
        { effectCode: "DEFERRAL_REQUESTED", evidenceId: "evidence:deferral" },
      ],
    });
    expect(sectionText(request, "RESULT")).toContain("solicitud");
    expect(sectionText(request, "RESULT")).not.toContain(
      "concesión del calendario",
    );
  });

  it("separates requested, ex-officio, total, partial, denied and residual offsets", () => {
    expectPrintedEffect(
      "collection.offset_requested",
      "OFFSET_REQUESTED",
      "OFFSET_REQUESTED",
    );
    expectPrintedEffect(
      "collection.offset_ex_officio",
      "OFFSET_EX_OFFICIO",
      "OFFSET_EX_OFFICIO",
    );
    for (const effect of [
      "OFFSET_TOTAL",
      "OFFSET_PARTIAL",
      "OFFSET_DENIED",
      "OFFSET_RESIDUAL",
      "EXTINCTION_CONFIRMED",
    ] as const) {
      expectPrintedEffect(
        "collection.offset_resolution",
        effect,
        "OFFSET_RESOLUTION",
      );
    }

    const conflicting = explain("collection.offset_resolution", {
      printedEffects: [
        { effectCode: "OFFSET_TOTAL", evidenceId: "evidence:offset-total" },
        { effectCode: "OFFSET_PARTIAL", evidenceId: "evidence:offset-partial" },
      ],
    });
    expect(conflicting.status).toBe("REVIEW_REQUIRED");
    expect(conflicting.ambiguities).toEqual(["CONFLICTING_EFFECT_CODES"]);
    expect(assertionCodes(conflicting, "RESULT")).not.toContain(
      "PRINTED_EFFECT_OFFSET_TOTAL",
    );
    expect(assertionCodes(conflicting, "RESULT")).not.toContain(
      "PRINTED_EFFECT_OFFSET_PARTIAL",
    );
  });

  it("separates refund recognition, withholding or offset, and payment", () => {
    expectPrintedEffect(
      "refund.request_or_recognition",
      "REFUND_RECOGNIZED",
      "REFUND_RECOGNITION",
    );
    expectPrintedEffect(
      "refund.withholding_or_offset",
      "REFUND_WITHHELD_OR_OFFSET",
      "REFUND_WITHHOLDING",
    );
    expectPrintedEffect(
      "refund.payment_communication",
      "REFUND_PAYMENT_CONFIRMED",
      "REFUND_PAYMENT",
    );

    const recognized = explain("refund.request_or_recognition", {
      printedEffects: [
        { effectCode: "REFUND_RECOGNIZED", evidenceId: "evidence:refund" },
      ],
    });
    expect(sectionText(recognized, "RESULT")).toContain(
      "no confirma todavía su pago",
    );
  });

  it("keeps a payment form, a receipt and a failed payment distinct", () => {
    const formWithoutEvidence = explain("payment.payment_form");
    expect(formWithoutEvidence.specializationId).toBe("PAYMENT_FORM");
    expect(formWithoutEvidence.missingData).toContain("PRINTED_EFFECT");
    expect(assertionCodes(formWithoutEvidence, "RESULT")).not.toContain(
      "PRINTED_EFFECT_PAYMENT_CONFIRMED",
    );

    expectPrintedEffect(
      "payment.payment_form",
      "PAYMENT_FORM_ISSUED",
      "PAYMENT_FORM",
    );
    expectPrintedEffect(
      "payment.receipt",
      "PAYMENT_CONFIRMED",
      "PAYMENT_RECEIPT",
    );
    expectPrintedEffect(
      "payment.failed_or_reversed",
      "PAYMENT_FAILED_OR_REVERSED",
      "PAYMENT_FAILED",
    );

    const falsePayment = explain("payment.payment_form", {
      printedEffects: [
        { effectCode: "PAYMENT_CONFIRMED", evidenceId: "evidence:payment" },
      ],
    });
    expect(falsePayment.status).toBe("REVIEW_REQUIRED");
    expect(sectionText(falsePayment, "RESULT")).not.toContain(
      "confirmación del ingreso",
    );
  });

  it("specializes enforcement and all thirteen seizure document families", () => {
    expectPrintedEffect(
      "collection.enforcement_order",
      "ENFORCEMENT_INITIATED",
      "ENFORCEMENT_ORDER",
    );
    const cases = [
      ["seizure.bank_account", "SEIZURE_ORDERED", "SEIZURE_BANK_ACCOUNT"],
      ["seizure.movable_asset", "SEIZURE_ORDERED", "SEIZURE_MOVABLE_ASSET"],
      ["seizure.real_estate", "SEIZURE_ORDERED", "SEIZURE_REAL_ESTATE"],
      [
        "seizure.commercial_credits",
        "SEIZURE_ORDERED",
        "SEIZURE_COMMERCIAL_CREDITS",
      ],
      [
        "seizure.compliance_reiteration",
        "SEIZURE_OBLIGATION_REITERATED",
        "SEIZURE_REITERATION",
      ],
      ["seizure.release", "SEIZURE_RELEASED", "SEIZURE_RELEASE"],
      ["seizure.wages_or_pensions", "SEIZURE_ORDERED", "SEIZURE_WAGES"],
      [
        "seizure.securities_or_financial_assets",
        "SEIZURE_ORDERED",
        "SEIZURE_SECURITIES",
      ],
      ["seizure.cash_or_refund", "SEIZURE_ORDERED", "SEIZURE_CASH_OR_REFUND"],
      ["seizure.tpv_receipts", "SEIZURE_ORDERED", "SEIZURE_TPV"],
      [
        "seizure.business_income_or_rents",
        "SEIZURE_ORDERED",
        "SEIZURE_BUSINESS_INCOME",
      ],
      [
        "seizure.third_party_response",
        "THIRD_PARTY_RESPONSE_RECORDED",
        "SEIZURE_THIRD_PARTY_RESPONSE",
      ],
      [
        "seizure.third_party_payment",
        "SEIZED_FUNDS_TRANSFERRED",
        "SEIZURE_THIRD_PARTY_PAYMENT",
      ],
    ] as const;
    expect(cases).toHaveLength(13);
    for (const [familyId, effectCode, specialization] of cases) {
      expectPrintedEffect(familyId, effectCode, specialization);
    }

    const response = explain("seizure.third_party_response", {
      printedEffects: [
        {
          effectCode: "THIRD_PARTY_RESPONSE_RECORDED",
          evidenceId: "evidence:third-party-response",
        },
      ],
    });
    const release = explain("seizure.release", {
      printedEffects: [
        { effectCode: "SEIZURE_RELEASED", evidenceId: "evidence:release" },
      ],
    });
    expect(sectionText(response, "RESULT")).toContain(
      "no acredita por sí solo un ingreso",
    );
    expect(sectionText(release, "RESULT")).not.toContain(
      "confirmación del ingreso",
    );
  });

  it("specializes appeals, suspension requests and decisions, and review resolutions", () => {
    const cases = [
      ["review.recurso_reposicion", "APPEAL_FILED", "REVIEW_RECONSIDERATION"],
      [
        "review.economic_administrative_claim",
        "APPEAL_FILED",
        "REVIEW_ECONOMIC_ADMINISTRATIVE",
      ],
      [
        "review.suspension_request",
        "SUSPENSION_REQUESTED",
        "REVIEW_SUSPENSION_REQUEST",
      ],
      [
        "review.suspension_decision",
        "SUSPENSION_GRANTED",
        "REVIEW_SUSPENSION_DECISION",
      ],
      ["review.resolution", "REVIEW_RESOLVED", "REVIEW_RESOLUTION"],
    ] as const;
    for (const [familyId, effectCode, specialization] of cases) {
      expectPrintedEffect(familyId, effectCode, specialization);
    }

    const request = explain("review.suspension_request", {
      printedEffects: [
        {
          effectCode: "SUSPENSION_REQUESTED",
          evidenceId: "evidence:suspension-request",
        },
      ],
    });
    expect(sectionText(request, "RESULT")).toContain(
      "no demuestra que haya sido concedida",
    );
    const conflict = explain("review.suspension_decision", {
      printedEffects: [
        {
          effectCode: "SUSPENSION_GRANTED",
          evidenceId: "evidence:suspension-granted",
        },
        {
          effectCode: "SUSPENSION_DENIED",
          evidenceId: "evidence:suspension-denied",
        },
      ],
    });
    expect(conflict.status).toBe("REVIEW_REQUIRED");
    expect(conflict.ambiguities).toContain("CONFLICTING_EFFECT_CODES");
  });

  it("specializes liability, inspection and census outcomes", () => {
    const cases = [
      ["liability.proposal", "LIABILITY_PROPOSED", "LIABILITY_PROPOSAL"],
      ["liability.final_resolution", "LIABILITY_DECLARED", "LIABILITY_FINAL"],
      ["liability.solidary", "LIABILITY_DECLARED", "LIABILITY_SOLIDARY"],
      ["liability.subsidiary", "LIABILITY_PROPOSED", "LIABILITY_SUBSIDIARY"],
      [
        "liability.successors",
        "SUCCESSOR_COLLECTION_CONTINUED",
        "LIABILITY_SUCCESSOR",
      ],
      ["inspection.procedure", "INSPECTION_INITIATED", "INSPECTION_PROCEDURE"],
      [
        "inspection.communication",
        "INSPECTION_INITIATED",
        "INSPECTION_COMMUNICATION",
      ],
      [
        "inspection.diligence",
        "INSPECTION_ACTION_RECORDED",
        "INSPECTION_RECORD",
      ],
      [
        "inspection.act_agreement",
        "INSPECTION_RESULT_PROPOSED",
        "INSPECTION_ACT_AGREEMENT",
      ],
      [
        "inspection.act_conformity",
        "INSPECTION_RESULT_PROPOSED",
        "INSPECTION_ACT_CONFORMITY",
      ],
      [
        "inspection.act_disagreement",
        "INSPECTION_RESULT_PROPOSED",
        "INSPECTION_ACT_DISAGREEMENT",
      ],
      ["inspection.assessment", "INSPECTION_ASSESSED", "INSPECTION_ASSESSMENT"],
      [
        "registry.tax_registration_resolution",
        "CENSUS_CHANGE_RESOLVED",
        "CENSUS_RESOLUTION",
      ],
      ["registry.census_proposal", "CENSUS_CHANGE_PROPOSED", "CENSUS_PROPOSAL"],
      [
        "registry.tax_domicile_resolution",
        "TAX_DOMICILE_DECIDED",
        "CENSUS_TAX_DOMICILE",
      ],
      ["registry.nif_revocation", "NIF_REVOKED", "CENSUS_NIF_REVOCATION"],
      [
        "registry.nif_rehabilitation",
        "NIF_REHABILITATED",
        "CENSUS_NIF_REHABILITATION",
      ],
    ] as const;
    for (const [familyId, effectCode, specialization] of cases) {
      expectPrintedEffect(familyId, effectCode, specialization);
    }
    expect(explain("registry.census_requirement").specializationId).toBe(
      "CENSUS_REQUIREMENT",
    );
  });

  it("never confirms filing merely because the document is a filing requirement", () => {
    const output = explain("compliance.formal_filing_requirement", {
      printedEffects: [
        { effectCode: "FILING_CONFIRMED", evidenceId: "evidence:filing" },
      ],
    });
    expect(output.status).toBe("REVIEW_REQUIRED");
    expect(output.ambiguities).toEqual(["INCOMPATIBLE_EFFECT_CODE"]);
    expect(assertionCodes(output, "RESULT")).not.toContain(
      "PRINTED_EFFECT_FILING_CONFIRMED",
    );
  });

  it("marks incomplete explanations and does not invent key data, effects or last-day calculations", () => {
    const output = explain("collection.enforcement_order");
    expect(output.status).toBe("INFORMATION_PENDING");
    expect(output.missingData).toEqual([
      "STRUCTURED_FACTS",
      "REQUIRED_PROFILE_FIELDS",
      "PRINTED_EFFECT",
      "DEADLINE_TRIGGER",
    ]);
    expect(assertionCodes(output, "KEY_DATA")).toEqual(["KEY_DATA_PENDING"]);
    expect(assertionCodes(output, "DEADLINE")).toContain(
      "DEADLINE_TRIGGER_PENDING",
    );
    expect(sectionText(output, "DEADLINE")).toContain(
      "No se calcula el último día",
    );
  });

  it("uses only the legal trigger for deadlines, never signature, upload or scan time", () => {
    const signedOnly = explain("assessment.final_provisional_assessment", {
      dates: [{ dateType: "SIGNING_DATE", value: "2026-07-14" }],
    });
    expect(signedOnly.deadlineTriggerAvailable).toBe(false);
    expect(assertionCodes(signedOnly, "DEADLINE")).toContain(
      "DEADLINE_TRIGGER_PENDING",
    );

    const notified = explain("assessment.final_provisional_assessment", {
      dates: [
        { dateType: "SIGNING_DATE", value: "2026-07-14" },
        {
          dateType: "EFFECTIVE_NOTIFICATION_DATE",
          value: "2026-07-16",
        },
      ],
    });
    expect(notified.deadlineTriggerAvailable).toBe(true);
    expect(assertionCodes(notified, "DEADLINE")).toContain(
      "DEADLINE_TRIGGER_AVAILABLE",
    );

    const explicitDueDate = explain("payment.payment_form", {
      dates: [{ dateType: "EXPIRATION_DATE", value: "2026-07-31" }],
    });
    expect(explicitDueDate.deadlineTriggerAvailable).toBe(true);
    const futureEvent = explain("seizure.commercial_credits");
    expect(futureEvent.deadlineTrigger).toBe("FUTURE_EVENT");
    expect(futureEvent.deadlineTriggerAvailable).toBe(false);

    expect(sectionText(notified, "DEADLINE")).toContain(
      "ni se usa la fecha de firma, escaneo o subida",
    );
    expect(JSON.stringify(notified)).not.toContain("createdAt");
  });

  it("explains installment due dates in plain Spanish without exposing the internal trigger", () => {
    const deferral = explain("collection.deferral_grant", {
      dates: [
        { dateType: "ISSUE_DATE", value: "2026-04-20" },
        { dateType: "INSTALLMENT_DUE_DATE", value: "2026-06-22" },
      ],
    });

    expect(deferral.deadlineTriggerAvailable).toBe(true);
    expect(sectionText(deferral, "DEADLINE")).toContain(
      "Cada cuota tiene su propio vencimiento impreso",
    );
    expect(sectionText(deferral, "DEADLINE")).not.toContain(
      "INSTALLMENT_DUE_DATE",
    );
  });

  it("redacts CSV, NRC and bank references and never carries free-text PII", () => {
    const csv = "SYNTHETIC-CSV-PRIVATE-001";
    const nrc = "SYNTHETIC-NRC-PRIVATE-002";
    const bankReference = "SYNTHETIC-BANK-PRIVATE-003";
    const output = explain("payment.receipt", {
      references: [
        { referenceType: "CSV", value: csv },
        { referenceType: "NRC", value: nrc },
        { referenceType: "BANK_REFERENCE", value: bankReference },
      ],
      dates: [{ dateType: "PAYMENT_DATE", value: "2026-07-16" }],
      money: [
        {
          moneyType: "PAYMENT_CONFIRMED",
          amountCents: 12_345,
          currency: "EUR",
        },
      ],
      factCodes: ["PAYMENT_RESULT"],
      roleCodes: ["ACCOUNT_HOLDER"],
      printedEffects: [
        {
          effectCode: "PAYMENT_CONFIRMED",
          evidenceId: "evidence:payment-private",
        },
      ],
    });
    const serialized = JSON.stringify(output);

    expect(serialized).not.toContain(csv);
    expect(serialized).not.toContain(nrc);
    expect(serialized).not.toContain(bankReference);
    expect(serialized).not.toContain("rawText");
    expect(serialized).not.toContain("rawValue");
    expect(sectionText(output, "KEY_DATA")).toContain(
      "Se ha detectado número de referencia completo; su valor no se muestra por privacidad.",
    );

    const visibleOfficialReference = explain("payment.receipt", {
      references: [
        { referenceType: "PAYMENT_RECEIPT_ID", value: "REC-2026 / 00017" },
      ],
    });
    expect(sectionText(visibleOfficialReference, "KEY_DATA")).toContain(
      "Justificante de pago: REC202600017.",
    );
    const taxIdDisguisedAsReference = explain("payment.receipt", {
      references: [{ referenceType: "PAYMENT_RECEIPT_ID", value: "00000000T" }],
    });
    expect(JSON.stringify(taxIdDisguisedAsReference)).not.toContain(
      "00000000T",
    );
    const embeddedIdentity = explain("payment.receipt", {
      references: [
        {
          referenceType: "PAYMENT_RECEIPT_ID",
          value: "REC-00000000-T-612345678-2026",
        },
      ],
    });
    expect(JSON.stringify(embeddedIdentity)).not.toMatch(
      /00000000T|612345678/u,
    );

    const secret = "Ada Synthetic 00000000T ES00SYNTHETICIBAN";
    const legacy = {
      documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_DENIAL" as const,
      documentSubtype: `DENIED ${secret}`,
      documentDate: "2026-07-14",
      receiptDate: "2026-07-16",
      facts: [{ label: "Motivo de la denegación", value: secret }],
      money: [
        {
          kind: "DOCUMENT_TOTAL" as const,
          amountCents: 12_345,
          currency: "EUR" as const,
          sourceReferenceType: null,
        },
      ],
    };
    const adapted =
      adaptFiscalNotificationDocumentExplanationInputV1ToV2(legacy);
    expect(JSON.stringify(adapted)).not.toContain(secret);
    const fromLegacy = explainFiscalNotificationDocumentV2FromV1(legacy);
    expect(JSON.stringify(fromLegacy)).not.toContain(secret);
    expect(
      JSON.stringify(
        adaptFiscalNotificationDocumentExplanationV2ToV1(fromLegacy),
      ),
    ).not.toContain(secret);

    const legacyAssessment = explainFiscalNotificationDocumentV2FromV1({
      documentType: "AEAT_ASSESSMENT",
      documentSubtype: null,
      documentDate: "2026-07-14",
      receiptDate: null,
      facts: [],
      money: [],
    });
    expect(assertionCodes(legacyAssessment, "RESULT")).not.toContain(
      "PRINTED_EFFECT_ASSESSMENT_FINAL",
    );
    expect(legacyAssessment.missingData).toContain("PRINTED_EFFECT");

    expect(() =>
      explainFiscalNotificationDocumentV2({
        familyId: "payment.receipt",
        printedEffectCodes: ["PAYMENT_CONFIRMED"],
      } as never),
    ).toThrowError(FiscalNotificationDocumentExplanationErrorV2);

    expect(() =>
      explainFiscalNotificationDocumentV2({
        familyId: "payment.receipt",
        rawText: secret,
      } as never),
    ).toThrowError(FiscalNotificationDocumentExplanationErrorV2);
  });

  it("renders calculations only when they are explicitly derived and verified from printed values", () => {
    const printedMoney = [
      {
        moneyType: "CREDIT_TOTAL" as const,
        amountCents: 100_000,
        currency: "EUR" as const,
      },
      {
        moneyType: "OFFSET_APPLIED" as const,
        amountCents: 40_000,
        currency: "EUR" as const,
      },
    ];
    const withoutCalculation = explain("collection.offset_resolution", {
      money: printedMoney,
    });
    expect(
      withoutCalculation.sections
        .flatMap((item) => item.assertions)
        .some((item) => item.level === "CALCULATED_FROM_PRINTED_VALUES"),
    ).toBe(false);
    expect(sectionText(withoutCalculation, "KEY_DATA")).not.toContain(
      "60.000,00 €",
    );

    const withCalculation = explain("collection.offset_resolution", {
      money: printedMoney,
      calculatedFromPrintedValues: [
        {
          calculationId: "RESIDUAL_FROM_PRINTED_AMOUNTS",
          resultMoneyType: "REMAINING_AFTER_OFFSET",
          amountCents: 60_000,
          currency: "EUR",
          operandMoneyTypes: ["CREDIT_TOTAL", "OFFSET_APPLIED"],
        },
      ],
    });
    expect(sectionText(withCalculation, "KEY_DATA")).toContain("600,00 €");
    expect(sectionText(withCalculation, "KEY_DATA")).not.toMatch(
      /RESIDUAL_FROM_PRINTED_AMOUNTS|REMAINING_AFTER_OFFSET/u,
    );
    expect(
      resolveFiscalNotificationExplanationSectionV2(withCalculation, "KEY_DATA")
        .assertions,
    ).toContainEqual(
      expect.objectContaining({
        level: "CALCULATED_FROM_PRINTED_VALUES",
        code: "CALCULATION_RESIDUAL_FROM_PRINTED_AMOUNTS_REMAINING_AFTER_OFFSET",
      }),
    );
    const adaptedCalculation =
      adaptFiscalNotificationDocumentExplanationV2ToV1(withCalculation);
    expect(adaptedCalculation.keyFacts).toContainEqual(
      expect.objectContaining({
        label: "Cálculo a partir de importes impresos",
        basis: "CALCULATED_FROM_PRINTED_VALUES",
      }),
    );
    expect(
      adaptedCalculation.keyFacts.map(({ label }) => label).join("\n"),
    ).not.toMatch(
      /CALCULATION_|RESIDUAL_FROM_PRINTED_AMOUNTS|REMAINING_AFTER_OFFSET/u,
    );

    expect(() =>
      explain("collection.offset_resolution", {
        money: printedMoney,
        calculatedFromPrintedValues: [
          {
            calculationId: "RESIDUAL_FROM_PRINTED_AMOUNTS",
            resultMoneyType: "REMAINING_AFTER_OFFSET",
            amountCents: 50_000,
            currency: "EUR",
            operandMoneyTypes: ["CREDIT_TOTAL", "OFFSET_APPLIED"],
          },
        ],
      }),
    ).toThrowError(FiscalNotificationDocumentExplanationErrorV2);
  });

  it("renders observed enforcement fields in plain Spanish without canonical keys", () => {
    const output = explain("collection.enforcement_order", {
      references: [
        {
          referenceType: "LIQUIDATION_KEY",
          value: "LQ-SYNTH-EXPLANATION-001",
        },
      ],
      dates: [
        { dateType: "ISSUE_DATE", value: "2026-02-05" },
        {
          dateType: "VOLUNTARY_PAYMENT_DEADLINE",
          value: "2026-02-28",
        },
      ],
      money: [
        {
          moneyType: "OUTSTANDING_PRINCIPAL",
          amountCents: 10_000,
          currency: "EUR",
        },
        {
          moneyType: "EXECUTIVE_SURCHARGE_20",
          amountCents: 2_000,
          currency: "EUR",
        },
      ],
      factCodes: ["APPEAL_INFORMATION"],
      roleCodes: ["ISSUING_AUTHORITY"],
    });
    const text = sectionText(output, "KEY_DATA");

    expect(text).toContain("Clave de liquidación: LQSYNTHEXPLANATION001.");
    expect(text).toContain("Fecha de emisión: 05/02/2026.");
    expect(text).toContain("Fecha límite de pago voluntario: 28/02/2026.");
    expect(text).toContain("Principal pendiente: 100,00 €.");
    expect(text).toContain("Recargo ejecutivo del veinte por ciento: 20,00 €.");
    expect(text).toContain(
      "Información sobre recursos consta en el documento.",
    );
    expect(text).toContain("Órgano emisor figura en el documento.");
    expect(text).not.toMatch(
      /LIQUIDATION_KEY|ISSUE_DATE|VOLUNTARY_PAYMENT_DEADLINE|OUTSTANDING_PRINCIPAL|EXECUTIVE_SURCHARGE_20|APPEAL_INFORMATION|ISSUING_AUTHORITY/u,
    );
    const adapted = adaptFiscalNotificationDocumentExplanationV2ToV1(output);
    expect(adapted.keyFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Clave de liquidación" }),
        expect.objectContaining({ label: "Fecha de emisión" }),
        expect.objectContaining({ label: "Principal pendiente" }),
        expect.objectContaining({ label: "Información sobre recursos" }),
        expect.objectContaining({ label: "Órgano emisor" }),
      ]),
    );
    expect(adapted.keyFacts.map(({ label }) => label).join("\n")).not.toMatch(
      /REFERENCE_|DATE_|MONEY_|FACT_|ROLE_|LIQUIDATION_KEY|OUTSTANDING_PRINCIPAL/u,
    );
  });

  it("uses an exact relation phrase only when a compatible printed effect is present", () => {
    const relation = {
      relationType: "COMPENSATES" as const,
      status: "SYSTEM_CONFIRMED_EXACT" as const,
      exactReferenceConfirmed: true,
      userConfirmed: false,
      printedEffectProven: true,
    };
    const noEffect = explain("collection.offset_resolution", {
      relations: [relation],
    });
    expect(noEffect.relationships[0].effectAssertion).toBe("NOT_ASSERTED");
    expect(noEffect.relationships[0].phrase).not.toBe(
      AEAT_DOCUMENT_RELATION_TYPES_V1.COMPENSATES.exactPhrase,
    );

    const withEffect = explain("collection.offset_resolution", {
      printedEffects: [
        { effectCode: "OFFSET_TOTAL", evidenceId: "evidence:offset-total" },
      ],
      relations: [relation],
    });
    expect(withEffect.relationships[0]).toMatchObject({
      effectAssertion: "EXPLICIT_IN_DOCUMENT",
      phrase: AEAT_DOCUMENT_RELATION_TYPES_V1.COMPENSATES.exactPhrase,
    });

    const suggested = explain("collection.offset_resolution", {
      relations: [
        {
          relationType: "COMPENSATES",
          status: "SUGGESTED",
          exactReferenceConfirmed: false,
          userConfirmed: false,
          printedEffectProven: false,
        },
      ],
    });
    expect(suggested.relationships[0].phrase).toBe(
      FISCAL_NOTIFICATION_SUGGESTED_RELATION_PHRASE_V2,
    );
  });

  it("repairs the stale AEAT notifications URL at runtime while keeping the profile source set", () => {
    const profile = AEAT_DOCUMENT_PROFILES_V1.find(
      (item) => item.id === "notification.delivery_attempt",
    );
    const output = explain("notification.delivery_attempt");
    const source = output.officialSources.find(
      (item) => item.id === "AEAT_NOTIFICATIONS",
    );

    expect(profile?.officialSourceIds).toContain("AEAT_NOTIFICATIONS");
    expect(source?.canonicalUrl).toBe(
      "https://sede.agenciatributaria.gob.es/Sede/procedimientos/ZN01.shtml",
    );
    expect(output.officialSources.map((item) => item.id)).toHaveLength(
      profile?.officialSourceIds.length ?? 0,
    );
  });

  it("fails closed on malformed, cross-family or untyped structured input", () => {
    expect(() =>
      explainFiscalNotificationDocumentV2({
        familyId: "payment.receipt",
        references: [{ referenceType: "UNKNOWN" as never, value: "synthetic" }],
      } as never),
    ).toThrowError(FiscalNotificationDocumentExplanationErrorV2);
    expect(() =>
      explain("payment.payment_form", {
        references: [{ referenceType: "NRC", value: "synthetic" }],
      }),
    ).toThrowError(FiscalNotificationDocumentExplanationErrorV2);
    expect(() =>
      explain("payment.receipt", {
        dates: [{ dateType: "PAYMENT_DATE", value: "2026-02-30" }],
      }),
    ).toThrowError(FiscalNotificationDocumentExplanationErrorV2);
    expect(() =>
      explain("payment.receipt", {
        money: [
          {
            moneyType: "PAYMENT_CONFIRMED",
            amountCents: -1,
            currency: "EUR",
          },
        ],
      }),
    ).toThrowError(FiscalNotificationDocumentExplanationErrorV2);
    expect(() =>
      explainFiscalNotificationDocumentV2({
        familyId: "payment.receipt",
        money: [
          {
            moneyType: "PAYMENT_CONFIRMED",
            amountCents: 100,
            currency: "USD" as never,
          },
        ],
      } as never),
    ).toThrowError(FiscalNotificationDocumentExplanationErrorV2);
    expect(() =>
      explain("payment.receipt", {
        factCodes: ["PAYMENT_RESULT", "PAYMENT_RESULT"],
      }),
    ).toThrowError(FiscalNotificationDocumentExplanationErrorV2);
  });

  it("requires every explicit fact and effect to resolve to validated same-document evidence", () => {
    expect(() =>
      explainFiscalNotificationDocumentV2({
        familyId: "payment.receipt",
        documentEvidence: [],
        printedEffects: [
          {
            effectCode: "PAYMENT_CONFIRMED",
            evidenceId: "evidence:made-up",
          },
        ],
      }),
    ).toThrowError(FiscalNotificationDocumentExplanationErrorV2);

    expect(() =>
      explainFiscalNotificationDocumentV2({
        familyId: "payment.receipt",
        documentEvidence: [
          {
            evidenceId: "evidence:other",
            pageNumber: 1,
            extractionMethod: "TEXT_LAYER",
            confidence: 1,
            assertionType: "EXPLICIT_IN_DOCUMENT",
            ruleId: "test.other",
            ruleVersion: "1.0.0",
          },
        ],
        references: [
          {
            referenceType: "PAYMENT_RECEIPT_ID",
            value: "REC-2026-0001",
            evidenceId: "evidence:unknown",
          },
        ],
      }),
    ).toThrowError(FiscalNotificationDocumentExplanationErrorV2);
  });

  it("returns deeply immutable output and leaves the input and registry unchanged", () => {
    const evidence = Object.freeze({
      evidenceId: "evidence:test:document-status",
      pageNumber: 1,
      extractionMethod: "TEXT_LAYER" as const,
      confidence: 1,
      assertionType: "EXPLICIT_IN_DOCUMENT" as const,
      ruleId: "test.document-status",
      ruleVersion: "1.0.0",
    });
    const input = Object.freeze({
      familyId: "information.tax_data_report" as const,
      documentEvidence: Object.freeze([evidence]),
      factCodes: Object.freeze([
        Object.freeze({
          factCode: "DOCUMENT_STATUS" as const,
          evidenceId: evidence.evidenceId,
        }),
      ]),
    });
    const before = JSON.stringify(AEAT_DOCUMENT_KNOWLEDGE_V1);
    const output = explainFiscalNotificationDocumentV2(input);

    expect(output.status).toBe("INFORMATION_PENDING");
    expect(output.missingData).toContain("REQUIRED_PROFILE_FIELDS");
    expect(input).toEqual({
      familyId: "information.tax_data_report",
      documentEvidence: [evidence],
      factCodes: [
        {
          factCode: "DOCUMENT_STATUS",
          evidenceId: evidence.evidenceId,
        },
      ],
    });
    expect(JSON.stringify(AEAT_DOCUMENT_KNOWLEDGE_V1)).toBe(before);
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.sections)).toBe(true);
    expect(Object.isFrozen(output.sections[0])).toBe(true);
    expect(Object.isFrozen(output.sections[0].assertions[0])).toBe(true);
    expect(Object.isFrozen(output.officialSources[0])).toBe(true);
    expect(() => {
      (output as { familyName: string }).familyName = "mutated";
    }).toThrow();
  });

  it("provides explicit V1 input and output adapters without broad seizure guesses", () => {
    const legacy = {
      documentType: "AEAT_ENFORCEMENT_ORDER" as const,
      documentSubtype: null,
      documentDate: "2026-07-14",
      receiptDate: "2026-07-16",
      facts: [],
      money: [
        {
          kind: "DOCUMENT_TOTAL" as const,
          amountCents: 52_500,
          currency: "EUR" as const,
          sourceReferenceType: null,
        },
      ],
    };
    const adapted =
      adaptFiscalNotificationDocumentExplanationInputV1ToV2(legacy);
    expect(adapted).toMatchObject({
      familyId: "collection.enforcement_order",
      printedEffects: [],
      documentEvidence: [],
    });
    const v2 = explainFiscalNotificationDocumentV2FromV1(legacy);
    expect(v2).toMatchObject({
      familyId: "collection.enforcement_order",
      fallbackUsed: false,
      engineVersion: "2.0.0",
    });
    const backToV1 = adaptFiscalNotificationDocumentExplanationV2ToV1(v2);
    expect(backToV1).toMatchObject({
      schemaVersion: 1,
      ruleVersion: "2.0.0",
      networkPolicy: "NO_NETWORK",
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });

    const broadSeizure = adaptFiscalNotificationDocumentExplanationInputV1ToV2({
      ...legacy,
      documentType: "AEAT_SEIZURE_ORDER",
    });
    expect(broadSeizure.familyId).toBe("UNKNOWN");
    const explicitSeizure =
      adaptFiscalNotificationDocumentExplanationInputV1ToV2(
        { ...legacy, documentType: "AEAT_SEIZURE_ORDER" },
        { familyId: "seizure.bank_account" },
      );
    expect(explicitSeizure.familyId).toBe("seizure.bank_account");
  });
});
