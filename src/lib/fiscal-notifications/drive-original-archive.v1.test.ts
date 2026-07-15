import { describe, expect, it } from "vitest";
import {
  appendFiscalNotificationDriveArchiveV1,
  fiscalNotificationDriveFileHrefV1,
  inspectFiscalNotificationDriveArchiveCandidateV1,
} from "./drive-original-archive.v1";
import type { FiscalNotificationsWorkspace } from "./types";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";

const OWNER = "user:00000000-0000-4000-8000-000000000091";
const CREATED_AT = "2026-07-15T08:00:00.000Z";
const ARCHIVED_AT = "2026-07-15T09:00:00.000Z";
const HASH = "d".repeat(64);

describe("fiscal notification Drive archive record v1", () => {
  it("finds the registered PDF and uses only an exact document date", () => {
    expect(
      inspectFiscalNotificationDriveArchiveCandidateV1(workspace(), OWNER, HASH),
    ).toEqual({
      status: "READY_TO_ARCHIVE",
      candidate: {
        fileId: "file:drive-archive",
        documentIds: ["document:drive-archive"],
        sourceSha256: HASH,
        documentDate: "2026-06-30",
        documentTitle: "Diligencia sintética",
      },
    });

    const pending = workspace();
    pending.documents[0]!.issueDate = undefined;
    pending.analysisSnapshots[0]!.structuredData.documentFields.issueDate =
      undefined;
    expect(
      inspectFiscalNotificationDriveArchiveCandidateV1(pending, OWNER, HASH),
    ).toMatchObject({
      status: "READY_TO_ARCHIVE",
      candidate: { documentDate: null },
    });
  });

  it("appends only verified identifiers/hash/status and an audit event", () => {
    const input = workspace();
    const before = structuredClone(input);
    const result = appendFiscalNotificationDriveArchiveV1({
      workspace: input,
      ownerScope: OWNER,
      receipt: receipt(),
      archivedAt: ARCHIVED_AT,
    });

    expect(input).toEqual(before);
    expect(result.status).toBe("APPLIED");
    if (result.status !== "APPLIED") return;
    expect(result.archive).toEqual({
      id: `drive-archive:${HASH}`,
      ownerScope: OWNER,
      fileId: "file:drive-archive",
      documentIds: ["document:drive-archive"],
      sourceSha256: HASH,
      driveFileId: "drive_file_verified",
      driveFolderId: "drive_folder_06",
      documentDate: "2026-06-30",
      archiveStatus: "ARCHIVED_VERIFIED",
      reviewStatus: "USER_CONFIRMED",
      verificationMethod: "SHA256_READBACK_MATCH",
      recordVersion: 1,
      workspaceRevision: 2,
      archivedAt: ARCHIVED_AT,
    });
    expect(result.workspace.revision).toBe(2);
    expect(result.workspace.auditEvents.at(-1)).toMatchObject({
      eventType: "ORIGINAL_ARCHIVED_IN_USER_GOOGLE_DRIVE",
      actorScope: "AUTHENTICATED_USER",
    });
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(result.workspace, OWNER)
        .valid,
    ).toBe(true);
    expect(JSON.stringify(result.workspace.driveArchives)).not.toMatch(
      /filename|text|ocr|pdf|webview|token/i,
    );

    result.archive.documentIds.push("mutated-output");
    const second = appendFiscalNotificationDriveArchiveV1({
      workspace: input,
      ownerScope: OWNER,
      receipt: receipt(),
      archivedAt: ARCHIVED_AT,
    });
    expect(second.status).toBe("APPLIED");
    if (second.status === "APPLIED") {
      expect(second.archive.documentIds).toEqual(["document:drive-archive"]);
    }
  });

  it("is idempotent for the same verified Drive file and blocks a conflicting one", () => {
    const first = appendFiscalNotificationDriveArchiveV1({
      workspace: workspace(),
      ownerScope: OWNER,
      receipt: receipt(),
      archivedAt: ARCHIVED_AT,
    });
    expect(first.status).toBe("APPLIED");
    if (first.status !== "APPLIED") return;

    expect(
      appendFiscalNotificationDriveArchiveV1({
        workspace: first.workspace,
        ownerScope: OWNER,
        receipt: receipt(),
        archivedAt: "2026-07-15T10:00:00.000Z",
      }).status,
    ).toBe("EXISTING");
    expect(
      appendFiscalNotificationDriveArchiveV1({
        workspace: first.workspace,
        ownerScope: OWNER,
        receipt: { ...receipt(), driveFileId: "another_drive_file" },
        archivedAt: "2026-07-15T10:00:00.000Z",
      }),
    ).toEqual({ status: "BLOCKED" });
  });

  it("blocks foreign owners, wrong dates and non-verified receipts", () => {
    expect(
      inspectFiscalNotificationDriveArchiveCandidateV1(
        workspace(),
        "user:00000000-0000-4000-8000-000000000099",
        HASH,
      ),
    ).toEqual({ status: "BLOCKED" });
    expect(
      appendFiscalNotificationDriveArchiveV1({
        workspace: workspace(),
        ownerScope: OWNER,
        receipt: { ...receipt(), documentDate: null },
        archivedAt: ARCHIVED_AT,
      }),
    ).toEqual({ status: "BLOCKED" });
    expect(
      appendFiscalNotificationDriveArchiveV1({
        workspace: workspace(),
        ownerScope: OWNER,
        receipt: {
          ...receipt(),
          verification: "UNVERIFIED" as never,
        },
        archivedAt: ARCHIVED_AT,
      }),
    ).toEqual({ status: "BLOCKED" });
  });

  it("rechaza metadata desconocida, PII cruda y referencias de archivo incoherentes", () => {
    const applied = appendFiscalNotificationDriveArchiveV1({
      workspace: workspace(),
      ownerScope: OWNER,
      receipt: receipt(),
      archivedAt: ARCHIVED_AT,
    });
    expect(applied.status).toBe("APPLIED");
    if (applied.status !== "APPLIED") return;

    for (const patch of [
      { originalFilename: "NIF-SINTETICO.pdf" },
      { rawText: "contenido tributario sintético" },
      { nif: "00000000T" },
      { arbitrary: true },
      { sourceSha256: "e".repeat(64) },
      { documentIds: ["document:missing"] },
      { ownerScope: "user:foreign" },
    ]) {
      const candidate = structuredClone(applied.workspace) as unknown as {
        driveArchives: Record<string, unknown>[];
      };
      Object.assign(candidate.driveArchives[0]!, patch);
      const validation = validateFiscalNotificationsWorkspaceIntegrity(
        candidate,
        OWNER,
      );
      expect(validation.valid).toBe(false);
      expect(JSON.stringify(validation)).not.toMatch(
        /NIF-SINTETICO|contenido tributario|00000000T/u,
      );
    }
  });

  it("builds only a validated Google Drive file link", () => {
    expect(fiscalNotificationDriveFileHrefV1("drive_file_verified")).toBe(
      "https://drive.google.com/file/d/drive_file_verified/view",
    );
    expect(fiscalNotificationDriveFileHrefV1("../../token")).toBeNull();
  });
});

