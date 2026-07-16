import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  appendStructuredReviewRelationSuggestionsV1,
  STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2,
  STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1,
} from "./structured-review-relation-suggestions.v1";
import type {
  ExternalReference,
  ExternalReferenceType,
  FiscalNotificationsWorkspace,
} from "./types";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";

const OWNER = "user:00000000-0000-4000-8000-000000000091";
const NOW = "2026-07-14T11:00:00.000Z";

function workspace(count = 2): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "fiscal-notifications-workspace-v1",
    ownerScope: OWNER,
    revision: count,
    createdAt: NOW,
    updatedAt: NOW,
    packages: Array.from({ length: count }, (_, index) => ({
      id: `package:${index}`,
      ownerScope: OWNER,
      fileIds: [`file:${index}`],
      sourceChannel: "MANUAL_UPLOAD" as const,
      processingStatus: "NEEDS_REVIEW" as const,
      securityScanStatus: "NOT_AVAILABLE" as const,
      uploadedAt: NOW,
    })),
    files: Array.from({ length: count }, (_, index) => ({
      id: `file:${index}`,
      packageId: `package:${index}`,
      ownerScope: OWNER,
      role: "PRIMARY" as const,
      mimeType: "application/pdf",
      fileSize: 1_000 + index,
      pageCount: 2,
      sha256: (index + 1).toString().repeat(64),
      contentFingerprint: (index + 1).toString().repeat(64),
      sourceContentRetention: "NOT_RETAINED" as const,
      uploadedAt: NOW,
    })),
    documents: Array.from({ length: count }, (_, index) => ({
      id: `document:${index}`,
      packageId: `package:${index}`,
      fileId: `file:${index}`,
      ownerScope: OWNER,
      documentType: "AEAT_ENFORCEMENT_ORDER" as const,
      titleRaw: `Providencia sintética ${index + 1}`,
      titleNormalized: `PROVIDENCIA SINTETICA ${index + 1}`,
      authorityId: "authority:aeat",
      notificationDates: {},
      status: "UNKNOWN" as const,
      urgency: "REVIEW" as const,
      extractionVersion: "synthetic-v1",
      analysisStatus: "NEEDS_REVIEW" as const,
      humanReviewStatus: "PENDING" as const,
      authenticityStatus: "NOT_CHECKED" as const,
      partIds: [],
      referenceIds: [`reference:${index}`],
      debtIds: [],
      caseIds: [],
      analysisSnapshotIds: [],
      createdAt: NOW,
      updatedAt: NOW,
    })),
    parts: [],
    authorities: [
      {
        id: "authority:aeat",
        ownerScope: OWNER,
        administrationType: "AEAT",
        nameRaw: "Agencia Estatal de Administración Tributaria",
        nameNormalized: "AGENCIA ESTATAL DE ADMINISTRACION TRIBUTARIA",
        officialDomain: "sede.agenciatributaria.gob.es",
      },
    ],
    references: Array.from({ length: count }, (_, index) =>
      reference(index),
    ),
    evidence: Array.from({ length: count }, (_, index) => ({
      id: `evidence:${index}`,
      ownerScope: OWNER,
      documentId: `document:${index}`,
      pageNumber: 1,
      textSnippet: "Clave de liquidación",
      rawValue: "LQ-SYNTH-091",
      extractionMethod: "RULE" as const,
      confidence: "EXACT" as const,
      assertionType: "EXPLICIT_IN_DOCUMENT" as const,
    })),
    debts: [],
    debtObservations: [],
    cases: [],
    relations: [],
    analysisSnapshots: [],
    paymentOptions: [],
    paymentPlans: [],
    installments: [],
    interestCalculations: [],
    deadlineRules: [],
    obligations: [],
    timeline: [],
    accountingDrafts: [],
    auditEvents: [],
  };
}

