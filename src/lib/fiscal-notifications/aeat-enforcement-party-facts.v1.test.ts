import { describe, expect, it } from "vitest";
import type { BoundedDocumentInput } from "./input-contract";
import {
  AeatEnforcementPartyFactsV1Error,
  extractAeatEnforcementPartyFactsV1,
  parseAeatEnforcementPartyFactsV1,
} from "./aeat-enforcement-party-facts.v1";

const HEADER = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACION DEL DOCUMENTO",
  "IMPORTE DE LA DEUDA",
];
const PRIVATE_NAME = "PERSONA SINTETICA DE PRUEBA";
const PRIVATE_TAX_ID = "12345678Z";

function documentWith(
  pages: readonly (readonly string[])[],
): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "user:synthetic-party-facts",
    documentId: "document:synthetic-party-facts",
    pages: Object.freeze(
      pages.map((lines, index) =>
        Object.freeze({
          pageNumber: index + 1,
          text: [...(index === 0 ? HEADER : []), ...lines].join("\n"),
          isBlank: false,
        }),
      ),
    ),
  });
}

function subjectSection(
  name = PRIVATE_NAME,
  taxId = PRIVATE_TAX_ID,
  nameLabel:
    | "NOMBRE / RAZON SOCIAL"
    | "NOMBRE Y RAZON SOCIAL"
    | "NOMBRE O RAZON SOCIAL" =
    "NOMBRE / RAZON SOCIAL",
): readonly string[] {
  return [
    "IDENTIFICACION DEL OBLIGADO AL PAGO",
    `${nameLabel}: ${name}`,
    `NIF: ${taxId}`,
  ];
}

