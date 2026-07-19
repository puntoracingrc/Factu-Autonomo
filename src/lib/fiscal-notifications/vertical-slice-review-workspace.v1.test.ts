import { describe, expect, it, vi } from "vitest";
import { commitAppDataDurably } from "../app-data-durability";
import { EMPTY_DATA, type AppData } from "../types";
import type { FiscalNotificationLocalAnalysisResult } from "./local-review-flow";
import type { BoundedDocumentInput } from "./input-contract";
import { analyzeFiscalNotificationDocumentInput } from "./document-input-analysis";
import { analyzeFiscalNotificationVerticalSliceV1 } from "./extractor-core/vertical-slice-orchestrator.v1";
import { projectFiscalNotificationStructuredHistoryV1 } from "./structured-review-history-view-model.v1";
import { runSaveFiscalNotificationStructuredReviewCommandV1 } from "./structured-review-save-command.v1";
import {
  projectFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewFieldV1,
} from "./vertical-slice-review.v1";
import {
  FiscalNotificationVerticalSliceWorkspaceErrorV1,
  appendFiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review-workspace.v1";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";

const OWNER = "user:00000000-0000-4000-8000-000000000101";
const OTHER_OWNER = "user:00000000-0000-4000-8000-000000000102";
const REVIEW_ID = "review:00000000-0000-4000-8000-000000000103";
const SECOND_REVIEW_ID = "review:00000000-0000-4000-8000-000000000104";
const CREATED_AT = "2026-07-14T20:00:00.000Z";
const HASH = "a".repeat(64);

const BANK_SEIZURE = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS",
  "Número de diligencia: EMB-SYN-WORKSPACE-001",
  "Número de expediente: EXP-SYN-WORKSPACE-001",
  "Clave de deuda: DEBT-SYN-WORKSPACE-001",
  "Deudor: PERSONA DEUDORA SINTÉTICA",
  "NIF del deudor: 12345678Z",
  "Destinatario: BANCO SINTÉTICO",
  "NIF del destinatario: A12345674",
  "Entidad financiera: BANCO SINTÉTICO",
  "IBAN: ES00 0000 0000 0000 1234",
  "Principal: 1.000,00 EUR",
  "Límite del embargo: 1.240,00 EUR",
  "Importe retenido: 900,00 EUR",
  "Fecha del embargo: 04/03/2026",
].join("\n");

const REAL_ESTATE_SEIZURE = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "DILIGENCIA DE EMBARGO DE BIENES INMUEBLES",
  "Número de diligencia: EMB-SYN-WORKSPACE-ASSET-001",
  "Clave de deuda: DEBT-SYN-WORKSPACE-ASSET-001",
  "Número de finca: FINCA-SINTÉTICA-WORKSPACE-001",
  "Fecha del embargo: 04/03/2026",
].join("\n");

function field(
  overrides: Record<string, unknown>,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  const candidate: Record<string, unknown> = {
    fieldId: "status:document",
    semantic: "STATUS",
    canonicalType: "DOCUMENT_STATUS",
    label: "Estado del documento",
    displayValue: "Pendiente de revisión",
    normalizedValue: null,
    amountCents: null,
    currency: null,
    sourcePageNumbers: Object.freeze([1]),
    sourceLabel: "Estado extraído del documento",
    confidence: 1,
    reviewStatus: "REVIEW_REQUIRED",
    ...overrides,
  };
  candidate.sourceLabel = candidate.label;
  if (candidate.semantic === "DATE" && typeof candidate.normalizedValue === "string") {
    const [year, month, day] = candidate.normalizedValue.split("-");
    candidate.displayValue = `${day}/${month}/${year}`;
  }
  if (candidate.semantic === "PARTY") {
    if (candidate.canonicalType === "ISSUING_AUTHORITY") {
      candidate.displayValue = "AEAT";
      candidate.normalizedValue = "AEAT";
    } else {
      candidate.displayValue = "Interviniente 1";
      candidate.normalizedValue = `ROLE:${String(candidate.canonicalType)}:1`;
    }
  }
  if (candidate.semantic === "DETAIL" || candidate.semantic === "OBLIGATION") {
    candidate.displayValue = "Detectado en el documento";
    candidate.normalizedValue = String(candidate.canonicalType);
  }
  if (candidate.semantic === "REFERENCE" && candidate.canonicalType === "NRC") {
    const fingerprint = "b".repeat(64);
    candidate.displayValue = `Huella protegida ${fingerprint.slice(0, 12)}…`;
    candidate.normalizedValue = fingerprint;
  }
  return Object.freeze(
    candidate,
  ) as unknown as FiscalNotificationVerticalSliceReviewFieldV1;
}