function reference(index: number): ExternalReference {
  return {
    id: `reference:${index}`,
    ownerScope: OWNER,
    referenceType: "LIQUIDATION_KEY",
    rawValue: "LQ-SYNTH-091",
    normalizedValue: "LQ-SYNTH-091",
    issuer: "AEAT",
    scope: "DOCUMENT",
    documentId: `document:${index}`,
    isPrimary: true,
    confidence: "EXACT",
    confirmationStatus: "PENDING",
    extractionMethod: "RULE",
    occurrenceIds: [`evidence:${index}`],
    createdAt: NOW,
  };
}

function exactReference(
  documentIndex: number,
  type: ExternalReferenceType,
  value: string,
  suffix: string,
  isPrimary = true,
): ExternalReference {
  return {
    id: `reference:${suffix}:${documentIndex}`,
    ownerScope: OWNER,
    referenceType: type,
    rawValue: value,
    normalizedValue: value,
    issuer: "AEAT",
    scope: "DOCUMENT",
    documentId: `document:${documentIndex}`,
    isPrimary,
    confidence: "EXACT",
    confirmationStatus: "PENDING",
    extractionMethod: "RULE",
    occurrenceIds: [`evidence:${suffix}:${documentIndex}`],
    createdAt: NOW,
  };
}

function exactEvidence(
  documentIndex: number,
  suffix: string,
  textSnippet = "Referencia administrativa",
) {
  return {
    id: `evidence:${suffix}:${documentIndex}`,
    ownerScope: OWNER,
    documentId: `document:${documentIndex}`,
    pageNumber: 1,
    textSnippet,
    extractionMethod: "RULE" as const,
    confidence: "EXACT" as const,
    assertionType: "EXPLICIT_IN_DOCUMENT" as const,
  };
}

function replaceReferencePair(
  input: FiscalNotificationsWorkspace,
  type: ExternalReferenceType,
  leftValue: string,
  rightValue: string,
  suffix: string,
): void {
  input.references = [
    exactReference(0, type, leftValue, suffix),
    exactReference(1, type, rightValue, suffix),
  ];
  const textSnippet = type === "DOCUMENT_REFERENCE"
    ? "Número de diligencia"
    : "Referencia administrativa";
  input.evidence = [
    exactEvidence(0, suffix, textSnippet),
    exactEvidence(1, suffix, textSnippet),
  ];
  input.documents[0]!.referenceIds = [`reference:${suffix}:0`];
  input.documents[1]!.referenceIds = [`reference:${suffix}:1`];
}

function configureEnforcementAndSeizure(
  input: FiscalNotificationsWorkspace,
): void {
  input.documents[0]!.documentType = "AEAT_ENFORCEMENT_ORDER";
  input.documents[0]!.titleRaw = "Providencia de apremio sintética";
  input.documents[1]!.documentType = "AEAT_SEIZURE_ORDER";
  input.documents[1]!.documentSubtype = "seizure.bank_account";
  input.documents[1]!.titleRaw = "Diligencia de embargo sintética";
}

function configureSeizureAndFollowUp(
  input: FiscalNotificationsWorkspace,
  followUpSubtype:
    | "seizure.release"
    | "seizure.third_party_response"
    | "seizure.third_party_payment",
): void {
  if (followUpSubtype === "seizure.third_party_payment") {
    input.documents[0]!.documentType = "GENERIC_ADMINISTRATIVE_NOTICE";
    input.documents[0]!.documentSubtype = "seizure.third_party_response";
    input.documents[0]!.titleRaw = "Contestación sintética a diligencia";
  } else {
    input.documents[0]!.documentType = "AEAT_SEIZURE_ORDER";
    input.documents[0]!.documentSubtype =
      followUpSubtype === "seizure.third_party_response"
        ? "seizure.commercial_credits"
        : "seizure.bank_account";
    input.documents[0]!.titleRaw = "Diligencia de embargo sintética";
  }
  input.documents[1]!.documentType = "GENERIC_ADMINISTRATIVE_NOTICE";
  input.documents[1]!.documentSubtype = followUpSubtype;
  input.documents[1]!.titleRaw = `Seguimiento sintético ${followUpSubtype}`;
}

