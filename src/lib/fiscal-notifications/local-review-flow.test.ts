import { describe, expect, it, vi } from "vitest";
import { DISABLED_FISCAL_NOTIFICATION_OCR_PORT } from "./disabled-ocr-port";
import { extractAeatEnforcementExplicitFieldsV2 } from "./aeat-enforcement-explicit-fields.v2";
import { extractAeatEnforcementMoneyFacts } from "./aeat-enforcement-money-facts";
import { extractAeatEnforcementPartyFactsV1 } from "./aeat-enforcement-party-facts.v1";
import { extractAeatDeferralGrantFactsV1 } from "./aeat-deferral-grant-facts.v1";
import { extractAeatOffsetAgreementFactsV1 } from "./aeat-offset-agreement-facts.v1";
import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import type { BoundedDocumentInput } from "./input-contract";
import {
  analyzeFiscalNotificationLocally,
  FISCAL_NOTIFICATION_LOCAL_REVIEW_TEST_SEAM,
  type FiscalNotificationLocalReviewDependencies,
} from "./local-review-flow";
import type { FiscalNotificationPdfTextLayerResult } from "./pdf-text-layer-adapter";
import { projectFiscalNotificationPdfWorkerAnalysis } from "./pdf-worker-analysis-contract";

const HASH = "b".repeat(64);
const PRIVATE_TEXT = "PRIVATE_TAX_ID_AND_CSV_SENTINEL";

