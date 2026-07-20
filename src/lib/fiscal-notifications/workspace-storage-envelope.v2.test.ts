import { describe, expect, it } from "vitest";
import type { FiscalNotificationsWorkspace } from "./types";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";
import { projectFiscalNotificationsWorkspacePrivacyV2 } from "./workspace-privacy-projection.v2";
import { deleteFiscalNotificationDocumentV1 } from "./document-deletion.v1";
import { AEAT_DOCUMENT_PROFILE_IDS_V1 } from "./knowledge/aeat-document-knowledge.v1";
import { projectFiscalNotificationDocumentLibraryV1 } from "./structured-review-document-library.v1";
import { STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1 } from "./structured-review-relation-suggestions.v1";
import {
  compareFiscalNotificationsWorkspaceStorageEnvelopesV2,
  encodeFiscalNotificationsWorkspaceForStorageV2,
  mergeFiscalNotificationsWorkspaceStorageEnvelopesV2,
  parseFiscalNotificationsWorkspaceStorageEnvelopeV2,
  registerFiscalNotificationDocumentReductionTransitionV2,
  registerFiscalNotificationEmptyRestartDescendantTransitionV2,
  registerFiscalNotificationEmptyRestartTransitionV2,
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

function workspaceWithNewDocumentGraph(): FiscalNotificationsWorkspace {
  const remapped = JSON.parse(
    JSON.stringify(workspace()).replaceAll(
      "privacy-runtime",
      "privacy-descendant",
    ),
  ) as FiscalNotificationsWorkspace;
  remapped.workspaceId = "workspace:privacy-runtime:synthetic";
  remapped.revision = 3;
  remapped.createdAt = CREATED_AT;
  remapped.updatedAt = "2026-07-16T10:00:00.000Z";
  remapped.files[0]!.sha256 = "b".repeat(64);
  remapped.files[0]!.contentFingerprint = "b".repeat(64);
  return remapped;
}

function workspaceWithTwoDocumentGraphs(): FiscalNotificationsWorkspace {
  const first = workspace();
  const second = workspaceWithNewDocumentGraph();
  return {
    ...first,
    packages: [...first.packages, ...second.packages],
    files: [...first.files, ...second.files],
    documents: [...first.documents, ...second.documents],
    authorities: [...first.authorities, ...second.authorities],
    references: [...first.references, ...second.references],
    evidence: [...first.evidence, ...second.evidence],
    analysisSnapshots: [
      ...first.analysisSnapshots,
      ...second.analysisSnapshots,
    ],
    paymentOptions: [...first.paymentOptions, ...second.paymentOptions],
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

  it("persists source ids whose opaque hash contains a phone-like digit run", () => {
    const input = JSON.parse(
      JSON.stringify(workspace()).replaceAll(
        "privacy-runtime",
        "h863456789abcdef",
      ),
    ) as FiscalNotificationsWorkspace;

    const encoded = encodeFiscalNotificationsWorkspaceForStorageV2(input);

    expect(encoded).not.toBeNull();
    expect(encoded?.sources).toHaveLength(1);
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
    expect(restored?.paymentOptions).toEqual([]);
    expect(restored?.references[0]?.rawValue).toBe("CSV protegido");
    expect(
      projectFiscalNotificationsWorkspacePrivacyV2(restored!, OWNER),
    ).not.toBeNull();
    expect(
      encodeFiscalNotificationsWorkspaceForStorageV2(restored),
    ).toEqual(encoded);
  });

  it("roundtrips the printed form of a non-sensitive administrative reference", () => {
    const input = workspace();
    input.references[0]!.referenceType = "LIQUIDATION_KEY";
    input.references[0]!.rawValue = "LQ-SYNTHETIC-0001";
    input.references[0]!.normalizedValue = "LQ-SYNTHETIC-0001";

    const encoded = encodeFiscalNotificationsWorkspaceForStorageV2(input)!;
    const restored = restoreFiscalNotificationsWorkspaceFromStorageV2(
      encoded,
      OWNER,
    );

    expect(encoded.workspace.references[0]?.value).toEqual({
      storage: "NORMALIZED_REFERENCE",
      normalizedValue: "LQSYNTHETIC0001",
      printedValue: "LQ-SYNTHETIC-0001",
    });
    expect(restored?.references[0]).toMatchObject({
      rawValue: "LQ-SYNTHETIC-0001",
      normalizedValue: "LQSYNTHETIC0001",
    });
  });

  it("roundtrips observed dates emitted by a specialized extractor", () => {
    const input = workspace();
    const document = input.documents[0]!;
    const snapshot = input.analysisSnapshots[0]!;
    document.documentType = "AEAT_SEIZURE_ORDER";
    document.documentSubtype = "seizure.bank_account";
    delete document.issueDate;
    delete document.signatureDate;
    document.notificationDates = {};
    delete snapshot.structuredData.documentFields.issueDate;
    delete snapshot.structuredData.documentFields.effectiveNotificationDate;
    input.evidence = input.evidence.filter(
      (entry) => !entry.id.startsWith("evidence:privacy-runtime:") ||
        entry.id === "evidence:privacy-runtime:reference" ||
        entry.id === "evidence:privacy-runtime:amount",
    );
    const specializedDates = [
      ["ISSUE_DATE", "Fecha de emisión", "2026-03-03"],
      ["SEIZURE_DATE", "Fecha del embargo", "2026-03-04"],
      ["RESPONSE_DEADLINE", "Plazo de contestación", "2026-03-12"],
    ] as const;
    input.evidence.push(
      ...specializedDates.map(([kind, label]) => ({
        id: `evidence:specialized:${kind}`,
        ownerScope: OWNER,
        documentId: document.id,
        pageNumber: 1,
        textSnippet: label,
        rawValue: kind,
        extractionMethod: "RULE" as const,
        confidence: "EXACT" as const,
        assertionType: "EXPLICIT_IN_DOCUMENT" as const,
      })),
    );
    snapshot.evidenceIds = [
      "evidence:privacy-runtime:reference",
      "evidence:privacy-runtime:amount",
      ...specializedDates.map(([kind]) => `evidence:specialized:${kind}`),
    ];
    snapshot.structuredData.unknownFields = specializedDates.map(
      ([kind, label, value], index) => ({
        labelRaw: `VSR2|date:seizure:${index}:${kind}|DATE|${kind}|${label}`,
        valueRaw: value,
        page: 1,
        evidenceId: `evidence:specialized:${kind}`,
        confidence: "EXACT" as const,
      }),
    );

    const encoded = encodeFiscalNotificationsWorkspaceForStorageV2(input)!;
    expect(
      encoded.workspace.dates.map(({ kind, value }) => [kind, value]),
    ).toEqual([
      ["ISSUE_DATE", "2026-03-03"],
      ["SEIZURE_DATE", "2026-03-04"],
      ["RESPONSE_DEADLINE", "2026-03-12"],
    ]);

    const restored = restoreFiscalNotificationsWorkspaceFromStorageV2(
      encoded,
      OWNER,
    );
    expect(restored?.documents[0]?.issueDate).toBe("2026-03-03");
    const library = projectFiscalNotificationDocumentLibraryV1(restored, OWNER);
    expect(library.status).toBe("READY");
    expect(library.documents[0]).toMatchObject({
      documentDate: "2026-03-03",
      printedDates: expect.arrayContaining([
        { label: "Fecha de emisión", value: "2026-03-03" },
        { label: "Fecha de embargo", value: "2026-03-04" },
        { label: "Fecha límite de respuesta", value: "2026-03-12" },
      ]),
    });
    expect(
      encodeFiscalNotificationsWorkspaceForStorageV2(restored),
    ).toEqual(encoded);
  });

  it("restores a visible document library with observed facts and page provenance", () => {
    const input = workspace();
    input.evidence.push({
      id: "evidence:privacy-runtime:fact",
      ownerScope: OWNER,
      documentId: "document:privacy-runtime:1",
      pageNumber: 2,
      textSnippet: "Dato sintético observado",
      rawValue: "Documentación requerida",
      extractionMethod: "RULE",
      confidence: "EXACT",
      assertionType: "EXPLICIT_IN_DOCUMENT",
    });
    input.analysisSnapshots[0]!.evidenceIds.push(
      "evidence:privacy-runtime:fact",
    );
    input.analysisSnapshots[0]!.structuredData.unknownFields.push({
      labelRaw:
        "VSR2|profile:fact:PAYMENT_SCOPE:0|DETAIL|FACT_OR_GROUND|Alcance del pago",
      valueRaw: "Consta en el documento",
      page: 2,
      evidenceId: "evidence:privacy-runtime:fact",
      confidence: "EXACT",
    });

    const encoded = encodeFiscalNotificationsWorkspaceForStorageV2(input)!;
    expect(encoded.workspace.facts).toContainEqual(
      expect.objectContaining({
        fieldId: "PROFILE_FACT_PAYMENT_SCOPE",
        assertionType: "EXPLICIT_IN_DOCUMENT",
        evidenceIds: ["evidence:privacy-runtime:fact"],
      }),
    );
    const restored = restoreFiscalNotificationsWorkspaceFromStorageV2(
      encoded,
      OWNER,
    );
    const library = projectFiscalNotificationDocumentLibraryV1(restored, OWNER);

    expect(library.status).toBe("READY");
    expect(library.documents).toHaveLength(1);
    expect(library.documents[0]).toMatchObject({
      key: "document:privacy-runtime:1",
      documentDate: "2026-07-01",
      pageCount: 3,
      installments: [],
      money: expect.arrayContaining([
        expect.objectContaining({ amountCents: 163_295 }),
      ]),
      orderedFacts: expect.arrayContaining([
        expect.objectContaining({
          semantic: "DETAIL",
          label: "Alcance del pago",
          value: "Consta en el documento",
          pageNumber: 2,
        }),
      ]),
    });
    expect(JSON.stringify(library)).not.toMatch(
      /INTEGER:|BOOLEAN:|EXPLANATION:|_DURATION|_CONTENT|EXACT_TITLE_AND_AUTHORITY/u,
    );
  });

  it("does not re-expose unproven dates, references or amounts after reload", () => {
    const encoded = structuredClone(
      encodeFiscalNotificationsWorkspaceForStorageV2(workspace())!,
    );
    encoded.workspace.references[0]!.assertionType =
      "NOT_PROVEN_BY_DOCUMENT";
    const issueDate = encoded.workspace.dates.find(
      (entry) => entry.kind === "ISSUE_DATE",
    )!;
    issueDate.assertionType = "NOT_PROVEN_BY_DOCUMENT";
    encoded.workspace.amounts.forEach((amount) => {
      amount.assertionType = "NOT_PROVEN_BY_DOCUMENT";
    });

    expect(encoded.workspace.references[0]).toMatchObject({
      assertionType: "NOT_PROVEN_BY_DOCUMENT",
      evidenceIds: ["evidence:privacy-runtime:reference"],
    });
    expect(
      encoded.workspace.dates.find((entry) => entry.kind === "ISSUE_DATE"),
    ).toMatchObject({
      assertionType: "NOT_PROVEN_BY_DOCUMENT",
      evidenceIds: ["evidence:privacy-runtime:ISSUE_DATE"],
    });
    expect(encoded.workspace.amounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assertionType: "NOT_PROVEN_BY_DOCUMENT",
          evidenceIds: ["evidence:privacy-runtime:amount"],
        }),
      ]),
    );

    const restored = restoreFiscalNotificationsWorkspaceFromStorageV2(
      encoded,
      OWNER,
    );
    expect(restored?.references).toEqual([]);
    expect(restored?.documents[0]?.referenceIds).toEqual([]);
    expect(restored?.documents[0]?.issueDate).toBeUndefined();
    expect(restored?.paymentOptions).toEqual([]);
    const library = projectFiscalNotificationDocumentLibraryV1(restored, OWNER);
    expect(library.status).toBe("READY");
    expect(library.documents[0]).toMatchObject({
      documentDate: "2026-07-02",
      references: [],
      money: [],
    });
    expect(library.documents[0]?.orderedFacts).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "2026-07-01" }),
      ]),
    );
  });

  it("keeps a fully unproven persisted document out of the visible library", () => {
    const encoded = structuredClone(
      encodeFiscalNotificationsWorkspaceForStorageV2(workspace())!,
    );
    for (const entries of [
      encoded.workspace.references,
      encoded.workspace.dates,
      encoded.workspace.amounts,
      encoded.workspace.facts,
    ]) {
      entries.forEach((entry) => {
        entry.assertionType = "NOT_PROVEN_BY_DOCUMENT";
      });
    }

    const restored = restoreFiscalNotificationsWorkspaceFromStorageV2(
      encoded,
      OWNER,
    );
    const library = projectFiscalNotificationDocumentLibraryV1(restored, OWNER);

    expect(restored?.documents).toHaveLength(1);
    expect(restored?.documents[0]?.analysisSnapshotIds).toEqual([]);
    expect(restored?.analysisSnapshots).toEqual([]);
    expect(library).toMatchObject({ status: "READY", documents: [] });
  });

  it("drops an exact relation when a matching reference is not document-proven", () => {
    const input = workspaceWithTwoDocumentGraphs();
    input.relations.push({
      id: "relation:privacy-runtime:exact",
      ownerScope: OWNER,
      sourceDocumentId: "document:privacy-runtime:1",
      targetDocumentId: "document:privacy-descendant:1",
      relationType: "ENFORCES",
      confidenceBand: "EXACT",
      score: 100,
      evidence: {
        matchingReferenceTypes: ["CSV"],
        matchingAmountTypes: [],
        matchingDates: [],
        differences: [],
      },
      algorithmVersion: STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1,
      status: "SYSTEM_CONFIRMED_EXACT",
      createdAt: CREATED_AT,
    });
    const encoded = structuredClone(
      encodeFiscalNotificationsWorkspaceForStorageV2(input)!,
    );
    expect(encoded.workspace.relations[0]?.exactReferenceIds).toHaveLength(2);
    const targetReference = encoded.workspace.references.find(
      (entry) => entry.documentId === "document:privacy-descendant:1",
    )!;
    targetReference.assertionType = "NOT_PROVEN_BY_DOCUMENT";

    const restored = restoreFiscalNotificationsWorkspaceFromStorageV2(
      encoded,
      OWNER,
    );

    expect(restored?.relations).toEqual([]);
  });

  it("keeps unproven contextual dates and bank references out of relations", () => {
    const input = workspaceWithTwoDocumentGraphs();
    input.relations.push({
      id: "relation:privacy-runtime:context",
      ownerScope: OWNER,
      sourceDocumentId: "document:privacy-runtime:1",
      targetDocumentId: "document:privacy-descendant:1",
      relationType: "ENFORCES",
      confidenceBand: "EXACT",
      score: 100,
      evidence: {
        matchingReferenceTypes: ["CSV"],
        matchingAmountTypes: [],
        matchingDates: ["2026-07-01"],
        differences: [],
      },
      algorithmVersion: STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1,
      status: "SYSTEM_CONFIRMED_EXACT",
      createdAt: CREATED_AT,
    });
    const encoded = structuredClone(
      encodeFiscalNotificationsWorkspaceForStorageV2(input)!,
    );
    encoded.workspace.dates
      .filter((entry) => entry.kind === "ISSUE_DATE")
      .forEach((entry) => {
        entry.assertionType = "NOT_PROVEN_BY_DOCUMENT";
      });

    const restored = restoreFiscalNotificationsWorkspaceFromStorageV2(
      encoded,
      OWNER,
    );

    expect(restored?.relations).toHaveLength(1);
    expect(restored?.relations[0]?.evidence).toMatchObject({
      matchingReferenceTypes: ["CSV"],
      matchingAmountTypes: [],
      matchingDates: [],
    });

    const bankOnly = structuredClone(encoded);
    bankOnly.workspace.references.forEach((entry) => {
      entry.referenceType = "BANK_REFERENCE";
      entry.value = {
        storage: "FINGERPRINT_ONLY",
        referenceType: "BANK_REFERENCE",
        fingerprintSha256: "d".repeat(64),
      };
    });
    expect(
      restoreFiscalNotificationsWorkspaceFromStorageV2(bankOnly, OWNER)
        ?.relations,
    ).toEqual([]);
  });

  it("rejects a changed workspace generation without a bound empty restart", () => {
    const baseWorkspace = workspace();
    const base = encodeFiscalNotificationsWorkspaceForStorageV2(baseWorkspace)!;
    const unboundGeneration = structuredClone(baseWorkspace);
    unboundGeneration.revision = 2;
    unboundGeneration.createdAt = "2026-07-16T09:00:00.000Z";
    unboundGeneration.updatedAt = "2026-07-16T09:00:00.000Z";

    expect(
      encodeFiscalNotificationsWorkspaceForStorageV2(
        unboundGeneration,
        base,
      ),
    ).toBeNull();
  });

  it("keeps B and C after saving A/B, deleting A, reloading, and saving C", () => {
    const initialWorkspace = workspaceWithTwoDocumentGraphs();
    const initial = encodeFiscalNotificationsWorkspaceForStorageV2(
      initialWorkspace,
    )!;
    const deleted = deleteFiscalNotificationDocumentV1({
      workspace: initialWorkspace,
      ownerScope: OWNER,
      documentId: "document:privacy-runtime:1",
      deletedAt: "2026-07-16T09:00:00.000Z",
    });
    expect(deleted.status).toBe("APPLIED");
    if (deleted.status !== "APPLIED") return;
    const reducedWorkspace =
      registerFiscalNotificationDocumentReductionTransitionV2(
        deleted.workspace,
        initialWorkspace,
        OWNER,
        "2026-07-16T09:00:00.000Z",
      );
    expect(reducedWorkspace).not.toBeNull();
    const reduced = encodeFiscalNotificationsWorkspaceForStorageV2(
      reducedWorkspace,
      initial,
    )!;
    const reloaded = restoreFiscalNotificationsWorkspaceFromStorageV2(
      reduced,
      OWNER,
    )!;
    const third = JSON.parse(
      JSON.stringify(workspace()).replaceAll("privacy-runtime", "privacy-third"),
    ) as FiscalNotificationsWorkspace;
    const candidate: FiscalNotificationsWorkspace = {
      ...reloaded,
      revision: reloaded.revision + 1,
      updatedAt: "2026-07-16T10:00:00.000Z",
      packages: [...reloaded.packages, ...third.packages],
      files: [...reloaded.files, ...third.files],
      documents: [...reloaded.documents, ...third.documents],
      authorities: [...reloaded.authorities, ...third.authorities],
      references: [...reloaded.references, ...third.references],
      evidence: [...reloaded.evidence, ...third.evidence],
      analysisSnapshots: [
        ...reloaded.analysisSnapshots,
        ...third.analysisSnapshots,
      ],
      paymentOptions: [...reloaded.paymentOptions, ...third.paymentOptions],
    };

    const next = encodeFiscalNotificationsWorkspaceForStorageV2(
      candidate,
      reduced,
    );
    expect(next).not.toBeNull();
    expect(next?.workspace.documents.map((entry) => entry.id)).toEqual([
      "document:privacy-descendant:1",
      "document:privacy-third:1",
    ]);
    for (const entries of [
      next!.workspace.references,
      next!.workspace.dates,
      next!.workspace.amounts,
      next!.workspace.facts,
      next!.workspace.evidence,
    ]) {
      expect(new Set(entries.map((entry) => entry.id)).size).toBe(
        entries.length,
      );
    }
    expect(
      next?.workspace.dates.filter(
        (entry) => entry.documentId === "document:privacy-descendant:1",
      ),
    ).toEqual(
      reduced.workspace.dates.filter(
        (entry) => entry.documentId === "document:privacy-descendant:1",
      ),
    );
    expect(
      next?.workspace.amounts.filter(
        (entry) => entry.documentId === "document:privacy-descendant:1",
      ),
    ).toEqual(
      reduced.workspace.amounts.filter(
        (entry) => entry.documentId === "document:privacy-descendant:1",
      ),
    );
    expect(
      restoreFiscalNotificationsWorkspaceFromStorageV2(next, OWNER)?.documents
        .map((entry) => entry.id),
    ).toEqual([
      "document:privacy-descendant:1",
      "document:privacy-third:1",
    ]);
  });

  it("registers a one-of-N reduction for a shared PDF and preserves its Drive original metadata", () => {
    const baseWorkspace = workspaceWithTwoDocumentGraphs();
    const sourceDocument = baseWorkspace.documents[0]!;
    const siblingDocument = baseWorkspace.documents[1]!;
    siblingDocument.packageId = sourceDocument.packageId;
    siblingDocument.fileId = sourceDocument.fileId;
    baseWorkspace.packages = [baseWorkspace.packages[0]!];
    baseWorkspace.files = [baseWorkspace.files[0]!];
    baseWorkspace.driveArchives = [
      {
        id: `drive-archive:${SOURCE_HASH}`,
        ownerScope: OWNER,
        fileId: sourceDocument.fileId,
        documentIds: [sourceDocument.id, siblingDocument.id],
        sourceSha256: SOURCE_HASH,
        driveFileId: "drive_file_synthetic_shared_061",
        driveFolderId: "drive_folder_synthetic_061",
        documentDate: "2026-07-01",
        archiveStatus: "ARCHIVED_VERIFIED",
        reviewStatus: "USER_CONFIRMED",
        verificationMethod: "SHA256_READBACK_MATCH",
        recordVersion: 1,
        workspaceRevision: baseWorkspace.revision,
        archivedAt: CREATED_AT,
      },
    ];
    const base = encodeFiscalNotificationsWorkspaceForStorageV2(baseWorkspace);
    expect(base).not.toBeNull();

    const deletion = deleteFiscalNotificationDocumentV1({
      workspace: baseWorkspace,
      ownerScope: OWNER,
      documentId: siblingDocument.id,
      deletedAt: "2026-07-16T09:00:00.000Z",
    });
    expect(deletion.status).toBe("APPLIED");
    if (deletion.status !== "APPLIED") return;

    const reduced = registerFiscalNotificationDocumentReductionTransitionV2(
      deletion.workspace,
      baseWorkspace,
      OWNER,
      "2026-07-16T09:00:00.000Z",
    );

    expect(reduced).not.toBeNull();
    expect(reduced?.documents.map(({ id }) => id)).toEqual([
      sourceDocument.id,
    ]);
    expect(reduced?.driveArchives).toEqual([
      expect.objectContaining({
        driveFileId: "drive_file_synthetic_shared_061",
        documentIds: [sourceDocument.id],
      }),
    ]);
  });

  it("rebases a legacy reduction without base document ids after later saves", () => {
    const originalWorkspace = workspaceWithTwoDocumentGraphs();
    const original = encodeFiscalNotificationsWorkspaceForStorageV2(
      originalWorkspace,
    )!;
    const firstDeletion = deleteFiscalNotificationDocumentV1({
      workspace: originalWorkspace,
      ownerScope: OWNER,
      documentId: "document:privacy-runtime:1",
      deletedAt: "2026-07-16T09:00:00.000Z",
    });
    expect(firstDeletion.status).toBe("APPLIED");
    if (firstDeletion.status !== "APPLIED") return;
    const firstReducedWorkspace =
      registerFiscalNotificationDocumentReductionTransitionV2(
        firstDeletion.workspace,
        originalWorkspace,
        OWNER,
        "2026-07-16T09:00:00.000Z",
      );
    expect(firstReducedWorkspace).not.toBeNull();
    const firstReduced = encodeFiscalNotificationsWorkspaceForStorageV2(
      firstReducedWorkspace,
      original,
    )!;
    const legacyReduced = structuredClone(firstReduced);
    expect(legacyReduced.transition?.kind).toBe(
      "USER_CONFIRMED_DOCUMENT_REDUCTION_V1",
    );
    if (
      legacyReduced.transition?.kind !==
      "USER_CONFIRMED_DOCUMENT_REDUCTION_V1"
    ) {
      return;
    }
    expect(
      Reflect.deleteProperty(legacyReduced.transition, "baseDocumentIds"),
    ).toBe(true);
    const parsedLegacy = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
      legacyReduced,
      OWNER,
    );
    expect(parsedLegacy).not.toBeNull();
    const reloadedLegacy = restoreFiscalNotificationsWorkspaceFromStorageV2(
      parsedLegacy,
      OWNER,
    );
    expect(reloadedLegacy).not.toBeNull();
    if (!parsedLegacy || !reloadedLegacy) return;

    const laterGraph = JSON.parse(
      JSON.stringify(workspace()).replaceAll("privacy-runtime", "privacy-later"),
    ) as FiscalNotificationsWorkspace;
    const advancedWorkspace: FiscalNotificationsWorkspace = {
      ...reloadedLegacy,
      revision: 4,
      updatedAt: "2026-07-16T11:00:00.000Z",
      packages: [...reloadedLegacy.packages, ...laterGraph.packages],
      files: [...reloadedLegacy.files, ...laterGraph.files],
      documents: [...reloadedLegacy.documents, ...laterGraph.documents],
      authorities: [...reloadedLegacy.authorities, ...laterGraph.authorities],
      references: [...reloadedLegacy.references, ...laterGraph.references],
      evidence: [...reloadedLegacy.evidence, ...laterGraph.evidence],
      analysisSnapshots: [
        ...reloadedLegacy.analysisSnapshots,
        ...laterGraph.analysisSnapshots,
      ],
      paymentOptions: [
        ...reloadedLegacy.paymentOptions,
        ...laterGraph.paymentOptions,
      ],
    };
    const advanced = encodeFiscalNotificationsWorkspaceForStorageV2(
      advancedWorkspace,
      parsedLegacy,
    );
    expect(advanced).not.toBeNull();
    const reloadedAdvanced = restoreFiscalNotificationsWorkspaceFromStorageV2(
      advanced,
      OWNER,
    );
    expect(reloadedAdvanced).not.toBeNull();
    if (!advanced || !reloadedAdvanced) return;

    const laterDocumentId = laterGraph.documents[0]!.id;
    const secondDeletion = deleteFiscalNotificationDocumentV1({
      workspace: reloadedAdvanced,
      ownerScope: OWNER,
      documentId: laterDocumentId,
      deletedAt: "2026-07-16T12:00:00.000Z",
    });
    expect(secondDeletion.status).toBe("APPLIED");
    if (secondDeletion.status !== "APPLIED") return;
    const secondReducedWorkspace =
      registerFiscalNotificationDocumentReductionTransitionV2(
        secondDeletion.workspace,
        reloadedAdvanced,
        OWNER,
        "2026-07-16T12:00:00.000Z",
      );

    expect(secondReducedWorkspace).not.toBeNull();
    const secondReduced = encodeFiscalNotificationsWorkspaceForStorageV2(
      secondReducedWorkspace,
      advanced,
    );
    expect(secondReduced?.transition).toMatchObject({
      kind: "USER_CONFIRMED_DOCUMENT_REDUCTION_V1",
      baseRevision: 4,
      baseDocumentIds: [
        ...advanced.workspace.documents.map(({ id }) => id),
        "document:privacy-runtime:1",
      ].sort(),
      removedDocumentIds: [
        laterDocumentId,
        "document:privacy-runtime:1",
      ].sort(),
    });
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        advanced,
        secondReduced,
        OWNER,
      ),
    ).toBe("INCOMING_ADVANCES");
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        original,
        secondReduced,
        OWNER,
      ),
    ).toBe("DIVERGED");

    const resurrectedDocumentId = "document:privacy-runtime:1";
    const resurrected = {
      ...secondReduced!,
      workspace: {
        ...secondReduced!.workspace,
        revision: secondReduced!.workspace.revision + 1,
        updatedAt: "2026-07-16T13:00:00.000Z",
        documents: [
          ...secondReduced!.workspace.documents,
          original.workspace.documents[0]!,
        ],
        references: [
          ...secondReduced!.workspace.references,
          ...original.workspace.references.filter(
            ({ documentId }) => documentId === resurrectedDocumentId,
          ),
        ],
        dates: [
          ...secondReduced!.workspace.dates,
          ...original.workspace.dates.filter(
            ({ documentId }) => documentId === resurrectedDocumentId,
          ),
        ],
        amounts: [
          ...secondReduced!.workspace.amounts,
          ...original.workspace.amounts.filter(
            ({ documentId }) => documentId === resurrectedDocumentId,
          ),
        ],
        facts: [
          ...secondReduced!.workspace.facts,
          ...original.workspace.facts.filter(
            ({ documentId }) => documentId === resurrectedDocumentId,
          ),
        ],
        evidence: [
          ...secondReduced!.workspace.evidence,
          ...original.workspace.evidence.filter(
            ({ documentId }) => documentId === resurrectedDocumentId,
          ),
        ],
        thirdParties: [
          ...secondReduced!.workspace.thirdParties,
          ...original.workspace.thirdParties.filter(
            ({ documentId }) => documentId === resurrectedDocumentId,
          ),
        ],
      },
      sources: [
        ...secondReduced!.sources,
        ...original.sources.filter(({ documentIds }) =>
          documentIds.includes(resurrectedDocumentId),
        ),
      ],
    };

    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(resurrected, OWNER),
    ).toBeNull();
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        secondReduced,
        resurrected,
        OWNER,
      ),
    ).toBe("DIVERGED");
  });

  it.each(AEAT_DOCUMENT_PROFILE_IDS_V1)(
    "roundtrips the exact family %s through both persistence boundaries",
    (familyId) => {
      const input = workspace();
      input.documents[0]!.documentType = "GENERIC_ADMINISTRATIVE_NOTICE";
      input.documents[0]!.documentSubtype = familyId;
      const first = encodeFiscalNotificationsWorkspaceForStorageV2(input);
      expect(first).not.toBeNull();
      const restored = restoreFiscalNotificationsWorkspaceFromStorageV2(
        first,
        OWNER,
      );
      expect(restored?.documents[0]?.documentSubtype).toBe(familyId);

      const cloned = restored ? structuredClone(restored) : null;
      const second = encodeFiscalNotificationsWorkspaceForStorageV2(cloned);
      expect(second?.workspace.documents[0]).toMatchObject({
        familyId,
        recognitionStatus: "EXACT_FAMILY",
      });
    },
  );

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

  it("accepts only the explicitly confirmed deletion of the last document", () => {
    const currentWorkspace = workspace();
    const current = encodeFiscalNotificationsWorkspaceForStorageV2(
      currentWorkspace,
    )!;
    const deletion = deleteFiscalNotificationDocumentV1({
      workspace: currentWorkspace,
      ownerScope: OWNER,
      documentId: "document:privacy-runtime:1",
      deletedAt: "2026-07-16T09:00:00.000Z",
    });

    expect(deletion.status).toBe("APPLIED");
    if (deletion.status !== "APPLIED") return;
    const unconfirmedReduction = encodeFiscalNotificationsWorkspaceForStorageV2(
      deletion.workspace,
      current,
    )!;
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        current,
        unconfirmedReduction,
        OWNER,
      ),
    ).toBe("DIVERGED");
    const confirmedWorkspace =
      registerFiscalNotificationDocumentReductionTransitionV2(
        deletion.workspace,
        currentWorkspace,
        OWNER,
        "2026-07-16T09:00:00.000Z",
      );
    expect(confirmedWorkspace).not.toBeNull();
    const reduced = encodeFiscalNotificationsWorkspaceForStorageV2(
      confirmedWorkspace,
      current,
    )!;

    expect(reduced.workspace).toMatchObject({ revision: 2, documents: [] });
    expect(reduced.sources).toEqual([]);
    expect(reduced.workspace.accountHolder).toEqual(
      current.workspace.accountHolder,
    );
    expect(reduced.transition).toMatchObject({
      kind: "USER_CONFIRMED_DOCUMENT_REDUCTION_V1",
      removedDocumentIds: ["document:privacy-runtime:1"],
    });
    expect(
      restoreFiscalNotificationsWorkspaceFromStorageV2(reduced, OWNER),
    ).toMatchObject({ revision: 2, documents: [], files: [], packages: [] });
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        current,
        reduced,
        OWNER,
      ),
    ).toBe("INCOMING_ADVANCES");
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        reduced,
        current,
        OWNER,
      ),
    ).toBe("CURRENT_ADVANCES");
  });

  it("rejects declared reductions that alter retained base content", () => {
    const currentWorkspace = workspace();
    const current = encodeFiscalNotificationsWorkspaceForStorageV2(
      currentWorkspace,
    )!;
    const deletion = deleteFiscalNotificationDocumentV1({
      workspace: currentWorkspace,
      ownerScope: OWNER,
      documentId: "document:privacy-runtime:1",
      deletedAt: "2026-07-16T09:00:00.000Z",
    });

    expect(deletion.status).toBe("APPLIED");
    if (deletion.status !== "APPLIED") return;
    const forged = {
      ...structuredClone(current),
      workspace: {
        ...structuredClone(current.workspace),
        revision: current.workspace.revision + 1,
        updatedAt: "2026-07-16T09:00:00.000Z",
      },
      transition: {
        kind: "USER_CONFIRMED_DOCUMENT_REDUCTION_V1" as const,
        ownerScope: OWNER,
        confirmedAt: "2026-07-16T09:00:00.000Z",
        baseWorkspaceId: current.workspace.workspaceId,
        baseCreatedAt: current.workspace.createdAt,
        baseRevision: current.workspace.revision,
        baseUpdatedAt: current.workspace.updatedAt,
        removedDocumentIds: ["document:privacy-runtime:1"],
      },
    };
    const modifiedIdentity = {
      ...structuredClone(forged),
      workspace: {
        ...structuredClone(forged.workspace),
        accountHolder: {
          ...structuredClone(forged.workspace.accountHolder),
          identityMatchStatus: "UNKNOWN",
          identityMatchMethod: "NOT_AVAILABLE",
        },
      },
    };
    const modifiedAmount = structuredClone(forged);
    modifiedAmount.workspace.amounts[0]!.amountCents += 1;

    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        current,
        forged,
        OWNER,
      ),
    ).toBe("DIVERGED");
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        current,
        modifiedIdentity,
        OWNER,
      ),
    ).toBe("DIVERGED");
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        current,
        modifiedAmount,
        OWNER,
      ),
    ).toBe("DIVERGED");
  });

  it("preserves a confirmed reduction across delete then add before sync", () => {
    const baseWorkspace = workspace();
    const base = encodeFiscalNotificationsWorkspaceForStorageV2(baseWorkspace)!;
    const deletion = deleteFiscalNotificationDocumentV1({
      workspace: baseWorkspace,
      ownerScope: OWNER,
      documentId: "document:privacy-runtime:1",
      deletedAt: "2026-07-16T09:00:00.000Z",
    });
    expect(deletion.status).toBe("APPLIED");
    if (deletion.status !== "APPLIED") return;
    const reducedWorkspace =
      registerFiscalNotificationDocumentReductionTransitionV2(
        deletion.workspace,
        baseWorkspace,
        OWNER,
        "2026-07-16T09:00:00.000Z",
      );
    expect(reducedWorkspace).not.toBeNull();
    const reduced = encodeFiscalNotificationsWorkspaceForStorageV2(
      reducedWorkspace,
      base,
    )!;
    expect(reduced.transition).toMatchObject({
      kind: "USER_CONFIRMED_DOCUMENT_REDUCTION_V1",
      ownerScope: OWNER,
      baseRevision: 1,
      removedDocumentIds: ["document:privacy-runtime:1"],
    });

    const readdedWorkspace = workspaceWithNewDocumentGraph();
    const descendant = encodeFiscalNotificationsWorkspaceForStorageV2(
      readdedWorkspace,
      reduced,
    )!;
    expect(descendant.transition).toEqual(reduced.transition);
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        base,
        descendant,
        OWNER,
      ),
    ).toBe("INCOMING_ADVANCES");

    const advancedBaseInput: FiscalNotificationsWorkspace = {
      ...workspace(),
      revision: 2,
      updatedAt: "2026-07-16T09:30:00.000Z",
    };
    const advancedBase = encodeFiscalNotificationsWorkspaceForStorageV2(
      advancedBaseInput,
      base,
    )!;
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        advancedBase,
        descendant,
        OWNER,
      ),
    ).toBe("DIVERGED");
  });

  it("rejects extra deletions or mutations hidden behind a confirmed reduction", () => {
    const baseWorkspace = workspaceWithTwoDocumentGraphs();
    const base = encodeFiscalNotificationsWorkspaceForStorageV2(baseWorkspace)!;
    const deletion = deleteFiscalNotificationDocumentV1({
      workspace: baseWorkspace,
      ownerScope: OWNER,
      documentId: "document:privacy-runtime:1",
      deletedAt: "2026-07-16T09:00:00.000Z",
    });
    expect(deletion.status).toBe("APPLIED");
    if (deletion.status !== "APPLIED") return;
    const reducedWorkspace =
      registerFiscalNotificationDocumentReductionTransitionV2(
        deletion.workspace,
        baseWorkspace,
        OWNER,
        "2026-07-16T09:00:00.000Z",
      );
    const reduced = encodeFiscalNotificationsWorkspaceForStorageV2(
      reducedWorkspace,
      base,
    )!;
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        base,
        reduced,
        OWNER,
      ),
    ).toBe("INCOMING_ADVANCES");

    const mutatedRetainedAmount = structuredClone(reduced);
    mutatedRetainedAmount.workspace.amounts[0]!.amountCents += 1;
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        base,
        mutatedRetainedAmount,
        OWNER,
      ),
    ).toBe("DIVERGED");

    const reductionTransition = reduced.transition;
    expect(reductionTransition?.kind).toBe(
      "USER_CONFIRMED_DOCUMENT_REDUCTION_V1",
    );
    if (
      reductionTransition?.kind !== "USER_CONFIRMED_DOCUMENT_REDUCTION_V1"
    ) {
      return;
    }
    const overbroadAuthorization = {
      ...structuredClone(reduced),
      transition: {
        ...structuredClone(reductionTransition),
        removedDocumentIds: [
          ...reductionTransition.removedDocumentIds,
          "document:privacy-descendant:1",
        ],
      },
    };
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        base,
        overbroadAuthorization,
        OWNER,
      ),
    ).toBe("DIVERGED");

    const removedTooMuch = {
      ...structuredClone(reduced),
      workspace: {
        ...structuredClone(reduced.workspace),
        documents: [],
        references: [],
        dates: [],
        amounts: [],
        facts: [],
        evidence: [],
        thirdParties: [],
        relations: [],
        driveArchives: [],
      },
      sources: [],
    };
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        base,
        removedTooMuch,
        OWNER,
      ),
    ).toBe("DIVERGED");
  });

  it("rejects a chained reduction that omits a newly removed base document", () => {
    const baseWorkspace = workspaceWithTwoDocumentGraphs();
    const base = encodeFiscalNotificationsWorkspaceForStorageV2(baseWorkspace)!;
    const firstDeletion = deleteFiscalNotificationDocumentV1({
      workspace: baseWorkspace,
      ownerScope: OWNER,
      documentId: "document:privacy-runtime:1",
      deletedAt: "2026-07-16T09:00:00.000Z",
    });
    expect(firstDeletion.status).toBe("APPLIED");
    if (firstDeletion.status !== "APPLIED") return;
    const firstWorkspace =
      registerFiscalNotificationDocumentReductionTransitionV2(
        firstDeletion.workspace,
        baseWorkspace,
        OWNER,
        "2026-07-16T09:00:00.000Z",
      );
    expect(firstWorkspace).not.toBeNull();
    const first = encodeFiscalNotificationsWorkspaceForStorageV2(
      firstWorkspace,
      base,
    )!;

    const secondDeletion = deleteFiscalNotificationDocumentV1({
      workspace: firstWorkspace,
      ownerScope: OWNER,
      documentId: "document:privacy-descendant:1",
      deletedAt: "2026-07-16T10:00:00.000Z",
    });
    expect(secondDeletion.status).toBe("APPLIED");
    if (secondDeletion.status !== "APPLIED") return;
    const secondWorkspace =
      registerFiscalNotificationDocumentReductionTransitionV2(
        secondDeletion.workspace,
        firstWorkspace,
        OWNER,
        "2026-07-16T10:00:00.000Z",
      );
    expect(secondWorkspace).not.toBeNull();
    const second = encodeFiscalNotificationsWorkspaceForStorageV2(
      secondWorkspace,
      first,
    )!;
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        first,
        second,
        OWNER,
      ),
    ).toBe("INCOMING_ADVANCES");

    const secondTransition = second.transition;
    expect(secondTransition?.kind).toBe(
      "USER_CONFIRMED_DOCUMENT_REDUCTION_V1",
    );
    if (
      secondTransition?.kind !== "USER_CONFIRMED_DOCUMENT_REDUCTION_V1"
    ) {
      return;
    }
    const forged = {
      ...structuredClone(second),
      transition: {
        ...structuredClone(secondTransition),
        removedDocumentIds: ["document:privacy-runtime:1"],
      },
    };
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(forged, OWNER),
    ).not.toBeNull();
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        first,
        forged,
        OWNER,
      ),
    ).toBe("DIVERGED");
  });

  it("rejects a reduction envelope that resurrects a declared removed id", () => {
    const baseWorkspace = workspaceWithTwoDocumentGraphs();
    const base = encodeFiscalNotificationsWorkspaceForStorageV2(baseWorkspace)!;
    const deletion = deleteFiscalNotificationDocumentV1({
      workspace: baseWorkspace,
      ownerScope: OWNER,
      documentId: "document:privacy-runtime:1",
      deletedAt: "2026-07-16T09:00:00.000Z",
    });
    expect(deletion.status).toBe("APPLIED");
    if (deletion.status !== "APPLIED") return;
    const reducedWorkspace =
      registerFiscalNotificationDocumentReductionTransitionV2(
        deletion.workspace,
        baseWorkspace,
        OWNER,
        "2026-07-16T09:00:00.000Z",
      );
    expect(reducedWorkspace).not.toBeNull();
    const reduced = encodeFiscalNotificationsWorkspaceForStorageV2(
      reducedWorkspace,
      base,
    )!;

    const resurrected = {
      ...structuredClone(base),
      workspace: {
        ...structuredClone(base.workspace),
        revision: 3,
        updatedAt: "2026-07-16T10:00:00.000Z",
      },
      transition: structuredClone(reduced.transition),
    };
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(resurrected, OWNER),
    ).toBeNull();
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        reduced,
        resurrected,
        OWNER,
      ),
    ).toBe("DIVERGED");
  });

  it("registers an explicit empty restart and rejects malformed provenance", () => {
    const oldLineage = encodeFiscalNotificationsWorkspaceForStorageV2(
      workspace(),
    )!;
    const deletion = deleteFiscalNotificationDocumentV1({
      workspace: workspace(),
      ownerScope: OWNER,
      documentId: "document:privacy-runtime:1",
      deletedAt: "2026-07-16T09:00:00.000Z",
    });
    expect(deletion.status).toBe("APPLIED");
    if (deletion.status !== "APPLIED") return;
    const restartedInput: FiscalNotificationsWorkspace = {
      ...deletion.workspace,
      workspaceId: "workspace:privacy-runtime:restart",
      revision: 0,
      createdAt: "2026-07-16T11:00:00.000Z",
      updatedAt: "2026-07-16T11:00:00.000Z",
    };
    const restartedWorkspace =
      registerFiscalNotificationEmptyRestartTransitionV2(
        restartedInput,
        OWNER,
        "2026-07-16T11:00:00.000Z",
      );
    expect(restartedWorkspace).not.toBeNull();
    const restarted = encodeFiscalNotificationsWorkspaceForStorageV2(
      restartedWorkspace,
    )!;
    expect(restarted.transition).toEqual({
      kind: "USER_CONFIRMED_EMPTY_RESTART_V1",
      ownerScope: OWNER,
      confirmedAt: "2026-07-16T11:00:00.000Z",
    });
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        oldLineage,
        restarted,
        OWNER,
      ),
    ).toBe("INCOMING_ADVANCES");

    const wrongOwner = structuredClone(restarted) as unknown as {
      transition: { ownerScope: string };
    };
    wrongOwner.transition.ownerScope = OTHER_OWNER;
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(wrongOwner, OWNER),
    ).toBeNull();
    const unknownKey = structuredClone(restarted) as unknown as {
      transition: Record<string, unknown>;
    };
    unknownKey.transition.unexpected = true;
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(unknownKey, OWNER),
    ).toBeNull();

    const continuedAfterEmptyRestart = {
      ...structuredClone(oldLineage),
      transition: {
        kind: "USER_CONFIRMED_EMPTY_RESTART_V1" as const,
        ownerScope: OWNER,
        confirmedAt: oldLineage.workspace.createdAt,
      },
    };
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
        continuedAfterEmptyRestart,
        OWNER,
      ),
    ).not.toBeNull();
  });

  it("registers the first non-empty descendant after a complete reduction", () => {
    const baseWorkspace = workspace();
    const base = encodeFiscalNotificationsWorkspaceForStorageV2(baseWorkspace)!;
    const deletion = deleteFiscalNotificationDocumentV1({
      workspace: baseWorkspace,
      ownerScope: OWNER,
      documentId: "document:privacy-runtime:1",
      deletedAt: "2026-07-16T09:00:00.000Z",
    });
    expect(deletion.status).toBe("APPLIED");
    if (deletion.status !== "APPLIED") return;
    const reducedWorkspace =
      registerFiscalNotificationDocumentReductionTransitionV2(
        deletion.workspace,
        baseWorkspace,
        OWNER,
        "2026-07-16T09:00:00.000Z",
      );
    expect(reducedWorkspace).not.toBeNull();
    const reduced = encodeFiscalNotificationsWorkspaceForStorageV2(
      reducedWorkspace,
      base,
    )!;

    const restartAt = "2026-07-16T11:00:00.000Z";
    const restartCandidate: FiscalNotificationsWorkspace = {
      ...workspace(),
      workspaceId: "workspace:privacy-runtime:restart-descendant",
      revision: 1,
      createdAt: restartAt,
      updatedAt: restartAt,
    };
    const restartedWorkspace =
      registerFiscalNotificationEmptyRestartDescendantTransitionV2(
        restartCandidate,
        reducedWorkspace,
        OWNER,
        restartAt,
      );
    expect(restartedWorkspace).not.toBeNull();
    const restarted = encodeFiscalNotificationsWorkspaceForStorageV2(
      restartedWorkspace,
      reduced,
    )!;
    expect(restarted.transition).toMatchObject({
      kind: "USER_CONFIRMED_EMPTY_RESTART_V1",
      ownerScope: OWNER,
      confirmedAt: restartAt,
      baseWorkspaceId: reduced.workspace.workspaceId,
      baseCreatedAt: reduced.workspace.createdAt,
      baseRevision: reduced.workspace.revision,
      baseUpdatedAt: reduced.workspace.updatedAt,
      baseEnvelopeSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
    });
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        reduced,
        restarted,
        OWNER,
      ),
    ).toBe("INCOMING_ADVANCES");

    const sameMetadataWithoutReduction =
      encodeFiscalNotificationsWorkspaceForStorageV2(deletion.workspace)!;
    expect(sameMetadataWithoutReduction.workspace).toEqual(reduced.workspace);
    expect(sameMetadataWithoutReduction.transition).toBeUndefined();
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        sameMetadataWithoutReduction,
        restarted,
        OWNER,
      ),
    ).toBe("DIVERGED");

    const deletionAfterRestartSync = deleteFiscalNotificationDocumentV1({
      workspace: restartedWorkspace,
      ownerScope: OWNER,
      documentId: "document:privacy-runtime:1",
      deletedAt: "2026-07-16T12:00:00.000Z",
    });
    expect(deletionAfterRestartSync.status).toBe("APPLIED");
    if (deletionAfterRestartSync.status !== "APPLIED") return;
    const reducedAfterRestartSyncWorkspace =
      registerFiscalNotificationDocumentReductionTransitionV2(
        deletionAfterRestartSync.workspace,
        restartedWorkspace,
        OWNER,
        "2026-07-16T12:00:00.000Z",
      );
    expect(reducedAfterRestartSyncWorkspace).not.toBeNull();
    const reducedAfterRestartSync =
      encodeFiscalNotificationsWorkspaceForStorageV2(
        reducedAfterRestartSyncWorkspace,
        restarted,
      )!;
    expect(reducedAfterRestartSync.transition).toMatchObject({
      ...restarted.transition,
      lineageEnvelopeSha256s: [expect.stringMatching(/^[0-9a-f]{64}$/u)],
    });
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        restarted,
        reducedAfterRestartSync,
        OWNER,
      ),
    ).toBe("INCOMING_ADVANCES");
    expect(
      mergeFiscalNotificationsWorkspaceStorageEnvelopesV2(
        restarted,
        reducedAfterRestartSync,
        OWNER,
      ),
    ).toEqual(reducedAfterRestartSync);

    const remoteSiblingWorkspace = workspaceWithTwoDocumentGraphs();
    remoteSiblingWorkspace.workspaceId = restartCandidate.workspaceId;
    remoteSiblingWorkspace.revision = 2;
    remoteSiblingWorkspace.createdAt = restartAt;
    remoteSiblingWorkspace.updatedAt = "2026-07-16T12:10:00.000Z";
    const remoteSibling = encodeFiscalNotificationsWorkspaceForStorageV2(
      remoteSiblingWorkspace,
      restarted,
    )!;
    const forgedAt = "2026-07-16T12:10:00.000Z";
    const forgedNextGeneration = {
      ...structuredClone(remoteSibling),
      workspace: {
        ...structuredClone(remoteSibling.workspace),
        workspaceId: "workspace:privacy-runtime:forged-generation",
        createdAt: forgedAt,
        updatedAt: forgedAt,
      },
      transition: {
        ...structuredClone(remoteSibling.transition!),
        confirmedAt: forgedAt,
      },
    };
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
        forgedNextGeneration,
        OWNER,
      ),
    ).not.toBeNull();
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        restarted,
        forgedNextGeneration,
        OWNER,
      ),
    ).toBe("DIVERGED");

    const linearDeletion = deleteFiscalNotificationDocumentV1({
      workspace: remoteSiblingWorkspace,
      ownerScope: OWNER,
      documentId: "document:privacy-runtime:1",
      deletedAt: "2026-07-16T12:15:00.000Z",
    });
    expect(linearDeletion.status).toBe("APPLIED");
    if (linearDeletion.status !== "APPLIED") return;
    const linearReducedWorkspace =
      registerFiscalNotificationDocumentReductionTransitionV2(
        linearDeletion.workspace,
        remoteSiblingWorkspace,
        OWNER,
        "2026-07-16T12:15:00.000Z",
      );
    expect(linearReducedWorkspace).not.toBeNull();
    const linearReduced = encodeFiscalNotificationsWorkspaceForStorageV2(
      linearReducedWorkspace,
      remoteSibling,
    )!;
    const linearMixedWorkspace = JSON.parse(
      JSON.stringify(workspaceWithTwoDocumentGraphs()).replaceAll(
        "privacy-runtime",
        "privacy-mixed",
      ),
    ) as FiscalNotificationsWorkspace;
    linearMixedWorkspace.workspaceId = restartCandidate.workspaceId;
    linearMixedWorkspace.revision = 4;
    linearMixedWorkspace.createdAt = restartAt;
    linearMixedWorkspace.updatedAt = "2026-07-16T12:25:00.000Z";
    const linearMixedFile = linearMixedWorkspace.files.find((entry) =>
      entry.id.includes("privacy-mixed"),
    )!;
    linearMixedFile.sha256 = "d".repeat(64);
    linearMixedFile.contentFingerprint = "d".repeat(64);
    const linearMixed = encodeFiscalNotificationsWorkspaceForStorageV2(
      linearMixedWorkspace,
      linearReduced,
    )!;
    expect(linearMixed.workspace.documents).toHaveLength(2);
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        remoteSibling,
        linearMixed,
        OWNER,
      ),
    ).toBe("INCOMING_ADVANCES");
    expect(
      mergeFiscalNotificationsWorkspaceStorageEnvelopesV2(
        remoteSibling,
        linearMixed,
        OWNER,
      ),
    ).toEqual(linearMixed);

    const localSiblingWorkspace = JSON.parse(
      JSON.stringify(workspaceWithTwoDocumentGraphs()).replaceAll(
        "privacy-descendant",
        "privacy-sibling",
      ),
    ) as FiscalNotificationsWorkspace;
    localSiblingWorkspace.workspaceId = restartCandidate.workspaceId;
    localSiblingWorkspace.revision = 2;
    localSiblingWorkspace.createdAt = restartAt;
    localSiblingWorkspace.updatedAt = "2026-07-16T12:20:00.000Z";
    const localSiblingFile = localSiblingWorkspace.files.find((entry) =>
      entry.id.includes("privacy-sibling"),
    )!;
    localSiblingFile.sha256 = "c".repeat(64);
    localSiblingFile.contentFingerprint = "c".repeat(64);
    const localSibling = encodeFiscalNotificationsWorkspaceForStorageV2(
      localSiblingWorkspace,
      restarted,
    )!;
    const localSiblingDeletion = deleteFiscalNotificationDocumentV1({
      workspace: localSiblingWorkspace,
      ownerScope: OWNER,
      documentId: "document:privacy-sibling:1",
      deletedAt: "2026-07-16T12:30:00.000Z",
    });
    expect(localSiblingDeletion.status).toBe("APPLIED");
    if (localSiblingDeletion.status !== "APPLIED") return;
    const localSiblingReducedWorkspace =
      registerFiscalNotificationDocumentReductionTransitionV2(
        localSiblingDeletion.workspace,
        localSiblingWorkspace,
        OWNER,
        "2026-07-16T12:30:00.000Z",
      );
    expect(localSiblingReducedWorkspace).not.toBeNull();
    const localSiblingReduced =
      encodeFiscalNotificationsWorkspaceForStorageV2(
        localSiblingReducedWorkspace,
        localSibling,
      )!;
    expect(localSiblingReduced.workspace.documents).toHaveLength(1);
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        remoteSibling,
        localSiblingReduced,
        OWNER,
      ),
    ).toBe("DIVERGED");
    expect(
      mergeFiscalNotificationsWorkspaceStorageEnvelopesV2(
        remoteSibling,
        localSiblingReduced,
        OWNER,
      ),
    ).toBeNull();

    const saturatedLineage = Array.from({ length: 5_000 }, (_, index) =>
      index.toString(16).padStart(64, "0"),
    );
    const saturatedRestart =
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
        {
          ...structuredClone(restarted),
          transition: {
            ...structuredClone(restarted.transition),
            lineageEnvelopeSha256s: saturatedLineage,
          },
        },
        OWNER,
      );
    expect(saturatedRestart).not.toBeNull();
    if (!saturatedRestart) return;
    const afterSaturatedWorkspace = workspaceWithTwoDocumentGraphs();
    afterSaturatedWorkspace.workspaceId = restartCandidate.workspaceId;
    afterSaturatedWorkspace.revision = 2;
    afterSaturatedWorkspace.createdAt = restartAt;
    afterSaturatedWorkspace.updatedAt = "2026-07-16T14:00:00.000Z";
    const afterSaturated = encodeFiscalNotificationsWorkspaceForStorageV2(
      afterSaturatedWorkspace,
      saturatedRestart,
    )!;
    expect(
      afterSaturated.transition?.kind ===
        "USER_CONFIRMED_EMPTY_RESTART_V1"
        ? afterSaturated.transition.lineageEnvelopeSha256s
        : null,
    ).toHaveLength(5_000);
    expect(
      afterSaturated.transition?.kind ===
        "USER_CONFIRMED_EMPTY_RESTART_V1"
        ? afterSaturated.transition.lineageEnvelopeSha256s
        : [],
    ).not.toContain("0".repeat(64));
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
        afterSaturated,
        OWNER,
      ),
    ).not.toBeNull();

    const concurrentWorkspace: FiscalNotificationsWorkspace = {
      ...workspace(),
      revision: reduced.workspace.revision + 1,
      updatedAt: "2026-07-16T10:00:00.000Z",
    };
    const concurrent = encodeFiscalNotificationsWorkspaceForStorageV2(
      concurrentWorkspace,
    )!;
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        concurrent,
        restarted,
        OWNER,
      ),
    ).toBe("DIVERGED");
    expect(
      mergeFiscalNotificationsWorkspaceStorageEnvelopesV2(
        concurrent,
        restarted,
        OWNER,
      ),
    ).toBeNull();
  });
});
