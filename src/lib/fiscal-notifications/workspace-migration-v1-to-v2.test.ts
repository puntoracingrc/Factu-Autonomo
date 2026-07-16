import { describe, expect, it } from "vitest";
import type { FiscalNotificationsWorkspace } from "./types";
import { migrateFiscalNotificationsWorkspaceV1ToV2 } from "./workspace-migration-v1-to-v2";

const OWNER = "user:00000000-0000-4000-8000-000000000061";
const OTHER_OWNER = "user:00000000-0000-4000-8000-000000000062";
const NOW = "2026-07-16T08:00:00.000Z";
const SOURCE_HASH = "b".repeat(64);

function workspace(): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "workspace:v1:migration",
    ownerScope: OWNER,
    revision: 2,
    createdAt: NOW,
    updatedAt: NOW,
    packages: [
      {
        id: "package:v1:migration",
        ownerScope: OWNER,
        fileIds: ["file:v1:migration"],
        sourceChannel: "MANUAL_UPLOAD",
        processingStatus: "NEEDS_REVIEW",
        securityScanStatus: "NOT_AVAILABLE",
        uploadedAt: NOW,
      },
    ],
    files: [
      {
        id: "file:v1:migration",
        packageId: "package:v1:migration",
        ownerScope: OWNER,
        role: "PRIMARY",
        mimeType: "application/pdf",
        fileSize: 1_024,
        pageCount: 2,
        sha256: SOURCE_HASH,
        contentFingerprint: SOURCE_HASH,
        sourceContentRetention: "NOT_RETAINED",
        uploadedAt: NOW,
      },
    ],
    documents: [
      {
        id: "document:v1:migration",
        packageId: "package:v1:migration",
        fileId: "file:v1:migration",
        ownerScope: OWNER,
        documentType: "AEAT_OFFSET_AGREEMENT",
        documentSubtype: "REQUESTED",
        titleRaw: "Private synthetic title",
        titleNormalized: "PRIVATE SYNTHETIC TITLE",
        authorityId: "authority:v1:aeat",
        issueDate: "2026-06-30",
        notificationDates: {},
        subjectParty: {
          displayName: "Synthetic Private Name",
          taxIdNormalized: "00000000T",
          matchesBusinessProfile: "MATCH",
        },
        status: "ACTIVE",
        urgency: "REVIEW",
        extractionVersion: "synthetic-v1",
        analysisStatus: "NEEDS_REVIEW",
        humanReviewStatus: "PENDING",
        authenticityStatus: "CSV_PRESENT_NOT_CHECKED",
        partIds: [],
        referenceIds: ["reference:v1:migration"],
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
        id: "authority:v1:aeat",
        ownerScope: OWNER,
        administrationType: "AEAT",
        nameRaw: "Agencia Tributaria",
        nameNormalized: "AGENCIA TRIBUTARIA",
        address: "Private synthetic street",
      },
    ],
    references: [
      {
        id: "reference:v1:migration",
        ownerScope: OWNER,
        referenceType: "CSV",
        rawValue: "CSV PRIVATE SYNTHETIC 0000",
        normalizedValue: "CSV-PRIVATE-SYNTHETIC-0000",
        issuer: "AEAT",
        scope: "DOCUMENT",
        documentId: "document:v1:migration",
        isPrimary: true,
        confidence: "EXACT",
        confirmationStatus: "PENDING",
        extractionMethod: "RULE",
        occurrenceIds: ["evidence:v1:migration"],
        createdAt: NOW,
      },
    ],
    evidence: [
      {
        id: "evidence:v1:migration",
        ownerScope: OWNER,
        documentId: "document:v1:migration",
        pageNumber: 1,
        textSnippet: "Private snippet",
        rawValue: "CSV PRIVATE SYNTHETIC 0000",
        extractionMethod: "RULE",
        confidence: "EXACT",
        assertionType: "EXPLICIT_IN_DOCUMENT",
      },
    ],
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
        id: "drive-archive:v1:migration",
        ownerScope: OWNER,
        fileId: "file:v1:migration",
        documentIds: ["document:v1:migration"],
        sourceSha256: SOURCE_HASH,
        driveFileId: "drive_file_synthetic",
        driveFolderId: "drive_folder_synthetic",
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

