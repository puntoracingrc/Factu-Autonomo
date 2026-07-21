import { describe, expect, it } from "vitest";
import { deleteAllFiscalNotificationDocumentsV1 } from "./delete-all-documents.v1";
import type { FiscalNotificationsWorkspace } from "./types";
import { appendStructuredReviewRelationSuggestionsV1 } from "./structured-review-relation-suggestions.v1";
import {
  encodeFiscalNotificationsWorkspaceForStorageV2,
  registerFiscalNotificationDocumentReductionTransitionV2,
} from "./workspace-storage-envelope.v2";

const OWNER = "user:00000000-0000-4000-8000-000000000201";
const OTHER_OWNER = "user:00000000-0000-4000-8000-000000000202";
const CREATED_AT = "2026-07-21T00:00:00.000Z";
const DELETED_AT = "2026-07-21T00:05:00.000Z";

function workspace(): FiscalNotificationsWorkspace {
  const hashes = ["a".repeat(64), "b".repeat(64)];
  return {
    schemaVersion: 1,
    workspaceId: "fiscal-notifications-workspace-v1",
    ownerScope: OWNER,
    revision: 7,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    packages: [0, 1].map((index) => ({
      id: `package:${index}`,
      ownerScope: OWNER,
      fileIds: [`file:${index}`],
      sourceChannel: "MANUAL_UPLOAD",
      processingStatus: "NEEDS_REVIEW",
      securityScanStatus: "NOT_AVAILABLE",
      uploadedAt: CREATED_AT,
    })),
    files: [0, 1].map((index) => ({
      id: `file:${index}`,
      packageId: `package:${index}`,
      ownerScope: OWNER,
      role: "PRIMARY",
      mimeType: "application/pdf",
      fileSize: 2_048,
      pageCount: 2,
      sha256: hashes[index]!,
      contentFingerprint: hashes[index]!,
      sourceContentRetention: "NOT_RETAINED",
      uploadedAt: CREATED_AT,
    })),
    documents: [0, 1].map((index) => ({
      id: `document:${index}`,
      packageId: `package:${index}`,
      fileId: `file:${index}`,
      ownerScope: OWNER,
      documentType: "AEAT_ENFORCEMENT_ORDER",
      titleRaw: `Providencia sintética ${index + 1}`,
      titleNormalized: `PROVIDENCIA SINTETICA ${index + 1}`,
      authorityId: "authority:aeat",
      notificationDates: {},
      status: "UNKNOWN",
      urgency: "REVIEW",
      extractionVersion: "synthetic-v1",
      analysisStatus: "NEEDS_REVIEW",
      humanReviewStatus: "PENDING",
      authenticityStatus: "NOT_CHECKED",
      partIds: [],
      referenceIds: [`reference:${index}`],
      debtIds: [],
      caseIds: [],
      analysisSnapshotIds: [],
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
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
      referenceType: "LIQUIDATION_KEY",
      rawValue: "EXP-SYNTH-201",
      normalizedValue: "EXP-SYNTH-201",
      issuer: "AEAT",
      scope: "DOCUMENT",
      documentId: `document:${index}`,
      isPrimary: true,
      confidence: "EXACT",
      confirmationStatus: "PENDING",
      extractionMethod: "RULE",
      occurrenceIds: [`evidence:${index}`],
      createdAt: CREATED_AT,
    })),
    evidence: [0, 1].map((index) => ({
      id: `evidence:${index}`,
      ownerScope: OWNER,
      documentId: `document:${index}`,
      pageNumber: 1,
      textSnippet: "Número de expediente",
      rawValue: "EXP-SYNTH-201",
      extractionMethod: "RULE",
      confidence: "EXACT",
      assertionType: "EXPLICIT_IN_DOCUMENT",
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
        driveFileId: "drive_file_preserved_201",
        driveFolderId: "drive_folder_201",
        documentDate: "2026-07-20",
        archiveStatus: "ARCHIVED_VERIFIED",
        reviewStatus: "USER_CONFIRMED",
        verificationMethod: "SHA256_READBACK_MATCH",
        recordVersion: 1,
        workspaceRevision: 7,
        archivedAt: CREATED_AT,
      },
    ],
  };
}

function relatedWorkspace(): FiscalNotificationsWorkspace {
  const result = appendStructuredReviewRelationSuggestionsV1({
    ownerScope: OWNER,
    workspace: workspace(),
    createdAt: CREATED_AT,
  });
  expect(result.status).toBe("APPLIED");
  return result.workspace;
}

describe("delete all fiscal notification documents v1", () => {
  it("vacía las fichas y relaciones en una sola revisión preservando Drive", () => {
    const input = relatedWorkspace();
    const before = structuredClone(input);
    const result = deleteAllFiscalNotificationDocumentsV1({
      workspace: input,
      ownerScope: OWNER,
      deletedAt: DELETED_AT,
    });

    expect(result).toMatchObject({
      status: "APPLIED",
      removedDocumentIds: ["document:0", "document:1"],
      removedRelationCount: 1,
      driveFileIdsPreserved: ["drive_file_preserved_201"],
      drivePolicy: "PRESERVE_USER_DRIVE_ORIGINALS",
    });
    if (result.status !== "APPLIED") return;
    expect(result.workspace).toMatchObject({
      ownerScope: OWNER,
      revision: 8,
      updatedAt: DELETED_AT,
      documents: [],
      relations: [],
      references: [],
      evidence: [],
      files: [],
      packages: [],
      driveArchives: [],
    });
    expect(input).toEqual(before);
  });

  it("elimina también dependencias internas del módulo en la misma operación", () => {
    const input = workspace();
    input.obligations.push({
      id: "obligation:protected",
      ownerScope: OWNER,
      sourceDocumentId: "document:1",
      type: "REVIEW",
      title: "Revisión sintética",
      description: "Dependencia sintética protegida.",
      components: [],
      dueDateStatus: "UNKNOWN",
      status: "PENDING_CONFIRMATION",
      evidenceIds: [],
      userConfirmed: false,
    });
    const before = structuredClone(input);

    const result = deleteAllFiscalNotificationDocumentsV1({
      workspace: input,
      ownerScope: OWNER,
      deletedAt: DELETED_AT,
    });

    expect(result.status).toBe("APPLIED");
    if (result.status !== "APPLIED") return;
    expect(result.workspace.documents).toEqual([]);
    expect(result.workspace.obligations).toEqual([]);
    expect(input).toEqual(before);
  });

  it("registra y codifica la reducción completa de 2 documentos relacionados", () => {
    const input = relatedWorkspace();
    const base = encodeFiscalNotificationsWorkspaceForStorageV2(input);
    expect(base).not.toBeNull();
    const result = deleteAllFiscalNotificationDocumentsV1({
      workspace: input,
      ownerScope: OWNER,
      deletedAt: DELETED_AT,
    });
    expect(result.status).toBe("APPLIED");
    if (result.status !== "APPLIED" || !base) return;

    const marked = registerFiscalNotificationDocumentReductionTransitionV2(
      result.workspace,
      input,
      OWNER,
      DELETED_AT,
    );
    expect(marked).not.toBeNull();
    const encoded = encodeFiscalNotificationsWorkspaceForStorageV2(
      marked,
      base,
    );

    expect(encoded?.workspace).toMatchObject({
      ownerScope: OWNER,
      revision: 8,
      documents: [],
      relations: [],
    });
    expect(encoded?.sources).toEqual([]);
    expect(encoded?.transition).toMatchObject({
      kind: "USER_CONFIRMED_DOCUMENT_REDUCTION_V1",
      baseRevision: 7,
      removedDocumentIds: ["document:0", "document:1"],
    });
  });

  it("rechaza otro owner, una fecha inválida y el borrado repetido vacío", () => {
    const input = workspace();
    expect(
      deleteAllFiscalNotificationDocumentsV1({
        workspace: input,
        ownerScope: OTHER_OWNER,
        deletedAt: DELETED_AT,
      }),
    ).toEqual({ status: "BLOCKED", reason: "INVALID_WORKSPACE" });
    expect(
      deleteAllFiscalNotificationDocumentsV1({
        workspace: input,
        ownerScope: OWNER,
        deletedAt: "fecha-inválida",
      }),
    ).toEqual({ status: "BLOCKED", reason: "INVALID_WORKSPACE" });

    const deleted = deleteAllFiscalNotificationDocumentsV1({
      workspace: input,
      ownerScope: OWNER,
      deletedAt: DELETED_AT,
    });
    expect(deleted.status).toBe("APPLIED");
    if (deleted.status !== "APPLIED") return;
    expect(
      deleteAllFiscalNotificationDocumentsV1({
        workspace: deleted.workspace,
        ownerScope: OWNER,
        deletedAt: "2026-07-21T00:06:00.000Z",
      }),
    ).toEqual({ status: "NOT_FOUND" });
  });
});
