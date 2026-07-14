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
        subjectName: "PERSONA SINTETICA",
        subjectTaxId: "12345678Z",
        pageCount: 3,
        byteLength: 8_192,
        sourceContentRetention: "NOT_RETAINED",
        references: [
          { label: "Clave de liquidación", value: "LQ-SYNTH-081" },
          {
            label: "Código Seguro de Verificación (CSV)",
            value: "CSV-SYNTH-081",
          },
        ],
        printedDates: [
          { label: "Fecha de emisión impresa", value: "05/02/2026" },
        ],
        money: [
          {
            label: "Principal pendiente impreso",
            amountCents: 123_456,
            currency: "EUR",
          },
        ],
      }),
    ]);
    expect(JSON.stringify(result)).not.toMatch(/sha256|textSnippet|raw paragraph/i);
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

  it("presenta historial vacío cuando todavía no existe workspace", () => {
    expect(projectFiscalNotificationStructuredHistoryV1(undefined, OWNER)).toEqual({
      status: "READY",
      entries: [],
    });
  });
});