describe("structured review relation suggestions v1", () => {
  it("contains no network, AI, browser storage or fiscal materialization", () => {
    const source = readFileSync(
      new URL("./structured-review-relation-suggestions.v1.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|create.*(?:Debt|Deadline|Payment|Entry)|prepareAccountingDraft/iu,
    );
  });

  it("persists an exact printed-reference match only as a suggestion", () => {
    const input = workspace();
    const before = structuredClone(input);

    const result = appendStructuredReviewRelationSuggestionsV1({
      ownerScope: OWNER,
      workspace: input,
      createdAt: NOW,
    });

    expect(input).toEqual(before);
    expect(result.status).toBe("APPLIED");
    expect(result.addedRelationIds).toHaveLength(1);
    expect(result.workspace.relations).toEqual([
      expect.objectContaining({
        ownerScope: OWNER,
        sourceDocumentId: "document:0",
        targetDocumentId: "document:1",
        relationType: "POSSIBLY_RELATED",
        confidenceBand: "HIGH",
        score: 100,
        status: "SUGGESTED",
        algorithmVersion: STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1,
        evidence: {
          matchingReferenceTypes: ["LIQUIDATION_KEY"],
          matchingAmountTypes: [],
          matchingDates: [],
          differences: [
            "La coincidencia no demuestra por sí sola causalidad, pago o estado jurídico.",
          ],
        },
      }),
    ]);
    expect(JSON.stringify(result.workspace.relations)).not.toContain(
      "LQ-SYNTH-091",
    );
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(result.workspace, OWNER),
    ).toEqual({ valid: true, issues: [] });
  });

  it("types an enforcement-to-seizure edge as exact when a strong key matches", () => {
    const input = workspace();
    configureEnforcementAndSeizure(input);
    replaceReferencePair(
      input,
      "LIQUIDATION_KEY",
      "LQ-SYNTH-ENFORCEMENT-001",
      "LQ-SYNTH-ENFORCEMENT-001",
      "enforcement",
    );

    const result = appendStructuredReviewRelationSuggestionsV1({
      ownerScope: OWNER,
      workspace: input,
      createdAt: NOW,
    });

    expect(result.status).toBe("APPLIED");
    expect(result.workspace.relations).toEqual([
      expect.objectContaining({
        sourceDocumentId: "document:1",
        targetDocumentId: "document:0",
        relationType: "ENFORCES",
        confidenceBand: "EXACT",
        status: "SYSTEM_CONFIRMED_EXACT",
        algorithmVersion:
          STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2,
        evidence: {
          chainId: "enforcement_seizure_chain",
          matchingReferenceTypes: ["LIQUIDATION_KEY"],
          matchingAmountTypes: [],
          matchingDates: [],
          differences: [
            "La referencia oficial coincide exactamente y la dirección figura en una cadena documental declarada.",
            "La relación no cambia saldos, estados, pagos, deudas, plazos ni asientos.",
          ],
        },
      }),
    ]);
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(result.workspace, OWNER),
    ).toEqual({ valid: true, issues: [] });
  });

  it.each([
    ["seizure.third_party_response", "RESPONDS_TO_SEIZURE"],
    ["seizure.third_party_payment", "TRANSFERS_SEIZED_FUNDS"],
    ["seizure.release", "RELEASES_SEIZURE"],
  ] as const)(
    "types %s by the exact cited seizure order",
    (followUpSubtype, relationType) => {
      const input = workspace();
      configureSeizureAndFollowUp(input, followUpSubtype);
      replaceReferencePair(
        input,
        "DOCUMENT_REFERENCE",
        "EMB-SYNTH-REL-001",
        "EMB-SYNTH-REL-001",
        "seizure-order",
      );

      const result = appendStructuredReviewRelationSuggestionsV1({
        ownerScope: OWNER,
        workspace: input,
        createdAt: NOW,
      });

      expect(result.status).toBe("APPLIED");
      expect(result.workspace.relations).toEqual([
        expect.objectContaining({
          sourceDocumentId: "document:1",
          targetDocumentId: "document:0",
          relationType,
          algorithmVersion:
            STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2,
          evidence: expect.objectContaining({
            chainId: "enforcement_seizure_chain",
          }),
          confidenceBand: "EXACT",
          status: "SYSTEM_CONFIRMED_EXACT",
        }),
      ]);
    },
  );

  it("types a non-seizure declared chain by an exact explicit request number", () => {
    const input = workspace();
    input.documents[0]!.documentType = "GENERIC_ADMINISTRATIVE_NOTICE";
    input.documents[0]!.documentSubtype = "collection.deferral_request_receipt";
    input.documents[0]!.titleRaw = "Solicitud de aplazamiento sintética";
    input.documents[1]!.documentType = "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT";
    input.documents[1]!.documentSubtype = "collection.deferral_grant";
    input.documents[1]!.titleRaw = "Acuerdo de concesión sintético";
    replaceReferencePair(
      input,
      "REQUEST_NUMBER",
      "REQ-SYNTH-DEFERRAL-001",
      "REQ-SYNTH-DEFERRAL-001",
      "deferral-request",
    );

    const result = appendStructuredReviewRelationSuggestionsV1({
      ownerScope: OWNER,
      workspace: input,
      createdAt: NOW,
    });

    expect(result.status).toBe("APPLIED");
    expect(result.workspace.relations).toEqual([
      expect.objectContaining({
        sourceDocumentId: "document:1",
        targetDocumentId: "document:0",
        relationType: "CREATES_PAYMENT_PLAN_FOR",
        confidenceBand: "EXACT",
        status: "SYSTEM_CONFIRMED_EXACT",
        algorithmVersion:
          STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2,
        evidence: expect.objectContaining({
          chainId: "deferral_chain",
          matchingReferenceTypes: ["REQUEST_NUMBER"],
        }),
      }),
    ]);
  });

  it.each([
    ["notification_to_act", "notification.delivery_attempt", "registry.census_requirement", "NOTIFICATION_EVIDENCE_FOR"],
    ["missing_return_to_sanction", "information.model_filing_reminder", "compliance.informal_missing_return_notice", "CONTINUES"],
    ["assessment_chain", "assessment.procedure_start", "compliance.document_request", "CONTINUES"],
    ["assessment_to_collection", "assessment.final_provisional_assessment", "payment.payment_form", "PAYMENT_FORM_FOR"],
    ["deferral_chain", "collection.deferral_request_receipt", "collection.deferral_substantiation_requirement", "CONTINUES"],
    ["offset_refund_chain", "refund.request_or_recognition", "collection.offset_requested", "COMPENSATES"],
    ["enforcement_seizure_chain", "collection.enforcement_order", "seizure.bank_account", "ENFORCES"],
    ["review_suspension_chain", "review.recurso_reposicion", "review.suspension_request", "REQUESTS_SUSPENSION"],
    ["liability_chain", "liability.proposal", "liability.final_resolution", "DECLARES_LIABILITY"],
    ["inspection_chain", "inspection.procedure", "inspection.communication", "INITIATES_INSPECTION"],
    ["census_chain", "registry.census_requirement", "registry.census_proposal", "RECTIFIES_CENSUS"],
    ["nif_chain", "registry.nif_revocation", "registry.nif_rehabilitation", "REHABILITATES_NIF"],
    ["special_review_chain", "registry.census_requirement", "review.material_error", "CORRECTS"],
    ["third_party_claim_chain", "seizure.movable_asset", "review.third_party_claim", "CONTINUES"],
    ["guarantee_reimbursement_chain", "review.resolution", "review.guarantee_cost_reimbursement", "REIMBURSES_GUARANTEE_COST_FOR"],
  ] as const)(
    "activates the declared %s topology only with an exact explicit reference",
    (chainId, fromFamilyId, toFamilyId, relationType) => {
      const input = workspace();
      input.documents[0]!.documentType = "GENERIC_ADMINISTRATIVE_NOTICE";
      input.documents[0]!.documentSubtype = fromFamilyId;
      input.documents[1]!.documentType = "GENERIC_ADMINISTRATIVE_NOTICE";
      input.documents[1]!.documentSubtype = toFamilyId;
      replaceReferencePair(
        input,
        "EXPEDIENT_NUMBER",
        `EXP-SYNTH-${chainId}`,
        `EXP-SYNTH-${chainId}`,
        `chain-${chainId}`,
      );

      const result = appendStructuredReviewRelationSuggestionsV1({
        ownerScope: OWNER,
        workspace: input,
        createdAt: NOW,
      });

      expect(result.status).toBe("APPLIED");
      expect(result.workspace.relations).toEqual([
        expect.objectContaining({
          sourceDocumentId: "document:1",
          targetDocumentId: "document:0",
          relationType,
          status: "SYSTEM_CONFIRMED_EXACT",
          algorithmVersion:
            STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2,
          evidence: expect.objectContaining({
            chainId,
            matchingReferenceTypes: ["EXPEDIENT_NUMBER"],
          }),
        }),
      ]);
    },
  );

  it("does not relate declared chain families when the explicit-reference issuer differs", () => {
    const input = workspace();
    input.documents[0]!.documentSubtype = "collection.deferral_request_receipt";
    input.documents[1]!.documentSubtype = "collection.deferral_grant";
    replaceReferencePair(
      input,
      "REQUEST_NUMBER",
      "REQ-SYNTH-ISSUER-001",
      "REQ-SYNTH-ISSUER-001",
      "issuer-mismatch",
    );
    input.references[1]!.issuer = "TGSS";

    const result = appendStructuredReviewRelationSuggestionsV1({
      ownerScope: OWNER,
      workspace: input,
      createdAt: NOW,
    });

    expect(result.status).toBe("UNCHANGED");
    expect(result.workspace.relations).toEqual([]);
  });

  it("uses an exact NRC only for the payment operation it proves", () => {
    const unrelated = workspace();
    unrelated.documents[0]!.documentSubtype =
      "collection.deferral_request_receipt";
    unrelated.documents[1]!.documentSubtype = "collection.deferral_grant";
    replaceReferencePair(
      unrelated,
      "NRC",
      "A1B2C3D4E5F6G7H8I9J0KL",
      "A1B2C3D4E5F6G7H8I9J0KL",
      "nrc-unrelated",
    );
    expect(
      appendStructuredReviewRelationSuggestionsV1({
        ownerScope: OWNER,
        workspace: unrelated,
        createdAt: NOW,
      }).status,
    ).toBe("UNCHANGED");

    const payment = workspace();
    payment.documents[0]!.documentSubtype = "payment.payment_form";
    payment.documents[1]!.documentSubtype = "payment.receipt";
    replaceReferencePair(
      payment,
      "NRC",
      "A1B2C3D4E5F6G7H8I9J0KL",
      "A1B2C3D4E5F6G7H8I9J0KL",
      "nrc-payment",
    );
    const result = appendStructuredReviewRelationSuggestionsV1({
      ownerScope: OWNER,
      workspace: payment,
      createdAt: NOW,
    });
    expect(result.status).toBe("APPLIED");
    expect(result.workspace.relations).toEqual([
      expect.objectContaining({
        relationType: "PAYMENT_EVIDENCE_FOR",
        status: "SYSTEM_CONFIRMED_EXACT",
        evidence: expect.objectContaining({ matchingReferenceTypes: ["NRC"] }),
      }),
    ]);
  });

  it("does not relate declared chain families from the same amount without a reference", () => {
    const input = workspace();
    input.documents[0]!.documentSubtype = "collection.deferral_request_receipt";
    input.documents[1]!.documentSubtype = "collection.deferral_grant";
    input.references = [];
    input.evidence = [];
    input.documents[0]!.referenceIds = [];
    input.documents[1]!.referenceIds = [];
    input.paymentOptions = [0, 1].map((index) => ({
      id: `payment-option:${index}`,
      ownerScope: OWNER,
      documentId: `document:${index}`,
      title: "Importe sintético",
      eligibilityCondition: "Revisión humana",
      components: [
        {
          type: "PRINCIPAL" as const,
          amountCents: 12_345,
          assertionType: "EXPLICIT_IN_DOCUMENT" as const,
          evidenceIds: [],
        },
      ],
      totalCents: 12_345,
      deadlineStatus: "UNKNOWN" as const,
      evidenceIds: [],
    }));

    const result = appendStructuredReviewRelationSuggestionsV1({
      ownerScope: OWNER,
      workspace: input,
      createdAt: NOW,
    });

    expect(result.status).toBe("UNCHANGED");
    expect(result.workspace.relations).toEqual([]);
  });

  it("does not mistake a shared secondary act reference for the cited seizure order", () => {
    const input = workspace();
    configureSeizureAndFollowUp(input, "seizure.release");
    input.references = [
      exactReference(0, "DOCUMENT_REFERENCE", "EMB-SYNTH-A", "primary"),
      exactReference(0, "DOCUMENT_REFERENCE", "APR-SYNTH-SHARED", "secondary", false),
      exactReference(1, "DOCUMENT_REFERENCE", "EMB-SYNTH-B", "primary"),
      exactReference(1, "DOCUMENT_REFERENCE", "APR-SYNTH-SHARED", "secondary", false),
    ];
    input.evidence = [
      exactEvidence(0, "primary", "Número de diligencia"),
      exactEvidence(0, "secondary", "Referencia de la providencia"),
      exactEvidence(1, "primary", "Número de diligencia"),
      exactEvidence(1, "secondary", "Referencia de la providencia"),
    ];
    input.documents[0]!.referenceIds = [
      "reference:primary:0",
      "reference:secondary:0",
    ];
    input.documents[1]!.referenceIds = [
      "reference:primary:1",
      "reference:secondary:1",
    ];

    const result = appendStructuredReviewRelationSuggestionsV1({
      ownerScope: OWNER,
      workspace: input,
      createdAt: NOW,
    });

    expect(result.status).toBe("APPLIED");
    expect(result.workspace.relations).toEqual([
      expect.objectContaining({
        relationType: "POSSIBLY_RELATED",
        status: "SUGGESTED",
        algorithmVersion: STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1,
      }),
    ]);
  });

  it("does not relate an enforcement and seizure with different keys", () => {
    const input = workspace();
    configureEnforcementAndSeizure(input);
    replaceReferencePair(
      input,
      "DEBT_KEY",
      "DEBT-SYNTH-A",
      "DEBT-SYNTH-B",
      "different-debt",
    );

    const result = appendStructuredReviewRelationSuggestionsV1({
      ownerScope: OWNER,
      workspace: input,
      createdAt: NOW,
    });

    expect(result.status).toBe("UNCHANGED");
    expect(result.workspace.relations).toEqual([]);
  });

  it("blocks a typed edge when another explicit reference contradicts it", () => {
    const input = workspace();
    configureEnforcementAndSeizure(input);
    replaceReferencePair(
      input,
      "LIQUIDATION_KEY",
      "LQ-SYNTH-SHARED",
      "LQ-SYNTH-SHARED",
      "shared-liquidation",
    );
    input.references.push(
      exactReference(0, "DOCUMENT_REFERENCE", "APR-SYNTH-A", "act"),
      exactReference(1, "DOCUMENT_REFERENCE", "APR-SYNTH-B", "act"),
    );
    input.evidence.push(exactEvidence(0, "act"), exactEvidence(1, "act"));
    input.documents[0]!.referenceIds.push("reference:act:0");
    input.documents[1]!.referenceIds.push("reference:act:1");

    const result = appendStructuredReviewRelationSuggestionsV1({
      ownerScope: OWNER,
      workspace: input,
      createdAt: NOW,
    });

    expect(result.status).toBe("UNCHANGED");
    expect(result.workspace.relations).toEqual([]);
  });

  it("creates a deterministic star for three documents without duplicates", () => {
    const input = workspace(3);
    const first = appendStructuredReviewRelationSuggestionsV1({
      ownerScope: OWNER,
      workspace: input,
      createdAt: NOW,
    });
    expect(first.status).toBe("APPLIED");
    expect(
      first.workspace.relations.map((item) => [
        item.sourceDocumentId,
        item.targetDocumentId,
      ]),
    ).toEqual([
      ["document:0", "document:1"],
      ["document:0", "document:2"],
    ]);

    const replay = appendStructuredReviewRelationSuggestionsV1({
      ownerScope: OWNER,
      workspace: first.workspace,
      createdAt: NOW,
    });
    expect(replay.status).toBe("UNCHANGED");
    expect(replay.workspace.relations).toEqual(first.workspace.relations);
  });

  it("ignores rejected, weak or non-explicit reference evidence", () => {
    const cases = [
      (value: FiscalNotificationsWorkspace) => {
        value.references[1]!.confirmationStatus = "REJECTED";
      },
      (value: FiscalNotificationsWorkspace) => {
        value.references[1]!.confidence = "HIGH";
      },
      (value: FiscalNotificationsWorkspace) => {
        value.evidence[1]!.assertionType = "INFERRED";
      },
      (value: FiscalNotificationsWorkspace) => {
        value.references[1]!.normalizedValue = "LQ-DIFFERENT-092";
      },
    ];
    for (const alter of cases) {
      const input = workspace();
      alter(input);
      const result = appendStructuredReviewRelationSuggestionsV1({
        ownerScope: OWNER,
        workspace: input,
        createdAt: NOW,
      });
      expect(result.status).toBe("UNCHANGED");
      expect(result.workspace.relations).toEqual([]);
    }
  });

  it("accepts only fully proven user-confirmed references", () => {
    const input = workspace();
    for (let index = 0; index < 2; index += 1) {
      const referenceItem = input.references[index]!;
      referenceItem.extractionMethod = "USER";
      referenceItem.confirmationStatus = "CONFIRMED";
      const evidenceItem = input.evidence[index]!;
      evidenceItem.extractionMethod = "USER";
      evidenceItem.assertionType = "USER_CONFIRMED";
      evidenceItem.confirmedAt = NOW;
      evidenceItem.confirmedBy = "actor:synthetic";
    }

    expect(
      appendStructuredReviewRelationSuggestionsV1({
        ownerScope: OWNER,
        workspace: input,
        createdAt: NOW,
      }).status,
    ).toBe("APPLIED");

    delete input.evidence[1]!.confirmedBy;
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(input, OWNER).valid,
    ).toBe(false);
    expect(() =>
      appendStructuredReviewRelationSuggestionsV1({
        ownerScope: OWNER,
        workspace: input,
        createdAt: NOW,
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_RELATION_WORKSPACE");
  });

  it("fails closed for another owner or a different transaction timestamp", () => {
    const input = workspace();
    expect(() =>
      appendStructuredReviewRelationSuggestionsV1({
        ownerScope: "user:00000000-0000-4000-8000-000000000099",
        workspace: input,
        createdAt: NOW,
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_RELATION_WORKSPACE");

    const backdated = appendStructuredReviewRelationSuggestionsV1({
      ownerScope: OWNER,
      workspace: input,
      createdAt: "2026-07-14T10:59:59.000Z",
    });
    expect(backdated).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "RESULT_INVALID",
      addedRelationIds: [],
    });
    expect(backdated.workspace).not.toBe(input);
    expect(backdated.workspace.relations).toEqual([]);

    const future = appendStructuredReviewRelationSuggestionsV1({
      ownerScope: OWNER,
      workspace: input,
      createdAt: "2026-07-14T11:00:01.000Z",
    });
    expect(future).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "RESULT_INVALID",
      addedRelationIds: [],
    });
  });
});
