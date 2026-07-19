import { describe, expect, it } from "vitest";
import { analyzeFiscalNotificationDocumentInput } from "../document-input-analysis";
import type { BoundedDocumentInput } from "../input-contract";
import {
  extractAeatRealCorpusDocumentV2,
  type RealCorpusExtractorOutcomeV2,
  type RealCorpusFieldV2,
} from "./real-corpus-extractor.v2";

const OWNER_SCOPE = "user:synthetic-corpus-v2";

function document(
  caseId: string,
  pages: readonly (string | null)[],
): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER_SCOPE,
    documentId: `document:${caseId}`,
    pages: Object.freeze(
      pages.map((text, index) =>
        Object.freeze({
          pageNumber: index + 1,
          text: text ?? "",
          isBlank: text === null,
        }),
      ),
    ),
  });
}

function findField(
  outcome: RealCorpusExtractorOutcomeV2,
  fieldCode: string,
): RealCorpusFieldV2 | undefined {
  return outcome.fields.find((item) => item.fieldCode === fieldCode);
}

async function extractEndToEnd(
  source: BoundedDocumentInput,
): Promise<RealCorpusExtractorOutcomeV2> {
  const extracted = await extractAeatRealCorpusDocumentV2(source);
  const analysis = await analyzeFiscalNotificationDocumentInput(source);
  if (extracted.familyId !== null) {
    expect(analysis.verticalSliceReview.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ familyId: extracted.familyId }),
      ]),
    );
  }
  return extracted;
}

function money(
  outcome: RealCorpusExtractorOutcomeV2,
  code: string,
): number | null {
  const candidate = findField(outcome, code);
  return candidate?.kind === "MONEY" ? candidate.amountCents : null;
}

function text(
  outcome: RealCorpusExtractorOutcomeV2,
  code: string,
): string | null {
  const candidate = findField(outcome, code);
  return candidate &&
    (candidate.kind === "TEXT" ||
      candidate.kind === "REFERENCE" ||
      candidate.kind === "DATE")
    ? candidate.value
    : null;
}

function proposalFixture(): BoundedDocumentInput {
  return document("SYN-AEAT-001", [
    [
      "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA",
      "NOTIFICACIÓN DEL TRÁMITE DE ALEGACIONES Y PROPUESTA DE LIQUIDACIÓN PROVISIONAL",
      "VERIFICACIÓN DE DATOS",
      "PUESTA DE MANIFIESTO DEL EXPEDIENTE",
      "TRÁMITE DE ALEGACIONES",
      "PROPUESTA DE LIQUIDACIÓN PROVISIONAL",
      "RESULTADO DE LA PROPUESTA DE LIQUIDACIÓN",
      "LUGAR Y PLAZO",
      "Referencia: SYN2007PROP0001X",
      "Concepto tributario: IVA",
      "Ejercicio: 2007",
      "Plazo de alegaciones: 10 días hábiles desde la recepción",
      "Procedimiento sancionador separado",
    ].join("\n"),
    [
      "RESULTADO DE LA PROPUESTA DE LIQUIDACIÓN",
      "Resultado declarado: -700,00 €",
      "Resultado propuesto: 1.400,00 €",
      "Variación del resultado: 2.100,00 €",
      "Cuota propuesta: 1.400,00 €",
      "Saldo declarado a compensar: 700,00 €",
    ].join("\n"),
    "Motivo: diferencia sintética uno",
    "Motivo: diferencia sintética dos",
    "Motivo: diferencia sintética tres",
    "Motivo: diferencia sintética cuatro",
    "MODELO PARA EFECTUAR ALEGACIONES",
    null,
    null,
    null,
  ]);
}

interface TaxSection {
  readonly kind: string;
  readonly rowCount: number;
  readonly participantRole?: "ACCOUNT_HOLDER" | "SPOUSE";
  readonly models?: readonly string[];
  readonly periods?: readonly string[];
  readonly amountCents?: number;
  readonly withholdingCents?: number;
  readonly attributes?: Readonly<Record<string, string | number | boolean>>;
}

interface TaxCase {
  readonly caseId: string;
  readonly year: string;
  readonly title: "DATOS FISCALES" | "DADES FISCALS";
  readonly physicalPages: number;
  readonly snapshotDate: string;
  readonly issueDate: string;
  readonly participantCount: 1 | 2;
  readonly sections: readonly TaxSection[];
  readonly otherStart: string;
  readonly end: string;
  readonly directDebitEnd: string;
  readonly onlineStart?: string;
}

