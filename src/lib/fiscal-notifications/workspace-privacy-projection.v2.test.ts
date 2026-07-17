import { describe, expect, it } from "vitest";
import type { FiscalNotificationsWorkspace } from "./types";
import { projectFiscalNotificationsWorkspacePrivacyV2 } from "./workspace-privacy-projection.v2";

const OWNER = "user:00000000-0000-4000-8000-000000000061";
const NOW = "2026-07-16T08:00:00.000Z";

function workspace(): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "workspace:v1:privacy-projection",
    ownerScope: OWNER,
    revision: 3,
    createdAt: NOW,
    updatedAt: NOW,
    packages: [],
    files: [],
    documents: [0, 1].map((index) => ({
      id: `document:v1:${index}`,
      packageId: `package:v1:${index}`,
      fileId: `file:v1:${index}`,
      ownerScope: OWNER,
      documentType: "AEAT_OFFSET_AGREEMENT" as const,
      documentSubtype: index === 0 ? "REQUESTED" : "EX_OFFICIO",
      titleRaw: `Private synthetic title ${index}`,
      titleNormalized: `PRIVATE SYNTHETIC TITLE ${index}`,
      authorityId: "authority:aeat",
      issueDate: index === 0 ? "2026-06-30" : undefined,
      signatureDate: index === 1 ? "2026-07-01" : undefined,
      notificationDates: {},
      subjectParty: {
        displayName: "Synthetic Private Name",
        taxIdNormalized: "00000000T",
        matchesBusinessProfile: "MATCH" as const,
      },
      status: "ACTIVE" as const,
      urgency: "REVIEW" as const,
      extractionVersion: "synthetic-v1",
      analysisStatus: "NEEDS_REVIEW" as const,
      humanReviewStatus: "PENDING" as const,
      authenticityStatus: "CSV_PRESENT_NOT_CHECKED" as const,
      partIds: [],
      referenceIds: [`reference:v1:${index}`],
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
        nameRaw: "Agencia Tributaria",
        nameNormalized: "AGENCIA TRIBUTARIA",
        address: "Private synthetic street",
        phone: "000000000",
      },
    ],
    references: [0, 1].map((index) => ({
      id: `reference:v1:${index}`,
      ownerScope: OWNER,
      referenceType: "LIQUIDATION_KEY" as const,
      rawValue: "A-0000-SYNTHETIC",
      normalizedValue: "A0000SYNTHETIC",
      issuer: "AEAT",
      scope: "DOCUMENT" as const,
      documentId: `document:v1:${index}`,
      isPrimary: true,
      confidence: "EXACT" as const,
      confirmationStatus: "PENDING" as const,
      extractionMethod: "RULE" as const,
      occurrenceIds: [`evidence:v1:${index}`],
      createdAt: NOW,
    })),
    evidence: [0, 1].map((index) => ({
      id: `evidence:v1:${index}`,
      ownerScope: OWNER,
      documentId: `document:v1:${index}`,
      pageNumber: 1,
      textSnippet: "Private printed reference",
      rawValue: "A-0000-SYNTHETIC",
      extractionMethod: "RULE" as const,
      confidence: "EXACT" as const,
      assertionType: "EXPLICIT_IN_DOCUMENT" as const,
      confirmedBy: "private-user-id",
    })),
    debts: [
      {
        id: "debt:v1:0",
        ownerScope: OWNER,
        authorityId: "authority:aeat",
        debtorDisplayName: "Synthetic Private Name",
        originalPrincipalCents: 163_295,
        collectionStage: "VOLUNTARY",
        currentStatus: "PENDING_CONFIRMATION",
        referenceIds: ["reference:v1:0"],
        documentIds: ["document:v1:0"],
      },
    ],
    debtObservations: [],
    cases: [],
    relations: [
      {
        id: "relation:v1:0",
        ownerScope: OWNER,
        sourceDocumentId: "document:v1:1",
        targetDocumentId: "document:v1:0",
        relationType: "RESOLVES",
        confidenceBand: "EXACT",
        score: 100,
        evidence: {
          matchingReferenceTypes: ["LIQUIDATION_KEY"],
          matchingAmountTypes: [],
          matchingDates: ["2026-06-30"],
          citedText: "Private copied sentence",
          differences: ["Private note"],
        },
        algorithmVersion: "private/v1",
        status: "SYSTEM_CONFIRMED_EXACT",
        createdAt: NOW,
      },
    ],
    analysisSnapshots: [],
    paymentOptions: [],
    paymentPlans: [
      {
        id: "plan:v1:0",
        ownerScope: OWNER,
        sourceDocumentId: "document:v1:0",
        authorityId: "authority:aeat",
        grantStatus: "CONFIRMED",
        bankAccountMasked: "ES00 **** **** 0000",
        grantedPrincipalCents: 163_295,
        status: "ACTIVE",
        startDate: "2026-07-05",
        endDate: "2026-10-05",
        debtIds: ["debt:v1:0"],
        installmentIds: ["installment:v1:1"],
      },
    ],
    installments: [
      {
        id: "installment:v1:1",
        ownerScope: OWNER,
        paymentPlanId: "plan:v1:0",
        sequence: 1,
        dueDate: "2026-08-05",
        components: [],
        status: "PENDING",
        evidenceIds: ["evidence:v1:0"],
        userConfirmed: false,
      },
    ],
    interestCalculations: [],
    deadlineRules: [],
    obligations: [
      {
        id: "obligation:v1:0",
        ownerScope: OWNER,
        sourceDocumentId: "document:v1:0",
        type: "RESPOND",
        title: "Private title not persisted",
        description: "Private description not persisted",
        components: [],
        dueDate: "2026-07-20",
        dueDateStatus: "DOCUMENT_STATED",
        status: "PENDING_CONFIRMATION",
        evidenceIds: ["evidence:v1:0"],
        userConfirmed: false,
      },
    ],
    timeline: [],
    accountingDrafts: [],
    auditEvents: [],
    driveArchives: [
      {
        id: "drive-archive:v1:0",
        ownerScope: OWNER,
        fileId: "file:v1:0",
        documentIds: ["document:v1:0"],
        sourceSha256: "a".repeat(64),
        driveFileId: "drive_file_synthetic",
        driveFolderId: "drive_folder_synthetic",
        documentDate: "2026-06-30",
        archiveStatus: "ARCHIVED_VERIFIED",
        reviewStatus: "USER_CONFIRMED",
        verificationMethod: "SHA256_READBACK_MATCH",
        recordVersion: 1,
        workspaceRevision: 3,
        archivedAt: NOW,
      },
    ],
  };
}