describe("fiscal notifications workspace V1 to V2 migration", () => {
  it("preserves safe identifiers/dates/Drive links and strips source PII/text", async () => {
    const input = workspace();
    const before = structuredClone(input);
    const migrated = await migrateFiscalNotificationsWorkspaceV1ToV2(
      input,
      OWNER,
    );

    expect(input).toEqual(before);
    expect(migrated).toMatchObject({
      schemaVersion: 2,
      workspaceId: "workspace:v1:migration",
      ownerScope: OWNER,
      revision: 2,
      accountHolder: {
        role: "ACCOUNT_HOLDER",
        identityMatchStatus: "MATCH",
      },
      documents: [
        expect.objectContaining({
          id: "document:v1:migration",
          familyId: "collection.offset_requested",
          legacyDocumentType: "AEAT_OFFSET_AGREEMENT",
          recognitionStatus: "EXACT_FAMILY",
          chronologyDate: null,
          chronologyBasis: null,
        }),
      ],
      driveArchives: [
        expect.objectContaining({
          id: "drive-archive:v1:migration",
          driveFileId: "drive_file_synthetic",
          sourceSha256: SOURCE_HASH,
        }),
      ],
    });
    expect(migrated?.references[0]).toMatchObject({
      id: "reference:v1:migration",
      referenceType: "CSV",
      value: {
        storage: "FINGERPRINT_ONLY",
        fingerprintSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
      },
    });
    const serialized = JSON.stringify(migrated);
    expect(serialized).not.toMatch(
      /Synthetic Private Name|00000000T|Private synthetic street|Private snippet|CSV PRIVATE|rawValue|textSnippet|titleRaw|titleNormalized|originalFilename/iu,
    );
  });

  it("is deterministic and output mutation cannot contaminate a later migration", async () => {
    const input = workspace();
    const first = await migrateFiscalNotificationsWorkspaceV1ToV2(input, OWNER);
    const second = await migrateFiscalNotificationsWorkspaceV1ToV2(
      input,
      OWNER,
    );
    expect(first).toEqual(second);
    expect(() => {
      (first!.documents as unknown as Array<unknown>).push({});
    }).toThrow();
    const third = await migrateFiscalNotificationsWorkspaceV1ToV2(input, OWNER);
    expect(third).toEqual(second);
  });

  it("preserves a broad legacy type without inventing one of the 87 families", async () => {
    const input = workspace();
    input.documents[0]!.documentType = "GENERIC_ADMINISTRATIVE_NOTICE";
    delete input.documents[0]!.documentSubtype;
    const migrated = await migrateFiscalNotificationsWorkspaceV1ToV2(
      input,
      OWNER,
    );
    expect(migrated?.documents[0]).toMatchObject({
      familyId: null,
      legacyDocumentType: "GENERIC_ADMINISTRATIVE_NOTICE",
      recognitionStatus: "LEGACY_TYPE_ONLY",
    });
  });

  it("fails closed for unknown keys, cross-owner data and retained originals", async () => {
    const unknown = workspace() as unknown as Record<string, unknown>;
    unknown.rawPdfText = "private";
    expect(
      await migrateFiscalNotificationsWorkspaceV1ToV2(unknown, OWNER),
    ).toBeNull();

    const crossOwner = workspace();
    crossOwner.ownerScope = OTHER_OWNER;
    expect(
      await migrateFiscalNotificationsWorkspaceV1ToV2(crossOwner, OWNER),
    ).toBeNull();

    const retained = workspace();
    retained.files[0] = {
      id: "file:v1:migration",
      packageId: "package:v1:migration",
      ownerScope: OWNER,
      role: "PRIMARY",
      mimeType: "application/pdf",
      fileSize: 1_024,
      pageCount: 2,
      sha256: SOURCE_HASH,
      contentFingerprint: SOURCE_HASH,
      sourceContentRetention: "RETAINED_IMMUTABLE",
      originalFilename: "private.pdf",
      storageReference: "private/path",
      isImmutableOriginal: true,
      uploadedAt: NOW,
    };
    expect(
      await migrateFiscalNotificationsWorkspaceV1ToV2(retained, OWNER),
    ).toBeNull();
  });
});
