import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractAeatEnforcementExplicitFieldsV2 } from "./aeat-enforcement-explicit-fields.v2";
import type { BoundedDocumentInput } from "./input-contract";
import {
  ExplicitFieldsReviewViewModelV2Error,
  projectExplicitFieldsReviewViewModelV2,
} from "./explicit-fields-review-view-model.v2";

const HEADER = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACION DEL DOCUMENTO",
  "IMPORTE DE LA DEUDA",
];

function documentWith(lines: readonly string[]): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "user:synthetic-visible-fields",
    documentId: "document:synthetic-visible-fields",
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
  return extractAeatEnforcementExplicitFieldsV2(documentWith(lines));
}

function mutable(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

describe("explicit fields review view model v2", () => {
  it("projects exact printed reference and date values as ephemeral review-only data", () => {
    const result = projectExplicitFieldsReviewViewModelV2(
      explicit([
        "Clave de liquidación: LQ-SYNTH-001",
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
      schemaVersion: 2,
      viewModelVersion: "2.0.0",
      state: "FACTS",
      stateLabel: "Datos detectados",
      referenceDisclosure: "EXACT_VALUE_VISIBLE_EPHEMERAL",
      persistencePolicy: "DO_NOT_PERSIST",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      categories: [
        { kind: "LIQUIDATION_KEY", printedValue: "LQ-SYNTH-001" },
        { kind: "DOCUMENT_REFERENCE", printedValue: "DOC-SYNTH-002" },
        { kind: "PAYMENT_JUSTIFICANTE", printedValue: "JUST-SYNTH-003" },
        { kind: "CSV", printedValue: "CSV-SYNTH-004" },
        { kind: "VTO_RAW", printedValue: "VTO-SYNTH-005" },
      ],
      dates: [
        {
          kind: "PRINTED_ISSUE_DATE",
          printedValue: "05/07/2026",
          dateTime: "2026-07-05",
        },
        {
          kind: "PRINTED_SIGNATURE_DATE",
          printedValue: "06-07-2026",
          dateTime: "2026-07-06",
        },
        {
          kind: "PRINTED_VOLUNTARY_PERIOD_END_DATE",
          printedValue: "07/07/2026",
          dateTime: "2026-07-07",
        },
      ],
    });
    expect(result.summary).toContain("Contrasta los valores");
    expect(result.ephemeralNotice).toContain("no se guardan");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.categories)).toBe(true);
    expect(Object.isFrozen(result.categories[0])).toBe(true);
    expect(Object.isFrozen(result.categories[0]?.pageNumbers)).toBe(true);
    expect(Object.isFrozen(result.dates)).toBe(true);
    expect(Object.isFrozen(result.warnings)).toBe(true);
  });

  it("keeps absent covered values pending without inventing facts", () => {
    const result = projectExplicitFieldsReviewViewModelV2(explicit([]));

    expect(result).toMatchObject({
      state: "PENDING",
      stateLabel: "Información pendiente",
      categories: [],
      dates: [],
    });
    expect(result.summary).toContain("La ausencia no confirma");
  });

  it("suppresses every value for an ambiguous document", () => {
    const result = projectExplicitFieldsReviewViewModelV2(
      explicit([
        "CSV: CSV-SYNTH-A",
        "CSV: CSV-SYNTH-B",
        "Fecha de emisión: 05/07/2026",
      ]),
    );

    expect(result).toMatchObject({
      state: "AMBIGUOUS",
      stateLabel: "Lectura ambigua",
      categories: [],
      dates: [],
    });
    expect(JSON.stringify(result)).not.toContain("CSV-SYNTH-A");
    expect(JSON.stringify(result)).not.toContain("CSV-SYNTH-B");
  });

  it.each(["<img src=x onerror=alert(1)>", "SAFE\u202eTXT"]) (
    "rejects hostile printed reference value %j without returning it",
    (hostileValue) => {
      const value = mutable(explicit(["CSV: CSV-SYNTH-004"]));
      const facts = value.referenceFacts as Array<Record<string, unknown>>;
      facts[0]!.printedValue = hostileValue;

      expect(() => projectExplicitFieldsReviewViewModelV2(value)).toThrow(
        ExplicitFieldsReviewViewModelV2Error,
      );
      try {
        projectExplicitFieldsReviewViewModelV2(value);
      } catch (error) {
        expect(JSON.stringify(error)).not.toContain(hostileValue);
      }
    },
  );

  it("does not mutate inputs and isolates consecutive frozen outputs", () => {
    const input = mutable(
      explicit(["CSV: CSV-SYNTH-004", "Fecha de firma: 06/07/2026"]),
    );
    const before = JSON.stringify(input);
    const first = projectExplicitFieldsReviewViewModelV2(input);
    const second = projectExplicitFieldsReviewViewModelV2(input);

    expect(JSON.stringify(input)).toBe(before);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.categories).not.toBe(second.categories);
    expect(first.dates).not.toBe(second.dates);
  });

  it("contains no clock, network, AI, persistence, logging or operational action", () => {
    const source = readFileSync(
      new URL("./explicit-fields-review-view-model.v2.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|new Date|Date\.|Math\.random|console\.|create.*(?:Debt|Payment|Deadline|Entry)|prepareAccountingDraft/iu,
    );
  });
});