describe("workspace privacy projection v2", () => {
  it("keeps typed dates, cents, links and exact relations while dropping PII/free text", async () => {
    const input = workspace();
    const before = structuredClone(input);
    const projected = await projectFiscalNotificationsWorkspacePrivacyV2(
      input,
      OWNER,
    );

    expect(input).toEqual(before);
    expect(projected).not.toBeNull();
    expect(
      projected?.documents.map((entry) => [
        entry.id,
        entry.familyId,
        entry.chronologyDate,
        entry.chronologyBasis,
      ]),
    ).toEqual([
      [
        "document:v1:0",
        "collection.offset_requested",
        null,
        null,
      ],
      [
        "document:v1:1",
        "collection.offset_ex_officio",
        null,
        null,
      ],
    ]);
    expect(projected?.references[0]?.value).toEqual({
      storage: "NORMALIZED_REFERENCE",
      normalizedValue: "A0000SYNTHETIC",
    });
    expect(projected?.accountHolder).toMatchObject({
      identityMatchStatus: "MATCH",
      identityMatchMethod: "TAX_ID",
    });
    expect(projected?.dates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "START_DATE", value: "2026-07-05" }),
        expect.objectContaining({ kind: "END_DATE", value: "2026-10-05" }),
        expect.objectContaining({
          kind: "INSTALLMENT_DUE_DATE",
          value: "2026-08-05",
        }),
        expect.objectContaining({
          kind: "RESPONSE_DEADLINE",
          value: "2026-07-20",
        }),
      ]),
    );
    expect(projected?.evidence[0]).toMatchObject({
      extractionMethod: "RULE",
      confidence: "EXACT",
    });
    expect(projected?.amounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentId: "document:v1:0",
          amountCents: 163_295,
          currency: "EUR",
          assertionType: "NOT_PROVEN_BY_DOCUMENT",
        }),
      ]),
    );
    expect(projected?.relations[0]).toMatchObject({
      id: "relation:v1:0",
      status: "SYSTEM_CONFIRMED_EXACT",
      exactReferenceIds: ["reference:v1:1", "reference:v1:0"],
    });
    expect(projected?.driveArchives[0]).toMatchObject({
      driveFileId: "drive_file_synthetic",
      sourceSha256: "a".repeat(64),
    });
    const serialized = JSON.stringify(projected);
    expect(serialized).not.toMatch(
      /Synthetic Private Name|00000000T|Private synthetic street|Private copied sentence|Private note|Private title|Private description|ES00|textSnippet|rawValue|titleRaw|debtorDisplayName|bankAccountMasked/iu,
    );
  });

  it("does not preserve an exact system relation without an exact compatible reference", async () => {
    const input = workspace();
    input.references[1]!.normalizedValue = "DIFFERENT-SYNTHETIC-REFERENCE";
    const projected = await projectFiscalNotificationsWorkspacePrivacyV2(
      input,
      OWNER,
    );
    expect(projected?.relations).toEqual([]);
  });

  it("fails closed for a foreign owner", async () => {
    expect(
      await projectFiscalNotificationsWorkspacePrivacyV2(
        workspace(),
        "user:00000000-0000-4000-8000-000000000062",
      ),
    ).toBeNull();
  });

  it("does not fabricate an AEAT family from a free-form subtype", async () => {
    const input = workspace();
    input.documents[0]!.documentType = "MUNICIPAL_FINE";
    input.documents[0]!.documentSubtype = "sanction.resolution";
    input.authorities[0]!.administrationType = "LOCAL";
    const projected = await projectFiscalNotificationsWorkspacePrivacyV2(
      input,
      OWNER,
    );
    expect(projected?.documents[0]).toMatchObject({
      familyId: null,
      recognitionStatus: "LEGACY_TYPE_ONLY",
      issuerCode: "LOCAL",
    });
  });

  it("preserves an exact reviewed V9 family for an AEAT document", async () => {
    const input = workspace();
    input.documents[0]!.documentType = "GENERIC_ADMINISTRATIVE_NOTICE";
    input.documents[0]!.documentSubtype =
      "procedure.deadline_extension_request";
    const projected = await projectFiscalNotificationsWorkspacePrivacyV2(
      input,
      OWNER,
    );
    expect(projected?.documents[0]).toMatchObject({
      familyId: "procedure.deadline_extension_request",
      recognitionStatus: "EXACT_FAMILY",
      issuerCode: "AEAT",
    });
  });

  it.each([
    "BELONGS_TO_CASE",
    "DUPLICATE_COPY_OF",
    "RELATED_TO_PAYMENT_PLAN",
    "RELATED_TO_INSTALLMENT",
    "POSSIBLY_RELATED",
  ] as const)("preserves legacy relation %s without fabricating exact evidence", async (relationType) => {
    const input = workspace();
    input.relations[0]!.relationType = relationType;
    input.relations[0]!.status = "SUGGESTED";
    const projected = await projectFiscalNotificationsWorkspacePrivacyV2(
      input,
      OWNER,
    );
    expect(projected).not.toBeNull();
    expect(projected?.relations).toEqual([
      expect.objectContaining({
        relationType,
        status: "SUGGESTED",
      }),
    ]);
  });

  it("downgrades an unprovable exact legacy relation instead of losing it", async () => {
    const input = workspace();
    input.relations[0]!.relationType = "BELONGS_TO_CASE";
    input.relations[0]!.status = "SYSTEM_CONFIRMED_EXACT";
    const projected = await projectFiscalNotificationsWorkspacePrivacyV2(
      input,
      OWNER,
    );
    expect(projected?.relations).toEqual([
      expect.objectContaining({
        relationType: "BELONGS_TO_CASE",
        status: "SUGGESTED",
      }),
    ]);
  });

  it("does not promote a provisional payment deadline because other evidence exists", async () => {
    const input = workspace();
    input.paymentOptions.push({
      id: "payment-option:v1:0",
      ownerScope: OWNER,
      documentId: "document:v1:0",
      title: "Synthetic provisional option",
      eligibilityCondition: "Review required",
      components: [],
      deadline: "2026-08-31",
      deadlineStatus: "PROVISIONAL",
      evidenceIds: ["evidence:v1:0"],
    });
    const projected = await projectFiscalNotificationsWorkspacePrivacyV2(
      input,
      OWNER,
    );
    expect(projected?.dates).toContainEqual(
      expect.objectContaining({
        fieldId: "PAYMENT_OPTION_DEADLINE",
        value: "2026-08-31",
        assertionType: "NOT_PROVEN_BY_DOCUMENT",
      }),
    );
  });

  it("keeps evidenced installment and stated obligation dates explicit", async () => {
    const projected = await projectFiscalNotificationsWorkspacePrivacyV2(
      workspace(),
      OWNER,
    );
    expect(projected?.dates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldId: "INSTALLMENT_1_DUE_DATE",
          assertionType: "EXPLICIT_IN_DOCUMENT",
        }),
        expect.objectContaining({
          fieldId: "OBLIGATION_DEADLINE",
          assertionType: "EXPLICIT_IN_DOCUMENT",
        }),
      ]),
    );
  });
});
