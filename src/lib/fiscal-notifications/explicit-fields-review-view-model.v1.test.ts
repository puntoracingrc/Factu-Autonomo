import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractAeatEnforcementExplicitFieldsV1 } from "./aeat-enforcement-explicit-fields.v1";
import type { BoundedDocumentInput } from "./input-contract";
import {
  ExplicitFieldsReviewViewModelError,
  projectExplicitFieldsReviewViewModelV1,
} from "./explicit-fields-review-view-model.v1";

const PRIVATE_REFERENCE = "PRIVATE_NIF_CSV_REFERENCE_SENTINEL";
const HEADER = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACION DEL DOCUMENTO",
  "IMPORTE DE LA DEUDA",
];

function documentWith(lines: readonly string[]): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "user:synthetic-view-model",
    documentId: "document:synthetic-view-model",
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text: [...HEADER, ...lines].join("\n"),
        isBlank: false,
      }),
    ]),
  });
}

function explicit(lines: readonly string[]) {
  return extractAeatEnforcementExplicitFieldsV1(documentWith(lines));
}

function mutable(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function firstRecord(
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return (value[key] as Array<Record<string, unknown>>)[0] ?? {};
}

describe("explicit fields review view model v1", () => {
  it("projects all safe labels while keeping every reference value hidden", () => {
    const result = projectExplicitFieldsReviewViewModelV1(
      explicit([
        `Clave de liquidación: ${PRIVATE_REFERENCE}`,
        "Referencia del documento: DOC-SYNTH-002",
        "Justificante de pago: JUST-SYNTH-003",
        "CSV: CSV-SYNTH-004",
        "Vto.: VTO-SYNTH-005",
        "Fecha de emisión: 05/07/2026",
        "Fecha de firma: 06-07-2026",
        "Fin del período voluntario: 07/07/2026",
      ]),
    );

    expect(result).toMatchObject({
      schemaVersion: 1,
      viewModelVersion: "1.0.0",
      state: "FACTS",
      stateLabel: "Datos impresos detectados",
      referenceDisclosure: "CATEGORY_ONLY_VALUE_HIDDEN",
      dateMeaning: "PRINTED_ONLY_NO_LEGAL_EFFECT",
      persistencePolicy: "DO_NOT_PERSIST",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      categories: [
        { kind: "LIQUIDATION_KEY", label: "Clave de liquidación" },
        { kind: "DOCUMENT_REFERENCE", label: "Referencia del documento" },
        { kind: "PAYMENT_JUSTIFICANTE", label: "Justificante de pago" },
        { kind: "CSV", label: "Código seguro de verificación (CSV)" },
        { kind: "VTO_RAW", label: "Vto. (identificador impreso)" },
      ],
      dates: [
        {
          kind: "PRINTED_ISSUE_DATE",
          dateTime: "2026-07-05",
          displayDate: "05/07/2026",
        },
        {
          kind: "PRINTED_SIGNATURE_DATE",
          dateTime: "2026-07-06",
          displayDate: "06/07/2026",
        },
        {
          kind: "PRINTED_VOLUNTARY_PERIOD_END_DATE",
          dateTime: "2026-07-07",
          displayDate: "07/07/2026",
        },
      ],
    });
    expect(result.categories.every((item) => item.detectionLabel.includes("valor oculto"))).toBe(true);
    expect(result.warnings).toEqual([
      "Las fechas impresas no confirman la fecha de notificación ni calculan un vencimiento.",
      "«Vto.» se trata como un identificador impreso, no como una fecha ni una cuota.",
    ]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(PRIVATE_REFERENCE);
    expect(serialized).not.toMatch(/rawValue|referenceValue|canonicalValue|sha256|ownerScope|documentId|text/i);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.categories)).toBe(true);
    expect(Object.isFrozen(result.categories[0])).toBe(true);
    expect(Object.isFrozen(result.categories[0]?.pageNumbers)).toBe(true);
    expect(Object.isFrozen(result.dates)).toBe(true);
    expect(Object.isFrozen(result.dates[0]?.pageNumbers)).toBe(true);
    expect(Object.isFrozen(result.warnings)).toBe(true);
  });

  it("keeps missing fields pending without inventing cards or negative conclusions", () => {
    const result = projectExplicitFieldsReviewViewModelV1(explicit([]));

    expect(result).toMatchObject({
      state: "PENDING",
      stateLabel: "Información pendiente",
      categories: [],
      dates: [],
    });
    expect(result.summary).toContain("La ausencia no confirma");
  });

  it("suppresses every partial field for ambiguous and blocked outcomes", () => {
    const ambiguous = projectExplicitFieldsReviewViewModelV1(
      explicit([
        "CSV: CSV-SYNTH-A",
        "CSV: CSV-SYNTH-B",
        "Fecha de emisión: 05/07/2026",
      ]),
    );
    const blocked = projectExplicitFieldsReviewViewModelV1(
      explicit([
        "Clave de liquidación: LQ-SYNTH-001",
        "Fecha de emisión: 31/02/2026",
      ]),
    );

    expect(ambiguous).toMatchObject({
      state: "AMBIGUOUS",
      categories: [],
      dates: [],
    });
    expect(blocked).toMatchObject({
      state: "BLOCKED",
      categories: [],
      dates: [],
    });
  });

  it("formats repeated occurrences and pages without timezone APIs", () => {
    const input = Object.freeze({
      ownerScope: "user:synthetic-view-model",
      documentId: "document:synthetic-view-model",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          text: [...HEADER, "CSV: SAME-SYNTH", "Fecha de firma: 29/02/2024"].join("\n"),
          isBlank: false,
        }),
        Object.freeze({
          pageNumber: 2,
          text: "CSV: SAME-SYNTH\nFecha de firma: 29/02/2024",
          isBlank: false,
        }),
      ]),
    });
    const result = projectExplicitFieldsReviewViewModelV1(
      extractAeatEnforcementExplicitFieldsV1(input),
    );

    expect(result.categories[0]).toMatchObject({
      occurrenceCount: 2,
      pageNumbers: [1, 2],
    });
    expect(result.dates[0]).toMatchObject({
      dateTime: "2024-02-29",
      displayDate: "29/02/2024",
      occurrenceCount: 2,
      pageNumbers: [1, 2],
    });
  });

  it.each([
    (value: Record<string, unknown>) => {
      value.privateCsv = PRIVATE_REFERENCE;
    },
    (value: Record<string, unknown>) => {
      firstRecord(value, "referenceDetections").rawValue = PRIVATE_REFERENCE;
    },
    (value: Record<string, unknown>) => {
      firstRecord(value, "printedDateFacts").legalEffect =
        "DEADLINE_CONFIRMED";
    },
    (value: Record<string, unknown>) => {
      value.deadlinePolicy = "CALCULATED";
      value.calculatedDeadline = "2026-07-20";
    },
    (value: Record<string, unknown>) => {
      firstRecord(value, "referenceDetections").pageNumbers = [2, 1];
    },
    (value: Record<string, unknown>) => {
      value.outcome = "INFORMATION_PENDING";
      value.status = "INFORMATION_PENDING";
    },
    (value: Record<string, unknown>) => {
      const issue = firstRecord(value, "issues");
      issue.code = "INVALID_REFERENCE_VALUE";
      issue.pageNumbers = [1];
    },
    (value: Record<string, unknown>) => {
      (value.issues as unknown[]).pop();
    },
  ])("fails closed for hostile or incoherent input %#", (mutate) => {
    const value = mutable(
      explicit([
        `Clave de liquidación: ${PRIVATE_REFERENCE}`,
        "Fecha de emisión: 05/07/2026",
      ]),
    );
    mutate(value);

    expect(() => projectExplicitFieldsReviewViewModelV1(value)).toThrow(
      ExplicitFieldsReviewViewModelError,
    );
  });

  it("rejects accessors, symbols and sparse arrays without evaluating private data", () => {
    const accessor = mutable(explicit([]));
    Object.defineProperty(accessor, "privateValue", {
      enumerable: true,
      get: () => PRIVATE_REFERENCE,
    });
    const symbol = mutable(explicit([]));
    Object.defineProperty(symbol, Symbol("private"), {
      value: PRIVATE_REFERENCE,
    });
    const sparse = mutable(explicit([]));
    (sparse.issues as unknown[]).length += 1;

    for (const value of [accessor, symbol, sparse]) {
      expect(() => projectExplicitFieldsReviewViewModelV1(value)).toThrow(
        ExplicitFieldsReviewViewModelError,
      );
    }
  });

  it("rejects hostile array descriptors, iterators and extra payloads without executing them", () => {
    const base = mutable(
      explicit(["CSV: CSV-SYNTH-004", "Fecha de firma: 06/07/2026"]),
    );
    const accessor = mutable(base);
    const accessorArray = accessor.referenceDetections as unknown[];
    let accessorCalls = 0;
    Object.defineProperty(accessorArray, "0", {
      enumerable: true,
      configurable: true,
      get: () => {
        accessorCalls += 1;
        return PRIVATE_REFERENCE;
      },
    });
    const iterator = mutable(base);
    const iteratorArray = iterator.referenceDetections as unknown[];
    let iteratorCalls = 0;
    Object.defineProperty(iteratorArray, Symbol.iterator, {
      value: function* hostileIterator() {
        iteratorCalls += 1;
        yield PRIVATE_REFERENCE;
      },
    });
    const extra = mutable(base);
    Object.defineProperty(extra.referenceDetections as unknown[], "privatePayload", {
      value: PRIVATE_REFERENCE,
      enumerable: true,
    });

    for (const value of [accessor, iterator, extra]) {
      expect(() => projectExplicitFieldsReviewViewModelV1(value)).toThrow(
        ExplicitFieldsReviewViewModelError,
      );
    }
    expect(accessorCalls).toBe(0);
    expect(iteratorCalls).toBe(0);
  });

  it("replaces hostile thrown errors with one generic safe error", () => {
    const hostileError = new ExplicitFieldsReviewViewModelError();
    Object.defineProperty(hostileError, "message", {
      value: PRIVATE_REFERENCE,
    });
    Object.defineProperty(hostileError, "privatePayload", {
      value: PRIVATE_REFERENCE,
      enumerable: true,
    });
    const value = new Proxy(Object.create(null) as object, {
      getPrototypeOf: () => {
        throw hostileError;
      },
    });

    try {
      projectExplicitFieldsReviewViewModelV1(value);
      throw new Error("Expected safe projection failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ExplicitFieldsReviewViewModelError);
      expect(error).not.toBe(hostileError);
      expect(error).toMatchObject({
        message: "INVALID_EXPLICIT_FIELDS_REVIEW_INPUT",
      });
      expect(JSON.stringify(error)).not.toContain(PRIVATE_REFERENCE);
    }
  });

  it("does not mutate inputs and isolates consecutive outputs", () => {
    const input = mutable(
      explicit(["CSV: CSV-SYNTH-004", "Fecha de firma: 06/07/2026"]),
    );
    const before = JSON.stringify(input);
    const first = projectExplicitFieldsReviewViewModelV1(input);
    const second = projectExplicitFieldsReviewViewModelV1(input);

    expect(JSON.stringify(input)).toBe(before);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.categories).not.toBe(second.categories);
  });

  it("contains no clock, network, AI, persistence, logging or operational action", () => {
    const source = readFileSync(
      new URL("./explicit-fields-review-view-model.v1.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|new Date|Date\.|Math\.random|console\.|create.*(?:Debt|Payment|Deadline|Entry)|prepareAccountingDraft/iu,
    );
  });
});
