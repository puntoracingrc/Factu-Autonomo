import { describe, expect, it } from "vitest";
import type { BoundedDocumentInput } from "../input-contract";
import {
  createDocumentSegmentV1,
  type DocumentSegmentTypeV1,
} from "./document-segment.v1";
import { extractDeferralDenialV1 } from "./deferral-denial-extractor.v1";

const OWNER_SCOPE = "user:synthetic-deferral-denial";
const DOCUMENT_ID = "document:synthetic-deferral-denial";

const MAIN_PAGE = [
  "Agencia Tributaria",
  "www.agenciatributaria.es",
  "DENEGACIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO DE PAGO",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "N.I.F.: 12345678Z",
  "Deudor: PERSONA SINTÉTICA",
  "Número de expediente: EXP-SYN-DENIAL-001",
  "ACUERDO",
  "Vista la petición formulada por un importe de 728,44 euros, se acuerda DENEGAR la petición",
  "formulada.",
  "MOTIVACIÓN",
  "La solicitud se deniega por el motivo sintético expresamente impreso.",
  "PLAZOS DE INGRESO",
  "Si ha recibido este documento entre los días 1 y 15 del mes, el plazo de ingreso finaliza el día 20 del",
  "mes posterior.",
  "Si ha recibido este documento entre los días 16 y último del mes, el plazo de ingreso finaliza el día 5 del",
  "segundo mes posterior.",
  "CONSECUENCIAS DE LA FALTA DE PAGO",
  "Si no se paga en plazo, el documento indica que comenzará el periodo ejecutivo y el procedimiento de apremio.",
].join("\n");

const PAYMENT_AND_APPEAL_PAGES = [
  [
    "LUGAR DE PAGO",
    "El pago podrá hacerse en entidades colaboradoras o mediante la sede electrónica de la AEAT.",
  ].join("\n"),
  [
    "Agencia Tributaria",
    "RECURSOS Y RECLAMACIONES",
    "Si no está conforme podrá optar, en el plazo de",
    "un mes contado desde el día siguiente al de la recepción de este documento, entre recurso de reposición o reclamación económico-administrativa.",
  ].join("\n"),
  "4 de julio de 2017",
  [
    "DEUDAS QUE SE RELACIONAN",
    "A1234567890123456 30-06-2017 111-IRPF DEUDA SINTÉTICA 728,44",
  ].join("\n"),
] as const;

function document(...pages: readonly string[]): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER_SCOPE,
    documentId: DOCUMENT_ID,
    pages: Object.freeze(
      pages.map((text, index) =>
        Object.freeze({ pageNumber: index + 1, text, isBlank: false }),
      ),
    ),
  });
}

function segment(
  type: DocumentSegmentTypeV1,
  from: number,
  to: number,
  title: string,
) {
  return createDocumentSegmentV1({
    segmentId: `segment:${from}-${to}`,
    documentId: DOCUMENT_ID,
    segmentType: type,
    pageFrom: from,
    pageTo: to,
    detectedTitle: title,
    detectedAuthority: "AEAT",
    classificationConfidence: 1,
    extractionStatus: "EXTRACTED_REVIEW_REQUIRED",
    contentHash: `sha256:${String(from).repeat(64)}`,
    canGenerateAdministrativeFacts: [
      "MAIN_ADMINISTRATIVE_ACT",
      "DEBT_LIST",
      "PAYMENT_DOCUMENT",
    ].includes(type),
  });
}

