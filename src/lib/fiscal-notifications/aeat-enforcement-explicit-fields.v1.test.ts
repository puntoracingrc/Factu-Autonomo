import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FiscalNotificationInputError } from "./input-contract";
import {
  AEAT_ENFORCEMENT_EXPLICIT_FIELDS_ENGINE_ID_V1,
  AEAT_ENFORCEMENT_EXPLICIT_FIELDS_ENGINE_VERSION_V1,
  AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1,
  AEAT_ENFORCEMENT_EXPLICIT_FIELDS_SCHEMA_VERSION_V1,
  extractAeatEnforcementExplicitFieldsV1,
  type AeatEnforcementExplicitFieldKindV1,
} from "./aeat-enforcement-explicit-fields.v1";

const ENFORCEMENT_HEADER = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "IMPORTE DE LA DEUDA",
].join("\n");

const REFERENCE_VALUES = Object.freeze({
  liquidation: "LQ-SYNTH-001",
  document: "REF-SYNTH-002",
  justificante: "JUST-SYNTH-003",
  csv: "CSV-SYNTH-004",
  vto: "VTO-SYNTH-005",
});

const ALL_FIELD_KINDS: readonly AeatEnforcementExplicitFieldKindV1[] = [
  "LIQUIDATION_KEY",
  "DOCUMENT_REFERENCE",
  "PAYMENT_JUSTIFICANTE",
  "CSV",
  "VTO_RAW",
  "PRINTED_ISSUE_DATE",
  "PRINTED_SIGNATURE_DATE",
  "PRINTED_VOLUNTARY_PERIOD_END_DATE",
];

function documentWith(
  pageTexts: readonly string[],
  signal?: AbortSignal,
) {
  return Object.freeze({
    ownerScope: "user:synthetic-explicit-fields",
    documentId: "document:synthetic-explicit-fields",
    pages: Object.freeze(
      pageTexts.map((text, index) =>
        Object.freeze({
          pageNumber: index + 1,
          text,
          isBlank: text.trim().length === 0,
        }),
      ),
    ),
    ...(signal ? { signal } : {}),
  });
}

function enforcementWith(...lines: readonly string[]) {
  return documentWith([[ENFORCEMENT_HEADER, ...lines].join("\n")]);
}

function completeFieldLines() {
  return [
    `Clave de liquidación: ${REFERENCE_VALUES.liquidation}`,
    `Referencia del documento: ${REFERENCE_VALUES.document}`,
    `Número de justificante: ${REFERENCE_VALUES.justificante}`,
    `Código Seguro de Verificación (CSV): ${REFERENCE_VALUES.csv}`,
    `Vto.: ${REFERENCE_VALUES.vto}`,
    "Fecha de emisión: 05/02/2026",
    "Fecha de firma: 06-02-2026",
    "Fecha de finalización del período voluntario: 28/02/2026",
  ] as const;
}

