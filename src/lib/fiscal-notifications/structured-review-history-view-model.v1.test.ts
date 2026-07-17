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
        subjectName: null,
        subjectTaxId: null,
        pageCount: 3,
        byteLength: 8_192,
        sourceContentRetention: "NOT_RETAINED",
        originalArchive: null,
        references: [
          { label: "Clave de liquidación", value: "LQ-SYNTH-081" },
          {
            label: "Código Seguro de Verificación (CSV)",
            value: "Referencia protegida",
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
            value: "Referencia protegida",
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
      /sha256|textSnippet|raw paragraph|PERSONA SINTETICA|12345678Z|CSV-SYNTH-081/i,
    );
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.entries)).toBe(true);
  });

  it("usa la explicación V2 específica de la familia guardada sin red ni efectos automáticos", () => {
    const value = workspace();
    const document = value.documents[0]!;
    document.documentType = "GENERIC_ADMINISTRATIVE_NOTICE";
    document.documentSubtype = "sanction.resolution";
    document.titleRaw = "Resolución sancionadora";
    document.titleNormalized = "RESOLUCION SANCIONADORA";

    const result = projectFiscalNotificationStructuredHistoryV1(value, OWNER);

    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    const explanation = result.entries[0]?.explanation;
    expect(explanation).toMatchObject({
      ruleId: "profile.sanction.resolution.explanation.v2",
      ruleVersion: "2.0.0",
      status: "PARTIAL",
      whatItIs:
        "Es la resolución que decide el expediente sancionador y fija, reduce, anula o no impone la sanción.",
      whyReceived:
        "Se emite después de la instrucción y del trámite de audiencia o alegaciones.",
      nextStep: {
        status: "REVIEW_DOCUMENT_ACTION",
        detail:
          "Comprueba importe, condiciones de reducción, pago, recursos y fecha de notificación.",
      },
      deadline: {
        status: "NOT_IDENTIFIED",
        detail: expect.stringContaining(
          "no desde la firma ni desde el escaneo",
        ),
      },
      keyFacts: [],
      networkPolicy: "NO_NETWORK",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    expect(explanation?.whatItIs).not.toContain(
      "una notificación administrativa",
    );
    expect(explanation?.officialSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "AEAT_SANCTION",
          authority: "AEAT",
          canonicalUrl: expect.stringMatching(
            /^https:\/\/sede\.agenciatributaria\.gob\.es\//u,
          ),
        }),
        expect.objectContaining({
          id: "LGT",
          authority: "BOE",
          canonicalUrl: expect.stringMatching(/^https:\/\/www\.boe\.es\//u),
        }),
      ]),
    );
    expect(explanation?.officialSources).not.toHaveLength(0);
    expect(Object.isFrozen(explanation)).toBe(true);
    expect(Object.isFrozen(explanation?.officialSources)).toBe(true);
  });

  it("reconstruye fechas e importes VSR2 al reabrir la ficha y conserva el disparador del plazo", () => {
    const value = workspace();
    const document = value.documents[0]!;
    document.documentType = "GENERIC_ADMINISTRATIVE_NOTICE";
    document.documentSubtype = "sanction.resolution";
    document.titleRaw = "Resolución sancionadora";
    document.titleNormalized = "RESOLUCION SANCIONADORA";
    document.issueDate = undefined;
    value.analysisSnapshots[0]!.structuredData.documentFields.issueDate = undefined;
    value.analysisSnapshots[0]!.structuredData.unknownFields = [
      {
        labelRaw:
          "VSR2|profile:date:EFFECTIVE_NOTIFICATION_DATE:0|DATE|EFFECTIVE_NOTIFICATION_DATE|Fecha de notificación efectiva",
        valueRaw: "2026-02-08",
        page: 3,
        evidenceId: "evidence:date",
        confidence: "EXACT",
      },
      {
        labelRaw:
          "VSR2|profile:money:SANCTION_REDUCED:1|MONEY|PENALTY|Sanción reducida",
        valueRaw: "123456",
        page: 2,
        evidenceId: "evidence:money",
        confidence: "EXACT",
      },
    ];

    const result = projectFiscalNotificationStructuredHistoryV1(value, OWNER);

    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(result.entries[0]).toMatchObject({
      documentDate: "2026-02-08",
      documentDateBasis: "Fecha de notificacion",
      explanation: {
        ruleId: "profile.sanction.resolution.explanation.v2",
        deadline: { status: "DOCUMENT_STATED" },
        keyFacts: expect.arrayContaining([
          expect.objectContaining({ value: expect.stringContaining("1.234,56") }),
        ]),
      },
    });
    expect(JSON.stringify(result)).not.toContain("12345678Z");
  });

  it("reabre una familia V9 con su explicación específica y fuentes oficiales", () => {
    const value = workspace();
    const document = value.documents[0]!;
    document.documentType = "GENERIC_ADMINISTRATIVE_NOTICE";
    document.documentSubtype = "procedure.deadline_extension_request";
    document.titleRaw = "Solicitud o justificante de ampliación de plazo";
    document.titleNormalized =
      "SOLICITUD O JUSTIFICANTE DE AMPLIACION DE PLAZO";

    const result = projectFiscalNotificationStructuredHistoryV1(value, OWNER);

    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(result.entries[0]?.explanation).toMatchObject({
      ruleId:
        "profile.procedure.deadline_extension_request.explanation.v2",
      whatItIs: expect.stringContaining("más tiempo"),
      officialSources: expect.arrayContaining([
        expect.objectContaining({ authority: "AEAT" }),
      ]),
    });
    expect(result.entries[0]?.explanation.whatItIs).not.toContain(
      "no se ha identificado",
    );
  });

  it("reconstruye un efecto variable controlado al reabrir sin conservar la frase fuente", () => {
    const value = workspace();
    const document = value.documents[0]!;
    document.documentType = "GENERIC_ADMINISTRATIVE_NOTICE";
    document.documentSubtype = "review.suspension_decision";
    document.titleRaw = "Acuerdo sobre la suspensión solicitada";
    document.titleNormalized = "ACUERDO SOBRE LA SUSPENSION SOLICITADA";
    value.evidence.push(
      {
        id: "evidence:recognition",
        ownerScope: OWNER,
        documentId: document.id,
        pageNumber: 1,
        textSnippet: "Reconocimiento documental",
        rawValue: "EXACT_TITLE_AND_AUTHORITY",
        extractionMethod: "RULE",
        confidence: "EXACT",
        assertionType: "EXPLICIT_IN_DOCUMENT",
      },
      {
        id: "evidence:effect",
        ownerScope: OWNER,
        documentId: document.id,
        pageNumber: 2,
        textSnippet: "Resultado del documento",
        rawValue: "EFFECT:SUSPENSION_GRANTED",
        extractionMethod: "RULE",
        confidence: "EXACT",
        assertionType: "EXPLICIT_IN_DOCUMENT",
      },
    );
    value.analysisSnapshots[0]!.evidenceIds.push(
      "evidence:recognition",
      "evidence:effect",
    );
    value.analysisSnapshots[0]!.structuredData.unknownFields = [
      {
        labelRaw:
          "VSR2|profile:recognition:document-type:0|DETAIL|FACT_OR_GROUND|Reconocimiento documental",
        valueRaw: "EXACT_TITLE_AND_AUTHORITY",
        page: 1,
        evidenceId: "evidence:recognition",
        confidence: "EXACT",
      },
      {
        labelRaw:
          "VSR2|profile:effect:SUSPENSION_GRANTED:0|DETAIL|FACT_OR_GROUND|Resultado del documento",
        valueRaw: "EFFECT:SUSPENSION_GRANTED",
        page: 2,
        evidenceId: "evidence:effect",
        confidence: "EXACT",
      },
    ];

    const result = projectFiscalNotificationStructuredHistoryV1(value, OWNER);

    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(result.entries[0]?.explanation.result).toContain(
      "suspensión solicitada fue concedida",
    );
    expect(result.entries[0]?.printedDates).toEqual([]);
    expect(result.entries[0]?.orderedFacts).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ value: "EFFECT:SUSPENSION_GRANTED" }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("EFFECT:SUSPENSION_GRANTED");
  });

  it("reconstruye el efecto intrínseco desde el reconocimiento exacto guardado", () => {
    const value = workspace();
    const document = value.documents[0]!;
    document.documentType = "GENERIC_ADMINISTRATIVE_NOTICE";
    document.documentSubtype = "collection.interest_assessment";
    document.titleRaw = "Liquidación independiente de intereses de demora";
    document.titleNormalized = "LIQUIDACION INDEPENDIENTE DE INTERESES DE DEMORA";
    value.evidence.push({
      id: "evidence:recognition-intrinsic",
      ownerScope: OWNER,
      documentId: document.id,
      pageNumber: 1,
      textSnippet: "Reconocimiento documental",
      rawValue: "EXACT_TITLE_AND_AUTHORITY",
      extractionMethod: "RULE",
      confidence: "EXACT",
      assertionType: "EXPLICIT_IN_DOCUMENT",
    });
    value.analysisSnapshots[0]!.evidenceIds.push(
      "evidence:recognition-intrinsic",
    );
    value.analysisSnapshots[0]!.structuredData.unknownFields = [
      {
        labelRaw:
          "VSR2|profile:recognition:document-type:0|DETAIL|FACT_OR_GROUND|Reconocimiento documental",
        valueRaw: "EXACT_TITLE_AND_AUTHORITY",
        page: 1,
        evidenceId: "evidence:recognition-intrinsic",
        confidence: "EXACT",
      },
    ];

    const result = projectFiscalNotificationStructuredHistoryV1(value, OWNER);
    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(result.entries[0]?.explanation.result).toContain(
      "liquidación separada de intereses",
    );
  });

  it("oculta referencias sensibles también como origen de importes", () => {
    const value = workspace();
    const bankReference = value.references.find(
      (reference) => reference.id === "reference:liquidation",
    )!;
    bankReference.referenceType = "PAYMENT_JUSTIFICANTE";
    bankReference.rawValue = "BANK-SYNTH-SECRET-081";
    bankReference.normalizedValue = "BANK-SYNTH-SECRET-081";
    value.analysisSnapshots[0]!.structuredData.unknownFields = [
      {
        labelRaw:
          "VSR2|profile:reference:BANK_REFERENCE:0|REFERENCE|BANK_REFERENCE|Referencia bancaria",
        valueRaw: "BANK-SYNTH-SECRET-081",
        page: 1,
        evidenceId: "evidence:reference",
        confidence: "EXACT",
      },
    ];
    const moneyFact = value.analysisSnapshots[0]!.structuredData
      .administrativeDomain!.moneyFacts[0]!;
    Object.assign(moneyFact as { sourceActRefId?: string }, {
      sourceActRefId: "reference:liquidation",
    });

    const result = projectFiscalNotificationStructuredHistoryV1(value, OWNER);

    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(result.entries[0]?.money[0]?.sourceReference).toBe(
      "Referencia protegida",
    );
    expect(
      result.entries[0]?.orderedFacts.find(
        (fact) => fact.key === "money:principal",
      )?.sourceReference,
    ).toBe("Referencia protegida");
    expect(JSON.stringify(result)).not.toContain("CSV-SYNTH-081");
    expect(JSON.stringify(result)).not.toContain("BANK-SYNTH-SECRET-081");
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
    signature.analysisSnapshots[0]!.structuredData.unknownFields = [];
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

  it("no usa inicio o fin de intereses como fecha documental de una liquidación", () => {
    const value = workspace();
    value.documents[0]!.documentType = "GENERIC_ADMINISTRATIVE_NOTICE";
    value.documents[0]!.documentSubtype = "collection.interest_assessment";
    value.documents[0]!.issueDate = undefined;
    value.documents[0]!.signatureDate = undefined;
    value.documents[0]!.notificationDates.effectiveAt = undefined;
    value.analysisSnapshots[0]!.structuredData.documentFields.issueDate =
      undefined;
    value.analysisSnapshots[0]!.structuredData.unknownFields = [
      {
        labelRaw:
          "VSR2|profile:date:INTEREST_START_DATE:0|DATE|ACTION_DATE|Inicio del período de intereses",
        valueRaw: "2025-01-01",
        page: 1,
        confidence: "EXACT",
      },
      {
        labelRaw:
          "VSR2|profile:date:INTEREST_END_DATE:1|DATE|ACTION_DATE|Fin del período de intereses",
        valueRaw: "2025-12-31",
        page: 1,
        confidence: "EXACT",
      },
    ];

    const result = projectFiscalNotificationStructuredHistoryV1(value, OWNER);

    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(result.entries[0]?.documentDate).toBeNull();
    expect(result.entries[0]?.documentDateBasis).toBeNull();
    expect(result.entries[0]?.printedDates).toEqual([
      { label: "Inicio del período de intereses", value: "2025-01-01" },
      { label: "Fin del período de intereses", value: "2025-12-31" },
    ]);
  });

  it("aplica la prioridad emisión, firma, acto y notificación entre todos los campos exactos", () => {
    const value = workspace();
    value.documents[0]!.issueDate = undefined;
    value.documents[0]!.signatureDate = "2026-02-06";
    value.analysisSnapshots[0]!.structuredData.documentFields.issueDate =
      undefined;
    value.analysisSnapshots[0]!.structuredData.unknownFields = [
      {
        labelRaw:
          "VSR2|profile:date:ISSUE_DATE:0|DATE|ISSUE_DATE|Fecha de emisión",
        valueRaw: "2026-02-05",
        page: 1,
        confidence: "EXACT",
      },
      {
        labelRaw:
          "VSR2|profile:date:ACTION_DATE:1|DATE|ACTION_DATE|Fecha del acto",
        valueRaw: "2026-02-07",
        page: 1,
        confidence: "EXACT",
      },
      {
        labelRaw:
          "VSR2|profile:date:EFFECTIVE_NOTIFICATION_DATE:2|DATE|EFFECTIVE_NOTIFICATION_DATE|Fecha de notificación efectiva",
        valueRaw: "2026-02-08",
        page: 1,
        confidence: "EXACT",
      },
    ];

    expect(
      projectFiscalNotificationStructuredHistoryV1(value, OWNER),
    ).toMatchObject({
      status: "READY",
      entries: [
        { documentDate: "2026-02-05", documentDateBasis: "Fecha de emision" },
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
        value: "Referencia protegida",
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
