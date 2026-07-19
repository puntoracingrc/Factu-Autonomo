import { describe, expect, it } from "vitest";
import {
  analyzeFiscalNotificationDocumentDeletionV1,
  deleteFiscalNotificationDocumentV1,
} from "./document-deletion.v1";
import { appendStructuredReviewRelationSuggestionsV1 } from "./structured-review-relation-suggestions.v1";
import type { FiscalNotificationsWorkspace } from "./types";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";

const OWNER = "user:00000000-0000-4000-8000-000000000151";
const OTHER_OWNER = "user:00000000-0000-4000-8000-000000000152";
const NOW = "2026-07-15T22:00:00.000Z";
const DELETED_AT = "2026-07-15T22:01:00.000Z";

function workspace(): FiscalNotificationsWorkspace {
  const hashes = ["a".repeat(64), "b".repeat(64)];
  return {
    schemaVersion: 1,
    workspaceId: "fiscal-notifications-workspace-v1",
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
      fileSize: 1_000 + index,
      pageCount: 1,
      sha256: hashes[index]!,
      contentFingerprint: hashes[index]!,
      sourceContentRetention: "NOT_RETAINED" as const,
      uploadedAt: NOW,
    })),
    documents: [0, 1].map((index) => ({
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
    references: [0, 1].map((index) => ({
      id: `reference:${index}`,
      ownerScope: OWNER,
      referenceType: "LIQUIDATION_KEY" as const,
      rawValue: "LQ-SYNTH-151",
      normalizedValue: "LQ-SYNTH-151",
      issuer: "AEAT",
      scope: "DOCUMENT" as const,
      documentId: `document:${index}`,
      isPrimary: true,
      confidence: "EXACT" as const,
      confirmationStatus: "PENDING" as const,
      extractionMethod: "RULE" as const,
      occurrenceIds: [`evidence:${index}`],
      createdAt: NOW,
    })),
    evidence: [0, 1].map((index) => ({
      id: `evidence:${index}`,
      ownerScope: OWNER,
      documentId: `document:${index}`,
      pageNumber: 1,
      textSnippet: "Clave de liquidación",
      rawValue: "LQ-SYNTH-151",
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
    driveArchives: [
      {
        id: `drive-archive:${hashes[0]}`,
        ownerScope: OWNER,
        fileId: "file:0",
        documentIds: ["document:0"],
        sourceSha256: hashes[0]!,
        driveFileId: "drive_file_preserved_151",
        driveFolderId: "drive_folder_151",
        documentDate: "2026-06-30",
        archiveStatus: "ARCHIVED_VERIFIED",
        reviewStatus: "USER_CONFIRMED",
        verificationMethod: "SHA256_READBACK_MATCH",
        recordVersion: 1,
        workspaceRevision: 2,
        archivedAt: NOW,
      },
    ],
  };
}

function relatedWorkspace(): FiscalNotificationsWorkspace {
  const result = appendStructuredReviewRelationSuggestionsV1({
    ownerScope: OWNER,
    workspace: workspace(),
    createdAt: NOW,
  });
  expect(result.status).toBe("APPLIED");
  return result.workspace;
}

function threeDocumentWorkspaceWithUnrelatedRelation(): FiscalNotificationsWorkspace {
  const result = structuredClone(workspace());
  result.packages.push({
    id: "package:2",
    ownerScope: OWNER,
    fileIds: ["file:2"],
    sourceChannel: "MANUAL_UPLOAD",
    processingStatus: "NEEDS_REVIEW",
    securityScanStatus: "NOT_AVAILABLE",
    uploadedAt: NOW,
  });
  result.files.push({
    id: "file:2",
    packageId: "package:2",
    ownerScope: OWNER,
    role: "PRIMARY",
    mimeType: "application/pdf",
    fileSize: 1_002,
    pageCount: 1,
    sha256: "c".repeat(64),
    contentFingerprint: "c".repeat(64),
    sourceContentRetention: "NOT_RETAINED",
    uploadedAt: NOW,
  });
  result.documents.push({
    ...result.documents[1]!,
    id: "document:2",
    packageId: "package:2",
    fileId: "file:2",
    titleRaw: "Providencia sintética 3",
    titleNormalized: "PROVIDENCIA SINTETICA 3",
    referenceIds: ["reference:2"],
  });
  result.references.push({
    ...result.references[1]!,
    id: "reference:2",
    documentId: "document:2",
    occurrenceIds: ["evidence:2"],
  });
  result.evidence.push({
    ...result.evidence[1]!,
    id: "evidence:2",
    documentId: "document:2",
  });
  result.relations.push({
    id: "relation:survivors",
    ownerScope: OWNER,
    sourceDocumentId: "document:1",
    targetDocumentId: "document:2",
    relationType: "POSSIBLY_RELATED",
    confidenceBand: "MEDIUM",
    score: 50,
    evidence: {
      matchingReferenceTypes: ["LIQUIDATION_KEY"],
      matchingAmountTypes: [],
      matchingDates: [],
      differences: [],
    },
    algorithmVersion: "synthetic-delete-regression/v1",
    status: "SUGGESTED",
    createdAt: NOW,
  });
  return result;
}

describe("fiscal notification document deletion v1", () => {
  it("elimina la ficha y su vínculo local, preservando explícitamente el original de Drive", () => {
    const input = relatedWorkspace();
    const before = structuredClone(input);

    expect(
      analyzeFiscalNotificationDocumentDeletionV1({
        workspace: input,
        ownerScope: OWNER,
        documentId: "document:0",
      }),
    ).toEqual({
      status: "READY",
      documentId: "document:0",
      relationCount: 1,
      originalArchivedInDrive: true,
      driveFileIdsPreserved: ["drive_file_preserved_151"],
    });

    const result = deleteFiscalNotificationDocumentV1({
      workspace: input,
      ownerScope: OWNER,
      documentId: "document:0",
      deletedAt: DELETED_AT,
    });

    expect(input).toEqual(before);
    expect(result.status).toBe("APPLIED");
    if (result.status !== "APPLIED") return;
    expect(result.drivePolicy).toBe("PRESERVE_USER_DRIVE_ORIGINAL");
    expect(result.driveFileIdsPreserved).toEqual(["drive_file_preserved_151"]);
    expect(result.workspace.documents.map((item) => item.id)).toEqual([
      "document:1",
    ]);
    expect(result.workspace.files.map((item) => item.id)).toEqual(["file:1"]);
    expect(result.workspace.packages.map((item) => item.id)).toEqual([
      "package:1",
    ]);
    expect(result.workspace.references.map((item) => item.id)).toEqual([
      "reference:1",
    ]);
    expect(result.workspace.evidence.map((item) => item.id)).toEqual([
      "evidence:1",
    ]);
    expect(result.workspace.relations).toEqual([]);
    expect(result.workspace.driveArchives).toEqual([]);
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(result.workspace, OWNER),
    ).toEqual({ valid: true, issues: [] });
  });

  it("bloquea owner ajeno, fecha inválida y dependencias de deuda sin mutar", () => {
    const crossOwner = analyzeFiscalNotificationDocumentDeletionV1({
      workspace: workspace(),
      ownerScope: OTHER_OWNER,
      documentId: "document:0",
    });
    expect(crossOwner).toEqual({
      status: "BLOCKED",
      reason: "INVALID_WORKSPACE",
    });

    expect(
      deleteFiscalNotificationDocumentV1({
        workspace: workspace(),
        ownerScope: OWNER,
        documentId: "document:0",
        deletedAt: "15/07/2026",
      }),
    ).toEqual({ status: "BLOCKED", reason: "RESULT_INVALID" });

    const dependent = workspace();
    dependent.documents[0]!.debtIds = ["debt:0"];
    dependent.debts = [
      {
        id: "debt:0",
        ownerScope: OWNER,
        authorityId: "authority:aeat",
        collectionStage: "ENFORCEMENT",
        currentStatus: "PENDING_CONFIRMATION",
        referenceIds: [],
        documentIds: ["document:0"],
      },
    ];
    const before = structuredClone(dependent);
    expect(
      deleteFiscalNotificationDocumentV1({
        workspace: dependent,
        ownerScope: OWNER,
        documentId: "document:0",
        deletedAt: DELETED_AT,
      }),
    ).toEqual({ status: "BLOCKED", reason: "OPERATIONAL_DEPENDENCIES" });
    expect(dependent).toEqual(before);
  });

  it("no confunde una ficha ausente con una eliminación correcta", () => {
    expect(
      deleteFiscalNotificationDocumentV1({
        workspace: workspace(),
        ownerScope: OWNER,
        documentId: "document:missing",
        deletedAt: DELETED_AT,
      }),
    ).toEqual({ status: "NOT_FOUND" });
  });

  it("borra una de varias fichas y conserva documentos y relaciones ajenas", () => {
    const input = threeDocumentWorkspaceWithUnrelatedRelation();

    const result = deleteFiscalNotificationDocumentV1({
      workspace: input,
      ownerScope: OWNER,
      documentId: "document:0",
      deletedAt: DELETED_AT,
    });

    expect(result.status).toBe("APPLIED");
    if (result.status !== "APPLIED") return;
    expect(result.workspace.documents.map((item) => item.id)).toEqual([
      "document:1",
      "document:2",
    ]);
    expect(result.workspace.references.map((item) => item.documentId)).toEqual([
      "document:1",
      "document:2",
    ]);
    expect(result.workspace.evidence.map((item) => item.documentId)).toEqual([
      "document:1",
      "document:2",
    ]);
    expect(result.workspace.relations).toEqual([
      expect.objectContaining({
        id: "relation:survivors",
        sourceDocumentId: "document:1",
        targetDocumentId: "document:2",
      }),
    ]);
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(result.workspace, OWNER),
    ).toEqual({ valid: true, issues: [] });
  });

  it("trata un segundo borrado de la misma ficha como no encontrado y conserva N-1", () => {
    const first = deleteFiscalNotificationDocumentV1({
      workspace: threeDocumentWorkspaceWithUnrelatedRelation(),
      ownerScope: OWNER,
      documentId: "document:0",
      deletedAt: DELETED_AT,
    });
    expect(first.status).toBe("APPLIED");
    if (first.status !== "APPLIED") return;
    const beforeSecond = structuredClone(first.workspace);

    expect(
      deleteFiscalNotificationDocumentV1({
        workspace: first.workspace,
        ownerScope: OWNER,
        documentId: "document:0",
        deletedAt: "2026-07-15T22:02:00.000Z",
      }),
    ).toEqual({ status: "NOT_FOUND" });
    expect(first.workspace).toEqual(beforeSecond);
    expect(first.workspace.ownerScope).toBe(OWNER);
    expect(first.workspace.documents.map((item) => item.id)).toEqual([
      "document:1",
      "document:2",
    ]);
  });
});
