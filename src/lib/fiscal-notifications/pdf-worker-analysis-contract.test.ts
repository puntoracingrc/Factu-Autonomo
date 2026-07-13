import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractAeatEnforcementMoneyFacts } from "./aeat-enforcement-money-facts";
import { extractAeatEnforcementExplicitFieldsV1 } from "./aeat-enforcement-explicit-fields.v1";
import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import {
  FiscalNotificationPdfWorkerAnalysisError,
  parseFiscalNotificationPdfWorkerAnalysis,
  projectFiscalNotificationPdfWorkerAnalysis,
} from "./pdf-worker-analysis-contract";

const PRIVATE_SENTINEL = "PRIVATE_NIF_CSV_DOCUMENT_TEXT_SENTINEL";
const ENFORCEMENT_TEXT = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACION DEL DOCUMENTO",
  "IMPORTE DE LA DEUDA",
  "Principal pendiente: 100,00 EUR",
  "Recargo ordinario (20 %): 20,00 EUR",
  "Ingreso a cuenta: 0,00 EUR",
  "Importe total: 120,00 EUR",
  "PLAZOS DE PAGO",
  `Clave de liquidación: ${PRIVATE_SENTINEL}`,
  "Fecha de emisión: 10/07/2026",
  PRIVATE_SENTINEL,
].join("\n");

function documentInput(text = ENFORCEMENT_TEXT) {
  return Object.freeze({
    ownerScope: "worker:ephemeral",
    documentId: "document:ephemeral",
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text,
        isBlank: text.trim().length === 0,
      }),
    ]),
  });
}

function enforcementAnalysis() {
  const input = documentInput();
  return projectFiscalNotificationPdfWorkerAnalysis({
    textLayerStatus: "TEXT_LAYER_AVAILABLE",
    pageCount: input.pages.length,
    familyAnalysis: extractFiscalNotificationCandidates(input),
    enforcementMoneyFacts: extractAeatEnforcementMoneyFacts(input),
    enforcementExplicitFields:
      extractAeatEnforcementExplicitFieldsV1(input),
  });
}

function deferralAnalysis() {
  const input = documentInput(
    [
      "AGENCIA TRIBUTARIA",
      "sede.agenciatributaria.gob.es",
      "CONCESION DEL APLAZAMIENTO O FRACCIONAMIENTO",
      "ANEXO I",
      "CALCULO DE INTERESES",
    ].join("\n"),
  );
  return projectFiscalNotificationPdfWorkerAnalysis({
    textLayerStatus: "TEXT_LAYER_AVAILABLE",
    pageCount: 1,
    familyAnalysis: extractFiscalNotificationCandidates(input),
    enforcementMoneyFacts: null,
    enforcementExplicitFields: null,
  });
}

function conflictingAnalysis(conflict: string) {
  const input = documentInput(
    [
      conflict,
      "AGENCIA TRIBUTARIA",
      "sede.agenciatributaria.gob.es",
      "PROVIDENCIA DE APREMIO",
      "IDENTIFICACION DEL DOCUMENTO",
      "IMPORTE DE LA DEUDA",
      "CONCESION DEL APLAZAMIENTO O FRACCIONAMIENTO",
      "ANEXO I",
      "CALCULO DE INTERESES",
    ].join("\n"),
  );
  return projectFiscalNotificationPdfWorkerAnalysis({
    textLayerStatus: "TEXT_LAYER_AVAILABLE",
    pageCount: 1,
    familyAnalysis: extractFiscalNotificationCandidates(input),
    enforcementMoneyFacts: null,
    enforcementExplicitFields: null,
  });
}

function mutableAnalysis(
  value: unknown = enforcementAnalysis(),
): MutableAnalysis {
  return JSON.parse(JSON.stringify(value)) as MutableAnalysis;
}

function mutableMoneyFacts(value: unknown): MutableMoneyFacts {
  return JSON.parse(JSON.stringify(value)) as MutableMoneyFacts;
}

function mutableExplicitFields(value: unknown): MutableExplicitFields {
  return JSON.parse(JSON.stringify(value)) as MutableExplicitFields;
}