describe("AEAT enforcement explicit printed fields v1", () => {
  it("projects five redacted reference detections and three printed dates", () => {
    const result = extractAeatEnforcementExplicitFieldsV1(
      enforcementWith(...completeFieldLines()),
    );

    expect(result).toEqual({
      schemaVersion: AEAT_ENFORCEMENT_EXPLICIT_FIELDS_SCHEMA_VERSION_V1,
      engineId: AEAT_ENFORCEMENT_EXPLICIT_FIELDS_ENGINE_ID_V1,
      engineVersion: AEAT_ENFORCEMENT_EXPLICIT_FIELDS_ENGINE_VERSION_V1,
      documentType: "AEAT_ENFORCEMENT_ORDER",
      status: "REVIEW_REQUIRED",
      outcome: "FACTS_AVAILABLE",
      referenceDetections: [
        expect.objectContaining({
          kind: "LIQUIDATION_KEY",
          occurrenceCount: 1,
          pageNumbers: [1],
          evidenceLabel: "LIQUIDATION_KEY_LABEL",
        }),
        expect.objectContaining({
          kind: "DOCUMENT_REFERENCE",
          occurrenceCount: 1,
          pageNumbers: [1],
          evidenceLabel: "DOCUMENT_REFERENCE_LABEL",
        }),
        expect.objectContaining({
          kind: "PAYMENT_JUSTIFICANTE",
          occurrenceCount: 1,
          pageNumbers: [1],
          evidenceLabel: "PAYMENT_JUSTIFICANTE_LABEL",
        }),
        expect.objectContaining({
          kind: "CSV",
          occurrenceCount: 1,
          pageNumbers: [1],
          evidenceLabel: "CSV_LABEL",
        }),
        expect.objectContaining({
          kind: "VTO_RAW",
          occurrenceCount: 1,
          pageNumbers: [1],
          evidenceLabel: "VTO_RAW_LABEL",
        }),
      ],
      printedDateFacts: [
        expect.objectContaining({
          kind: "PRINTED_ISSUE_DATE",
          calendarDate: "2026-02-05",
          dateMeaning: "PRINTED_LABEL_ONLY",
          legalEffect: "NOT_DETERMINED",
        }),
        expect.objectContaining({
          kind: "PRINTED_SIGNATURE_DATE",
          calendarDate: "2026-02-06",
        }),
        expect.objectContaining({
          kind: "PRINTED_VOLUNTARY_PERIOD_END_DATE",
          calendarDate: "2026-02-28",
        }),
      ],
      issues: [],
      semanticPolicy: "EXPLICIT_PRINTED_FIELDS_ONLY",
      referenceValuePolicy: "REDACT_BEFORE_WORKER_RESPONSE",
      vtoPolicy: "RAW_IDENTIFIER_NOT_DATE_OR_INSTALLMENT",
      dateMeaningPolicy: "PRINTED_LABEL_ONLY_NO_LEGAL_EFFECT",
      deadlinePolicy: "NOT_CALCULATED",
      calculatedDeadline: null,
      legalRuleStatus: "NOT_APPLIED",
      retainedReferenceValues: "NONE",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    for (const item of [
      ...result.referenceDetections,
      ...result.printedDateFacts,
    ]) {
      expect(item).toMatchObject({
        extractionMethod: "RULE",
        assertionType: "EXPLICIT_IN_DOCUMENT",
        reviewStatus: "REVIEW_REQUIRED",
      });
    }
    expect(result.referenceDetections.length).toBeLessThanOrEqual(
      AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1.maxReferenceDetections,
    );
    expect(result.printedDateFacts.length).toBeLessThanOrEqual(
      AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1.maxPrintedDateFacts,
    );
    expect(result.issues.length).toBeLessThanOrEqual(
      AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1.maxIssues,
    );
  });

  it("redacts reference values before the returned projection exists", () => {
    const result = extractAeatEnforcementExplicitFieldsV1(
      enforcementWith(...completeFieldLines()),
    );
    const serialized = JSON.stringify(result);

    for (const privateValue of Object.values(REFERENCE_VALUES)) {
      expect(serialized).not.toContain(privateValue);
    }
    expect(serialized).not.toMatch(
      /"(?:rawValue|normalizedValue|value|preview|lastFour|digest|hash|snippet)"/iu,
    );
    expect(result.referenceDetections).toHaveLength(5);
    expect(
      result.referenceDetections.every(
        (item) => item.valueDisclosure === "REDACTED_IN_WORKER",
      ),
    ).toBe(true);
  });

  it("collapses identical internal-copy occurrences without exposing identity", () => {
    const repeated = [
      `Clave de liquidación: ${REFERENCE_VALUES.liquidation}`,
      "Fecha de emisión: 05/02/2026",
    ].join("\n");
    const result = extractAeatEnforcementExplicitFieldsV1(
      documentWith([`${ENFORCEMENT_HEADER}\n${repeated}`, repeated]),
    );

    expect(result).toMatchObject({
      outcome: "FACTS_AVAILABLE",
      referenceDetections: [
        {
          kind: "LIQUIDATION_KEY",
          occurrenceCount: 2,
          pageNumbers: [1, 2],
        },
      ],
      printedDateFacts: [
        {
          kind: "PRINTED_ISSUE_DATE",
          calendarDate: "2026-02-05",
          occurrenceCount: 2,
          pageNumbers: [1, 2],
        },
      ],
    });
  });

  it("accepts only the immediate physical next line for a separated value", () => {
    const accepted = extractAeatEnforcementExplicitFieldsV1(
      enforcementWith(
        "Clave de liquidación:",
        REFERENCE_VALUES.liquidation,
        "Fecha de emisión:",
        "05/02/2026",
      ),
    );
    expect(accepted.referenceDetections[0]).toMatchObject({
      kind: "LIQUIDATION_KEY",
    });
    expect(accepted.printedDateFacts[0]).toMatchObject({
      kind: "PRINTED_ISSUE_DATE",
      calendarDate: "2026-02-05",
    });

    const blankGap = extractAeatEnforcementExplicitFieldsV1(
      enforcementWith(
        "Clave de liquidación:",
        "",
        REFERENCE_VALUES.liquidation,
      ),
    );
    expect(blankGap.referenceDetections).toEqual([]);
    expect(blankGap.issues[0]).toEqual({
      code: "LABEL_WITHOUT_VALUE",
      fieldKind: "LIQUIDATION_KEY",
      pageNumbers: [1],
    });
  });

  it("does not treat narrative mentions or unlabeled values as fields", () => {
    const result = extractAeatEnforcementExplicitFieldsV1(
      enforcementWith(
        "La referencia legal mencionada debe revisarse manualmente.",
        "El CSV se explica en las instrucciones.",
        "Fecha de emisión indicada en otro documento.",
        REFERENCE_VALUES.csv,
      ),
    );

    expect(result).toMatchObject({
      status: "INFORMATION_PENDING",
      outcome: "INFORMATION_PENDING",
      referenceDetections: [],
      printedDateFacts: [],
    });
    expect(result.issues.map((item) => item.fieldKind)).toEqual(
      ALL_FIELD_KINDS,
    );
    expect(result.issues.every((item) => item.code === "NO_CLOSED_LABEL_MATCH"))
      .toBe(true);
  });

  it("keeps missing and label-without-value states explicit and canonically ordered", () => {
    const result = extractAeatEnforcementExplicitFieldsV1(
      enforcementWith(
        "Referencia:",
        "Vto.: VTO-ONLY",
        "Fecha de firma:",
      ),
    );

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      outcome: "FACTS_AVAILABLE",
      referenceDetections: [{ kind: "VTO_RAW" }],
      printedDateFacts: [],
    });
    expect(result.issues.map((item) => item.fieldKind)).toEqual([
      "LIQUIDATION_KEY",
      "DOCUMENT_REFERENCE",
      "PAYMENT_JUSTIFICANTE",
      "CSV",
      "PRINTED_ISSUE_DATE",
      "PRINTED_SIGNATURE_DATE",
      "PRINTED_VOLUNTARY_PERIOD_END_DATE",
    ]);
    expect(result.issues.find((item) => item.fieldKind === "DOCUMENT_REFERENCE"))
      .toMatchObject({ code: "LABEL_WITHOUT_VALUE", pageNumbers: [1] });
    expect(result.issues.find((item) => item.fieldKind === "PRINTED_SIGNATURE_DATE"))
      .toMatchObject({ code: "LABEL_WITHOUT_VALUE", pageNumbers: [1] });
  });

  it("does not project a kind when another occurrence of its label lacks a value", () => {
    const result = extractAeatEnforcementExplicitFieldsV1(
      enforcementWith(
        `Clave de liquidación: ${REFERENCE_VALUES.liquidation}`,
        "Clave de liquidación:",
        "Fecha de emisión: 05/02/2026",
      ),
    );

    expect(result.referenceDetections).toEqual([]);
    expect(result.printedDateFacts).toEqual([
      expect.objectContaining({ kind: "PRINTED_ISSUE_DATE" }),
    ]);
    expect(result.issues[0]).toEqual({
      code: "LABEL_WITHOUT_VALUE",
      fieldKind: "LIQUIDATION_KEY",
      pageNumbers: [1],
    });
  });

  it("never interprets a date-looking Vto. as a date or installment", () => {
    const result = extractAeatEnforcementExplicitFieldsV1(
      enforcementWith("Vto.: 15/03/2026"),
    );

    expect(result.referenceDetections).toEqual([
      expect.objectContaining({ kind: "VTO_RAW" }),
    ]);
    expect(result.printedDateFacts).toEqual([]);
    expect(result).toMatchObject({
      vtoPolicy: "RAW_IDENTIFIER_NOT_DATE_OR_INSTALLMENT",
      deadlinePolicy: "NOT_CALCULATED",
      calculatedDeadline: null,
    });
    expect(result).not.toHaveProperty("installment");
    expect(result).not.toHaveProperty("deadline");
  });

  it("fails closed when one reference kind has distinct printed values", () => {
    const result = extractAeatEnforcementExplicitFieldsV1(
      documentWith([
        `${ENFORCEMENT_HEADER}\nClave de liquidación: LQ-SYNTH-A`,
        "Clave de liquidación: LQ-SYNTH-B",
      ]),
    );

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      outcome: "AMBIGUOUS",
      referenceDetections: [],
      printedDateFacts: [],
      issues: [
        {
          code: "MULTIPLE_DISTINCT_REFERENCE_VALUES",
          fieldKind: "LIQUIDATION_KEY",
          pageNumbers: [1, 2],
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("LQ-SYNTH");
  });

  it("fails closed when one printed date kind has distinct values", () => {
    const result = extractAeatEnforcementExplicitFieldsV1(
      documentWith([
        `${ENFORCEMENT_HEADER}\nFecha de emisión: 05/02/2026`,
        "Fecha de emisión: 06/02/2026",
      ]),
    );

    expect(result).toMatchObject({
      outcome: "AMBIGUOUS",
      referenceDetections: [],
      printedDateFacts: [],
      issues: [
        {
          code: "MULTIPLE_DISTINCT_PRINTED_DATES",
          fieldKind: "PRINTED_ISSUE_DATE",
          pageNumbers: [1, 2],
        },
      ],
    });
  });

  it.each([
    "31/02/2026",
    "29/02/2025",
    "00/01/2026",
    "01/13/2026",
    "1/01/2026",
    "01/1/2026",
    "01/01/26",
    "2026-01-01",
    "01/02-2026",
  ])("blocks the invalid or unsupported printed date %j", (printedDate) => {
    const result = extractAeatEnforcementExplicitFieldsV1(
      enforcementWith(`Fecha de emisión: ${printedDate}`),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      outcome: "PROCESSING_BLOCKED",
      referenceDetections: [],
      printedDateFacts: [],
      issues: [
        {
          code: "INVALID_PRINTED_DATE",
          fieldKind: "PRINTED_ISSUE_DATE",
          pageNumbers: [1],
        },
      ],
    });
  });

  it("validates leap years without a timezone or calendar API", () => {
    expect(
      extractAeatEnforcementExplicitFieldsV1(
        enforcementWith("Fecha de emisión: 29/02/2024"),
      ).printedDateFacts[0],
    ).toMatchObject({ calendarDate: "2024-02-29" });
    expect(
      extractAeatEnforcementExplicitFieldsV1(
        enforcementWith("Fecha de emisión: 29/02/2000"),
      ).printedDateFacts[0],
    ).toMatchObject({ calendarDate: "2000-02-29" });
    expect(
      extractAeatEnforcementExplicitFieldsV1(
        enforcementWith("Fecha de emisión: 29/02/1900"),
      ),
    ).toMatchObject({ outcome: "PROCESSING_BLOCKED" });
  });

  it.each([
    "REFERENCE WITH SPACES",
    "REFERENCE#FRAGMENT",
    "REFERENCE?QUERY",
    "ÁCCENTED-REFERENCE",
    "_LEADING-SEPARATOR",
  ])("blocks the non-closed reference token %j", (token) => {
    const result = extractAeatEnforcementExplicitFieldsV1(
      enforcementWith(`Clave de liquidación: ${token}`),
    );
    expect(result).toMatchObject({
      outcome: "PROCESSING_BLOCKED",
      referenceDetections: [],
      printedDateFacts: [],
      issues: [
        {
          code: "INVALID_REFERENCE_VALUE",
          fieldKind: "LIQUIDATION_KEY",
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain(token);
  });

  it("accepts the exact reference-token limit and rejects the next character", () => {
    const maximum = `A${"1".repeat(
      AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1.maxReferenceTokenCharacters - 1,
    )}`;
    expect(
      extractAeatEnforcementExplicitFieldsV1(
        enforcementWith(`Clave de liquidación: ${maximum}`),
      ),
    ).toMatchObject({
      outcome: "FACTS_AVAILABLE",
      referenceDetections: [{ kind: "LIQUIDATION_KEY" }],
    });

    const oversized = `${maximum}2`;
    expect(
      extractAeatEnforcementExplicitFieldsV1(
        enforcementWith(`Clave de liquidación: ${oversized}`),
      ),
    ).toMatchObject({
      outcome: "PROCESSING_BLOCKED",
      issues: [{ code: "INVALID_REFERENCE_VALUE" }],
    });
  });

  it("cuts off excessive occurrences before returning partial facts", () => {
    const repeated = Array.from(
      {
        length:
          AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1.maxOccurrencesPerKind + 1,
      },
      () => `Clave de liquidación: ${REFERENCE_VALUES.liquidation}`,
    );
    const result = extractAeatEnforcementExplicitFieldsV1(
      enforcementWith(...repeated),
    );

    expect(result).toMatchObject({
      outcome: "PROCESSING_BLOCKED",
      referenceDetections: [],
      printedDateFacts: [],
      issues: [
        {
          code: "FIELD_SCAN_LIMIT_EXCEEDED",
          fieldKind: "LIQUIDATION_KEY",
          pageNumbers: [1],
        },
      ],
    });
  });

  it("enforces the aggregate occurrence limit across otherwise valid kinds", () => {
    const cycles = Math.floor(
      AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1.maxOccurrencesTotal /
        ALL_FIELD_KINDS.length,
    ) + 1;
    const repeated = Array.from({ length: cycles }, () => completeFieldLines())
      .flat();
    const result = extractAeatEnforcementExplicitFieldsV1(
      enforcementWith(...repeated),
    );

    expect(result).toMatchObject({
      outcome: "PROCESSING_BLOCKED",
      referenceDetections: [],
      printedDateFacts: [],
      issues: [
        {
          code: "FIELD_SCAN_LIMIT_EXCEEDED",
          pageNumbers: [1],
        },
      ],
    });
  });

  it("blocks an oversized physical line before matching a field", () => {
    const oversizedLine = "X".repeat(
      AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1.maxLineCharacters + 1,
    );
    const result = extractAeatEnforcementExplicitFieldsV1(
      enforcementWith(oversizedLine),
    );

    expect(result).toMatchObject({
      outcome: "PROCESSING_BLOCKED",
      issues: [
        {
          code: "FIELD_SCAN_LIMIT_EXCEEDED",
          fieldKind: null,
          pageNumbers: [1],
        },
      ],
    });
  });

  it.each([
    ["Comunicación administrativa sintética", "INFORMATION_PENDING"],
    ["PROVIDENCIA DE APREMIO", "INFORMATION_PENDING"],
    [
      [
        "AGENCIA TRIBUTARIA",
        "sede.agenciatributaria.gob.es",
        "CONCESIÓN DEL APLAZAMIENTO O FRACCIONAMIENTO",
        "ANEXO I",
        "CÁLCULO DE INTERESES",
      ].join("\n"),
      "PROCESSING_BLOCKED",
    ],
    [`TESORERÍA GENERAL DE LA SEGURIDAD SOCIAL\n${ENFORCEMENT_HEADER}`, "PROCESSING_BLOCKED"],
    [`GUÍA PARA INTERPRETAR\n${ENFORCEMENT_HEADER}`, "PROCESSING_BLOCKED"],
  ] as const)("keeps the unsupported family gate closed: %s", (text, outcome) => {
    const result = extractAeatEnforcementExplicitFieldsV1(documentWith([text]));
    expect(result).toMatchObject({
      documentType: null,
      outcome,
      referenceDetections: [],
      printedDateFacts: [],
      issues: [{ code: "FAMILY_GATE_NOT_SATISFIED", fieldKind: null }],
    });
  });

  it("maps hostile text controls to a blocked unsupported-text state", () => {
    const result = extractAeatEnforcementExplicitFieldsV1(
      enforcementWith("CSV: SAFE-SYNTH\u202e"),
    );
    expect(result).toMatchObject({
      documentType: null,
      status: "REVIEW_REQUIRED",
      outcome: "PROCESSING_BLOCKED",
      issues: [
        { code: "UNSUPPORTED_TEXT_STATE", fieldKind: null, pageNumbers: [] },
      ],
    });
  });

  it("honors cancellation before scanning any source content", () => {
    const controller = new AbortController();
    controller.abort();
    expect(() =>
      extractAeatEnforcementExplicitFieldsV1(
        documentWith([`${ENFORCEMENT_HEADER}\nCSV: PRIVATE`], controller.signal),
      ),
    ).toThrow(FiscalNotificationInputError);
  });

  it("does not mutate inputs and returns deeply isolated immutable outputs", () => {
    const input = enforcementWith(...completeFieldLines());
    const before = JSON.stringify(input);
    const first = extractAeatEnforcementExplicitFieldsV1(input);
    const second = extractAeatEnforcementExplicitFieldsV1(input);

    expect(JSON.stringify(input)).toBe(before);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.referenceDetections)).toBe(true);
    expect(Object.isFrozen(first.referenceDetections[0])).toBe(true);
    expect(Object.isFrozen(first.referenceDetections[0]?.pageNumbers)).toBe(true);
    expect(Object.isFrozen(first.printedDateFacts)).toBe(true);
    expect(Object.isFrozen(first.printedDateFacts[0])).toBe(true);
    expect(Object.isFrozen(first.issues)).toBe(true);
  });

  it("contains no network, AI, persistence, clock, logging or operational action", () => {
    const source = readFileSync(
      new URL("./aeat-enforcement-explicit-fields.v1.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|(?:^|[^\w])Date\.|new Date|Math\.random|console\.|create.*(?:Debt|Payment|Deadline|Entry)|prepareAccountingDraft|payment-actions/iu,
    );
    expect(source).not.toMatch(/(?:rawValue|normalizedValue|textSnippet)/u);
  });
});