function analysis(sha256 = HASH): FiscalNotificationLocalAnalysisResult {
  return Object.freeze({
    schemaVersion: 6,
    analysisVersion: "6.0.0",
    technicalReview: Object.freeze({
      schemaVersion: 1,
      flowVersion: "1.0.0",
      status: "REVIEW_REQUIRED",
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      engineId: "fiscal-notification-family-candidate-engine",
      engineVersion: "1.4.0",
      pageCount: 3,
      byteLength: 12_345,
      sha256,
      candidates: Object.freeze([]),
      selectedFamilyId: null,
      providerCalled: false,
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      retainedSourceContent: "NONE",
    }),
    ephemeralEnforcementMoneyFacts: null,
    ephemeralEnforcementExplicitFields: null,
    ephemeralEnforcementPartyFacts: null,
    ephemeralDeferralGrantFacts: null,
    ephemeralOffsetAgreementFacts: null,
    ephemeralVerticalSliceReview: Object.freeze({
      schemaVersion: 1,
      reviewVersion: "1.0.0",
      status: "REVIEW_REQUIRED",
      documents: Object.freeze([
        Object.freeze({
          reviewDocumentId: "review-document:assessment",
          extractorId: "assessment",
          familyId: "assessment.final_provisional_assessment",
          title: "Liquidación provisional",
          subtitle: "Liquidación provisional emitida",
          pageFrom: 1,
          pageTo: 2,
          confidence: 1,
          fields: Object.freeze([
            field({}),
            field({
              fieldId: "reference:1:DEBT_KEY",
              semantic: "REFERENCE",
              canonicalType: "DEBT_KEY",
              label: "Clave de deuda",
              displayValue: "SYNTH-DEBT-101",
              normalizedValue: "SYNTH-DEBT-101",
              sourcePageNumbers: Object.freeze([1]),
              sourceLabel: "Clave de deuda",
            }),
            field({
              fieldId: "money:quota",
              semantic: "MONEY",
              canonicalType: "TAX_QUOTA",
              label: "Cuota",
              displayValue: "1.234,56 €",
              amountCents: 123_456,
              currency: "EUR",
              sourcePageNumbers: Object.freeze([2]),
              sourceLabel: "Cuota resultante",
            }),
            field({
              fieldId: "date:issue",
              semantic: "DATE",
              canonicalType: "ISSUE_DATE",
              label: "Fecha de emisión",
              displayValue: "14/07/2026",
              normalizedValue: "2026-07-14",
              sourcePageNumbers: Object.freeze([1]),
              sourceLabel: "Fecha de emisión",
            }),
            field({
              fieldId: "party:taxpayer",
              semantic: "PARTY",
              canonicalType: "TAXPAYER",
              label: "Obligado tributario",
              displayValue: "PERSONA SINTÉTICA",
              sourcePageNumbers: Object.freeze([1]),
              sourceLabel: "Obligado tributario",
            }),
          ]),
          warnings: Object.freeze([
            "SYNTHETIC_RAW_WARNING_SHOULD_NOT_PERSIST",
          ]),
          requiresHumanReview: true,
        }),
        Object.freeze({
          reviewDocumentId: "review-document:payment-evidence",
          extractorId: "payment-evidence",
          familyId: "payment.receipt",
          title: "Justificante de pago",
          subtitle: "Pago confirmado en el justificante",
          pageFrom: 3,
          pageTo: 3,
          confidence: 1,
          fields: Object.freeze([
            field({
              displayValue: "Pago confirmado en el justificante",
              sourcePageNumbers: Object.freeze([3]),
            }),
            field({
              fieldId: "reference:1:DEBT_KEY",
              semantic: "REFERENCE",
              canonicalType: "DEBT_KEY",
              label: "Clave de deuda",
              displayValue: "SYNTH-DEBT-101",
              normalizedValue: "SYNTH-DEBT-101",
              sourcePageNumbers: Object.freeze([3]),
              sourceLabel: "Clave de deuda",
            }),
            field({
              fieldId: "reference:2:NRC",
              semantic: "REFERENCE",
              canonicalType: "NRC",
              label: "NRC",
              displayValue: "SYNTH-NRC-101",
              normalizedValue: "SYNTH-NRC-101",
              sourcePageNumbers: Object.freeze([3]),
              sourceLabel: "NRC",
            }),
            field({
              fieldId: "money:paid",
              semantic: "MONEY",
              canonicalType: "TOTAL_PAID",
              label: "Total pagado",
              displayValue: "1.234,56 €",
              amountCents: 123_456,
              currency: "EUR",
              sourcePageNumbers: Object.freeze([3]),
              sourceLabel: "Importe pagado",
            }),
          ]),
          warnings: Object.freeze([]),
          requiresHumanReview: true,
        }),
      ]),
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    }),
    textAcquisition: Object.freeze({
      mode: "PDF_TEXT_LAYER",
      averageConfidence: null,
    }),
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

function repeatedExtractorAnalysis(input?: {
  readonly sameFamily?: boolean;
}): FiscalNotificationLocalAnalysisResult {
  const source = structuredClone(analysis()) as unknown as {
    ephemeralVerticalSliceReview: {
      documents: Array<{
        extractorId: string;
        familyId: string;
        title: string;
        subtitle: string;
      }>;
    };
  };
  const [first, second] = source.ephemeralVerticalSliceReview.documents;
  if (!first || !second) throw new Error("SYNTHETIC_FIXTURE_INVALID");
  second.extractorId = first.extractorId;
  if (input?.sameFamily) {
    second.familyId = first.familyId;
    second.title = "Liquidación provisional";
    second.subtitle = "Liquidación provisional emitida";
  }
  return source as unknown as FiscalNotificationLocalAnalysisResult;
}

function notificationAnalysis(): FiscalNotificationLocalAnalysisResult {
  const source = structuredClone(analysis()) as unknown as {
    technicalReview: { pageCount: number; byteLength: number };
    ephemeralVerticalSliceReview: { documents: unknown[] };
  };
  source.technicalReview.pageCount = 1;
  source.technicalReview.byteLength = 4_321;
  source.ephemeralVerticalSliceReview.documents = [
    {
      reviewDocumentId: "review-document:notification-envelope",
      extractorId: "notification-envelope",
      familyId: "notification.dehu_envelope",
      title: "Sobre o acuse de notificación electrónica",
      subtitle: "Notificación accedida o aceptada",
      pageFrom: 1,
      pageTo: 1,
      confidence: 1,
      fields: [
        field({
          displayValue: "Notificación accedida o aceptada",
        }),
        field({
          fieldId: "reference:notification",
          semantic: "REFERENCE",
          canonicalType: "NOTIFICATION_ID",
          label: "Notificación",
          displayValue: "NOT-SYN-WORKSPACE-001",
          normalizedValue: "NOT-SYN-WORKSPACE-001",
          sourceLabel: "Identificador de la notificación",
        }),
        field({
          fieldId: "reference:act",
          semantic: "REFERENCE",
          canonicalType: "ACT_ID",
          label: "Acto o requerimiento",
          displayValue: "ACT-SYN-WORKSPACE-001",
          normalizedValue: "ACT-SYN-WORKSPACE-001",
          sourceLabel: "Identificador del acto",
        }),
        field({
          fieldId: "date:available",
          semantic: "DATE",
          canonicalType: "AVAILABILITY_DATE",
          label: "Puesta a disposición",
          displayValue: "10/07/2026 08:15",
          normalizedValue: "2026-07-10",
          sourceLabel: "Fecha de puesta a disposición",
        }),
        field({
          fieldId: "date:accessed",
          semantic: "DATE",
          canonicalType: "ACCESS_DATE",
          label: "Fecha de acceso",
          displayValue: "12/07/2026 09:42",
          normalizedValue: "2026-07-12",
          sourceLabel: "Fecha de acceso",
        }),
        field({
          fieldId: "party:issuer",
          semantic: "PARTY",
          canonicalType: "ISSUING_AUTHORITY",
          label: "Órgano emisor",
          displayValue: "Agencia Estatal de Administración Tributaria",
          sourceLabel: "Órgano emisor",
        }),
        field({
          fieldId: "party:taxpayer",
          semantic: "PARTY",
          canonicalType: "TAXPAYER",
          label: "Obligado tributario",
          displayValue: "PERSONA SINTÉTICA",
          sourceLabel: "Destinatario",
        }),
        field({
          fieldId: "detail:subject",
          semantic: "DETAIL",
          canonicalType: "NOTIFICATION_SUBJECT",
          label: "Asunto",
          displayValue: "Resolución sintética notificada",
          sourceLabel: "Asunto",
        }),
        field({
          fieldId: "detail:channel",
          semantic: "DETAIL",
          canonicalType: "NOTIFICATION_CHANNEL",
          label: "Canal",
          displayValue: "DEHú",
          sourceLabel: "Canal de notificación",
        }),
      ],
      warnings: [],
      requiresHumanReview: true,
    },
  ];
  return source as unknown as FiscalNotificationLocalAnalysisResult;
}

async function seizureAnalysis(): Promise<FiscalNotificationLocalAnalysisResult> {
  const boundedDocument: BoundedDocumentInput = Object.freeze({
    ownerScope: OWNER,
    documentId: "document:synthetic-seizure-workspace",
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text: BANK_SEIZURE, isBlank: false }),
    ]),
  });
  const review = projectFiscalNotificationVerticalSliceReviewV1(
    await analyzeFiscalNotificationVerticalSliceV1(boundedDocument),
  );
  const source = structuredClone(analysis()) as unknown as {
    technicalReview: { pageCount: number; byteLength: number };
    ephemeralVerticalSliceReview: unknown;
  };
  source.technicalReview.pageCount = 1;
  source.technicalReview.byteLength = 5_678;
  source.ephemeralVerticalSliceReview = review;
  return source as unknown as FiscalNotificationLocalAnalysisResult;
}