function completeExplicitFields(): MutableExplicitFields {
  const input = documentInput(
    [
      "AGENCIA TRIBUTARIA",
      "sede.agenciatributaria.gob.es",
      "PROVIDENCIA DE APREMIO",
      "IDENTIFICACION DEL DOCUMENTO",
      "IMPORTE DE LA DEUDA",
      "Clave de liquidación: SYNTHETIC-LIQUIDATION",
      "Referencia del documento: SYNTHETIC-DOCUMENT",
      "Número de justificante: SYNTHETIC-JUSTIFICANTE",
      "CSV: SYNTHETIC-CSV",
      "Vto.: 001",
      "Fecha de emisión: 10/07/2026",
      "Fecha de firma: 11/07/2026",
      "Fecha de finalización del período voluntario: 12/07/2026",
    ].join("\n"),
  );
  return mutableExplicitFields(
    extractAeatEnforcementExplicitFieldsV1(input),
  );
}

describe("fiscal notification PDF Worker safe analysis contract", () => {
  it("projects only closed family metadata and ephemeral money facts", () => {
    const analysis = enforcementAnalysis();

    expect(analysis).toMatchObject({
      schemaVersion: 2,
      analysisVersion: "2.0.0",
      textLayerStatus: "TEXT_LAYER_AVAILABLE",
      pageCount: 1,
      familyAnalysis: {
        reason: "SUPPORTED_FAMILY_CANDIDATE",
        candidates: [
          { familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE" },
        ],
      },
      enforcementMoneyFacts: {
        outcome: "FACTS_AVAILABLE",
        facts: [
          { kind: "OUTSTANDING_PRINCIPAL", amountCents: 10_000 },
          { kind: "ORDINARY_ENFORCEMENT_SURCHARGE", amountCents: 2_000 },
          { kind: "PAYMENT_ON_ACCOUNT", amountCents: 0 },
          { kind: "DOCUMENT_TOTAL", amountCents: 12_000 },
        ],
      },
      enforcementExplicitFields: {
        engineId: "aeat-enforcement-explicit-fields",
        outcome: "FACTS_AVAILABLE",
        referenceDetections: [
          {
            kind: "LIQUIDATION_KEY",
            occurrenceCount: 1,
            valueDisclosure: "REDACTED_IN_WORKER",
          },
        ],
        printedDateFacts: [
          {
            kind: "PRINTED_ISSUE_DATE",
            calendarDate: "2026-07-10",
            dateMeaning: "PRINTED_LABEL_ONLY",
            legalEffect: "NOT_DETERMINED",
          },
        ],
        deadlinePolicy: "NOT_CALCULATED",
        calculatedDeadline: null,
        retainedReferenceValues: "NONE",
      },
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      retainedSourceContent: "NONE",
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    const serialized = JSON.stringify(analysis);
    expect(serialized).not.toContain(PRIVATE_SENTINEL);
    expect(serialized).not.toMatch(
      /"(?:ownerScope|documentId|filename|bytes|pages|text|rawValue|textSnippet|nif|csv)"\s*:/i,
    );
    expect(Object.isFrozen(analysis)).toBe(true);
    expect(Object.isFrozen(analysis.familyAnalysis)).toBe(true);
    expect(Object.isFrozen(analysis.familyAnalysis?.candidates)).toBe(true);
    expect(Object.isFrozen(analysis.enforcementMoneyFacts)).toBe(true);
    expect(Object.isFrozen(analysis.enforcementMoneyFacts?.facts)).toBe(true);
    expect(
      Object.isFrozen(analysis.enforcementMoneyFacts?.facts[0]?.evidence[0]),
    ).toBe(true);
    expect(Object.isFrozen(analysis.enforcementExplicitFields)).toBe(true);
    expect(
      Object.isFrozen(
        analysis.enforcementExplicitFields?.referenceDetections,
      ),
    ).toBe(true);
    expect(
      Object.isFrozen(
        analysis.enforcementExplicitFields?.printedDateFacts[0]?.pageNumbers,
      ),
    ).toBe(true);
  });

  it("represents a textless PDF without fabricating analysis", () => {
    const analysis = projectFiscalNotificationPdfWorkerAnalysis({
      textLayerStatus: "NO_EXTRACTABLE_TEXT",
      pageCount: 2,
      familyAnalysis: null,
      enforcementMoneyFacts: null,
      enforcementExplicitFields: null,
    });
    expect(analysis).toMatchObject({
      textLayerStatus: "NO_EXTRACTABLE_TEXT",
      pageCount: 2,
      familyAnalysis: null,
      enforcementMoneyFacts: null,
      enforcementExplicitFields: null,
    });
  });

  it("keeps the enforcement money reader inapplicable to deferrals", () => {
    const analysis = deferralAnalysis();
    expect(analysis.familyAnalysis).toMatchObject({
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      candidates: [{ familyId: "AEAT_DEFERRAL_GRANT_CANDIDATE" }],
    });
    expect(analysis.enforcementMoneyFacts).toBeNull();
    expect(analysis.enforcementExplicitFields).toBeNull();
  });

  it.each([
    ["COMUNICACION ADMINISTRATIVA SINTETICA", "NO_SUPPORTED_FAMILY_SIGNAL"],
    ["PROVIDENCIA DE APREMIO", "PARTIAL_SUPPORTED_FAMILY_SIGNAL"],
    [
      `GUIA PARA INTERPRETAR\n${ENFORCEMENT_TEXT}`,
      "CONFLICTING_DOCUMENT_SIGNAL",
    ],
    [`${ENFORCEMENT_TEXT}\n\u202e`, "UNSUPPORTED_TEXT_CONTROLS"],
    [
      [
        "AGENCIA TRIBUTARIA",
        "sede.agenciatributaria.gob.es",
        "PROVIDENCIA DE APREMIO",
        "IDENTIFICACION DEL DOCUMENTO",
        "IMPORTE DE LA DEUDA",
        "CONCESION DEL APLAZAMIENTO O FRACCIONAMIENTO",
        "ANEXO I",
        "CALCULO DE INTERESES",
      ].join("\n"),
      "AMBIGUOUS_SUPPORTED_FAMILIES",
    ],
  ] as const)("accepts the engine's closed %s state", (text, reason) => {
    const input = documentInput(text);
    const analysis = projectFiscalNotificationPdfWorkerAnalysis({
      textLayerStatus: "TEXT_LAYER_AVAILABLE",
      pageCount: 1,
      familyAnalysis: extractFiscalNotificationCandidates(input),
      enforcementMoneyFacts: null,
      enforcementExplicitFields: null,
    });
    expect(analysis.familyAnalysis?.reason).toBe(reason);
    expect(analysis.enforcementMoneyFacts).toBeNull();
  });

  it("defensively snapshots a structured-clone-like response", () => {
    const source = mutableAnalysis();
    const parsed = parseFiscalNotificationPdfWorkerAnalysis(source);
    source.pageCount = 80;
    source.familyAnalysis!.reason = "PRIVATE_MUTATION" as never;
    source.enforcementMoneyFacts!.facts[0]!.amountCents = 99_999;
    source.enforcementExplicitFields!.printedDateFacts[0]!.calendarDate =
      "2025-01-01";

    expect(parsed.pageCount).toBe(1);
    expect(parsed.familyAnalysis?.reason).toBe(
      "SUPPORTED_FAMILY_CANDIDATE",
    );
    expect(parsed.enforcementMoneyFacts?.facts[0]?.amountCents).toBe(10_000);
    expect(
      parsed.enforcementExplicitFields?.printedDateFacts[0]?.calendarDate,
    ).toBe("2026-07-10");
    expect(JSON.stringify(parsed)).not.toContain("PRIVATE_MUTATION");
  });

  it.each([
    (value: MutableAnalysis) => {
      value.privateTaxId = PRIVATE_SENTINEL;
    },
    (value: MutableAnalysis) => {
      value.familyAnalysis!.rawValue = PRIVATE_SENTINEL;
    },
    (value: MutableAnalysis) => {
      value.familyAnalysis!.candidates[0]!.privateCsv = PRIVATE_SENTINEL;
    },
    (value: MutableAnalysis) => {
      value.familyAnalysis!.candidates[0]!.matchedAnchors[0]!.textSnippet =
        PRIVATE_SENTINEL;
    },
    (value: MutableAnalysis) => {
      value.enforcementMoneyFacts!.rawText = PRIVATE_SENTINEL;
    },
    (value: MutableAnalysis) => {
      value.enforcementMoneyFacts!.facts[0]!.rawValue = PRIVATE_SENTINEL;
    },
    (value: MutableAnalysis) => {
      value.enforcementMoneyFacts!.facts[0]!.evidence[0]!.lineNumber = 7;
    },
    (value: MutableAnalysis) => {
      value.enforcementMoneyFacts!.issues.push({
        code: "NO_CLOSED_LABEL_MATCH",
        kind: "DOCUMENT_TOTAL",
        pageNumbers: [1],
        privateValue: PRIVATE_SENTINEL,
      });
    },
    (value: MutableAnalysis) => {
      value.enforcementExplicitFields!.rawIdentifier = PRIVATE_SENTINEL;
    },
    (value: MutableAnalysis) => {
      value.enforcementExplicitFields!.referenceDetections[0]!.rawValue =
        PRIVATE_SENTINEL;
    },
    (value: MutableAnalysis) => {
      value.enforcementExplicitFields!.printedDateFacts[0]!.textSnippet =
        PRIVATE_SENTINEL;
    },
    (value: MutableAnalysis) => {
      value.enforcementExplicitFields!.issues[0]!.privateValue =
        PRIVATE_SENTINEL;
    },
  ])("rejects unknown keys at every response level", (mutate) => {
    const value = mutableAnalysis();
    mutate(value);
    expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
      FiscalNotificationPdfWorkerAnalysisError,
    );
  });

  it("rejects accessors, symbols, exotic prototypes and sparse arrays", () => {
    const accessor = mutableAnalysis();
    const getter = () => PRIVATE_SENTINEL;
    Object.defineProperty(accessor, "privateCsv", { get: getter });

    const symbol = mutableAnalysis();
    Object.defineProperty(symbol, Symbol("private"), { value: PRIVATE_SENTINEL });

    const exotic = Object.assign(Object.create({ inherited: true }),
      mutableAnalysis(),
    );

    const sparse = mutableAnalysis();
    sparse.familyAnalysis!.candidates.length = 2;

    const sparseExplicitFields = mutableAnalysis();
    sparseExplicitFields.enforcementExplicitFields!.issues.length = 8;

    for (const value of [
      accessor,
      symbol,
      exotic,
      sparse,
      sparseExplicitFields,
    ]) {
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it("requires the closed v2 envelope and rejects a v1 downgrade", () => {
    const versionOne = mutableAnalysis();
    versionOne.schemaVersion = 1;
    versionOne.analysisVersion = "1.0.0";

    const missingField: Record<string | symbol, unknown> = mutableAnalysis();
    delete missingField.enforcementExplicitFields;

    for (const value of [versionOne, missingField]) {
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it("binds explicit fields to the same complete enforcement gate", () => {
    const enforcementWithoutFields = mutableAnalysis();
    enforcementWithoutFields.enforcementExplicitFields = null;

    const deferralWithFields = mutableAnalysis(deferralAnalysis());
    deferralWithFields.enforcementExplicitFields = completeExplicitFields();

    for (const value of [enforcementWithoutFields, deferralWithFields]) {
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it("accepts all eight redacted explicit fields at the aggregate limit", () => {
    const value = mutableAnalysis();
    value.enforcementExplicitFields = completeExplicitFields();
    for (const item of [
      ...value.enforcementExplicitFields.referenceDetections,
      ...value.enforcementExplicitFields.printedDateFacts,
    ]) {
      item.occurrenceCount = 16;
    }

    const parsed = parseFiscalNotificationPdfWorkerAnalysis(value);
    expect(parsed.enforcementExplicitFields).toMatchObject({
      outcome: "FACTS_AVAILABLE",
      referenceDetections: expect.arrayContaining([
        expect.objectContaining({
          kind: "VTO_RAW",
          valueDisclosure: "REDACTED_IN_WORKER",
        }),
      ]),
      printedDateFacts: expect.arrayContaining([
        expect.objectContaining({
          kind: "PRINTED_VOLUNTARY_PERIOD_END_DATE",
          legalEffect: "NOT_DETERMINED",
        }),
      ]),
      issues: [],
      calculatedDeadline: null,
    });

    value.enforcementExplicitFields.printedDateFacts[2]!.occurrenceCount = 17;
    expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
      FiscalNotificationPdfWorkerAnalysisError,
    );
  });

  it.each([
    "2026-02-29",
    "2026-07-10T00:00:00Z",
    "10/07/2026",
  ])("rejects the non-calendar printed date %s", (calendarDate) => {
    const value = mutableAnalysis();
    value.enforcementExplicitFields = completeExplicitFields();
    value.enforcementExplicitFields.printedDateFacts[0]!.calendarDate =
      calendarDate;
    expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
      FiscalNotificationPdfWorkerAnalysisError,
    );
  });

  it("rejects forged explicit-field provenance, counts and ordering", () => {
    const wrongReferenceLabel = mutableAnalysis();
    wrongReferenceLabel.enforcementExplicitFields = completeExplicitFields();
    wrongReferenceLabel.enforcementExplicitFields.referenceDetections[0]!
      .evidenceLabel = "CSV_LABEL";

    const impossibleCount = mutableAnalysis();
    impossibleCount.enforcementExplicitFields = completeExplicitFields();
    impossibleCount.enforcementExplicitFields.referenceDetections[0]!
      .occurrenceCount = 0;

    const morePagesThanOccurrences = mutableAnalysis();
    morePagesThanOccurrences.pageCount = 2;
    morePagesThanOccurrences.enforcementExplicitFields =
      completeExplicitFields();
    morePagesThanOccurrences.enforcementExplicitFields.referenceDetections[0]!
      .pageNumbers = [1, 2];

    const unsortedKinds = mutableAnalysis();
    unsortedKinds.enforcementExplicitFields = completeExplicitFields();
    unsortedKinds.enforcementExplicitFields.referenceDetections.reverse();

    for (const value of [
      wrongReferenceLabel,
      impossibleCount,
      morePagesThanOccurrences,
      unsortedKinds,
    ]) {
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it("rejects missing field coverage and a pending issue beside a fact", () => {
    const missingCoverage = mutableAnalysis();
    missingCoverage.enforcementExplicitFields!.issues.pop();

    const factAndPending = mutableAnalysis();
    factAndPending.enforcementExplicitFields!.issues.unshift({
      code: "LABEL_WITHOUT_VALUE",
      fieldKind: "LIQUIDATION_KEY",
      pageNumbers: [1],
    });

    for (const value of [missingCoverage, factAndPending]) {
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it("accepts only coherent ambiguous and blocked explicit-field states", () => {
    const ambiguous = mutableAnalysis();
    ambiguous.enforcementExplicitFields = completeExplicitFields();
    ambiguous.enforcementExplicitFields.status = "REVIEW_REQUIRED";
    ambiguous.enforcementExplicitFields.outcome = "AMBIGUOUS";
    ambiguous.enforcementExplicitFields.referenceDetections = [];
    ambiguous.enforcementExplicitFields.printedDateFacts = [];
    ambiguous.enforcementExplicitFields.issues = [
      {
        code: "MULTIPLE_DISTINCT_REFERENCE_VALUES",
        fieldKind: "LIQUIDATION_KEY",
        pageNumbers: [1],
      },
    ];
    expect(parseFiscalNotificationPdfWorkerAnalysis(ambiguous)
      .enforcementExplicitFields?.outcome).toBe("AMBIGUOUS");

    const blocked = mutableAnalysis();
    blocked.enforcementExplicitFields = completeExplicitFields();
    blocked.enforcementExplicitFields.status = "REVIEW_REQUIRED";
    blocked.enforcementExplicitFields.outcome = "PROCESSING_BLOCKED";
    blocked.enforcementExplicitFields.referenceDetections = [];
    blocked.enforcementExplicitFields.printedDateFacts = [];
    blocked.enforcementExplicitFields.issues = [
      {
        code: "INVALID_PRINTED_DATE",
        fieldKind: "PRINTED_ISSUE_DATE",
        pageNumbers: [1],
      },
    ];
    expect(parseFiscalNotificationPdfWorkerAnalysis(blocked)
      .enforcementExplicitFields?.outcome).toBe("PROCESSING_BLOCKED");

    const crossedIssue = mutableAnalysis(blocked);
    crossedIssue.enforcementExplicitFields!.issues[0]!.fieldKind =
      "LIQUIDATION_KEY";
    const impossibleGateFailure = mutableAnalysis(blocked);
    impossibleGateFailure.enforcementExplicitFields!.issues = [
      {
        code: "FAMILY_GATE_NOT_SATISFIED",
        fieldKind: null,
        pageNumbers: [],
      },
    ];
    const reversedPending = mutableAnalysis();
    reversedPending.enforcementExplicitFields!.issues.reverse();

    for (const value of [
      crossedIssue,
      impossibleGateFailure,
      reversedPending,
    ]) {
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it("rejects policy changes and any calculated deadline", () => {
    const retained = mutableAnalysis();
    retained.enforcementExplicitFields!.retainedReferenceValues =
      "PRIVATE_REFERENCE";

    const calculated = mutableAnalysis();
    calculated.enforcementExplicitFields!.calculatedDeadline = "2026-07-31";

    const legalEffect = mutableAnalysis();
    legalEffect.enforcementExplicitFields!.printedDateFacts[0]!.legalEffect =
      "DEADLINE_START";

    for (const value of [retained, calculated, legalEffect]) {
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -1,
    1.5,
    100_000_000_001,
  ])("rejects the unsafe cents value %j", (amountCents) => {
    const value = mutableAnalysis();
    value.enforcementMoneyFacts!.facts[0]!.amountCents = amountCents;
    expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
      FiscalNotificationPdfWorkerAnalysisError,
    );
  });

  it("rejects duplicate kinds and invalid evidence provenance", () => {
    const duplicate = mutableAnalysis();
    duplicate.enforcementMoneyFacts!.facts[1]!.kind =
      "OUTSTANDING_PRINCIPAL";

    const wrongLabel = mutableAnalysis();
    wrongLabel.enforcementMoneyFacts!.facts[0]!.evidence[0]!.label =
      "DOCUMENT_TOTAL_LABEL";

    const impossiblePage = mutableAnalysis();
    impossiblePage.enforcementMoneyFacts!.facts[0]!.evidence[0]!.pageNumber =
      2;

    for (const value of [duplicate, wrongLabel, impossiblePage]) {
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it("requires every absent covered money kind to remain explicitly pending", () => {
    const value = mutableAnalysis();
    value.enforcementMoneyFacts!.facts = [
      value.enforcementMoneyFacts!.facts[0]!,
    ];
    value.enforcementMoneyFacts!.issues = [];

    expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
      FiscalNotificationPdfWorkerAnalysisError,
    );
  });

  it("rejects available facts accompanied by a blocking money issue", () => {
    const value = mutableAnalysis();
    value.enforcementMoneyFacts!.issues.push({
      code: "SECTION_SCAN_LIMIT_EXCEEDED",
      kind: null,
      pageNumbers: [1],
    });

    expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
      FiscalNotificationPdfWorkerAnalysisError,
    );
  });

  it("binds money evidence to the enforcement amount-section anchor", () => {
    const value = mutableAnalysis();
    value.pageCount = 2;
    value.enforcementMoneyFacts!.facts[0]!.evidence[0]!.pageNumber = 2;

    expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
      FiscalNotificationPdfWorkerAnalysisError,
    );
  });

  it("accepts partial facts only when every absent kind stays pending", () => {
    const input = documentInput(
      [
        "AGENCIA TRIBUTARIA",
        "sede.agenciatributaria.gob.es",
        "PROVIDENCIA DE APREMIO",
        "IDENTIFICACION DEL DOCUMENTO",
        "IMPORTE DE LA DEUDA",
        "Principal pendiente: 100,00 EUR",
      ].join("\n"),
    );
    const analysis = projectFiscalNotificationPdfWorkerAnalysis({
      textLayerStatus: "TEXT_LAYER_AVAILABLE",
      pageCount: 1,
      familyAnalysis: extractFiscalNotificationCandidates(input),
      enforcementMoneyFacts: extractAeatEnforcementMoneyFacts(input),
      enforcementExplicitFields:
        extractAeatEnforcementExplicitFieldsV1(input),
    });

    expect(analysis.enforcementMoneyFacts).toMatchObject({
      outcome: "FACTS_AVAILABLE",
      facts: [{ kind: "OUTSTANDING_PRINCIPAL", amountCents: 10_000 }],
      issues: [
        { code: "NO_CLOSED_LABEL_MATCH", kind: "ORDINARY_ENFORCEMENT_SURCHARGE" },
        { code: "NO_CLOSED_LABEL_MATCH", kind: "PAYMENT_ON_ACCOUNT" },
        { code: "NO_CLOSED_LABEL_MATCH", kind: "DOCUMENT_TOTAL" },
      ],
    });
  });

  it("rejects unsorted, duplicate and out-of-range page traces", () => {
    const values = [
      [1, 1],
      [2, 1],
      [2],
      [0],
    ];
    for (const pageNumbers of values) {
      const value = mutableAnalysis();
      value.familyAnalysis!.candidates[0]!.matchedAnchors[0]!.pageNumbers =
        pageNumbers;
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it("binds page-one domain and structural-header provenance", () => {
    const domainOffFirstPage = mutableAnalysis();
    domainOffFirstPage.pageCount = 2;
    const domainAnchor = domainOffFirstPage.familyAnalysis!.candidates[0]!
      .matchedAnchors.find(
        (anchor) => anchor.anchorId === "AEAT_OFFICIAL_DOMAIN_LABEL",
      );
    if (!domainAnchor) throw new Error("Synthetic domain anchor missing");
    domainAnchor.pageNumbers = [2];

    const titleOffFirstPage = mutableAnalysis();
    titleOffFirstPage.pageCount = 2;
    const titleAnchor = titleOffFirstPage.familyAnalysis!.candidates[0]!
      .matchedAnchors.find(
        (anchor) => anchor.anchorId === "ENFORCEMENT_ORDER_TITLE",
      );
    if (!titleAnchor) throw new Error("Synthetic title anchor missing");
    titleAnchor.pageNumbers = [2];

    const repeatedTitle = mutableAnalysis();
    repeatedTitle.pageCount = 2;
    const repeatedTitleAnchor = repeatedTitle.familyAnalysis!.candidates[0]!
      .matchedAnchors.find(
        (anchor) => anchor.anchorId === "ENFORCEMENT_ORDER_TITLE",
      );
    if (!repeatedTitleAnchor) throw new Error("Synthetic title anchor missing");
    repeatedTitleAnchor.pageNumbers = [1, 2];

    for (const value of [
      domainOffFirstPage,
      titleOffFirstPage,
      repeatedTitle,
    ]) {
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it("accepts a later attached title only as an incomplete candidate", () => {
    const input = Object.freeze({
      ownerScope: "worker:ephemeral",
      documentId: "document:attached-ephemeral",
      pages: Object.freeze([
        Object.freeze({ pageNumber: 1, text: "Wrapper", isBlank: false }),
        Object.freeze({
          pageNumber: 2,
          text: "Wrapper continuation",
          isBlank: false,
        }),
        Object.freeze({
          pageNumber: 3,
          text: [
            "AGENCIA TRIBUTARIA",
            "sede.agenciatributaria.gob.es",
            "PROVIDENCIA DE APREMIO",
            "IDENTIFICACION DEL DOCUMENTO",
          ].join("\n"),
          isBlank: false,
        }),
        Object.freeze({
          pageNumber: 4,
          text: "IMPORTE DE LA DEUDA",
          isBlank: false,
        }),
      ]),
    });
    const analysis = projectFiscalNotificationPdfWorkerAnalysis({
      textLayerStatus: "TEXT_LAYER_AVAILABLE",
      pageCount: 4,
      familyAnalysis: extractFiscalNotificationCandidates(input),
      enforcementMoneyFacts: null,
      enforcementExplicitFields: null,
    });
    expect(analysis.familyAnalysis).toMatchObject({
      engineVersion: "1.1.0",
      status: "INFORMATION_PENDING",
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      candidates: [
        {
          signalStatus: "INCOMPLETE_REQUIRED_ANCHORS",
          missingRequiredAnchorIds: ["STRUCTURAL_FIRST_PAGE_HEADER"],
          matchedAnchors: expect.arrayContaining([
            { anchorId: "AEAT_OFFICIAL_DOMAIN_LABEL", pageNumbers: [3] },
            { anchorId: "ENFORCEMENT_ORDER_TITLE", pageNumbers: [3] },
          ]),
        },
      ],
    });

    const forgedComplete = mutableAnalysis(analysis);
    forgedComplete.familyAnalysis!.status = "REVIEW_REQUIRED";
    forgedComplete.familyAnalysis!.reason = "SUPPORTED_FAMILY_CANDIDATE";
    const candidate = forgedComplete.familyAnalysis!.candidates[0]!;
    candidate.signalStatus = "COMPLETE_REQUIRED_ANCHORS";
    candidate.missingRequiredAnchorIds = [];
    candidate.matchedAnchors.push({
      anchorId: "STRUCTURAL_FIRST_PAGE_HEADER",
      pageNumbers: [1],
    });
    expect(() => parseFiscalNotificationPdfWorkerAnalysis(forgedComplete)).toThrow(
      FiscalNotificationPdfWorkerAnalysisError,
    );
  });

  it.each([
    [
      "TESORERIA GENERAL DE LA SEGURIDAD SOCIAL",
      "CONFLICTING_AUTHORITY_OR_TERRITORY",
    ],
    ["GUIA PARA INTERPRETAR", "CONFLICTING_DOCUMENT_SIGNAL"],
  ] as const)(
    "rejects a mixed candidate state for the global conflict %s",
    (conflict, expectedReason) => {
      const value = mutableAnalysis(conflictingAnalysis(conflict));
      expect(value.familyAnalysis?.reason).toBe(expectedReason);
      expect(value.familyAnalysis?.candidates).toHaveLength(2);
      const candidate = value.familyAnalysis!.candidates[1]!;
      candidate.signalStatus = "COMPLETE_REQUIRED_ANCHORS";
      candidate.conflictingAnchorIds = [];
      candidate.matchedAnchors = candidate.matchedAnchors.filter(
        (anchor) =>
          !String(anchor.anchorId).startsWith("CONFLICTING_"),
      );

      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    },
  );

  it("rejects incoherent text, family and money combinations", () => {
    const noTextWithFamily = mutableAnalysis();
    noTextWithFamily.textLayerStatus = "NO_EXTRACTABLE_TEXT";

    const textWithoutFamily = mutableAnalysis();
    textWithoutFamily.familyAnalysis = null;

    const enforcementWithoutMoney = mutableAnalysis();
    enforcementWithoutMoney.enforcementMoneyFacts = null;

    const deferralWithMoney = mutableAnalysis(deferralAnalysis());
    deferralWithMoney.enforcementMoneyFacts = mutableMoneyFacts(
      enforcementAnalysis().enforcementMoneyFacts,
    );

    for (const value of [
      noTextWithFamily,
      textWithoutFamily,
      enforcementWithoutMoney,
      deferralWithMoney,
    ]) {
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it("rejects impossible outcome and fact combinations", () => {
    const factsWithoutOutcome = mutableAnalysis();
    factsWithoutOutcome.enforcementMoneyFacts!.outcome = "INFORMATION_PENDING";
    factsWithoutOutcome.enforcementMoneyFacts!.status = "INFORMATION_PENDING";

    const availableWithoutFacts = mutableAnalysis();
    availableWithoutFacts.enforcementMoneyFacts!.facts = [];

    const blockedWithFacts = mutableAnalysis();
    blockedWithFacts.enforcementMoneyFacts!.outcome = "PROCESSING_BLOCKED";

    for (const value of [
      factsWithoutOutcome,
      availableWithoutFacts,
      blockedWithFacts,
    ]) {
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it("contains no network, AI, persistence, clock or operational action", () => {
    const source = readFileSync(
      new URL("./pdf-worker-analysis-contract.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|Date\.now|new Date|Math\.random|console\.|payment-actions|prepareAccountingDraft|create.*(?:Debt|Payment|Deadline|Entry)/i,
    );
  });
});

interface MutableAnalysis extends Record<string | symbol, unknown> {
  textLayerStatus: string;
  pageCount: number;
  familyAnalysis: MutableFamilyAnalysis | null;
  enforcementMoneyFacts: MutableMoneyFacts | null;
  enforcementExplicitFields: MutableExplicitFields | null;
}

interface MutableFamilyAnalysis extends Record<string, unknown> {
  reason: string;
  candidates: MutableCandidate[];
}

interface MutableCandidate extends Record<string, unknown> {
  familyId: string;
  signalStatus: string;
  matchedAnchors: Array<
    Record<string, unknown> & { anchorId: string; pageNumbers: number[] }
  >;
  conflictingAnchorIds: string[];
}

interface MutableMoneyFacts extends Record<string, unknown> {
  status: string;
  outcome: string;
  facts: MutableMoneyFact[];
  issues: Array<Record<string, unknown>>;
}

interface MutableMoneyFact extends Record<string, unknown> {
  kind: string;
  amountCents: number;
  evidence: Array<Record<string, unknown>>;
}

interface MutableExplicitFields extends Record<string, unknown> {
  status: string;
  outcome: string;
  referenceDetections: Array<
    Record<string, unknown> & {
      kind: string;
      occurrenceCount: number;
      pageNumbers: number[];
      evidenceLabel: string;
      valueDisclosure: string;
    }
  >;
  printedDateFacts: Array<
    Record<string, unknown> & {
      kind: string;
      calendarDate: string;
      occurrenceCount: number;
      pageNumbers: number[];
      evidenceLabel: string;
      legalEffect: string;
    }
  >;
  issues: Array<
    Record<string, unknown> & {
      code: string;
      fieldKind: string | null;
      pageNumbers: number[];
    }
  >;
}