describe("deferral denial extractor v1", () => {
  it("extracts the denial, date, printed deadlines and affected debt without creating actions", () => {
    const source = document(MAIN_PAGE, ...PAYMENT_AND_APPEAL_PAGES);
    const before = structuredClone(source);
    const output = extractDeferralDenialV1({
      document: source,
      segments: [
        segment(
          "MAIN_ADMINISTRATIVE_ACT",
          1,
          2,
          "denegacion del aplazamiento/fraccionamiento de pago",
        ),
        segment("APPEAL_INFORMATION", 3, 4, "recursos y reclamaciones"),
        segment("DEBT_LIST", 5, 5, "deudas que se relacionan"),
      ],
    });

    expect(source).toEqual(before);
    expect(output).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyCandidates: [
        { familyId: "collection.deferral_denial", confidence: 1 },
      ],
      retainedSourceContent: "NONE",
      deadlinePolicy: "PRINTED_RELATIVE_RULE_NOT_COMPUTED",
      paymentPolicy: "NO_PAYMENT_OR_DEBT_ACTION_CREATED",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
      deferralDenialFacts: {
        stage: "DENIED",
        expediente: { printedValue: "EXP-SYN-DENIAL-001" },
        requestedAmountDenied: { amountCents: 72_844 },
        reason: {
          printedValue:
            "La solicitud se deniega por el motivo sintético expresamente impreso.",
        },
        rawPaymentDeadline: expect.objectContaining({
          sourceLabel: "Plazo de ingreso impreso",
        }),
        rawAppealDeadline: expect.objectContaining({
          sourceLabel: "Plazo de recurso impreso",
        }),
      },
    });
    expect(output.proceduralDates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dateType: "ISSUE_DATE",
          parsedDate: "2017-07-04",
          legallyComputed: false,
        }),
        expect.objectContaining({
          dateType: "VOLUNTARY_PAYMENT_DEADLINE",
          parsedDate: null,
          legallyComputed: false,
        }),
        expect.objectContaining({
          dateType: "APPEAL_DEADLINE",
          parsedDate: null,
          legallyComputed: false,
        }),
      ]),
    );
    expect(output.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          referenceType: "LIQUIDATION_KEY",
          normalizedValue: "A1234567890123456",
        }),
      ]),
    );
    expect(output.deferralDenialFacts.debtDescriptions).toHaveLength(1);
    expect(output.deferralDenialFacts.paymentChannel).toMatchObject({
      printedValue:
        "El pago podrá hacerse en entidades colaboradoras o mediante la sede electrónica de la AEAT.",
      pageNumbers: [2],
    });
    expect(
      output.deferralDenialFacts.rawPaymentDeadline?.printedValue.match(
        /finaliza el día 20/giu,
      ),
    ).toHaveLength(1);
    expect(
      output.deferralDenialFacts.rawPaymentDeadline?.printedValue.match(
        /finaliza el día 5/giu,
      ),
    ).toHaveLength(1);
    expect(output.deferralDenialFacts.originalDebtDueDates).toEqual([
      expect.objectContaining({ printedValue: "30-06-2017" }),
    ]);
    expect(Object.isFrozen(output)).toBe(true);
    expect(JSON.stringify(output)).not.toContain("Vista la petición");
  });

  it("keeps incomplete denials visible and marks the absent facts", () => {
    const output = extractDeferralDenialV1({
      document: document(
        [
          "Agencia Tributaria",
          "www.agenciatributaria.es",
          "DENEGACIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO DE PAGO",
          "Se acuerda denegar la petición formulada.",
        ].join("\n"),
      ),
      segments: [
        segment(
          "MAIN_ADMINISTRATIVE_ACT",
          1,
          1,
          "denegacion del aplazamiento/fraccionamiento de pago",
        ),
      ],
    });

    expect(output.status).toBe("REVIEW_REQUIRED");
    expect(output.monetaryComponents).toEqual([]);
    expect(output.warnings).toEqual(
      expect.arrayContaining([
        "MISSING_EXPEDIENTE",
        "MISSING_REQUESTED_AMOUNT_DENIED",
        "MISSING_DENIAL_REASON",
        "MISSING_ISSUE_DATE",
      ]),
    );
  });

  it("rejects another authority and does not confuse a grant with a denial", () => {
    const denialSegment = segment(
      "MAIN_ADMINISTRATIVE_ACT",
      1,
      1,
      "denegacion del aplazamiento/fraccionamiento de pago",
    );
    expect(
      extractDeferralDenialV1({
        document: document(
          `${MAIN_PAGE}\nTesorería General de la Seguridad Social`,
        ),
        segments: [denialSegment],
      }),
    ).toMatchObject({
      status: "BLOCKED",
      warnings: ["CONFLICTING_AUTHORITY_OR_TERRITORY"],
    });
    expect(
      extractDeferralDenialV1({
        document: document(
          "Agencia Tributaria\nCONCESIÓN DEL APLAZAMIENTO O FRACCIONAMIENTO DE PAGO",
        ),
        segments: [
          segment(
            "MAIN_ADMINISTRATIVE_ACT",
            1,
            1,
            "concesion del aplazamiento o fraccionamiento de pago",
          ),
        ],
      }),
    ).toMatchObject({ status: "UNKNOWN", familyCandidates: [] });
  });
});
