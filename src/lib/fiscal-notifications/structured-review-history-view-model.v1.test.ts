import { describe, expect, it } from "vitest";
import type { FiscalNotificationsWorkspace } from "./types";
import { projectFiscalNotificationStructuredHistoryV1 } from "./structured-review-history-view-model.v1";

const OWNER = "user:00000000-0000-4000-8000-000000000081";
const CREATED_AT = "2026-07-14T10:30:00.000Z";

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
        id: "package:synthetic-history",
        ownerScope: OWNER,
        fileIds: ["file:synthetic-history"],
        sourceChannel: "MANUAL_UPLOAD",
        processingStatus: "NEEDS_REVIEW",
        securityScanStatus: "NOT_AVAILABLE",
        uploadedAt: CREATED_AT,
      },
    ],
    files: [
      {
        id: "file:synthetic-history",
        packageId: "package:synthetic-history",
        ownerScope: OWNER,
        role: "PRIMARY",
        mimeType: "application/pdf",
        fileSize: 8_192,
        pageCount: 3,
        sha256: "c".repeat(64),
        contentFingerprint: "c".repeat(64),
        sourceContentRetention: "NOT_RETAINED",
        uploadedAt: CREATED_AT,
      },
    ],
    documents: [
      {
        id: "document:synthetic-history",
        packageId: "package:synthetic-history",
        fileId: "file:synthetic-history",
        ownerScope: OWNER,
        documentType: "AEAT_ENFORCEMENT_ORDER",
        titleRaw: "Providencia de apremio AEAT",
        titleNormalized: "PROVIDENCIA DE APREMIO AEAT",
        authorityId: "authority:aeat",
        issueDate: "2026-02-05",
        notificationDates: {},
        subjectParty: {
          displayName: "PERSONA SINTETICA",
          taxIdNormalized: "12345678Z",
          matchesBusinessProfile: "UNKNOWN",
        },
        status: "UNKNOWN",
        urgency: "REVIEW",
        extractionVersion: "1.0.0",
        analysisStatus: "NEEDS_REVIEW",
        humanReviewStatus: "PENDING",
        authenticityStatus: "NOT_CHECKED",
        partIds: [],
        referenceIds: ["reference:liquidation", "reference:csv"],
        debtIds: [],
        caseIds: [],
        analysisSnapshotIds: ["snapshot:synthetic-history"],
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
        officialDomain: "sede.agenciatributaria.gob.es",
      },
    ],
    references: [
      {
        id: "reference:liquidation",
        ownerScope: OWNER,
        referenceType: "LIQUIDATION_KEY",
        rawValue: "LQ-SYNTH-081",
        normalizedValue: "LQ-SYNTH-081",
        issuer: "AEAT",
        scope: "DOCUMENT",
        documentId: "document:synthetic-history",
        isPrimary: true,
        confidence: "EXACT",
        confirmationStatus: "PENDING",
        extractionMethod: "RULE",
        occurrenceIds: ["evidence:reference"],
        createdAt: CREATED_AT,
      },
      {
        id: "reference:csv",
        ownerScope: OWNER,
        referenceType: "CSV",
        rawValue: "CSV-SYNTH-081",
        normalizedValue: "CSV-SYNTH-081",
        issuer: "AEAT",
        scope: "DOCUMENT",
        documentId: "document:synthetic-history",
        isPrimary: false,
        confidence: "EXACT",
        confirmationStatus: "PENDING",
        extractionMethod: "RULE",
        occurrenceIds: ["evidence:csv"],
        createdAt: CREATED_AT,
      },
    ],
    evidence: [
      {
        id: "evidence:reference",
        ownerScope: OWNER,
        documentId: "document:synthetic-history",
        pageNumber: 1,
        textSnippet: "Clave de liquidación",
        rawValue: "LQ-SYNTH-081",
        extractionMethod: "RULE",
        confidence: "EXACT",
        assertionType: "EXPLICIT_IN_DOCUMENT",
      },
      {
        id: "evidence:csv",
        ownerScope: OWNER,
        documentId: "document:synthetic-history",
        pageNumber: 1,
        textSnippet: "Código Seguro de Verificación",
        rawValue: "CSV-SYNTH-081",
        extractionMethod: "RULE",
        confidence: "EXACT",
        assertionType: "EXPLICIT_IN_DOCUMENT",
      },
      {
        id: "evidence:money",
        ownerScope: OWNER,
        documentId: "document:synthetic-history",
        pageNumber: 2,
        textSnippet: "Principal pendiente",
        extractionMethod: "RULE",
        confidence: "EXACT",
        assertionType: "EXPLICIT_IN_DOCUMENT",
      },
      {
        id: "evidence:date",
        ownerScope: OWNER,
        documentId: "document:synthetic-history",
        pageNumber: 3,
        textSnippet: "Fecha de emisión",
        rawValue: "05/02/2026",
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
        id: "snapshot:synthetic-history",
        ownerScope: OWNER,
        documentId: "document:synthetic-history",
        version: 1,
        extractorVersion: "1.0.0",
        rulesVersion: "1.3.0",
        structuredData: {
          schemaVersion: 1,
          documentType: "AEAT_ENFORCEMENT_ORDER",
          administrativeDomain: {
            schemaVersion: 1,
            ownerScope: OWNER,
            documentId: "document:synthetic-history",
            extractorId: "synthetic-history",
            extractorVersion: "1.0.0",
            createdAt: CREATED_AT,
            familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
            status: "REVIEW_REQUIRED",
            roleAssertions: [],
            moneyFacts: [
              {
                id: "money:principal",
                ownerScope: OWNER,
                documentId: "document:synthetic-history",
                kind: "OUTSTANDING_PRINCIPAL",
                amountCents: 123_456,
                currency: "EUR",
                assertionType: "EXPLICIT_IN_DOCUMENT",
                evidenceIds: ["evidence:money"],
                lineageParentIds: [],
                status: "PROPOSED",
                createdAt: CREATED_AT,
              },
            ],
            missingFieldIds: [],
            alternativeFamilyIds: [],
            validationIssues: [],
            materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
            requiresHumanReview: true,
          },
          paymentOptionIds: [],
          unknownFields: [
            {
              labelRaw: "PRINTED_ISSUE_DATE",
              valueRaw: "05/02/2026",
              page: 3,
              evidenceId: "evidence:date",
              confidence: "EXACT",
            },
          ],
          validationCodes: ["AUTHENTICITY_NOT_CHECKED"],
          factSummary: [],
          calculatedSummary: [],
          inferenceSummary: [],
          userConfirmedSummary: [],
          documentFields: {
            title: "Providencia de apremio AEAT",
            issueDate: "2026-02-05",
          },
        },
        plainLanguageExplanation: ["Datos impresos extraídos."],
        validationWarnings: ["Autenticidad no comprobada."],
        evidenceIds: [
          "evidence:reference",
          "evidence:csv",
          "evidence:money",
          "evidence:date",
        ],
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

describe("structured fiscal notification history view model v1", () => {
  it("proyecta datos útiles exactos sin exponer contenido fuente", () => {
    const result = projectFiscalNotificationStructuredHistoryV1(
      workspace(),
      OWNER,
    );

    expect(result.status).toBe("READY");
    expect(result.entries).toEqual([
      expect.objectContaining({
        title: "Providencia de apremio AEAT",
        authority: "Agencia Estatal de Administración Tributaria",
        documentDate: "2026-02-05",
        documentDateBasis: "Fecha de emision",
        subjectName: "PERSONA SINTETICA",
        subjectTaxId: "12345678Z",
        pageCount: 3,
        byteLength: 8_192,
        sourceContentRetention: "NOT_RETAINED",
        originalArchive: null,
        references: [
          { label: "Clave de liquidación", value: "LQ-SYNTH-081" },
          {
            label: "Código Seguro de Verificación (CSV)",
            value: "CSV-SYNTH-081",
          },
        ],
        printedDates: [
          { label: "Fecha de emisión", value: "05/02/2026" },
        ],
        orderedFacts: [
          {
            key: "reference:liquidation",
            semantic: "REFERENCE",
            label: "Clave de liquidación",
            value: "LQ-SYNTH-081",
            pageNumber: 1,
            sourceReference: null,
          },
          {
            key: "reference:csv",
            semantic: "REFERENCE",
            label: "Código Seguro de Verificación (CSV)",
            value: "CSV-SYNTH-081",
            pageNumber: 1,
            sourceReference: null,
          },
          {
            key: "money:principal",
            semantic: "MONEY",
            label: "Principal pendiente",
            value: "1.234,56 €",
            pageNumber: 2,
            sourceReference: null,
          },
          {
            key: "evidence:date",
            semantic: "DATE",
            label: "Fecha de emisión",
            value: "05/02/2026",
            pageNumber: 3,
            sourceReference: null,
          },
        ],
        money: [
          {
            key: "money:principal",
            label: "Principal pendiente",
            kind: "OUTSTANDING_PRINCIPAL",
            amountCents: 123_456,
            currency: "EUR",
            sourceReference: null,
            sourceReferenceType: null,
          },
        ],
      }),
    ]);
    expect(JSON.stringify(result)).not.toMatch(
      /sha256|textSnippet|raw paragraph/i,
    );
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.entries)).toBe(true);
  });

  it("bloquea un workspace de otra cuenta", () => {
    expect(
      projectFiscalNotificationStructuredHistoryV1(
        workspace(),
        "user:00000000-0000-4000-8000-000000000099",
      ),
    ).toEqual({ status: "BLOCKED", entries: [] });
  });

  it("expone únicamente el estado y el identificador seguro del original en Drive", () => {
    const value = workspace();
    value.revision = 2;
    value.updatedAt = "2026-07-15T09:00:00.000Z";
    value.driveArchives = [
      {
        id: `drive-archive:${"c".repeat(64)}`,
        ownerScope: OWNER,
        fileId: "file:synthetic-history",
        documentIds: ["document:synthetic-history"],
        sourceSha256: "c".repeat(64),
        driveFileId: "drive_file_history",
        driveFolderId: "drive_folder_history",
        documentDate: "2026-02-05",
        archiveStatus: "ARCHIVED_VERIFIED",
        reviewStatus: "USER_CONFIRMED",
        verificationMethod: "SHA256_READBACK_MATCH",
        recordVersion: 1,
        workspaceRevision: 2,
        archivedAt: "2026-07-15T09:00:00.000Z",
      },
    ];

    const result = projectFiscalNotificationStructuredHistoryV1(value, OWNER);

    expect(result.status).toBe("READY");
    expect(result.entries[0]?.originalArchive).toEqual({
      status: "ARCHIVED_VERIFIED",
      driveFileId: "drive_file_history",
      sourceSha256: "c".repeat(64),
      documentIds: ["document:synthetic-history"],
      archivedAt: "2026-07-15T09:00:00.000Z",
    });
    expect(JSON.stringify(result)).not.toContain("drive_folder_history");
  });

  it("normaliza solo una fecha documental exacta y no usa cuándo se guardó para la cronología", () => {
    const value = workspace();
    value.documents[0]!.issueDate = undefined;
    value.analysisSnapshots[0]!.structuredData.documentFields.issueDate =
      undefined;
    value.analysisSnapshots[0]!.structuredData.unknownFields = [
      {
        labelRaw: "VSR1|DATE|ISSUE_DATE|Fecha del documento",
        valueRaw: "05/02/2026",
        page: 1,
        confidence: "EXACT",
      },
    ];

    const result = projectFiscalNotificationStructuredHistoryV1(value, OWNER);
    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(result.entries[0]?.documentDate).toBe("2026-02-05");
    expect(result.entries[0]?.documentDateBasis).toBe("Fecha de emision");

    value.analysisSnapshots[0]!.structuredData.unknownFields[0]!.confidence =
      "MEDIUM";
    const uncertain = projectFiscalNotificationStructuredHistoryV1(
      value,
      OWNER,
    );
    expect(uncertain.status).toBe("READY");
    if (uncertain.status !== "READY") return;
    expect(uncertain.entries[0]?.documentDate).toBeNull();
    expect(uncertain.entries[0]?.documentDateBasis).toBeNull();
  });

  it("usa firma, acto o notificación exactos como respaldo sin recurrir a la fecha de escaneo", () => {
    const signature = workspace();
    signature.documents[0]!.issueDate = undefined;
    signature.analysisSnapshots[0]!.structuredData.documentFields.issueDate =
      undefined;
    signature.documents[0]!.signatureDate = "2026-02-06";
    expect(
      projectFiscalNotificationStructuredHistoryV1(signature, OWNER),
    ).toMatchObject({
      status: "READY",
      entries: [
        { documentDate: "2026-02-06", documentDateBasis: "Fecha de firma" },
      ],
    });

    const action = workspace();
    action.documents[0]!.issueDate = undefined;
    action.analysisSnapshots[0]!.structuredData.documentFields.issueDate =
      undefined;
    action.analysisSnapshots[0]!.structuredData.unknownFields = [
      {
        labelRaw: "VSR1|DATE|ACTION_DATE|Fecha del acuerdo",
        valueRaw: "07/02/2026",
        page: 1,
        confidence: "EXACT",
      },
    ];
    expect(
      projectFiscalNotificationStructuredHistoryV1(action, OWNER),
    ).toMatchObject({
      status: "READY",
      entries: [
        { documentDate: "2026-02-07", documentDateBasis: "Fecha del acto" },
      ],
    });

    const notified = workspace();
    notified.documents[0]!.issueDate = undefined;
    notified.analysisSnapshots[0]!.structuredData.documentFields.issueDate =
      undefined;
    notified.analysisSnapshots[0]!.structuredData.unknownFields = [];
    notified.documents[0]!.notificationDates.effectiveAt =
      "2026-02-08T08:30:00.000Z";
    expect(
      projectFiscalNotificationStructuredHistoryV1(notified, OWNER),
    ).toMatchObject({
      status: "READY",
      entries: [
        {
          documentDate: "2026-02-08",
          documentDateBasis: "Fecha de notificacion",
        },
      ],
    });
  });

  it("recupera las etiquetas exactas del extractor sin duplicar referencias ni importes", () => {
    const value = workspace();
    const snapshot = value.analysisSnapshots[0]!;
    snapshot.structuredData.unknownFields = [
      {
        labelRaw: "VSR1|REFERENCE|LIQUIDATION_KEY|Clave exacta",
        valueRaw: "LQ-SYNTH-081",
        page: 1,
        evidenceId: "evidence:reference",
        confidence: "EXACT",
      },
      {
        labelRaw: "VSR1|MONEY|PRINCIPAL|Principal exacto",
        valueRaw: "1.234,56 €",
        page: 2,
        evidenceId: "evidence:money",
        confidence: "EXACT",
      },
      {
        labelRaw: "VSR1|DATE|ISSUE_DATE|Fecha exacta de emisión",
        valueRaw: "05/02/2026",
        page: 3,
        evidenceId: "evidence:date",
        confidence: "EXACT",
      },
    ];

    const result = projectFiscalNotificationStructuredHistoryV1(value, OWNER);
    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(result.entries[0]?.references[0]).toEqual({
      label: "Clave exacta",
      value: "LQ-SYNTH-081",
    });
    expect(result.entries[0]?.money[0]).toEqual(
      expect.objectContaining({ label: "Principal exacto" }),
    );
    expect(result.entries[0]?.printedDates).toEqual([
      { label: "Fecha exacta de emisión", value: "05/02/2026" },
    ]);
    expect(result.entries[0]?.orderedFacts).toEqual([
      expect.objectContaining({
        label: "Clave exacta",
        value: "LQ-SYNTH-081",
        pageNumber: 1,
      }),
      expect.objectContaining({
        label: "Código Seguro de Verificación (CSV)",
        value: "CSV-SYNTH-081",
        pageNumber: 1,
      }),
      expect.objectContaining({
        label: "Principal exacto",
        value: "1.234,56 €",
        pageNumber: 2,
      }),
      expect.objectContaining({
        label: "Fecha exacta de emisión",
        value: "05/02/2026",
        pageNumber: 3,
      }),
    ]);
  });

  it("proyecta las cuotas impresas guardadas con importe, fecha y desglose", () => {
    const value = workspace();
    value.analysisSnapshots[0]!.structuredData.paymentOptionIds = [
      "payment-option:synthetic-history",
    ];
    value.paymentOptions.push({
      id: "payment-option:synthetic-history",
      ownerScope: OWNER,
      documentId: "document:synthetic-history",
      title: "Cuota impresa 1 · liquidación 1",
      eligibilityCondition: "Dato impreso pendiente de revisión.",
      components: [
        {
          type: "PRINCIPAL",
          amountCents: 100_000,
          assertionType: "EXPLICIT_IN_DOCUMENT",
          evidenceIds: ["evidence:money"],
        },
        {
          type: "INTEREST",
          amountCents: 5_000,
          assertionType: "EXPLICIT_IN_DOCUMENT",
          evidenceIds: ["evidence:money"],
        },
      ],
      totalCents: 105_000,
      deadline: "2026-02-20",
      deadlineStatus: "DOCUMENT_STATED",
      evidenceIds: ["evidence:money", "evidence:date"],
    });

    expect(
      projectFiscalNotificationStructuredHistoryV1(value, OWNER),
    ).toMatchObject({
      status: "READY",
      entries: [
        {
          installments: [
            {
              label: "Cuota impresa 1 · liquidación 1",
              amountCents: 105_000,
              dueDate: "2026-02-20",
              components: [
                { label: "Principal", amountCents: 100_000 },
                { label: "Intereses", amountCents: 5_000 },
              ],
            },
          ],
        },
      ],
    });
  });

  it("presenta historial vacío cuando todavía no existe workspace", () => {
    expect(
      projectFiscalNotificationStructuredHistoryV1(undefined, OWNER),
    ).toEqual({
      status: "READY",
      entries: [],
    });
  });
});
