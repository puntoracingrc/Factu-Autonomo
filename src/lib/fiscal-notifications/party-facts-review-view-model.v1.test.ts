import { describe, expect, it } from "vitest";
import { extractAeatEnforcementPartyFactsV1 } from "./aeat-enforcement-party-facts.v1";
import type { BoundedDocumentInput } from "./input-contract";
import {
  PartyFactsReviewViewModelV1Error,
  projectPartyFactsReviewViewModelV1,
} from "./party-facts-review-view-model.v1";

const HEADER = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACION DEL DOCUMENTO",
  "IMPORTE DE LA DEUDA",
];

function documentWith(lines: readonly string[]): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "user:synthetic-party-view",
    documentId: "document:synthetic-party-view",
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text: [...HEADER, ...lines].join("\n"),
        isBlank: false,
      }),
    ]),
  });
}

function project(lines: readonly string[]) {
  return projectPartyFactsReviewViewModelV1(
    extractAeatEnforcementPartyFactsV1(documentWith(lines)),
  );
}

describe("party facts review view model v1", () => {
  it("presents exact printed name, NIF and definite document role", () => {
    const result = project([
      "IDENTIFICACION DEL OBLIGADO AL PAGO",
      "NOMBRE / RAZON SOCIAL: PERSONA SINTETICA",
      "NIF: 12345678Z",
    ]);

    expect(result).toMatchObject({
      schemaVersion: 1,
      viewModelVersion: "1.0.0",
      state: "FACTS",
      stateLabel: "Identificación leída",
      summary:
        "El documento identifica de forma expresa a la persona o entidad indicada como obligada al pago.",
      subject: {
        roleLabel: "Obligado al pago",
        nameLabel: "Nombre o razón social",
        taxIdLabel: "NIF",
        printedName: "PERSONA SINTETICA",
        printedTaxId: "12345678Z",
        occurrenceCount: 1,
        pageNumbers: [1],
      },
      roleMeaning: "EXPLICIT_PRINTED_SECTION_ONLY",
      persistencePolicy: "DO_NOT_PERSIST",
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    expect(result.summary).not.toMatch(/posible|podr[ií]a/iu);
    expect(result.warnings).toContain(
      "Mostrar esta identificación no crea ni confirma una deuda, un pago, un asiento o un plazo.",
    );
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.subject)).toBe(true);
  });

  it.each([
    [[], "PENDING", "Identificación pendiente"],
    [
      [
        "IDENTIFICACION DEL OBLIGADO AL PAGO",
        "NOMBRE / RAZON SOCIAL: <script>",
        "NIF: 12345678Z",
      ],
      "BLOCKED",
      "Identificación bloqueada",
    ],
  ] as const)("projects %s without exposing a partial subject", (lines, state, label) => {
    const result = project(lines);
    expect(result).toMatchObject({ state, stateLabel: label, subject: null });
  });

  it("rejects a structurally forged fact state", () => {
    const pending = project([]);
    expect(() =>
      projectPartyFactsReviewViewModelV1({
        ...pending,
        state: "FACTS",
      }),
    ).toThrowError(PartyFactsReviewViewModelV1Error);
  });
});