async function assetSeizureAnalysis(): Promise<FiscalNotificationLocalAnalysisResult> {
  const boundedDocument: BoundedDocumentInput = Object.freeze({
    ownerScope: OWNER,
    documentId: "document:synthetic-asset-seizure-workspace",
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text: REAL_ESTATE_SEIZURE,
        isBlank: false,
      }),
    ]),
  });
  const review = projectFiscalNotificationVerticalSliceReviewV1(
    await analyzeFiscalNotificationVerticalSliceV1(boundedDocument),
  );
  const source = structuredClone(analysis()) as unknown as {
    technicalReview: { pageCount: number; byteLength: number };
    ephemeralVerticalSliceReview: unknown;
  };
  source.technicalReview.pageCount = 1;
  source.technicalReview.byteLength = 2_345;
  source.ephemeralVerticalSliceReview = review;
  return source as unknown as FiscalNotificationLocalAnalysisResult;
}

describe("vertical slice structured workspace v1", () => {
  it("persiste una diligencia exacta con importes y referencias sin identidades ni cuentas", async () => {
    const result = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: await seizureAnalysis(),
    });

    expect(result.workspace.documents).toEqual([
      expect.objectContaining({
        documentType: "AEAT_SEIZURE_ORDER",
        documentSubtype: "seizure.bank_account",
        titleRaw: "Diligencia de embargo de cuenta bancaria",
      }),
    ]);
    expect(result.workspace.documents[0]?.subjectParty).toBeUndefined();
    expect(result.workspace.references.map((item) => [item.referenceType, item.rawValue])).toEqual(
      expect.arrayContaining([
        ["DOCUMENT_REFERENCE", "EMB-SYN-WORKSPACE-001"],
        ["EXPEDIENT_NUMBER", "EXP-SYN-WORKSPACE-001"],
        ["DEBT_KEY", "DEBT-SYN-WORKSPACE-001"],
      ]),
    );
    expect(result.workspace.analysisSnapshots[0]?.structuredData.administrativeDomain?.moneyFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "ORIGINAL_TAX_PRINCIPAL", amountCents: 100_000 }),
        expect.objectContaining({ kind: "SEIZED_AMOUNT", amountCents: 124_000 }),
        expect.objectContaining({ kind: "RETAINED_AMOUNT", amountCents: 90_000 }),
      ]),
    );
    const serialized = JSON.stringify(result.workspace);
    expect(serialized).not.toMatch(
      /ES00 0000 0000 0000 1234|12345678Z|A12345674|PERSONA DEUDORA SINTÉTICA|BANCO SINTÉTICO|MASKED_ACCOUNT|DEBTOR_TAX_ID|RECIPIENT_TAX_ID/iu,
    );
    expect(result.workspace.debts).toEqual([]);
    expect(result.workspace.deadlineRules).toEqual([]);
    expect(result.workspace.paymentOptions).toEqual([]);
    expect(result.workspace.accountingDrafts).toEqual([]);
    expect(validateFiscalNotificationsWorkspaceIntegrity(result.workspace, OWNER)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("persiste solo la huella opaca del bien usada por la reconciliación global", async () => {
    const result = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: await assetSeizureAnalysis(),
    });
    const assetReference = result.workspace.references.find(
      (item) => item.referenceType === "VEHICLE_OR_FINE_REFERENCE",
    );

    expect(assetReference).toMatchObject({
      confidence: "EXACT",
      confirmationStatus: "PENDING",
      extractionMethod: "RULE",
    });
    expect(assetReference?.normalizedValue).toMatch(/^[a-f0-9]{64}$/u);
    expect(JSON.stringify(result.workspace)).not.toContain(
      "FINCA-SINTÉTICA-WORKSPACE-001",
    );
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(result.workspace, OWNER),
    ).toEqual({ valid: true, issues: [] });
  });

  it("persiste el sobre electrónico y todos sus datos visibles sin conservar el PDF", () => {
    const source = notificationAnalysis();
    const result = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: source,
    });

    expect(result.status).toBe("APPLIED");
    expect(result.workspace.files).toEqual([
      expect.objectContaining({
        sourceContentRetention: "NOT_RETAINED",
        pageCount: 1,
        fileSize: 4_321,
      }),
    ]);
    expect(result.workspace.documents).toEqual([
      expect.objectContaining({
        documentType: "GENERIC_ADMINISTRATIVE_NOTICE",
        documentSubtype: "notification.dehu_envelope",
        titleRaw: "Sobre o acuse de notificación electrónica",
        authorityId: "authority:aeat",
        notificationDates: {},
      }),
    ]);
    expect(result.workspace.documents[0]?.subjectParty).toBeUndefined();
    expect(result.workspace.references.map((item) => [item.referenceType, item.rawValue])).toEqual([
      ["NOTIFICATION_ID", "NOT-SYN-WORKSPACE-001"],
      ["DOCUMENT_REFERENCE", "ACT-SYN-WORKSPACE-001"],
    ]);
    expect(result.workspace.analysisSnapshots[0]?.structuredData.unknownFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          labelRaw: "VSR2|date:available|DATE|AVAILABILITY_DATE|Puesta a disposición",
          valueRaw: "2026-07-10",
          page: 1,
        }),
        expect.objectContaining({
          labelRaw: "VSR2|date:accessed|DATE|ACCESS_DATE|Fecha de acceso",
          valueRaw: "2026-07-12",
          page: 1,
        }),
      ]),
    );
    expect(
      JSON.stringify(
        result.workspace.analysisSnapshots[0]?.structuredData.unknownFields,
      ),
    ).not.toMatch(/NOTIFICATION_SUBJECT|ROLE:/u);
    expect(JSON.stringify(result.workspace)).not.toMatch(
      /PERSONA SINTÉTICA|12345678Z|Resolución sintética notificada/iu,
    );
    expect(result.workspace.debts).toEqual([]);
    expect(result.workspace.deadlineRules).toEqual([]);
    expect(result.workspace.paymentOptions).toEqual([]);
    expect(result.workspace.accountingDrafts).toEqual([]);
    expect(validateFiscalNotificationsWorkspaceIntegrity(result.workspace, OWNER)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("clasifica un emisor no AEAT sin conservar su nombre impreso", () => {
    const source = structuredClone(notificationAnalysis()) as unknown as {
      ephemeralVerticalSliceReview: {
        documents: Array<{
          fields: Array<{
            canonicalType: string;
            displayValue: string;
            normalizedValue: string | null;
          }>;
        }>;
      };
    };
    const issuer = source.ephemeralVerticalSliceReview.documents[0]!.fields.find(
      (item) => item.canonicalType === "ISSUING_AUTHORITY",
    )!;
    issuer.displayValue = "Otra autoridad";
    issuer.normalizedValue = "OTHER_AUTHORITY";

    const result = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: source as unknown as FiscalNotificationLocalAnalysisResult,
    });

    expect(result.workspace.authorities).toEqual([
      expect.objectContaining({
        administrationType: "OTHER",
        nameRaw: "Otra autoridad",
        nameNormalized: "OTRA AUTORIDAD",
      }),
    ]);
    expect(result.workspace.documents[0]?.authorityId).toBe(result.workspace.authorities[0]?.id);
    expect(result.workspace.documents[0]?.authorityId).not.toBe("authority:aeat");
    expect(JSON.stringify(result.workspace)).not.toContain(
      "Organismo tributario sintético",
    );
  });

  it("persiste varias fichas segmentadas con datos exactos y ningún efecto operativo", () => {
    const source = analysis();
    const before = structuredClone(source);
    const result = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: source,
    });

    expect(result.status).toBe("APPLIED");
    expect(result.documentIds).toEqual([
      "document:00000000-0000-4000-8000-000000000103:vertical:assessment",
      "document:00000000-0000-4000-8000-000000000103:vertical:payment-evidence",
    ]);
    expect(result.workspace.packages).toHaveLength(1);
    expect(result.workspace.files).toEqual([
      expect.objectContaining({
        sourceContentRetention: "NOT_RETAINED",
        pageCount: 3,
        fileSize: 12_345,
        sha256: HASH,
      }),
    ]);
    expect(result.workspace.documents).toEqual([
      expect.objectContaining({
        documentType: "AEAT_ASSESSMENT",
        documentSubtype: "assessment.final_provisional_assessment",
        titleRaw: "Liquidación provisional",
        issueDate: "2026-07-14",
      }),
      expect.objectContaining({
        documentType: "GENERIC_ADMINISTRATIVE_NOTICE",
        documentSubtype: "payment.receipt",
        titleRaw: "Justificante de pago",
      }),
    ]);
    expect(result.workspace.references.map((item) => item.rawValue)).toEqual([
      "SYNTH-DEBT-101",
      "SYNTH-DEBT-101",
      "b".repeat(64),
    ]);
    expect(
      result.workspace.analysisSnapshots.flatMap(
        (item) => item.structuredData.administrativeDomain?.moneyFacts ?? [],
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "FINAL_QUOTA",
        amountCents: 123_456,
        status: "PROPOSED",
      }),
      expect.objectContaining({
        kind: "PAYMENT_CONFIRMED",
        amountCents: 123_456,
        status: "PROPOSED",
      }),
    ]);
    expect(result.workspace.debts).toEqual([]);
    expect(result.workspace.obligations).toEqual([]);
    expect(result.workspace.deadlineRules).toEqual([]);
    expect(result.workspace.paymentPlans).toEqual([]);
    expect(result.workspace.accountingDrafts).toEqual([]);
    expect(validateFiscalNotificationsWorkspaceIntegrity(result.workspace, OWNER)).toEqual({
      valid: true,
      issues: [],
    });
    expect(source).toEqual(before);
    expect(Object.isFrozen(result.workspace)).toBe(true);
    expect(Object.isFrozen(result.workspace.documents)).toBe(true);
    expect(JSON.stringify(result.workspace)).not.toMatch(
      /originalFilename|storageReference|texto ocr completo|private\.pdf|SYNTHETIC_RAW_WARNING_SHOULD_NOT_PERSIST|PERSONA SINTÉTICA|\*\*\*\*9012/i,
    );
  });

  it("es idempotente por hash y familia aunque cambie el id de revisión", () => {
    const first = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: analysis(),
    });
    const replay = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: SECOND_REVIEW_ID,
      createdAt: "2026-07-14T20:01:00.000Z",
      workspace: first.workspace,
      analysis: analysis(),
    });

    expect(replay.status).toBe("EXISTING");
    expect(replay.documentIds).toEqual(first.documentIds);
    expect(replay.workspace.revision).toBe(first.workspace.revision);
    expect(replay.workspace.documents).toHaveLength(2);
  });

  it("asigna ordinales cerrados a dos familias emitidas por el mismo extractor y las reproduce sin duplicar", () => {
    const source = repeatedExtractorAnalysis();
    const first = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: source,
    });

    expect(first.documentIds).toEqual([
      "document:00000000-0000-4000-8000-000000000103:vertical:assessment:occurrence:00001",
      "document:00000000-0000-4000-8000-000000000103:vertical:assessment:occurrence:00002",
    ]);
    expect(first.workspace.documents.map((item) => item.documentSubtype)).toEqual([
      "assessment.final_provisional_assessment",
      "payment.receipt",
    ]);
    expect(first.workspace.analysisSnapshots.map((item) => item.id)).toEqual([
      "analysis:00000000-0000-4000-8000-000000000103:vertical:assessment:occurrence:00001",
      "analysis:00000000-0000-4000-8000-000000000103:vertical:assessment:occurrence:00002",
    ]);
    for (const collection of [
      first.workspace.documents,
      first.workspace.analysisSnapshots,
      first.workspace.evidence,
      first.workspace.references,
    ]) {
      expect(new Set(collection.map((item) => item.id)).size).toBe(
        collection.length,
      );
    }

    const replay = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: SECOND_REVIEW_ID,
      createdAt: "2026-07-14T20:01:00.000Z",
      workspace: first.workspace,
      analysis: repeatedExtractorAnalysis(),
    });
    expect(replay.status).toBe("EXISTING");
    expect(replay.documentIds).toEqual(first.documentIds);
    expect(replay.workspace.revision).toBe(first.workspace.revision);
    expect(replay.workspace.documents).toHaveLength(2);
  });

  it("distingue dos actos de la misma familia y extractor sin usar su id documental crudo", () => {
    const first = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: repeatedExtractorAnalysis({ sameFamily: true }),
    });

    expect(first.status).toBe("APPLIED");
    expect(first.workspace.documents).toHaveLength(2);
    expect(first.workspace.documents.map((item) => item.documentSubtype)).toEqual([
      "assessment.final_provisional_assessment",
      "assessment.final_provisional_assessment",
    ]);
    expect(first.documentIds[0]).toMatch(/:occurrence:00001$/u);
    expect(first.documentIds[1]).toMatch(/:occurrence:00002$/u);
    expect(JSON.stringify(first.workspace)).not.toContain(
      "review-document:payment-evidence",
    );

    const replay = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: SECOND_REVIEW_ID,
      createdAt: "2026-07-14T20:01:00.000Z",
      workspace: first.workspace,
      analysis: repeatedExtractorAnalysis({ sameFamily: true }),
    });
    expect(replay.status).toBe("EXISTING");
    expect(replay.documentIds).toEqual(first.documentIds);
    expect(replay.workspace.documents).toHaveLength(2);
  });

  it("guarda el paquete en una transición durable y sugiere la relación exacta", () => {
    const expected = structuredClone(EMPTY_DATA);
    const persist = vi.fn(() => ({ status: "applied" as const }));
    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      expected,
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      analysis: analysis(),
      commit: <T>(
        baseline: AppData,
        build: (previous: AppData) => { data: AppData; value: T },
      ) =>
        commitAppDataDurably({
          expected: baseline,
          getCurrent: () => expected,
          build,
          persist,
        }),
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.replayed).toBe(false);
    expect(result.data.fiscalNotificationsWorkspace?.documents).toHaveLength(2);
    expect(result.data.fiscalNotificationsWorkspace?.relations).toEqual([
      expect.objectContaining({
        relationType: "POSSIBLY_RELATED",
        status: "SUGGESTED",
        evidence: expect.objectContaining({
          matchingReferenceTypes: ["DEBT_KEY"],
        }),
      }),
    ]);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(expected.fiscalNotificationsWorkspace).toBeUndefined();
  });

  it("persiste una familia del registro V2 sin convertirla en deuda, pago ni plazo", () => {
    const source = structuredClone(analysis()) as unknown as {
      technicalReview: { pageCount: number; byteLength: number };
      ephemeralVerticalSliceReview: { documents: unknown[] };
    };
    source.technicalReview.pageCount = 1;
    source.technicalReview.byteLength = 4_500;
    source.ephemeralVerticalSliceReview.documents = [
      {
        reviewDocumentId: "review-document:profile:sanction.resolution",
        extractorId: "penalty",
        familyId: "sanction.resolution",
        title: "Resolución sancionadora",
        subtitle: "Título, autoridad y estructura coinciden",
        pageFrom: 1,
        pageTo: 1,
        confidence: 1,
        fields: [
          field({
            fieldId: "profile:date:ISSUE_DATE:0",
            semantic: "DATE",
            canonicalType: "ISSUE_DATE",
            label: "Fecha de emisión",
            displayValue: "16/07/2026",
            normalizedValue: "2026-07-16",
            sourceLabel: "Fecha de emisión",
          }),
          field({
            fieldId: "profile:money:SANCTION_INITIAL:1",
            semantic: "MONEY",
            canonicalType: "PENALTY",
            label: "Sanción inicial",
            displayValue: "300,00 €",
            normalizedValue: "30000",
            amountCents: 30_000,
            currency: "EUR",
            sourceLabel: "Sanción inicial",
          }),
        ],
        warnings: [],
        requiresHumanReview: true,
      },
    ];

    const result = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: source as unknown as FiscalNotificationLocalAnalysisResult,
    });

    expect(result.workspace.documents).toEqual([
      expect.objectContaining({
        documentType: "GENERIC_ADMINISTRATIVE_NOTICE",
        documentSubtype: "sanction.resolution",
        issueDate: "2026-07-16",
        status: "UNKNOWN",
        analysisStatus: "NEEDS_REVIEW",
      }),
    ]);
    expect(result.workspace.debts).toEqual([]);
    expect(result.workspace.obligations).toEqual([]);
    expect(result.workspace.deadlineRules).toEqual([]);
    expect(result.workspace.paymentPlans).toEqual([]);
    expect(result.workspace.accountingDrafts).toEqual([]);
  });

  it("rechaza ownerScope, claves desconocidas y revisiones vacías sin eco de datos", () => {
    const source = analysis();
    const existing = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: source,
    });
    const cases: unknown[] = [
      {
        ownerScope: OTHER_OWNER,
        reviewId: SECOND_REVIEW_ID,
        createdAt: "2026-07-14T20:01:00.000Z",
        workspace: existing.workspace,
        analysis: source,
      },
      {
        ownerScope: OWNER,
        reviewId: REVIEW_ID,
        createdAt: CREATED_AT,
        workspace: null,
        analysis: { ...source, rawOcrText: "dato privado" },
      },
    ];
    for (const candidate of cases) {
      expect(() =>
        appendFiscalNotificationVerticalSliceReviewV1(
          candidate as Parameters<
            typeof appendFiscalNotificationVerticalSliceReviewV1
          >[0],
        ),
      ).toThrow(FiscalNotificationVerticalSliceWorkspaceErrorV1);
    }

    const empty = {
      ...source,
      ephemeralVerticalSliceReview: {
        ...source.ephemeralVerticalSliceReview,
        status: "INFORMATION_PENDING",
        documents: [],
      },
    } as unknown as FiscalNotificationLocalAnalysisResult;
    expect(() =>
      appendFiscalNotificationVerticalSliceReviewV1({
        ownerScope: OWNER,
        reviewId: REVIEW_ID,
        createdAt: CREATED_AT,
        workspace: null,
        analysis: empty,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "NO_STRUCTURED_FACTS" }),
    );

    const recognizedSource = structuredClone(source) as unknown as {
      ephemeralVerticalSliceReview: {
        status: string;
        documents: Array<{
          pageFrom: number;
          fields: unknown[];
          [key: string]: unknown;
        }>;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    const recognizedButEmpty = {
      ...recognizedSource,
      ephemeralVerticalSliceReview: {
        ...recognizedSource.ephemeralVerticalSliceReview,
        status: "REVIEW_REQUIRED",
        documents: recognizedSource.ephemeralVerticalSliceReview.documents.map(
          (document) => ({
            ...document,
            fields: [
              field({ sourcePageNumbers: [document.pageFrom] }),
              field({
                fieldId: "party:issuer",
                semantic: "PARTY",
                canonicalType: "ISSUING_AUTHORITY",
                label: "Órgano emisor",
                sourcePageNumbers: [document.pageFrom],
              }),
            ],
          }),
        ),
      },
    } as unknown as FiscalNotificationLocalAnalysisResult;
    expect(() =>
      appendFiscalNotificationVerticalSliceReviewV1({
        ownerScope: OWNER,
        reviewId: REVIEW_ID,
        createdAt: CREATED_AT,
        workspace: null,
        analysis: recognizedButEmpty,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "NO_STRUCTURED_FACTS" }),
    );

    const recognizedWithInternalTokens = {
      ...recognizedSource,
      ephemeralVerticalSliceReview: {
        ...recognizedSource.ephemeralVerticalSliceReview,
        status: "REVIEW_REQUIRED",
        documents: [
          {
            ...recognizedSource.ephemeralVerticalSliceReview.documents[0]!,
            familyId: "notification.publication_or_appearance",
            title: "Publicación o comparecencia para notificación",
            fields: [
              {
                ...field({
                  fieldId: "real-corpus:recognized-family",
                  semantic: "DETAIL",
                  canonicalType: "FACT_OR_GROUND",
                  label: "Reconocimiento documental",
                  sourcePageNumbers: [1],
                }),
                displayValue: "Título y autoridad coinciden",
                normalizedValue: "EXACT_TITLE_AND_AUTHORITY",
              },
              {
                ...field({
                  fieldId: "real-corpus:plain-explanation",
                  semantic: "DETAIL",
                  canonicalType: "EXPLICIT_CONSEQUENCE",
                  label: "Qué significa",
                  sourcePageNumbers: [1],
                }),
                displayValue:
                  "La diligencia acredita la publicación, pero no permite afirmar la fecha efectiva de notificación.",
                normalizedValue:
                  "EXPLANATION:notification.publication_or_appearance:PUBLICATION_DILIGENCE",
              },
              {
                ...field({
                  fieldId: "real-corpus:APPEARANCE_DURATION:0",
                  semantic: "DETAIL",
                  canonicalType: "FACT_OR_GROUND",
                  label: "Plazo de comparecencia",
                  sourcePageNumbers: [1],
                }),
                displayValue: "15",
                normalizedValue: "INTEGER:APPEARANCE_DURATION:15",
              },
              {
                ...field({
                  fieldId: "real-corpus:PROVES_UNDERLYING_ACT_CONTENT:1",
                  semantic: "DETAIL",
                  canonicalType: "FACT_OR_GROUND",
                  label: "Explica el contenido del acto citado",
                  sourcePageNumbers: [1],
                }),
                displayValue: "No",
                normalizedValue:
                  "BOOLEAN:PROVES_UNDERLYING_ACT_CONTENT:FALSE",
              },
            ],
          },
        ],
      },
    } as unknown as FiscalNotificationLocalAnalysisResult;
    expect(() =>
      appendFiscalNotificationVerticalSliceReviewV1({
        ownerScope: OWNER,
        reviewId: REVIEW_ID,
        createdAt: CREATED_AT,
        workspace: null,
        analysis: recognizedWithInternalTokens,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "NO_STRUCTURED_FACTS" }),
    );

    const emptyTaxDataReport = {
      ...recognizedSource,
      ephemeralVerticalSliceReview: {
        ...recognizedSource.ephemeralVerticalSliceReview,
        status: "REVIEW_REQUIRED",
        documents: [
          {
            ...recognizedSource.ephemeralVerticalSliceReview.documents[0]!,
            familyId: "information.tax_data_report",
            title: "Datos fiscales",
            fields: [
              {
                ...field({
                  fieldId: "real-corpus:recognized-family",
                  semantic: "DETAIL",
                  canonicalType: "FACT_OR_GROUND",
                  label: "Reconocimiento documental",
                  sourcePageNumbers: [1],
                }),
                displayValue: "Título y autoridad coinciden",
                normalizedValue: "EXACT_TITLE_AND_AUTHORITY",
              },
            ],
          },
        ],
      },
    } as unknown as FiscalNotificationLocalAnalysisResult;
    expect(() =>
      appendFiscalNotificationVerticalSliceReviewV1({
        ownerScope: OWNER,
        reviewId: REVIEW_ID,
        createdAt: CREATED_AT,
        workspace: null,
        analysis: emptyTaxDataReport,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "NO_STRUCTURED_FACTS" }),
    );
  });

  it("omite un segmento sin datos útiles y conserva los documentos estructurados", () => {
    const source = structuredClone(analysis()) as unknown as {
      ephemeralVerticalSliceReview: {
        documents: Array<{ fields: unknown[]; title: string }>;
      };
    };
    source.ephemeralVerticalSliceReview.documents[1]!.fields = [
      field({ sourcePageNumbers: [3] }),
      field({
        fieldId: "party:issuer",
        semantic: "PARTY",
        canonicalType: "ISSUING_AUTHORITY",
        label: "Órgano emisor",
        sourcePageNumbers: [3],
      }),
    ];

    const result = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: source as unknown as FiscalNotificationLocalAnalysisResult,
    });

    expect(result.workspace.documents).toHaveLength(1);
    expect(result.workspace.documents[0]?.titleRaw).toBe(
      "Liquidación provisional",
    );
  });

  it("persiste REQUEST_NUMBER sin degradarlo a una referencia genérica", () => {
    const source = structuredClone(analysis()) as unknown as {
      ephemeralVerticalSliceReview: {
        documents: Array<{ fields: unknown[] }>;
      };
    };
    source.ephemeralVerticalSliceReview.documents = [
      {
        ...source.ephemeralVerticalSliceReview.documents[0]!,
        fields: [
          field({
            fieldId: "reference:request-number",
            semantic: "REFERENCE",
            canonicalType: "REQUEST_NUMBER",
            label: "Número de solicitud",
            displayValue: "REQ-SYN-WORKSPACE-001",
            normalizedValue: "REQ-SYN-WORKSPACE-001",
            sourcePageNumbers: [1],
          }),
        ],
      },
    ];

    const result = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: source as unknown as FiscalNotificationLocalAnalysisResult,
    });

    expect(result.workspace.references).toEqual([
      expect.objectContaining({
        referenceType: "REQUEST_NUMBER",
        rawValue: "REQ-SYN-WORKSPACE-001",
        normalizedValue: "REQ-SYN-WORKSPACE-001",
      }),
    ]);
  });

  it("persiste REFUND_REFERENCE sin degradarlo a una referencia genérica", () => {
    const source = structuredClone(analysis()) as unknown as {
      ephemeralVerticalSliceReview: {
        documents: Array<{ fields: unknown[] }>;
      };
    };
    source.ephemeralVerticalSliceReview.documents = [
      {
        ...source.ephemeralVerticalSliceReview.documents[0]!,
        fields: [
          field({
            fieldId: "reference:refund",
            semantic: "REFERENCE",
            canonicalType: "REFUND_REFERENCE",
            label: "Referencia de devolución",
            displayValue: "REFUND-SYN-WORKSPACE-001",
            normalizedValue: "REFUND-SYN-WORKSPACE-001",
            sourcePageNumbers: [1],
          }),
        ],
      },
    ];

    const result = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: source as unknown as FiscalNotificationLocalAnalysisResult,
    });

    expect(result.workspace.references).toEqual([
      expect.objectContaining({
        referenceType: "REFUND_REFERENCE",
        rawValue: "REFUND-SYN-WORKSPACE-001",
        normalizedValue: "REFUND-SYN-WORKSPACE-001",
      }),
    ]);
  });

  it("persiste y presenta filas fiscales parciales sin enums ni valores ausentes inventados", async () => {
    const boundedDocument: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER,
      documentId: "document:synthetic-partial-tax-row",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          isBlank: false,
          text: [
            "DATOS FISCALES",
            "Concepto tributario: IRPF",
            "Ejercicio: 2025",
            "Los datos fiscales del Impuesto sobre la Renta no vinculan a la Agencia Tributaria",
            "Referencia: SYN2025PARTIALROW001X",
            "Datos a fecha de: 15/06/2026",
            "Fecha de emisión: 16/06/2026",
            "No se pudo elaborar el borrador: constan actividades económicas",
            "Inicio otros medios: 02/04/2026",
            "Fin de campaña: 30/06/2026",
            "Fin domiciliación: 25/06/2026",
            "Contribuyente: titular",
            "Sección: EMPLOYMENT_INCOME; filas: 1; importe: 101,23 €",
          ].join("\n"),
        }),
      ]),
    });
    const observed = await analyzeFiscalNotificationDocumentInput(
      boundedDocument,
    );
    const sectionField = observed.verticalSliceReview.documents
      .flatMap((document) => document.fields)
      .find((field) => field.fieldId === "real-corpus:section:0");
    expect(sectionField).toMatchObject({
      label: "Rendimientos del trabajo",
      displayValue: "Fila 1 · Titular · 101,23\u00a0€",
      normalizedValue: "Fila 1 · Titular · 101,23\u00a0€",
      sourcePageNumbers: [1],
    });

    const source = structuredClone(analysis()) as unknown as {
      technicalReview: { pageCount: number; byteLength: number };
      ephemeralVerticalSliceReview: unknown;
    };
    source.technicalReview.pageCount = 1;
    source.technicalReview.byteLength = 2_048;
    source.ephemeralVerticalSliceReview = observed.verticalSliceReview;
    const saved = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: source as unknown as FiscalNotificationLocalAnalysisResult,
    });
    const history = projectFiscalNotificationStructuredHistoryV1(
      saved.workspace,
      OWNER,
    );
    const serialized = JSON.stringify({
      workspace: saved.workspace,
      history,
    });

    expect(history.status).toBe("READY");
    expect(serialized).toContain("Rendimientos del trabajo");
    expect(serialized).toContain("Fila 1 · Titular · 101,23");
    expect(serialized).not.toMatch(
      /EMPLOYMENT_INCOME|ACCOUNT_HOLDER|SPOUSE|SOURCE_CONTENT_NOT_RETAINED|10123:-|:-:/u,
    );
  });

  it("does not persist a tax row when its printed count is absent", async () => {
    const boundedDocument: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER,
      documentId: "document:synthetic-tax-section-without-count",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          isBlank: false,
          text: [
            "DATOS FISCALES",
            "Concepto tributario: IRPF",
            "Ejercicio: 2025",
            "Los datos fiscales del Impuesto sobre la Renta no vinculan a la Agencia Tributaria",
            "Referencia: SYN2025NOINVENTEDROW001X",
            "Datos a fecha de: 15/06/2026",
            "Sección: EMPLOYMENT_INCOME; importe: 101,23 €",
          ].join("\n"),
        }),
      ]),
    });
    const observed = await analyzeFiscalNotificationDocumentInput(
      boundedDocument,
    );
    expect(observed.verticalSliceReview.documents
      .flatMap((document) => document.fields)
      .some((field) => field.fieldId.startsWith("real-corpus:section:")))
      .toBe(false);

    const source = structuredClone(analysis()) as unknown as {
      technicalReview: { pageCount: number; byteLength: number };
      ephemeralVerticalSliceReview: unknown;
    };
    source.technicalReview.pageCount = 1;
    source.technicalReview.byteLength = 2_048;
    source.ephemeralVerticalSliceReview = observed.verticalSliceReview;
    const saved = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: source as unknown as FiscalNotificationLocalAnalysisResult,
    });
    const serialized = JSON.stringify({
      workspace: saved.workspace,
      history: projectFiscalNotificationStructuredHistoryV1(
        saved.workspace,
        OWNER,
      ),
    });

    expect(saved.workspace.documents).toHaveLength(1);
    expect(serialized).not.toMatch(/EMPLOYMENT_INCOME|Fila 1|Titular/u);
  });

  it("conserva un importe negativo observado como texto humano estructurado", () => {
    const source = structuredClone(analysis()) as unknown as {
      ephemeralVerticalSliceReview: {
        documents: Array<{ fields: unknown[] }>;
      };
    };
    source.ephemeralVerticalSliceReview.documents = [
      {
        ...source.ephemeralVerticalSliceReview.documents[0]!,
        fields: [
          field({
            fieldId: "reference:negative-result",
            semantic: "REFERENCE",
            canonicalType: "ACT_ID",
            label: "Acto o requerimiento",
            displayValue: "ACT-SYN-NEGATIVE-001",
            normalizedValue: "ACT-SYN-NEGATIVE-001",
            sourcePageNumbers: [1],
          }),
          {
            ...field({
              fieldId: "real-corpus:DECLARED_RESULT:0",
              semantic: "DETAIL",
              canonicalType: "FACT_OR_GROUND",
              label: "Resultado declarado",
              sourcePageNumbers: [2],
            }),
            displayValue: "-700,00 €",
            normalizedValue: "-700,00 €",
          },
        ],
      },
    ];

    const result = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: source as unknown as FiscalNotificationLocalAnalysisResult,
    });
    const serialized = JSON.stringify(
      result.workspace.analysisSnapshots[0]?.structuredData.unknownFields,
    );

    expect(serialized).toContain("-700,00 €");
    expect(serialized).not.toContain("SIGNED_CENTS:");
  });

  it("persiste una ficha válida sin exponer metadatos ni tokens internos", () => {
    const source = structuredClone(analysis()) as unknown as {
      ephemeralVerticalSliceReview: {
        documents: Array<{ fields: unknown[]; [key: string]: unknown }>;
      };
    };
    source.ephemeralVerticalSliceReview.documents = [
      {
        ...source.ephemeralVerticalSliceReview.documents[0]!,
        fields: [
          {
            ...field({
              fieldId: "real-corpus:recognized-family",
              semantic: "DETAIL",
              canonicalType: "FACT_OR_GROUND",
              label: "Reconocimiento documental",
              sourcePageNumbers: [1],
            }),
            displayValue: "Título y autoridad coinciden",
            normalizedValue: "EXACT_TITLE_AND_AUTHORITY",
          },
          {
            ...field({
              fieldId: "real-corpus:plain-explanation",
              semantic: "DETAIL",
              canonicalType: "EXPLICIT_CONSEQUENCE",
              label: "Qué significa",
              sourcePageNumbers: [1],
            }),
            displayValue:
              "La diligencia acredita la publicación, pero no permite afirmar la fecha efectiva de notificación.",
            normalizedValue:
              "EXPLANATION:notification.publication_or_appearance:PUBLICATION_DILIGENCE",
          },
          field({
            fieldId: "reference:publication",
            semantic: "REFERENCE",
            canonicalType: "ACT_ID",
            label: "Referencia del acto citado",
            displayValue: "PUB-SYN-WORKSPACE-001",
            normalizedValue: "PUB-SYN-WORKSPACE-001",
            sourcePageNumbers: [1],
            sourceLabel: "Referencia del acto citado",
          }),
          field({
            fieldId: "date:publication",
            semantic: "DATE",
            canonicalType: "ACTION_DATE",
            label: "Fecha de publicación",
            normalizedValue: "2026-07-18",
            sourcePageNumbers: [1],
            sourceLabel: "Fecha de publicación",
          }),
        ],
      },
    ];

    const result = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: source as unknown as FiscalNotificationLocalAnalysisResult,
    });

    expect(result.status).toBe("APPLIED");
    expect(result.workspace.documents).toHaveLength(1);
    expect(result.workspace.references.map((item) => item.rawValue)).toEqual([
      "PUB-SYN-WORKSPACE-001",
    ]);
    const serializedUnknownFields = JSON.stringify(
      result.workspace.analysisSnapshots[0]?.structuredData.unknownFields,
    );
    expect(serializedUnknownFields).toContain("PUB-SYN-WORKSPACE-001");
    expect(serializedUnknownFields).toContain("2026-07-18");
    expect(serializedUnknownFields).not.toMatch(
      /EXACT_|INTEGER:|BOOLEAN:|EXPLANATION:|APPEARANCE_DURATION|UNDERLYING_ACT_CONTENT|SOURCE_PAGE_RANGE|Páginas en el PDF/iu,
    );
  });
});