function mutable(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

describe("AEAT enforcement party facts v1", () => {
  it("shows the exact printed subject and the explicit payment-obligor role", () => {
    const result = extractAeatEnforcementPartyFactsV1(
      documentWith([subjectSection()]),
    );

    expect(result).toEqual({
      schemaVersion: 1,
      engineId: "aeat-enforcement-party-facts",
      engineVersion: "1.0.0",
      documentType: "AEAT_ENFORCEMENT_ORDER",
      status: "REVIEW_REQUIRED",
      outcome: "FACTS_AVAILABLE",
      identifiedSubject: {
        role: "PAYMENT_OBLIGOR",
        roleSource: "EXPLICIT_SECTION_HEADING",
        printedName: PRIVATE_NAME,
        printedTaxId: PRIVATE_TAX_ID,
        occurrenceCount: 1,
        pageNumbers: [1],
        evidence: [
          {
            pageNumber: 1,
            sectionLabel: "IDENTIFICATION_OF_PAYMENT_OBLIGOR",
            nameLabel: "NAME_OR_BUSINESS_NAME",
            taxIdLabel: "NIF",
            extractionMethod: "RULE",
            assertionType: "EXPLICIT_IN_DOCUMENT",
          },
        ],
        valueDisclosure: "EPHEMERAL_UI_ONLY",
        reviewStatus: "REVIEW_REQUIRED",
      },
      issues: [],
      semanticPolicy: "EXPLICIT_IDENTIFICATION_SECTION_ONLY",
      roleMeaningPolicy: "PRINTED_ROLE_LABEL_NOT_LEGAL_CONFIRMATION",
      profileMatchPolicy: "NOT_EVALUATED",
      valueDisclosure: "EPHEMERAL_UI_ONLY",
      persistencePolicy: "DO_NOT_PERSIST",
      networkPolicy: "NO_NETWORK",
      legalRuleStatus: "NOT_APPLIED",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.identifiedSubject)).toBe(true);
    expect(Object.isFrozen(result.identifiedSubject?.evidence)).toBe(true);
  });

  it.each([
    ["X1234567L", "PERSONA FISICA SINTETICA", "NOMBRE / RAZON SOCIAL"],
    ["B12345678", "SOCIEDAD SINTETICA, S.L.", "NOMBRE Y RAZON SOCIAL"],
    ["12345678Z", "APELLIDOS Y NOMBRE SINTETICOS", "NOMBRE O RAZON SOCIAL"],
  ] as const)("accepts the closed Spanish NIF shape %s", (taxId, name, nameLabel) => {
    expect(
      extractAeatEnforcementPartyFactsV1(
        documentWith([subjectSection(name, taxId, nameLabel)]),
      ).identifiedSubject,
    ).toMatchObject({ printedTaxId: taxId, printedName: name });
  });

  it("returns pending information when the exact section is absent or incomplete", () => {
    const absent = extractAeatEnforcementPartyFactsV1(documentWith([[]]));
    const incomplete = extractAeatEnforcementPartyFactsV1(
      documentWith([
        [
          "IDENTIFICACION DEL OBLIGADO AL PAGO",
          `NOMBRE / RAZON SOCIAL: ${PRIVATE_NAME}`,
        ],
      ]),
    );

    expect(absent).toMatchObject({
      status: "INFORMATION_PENDING",
      outcome: "INFORMATION_PENDING",
      identifiedSubject: null,
      issues: [{ code: "IDENTIFICATION_SECTION_NOT_FOUND" }],
    });
    expect(incomplete).toMatchObject({
      status: "INFORMATION_PENDING",
      outcome: "INFORMATION_PENDING",
      identifiedSubject: null,
      issues: [
        { code: "IDENTIFICATION_FIELDS_INCOMPLETE", pageNumbers: [1] },
      ],
    });
  });

  it.each([
    ["NOMBRE / RAZON SOCIAL: <script>alert(1)</script>", `NIF: ${PRIVATE_TAX_ID}`, "INVALID_PRINTED_NAME"],
    [`NOMBRE / RAZON SOCIAL: ${PRIVATE_NAME}`, "NIF: NO-ES-UN-NIF", "INVALID_PRINTED_TAX_ID"],
  ] as const)("blocks invalid printed values without partial output", (nameLine, taxIdLine, code) => {
    const result = extractAeatEnforcementPartyFactsV1(
      documentWith([
        ["IDENTIFICACION DEL OBLIGADO AL PAGO", nameLine, taxIdLine],
      ]),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      outcome: "PROCESSING_BLOCKED",
      identifiedSubject: null,
      issues: [{ code, pageNumbers: [1] }],
    });
    expect(JSON.stringify(result)).not.toContain("<script>");
    expect(JSON.stringify(result)).not.toContain("NO-ES-UN-NIF");
  });

  it("blocks distinct subjects but accepts exact repeated sections", () => {
    const distinct = extractAeatEnforcementPartyFactsV1(
      documentWith([
        subjectSection(),
        subjectSection("OTRA PERSONA SINTETICA", "X1234567L"),
      ]),
    );
    const repeated = extractAeatEnforcementPartyFactsV1(
      documentWith([subjectSection(), subjectSection()]),
    );

    expect(distinct).toMatchObject({
      outcome: "AMBIGUOUS",
      identifiedSubject: null,
      issues: [
        { code: "MULTIPLE_DISTINCT_SUBJECTS", pageNumbers: [1, 2] },
      ],
    });
    expect(repeated.identifiedSubject).toMatchObject({
      occurrenceCount: 2,
      pageNumbers: [1, 2],
    });
  });

  it("does not attach a subject to another family or arbitrary NIF text", () => {
    const result = extractAeatEnforcementPartyFactsV1(
      Object.freeze({
        ownerScope: "user:synthetic-party-facts",
        documentId: "document:other-family",
        pages: Object.freeze([
          Object.freeze({
            pageNumber: 1,
            text: subjectSection().join("\n"),
            isBlank: false,
          }),
        ]),
      }),
    );
    expect(result).toMatchObject({
      documentType: null,
      status: "INFORMATION_PENDING",
      outcome: "INFORMATION_PENDING",
      identifiedSubject: null,
      issues: [{ code: "FAMILY_GATE_NOT_SATISFIED", pageNumbers: [] }],
    });
  });

  it("parses defensively, rejects unknown keys and never mutates input", () => {
    const extracted = extractAeatEnforcementPartyFactsV1(
      documentWith([subjectSection()]),
    );
    const candidate = mutable(extracted);
    const before = JSON.stringify(candidate);
    const parsed = parseAeatEnforcementPartyFactsV1(candidate, 1);

    expect(JSON.stringify(candidate)).toBe(before);
    expect(parsed).toEqual(extracted);
    expect(parsed).not.toBe(candidate);
    expect(parsed.identifiedSubject).not.toBe(candidate.identifiedSubject);

    const rootUnknown = mutable(extracted);
    rootUnknown.privateTaxId = PRIVATE_TAX_ID;
    expect(() => parseAeatEnforcementPartyFactsV1(rootUnknown, 1)).toThrowError(
      AeatEnforcementPartyFactsV1Error,
    );

    const nestedUnknown = mutable(extracted);
    (nestedUnknown.identifiedSubject as Record<string, unknown>).confidence = 1;
    expect(() => parseAeatEnforcementPartyFactsV1(nestedUnknown, 1)).toThrowError(
      AeatEnforcementPartyFactsV1Error,
    );
  });

  it("does not allow confidence or a printed role to enable materialization", () => {
    const result = mutable(
      extractAeatEnforcementPartyFactsV1(documentWith([subjectSection()])),
    );
    (result.identifiedSubject as Record<string, unknown>).confidence = 1;
    expect(() => parseAeatEnforcementPartyFactsV1(result, 1)).toThrowError(
      AeatEnforcementPartyFactsV1Error,
    );
    expect(result.materializationPolicy).toBe("PROHIBITED_UNTIL_REVIEW");
  });
});