function documentInput(
  text: string,
  signal?: AbortSignal,
): BoundedDocumentInput {
  const input = {
    ownerScope: "user:synthetic-review",
    documentId: "document:synthetic-review",
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text,
        isBlank: text.trim().length === 0,
      }),
    ]),
  } as BoundedDocumentInput;
  if (signal) {
    Object.defineProperty(input, "signal", {
      value: signal,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  }
  return Object.freeze(input);
}

function intake(
  text: string,
  signal?: AbortSignal,
): FiscalNotificationPdfTextLayerResult {
  const boundedInput = documentInput(text, signal);
  const hasText = text.trim().length > 0;
  const familyAnalysis = hasText
    ? extractFiscalNotificationCandidates(boundedInput)
    : null;
  const enforcementCandidate =
    familyAnalysis?.reason === "SUPPORTED_FAMILY_CANDIDATE" &&
    familyAnalysis.candidates.length === 1 &&
    familyAnalysis.candidates[0]?.familyId ===
      "AEAT_ENFORCEMENT_ORDER_CANDIDATE" &&
    familyAnalysis.candidates[0].signalStatus ===
      "COMPLETE_REQUIRED_ANCHORS" &&
    familyAnalysis.candidates[0].conflictingAnchorIds.length === 0;
  const deferralCandidate =
    familyAnalysis?.reason === "SUPPORTED_FAMILY_CANDIDATE" &&
    familyAnalysis.candidates.length === 1 &&
    familyAnalysis.candidates[0]?.familyId ===
      "AEAT_DEFERRAL_GRANT_CANDIDATE" &&
    familyAnalysis.candidates[0].signalStatus ===
      "COMPLETE_REQUIRED_ANCHORS" &&
    familyAnalysis.candidates[0].conflictingAnchorIds.length === 0;
  const offsetCandidate =
    familyAnalysis?.reason === "SUPPORTED_FAMILY_CANDIDATE" &&
    familyAnalysis.candidates.length === 1 &&
    familyAnalysis.candidates[0]?.familyId ===
      "AEAT_OFFSET_AGREEMENT_CANDIDATE" &&
    familyAnalysis.candidates[0].signalStatus ===
      "COMPLETE_REQUIRED_ANCHORS" &&
    familyAnalysis.candidates[0].conflictingAnchorIds.length === 0;
  const analysis = projectFiscalNotificationPdfWorkerAnalysis({
    textLayerStatus: hasText
      ? "TEXT_LAYER_AVAILABLE"
      : "NO_EXTRACTABLE_TEXT",
    pageCount: boundedInput.pages.length,
    familyAnalysis,
    enforcementMoneyFacts: enforcementCandidate
      ? extractAeatEnforcementMoneyFacts(boundedInput)
      : null,
    enforcementExplicitFields: enforcementCandidate
      ? extractAeatEnforcementExplicitFieldsV2(boundedInput)
      : null,
    enforcementPartyFacts: enforcementCandidate
      ? extractAeatEnforcementPartyFactsV1(boundedInput)
      : null,
    deferralGrantFacts: deferralCandidate
      ? extractAeatDeferralGrantFactsV1(boundedInput)
      : null,
    offsetAgreementFacts: (() => {
      if (!offsetCandidate) return null;
      const facts = extractAeatOffsetAgreementFactsV1(boundedInput);
      return facts.documentType === "AEAT_OFFSET_AGREEMENT" ? facts : null;
    })(),
  });
  const reviewContext = {
    ownerScope: boundedInput.ownerScope,
    documentId: boundedInput.documentId,
  } as {
    ownerScope: string;
    documentId: string;
    signal?: AbortSignal;
  };
  if (signal) {
    Object.defineProperty(reviewContext, "signal", {
      value: signal,
      enumerable: false,
    });
  }
  return Object.freeze({
    schemaVersion: 6,
    adapterVersion: "6.0.0",
    status: analysis.textLayerStatus,
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    fileIntegrity: Object.freeze({
      mimeType: "application/pdf",
      byteLength: 2_048,
      sha256: HASH,
    }),
    analysis,
    reviewContext: Object.freeze(reviewContext),
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

function dependencies(
  text: string,
  overrides: Partial<FiscalNotificationLocalReviewDependencies> = {},
): FiscalNotificationLocalReviewDependencies {
  return {
    readPdf: vi.fn(async () => intake(text)),
    ocrPort: DISABLED_FISCAL_NOTIFICATION_OCR_PORT,
    ...overrides,
  };
}

function analyzeForTest(
  request: unknown,
  testDependencies: FiscalNotificationLocalReviewDependencies,
) {
  if (!FISCAL_NOTIFICATION_LOCAL_REVIEW_TEST_SEAM) {
    throw new Error("Local review test seam is unavailable");
  }
  return FISCAL_NOTIFICATION_LOCAL_REVIEW_TEST_SEAM.analyzeWithDependencies(
    request,
    testDependencies,
  );
}

function analyzeEphemeralForTest(
  request: unknown,
  testDependencies: FiscalNotificationLocalReviewDependencies,
) {
  if (!FISCAL_NOTIFICATION_LOCAL_REVIEW_TEST_SEAM) {
    throw new Error("Local review test seam is unavailable");
  }
  return FISCAL_NOTIFICATION_LOCAL_REVIEW_TEST_SEAM.analyzeEphemeralWithDependencies(
    request,
    testDependencies,
  );
}

function scannedRequest() {
  return Object.freeze({
    ownerScope: "user:synthetic-review",
    documentId: "document:synthetic-review",
    file: new File(["%PDF-1.7 synthetic"], "ignored.pdf", {
      type: "application/pdf",
    }),
  });
}

function noReadableOcrResult() {
  return Object.freeze({
    schemaVersion: 1 as const,
    ocrVersion: "1.0.0" as const,
    status: "NO_READABLE_TEXT" as const,
    pageCount: 1,
    averageConfidence: null,
    analysis: null,
    providerCalled: false as const,
    executionBoundary: "LOCAL_TESSERACT_WORKER" as const,
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" as const,
    retainedSourceContent: "NONE" as const,
    requiresHumanReview: true as const,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW" as const,
  });
}

function availableOcrResult(text: string) {
  const parsed = intake(text).analysis;
  return Object.freeze({
    schemaVersion: 1 as const,
    ocrVersion: "1.0.0" as const,
    status: "OCR_TEXT_AVAILABLE" as const,
    pageCount: parsed.pageCount,
    averageConfidence: 0.93,
    analysis: Object.freeze({
      hasText: true as const,
      pageCount: parsed.pageCount,
      familyAnalysis: parsed.familyAnalysis,
      enforcementMoneyFacts: parsed.enforcementMoneyFacts,
      enforcementExplicitFields: parsed.enforcementExplicitFields,
      enforcementPartyFacts: parsed.enforcementPartyFacts,
      deferralGrantFacts: parsed.deferralGrantFacts,
      offsetAgreementFacts: parsed.offsetAgreementFacts,
    }),
    providerCalled: false as const,
    executionBoundary: "LOCAL_TESSERACT_WORKER" as const,
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" as const,
    retainedSourceContent: "NONE" as const,
    requiresHumanReview: true as const,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW" as const,
  });
}

describe("fiscal notification local review flow", () => {
  it("returns only a review candidate and never retains source text or File metadata", async () => {
    const text = [
      "AGENCIA TRIBUTARIA",
      "sede.agenciatributaria.gob.es",
      "PROVIDENCIA DE APREMIO",
      "IDENTIFICACION DEL DOCUMENTO",
      "IMPORTE DE LA DEUDA",
      PRIVATE_TEXT,
    ].join("\n");

    const result = await analyzeForTest(
      { privateFilename: "PRIVATE_FILENAME.pdf" },
      dependencies(text),
    );

    expect(result).toMatchObject({
      schemaVersion: 1,
      flowVersion: "1.0.0",
      status: "REVIEW_REQUIRED",
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      engineId: "fiscal-notification-family-candidate-engine",
      engineVersion: "1.4.0",
      pageCount: 1,
      byteLength: 2_048,
      sha256: HASH,
      selectedFamilyId: null,
      providerCalled: false,
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      retainedSourceContent: "NONE",
      candidates: [
        {
          familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
          segmentationVersion: "1.1.0",
          documentType: "AEAT_ENFORCEMENT_ORDER",
          authoritySignal: "AEAT_UNVERIFIED",
          handlerId: "aeat-enforcement-order-candidate",
          handlerVersion: "1.0.0",
          signalStatus: "COMPLETE_REQUIRED_ANCHORS",
        },
      ],
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(PRIVATE_TEXT);
    expect(serialized).not.toContain("PRIVATE_FILENAME");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.candidates)).toBe(true);
    expect(Object.isFrozen(result.candidates[0]?.matchedAnchors)).toBe(true);
    expect(result).not.toHaveProperty("ephemeralEnforcementMoneyFacts");
    expect(result).not.toHaveProperty("ephemeralEnforcementExplicitFields");
  });

  it.each([
    [
      [
        "AGENCIA TRIBUTARIA",
        "sede.agenciatributaria.gob.es",
        "DILIGENCIA DE EMBARGO DE BIENES INMUEBLES",
      ].join("\n"),
      "AEAT_REAL_ESTATE_SEIZURE_CANDIDATE",
      "AEAT_SEIZURE_ORDER",
    ],
    [
      [
        "AGENCIA TRIBUTARIA",
        "sede.agenciatributaria.gob.es",
        "REQUERIMIENTO DE PRESENTACION DE DECLARACIONES O AUTOLIQUIDACIONES",
        "DECLARACIONES O AUTOLIQUIDACIONES NO PRESENTADAS",
      ].join("\n"),
      "AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE",
      "GENERIC_ADMINISTRATIVE_NOTICE",
    ],
    [
      [
        "AGENCIA TRIBUTARIA",
        "sede.agenciatributaria.gob.es",
        "ACUERDO DE ALTA EN EL REGISTRO DE OPERADORES INTRACOMUNITARIOS",
      ].join("\n"),
      "AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE",
      "GENERIC_ADMINISTRATIVE_NOTICE",
    ],
    [
      [
        "AGENCIA TRIBUTARIA",
        "sede.agenciatributaria.gob.es",
        "ACUERDO DE COMPENSACION DE OFICIO",
        "CREDITO Y DEUDAS COMPENSADAS DE OFICIO",
        "NUMERO DE ACUERDO DE COMPENSACION: ACUERDO-0001",
      ].join("\n"),
      "AEAT_OFFSET_AGREEMENT_CANDIDATE",
      "AEAT_OFFSET_AGREEMENT",
    ],
  ])(
    "propagates the R1 review-only family %s without materialization",
    async (text, familyId, documentType) => {
      const analysis = await analyzeEphemeralForTest({}, dependencies(text));
      expect(analysis).toMatchObject({
        technicalReview: {
          engineVersion: "1.4.0",
          status: "REVIEW_REQUIRED",
          reason: "SUPPORTED_FAMILY_CANDIDATE",
          candidates: [
            { familyId, segmentationVersion: "1.1.0", documentType },
          ],
          selectedFamilyId: null,
          providerCalled: false,
          requiresHumanReview: true,
          materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
          retainedSourceContent: "NONE",
        },
        ephemeralEnforcementMoneyFacts: null,
        ephemeralEnforcementExplicitFields: null,
        materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      });
    },
  );

  it("returns explicit money facts in a separate ephemeral envelope", async () => {
    const text = [
      "AGENCIA TRIBUTARIA",
      "sede.agenciatributaria.gob.es",
      "PROVIDENCIA DE APREMIO",
      "IDENTIFICACION DEL DOCUMENTO",
      "IMPORTE DE LA DEUDA",
      "Principal pendiente: 100,00 EUR",
      "Recargo ordinario (20 %): 20,00 EUR",
      "Ingreso a cuenta: 0,00 EUR",
      "Importe total: 120,00 EUR",
      "IDENTIFICACION DEL OBLIGADO AL PAGO",
      "NOMBRE / RAZON SOCIAL: PERSONA SINTETICA",
      "NIF: 12345678Z",
      "PLAZOS DE PAGO",
      `Clave de liquidación: ${PRIVATE_TEXT}`,
      "Fecha de emisión: 05/07/2026",
    ].join("\n");

    const analysis = await analyzeEphemeralForTest({}, dependencies(text));

    expect(analysis).toMatchObject({
      schemaVersion: 6,
      analysisVersion: "6.0.0",
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      technicalReview: {
        reason: "SUPPORTED_FAMILY_CANDIDATE",
        retainedSourceContent: "NONE",
      },
      ephemeralEnforcementMoneyFacts: {
        engineVersion: "1.1.0",
        status: "REVIEW_REQUIRED",
        outcome: "FACTS_AVAILABLE",
        selectedPaymentAmountKind: null,
        facts: [
          { kind: "OUTSTANDING_PRINCIPAL", amountCents: 10_000 },
          { kind: "ORDINARY_ENFORCEMENT_SURCHARGE", amountCents: 2_000 },
          { kind: "PAYMENT_ON_ACCOUNT", amountCents: 0 },
          { kind: "DOCUMENT_TOTAL", amountCents: 12_000 },
        ],
      },
      ephemeralEnforcementExplicitFields: {
        status: "REVIEW_REQUIRED",
        outcome: "FACTS_AVAILABLE",
        referenceFacts: [
          {
            kind: "LIQUIDATION_KEY",
            printedValue: PRIVATE_TEXT,
            occurrenceCount: 1,
            valueDisclosure: "EPHEMERAL_UI_ONLY",
          },
        ],
        printedDateFacts: [
          {
            kind: "PRINTED_ISSUE_DATE",
            printedValue: "05/07/2026",
            calendarDate: "2026-07-05",
            dateMeaning: "PRINTED_LABEL_ONLY",
            legalEffect: "NOT_DETERMINED",
          },
        ],
        deadlinePolicy: "NOT_CALCULATED",
        calculatedDeadline: null,
        referenceValuePolicy: "EPHEMERAL_UI_ONLY",
        persistencePolicy: "DO_NOT_PERSIST",
      },
      ephemeralEnforcementPartyFacts: {
        engineId: "aeat-enforcement-party-facts",
        outcome: "FACTS_AVAILABLE",
        identifiedSubject: {
          role: "PAYMENT_OBLIGOR",
          printedName: "PERSONA SINTETICA",
          printedTaxId: "12345678Z",
        },
        persistencePolicy: "DO_NOT_PERSIST",
      },
    });
    const serialized = JSON.stringify(analysis);
    expect(serialized).toContain(PRIVATE_TEXT);
    expect(JSON.stringify(analysis.technicalReview)).not.toContain(PRIVATE_TEXT);
    expect(serialized).not.toMatch(/ownerScope|documentId|filename|textSnippet/i);
    expect(Object.isFrozen(analysis)).toBe(true);
    expect(Object.isFrozen(analysis.ephemeralEnforcementMoneyFacts)).toBe(true);
    expect(Object.isFrozen(analysis.ephemeralEnforcementExplicitFields)).toBe(
      true,
    );
    expect(Object.isFrozen(analysis.ephemeralEnforcementPartyFacts)).toBe(true);
    expect(Object.isFrozen(analysis.technicalReview)).toBe(true);
  });

  it("propagates recognized structural documents and their ephemeral data without a URL", async () => {
    const text = [
      "PROVIDENCIA DE APREMIO",
      "IDENTIFICACION DEL DOCUMENTO",
      "IMPORTE DE LA DEUDA",
      "Cabecera de importes",
      "Principal pendiente: 100,00 EUR",
      `Referencia del documento: ${PRIVATE_TEXT}`,
      "Fecha de emisión: 05/07/2026",
    ].join("\n");

    const analysis = await analyzeEphemeralForTest({}, dependencies(text));

    expect(analysis).toMatchObject({
      technicalReview: {
        engineVersion: "1.4.0",
        reason: "SUPPORTED_FAMILY_CANDIDATE",
        candidates: [
          expect.objectContaining({
            authoritySignal: "AEAT_UNVERIFIED",
            missingRequiredAnchorIds: [],
          }),
        ],
      },
      ephemeralEnforcementMoneyFacts: {
        engineVersion: "1.1.0",
        outcome: "FACTS_AVAILABLE",
        facts: [
          expect.objectContaining({
            kind: "OUTSTANDING_PRINCIPAL",
            amountCents: 10_000,
          }),
        ],
      },
      ephemeralEnforcementExplicitFields: {
        outcome: "FACTS_AVAILABLE",
        referenceFacts: [
          expect.objectContaining({
            kind: "DOCUMENT_REFERENCE",
            printedValue: PRIVATE_TEXT,
          }),
        ],
        printedDateFacts: [
          expect.objectContaining({ calendarDate: "2026-07-05" }),
        ],
      },
    });
    expect(JSON.stringify(analysis)).toContain(PRIVATE_TEXT);
    expect(JSON.stringify(analysis.technicalReview)).not.toContain(PRIVATE_TEXT);
  });

  it("propagates exact deferral installments in the v6 ephemeral envelope", async () => {
    const text = [
      "AGENCIA TRIBUTARIA",
      "sede.agenciatributaria.gob.es",
      "CONCESION DEL APLAZAMIENTO O FRACCIONAMIENTO",
      "IDENTIFICACION DEL DOCUMENTO",
      "N.I.F.: X0000000X",
      "Nombre: PERSONA SINTETICA",
      "Numero de expediente: EXP-SYN-001",
      "ANEXO I: DEUDAS Y PLAZOS DE LA NOTIFICACION",
      "Numero Liquidacion: L-SYN-001",
      "Concepto: IRPF SINTETICO",
      "Fecha de Intereses: 01-01-2026",
      "1.000,00 0,00 1.000,00 50,00 1.050,00 20-02-2026",
      "ANEXO II",
      "CALCULO DE INTERESES",
    ].join("\n");

    const analysis = await analyzeEphemeralForTest({}, dependencies(text));

    expect(analysis).toMatchObject({
      schemaVersion: 6,
      analysisVersion: "6.0.0",
      technicalReview: {
        reason: "SUPPORTED_FAMILY_CANDIDATE",
        candidates: [
          { familyId: "AEAT_DEFERRAL_GRANT_CANDIDATE" },
        ],
      },
      ephemeralEnforcementMoneyFacts: null,
      ephemeralEnforcementExplicitFields: null,
      ephemeralEnforcementPartyFacts: null,
      ephemeralDeferralGrantFacts: {
        outcome: "FACTS_AVAILABLE",
        header: {
          expediente: { printedValue: "EXP-SYN-001" },
        },
        debtSchedules: [
          {
            liquidationKey: { printedValue: "L-SYN-001" },
            installments: [
              {
                installmentTotal: { amountCents: 105_000 },
                dueDate: { calendarDate: "2026-02-20" },
              },
            ],
          },
        ],
      },
    });
    expect(Object.isFrozen(analysis.ephemeralDeferralGrantFacts)).toBe(true);
    expect(
      Object.isFrozen(
        analysis.ephemeralDeferralGrantFacts?.debtSchedules[0]?.installments,
      ),
    ).toBe(true);
  });

  it("keeps exact offset credit and debt facts available in memory", async () => {
    const text = [
      "AGENCIA TRIBUTARIA",
      "www.agenciatributaria.es",
      "ACUERDO DE COMPENSACIÓN A INSTANCIA DEL OBLIGADO AL PAGO",
      "ANEXO I",
      "CRÉDITO Y DEUDAS",
      "IDENTIFICACIÓN DEL DOCUMENTO",
      "NOMBRE Y APELLIDOS / RAZÓN SOCIAL: PERSONA SINTÉTICA",
      "N.I.F.: X0000000T",
      "NÚMERO DE ACUERDO DE COMPENSACIÓN: ACUERDO-0001",
      "FECHA DE PRESENTACIÓN DE LA SOLICITUD DE COMPENSACIÓN: 05/01/2026",
      "CRÉDITO:",
      "CREDITO-0001 DEVOLUCIÓN SINTÉTICA 10/01/2026 1.000,00 20,00 1.020,00 900,00",
      "DEUDA:",
      "VENCIMIENTO: DEUDA-0001 MODELO SINTÉTICO EJERCICIO 2025",
      "10/01/2026 800,00 80,00 20,00 0,00 900,00 900,00 0,00 ( 1)",
      "ANEXO II",
      "(1) EFECTOS DE LA COMPENSACIÓN",
      "EL IMPORTE DE LA DEUDA QUE FIGURA EN LA COLUMNA TOTAL PENDIENTE ANTES DE COMPENSAR HA QUEDADO EXTINGUIDO EN PERIODO VOLUNTARIO DE INGRESO.",
    ].join("\n");

    const analysis = await analyzeEphemeralForTest({}, dependencies(text));

    expect(analysis).toMatchObject({
      schemaVersion: 6,
      analysisVersion: "6.0.0",
      technicalReview: {
        candidates: [{ familyId: "AEAT_OFFSET_AGREEMENT_CANDIDATE" }],
      },
      ephemeralEnforcementMoneyFacts: null,
      ephemeralEnforcementExplicitFields: null,
      ephemeralEnforcementPartyFacts: null,
      ephemeralDeferralGrantFacts: null,
      ephemeralOffsetAgreementFacts: {
        agreementMode: "REQUESTED",
        outcome: "FACTS_AVAILABLE",
        credits: [{ totalCredit: { amountCents: 102_000 } }],
        debts: [
          {
            liquidationKey: { printedValue: "DEUDA-0001" },
            compensatedAmount: { amountCents: 90_000 },
            remainingAfterOffset: { amountCents: 0 },
          },
        ],
      },
    });
    expect(Object.isFrozen(analysis.ephemeralOffsetAgreementFacts)).toBe(true);
    expect(
      Object.isFrozen(analysis.ephemeralOffsetAgreementFacts?.debts[0]),
    ).toBe(true);
  });

  it("does not attach the enforcement reader to an unsupported family", async () => {
    const analysis = await analyzeEphemeralForTest(
      {},
      dependencies("COMUNICACION ADMINISTRATIVA SINTETICA"),
    );
    expect(analysis.ephemeralEnforcementMoneyFacts).toBeNull();
    expect(analysis.ephemeralEnforcementExplicitFields).toBeNull();
    expect(analysis.ephemeralEnforcementPartyFacts).toBeNull();
    expect(analysis.ephemeralDeferralGrantFacts).toBeNull();
    expect(analysis.ephemeralOffsetAgreementFacts).toBeNull();
    expect(analysis.technicalReview).toMatchObject({
      reason: "NO_SUPPORTED_FAMILY_SIGNAL",
      status: "INFORMATION_PENDING",
    });
  });

  it("passes the validated file and integrity metadata to local OCR", async () => {
    const request = scannedRequest();
    const recognize = vi.fn(async (value: unknown) => {
      expect(value).toEqual({
        ownerScope: "user:synthetic-review",
        documentId: "document:synthetic-review",
        file: request.file,
        expectedByteLength: 2_048,
        expectedSha256: HASH,
        expectedPageCount: 1,
      });
      return noReadableOcrResult();
    });

    const result = await analyzeForTest(
      request,
      dependencies("", { ocrPort: { recognize } }),
    );

    expect(result).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "NO_EXTRACTABLE_TEXT",
      engineId: null,
      engineVersion: null,
      candidates: [],
      providerCalled: false,
      retainedSourceContent: "NONE",
    });
    expect(recognize).toHaveBeenCalledTimes(1);
  });

  it("keeps every ephemeral reader empty when local OCR cannot read text", async () => {
    const analysis = await analyzeEphemeralForTest(
      scannedRequest(),
      dependencies("", {
        ocrPort: { recognize: vi.fn(async () => noReadableOcrResult()) },
      }),
    );

    expect(analysis).toMatchObject({
      schemaVersion: 6,
      analysisVersion: "6.0.0",
      technicalReview: {
        status: "INFORMATION_PENDING",
        reason: "NO_EXTRACTABLE_TEXT",
      },
      ephemeralEnforcementMoneyFacts: null,
      ephemeralEnforcementExplicitFields: null,
      ephemeralEnforcementPartyFacts: null,
      ephemeralDeferralGrantFacts: null,
      ephemeralOffsetAgreementFacts: null,
      textAcquisition: {
        mode: "LOCAL_OCR",
        averageConfidence: null,
      },
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
  });

  it("projects a definite OCR family and exposes the read confidence", async () => {
    const text = [
      "AGENCIA TRIBUTARIA",
      "www.agenciatributaria.es",
      "NOTIFICACIÓN DE PROVIDENCIA DE APREMIO",
      "IDENTIFICACIÓN DEL DOCUMENTO",
      "IMPORTE DE LA DEUDA",
    ].join("\n");
    const analysis = await analyzeEphemeralForTest(
      scannedRequest(),
      dependencies("", {
        ocrPort: { recognize: vi.fn(async () => availableOcrResult(text)) },
      }),
    );

    expect(analysis).toMatchObject({
      technicalReview: {
        reason: "SUPPORTED_FAMILY_CANDIDATE",
        candidates: [
          {
            familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
            signalStatus: "COMPLETE_REQUIRED_ANCHORS",
          },
        ],
      },
      textAcquisition: { mode: "LOCAL_OCR", averageConfidence: 0.93 },
    });
  });

  it("keeps unknown and partial documents pending without inventing a match", async () => {
    const result = await analyzeForTest(
      {},
      dependencies("COMUNICACION ADMINISTRATIVA SINTETICA"),
    );

    expect(result).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "NO_SUPPORTED_FAMILY_SIGNAL",
      candidates: [],
      selectedFamilyId: null,
    });
  });

  it("propagates a bounded intake failure without invoking OCR", async () => {
    const failure = new Error("bounded-intake-failure");
    const readPdf = vi.fn(async () => {
      throw failure;
    });
    const recognize = vi.fn();

    await expect(
      analyzeForTest({}, {
        readPdf,
        ocrPort: { recognize },
      }),
    ).rejects.toBe(failure);
    expect(recognize).not.toHaveBeenCalled();
  });

  it("keeps dependency injection unavailable through the production function", () => {
    expect(analyzeFiscalNotificationLocally).toHaveLength(1);
    expect(FISCAL_NOTIFICATION_LOCAL_REVIEW_TEST_SEAM).not.toBeNull();
  });

  it("rejects an OCR outcome that could make providerCalled audit metadata false", async () => {
    const recognize = vi.fn(async () => ({
      ...noReadableOcrResult(),
      providerCalled: true as unknown as false,
    }));

    await expect(
      analyzeForTest(
        scannedRequest(),
        dependencies("", { ocrPort: { recognize } }),
      ),
    ).rejects.toMatchObject({
      code: "INVALID_WORKER_RESPONSE",
    });
  });

  it("propagates the non-enumerable abort signal into deterministic extraction", async () => {
    const controller = new AbortController();
    const prepared = intake("PROVIDENCIA DE APREMIO", controller.signal);
    const readPdf = vi.fn(async () => {
      controller.abort();
      return prepared;
    });

    await expect(
      analyzeForTest({}, {
        readPdf,
        ocrPort: DISABLED_FISCAL_NOTIFICATION_OCR_PORT,
      }),
    ).rejects.toMatchObject({ code: "ABORTED", path: "signal" });
    expect(JSON.stringify(await readPdf())).not.toContain('"signal":');
  });
});