function receipt() {
  return {
    sourceSha256: HASH,
    driveFileId: "drive_file_verified",
    driveFolderId: "drive_folder_06",
    documentDate: "2026-06-30",
    verification: "SHA256_READBACK_MATCH" as const,
  };
}

function workspace(): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "fiscal-notifications-workspace-v1",
    ownerScope: OWNER,
    revision: 1,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    packages: [
      {
        id: "package:drive-archive",
        ownerScope: OWNER,
        fileIds: ["file:drive-archive"],
        sourceChannel: "MANUAL_UPLOAD",
        processingStatus: "NEEDS_REVIEW",
        securityScanStatus: "NOT_AVAILABLE",
        uploadedAt: CREATED_AT,
      },
    ],
    files: [
      {
        id: "file:drive-archive",
        packageId: "package:drive-archive",
        ownerScope: OWNER,
        role: "PRIMARY",
        mimeType: "application/pdf",
        fileSize: 1_024,
        pageCount: 2,
        sha256: HASH,
        contentFingerprint: HASH,
        sourceContentRetention: "NOT_RETAINED",
        uploadedAt: CREATED_AT,
      },
    ],
    documents: [
      {
        id: "document:drive-archive",
        packageId: "package:drive-archive",
        fileId: "file:drive-archive",
        ownerScope: OWNER,
        documentType: "AEAT_SEIZURE_ORDER",
        titleRaw: "Diligencia sintética",
        titleNormalized: "DILIGENCIA SINTETICA",
        authorityId: "authority:aeat",
        issueDate: "2026-06-30",
        notificationDates: {},
        status: "UNKNOWN",
        urgency: "REVIEW",
        extractionVersion: "1.0.0",
        analysisStatus: "NEEDS_REVIEW",
        humanReviewStatus: "PENDING",
        authenticityStatus: "NOT_CHECKED",
        partIds: [],
        referenceIds: [],
        debtIds: [],
        caseIds: [],
        analysisSnapshotIds: ["snapshot:drive-archive"],
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
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
      },
    ],
    references: [],
    evidence: [],
    debts: [],
    debtObservations: [],
    cases: [],
    relations: [],
    analysisSnapshots: [
      {
        id: "snapshot:drive-archive",
        ownerScope: OWNER,
        documentId: "document:drive-archive",
        version: 1,
        extractorVersion: "1.0.0",
        rulesVersion: "1.0.0",
        structuredData: {
          schemaVersion: 1,
          documentType: "AEAT_SEIZURE_ORDER",
          administrativeDomain: {
            schemaVersion: 1,
            ownerScope: OWNER,
            documentId: "document:drive-archive",
            extractorId: "synthetic-drive-archive",
            extractorVersion: "1.0.0",
            createdAt: CREATED_AT,
            familyId: "AEAT_REAL_ESTATE_SEIZURE_CANDIDATE",
            status: "REVIEW_REQUIRED",
            roleAssertions: [],
            moneyFacts: [],
            missingFieldIds: [],
            alternativeFamilyIds: [],
            validationIssues: [],
            materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
            requiresHumanReview: true,
          },
          paymentOptionIds: [],
          unknownFields: [],
          validationCodes: ["AUTHENTICITY_NOT_CHECKED"],
          factSummary: [],
          calculatedSummary: [],
          inferenceSummary: [],
          userConfirmedSummary: [],
          documentFields: {
            title: "Diligencia sintética",
            issueDate: "2026-06-30",
          },
        },
        plainLanguageExplanation: [],
        validationWarnings: [],
        evidenceIds: [],
        confidenceBand: "HIGH",
        requiresHumanReview: true,
        createdAt: CREATED_AT,
        createdBySystem: true,
      },
    ],
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
