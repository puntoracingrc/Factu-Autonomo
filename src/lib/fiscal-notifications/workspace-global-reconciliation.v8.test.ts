import { describe, expect, it } from "vitest";
import type { FiscalNotificationsWorkspace } from "./types";
import { appendWorkspaceGlobalReconciliationV8 } from "./workspace-global-reconciliation.v8";
import { projectFiscalNotificationsWorkspacePrivacyV2 } from "./workspace-privacy-projection.v2";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";
import { createSensitiveReferenceV2Sync } from "./sensitive-reference.v2";
import { FISCAL_NOTIFICATION_INPUT_LIMITS } from "./input-contract";
import {
  encodeFiscalNotificationsWorkspaceForStorageV2,
  restoreFiscalNotificationsWorkspaceFromStorageV2,
} from "./workspace-storage-envelope.v2";
import { AEAT_MATHEMATICAL_INTEGRITY_RELEASE_ID_V11 } from "./knowledge/mathematical-integrity-catalog.v11";
import { FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_VERSION_V11 } from "./mathematical-integrity-contract.v11";

const OWNER = "user:00000000-0000-4000-8000-000000000088";
const NOW = "2026-07-17T08:00:00.000Z";

function workspace(): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "fiscal-notifications-workspace-v8-synthetic",
    ownerScope: OWNER,
    revision: 2,
    createdAt: NOW,
    updatedAt: NOW,
    packages: [0, 1].map((index) => ({
      id: `package:${index}`,
      ownerScope: OWNER,
      fileIds: [`file:${index}`],
      sourceChannel: "MANUAL_UPLOAD" as const,
      processingStatus: "NEEDS_REVIEW" as const,
      securityScanStatus: "NOT_AVAILABLE" as const,
      uploadedAt: NOW,
    })),
    files: [0, 1].map((index) => ({
      id: `file:${index}`,
      packageId: `package:${index}`,
      ownerScope: OWNER,
      role: "PRIMARY" as const,
      mimeType: "application/pdf",
      fileSize: 2_000 + index,
      pageCount: 2,
      sha256: String(index + 1).repeat(64),
      contentFingerprint: String(index + 3).repeat(64),
      sourceContentRetention: "NOT_RETAINED" as const,
      uploadedAt: NOW,
    })),
    documents: [
      {
        id: "document:assessment",
        packageId: "package:0",
        fileId: "file:0",
        ownerScope: OWNER,
        documentType: "AEAT_ASSESSMENT" as const,
        documentSubtype: "assessment.final_provisional_assessment",
        titleRaw: "Liquidación provisional sintética",
        titleNormalized: "LIQUIDACION PROVISIONAL SINTETICA",
        authorityId: "authority:aeat",
        issueDate: "2024-05-01",
        notificationDates: {},
        status: "UNKNOWN" as const,
        urgency: "REVIEW" as const,
        extractionVersion: "synthetic-v8",
        analysisStatus: "NEEDS_REVIEW" as const,
        humanReviewStatus: "PENDING" as const,
        authenticityStatus: "NOT_CHECKED" as const,
        partIds: [],
        referenceIds: ["reference:assessment"],
        debtIds: [],
        caseIds: [],
        analysisSnapshotIds: [],
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: "document:enforcement",
        packageId: "package:1",
        fileId: "file:1",
        ownerScope: OWNER,
        documentType: "AEAT_ENFORCEMENT_ORDER" as const,
        documentSubtype: "collection.enforcement_order",
        titleRaw: "Providencia de apremio sintética",
        titleNormalized: "PROVIDENCIA DE APREMIO SINTETICA",
        authorityId: "authority:aeat",
        issueDate: "2024-06-01",
        notificationDates: {},
        status: "UNKNOWN" as const,
        urgency: "REVIEW" as const,
        extractionVersion: "synthetic-v8",
        analysisStatus: "NEEDS_REVIEW" as const,
        humanReviewStatus: "PENDING" as const,
        authenticityStatus: "NOT_CHECKED" as const,
        partIds: [],
        referenceIds: ["reference:enforcement"],
        debtIds: [],
        caseIds: [],
        analysisSnapshotIds: [],
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
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
    references: [
      {
        id: "reference:assessment",
        ownerScope: OWNER,
        referenceType: "LIQUIDATION_KEY",
        rawValue: "SYN-DEBT-WORKSPACE",
        normalizedValue: "SYN-DEBT-WORKSPACE",
        issuer: "AEAT",
        scope: "DOCUMENT",
        documentId: "document:assessment",
        isPrimary: true,
        confidence: "EXACT",
        confirmationStatus: "PENDING",
        extractionMethod: "RULE",
        occurrenceIds: ["evidence:assessment"],
        createdAt: NOW,
      },
      {
        id: "reference:enforcement",
        ownerScope: OWNER,
        referenceType: "LIQUIDATION_KEY",
        rawValue: "SYN-DEBT-WORKSPACE",
        normalizedValue: "SYN-DEBT-WORKSPACE",
        issuer: "AEAT",
        scope: "DOCUMENT",
        documentId: "document:enforcement",
        isPrimary: true,
        confidence: "EXACT",
        confirmationStatus: "PENDING",
        extractionMethod: "RULE",
        occurrenceIds: ["evidence:enforcement"],
        createdAt: NOW,
      },
    ],
    evidence: [
      {
        id: "evidence:assessment",
        ownerScope: OWNER,
        documentId: "document:assessment",
        pageNumber: 2,
        textSnippet: "Clave de liquidación de carta de pago",
        extractionMethod: "RULE",
        confidence: "EXACT",
        assertionType: "EXPLICIT_IN_DOCUMENT",
      },
      {
        id: "evidence:enforcement",
        ownerScope: OWNER,
        documentId: "document:enforcement",
        pageNumber: 1,
        textSnippet: "Clave de liquidación",
        extractionMethod: "RULE",
        confidence: "EXACT",
        assertionType: "EXPLICIT_IN_DOCUMENT",
      },
    ],
    debts: [],
    debtObservations: [],
    cases: [],
    relations: [
      {
        id: "relation:previous-suggestion",
        ownerScope: OWNER,
        sourceDocumentId: "document:assessment",
        targetDocumentId: "document:enforcement",
        relationType: "POSSIBLY_RELATED",
        confidenceBand: "HIGH",
        score: 75,
        evidence: {
          matchingReferenceTypes: ["LIQUIDATION_KEY"],
          matchingAmountTypes: [],
          matchingDates: [],
          differences: ["Sugerencia previa sintética"],
        },
        algorithmVersion: "prior-v7",
        status: "SUGGESTED",
        createdAt: NOW,
      },
    ],
    analysisSnapshots: [],
    paymentOptions: [
      {
        id: "payment-option:assessment",
        ownerScope: OWNER,
        documentId: "document:assessment",
        title: "Total liquidado",
        eligibilityCondition: "Revisión humana",
        components: [
          {
            type: "PRINCIPAL",
            amountCents: 25_000,
            assertionType: "EXPLICIT_IN_DOCUMENT",
            evidenceIds: ["evidence:assessment"],
          },
        ],
        totalCents: 25_000,
        deadlineStatus: "UNKNOWN",
        evidenceIds: ["evidence:assessment"],
      },
      {
        id: "payment-option:enforcement",
        ownerScope: OWNER,
        documentId: "document:enforcement",
        title: "Principal reclamado",
        eligibilityCondition: "Revisión humana",
        components: [
          {
            type: "PRINCIPAL",
            amountCents: 25_000,
            assertionType: "EXPLICIT_IN_DOCUMENT",
            evidenceIds: ["evidence:enforcement"],
          },
        ],
        totalCents: 25_000,
        deadlineStatus: "UNKNOWN",
        evidenceIds: ["evidence:enforcement"],
      },
    ],
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

function attachValidatedMathematicalIntegrity(
  value: FiscalNotificationsWorkspace,
): void {
  value.analysisSnapshots = value.documents.map((document, index) => {
    const evidenceId = `math-v11:relation-${index}`;
    const termEvidenceId = `math-v11:term-${index}`;
    const resultEvidenceId = `math-v11:result-${index}`;
    document.analysisSnapshotIds = [`snapshot:math-v11:${index}`];
    return {
      id: `snapshot:math-v11:${index}`,
      ownerScope: OWNER,
      documentId: document.id,
      version: 1,
      extractorVersion: "synthetic-v11",
      rulesVersion: "11.0.0",
      structuredData: {
        schemaVersion: 1,
        documentType: document.documentType,
        paymentOptionIds: [],
        unknownFields: [],
        validationCodes: [],
        factSummary: [],
        calculatedSummary: [],
        inferenceSummary: [],
        userConfirmedSummary: [],
        mathematicalIntegrity: {
          schemaVersion: 11,
          integrityVersion:
            FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_VERSION_V11,
          catalogReleaseId: AEAT_MATHEMATICAL_INTEGRITY_RELEASE_ID_V11,
          familyId: document.documentSubtype!,
          archetypeId:
            index === 0 ? "ASSESSMENT_RESULT" : "ENFORCEMENT_SCENARIOS",
          validationMode: "ARITHMETIC_AND_LOGICAL",
          status: "VALIDATED_EXACT",
          passCount: 1,
          automaticPassLimit: 2,
          normalizedEvidence: [
            {
              evidenceId,
              sourceFieldFingerprint: `sha256:${String(index + 7).repeat(64)}`,
              semantic: "REFERENCE",
              canonicalType: "LIQUIDATION_KEY",
              originalClassification: "LIQUIDATION_KEY",
              amountCents: null,
              dateValue: null,
              countValue: null,
              sign: "UNSPECIFIED",
              currency: null,
              sourcePart: "MAIN_ADMINISTRATIVE_ACT",
              pageNumbers: [1],
              assertionType: "NORMALIZED",
              originalConfidence: 0.99,
            },
            {
              evidenceId: termEvidenceId,
              sourceFieldFingerprint: `sha256:${String(index + 3).repeat(64)}`,
              semantic: "MONEY",
              canonicalType: "PRINCIPAL",
              originalClassification: "PRINCIPAL",
              amountCents: 25_000,
              dateValue: null,
              countValue: null,
              sign: "POSITIVE",
              currency: "EUR",
              sourcePart: "MAIN_ADMINISTRATIVE_ACT",
              pageNumbers: [1],
              assertionType: "PRINTED",
              originalConfidence: 0.99,
            },
            {
              evidenceId: resultEvidenceId,
              sourceFieldFingerprint: `sha256:${String(index + 5).repeat(64)}`,
              semantic: "MONEY",
              canonicalType: "TOTAL",
              originalClassification: "TOTAL",
              amountCents: 25_000,
              dateValue: null,
              countValue: null,
              sign: "POSITIVE",
              currency: "EUR",
              sourcePart: "MAIN_ADMINISTRATIVE_ACT",
              pageNumbers: [1],
              assertionType: "PRINTED",
              originalConfidence: 0.99,
            },
          ],
          checks: [
            {
              ruleId: `v11:synthetic:relation:${index}`,
              checkKind: "ARITHMETIC",
              status: "VALIDATED_EXACT",
              operands: [
                { evidenceId: resultEvidenceId },
                { evidenceId: termEvidenceId },
              ],
              expectedCents: 25_000,
              observedCents: 25_000,
              deltaCents: 0,
              toleranceCents: 0,
              calculation: {
                kind: "LINEAR_EQUALITY",
                resultEvidenceId,
                terms: [{ evidenceId: termEvidenceId, sign: 1 }],
              },
              safeMessage: "Los importes cuadran con las cifras impresas.",
            },
          ],
          hardFailureCodes: [],
          persistenceDecision: "ALLOW_CORE",
          relationSupport: {
            existingRelationsOnly: true,
            requiresStrongIdentifier: true,
            permitsAmountOnlyRelations: false,
            validatedEvidenceIds: [resultEvidenceId, termEvidenceId],
          },
          originalExtractionMutationPolicy: "NEVER_MUTATE_OR_REPLACE",
          retainedSourceContent: "NONE",
        },
        documentFields: { title: document.titleRaw },
      },
      plainLanguageExplanation: ["Fixture sintética."],
      validationWarnings: [],
      evidenceIds: [],
      confidenceBand: "HIGH" as const,
      requiresHumanReview: true,
      createdAt: NOW,
      createdBySystem: true,
    };
  });
}

describe("workspace global reconciliation V8", () => {
  it("adds V11 only as supporting evidence to an already strong-reference relation", () => {
    const input = workspace();
    attachValidatedMathematicalIntegrity(input);

    const result = appendWorkspaceGlobalReconciliationV8({
      ownerScope: OWNER,
      workspace: input,
      reevaluatedAt: NOW,
    });

    if (result.status === "REVIEW_REQUIRED") throw new Error(result.reason);
    expect(result.status).toBe("APPLIED");
    if (result.status !== "APPLIED") return;
    expect(
      result.workspace.relations[0]?.reconciliationHistory?.[0]
        ?.evidenceKinds,
    ).toEqual(
      expect.arrayContaining([
        "EXACT_REFERENCE",
        "MATHEMATICAL_INTEGRITY_VALIDATED",
      ]),
    );
    expect(
      result.workspace.relations[0]?.reconciliationHistory?.[0]
        ?.evidenceKinds,
    ).not.toEqual(["MATHEMATICAL_INTEGRITY_VALIDATED"]);
  });

  it("does not attach V11 provenance when the validated reference type differs from the matching relation", () => {
    const input = workspace();
    attachValidatedMathematicalIntegrity(input);
    input.analysisSnapshots[1]!.structuredData.mathematicalIntegrity = {
      ...structuredClone(
        input.analysisSnapshots[1]!.structuredData.mathematicalIntegrity!,
      ),
      normalizedEvidence:
        input.analysisSnapshots[1]!.structuredData.mathematicalIntegrity!.normalizedEvidence.map(
          (evidence) => ({
            ...structuredClone(evidence),
            canonicalType: "DOCUMENT_REFERENCE",
          }),
        ),
    };

    const result = appendWorkspaceGlobalReconciliationV8({
      ownerScope: OWNER,
      workspace: input,
      reevaluatedAt: NOW,
    });

    if (result.status === "REVIEW_REQUIRED") throw new Error(result.reason);
    expect(result.status).toBe("APPLIED");
    if (result.status !== "APPLIED") return;
    expect(
      result.workspace.relations[0]?.reconciliationHistory?.[0]
        ?.evidenceKinds,
    ).not.toContain("MATHEMATICAL_INTEGRITY_VALIDATED");
  });

  it("does not reuse stale mathematical evidence after a newer review supersedes it", () => {
    const input = workspace();
    attachValidatedMathematicalIntegrity(input);
    const supersedingSnapshots = input.analysisSnapshots.map(
      (snapshot, index) => ({
        ...structuredClone(snapshot),
        id: `snapshot:math-v11:review:${index}`,
        version: 2,
        supersedesAnalysisId: snapshot.id,
        createdAt: "2026-07-17T08:01:00.000Z",
        structuredData: {
          ...structuredClone(snapshot.structuredData),
          mathematicalIntegrity: {
            ...structuredClone(snapshot.structuredData.mathematicalIntegrity!),
            status: "REVIEW_REQUIRED" as const,
            checks: [
              {
                ...structuredClone(
                  snapshot.structuredData.mathematicalIntegrity!.checks[0]!,
                ),
                status: "REVIEW_REQUIRED" as const,
                expectedCents: null,
                observedCents: null,
                deltaCents: null,
                calculation: { kind: "NONE" as const },
                safeMessage:
                  "Revisa los importes y su estructura antes de confirmar.",
              },
            ],
            persistenceDecision: "ALLOW_CORE_WITH_WARNINGS" as const,
            relationSupport: {
              existingRelationsOnly: true as const,
              requiresStrongIdentifier: true as const,
              permitsAmountOnlyRelations: false as const,
              validatedEvidenceIds: [],
            },
          },
        },
      }),
    );
    input.analysisSnapshots.push(...supersedingSnapshots);
    input.documents.forEach((document, index) => {
      document.analysisSnapshotIds.push(supersedingSnapshots[index]!.id);
    });

    const integrity = validateFiscalNotificationsWorkspaceIntegrity(
      input,
      OWNER,
    );
    if (!integrity.valid) throw new Error(JSON.stringify(integrity.issues));

    const result = appendWorkspaceGlobalReconciliationV8({
      ownerScope: OWNER,
      workspace: input,
      reevaluatedAt: NOW,
    });

    if (result.status === "REVIEW_REQUIRED") throw new Error(result.reason);
    expect(result.status).toBe("APPLIED");
    if (result.status !== "APPLIED") return;
    expect(
      result.workspace.relations[0]?.reconciliationHistory?.[0]
        ?.evidenceKinds,
    ).not.toContain("MATHEMATICAL_INTEGRITY_VALIDATED");
  });

  it("upgrades, records history, remains idempotent and survives privacy storage", () => {
    const input = workspace();
    const before = structuredClone(input);
    const integrity = validateFiscalNotificationsWorkspaceIntegrity(input, OWNER);
    if (!integrity.valid) throw new Error(JSON.stringify(integrity.issues));
    if (!parseFiscalNotificationsWorkspaceForPersistenceV1(input, OWNER)) {
      throw new Error("PERSISTENCE_PARSE_FAILED");
    }
    const first = appendWorkspaceGlobalReconciliationV8({
      ownerScope: OWNER,
      workspace: input,
      reevaluatedAt: NOW,
    });
    expect(input).toEqual(before);
    if (first.status === "REVIEW_REQUIRED") throw new Error(first.reason);
    expect(first.status).toBe("APPLIED");
    if (first.status !== "APPLIED") return;
    expect(first.workspace.revision).toBe(input.revision + 1);
    expect(first.workspace.updatedAt).toBe(NOW);
    expect(first.workspace.relations[0]).toEqual(expect.objectContaining({
      id: "relation:previous-suggestion",
      relationType: "INITIATES_ENFORCEMENT",
      status: "SYSTEM_CONFIRMED_EXACT",
      algorithmVersion: "global-reconcile-v8",
      reconciliationHistory: [expect.objectContaining({
        previousStatus: "SUGGESTED",
        globalRelationType: "RESOLUTION_ENFORCED",
        reasonCode: "SUGGESTION_UPGRADED_BY_EXACT_EVIDENCE",
      })],
    }));

    const replay = appendWorkspaceGlobalReconciliationV8({
      ownerScope: OWNER,
      workspace: first.workspace,
      reevaluatedAt: NOW,
    });
    expect(replay.status).toBe("UNCHANGED");

    const projected = projectFiscalNotificationsWorkspacePrivacyV2(
      first.workspace,
      OWNER,
    );
    expect(projected?.relations[0]).toEqual(expect.objectContaining({
      algorithmVersion: "global-reconcile-v8",
      reconciliationHistory: [expect.objectContaining({
        globalRelationType: "RESOLUTION_ENFORCED",
      })],
    }));
    const envelope = encodeFiscalNotificationsWorkspaceForStorageV2(first.workspace);
    expect(envelope).not.toBeNull();
    const restored = restoreFiscalNotificationsWorkspaceFromStorageV2(envelope, OWNER);
    expect(restored?.revision).toBe(first.workspace.revision);
    expect(restored?.relations[0]?.reconciliationHistory?.[0]).toEqual(
      expect.objectContaining({ globalRelationType: "RESOLUTION_ENFORCED" }),
    );
  });

  it("links a modified plan to observed offset rows without an internal state token", () => {
    const input = workspace();
    const plan = input.documents[0]!;
    const offset = input.documents[1]!;
    plan.documentType = "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT";
    plan.documentSubtype = "collection.deferral_modification";
    plan.titleRaw = "Modificación sintética del aplazamiento";
    plan.titleNormalized = "MODIFICACION SINTETICA DEL APLAZAMIENTO";
    offset.documentType = "AEAT_OFFSET_AGREEMENT";
    offset.documentSubtype = "collection.offset_ex_officio";
    offset.titleRaw = "Compensación sintética";
    offset.titleNormalized = "COMPENSACION SINTETICA";
    offset.debtIds = ["debt:offset-row"];
    input.references[1]!.debtId = "debt:offset-row";
    input.debts = [
      {
        id: "debt:offset-row",
        ownerScope: OWNER,
        authorityId: "authority:aeat",
        debtKey: "SYN-DEBT-WORKSPACE",
        collectionStage: "UNKNOWN",
        currentStatus: "UNKNOWN",
        referenceIds: ["reference:enforcement"],
        documentIds: [offset.id],
      },
    ];
    input.debtObservations = [
      {
        id: "debt-observation:offset-row",
        ownerScope: OWNER,
        debtId: "debt:offset-row",
        documentId: offset.id,
        authorityId: "authority:aeat",
        observedCollectionStage: "UNKNOWN",
        observedStatus: "UNKNOWN",
        referenceIds: ["reference:enforcement"],
        evidenceIds: ["evidence:enforcement"],
        observedAt: NOW,
      },
    ];
    input.relations = [];

    const result = appendWorkspaceGlobalReconciliationV8({
      ownerScope: OWNER,
      workspace: input,
      reevaluatedAt: NOW,
    });

    expect(result.status).toBe("APPLIED");
    if (result.status !== "APPLIED") return;
    expect(result.workspace.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceDocumentId: plan.id,
        targetDocumentId: offset.id,
        relationType: "COMPENSATES",
        status: "SYSTEM_CONFIRMED_EXACT",
        evidence: expect.objectContaining({
          matchingReferenceTypes: ["LIQUIDATION_KEY"],
        }),
      }),
    ]));
    expect(JSON.stringify(result.workspace)).not.toContain(
      "MODIFIED_SCHEDULE_REPLACES_ORIGINAL",
    );
  });

  it("creates a bounded deterministic global relation id for long document ids", () => {
    const input = workspace();
    input.relations = [];
    const documentIds = [
      `document:${"a".repeat(68)}`,
      `document:${"b".repeat(76)}`,
    ];
    input.documents.forEach((document, index) => {
      const previousId = document.id;
      document.id = documentIds[index]!;
      input.references.forEach((reference) => {
        if (reference.documentId === previousId) {
          reference.documentId = document.id;
        }
      });
      input.evidence.forEach((evidence) => {
        if (evidence.documentId === previousId) {
          evidence.documentId = document.id;
        }
      });
      input.paymentOptions.forEach((paymentOption) => {
        if (paymentOption.documentId === previousId) {
          paymentOption.documentId = document.id;
        }
      });
    });
    const integrity = validateFiscalNotificationsWorkspaceIntegrity(
      input,
      OWNER,
    );
    if (!integrity.valid) throw new Error(JSON.stringify(integrity.issues));

    const first = appendWorkspaceGlobalReconciliationV8({
      ownerScope: OWNER,
      workspace: input,
      reevaluatedAt: NOW,
    });

    if (first.status === "REVIEW_REQUIRED") throw new Error(first.reason);
    expect(first.status).toBe("APPLIED");
    if (first.status !== "APPLIED") return;
    expect(first.changedRelationIds).toHaveLength(1);
    expect(first.changedRelationIds[0]).toMatch(
      /^relation:global-v8:[a-f0-9]{32}$/u,
    );
    expect(first.changedRelationIds[0]!.length).toBeLessThanOrEqual(
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxIdChars,
    );

    const replay = appendWorkspaceGlobalReconciliationV8({
      ownerScope: OWNER,
      workspace: first.workspace,
      reevaluatedAt: NOW,
    });
    expect(replay.status).toBe("UNCHANGED");
    expect(replay.workspace.relations).toEqual(first.workspace.relations);
  });

  it("uses signing and notification dates and rejects reversed chronology", () => {
    const reversed = workspace();
    reversed.documents[0]!.issueDate = undefined;
    reversed.documents[0]!.signatureDate = "2024-07-01";
    reversed.documents[1]!.issueDate = undefined;
    reversed.documents[1]!.notificationDates.effectiveAt =
      "2024-06-01T00:00:00.000Z";

    const rejected = appendWorkspaceGlobalReconciliationV8({
      ownerScope: OWNER,
      workspace: reversed,
      reevaluatedAt: NOW,
    });

    expect(rejected.status).toBe("UNCHANGED");
    expect(rejected.workspace.relations[0]).toMatchObject({
      relationType: "POSSIBLY_RELATED",
      status: "SUGGESTED",
    });

    const chronological = workspace();
    chronological.documents[0]!.issueDate = undefined;
    chronological.documents[0]!.signatureDate = "2024-05-01";
    chronological.documents[1]!.issueDate = undefined;
    chronological.documents[1]!.notificationDates.effectiveAt =
      "2024-06-01T00:00:00.000Z";
    const accepted = appendWorkspaceGlobalReconciliationV8({
      ownerScope: OWNER,
      workspace: chronological,
      reevaluatedAt: NOW,
    });
    expect(accepted.status).toBe("APPLIED");
    if (accepted.status !== "APPLIED") return;
    expect(accepted.workspace.relations[0]).toMatchObject({
      relationType: "INITIATES_ENFORCEMENT",
      status: "SYSTEM_CONFIRMED_EXACT",
    });
  });

  it("fingerprints an asset reference before storage and never serializes its direct value", () => {
    const input = workspace();
    const directAssetIdentifier = "SYNTHETIC-VEHICLE-DIRECT-IDENTIFIER";
    input.documents[0]!.documentType = "GENERIC_ADMINISTRATIVE_NOTICE";
    input.documents[0]!.documentSubtype = "seizure.release";
    input.documents[1]!.documentType = "AEAT_SEIZURE_ORDER";
    input.documents[1]!.documentSubtype = "seizure.movable_asset";
    input.references = [0, 1].map((index) => ({
      id: `reference:asset:${index}`,
      ownerScope: OWNER,
      referenceType: "VEHICLE_OR_FINE_REFERENCE" as const,
      rawValue: directAssetIdentifier,
      normalizedValue: directAssetIdentifier,
      issuer: "AEAT",
      scope: "DOCUMENT" as const,
      documentId: index === 0 ? "document:assessment" : "document:enforcement",
      isPrimary: false,
      confidence: "EXACT" as const,
      confirmationStatus: "PENDING" as const,
      extractionMethod: "RULE" as const,
      occurrenceIds: [index === 0 ? "evidence:assessment" : "evidence:enforcement"],
      createdAt: NOW,
    }));
    input.documents[0]!.referenceIds = ["reference:asset:0"];
    input.documents[1]!.referenceIds = ["reference:asset:1"];
    input.relations = [];
    input.paymentOptions = [];

    expect(createSensitiveReferenceV2Sync({
      ownerScope: OWNER,
      issuerCode: "AEAT",
      referenceType: "VEHICLE_OR_FINE_REFERENCE",
      printedValue: directAssetIdentifier,
    })).not.toBeNull();

    const reconciled = appendWorkspaceGlobalReconciliationV8({
      ownerScope: OWNER,
      workspace: input,
      reevaluatedAt: NOW,
    });
    expect(reconciled.status).toBe("APPLIED");
    if (reconciled.status !== "APPLIED") return;
    expect(reconciled.workspace.relations).toEqual([
      expect.objectContaining({
        relationType: "CONTINUES",
        status: "SYSTEM_CONFIRMED_EXACT",
        algorithmVersion: "global-reconcile-v8",
        reconciliationHistory: [
          expect.objectContaining({
            globalRelationType: "RELEASED_ASSET_LATER_RESEIZED",
            resultClassification: "SYSTEM_CONFIRMED_EXACT_ASSET",
          }),
        ],
      }),
    ]);

    const projected = projectFiscalNotificationsWorkspacePrivacyV2(
      reconciled.workspace,
      OWNER,
    );
    expect(projected).not.toBeNull();
    expect(JSON.stringify(projected)).not.toContain(directAssetIdentifier);
    expect(projected?.references.map((entry) => entry.value)).toEqual([
      expect.objectContaining({
        storage: "FINGERPRINT_ONLY",
        referenceType: "VEHICLE_OR_FINE_REFERENCE",
        fingerprintSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      }),
      expect.objectContaining({
        storage: "FINGERPRINT_ONLY",
        referenceType: "VEHICLE_OR_FINE_REFERENCE",
        fingerprintSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      }),
    ]);
    expect(projected?.relations).toEqual([
      expect.objectContaining({
        algorithmVersion: "global-reconcile-v8",
        status: "SYSTEM_CONFIRMED_EXACT",
        exactReferenceIds: expect.arrayContaining([
          "reference:asset:0",
          "reference:asset:1",
        ]),
      }),
    ]);
    const envelope = encodeFiscalNotificationsWorkspaceForStorageV2(
      reconciled.workspace,
    );
    expect(JSON.stringify(envelope)).not.toContain(directAssetIdentifier);
    const restored = restoreFiscalNotificationsWorkspaceFromStorageV2(
      envelope,
      OWNER,
    );
    expect(restored?.relations[0]?.reconciliationHistory?.[0]).toEqual(
      expect.objectContaining({
        globalRelationType: "RELEASED_ASSET_LATER_RESEIZED",
      }),
    );
  });
});
