import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FiscalNotificationInputError } from "./input-contract";
import {
  AEAT_ENFORCEMENT_EXPLICIT_FIELDS_ENGINE_VERSION_V2,
  AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V2,
  AEAT_ENFORCEMENT_EXPLICIT_FIELDS_SCHEMA_VERSION_V2,
  extractAeatEnforcementExplicitFieldsV2,
  parseAeatEnforcementExplicitFieldsV2,
} from "./aeat-enforcement-explicit-fields.v2";

const ENFORCEMENT_HEADER = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "IMPORTE DE LA DEUDA",
].join("\n");

const FIELD_LINES = Object.freeze([
  "Clave de liquidación: LQ-SYNTH-001",
  "Referencia del documento: REF-SYNTH-002",
  "Número de justificante: JUST-SYNTH-003",
  "Código Seguro de Verificación (CSV): CSV-SYNTH-004",
  "Vto.: VTO-SYNTH-005",
  "Fecha de emisión: 05/02/2026",
  "Fecha de firma: 06-02-2026",
  "Fecha de finalización del período voluntario: 28/02/2026",
]);

function documentWith(pageTexts: readonly string[], signal?: AbortSignal) {
  return Object.freeze({
    ownerScope: "user:synthetic-visible-fields",
    documentId: "document:synthetic-visible-fields",
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

function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("AEAT enforcement explicit printed fields v2", () => {
  it("returns the five exact bounded references and three exact printed dates", () => {
    const result = extractAeatEnforcementExplicitFieldsV2(
      enforcementWith(...FIELD_LINES),
    );

    expect(result).toEqual({
      schemaVersion: AEAT_ENFORCEMENT_EXPLICIT_FIELDS_SCHEMA_VERSION_V2,
      engineId: "aeat-enforcement-explicit-fields",
      engineVersion: AEAT_ENFORCEMENT_EXPLICIT_FIELDS_ENGINE_VERSION_V2,
      documentType: "AEAT_ENFORCEMENT_ORDER",
      status: "REVIEW_REQUIRED",
      outcome: "FACTS_AVAILABLE",
      referenceFacts: [
        expect.objectContaining({
          kind: "LIQUIDATION_KEY",
          printedValue: "LQ-SYNTH-001",
          evidenceLabel: "LIQUIDATION_KEY_LABEL",
        }),
        expect.objectContaining({
          kind: "DOCUMENT_REFERENCE",
          printedValue: "REF-SYNTH-002",
        }),
        expect.objectContaining({
          kind: "PAYMENT_JUSTIFICANTE",
          printedValue: "JUST-SYNTH-003",
        }),
        expect.objectContaining({ kind: "CSV", printedValue: "CSV-SYNTH-004" }),
        expect.objectContaining({ kind: "VTO_RAW", printedValue: "VTO-SYNTH-005" }),
      ],
      printedDateFacts: [
        expect.objectContaining({
          kind: "PRINTED_ISSUE_DATE",
          printedValue: "05/02/2026",
          calendarDate: "2026-02-05",
        }),
        expect.objectContaining({
          kind: "PRINTED_SIGNATURE_DATE",
          printedValue: "06-02-2026",
          calendarDate: "2026-02-06",
        }),
        expect.objectContaining({
          kind: "PRINTED_VOLUNTARY_PERIOD_END_DATE",
          printedValue: "28/02/2026",
          calendarDate: "2026-02-28",
        }),
      ],
      issues: [],
      semanticPolicy: "EXPLICIT_PRINTED_FIELDS_ONLY",
      referenceValuePolicy: "EPHEMERAL_UI_ONLY",
      persistencePolicy: "DO_NOT_PERSIST",
      networkPolicy: "NO_NETWORK",
      vtoPolicy: "RAW_IDENTIFIER_NOT_DATE_OR_INSTALLMENT",
      dateMeaningPolicy: "PRINTED_LABEL_ONLY_NO_LEGAL_EFFECT",
      deadlinePolicy: "NOT_CALCULATED",
      calculatedDeadline: null,
      legalRuleStatus: "NOT_APPLIED",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    for (const fact of [...result.referenceFacts, ...result.printedDateFacts]) {
      expect(fact).toMatchObject({
        occurrenceCount: 1,
        pageNumbers: [1],
        extractionMethod: "RULE",
        assertionType: "EXPLICIT_IN_DOCUMENT",
        reviewStatus: "REVIEW_REQUIRED",
      });
    }
    expect(result.referenceFacts).toHaveLength(
      AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V2.maxReferenceFacts,
    );
  });

  it("accepts only the immediate physical next line and collapses exact repeats", () => {
    const result = extractAeatEnforcementExplicitFieldsV2(
      documentWith([
        [
          ENFORCEMENT_HEADER,
          "Clave de liquidación:",
          "LQ-NEXT-LINE",
          "Fecha de emisión:",
          "05/02/2026",
        ].join("\n"),
        "Clave de liquidación: LQ-NEXT-LINE\nFecha de emisión: 05/02/2026",
      ]),
    );
    expect(result.referenceFacts).toEqual([
      expect.objectContaining({
        kind: "LIQUIDATION_KEY",
        printedValue: "LQ-NEXT-LINE",
        occurrenceCount: 2,
        pageNumbers: [1, 2],
      }),
    ]);
    expect(result.printedDateFacts).toEqual([
      expect.objectContaining({
        printedValue: "05/02/2026",
        calendarDate: "2026-02-05",
        occurrenceCount: 2,
        pageNumbers: [1, 2],
      }),
    ]);

    const blankGap = extractAeatEnforcementExplicitFieldsV2(
      enforcementWith("Clave de liquidación:", "", "LQ-NOT-IMMEDIATE"),
    );
    expect(blankGap.referenceFacts).toEqual([]);
    expect(blankGap.issues[0]).toEqual({
      code: "LABEL_WITHOUT_VALUE",
      fieldKind: "LIQUIDATION_KEY",
      pageNumbers: [1],
    });
  });

  it("fails closed when exact printed forms differ, even for the same calendar date", () => {
    const distinctReferences = extractAeatEnforcementExplicitFieldsV2(
      documentWith([
        `${ENFORCEMENT_HEADER}\nClave de liquidación: LQ-SYNTH-A`,
        "Clave de liquidación: LQ-SYNTH-B",
      ]),
    );
    expect(distinctReferences).toMatchObject({
      outcome: "AMBIGUOUS",
      referenceFacts: [],
      printedDateFacts: [],
      issues: [
        {
          code: "MULTIPLE_DISTINCT_REFERENCE_VALUES",
          fieldKind: "LIQUIDATION_KEY",
          pageNumbers: [1, 2],
        },
      ],
    });
    expect(JSON.stringify(distinctReferences)).not.toContain("LQ-SYNTH");

    const distinctPrintedDates = extractAeatEnforcementExplicitFieldsV2(
      documentWith([
        `${ENFORCEMENT_HEADER}\nFecha de emisión: 05/02/2026`,
        "Fecha de emisión: 05-02-2026",
      ]),
    );
    expect(distinctPrintedDates).toMatchObject({
      outcome: "AMBIGUOUS",
      referenceFacts: [],
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

  it("keeps unsupported documents and invalid values fail-closed without leaking source", () => {
    const unsupported = extractAeatEnforcementExplicitFieldsV2(
      documentWith(["Comunicación sintética sin firma cerrada"]),
    );
    expect(unsupported).toMatchObject({
      documentType: null,
      status: "INFORMATION_PENDING",
      outcome: "INFORMATION_PENDING",
      referenceFacts: [],
      printedDateFacts: [],
      issues: [{ code: "FAMILY_GATE_NOT_SATISFIED" }],
    });
    expect(JSON.stringify(unsupported)).not.toContain("Comunicación sintética");

    const xss = extractAeatEnforcementExplicitFieldsV2(
      enforcementWith("Clave de liquidación: <script>alert(1)</script>"),
    );
    expect(xss).toMatchObject({
      outcome: "PROCESSING_BLOCKED",
      referenceFacts: [],
      issues: [{ code: "INVALID_REFERENCE_VALUE" }],
    });
    expect(JSON.stringify(xss)).not.toContain("script");

    const bidi = extractAeatEnforcementExplicitFieldsV2(
      enforcementWith("CSV: SAFE-SYNTH\u202e"),
    );
    expect(bidi).toMatchObject({
      documentType: null,
      outcome: "PROCESSING_BLOCKED",
      referenceFacts: [],
      issues: [{ code: "UNSUPPORTED_TEXT_STATE" }],
    });
  });

  it("parses its projection defensively and enforces the supplied page ceiling", () => {
    const extracted = extractAeatEnforcementExplicitFieldsV2(
      documentWith([
        ENFORCEMENT_HEADER,
        "Clave de liquidación: LQ-PAGE-TWO\nFecha de firma: 07/02/2026",
      ]),
    );
    const parsed = parseAeatEnforcementExplicitFieldsV2(
      jsonClone(extracted),
      2,
    );
    expect(parsed).toEqual(extracted);
    expect(parsed).not.toBe(extracted);
    expect(() =>
      parseAeatEnforcementExplicitFieldsV2(jsonClone(extracted), 1),
    ).toThrow("INVALID_AEAT_ENFORCEMENT_EXPLICIT_FIELDS_V2");
    expect(() =>
      parseAeatEnforcementExplicitFieldsV2(jsonClone(extracted), 81),
    ).toThrow("INVALID_AEAT_ENFORCEMENT_EXPLICIT_FIELDS_V2");
  });

  it.each([
    (value: Record<string, unknown>) => {
      value.rawText = "must-not-pass";
    },
    (value: Record<string, unknown>) => {
      (value.referenceFacts as Record<string, unknown>[])[0]!.rawValue =
        "must-not-pass";
    },
    (value: Record<string, unknown>) => {
      (value.printedDateFacts as Record<string, unknown>[])[0]!.confidence = 1;
    },
  ])("rejects unknown keys at every structured level", (mutate) => {
    const value = jsonClone(
      extractAeatEnforcementExplicitFieldsV2(enforcementWith(...FIELD_LINES)),
    ) as unknown as Record<string, unknown>;
    mutate(value);
    expect(() => parseAeatEnforcementExplicitFieldsV2(value)).toThrow(
      "INVALID_AEAT_ENFORCEMENT_EXPLICIT_FIELDS_V2",
    );
  });

  it("rejects accessors without evaluating them", () => {
    const value = jsonClone(
      extractAeatEnforcementExplicitFieldsV2(enforcementWith(...FIELD_LINES)),
    ) as unknown as Record<string, unknown>;
    let reads = 0;
    Object.defineProperty(value, "status", {
      enumerable: true,
      get() {
        reads += 1;
        return "REVIEW_REQUIRED";
      },
    });
    expect(() => parseAeatEnforcementExplicitFieldsV2(value)).toThrow(
      "INVALID_AEAT_ENFORCEMENT_EXPLICIT_FIELDS_V2",
    );
    expect(reads).toBe(0);

    const nested = jsonClone(
      extractAeatEnforcementExplicitFieldsV2(enforcementWith(...FIELD_LINES)),
    ) as unknown as {
      referenceFacts: Array<{ printedValue: unknown }>;
    };
    let coercions = 0;
    nested.referenceFacts[0]!.printedValue = {
      toString() {
        coercions += 1;
        return "LQ-FORGED-BY-COERCION";
      },
    };
    expect(() => parseAeatEnforcementExplicitFieldsV2(nested)).toThrow(
      "INVALID_AEAT_ENFORCEMENT_EXPLICIT_FIELDS_V2",
    );
    expect(coercions).toBe(0);
  });

  it("rejects forged values, noncanonical order, sparse arrays and unsafe dates", () => {
    const extracted = extractAeatEnforcementExplicitFieldsV2(
      enforcementWith(...FIELD_LINES),
    );
    const forged = jsonClone(extracted) as unknown as {
      referenceFacts: Array<{ printedValue: string }>;
    };
    forged.referenceFacts[0]!.printedValue = "<img/src=x>";
    expect(() => parseAeatEnforcementExplicitFieldsV2(forged)).toThrow();

    const reordered = jsonClone(extracted) as unknown as {
      referenceFacts: unknown[];
    };
    reordered.referenceFacts.reverse();
    expect(() => parseAeatEnforcementExplicitFieldsV2(reordered)).toThrow();

    const badDate = jsonClone(extracted) as unknown as {
      printedDateFacts: Array<{ calendarDate: string }>;
    };
    badDate.printedDateFacts[0]!.calendarDate = "2026-02-06";
    expect(() => parseAeatEnforcementExplicitFieldsV2(badDate)).toThrow();

    const sparse = jsonClone(extracted) as unknown as {
      referenceFacts: unknown[];
    };
    delete sparse.referenceFacts[0];
    expect(() => parseAeatEnforcementExplicitFieldsV2(sparse)).toThrow();
  });

  it("does not mutate inputs, honors cancellation and returns deep frozen copies", () => {
    const input = enforcementWith(...FIELD_LINES);
    const before = JSON.stringify(input);
    const first = extractAeatEnforcementExplicitFieldsV2(input);
    const second = extractAeatEnforcementExplicitFieldsV2(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.referenceFacts)).toBe(true);
    expect(Object.isFrozen(first.referenceFacts[0])).toBe(true);
    expect(Object.isFrozen(first.referenceFacts[0]?.pageNumbers)).toBe(true);
    expect(Object.isFrozen(first.printedDateFacts)).toBe(true);
    expect(Object.isFrozen(first.printedDateFacts[0])).toBe(true);
    expect(Object.isFrozen(first.issues)).toBe(true);

    const parsed = parseAeatEnforcementExplicitFieldsV2(jsonClone(first));
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.referenceFacts[0])).toBe(true);

    const controller = new AbortController();
    controller.abort();
    expect(() =>
      extractAeatEnforcementExplicitFieldsV2(
        documentWith(
          [`${ENFORCEMENT_HEADER}\nCSV: NEVER-READ`],
          controller.signal,
        ),
      ),
    ).toThrow(FiscalNotificationInputError);
  });

  it("contains no network, AI, persistence, raw-document retention or operational action", () => {
    const source = readFileSync(
      new URL("./aeat-enforcement-explicit-fields.v2.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|new Date|Date\.now|Math\.random|console\.|create.*(?:Debt|Payment|Deadline|Entry)|prepareAccountingDraft|payment-actions/iu,
    );
    const result = extractAeatEnforcementExplicitFieldsV2(
      enforcementWith("CSV: CSV-SAFE-ONLY"),
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("user:synthetic-visible-fields");
    expect(serialized).not.toContain("document:synthetic-visible-fields");
    expect(serialized).not.toContain(ENFORCEMENT_HEADER);
    expect(result).not.toHaveProperty("rawText");
    expect(result).not.toHaveProperty("pages");
  });
});