const TAX_CASES: readonly TaxCase[] = [
  {
    caseId: "SYN-AEAT-002",
    year: "2008",
    title: "DATOS FISCALES",
    physicalPages: 4,
    snapshotDate: "2009-04-16",
    issueDate: "2009-04-17",
    participantCount: 1,
    otherStart: "2009-05-04",
    end: "2009-06-30",
    directDebitEnd: "2009-06-23",
    sections: [
      {
        kind: "EMPLOYMENT_INCOME",
        rowCount: 2,
        amountCents: 10123,
        withholdingCents: 20123,
      },
      {
        kind: "BANK_INTEREST",
        rowCount: 1,
        amountCents: 30123,
        withholdingCents: 40123,
      },
      {
        kind: "INSTALLMENT_PAYMENTS",
        rowCount: 4,
        models: ["130", "131"],
        periods: ["1T", "2T", "3T", "4T"],
        amountCents: 50123,
      },
      {
        kind: "SOCIAL_SECURITY_CONTRIBUTIONS",
        rowCount: 1,
        amountCents: 60123,
      },
      {
        kind: "ENTITY_PARTICIPATION",
        rowCount: 1,
        attributes: { PARTICIPATION_PERCENT: 50 },
      },
    ],
  },
  {
    caseId: "SYN-AEAT-003",
    year: "2009",
    title: "DATOS FISCALES",
    physicalPages: 4,
    snapshotDate: "2010-04-10",
    issueDate: "2010-04-22",
    participantCount: 1,
    otherStart: "2010-05-03",
    end: "2010-06-30",
    directDebitEnd: "2010-06-25",
    sections: [
      {
        kind: "BANK_INTEREST",
        rowCount: 2,
        amountCents: 10123,
        withholdingCents: 20123,
      },
      {
        kind: "INSTALLMENT_PAYMENTS",
        rowCount: 4,
        models: ["131"],
        periods: ["1T", "2T", "3T", "4T"],
        amountCents: 30123,
      },
      {
        kind: "SOCIAL_SECURITY_CONTRIBUTIONS",
        rowCount: 1,
        amountCents: 40123,
      },
      {
        kind: "ENTITY_PARTICIPATION",
        rowCount: 1,
        attributes: { PARTICIPATION_PERCENT: 50 },
      },
    ],
  },
  {
    caseId: "SYN-AEAT-004",
    year: "2010",
    title: "DADES FISCALS",
    physicalPages: 4,
    snapshotDate: "2011-04-14",
    issueDate: "2011-05-26",
    participantCount: 1,
    otherStart: "2011-05-03",
    end: "2011-06-30",
    directDebitEnd: "2011-06-27",
    sections: [
      {
        kind: "BANK_INTEREST",
        rowCount: 1,
        amountCents: 10123,
        withholdingCents: 20123,
      },
      {
        kind: "DONATIONS",
        rowCount: 1,
        attributes: { DONATION_AMOUNT_CENTS: 30123 },
      },
      {
        kind: "MORTGAGE_LOAN",
        rowCount: 1,
        attributes: {
          CAPITAL_AMORTIZED_CENTS: 40123,
          INTEREST_CENTS: 50123,
          FINANCIAL_EXPENSES_CENTS: 60123,
          PARTICIPATION_PERCENT: 50,
        },
      },
      {
        kind: "INSTALLMENT_PAYMENTS",
        rowCount: 4,
        models: ["131"],
        periods: ["1T", "2T", "3T", "4T"],
        amountCents: 70123,
      },
      {
        kind: "SOCIAL_SECURITY_CONTRIBUTIONS",
        rowCount: 1,
        amountCents: 80123,
      },
      {
        kind: "CADASTRAL_PROPERTY",
        rowCount: 1,
        attributes: {
          CADASTRAL_VALUE_CENTS: 90123,
          PARTICIPATION_PERCENT: 50,
          DAYS: 309,
        },
      },
      {
        kind: "ENTITY_PARTICIPATION",
        rowCount: 1,
        attributes: { PARTICIPATION_PERCENT: 50 },
      },
    ],
  },
  {
    caseId: "SYN-AEAT-005",
    year: "2011",
    title: "DATOS FISCALES",
    physicalPages: 6,
    snapshotDate: "2012-04-19",
    issueDate: "2012-05-23",
    participantCount: 1,
    otherStart: "2012-05-03",
    end: "2012-07-02",
    directDebitEnd: "2012-06-27",
    sections: [
      { kind: "EMPLOYMENT_INCOME", rowCount: 1, amountCents: 10123 },
      {
        kind: "ECONOMIC_ACTIVITY_INCOME",
        rowCount: 2,
        amountCents: 20123,
        withholdingCents: 30123,
      },
      {
        kind: "BANK_INTEREST",
        rowCount: 2,
        amountCents: 40123,
        withholdingCents: 50123,
      },
      {
        kind: "ECONOMIC_ACTIVITY_CENSUS",
        rowCount: 1,
        attributes: { ACTIVITY_CODE: "A03", IAE: "501.3" },
      },
      {
        kind: "ATTRIBUTED_ECONOMIC_ACTIVITY_INCOME",
        rowCount: 1,
        attributes: { NET_INCOME_CENTS: 60123 },
      },
      { kind: "ATTRIBUTED_WITHHOLDINGS", rowCount: 1, withholdingCents: 70123 },
      {
        kind: "MORTGAGE_LOAN",
        rowCount: 1,
        attributes: {
          CAPITAL_AMORTIZED_CENTS: 80123,
          INTEREST_CENTS: 90123,
          PARTICIPATION_PERCENT: 50,
        },
      },
      {
        kind: "INSTALLMENT_PAYMENTS",
        rowCount: 5,
        models: ["131"],
        periods: ["1T", "1T", "2T", "3T", "4T"],
        amountCents: 100123,
      },
      {
        kind: "SOCIAL_SECURITY_CONTRIBUTIONS",
        rowCount: 1,
        amountCents: 110123,
      },
      {
        kind: "CADASTRAL_PROPERTY",
        rowCount: 1,
        attributes: {
          CADASTRAL_VALUE_CENTS: 120123,
          PARTICIPATION_PERCENT: 50,
          DAYS: 365,
        },
      },
    ],
  },
  {
    caseId: "SYN-AEAT-006",
    year: "2012",
    title: "DATOS FISCALES",
    physicalPages: 4,
    snapshotDate: "2013-03-16",
    issueDate: "2013-04-25",
    participantCount: 1,
    onlineStart: "2013-04-24",
    otherStart: "2013-05-06",
    end: "2013-07-01",
    directDebitEnd: "2013-06-26",
    sections: [
      {
        kind: "ECONOMIC_ACTIVITY_INCOME",
        rowCount: 1,
        amountCents: 10123,
        withholdingCents: 20123,
      },
      { kind: "BANK_INTEREST", rowCount: 1, amountCents: 30123 },
      {
        kind: "ECONOMIC_ACTIVITY_CENSUS",
        rowCount: 1,
        attributes: { ACTIVITY_CODE: "A03", IAE: "501.3" },
      },
      {
        kind: "MORTGAGE_LOAN",
        rowCount: 1,
        attributes: {
          CAPITAL_AMORTIZED_CENTS: 40123,
          INTEREST_CENTS: 50123,
          PARTICIPATION_PERCENT: 50,
        },
      },
      {
        kind: "INSTALLMENT_PAYMENTS",
        rowCount: 4,
        models: ["131"],
        periods: ["1T", "2T", "3T", "4T"],
        amountCents: 60123,
      },
      {
        kind: "SOCIAL_SECURITY_CONTRIBUTIONS",
        rowCount: 1,
        amountCents: 70123,
      },
      {
        kind: "CADASTRAL_PROPERTY",
        rowCount: 1,
        attributes: {
          CADASTRAL_VALUE_CENTS: 80123,
          PARTICIPATION_PERCENT: 50,
          DAYS: 366,
        },
      },
    ],
  },
  {
    caseId: "SYN-AEAT-007",
    year: "2013",
    title: "DATOS FISCALES",
    physicalPages: 6,
    snapshotDate: "2014-03-19",
    issueDate: "2014-05-14",
    participantCount: 2,
    onlineStart: "2014-04-23",
    otherStart: "2014-05-05",
    end: "2014-06-30",
    directDebitEnd: "2014-06-25",
    sections: [
      {
        kind: "ECONOMIC_ACTIVITY_INCOME",
        rowCount: 1,
        participantRole: "ACCOUNT_HOLDER",
        amountCents: 10123,
        withholdingCents: 20123,
      },
      {
        kind: "ECONOMIC_ACTIVITY_CENSUS",
        rowCount: 1,
        participantRole: "ACCOUNT_HOLDER",
        attributes: { ACTIVITY_CODE: "A03", IAE: "501.3" },
      },
      {
        kind: "MORTGAGE_LOAN",
        rowCount: 1,
        participantRole: "ACCOUNT_HOLDER",
        attributes: {
          CAPITAL_AMORTIZED_CENTS: 30123,
          INTEREST_CENTS: 40123,
          PARTICIPATION_PERCENT: 50,
        },
      },
      {
        kind: "INSTALLMENT_PAYMENTS",
        rowCount: 4,
        participantRole: "ACCOUNT_HOLDER",
        models: ["131"],
        periods: ["1T", "2T", "3T", "4T"],
        amountCents: 50123,
      },
      {
        kind: "SOCIAL_SECURITY_CONTRIBUTIONS",
        rowCount: 1,
        participantRole: "ACCOUNT_HOLDER",
        amountCents: 60123,
      },
      {
        kind: "CADASTRAL_PROPERTY",
        rowCount: 1,
        participantRole: "ACCOUNT_HOLDER",
        attributes: {
          CADASTRAL_VALUE_CENTS: 70123,
          PARTICIPATION_PERCENT: 50,
          DAYS: 365,
        },
      },
      {
        kind: "EMPLOYMENT_INCOME",
        rowCount: 1,
        participantRole: "SPOUSE",
        amountCents: 80123,
        withholdingCents: 90123,
      },
      {
        kind: "MORTGAGE_LOAN",
        rowCount: 1,
        participantRole: "SPOUSE",
        attributes: {
          CAPITAL_AMORTIZED_CENTS: 100123,
          INTEREST_CENTS: 110123,
          PARTICIPATION_PERCENT: 50,
        },
      },
      {
        kind: "CADASTRAL_PROPERTY",
        rowCount: 1,
        participantRole: "SPOUSE",
        attributes: {
          CADASTRAL_VALUE_CENTS: 120123,
          PARTICIPATION_PERCENT: 50,
          DAYS: 365,
        },
      },
      {
        kind: "MATERNITY_DEDUCTION_CONTRIBUTIONS",
        rowCount: 12,
        participantRole: "SPOUSE",
        attributes: { MONTHLY_PRINTED_CENTS: 130123 },
      },
    ],
  },
  {
    caseId: "SYN-AEAT-008",
    year: "2014",
    title: "DATOS FISCALES",
    physicalPages: 6,
    snapshotDate: "2015-04-16",
    issueDate: "2015-05-05",
    participantCount: 2,
    onlineStart: "2015-04-07",
    otherStart: "2015-05-11",
    end: "2015-06-30",
    directDebitEnd: "2015-06-25",
    sections: [
      {
        kind: "ECONOMIC_ACTIVITY_INCOME",
        rowCount: 1,
        participantRole: "ACCOUNT_HOLDER",
        amountCents: 10123,
        withholdingCents: 20123,
      },
      {
        kind: "ECONOMIC_ACTIVITY_CENSUS",
        rowCount: 1,
        participantRole: "ACCOUNT_HOLDER",
        attributes: { ACTIVITY_CODE: "A03", IAE: "501.3" },
      },
      {
        kind: "MORTGAGE_LOAN",
        rowCount: 1,
        participantRole: "ACCOUNT_HOLDER",
        attributes: {
          CAPITAL_AMORTIZED_CENTS: 30123,
          INTEREST_CENTS: 40123,
          PARTICIPATION_PERCENT: 50,
        },
      },
      {
        kind: "INSTALLMENT_PAYMENTS",
        rowCount: 4,
        participantRole: "ACCOUNT_HOLDER",
        models: ["131"],
        periods: ["1T", "2T", "3T", "4T"],
        amountCents: 50123,
      },
      {
        kind: "SOCIAL_SECURITY_CONTRIBUTIONS",
        rowCount: 1,
        participantRole: "ACCOUNT_HOLDER",
        amountCents: 60123,
      },
      {
        kind: "CADASTRAL_PROPERTY",
        rowCount: 1,
        participantRole: "ACCOUNT_HOLDER",
        attributes: {
          CADASTRAL_VALUE_CENTS: 70123,
          PARTICIPATION_PERCENT: 50,
          DAYS: 365,
        },
      },
      {
        kind: "EMPLOYMENT_INCOME",
        rowCount: 1,
        participantRole: "SPOUSE",
        amountCents: 80123,
      },
      {
        kind: "MORTGAGE_LOAN",
        rowCount: 1,
        participantRole: "SPOUSE",
        attributes: {
          CAPITAL_AMORTIZED_CENTS: 90123,
          INTEREST_CENTS: 100123,
          PARTICIPATION_PERCENT: 50,
        },
      },
      {
        kind: "CADASTRAL_PROPERTY",
        rowCount: 1,
        participantRole: "SPOUSE",
        attributes: {
          CADASTRAL_VALUE_CENTS: 110123,
          PARTICIPATION_PERCENT: 50,
          DAYS: 365,
        },
      },
      { kind: "MATERNITY_DEDUCTION", rowCount: 12, participantRole: "SPOUSE" },
    ],
  },
];

