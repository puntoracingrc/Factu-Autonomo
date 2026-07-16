import { describe, expect, it } from "vitest";
import type { FiscalNotificationsWorkspace } from "./types";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";
import { projectFiscalNotificationsWorkspacePrivacyV2 } from "./workspace-privacy-projection.v2";
import {
  compareFiscalNotificationsWorkspaceStorageEnvelopesV2,
  encodeFiscalNotificationsWorkspaceForStorageV2,
  parseFiscalNotificationsWorkspaceStorageEnvelopeV2,
  restoreFiscalNotificationsWorkspaceFromStorageV2,
} from "./workspace-storage-envelope.v2";

const OWNER = "user:00000000-0000-4000-8000-000000000061";
const OTHER_OWNER = "user:00000000-0000-4000-8000-000000000062";
const CREATED_AT = "2026-07-16T08:00:00.000Z";
const SOURCE_HASH = "a".repeat(64);

function workspace(): FiscalNotificationsWorkspace {
  const dateFields = [
    ["ISSUE_DATE", "2026-07-01"],
    ["SIGNING_DATE", "2026-07-02"],
    ["ACTION_DATE", "2026-07-03"],
    ["EFFECTIVE_NOTIFICATION_DATE", "2026-07-04"],
  ] as const;
  return {
    schemaVersion: 1,
    workspaceId: "workspace:privacy-runtime:synthetic",
    ownerScope: OWNER,
    revision: 1,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    packages: [
      {
        id: "package:privacy-runtime:1",
        ownerScope: OWNER,
        fileIds: ["file:privacy-runtime:1"],
        sourceChannel: "MANUAL_UPLOAD",
        processingStatus: "NEEDS_REVIEW",
        securityScanStatus: "NOT_AVAILABLE",
        uploadedAt: CREATED_AT,
      },
    ],
    files: [
      {
        id: "file:privacy-runtime:1",
        packageId: "package:privacy-runtime:1",
        ownerScope: OWNER,
        role: "PRIMARY",
        mimeType: "application/pdf",
        fileSize: 12_000,
        pageCount: 3,
        sha256: SOURCE_HASH,
        contentFingerprint: SOURCE_HASH,
        sourceContentRetention: "NOT_RETAINED",
        uploadedAt: CREATED_AT,
      },
    ],
    documents: [
      {
        id: "document:privacy-runtime:1",
        packageId: "package:privacy-runtime:1",
        fileId: "file:privacy-runtime:1",
        ownerScope: OWNER,
        documentType: "AEAT_OFFSET_AGREEMENT",
        documentSubtype: "REQUESTED",
        titleRaw: "Título sintético que no debe persistirse",
        titleNormalized: "TITULO SINTETICO QUE NO DEBE PERSISTIRSE",
        authorityId: "authority:privacy-runtime:aeat",
        issueDate: "2026-07-01",
        signatureDate: "2026-07-02",
        notificationDates: { effectiveAt: "2026-07-04T00:00:00.000Z" },
        subjectParty: {
          displayName: "PERSONA PRIVADA SINTETICA",
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
        referenceIds: ["reference:privacy-runtime:1"],
        debtIds: [],
        caseIds: [],
        analysisSnapshotIds: ["analysis:privacy-runtime:1"],
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
      },
    ],
    parts: [],
    authorities: [
      {
        id: "authority:privacy-runtime:aeat",
        ownerScope: OWNER,
        administrationType: "AEAT",
        nameRaw: "Agencia Tributaria",
        nameNormalized: "AEAT",
      },
    ],
    references: [
      {
        id: "reference:privacy-runtime:1",
        ownerScope: OWNER,
        referenceType: "CSV",
        rawValue: "CSV PRIVADO SINTETICO 0000",
        normalizedValue: "CSV-PRIVADO-SINTETICO-0000",
        issuer: "AEAT",
        scope: "DOCUMENT",
        documentId: "document:privacy-runtime:1",
        isPrimary: true,
        confidence: "EXACT",
        confirmationStatus: "PENDING",
        extractionMethod: "RULE",
        occurrenceIds: ["evidence:privacy-runtime:reference"],
        createdAt: CREATED_AT,
      },
    ],
    evidence: [
      ...dateFields.map(([kind, value]) => ({
        id: `evidence:privacy-runtime:${kind}`,
        ownerScope: OWNER,
        documentId: "document:privacy-runtime:1",
        pageNumber: 1,
        textSnippet: `Fecha sintética ${kind}`,
        rawValue: value,
        extractionMethod: "RULE" as const,
        confidence: "EXACT" as const,
        assertionType: "EXPLICIT_IN_DOCUMENT" as const,
      })),
      {
        id: "evidence:privacy-runtime:reference",
        ownerScope: OWNER,
        documentId: "document:privacy-runtime:1",
        pageNumber: 1,
        textSnippet: "Referencia privada sintética",
        rawValue: "CSV PRIVADO SINTETICO 0000",
        extractionMethod: "RULE",
        confidence: "EXACT",
        assertionType: "EXPLICIT_IN_DOCUMENT",
      },
      {
        id: "evidence:privacy-runtime:amount",
        ownerScope: OWNER,
        documentId: "document:privacy-runtime:1",
        pageNumber: 2,
        textSnippet: "Importe sintético",
        rawValue: "1632,95",
        extractionMethod: "RULE",
        confidence: "EXACT",
        assertionType: "EXPLICIT_IN_DOCUMENT",
      },
    ],
    debts: [],
    debtObservations: [],
    cases: [],
    relations: [],
    analysisSnapshots: [
      {
        id: "analysis:privacy-runtime:1",
        ownerScope: OWNER,
        documentId: "document:privacy-runtime:1",
        version: 1,
        extractorVersion: "synthetic-v1",
        rulesVersion: "1.0.0",
        structuredData: {
          schemaVersion: 1,
          documentType: "AEAT_OFFSET_AGREEMENT",
          paymentOptionIds: ["payment-option:privacy-runtime:1"],
          unknownFields: dateFields.map(([kind, value], index) => ({
            labelRaw: `VSR2|profile:date:${kind}:${index}|DATE|${kind}|Fecha`,
            valueRaw: value,
            page: 1,
            evidenceId: `evidence:privacy-runtime:${kind}`,
            confidence: "EXACT" as const,
          })),
          validationCodes: [],
          factSummary: [],
          calculatedSummary: [],
          inferenceSummary: [],
          userConfirmedSummary: [],
          documentFields: {
            title: "Título sintético que no debe persistirse",
            issueDate: "2026-07-01",
            effectiveNotificationDate: "2026-07-04",
          },
        },
        plainLanguageExplanation: ["Texto privado sintético"],
        validationWarnings: [],
        evidenceIds: [
          ...dateFields.map(([kind]) => `evidence:privacy-runtime:${kind}`),
          "evidence:privacy-runtime:reference",
          "evidence:privacy-runtime:amount",
        ],
        confidenceBand: "EXACT",
        requiresHumanReview: true,
        createdAt: CREATED_AT,
        createdBySystem: true,
      },
    ],
    paymentOptions: [
      {
        id: "payment-option:privacy-runtime:1",
        ownerScope: OWNER,
        documentId: "document:privacy-runtime:1",
        title: "Importe privado sintético",
        eligibilityCondition: "Revisión",
        components: [
          {
            type: "TOTAL_DEBT",
            amountCents: 163_295,
            assertionType: "EXPLICIT_IN_DOCUMENT",
            evidenceIds: ["evidence:privacy-runtime:amount"],
          },
        ],
        totalCents: 163_295,
        deadlineStatus: "UNKNOWN",
        evidenceIds: ["evidence:privacy-runtime:amount"],
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

function removeDate(
  source: FiscalNotificationsWorkspace,
  kind: string,
): FiscalNotificationsWorkspace {
  const candidate = structuredClone(source);
  candidate.evidence = candidate.evidence.filter(
    (entry) => entry.id !== `evidence:privacy-runtime:${kind}`,
  );
  const snapshot = candidate.analysisSnapshots[0]!;
  snapshot.evidenceIds = snapshot.evidenceIds.filter(
    (id) => id !== `evidence:privacy-runtime:${kind}`,
  );
  snapshot.structuredData.unknownFields =
    snapshot.structuredData.unknownFields.filter(
      (entry) => !entry.labelRaw.includes(`profile:date:${kind}:`),
    );
  if (kind === "ISSUE_DATE") {
    delete candidate.documents[0]!.issueDate;
    delete snapshot.structuredData.documentFields.issueDate;
  }
  if (kind === "SIGNING_DATE") delete candidate.documents[0]!.signatureDate;
  if (kind === "EFFECTIVE_NOTIFICATION_DATE") {
    candidate.documents[0]!.notificationDates = {};
    delete snapshot.structuredData.documentFields.effectiveNotificationDate;
  }
  return candidate;
}

describe("runtime privacy storage envelope v2", () => {
  it("persists only V2 typed data while preserving replay metadata", () => {
    const input = workspace();
    const before = structuredClone(input);
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(input, OWNER),
    ).toMatchObject({ valid: true, issues: [] });
    expect(
      projectFiscalNotificationsWorkspacePrivacyV2(input, OWNER),
    ).not.toBeNull();
    const encoded = encodeFiscalNotificationsWorkspaceForStorageV2(input);

    expect(input).toEqual(before);
    expect(encoded).not.toBeNull();
    expect(encoded?.sources[0]).toMatchObject({
      sha256: SOURCE_HASH,
      fileSize: 12_000,
      pageCount: 3,
      documentIds: ["document:privacy-runtime:1"],
    });
    expect(encoded?.workspace.amounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ amountCents: 163_295, currency: "EUR" }),
      ]),
    );
    expect(encoded?.workspace.references[0]?.value).toMatchObject({
      storage: "FINGERPRINT_ONLY",
      fingerprintSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
    });
    expect(JSON.stringify(encoded)).not.toMatch(
      /PERSONA PRIVADA|00000000T|Texto privado|Título sintético|CSV PRIVADO|textSnippet|rawValue|valueRaw|plainLanguage/iu,
    );
  });

  it("roundtrips into a safe in-memory V1 view without losing dates, cents or replay", () => {
    const encoded = encodeFiscalNotificationsWorkspaceForStorageV2(workspace())!;
    const restored = restoreFiscalNotificationsWorkspaceFromStorageV2(
      encoded,
      OWNER,
    );

    expect(restored).not.toBeNull();
    expect(restored?.files[0]).toMatchObject({
      sha256: SOURCE_HASH,
      fileSize: 12_000,
      pageCount: 3,
      sourceContentRetention: "NOT_RETAINED",
    });
    expect(restored?.documents[0]).toMatchObject({
      issueDate: "2026-07-01",
      signatureDate: "2026-07-02",
    });
    expect(restored?.paymentOptions[0]?.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ amountCents: 163_295 }),
      ]),
    );
    expect(restored?.references[0]?.rawValue).toBe("CSV protegido");
    expect(
      projectFiscalNotificationsWorkspacePrivacyV2(restored!, OWNER),
    ).not.toBeNull();
    expect(
      encodeFiscalNotificationsWorkspaceForStorageV2(restored),
    ).toEqual(encoded);
  });

  it("preserves exact chronology priority and never substitutes createdAt", () => {
    const issue = encodeFiscalNotificationsWorkspaceForStorageV2(workspace())!;
    expect(issue.workspace.documents[0]).toMatchObject({
      chronologyDate: "2026-07-01",
      chronologyBasis: "ISSUE_DATE",
    });

    const withoutIssue = removeDate(workspace(), "ISSUE_DATE");
    const signing = encodeFiscalNotificationsWorkspaceForStorageV2(withoutIssue)!;
    expect(signing.workspace.documents[0]).toMatchObject({
      chronologyDate: "2026-07-02",
      chronologyBasis: "SIGNING_DATE",
    });

    const withoutSigning = removeDate(withoutIssue, "SIGNING_DATE");
    const action = encodeFiscalNotificationsWorkspaceForStorageV2(withoutSigning)!;
    expect(action.workspace.documents[0]).toMatchObject({
      chronologyDate: "2026-07-03",
      chronologyBasis: "ACTION_DATE",
    });

    const withoutAction = removeDate(withoutSigning, "ACTION_DATE");
    const effective = encodeFiscalNotificationsWorkspaceForStorageV2(withoutAction)!;
    expect(effective.workspace.documents[0]).toMatchObject({
      chronologyDate: "2026-07-04",
      chronologyBasis: "EFFECTIVE_NOTIFICATION_DATE",
    });

    const withoutAny = removeDate(
      withoutAction,
      "EFFECTIVE_NOTIFICATION_DATE",
    );
    expect(
      encodeFiscalNotificationsWorkspaceForStorageV2(withoutAny)!.workspace
        .documents[0],
    ).toMatchObject({ chronologyDate: null, chronologyBasis: null });
  });

  it("fails closed for owner mismatch, unknown keys and corrupted sources", () => {
    const encoded = encodeFiscalNotificationsWorkspaceForStorageV2(workspace())!;
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(encoded, OTHER_OWNER),
    ).toBeNull();

    const unknown = structuredClone(encoded) as unknown as Record<string, unknown>;
    unknown.rawText = "private";
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(unknown, OWNER),
    ).toBeNull();

    const corrupted = structuredClone(encoded) as unknown as {
      sources: Array<{ sha256: string }>;
    };
    corrupted.sources[0]!.sha256 = "unsafe";
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(corrupted, OWNER),
    ).toBeNull();
  });

  it("compares monotonic encoded revisions without using raw V1 content", () => {
    const current = encodeFiscalNotificationsWorkspaceForStorageV2(workspace())!;
    const advancedInput = workspace();
    advancedInput.revision = 2;
    advancedInput.updatedAt = "2026-07-16T09:00:00.000Z";
    const advanced = encodeFiscalNotificationsWorkspaceForStorageV2(
      advancedInput,
      current,
    )!;
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        current,
        advanced,
        OWNER,
      ),
    ).toBe("INCOMING_ADVANCES");
  });
});
