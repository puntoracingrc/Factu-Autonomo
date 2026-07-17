import { describe, expect, it } from "vitest";
import type { FiscalNotificationsWorkspace } from "./types";
import { appendWorkspaceGlobalReconciliationV8 } from "./workspace-global-reconciliation.v8";
import { projectFiscalNotificationsWorkspacePrivacyV2 } from "./workspace-privacy-projection.v2";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";
import { createSensitiveReferenceV2Sync } from "./sensitive-reference.v2";
import {
  encodeFiscalNotificationsWorkspaceForStorageV2,
  restoreFiscalNotificationsWorkspaceFromStorageV2,
} from "./workspace-storage-envelope.v2";

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

describe("workspace global reconciliation V8", () => {
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