function cents(value: number): string {
  return `${(value / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function taxFixture(input: TaxCase): BoundedDocumentInput {
  const lines = [
    input.title,
    input.title === "DADES FISCALS"
      ? "Concepte tributari: IRPF"
      : "Concepto tributario: IRPF",
    input.title === "DADES FISCALS"
      ? `Exercici: ${input.year}`
      : `Ejercicio: ${input.year}`,
    input.title === "DADES FISCALS"
      ? "Les dades fiscals de l'impost sobre la renda no vinculen l'Agència Tributària"
      : "Los datos fiscales del Impuesto sobre la Renta no vinculan a la Agencia Tributaria",
    `Referencia: SYN${input.year}DATA001X`,
    `${input.title === "DADES FISCALS" ? "Dades a data de" : "Datos a fecha de"}: ${input.snapshotDate}`,
    `${input.title === "DADES FISCALS" ? "Data d'emissió" : "Fecha de emisión"}: ${input.issueDate}`,
    "No se pudo elaborar el borrador: constan actividades económicas",
    ...(input.onlineStart ? [`Inicio por internet: ${input.onlineStart}`] : []),
    `Inicio otros medios: ${input.otherStart}`,
    `Fin de campaña: ${input.end}`,
    `Fin domiciliación: ${input.directDebitEnd}`,
  ];
  let activeRole: "ACCOUNT_HOLDER" | "SPOUSE" | null = null;
  for (const section of input.sections) {
    const role = section.participantRole ?? "ACCOUNT_HOLDER";
    if (activeRole !== role) {
      lines.push(`Contribuyente: ${role === "SPOUSE" ? "cónyuge" : "titular"}`);
      activeRole = role;
    }
    const attributes = Object.entries(section.attributes ?? {}).map(
      ([key, value]) => `${key}: ${value}`,
    );
    lines.push(
      [
        `Sección: ${section.kind}`,
        `filas: ${section.rowCount}`,
        section.models ? `modelos: ${section.models.join(",")}` : null,
        section.periods ? `periodos: ${section.periods.join(",")}` : null,
        section.amountCents !== undefined
          ? `importe: ${cents(section.amountCents)}`
          : null,
        section.withholdingCents !== undefined
          ? `retenciones: ${cents(section.withholdingCents)}`
          : null,
        ...attributes,
      ]
        .filter((value): value is string => value !== null)
        .join("; "),
    );
  }
  const pages: string[] = [
    lines.slice(0, 12).join("\n"),
    lines.slice(12).join("\n"),
  ];
  while (pages.length < input.physicalPages)
    pages.push("Anexo informativo sintético");
  return document(input.caseId, pages);
}

function spouseFixture(
  caseId: string,
  catalan: boolean,
  year: string,
): BoundedDocumentInput {
  return document(caseId, [
    [
      catalan
        ? "NOTIFICACIÓ DE L’ACORD DE SUSPENSIÓ DE L’INGRÉS (COMPENSACIÓ ENTRE CÒNJUGES)"
        : "NOTIFICACIÓN DEL ACUERDO DE SUSPENSIÓN DEL INGRESO (COMPENSACIÓN ENTRE CÓNYUGES)",
      catalan
        ? "S'ha realitzat la compensació de l'ingrés suspès amb la devolució sol·licitada pel seu cònjuge"
        : "Se ha procedido a realizar la compensación del ingreso suspendido con la devolución solicitada por su cónyuge",
      `Referencia: SYN${year}SPOUSE001X`,
      `Ejercicio: ${year}`,
    ].join("\n"),
    null,
  ]);
}

function paymentFixture(
  caseId: string,
  requested: number,
  deductions: number,
  net: number,
  offsetType: "REQUESTED" | "EX_OFFICIO",
): BoundedDocumentInput {
  return document(caseId, [
    [
      "COMUNICACIÓN DE PAGO DE DEVOLUCIÓN",
      "ORDENACIÓN DEL PAGO",
      "DETALLE DE DEDUCCIONES",
      offsetType === "REQUESTED"
        ? "Compensación a instancia obligado"
        : "Compensación de oficio",
      `Referencia de devolución: SYNREFUND-${caseId}`,
      `Referencia del acuerdo de devolución: SYN-REFUND-DECISION-${caseId}`,
      `Referencia del acuerdo de compensación: SYN-OFFSET-AGREEMENT-${caseId}`,
      `Devolución solicitada: ${cents(requested)}`,
      `Devolución acordada: ${cents(requested)}`,
      `Pago ordenado: ${cents(requested)}`,
      `Deducciones: ${cents(deductions)}`,
      `Importe líquido de la devolución: ${cents(net)}`,
    ].join("\n"),
    null,
  ]);
}

function publicationFixture(
  caseId: string,
  kind: "DILIGENCE" | "CERTIFICATE" | "PREPUBLICATION",
  underlyingType: string,
): BoundedDocumentInput {
  const title =
    kind === "DILIGENCE"
      ? "DILIGENCIA DE PUBLICACIÓN DEL ANUNCIO DE CITACIÓN PARA NOTIFICACIÓN POR COMPARECENCIA EN BOLETÍN OFICIAL DEL ESTADO"
      : kind === "CERTIFICATE"
        ? "CERTIFICADO DE PUBLICACIÓN EN EL BOLETÍN OFICIAL DEL ESTADO DEL ANUNCIO DE CITACIÓN PARA NOTIFICACIÓN POR COMPARECENCIA"
        : "COMUNICACIÓN NOTIFICACIÓN POR COMPARECENCIA";
  return document(caseId, [
    [
      title,
      kind === "PREPUBLICATION"
        ? "Se va a proceder\na su citación"
        : kind === "DILIGENCE"
          ? "Diligencia de publicación"
          : "Certificado de publicación",
      "Notificación por comparecencia",
      "15 días naturales",
      `Identificador: SYN-NOTIF-${caseId}`,
      `Referencia del acto citado: SYN-ACT-${caseId}`,
      `Tipo del acto citado: ${underlyingType}`,
      ...(kind === "PREPUBLICATION"
        ? []
        : ["Fecha de publicación: 2025-02-10"]),
      ...(kind === "CERTIFICATE"
        ? ["Fecha efectiva de notificación: 2025-02-26"]
        : []),
    ].join("\n"),
    null,
  ]);
}

function publicationNarrativeFixture(
  caseId: string,
  kind: "DILIGENCE" | "CERTIFICATE" | "PREPUBLICATION",
): BoundedDocumentInput {
  const title =
    kind === "DILIGENCE"
      ? "DILIGENCIA DE PUBLICACIÓN DEL ANUNCIO DE CITACIÓN PARA NOTIFICACIÓN POR COMPARECENCIA EN BOLETÍN OFICIAL DEL ESTADO"
      : kind === "CERTIFICATE"
        ? "CERTIFICADO DE PUBLICACIÓN EN EL BOLETÍN OFICIAL DEL ESTADO DEL ANUNCIO DE CITACIÓN PARA NOTIFICACIÓN POR COMPARECENCIA"
        : "COMUNICACIÓN NOTIFICACIÓN POR COMPARECENCIA";
  const identity =
    kind === "PREPUBLICATION"
      ? [
          "Referencia: 7000000000001",
          "Acuerdo",
          "Tipo de acto:",
          "Procedimiento expediente sintético",
          "Exigencia de reducción de sanción 8000000000002 pendiente de notificación",
        ]
      : [
          "N.º Certificado: 7000000000001",
          kind === "DILIGENCE"
            ? "Concepto: liquidación provisional L8000000000000022"
            : "Concepto: diligencia de embargo n.º 800000000000A",
        ];
  const publication =
    kind === "PREPUBLICATION"
      ? []
      : kind === "DILIGENCE"
        ? [
            "Publicado en el Boletín Oficial del Estado número 123, de fecha 2026-07-10, citación para notificación por comparecencia.",
          ]
        : [
            'Publicado en el "Boletín Oficial del Estado", número de anuncio 2026/321 de fecha 2026-07-10, citación para notificación por comparecencia.',
            "El 2026-07-26, el acuerdo quedó notificado.",
          ];
  return document(caseId, [
    [
      title,
      kind === "PREPUBLICATION"
        ? "Se va a proceder a su citación"
        : kind === "DILIGENCE"
          ? "Diligencia de publicación"
          : "Certificado de publicación",
      "Notificación por comparecencia",
      "Identificación del documento",
      ...identity,
      ...publication,
    ].join("\n"),
    null,
  ]);
}

describe("AEAT real corpus extractor V2", () => {
  it("extracts the proposal, keeps physical/content counts and never turns it into a final payment", async () => {
    const result = await extractEndToEnd(proposalFixture());
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "assessment.allegations_and_proposal",
      physicalPageCount: 10,
      contentPageCount: 7,
      confirmsDebt: false,
      confirmsPayment: false,
      confirmsDeadline: false,
    });
    expect(money(result, "DECLARED_RESULT")).toBe(-70000);
    expect(money(result, "PROPOSED_RESULT")).toBe(140000);
    expect(money(result, "RESULT_VARIATION")).toBe(210000);
    expect(money(result, "PROPOSED_QUOTA")).toBe(140000);
    expect(money(result, "DECLARED_BALANCE_TO_OFFSET")).toBe(70000);
    expect(findField(result, "MOTIVATION_ITEMS")).toMatchObject({ value: 4 });
    expect(result.segments.map((segment) => segment.type)).toEqual([
      "PRIMARY_ACT",
      "CALCULATION_ANNEX",
      "ALLEGATIONS_FORM",
      "BLANK_PAGES",
    ]);
    expect(result.explanation).toBe(
      "La AEAT propone cambiar un saldo de 700,00 € a compensar por 1.400,00 € a ingresar; todavía no es liquidación final y abre 10 días hábiles desde la recepción.",
    );

    const review = (
      await analyzeFiscalNotificationDocumentInput(proposalFixture())
    ).verticalSliceReview;
    expect(
      review.documents
        .flatMap((document) => document.fields)
        .find((field) => field.fieldId.includes("DECLARED_RESULT")),
    ).toMatchObject({
      semantic: "DETAIL",
      displayValue: "-700,00 €",
      normalizedValue: "-700,00 €",
      sourcePageNumbers: [2],
    });
    expect(JSON.stringify(review)).not.toContain("SIGNED_CENTS:");
  });

  it.each(TAX_CASES)(
    "extracts $caseId without losing repeated rows or participant boundaries",
    async (input) => {
      const result = await extractEndToEnd(taxFixture(input));
      const expectedRows = input.sections.reduce(
        (total, section) => total + section.rowCount,
        0,
      );
      expect(result).toMatchObject({
        status: "REVIEW_REQUIRED",
        familyId: "information.tax_data_report",
        physicalPageCount: input.physicalPages,
        contentPageCount: input.physicalPages,
      });
      expect(text(result, "FISCAL_YEAR")).toBe(input.year);
      expect(text(result, "SNAPSHOT_DATE")).toBe(input.snapshotDate);
      expect(text(result, "ISSUE_DATE")).toBe(input.issueDate);
      expect(result.sectionRows).toHaveLength(expectedRows);
      expect(
        new Set(result.sectionRows.map((row) => row.participantRole)).size,
      ).toBe(input.participantCount);
      expect(result.explanation).toBe(
        `Informe informativo de datos fiscales del IRPF ${input.year}; no es declaración, deuda ni liquidación. Debe mostrar la causa por la que no se pudo elaborar el borrador y los plazos de campaña como información.`,
      );
      if (input.caseId === "SYN-AEAT-005") {
        expect(
          result.sectionRows.filter(
            (row) =>
              row.sectionKind === "INSTALLMENT_PAYMENTS" &&
              row.model === "131" &&
              row.taxPeriod === "1T",
          ),
        ).toHaveLength(2);
      }
    },
  );

  it("does not invent a tax row count or participant", async () => {
    const common = [
      "DATOS FISCALES",
      "Concepto tributario: IRPF",
      "Ejercicio: 2025",
      "Los datos fiscales del Impuesto sobre la Renta no vinculan a la Agencia Tributaria",
      "Referencia: SYN-TAX-ROW-OBSERVATION-001",
    ];
    const withoutCount = await extractEndToEnd(document(
      "SYN-TAX-ROW-WITHOUT-COUNT",
      [[...common, "Sección: EMPLOYMENT_INCOME; importe: 101,23 €"].join("\n")],
    ));
    const withoutParticipantSource = document(
      "SYN-TAX-ROW-WITHOUT-PARTICIPANT",
      [[...common, "Sección: EMPLOYMENT_INCOME; filas: 1; importe: 101,23 €"].join("\n")],
    );
    const withoutParticipant = await extractEndToEnd(
      withoutParticipantSource,
    );
    const review = (
      await analyzeFiscalNotificationDocumentInput(withoutParticipantSource)
    ).verticalSliceReview;
    const section = review.documents
      .flatMap((item) => item.fields)
      .find((field) => field.fieldId === "real-corpus:section:0");

    expect(withoutCount.sectionRows).toEqual([]);
    expect(withoutParticipant.sectionRows).toEqual([
      expect.objectContaining({ participantRole: null, rowOrdinal: 1 }),
    ]);
    expect(section?.displayValue).toBe("Fila 1 · 101,23\u00a0€");
    expect(section?.displayValue).not.toContain("Titular");
  });

  it.each([
    ["SYN-AEAT-009", true, "2009"],
    ["SYN-AEAT-010", false, "2010"],
  ] as const)(
    "extracts %s without inventing amount or remaining balance",
    async (caseId, catalan, year) => {
      const result = await extractEndToEnd(
        spouseFixture(caseId, catalan, year),
      );
      expect(result.familyId).toBe("irpf.spouse_refund_suspension");
      expect(text(result, "FISCAL_YEAR")).toBe(year);
      expect(result.fields.some((item) => item.kind === "MONEY")).toBe(false);
      expect(result.explanation).toBe(
        "La AEAT confirma que aplicó la devolución del cónyuge al ingreso suspendido, pero sin importe no puede afirmar cobertura total ni saldo cero.",
      );
    },
  );

  it("recognizes the spouse suspension title when local OCR splits it across lines", async () => {
    const source = spouseFixture("SYN-AEAT-OCR-SPOUSE", false, "2010");
    const split = document("SYN-AEAT-OCR-SPOUSE", [
      source.pages[0]!.text.replace(
        "NOTIFICACIÓN DEL ACUERDO DE SUSPENSIÓN DEL INGRESO (COMPENSACIÓN ENTRE CÓNYUGES)",
        "NOTIFICACIÓN DEL ACUERDO DE SUSPENSIÓN DEL INGRESO\n(COMPENSACIÓN ENTRE CÓNYUGES)",
      ),
      null,
    ]);

    const result = await extractEndToEnd(split);

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "irpf.spouse_refund_suspension",
    });
  });

  it.each([
    ["SYN-AEAT-011", 120000, 120000, 0, "REQUESTED"],
    ["SYN-AEAT-012", 160000, 150000, 10000, "REQUESTED"],
    ["SYN-AEAT-013", 120000, 120000, 0, "REQUESTED"],
    ["SYN-AEAT-014", 120000, 120000, 0, "EX_OFFICIO"],
  ] as const)(
    "extracts %s and separates ordered, deducted and net amounts",
    async (caseId, requested, deductions, net, offsetType) => {
      const result = await extractEndToEnd(
        paymentFixture(caseId, requested, deductions, net, offsetType),
      );
      expect(result.familyId).toBe("refund.payment_communication");
      expect(money(result, "REFUND_REQUESTED")).toBe(requested);
      expect(money(result, "REFUND_AGREED")).toBe(requested);
      expect(money(result, "REFUND_ORDERED")).toBe(requested);
      expect(money(result, "DEDUCTIONS")).toBe(deductions);
      expect(money(result, "NET_REFUND_PAYMENT")).toBe(net);
      expect(text(result, "OFFSET_TYPE")).toBe(
        offsetType === "REQUESTED"
          ? "Compensación solicitada"
          : "Compensación de oficio",
      );
      expect(result.explanation).toBe(
        net === 0
          ? "La devolución se aplicó íntegramente a deudas y no queda importe líquido para transferir."
          : "La devolución se aplicó parcialmente a deudas y queda un importe líquido cuya transferencia fue ordenada.",
      );
    },
  );

  it("keeps a refund reference printed under the generic reference label", async () => {
    const base = paymentFixture("GENERIC-01", 120_000, 120_000, 0, "EX_OFFICIO");
    const source = document("SYN-AEAT-GENERIC-REFUND-REFERENCE", [
      base.pages[0]!.text.replace(
        "Referencia de devolución: SYNREFUND-GENERIC-01",
        "Referencia: SYNREFUND-GENERIC-01",
      ),
      null,
    ]);

    const result = await extractAeatRealCorpusDocumentV2(source);
    expect(text(result, "REFUND_REFERENCE")).toBe("SYNREFUND-GENERIC-01");
  });

  it("recognizes a publication certificate title split across OCR lines", async () => {
    const source = publicationFixture(
      "SYN-AEAT-OCR-PUBLICATION",
      "CERTIFICATE",
      "EXECUTIVE_LIQUIDATION",
    );
    const split = document("SYN-AEAT-OCR-PUBLICATION", [
      source.pages[0]!.text.replace(
        "CERTIFICADO DE PUBLICACIÓN EN EL BOLETÍN OFICIAL DEL ESTADO DEL ANUNCIO DE CITACIÓN PARA NOTIFICACIÓN POR COMPARECENCIA",
        "CERTIFICADO DE PUBLICACIÓN EN EL BOLETÍN OFICIAL DEL ESTADO\nDEL ANUNCIO DE CITACIÓN PARA NOTIFICACIÓN POR COMPARECENCIA",
      ),
      null,
    ]);

    const result = await extractEndToEnd(split);

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "notification.publication_or_appearance",
    });
  });

  it.each([
    ["SYN-AEAT-015", "DILIGENCE", "EXECUTIVE_LIQUIDATION", null],
    ["SYN-AEAT-016", "CERTIFICATE", "EXECUTIVE_LIQUIDATION", "2025-02-26"],
    ["SYN-AEAT-017", "CERTIFICATE", "BANK_ACCOUNT_SEIZURE", "2025-02-26"],
    [
      "SYN-AEAT-018",
      "CERTIFICATE",
      "DEFERRAL_OR_INSTALLMENT_RESOLUTION",
      "2025-02-26",
    ],
    ["SYN-AEAT-019", "PREPUBLICATION", "SANCTION_REDUCTION_CLAWBACK", null],
  ] as const)(
    "keeps %s as notification evidence instead of the underlying act",
    async (caseId, kind, underlyingType, effectiveDate) => {
      const result = await extractEndToEnd(
        publicationFixture(caseId, kind, underlyingType),
      );
      expect(result.familyId).toBe("notification.publication_or_appearance");
      expect(text(result, "UNDERLYING_ACT_TYPE")).toBe(
        {
          EXECUTIVE_LIQUIDATION: "Liquidación",
          BANK_ACCOUNT_SEIZURE: "Diligencia de embargo",
          DEFERRAL_OR_INSTALLMENT_RESOLUTION:
            "Acuerdo de aplazamiento o fraccionamiento",
          SANCTION_REDUCTION_CLAWBACK:
            "Exigencia de reducción de sanción",
        }[underlyingType],
      );
      expect(text(result, "EFFECTIVE_NOTIFICATION_DATE")).toBe(effectiveDate);
      expect(result.confirmsDeadline).toBe(false);
    },
  );

  it.each([
    ["DILIGENCE", "L8000000000000022", "Liquidación", null, null],
    [
      "CERTIFICATE",
      "800000000000A",
      "Diligencia de embargo",
      "2026/321",
      "2026-07-26",
    ],
    [
      "PREPUBLICATION",
      "8000000000002",
      "Exigencia de reducción de sanción",
      null,
      null,
    ],
  ] as const)(
    "extracts observed values from the %s narrative layout",
    async (
      kind,
      underlyingReference,
      underlyingType,
      publicationNumber,
      effectiveDate,
    ) => {
      const source = publicationNarrativeFixture(
        `SYN-AEAT-NARRATIVE-${kind}`,
        kind,
      );
      const result = await extractEndToEnd(source);
      expect(text(result, "CERTIFICATE_OR_COMMUNICATION_ID")).toBe(
        "7000000000001",
      );
      expect(text(result, "UNDERLYING_ACT_REFERENCE")).toBe(
        underlyingReference,
      );
      expect(text(result, "UNDERLYING_ACT_TYPE")).toBe(underlyingType);
      expect(text(result, "PUBLICATION_DATE")).toBe(
        kind === "PREPUBLICATION" ? null : "2026-07-10",
      );
      expect(text(result, "PUBLICATION_NUMBER")).toBe(publicationNumber);
      expect(text(result, "EFFECTIVE_NOTIFICATION_DATE")).toBe(effectiveDate);

      const review = (
        await analyzeFiscalNotificationDocumentInput(source)
      ).verticalSliceReview;
      expect(review.documents).toHaveLength(1);
      expect(review.documents[0]?.fields.every(
        (field) => field.sourcePageNumbers.length > 0,
      )).toBe(true);
      expect(JSON.stringify(review)).not.toMatch(
        /EXACT_|INTEGER:|BOOLEAN:|EXPLANATION:|ROLE:|SEIZURE_RECIPIENT_ROLE:/u,
      );
    },
  );

  it("extracts historical publication, effective and signing dates from printed narrative wording", async () => {
    const source = document("SYN-AEAT-NARRATIVE-DATES", [
      [
        "CERTIFICADO DE PUBLICACIÓN EN EL BOLETÍN OFICIAL DEL ESTADO DEL ANUNCIO DE CITACIÓN PARA NOTIFICACIÓN POR COMPARECENCIA",
        "Certificado de publicación",
        "Notificación por comparecencia",
        "N.º Certificado: 7000000000001",
        "Concepto: diligencia de embargo n.º 800000000000A",
        "Publicado en el Boletín Oficial del Estado, número de anuncio 2026/321 de fecha 10-07-2026.",
        "Transcurrido el plazo desde la publicación, la notificación del acto se entiende producida",
        "el 26-07-2026, de acuerdo con la norma indicada.",
        "Documento firmado electrónicamente",
        "Fecha de firma: 27 de julio de 2026.",
      ].join("\n"),
      null,
    ]);

    const result = await extractEndToEnd(source);

    expect(text(result, "PUBLICATION_DATE")).toBe("2026-07-10");
    expect(text(result, "EFFECTIVE_NOTIFICATION_DATE")).toBe("2026-07-26");
    expect(text(result, "SIGNING_DATE")).toBe("2026-07-27");
    const review = (
      await analyzeFiscalNotificationDocumentInput(source)
    ).verticalSliceReview;
    expect(review.documents[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ semantic: "DATE", canonicalType: "ACTION_DATE" }),
        expect.objectContaining({ semantic: "DATE", canonicalType: "EFFECTIVE_NOTIFICATION_DATE" }),
        expect.objectContaining({ semantic: "DATE", canonicalType: "SIGNING_DATE" }),
      ]),
    );
  });

  it("does not turn a generic nearby date into a signing date", async () => {
    const source = document("SYN-AEAT-NARRATIVE-NOT-SIGNING-DATE", [
      [
        "CERTIFICADO DE PUBLICACIÓN EN EL BOLETÍN OFICIAL DEL ESTADO DEL ANUNCIO DE CITACIÓN PARA NOTIFICACIÓN POR COMPARECENCIA",
        "Certificado de publicación",
        "Notificación por comparecencia",
        "N.º Certificado: 7000000000002",
        "Concepto: diligencia de embargo n.º 800000000000B",
        "Documento firmado electrónicamente",
        "Agencia Estatal de Administración Tributaria, en fecha 28 de julio de 2026.",
      ].join("\n"),
      null,
    ]);

    const result = await extractEndToEnd(source);

    expect(text(result, "SIGNING_DATE")).toBeNull();
  });

  it("uses an explicitly labelled printed date as the issue date without capturing legal dates", async () => {
    const source = document("SYN-AEAT-PROPOSAL-TERMINAL-DATE", [
      [
        proposalFixture().pages[0]!.text,
        "La Ley 99/2020 fue aprobada el 01-01-2020.",
        "Fecha de emisión: 17 de abril de 2026",
      ].join("\n"),
      ...proposalFixture().pages.slice(1).map((page) =>
        page.isBlank ? null : page.text,
      ),
    ]);

    const result = await extractEndToEnd(source);

    expect(text(result, "ISSUE_DATE")).toBe("2026-04-17");
  });

  it("keeps an explicit issue date for an informative publication document", async () => {
    const source = document("SYN-AEAT-PUBLICATION-TERMINAL-DATE", [
      [
        "DILIGENCIA DE PUBLICACIÓN DEL ANUNCIO DE CITACIÓN PARA NOTIFICACIÓN POR COMPARECENCIA",
        "Certificado de publicación",
        "Notificación por comparecencia",
        "Referencia: SYN-PUBLICATION-TERMINAL-001",
        "Publicado en el Boletín Oficial del Estado de fecha 10-07-2026.",
        "Fecha de emisión: 18 de julio de 2026",
      ].join("\n"),
      null,
    ]);

    const result = await extractEndToEnd(source);

    expect(text(result, "PUBLICATION_DATE")).toBe("2026-07-10");
    expect(text(result, "ISSUE_DATE")).toBe("2026-07-18");
  });

  it("reads a signing date immediately before the electronic-signature marker", async () => {
    const source = document("SYN-AEAT-WARNING-SIGNING-DATE", [
      [
        "CARTA DE AVISO",
        "No consta la presentación de determinadas declaraciones",
        "Regularizar su situación tributaria",
        "Revise el modelo 036 o la declaración censal si cambió su actividad",
        "Referencia: SYN-WARNING-SIGNING-001",
        "Madrid, 19 de julio de 2026. Documento firmado electrónicamente",
      ].join("\n"),
      null,
    ]);

    const result = await extractEndToEnd(source);

    expect(text(result, "SIGNING_DATE")).toBe("2026-07-19");
    expect(text(result, "ISSUE_DATE")).toBeNull();
  });

  it("does not promote an unrelated date near the signing footer", async () => {
    const source = document("SYN-AEAT-WARNING-UNRELATED-DATE", [
      [
        "CARTA DE AVISO",
        "No consta la presentación de determinadas declaraciones",
        "Regularizar su situación tributaria",
        "Referencia: SYN-WARNING-UNRELATED-001",
        "Documento firmado electrónicamente",
        "Fecha de registro: 19 de julio de 2026",
      ].join("\n"),
      null,
    ]);

    const result = await extractEndToEnd(source);

    expect(text(result, "SIGNING_DATE")).toBeNull();
    expect(text(result, "ISSUE_DATE")).toBeNull();
  });

  it("creates one missing-return unit per model/period and no formal deadline", async () => {
    const source = document("SYN-AEAT-020", [
      [
        "CARTA DE AVISO",
        "No consta la presentación de determinadas declaraciones",
        "Regularizar su situación tributaria",
        "Revise el modelo 036 o la declaración censal si cambió su actividad",
        "Referencia: SYN-WARNING-2017-001",
        "Declaración no registrada: modelo 130 ejercicio 2017 1T",
        "Declaración no registrada: modelo 130 ejercicio 2017 2T",
        "Recargo histórico: 5, 10 y 15 por ciento",
      ].join("\n"),
      null,
    ]);
    const result = await extractEndToEnd(source);
    expect(result.familyId).toBe("compliance.informal_missing_return_notice");
    expect(result.missingReturns).toEqual([
      expect.objectContaining({
        model: "130",
        fiscalYear: "2017",
        taxPeriod: "1T",
      }),
      expect.objectContaining({
        model: "130",
        fiscalYear: "2017",
        taxPeriod: "2T",
      }),
    ]);
    expect(findField(result, "FORMAL_REQUIREMENT")).toMatchObject({
      value: false,
    });
    expect(findField(result, "RESPONSE_DEADLINE_PRINTED")).toMatchObject({
      value: false,
    });
    expect(result.explanation).toBe(
      "Es una carta de aviso sobre dos modelos no registrados; no es requerimiento formal, deuda ni sanción y no tiene plazo impreso.",
    );
  });

  it("runs the exact review through document analysis and persists no injected PII or OCR text", async () => {
    const source = proposalFixture();
    const withPii = Object.freeze({
      ...source,
      pages: Object.freeze(
        source.pages.map((page, index) =>
          index === 2
            ? Object.freeze({
                ...page,
                text: `${page.text}\nNombre: Persona Sintética Secreta\nNIF: 12345678Z\nIBAN: ES9121000418450200051332\nemail: secreto@example.test`,
              })
            : page,
        ),
      ),
    });
    const extracted = await extractAeatRealCorpusDocumentV2(withPii);
    const result = await analyzeFiscalNotificationDocumentInput(withPii);
    const serialized = JSON.stringify({
      extracted,
      review: result.verticalSliceReview,
    });
    expect(result.verticalSliceReview.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          familyId: "assessment.allegations_and_proposal",
        }),
      ]),
    );
    expect(serialized).toContain("La AEAT propone cambiar un saldo");
    expect(serialized).not.toContain("Persona Sintética Secreta");
    expect(serialized).not.toContain("12345678Z");
    expect(serialized).not.toContain("ES9121000418450200051332");
    expect(serialized).not.toContain("secreto@example.test");
  });

  it("does not let a generic title fragment override an incompatible strong title", async () => {
    const source = document("negative-title", [
      "DATOS FISCALES\nConcepto tributario: IRPF\nEjercicio: 2025\nNo vinculan a la Agencia Tributaria\nAnexo citado: propuesta de liquidación",
    ]);
    expect((await extractEndToEnd(source)).familyId).toBe(
      "information.tax_data_report",
    );
  });
});
