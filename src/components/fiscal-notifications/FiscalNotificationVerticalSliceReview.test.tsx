import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { analyzeFiscalNotificationVerticalSliceV1 } from "@/lib/fiscal-notifications/extractor-core/vertical-slice-orchestrator.v1";
import { analyzeFiscalNotificationDocumentInput } from "@/lib/fiscal-notifications/document-input-analysis";
import type { BoundedDocumentInput } from "@/lib/fiscal-notifications/input-contract";
import {
  type FiscalNotificationVerticalSliceReviewV1,
  createEmptyFiscalNotificationVerticalSliceReviewV1,
  projectFiscalNotificationVerticalSliceReviewV1,
} from "@/lib/fiscal-notifications/vertical-slice-review.v1";
import { AEAT_DOCUMENT_PROFILE_IDS_V1 } from "@/lib/fiscal-notifications/knowledge/aeat-document-knowledge.v1";
import { AEAT_OFFICIAL_CATALOG_PROFILES_V9 } from "@/lib/fiscal-notifications/knowledge/official-catalog-expansion.v9";
import { resolveAeatP0DeepProfileV10 } from "@/lib/fiscal-notifications/knowledge/p0-deep-contracts.v10";
import { FiscalNotificationVerticalSliceReview } from "./FiscalNotificationVerticalSliceReview";

vi.mock(
  "@/components/fiscal-notifications/FiscalNotificationDocumentDetail",
  async () => {
    const { createElement: element } = await import("react");
    return {
      FiscalNotificationDocumentReport: ({
        detail,
        mode,
      }: {
        detail: {
          header: {
            familyLabel: string;
            typeLabel: string;
            title: string;
            literalTitle: string | null;
            description: string;
            authority: string;
            primaryDateValue: string;
            reviewLabel: string;
            metadata: readonly { key: string; label: string; value: string }[];
          };
          factGroups: readonly {
            id: string;
            title: string;
            fields: readonly { key: string; label: string; value: string }[];
          }[];
          economy: {
            rows: readonly { key: string; label: string; value: string }[];
            installments: readonly {
              key: string;
              label: string;
              dueDate: string | null;
              total: string | null;
            }[];
          } | null;
          explanation: {
            documentSays: string;
            officialMeaning: string;
            reviewTitle: string;
            reviewDetail: string;
            deadlineTitle: string;
            deadlineDetail: string;
          };
          connections: {
            sources: readonly { key: string; title: string; href: string }[];
          } | null;
        };
        mode: string;
      }) =>
        element(
          "article",
          { "data-mode": mode },
          element("h2", null, detail.header.familyLabel),
          element("p", null, detail.header.typeLabel),
          detail.header.literalTitle
            ? element("p", null, detail.header.literalTitle)
            : null,
          element("p", null, detail.header.description),
          element("p", null, detail.header.authority),
          element("p", null, detail.header.primaryDateValue),
          element("p", null, detail.header.reviewLabel),
          ...detail.header.metadata.map((item) =>
            element("p", { key: item.key }, `${item.label}: ${item.value}`),
          ),
          element("h3", null, "Lo que dice el documento"),
          ...detail.factGroups.flatMap((group) => [
            element("h4", { key: `${group.id}:heading` }, group.title),
            ...group.fields.map((field) =>
              element(
                "p",
                { key: field.key },
                `${field.label}: ${field.value} · Página 1`,
              ),
            ),
          ]),
          detail.economy
            ? element(
                "section",
                null,
                element("h3", null, "Importes y tablas"),
                ...detail.economy.rows.map((row) =>
                  element("p", { key: row.key }, `${row.label}: ${row.value}`),
                ),
                detail.economy.installments.length > 0
                  ? element(
                      "table",
                      null,
                      element(
                        "tbody",
                        null,
                        ...detail.economy.installments.map((installment) =>
                          element(
                            "tr",
                            { key: installment.key },
                            element("td", null, installment.label),
                            element("td", null, installment.dueDate),
                            element("td", null, installment.total),
                          ),
                        ),
                      ),
                    )
                  : null,
              )
            : null,
          element("h3", null, "Qué significa y qué debes revisar"),
          element("p", null, detail.explanation.documentSays),
          element("p", null, detail.explanation.officialMeaning),
          element("p", null, detail.explanation.reviewTitle),
          element("p", null, detail.explanation.reviewDetail),
          element("p", null, detail.explanation.deadlineTitle),
          element("p", null, detail.explanation.deadlineDetail),
          detail.connections
            ? element(
                "section",
                null,
                element(
                  "h3",
                  null,
                  "Relaciones, cronología, procedencia y fuentes",
                ),
                ...detail.connections.sources.map((source) =>
                  element(
                    "a",
                    {
                      key: source.key,
                      href: source.href,
                      target: "_blank",
                      rel: "noreferrer",
                    },
                    source.title,
                  ),
                ),
              )
            : null,
        ),
    };
  },
);

const RAW_ACCOUNT = "ES12 3456 7890 1234 5678 9012";
const PAYMENT = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "JUSTIFICANTE DE PAGO",
  "Número de justificante: REC-SYN-UI-001",
  "NRC: ABCDEF1234567890GHIJKL",
  "Fecha del pago: 14/07/2026",
  "N.I.F.: 12345678Z",
  "Modelo: 303",
  "Ejercicio: 2026",
  "Periodo: 2T",
  "Clave de deuda: DEBT-SYN-UI-001",
  "Importe pagado: 600,00 euros",
  "Resultado del pago: Pago parcial",
  "Tipo de pago: Parcial",
  `Cuenta de cargo: ${RAW_ACCOUNT}`,
].join("\n");

const NOTIFICATION = [
  "Dirección Electrónica Habilitada Única",
  "dehu.redsara.es",
  "ACUSE DE RECIBO",
  "Estado de la notificación: Expirada",
  "Identificador de la notificación: NOT-SYN-UI-001",
  "Asunto: Acto sintético notificado",
  "Fecha de puesta a disposición: 01/07/2026 10:00",
  "Fecha de expiración: 11/07/2026 10:00",
].join("\n");

const BANK_SEIZURE = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS",
  "Número de diligencia: EMB-SYN-UI-001",
  "Número de expediente: EXP-SYN-UI-001",
  "Deudor: PERSONA DEUDORA SINTÉTICA",
  "Destinatario: BANCO SINTÉTICO",
  "Entidad financiera: BANCO SINTÉTICO",
  "IBAN: ES00 0000 0000 0000 1234",
  "Límite del embargo: 1.240,00 EUR",
  "Importe retenido: 900,00 EUR",
  "Fecha del embargo: 04/03/2026",
].join("\n");

function realSixPageBankSeizure(): BoundedDocumentInput {
  const content = [
    [
      "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA",
      "NOTIFICACIÓN DE DILIGENCIA DE EMBARGO DE CUENTAS Y DEPÓSITOS",
      "Número de diligencia: SYN-SEIZURE-D11",
      "Fecha de la diligencia: 24-10-2025",
      "Se le notifica en condición de OBLIGADO AL PAGO",
    ].join("\n"),
    "Información sobre recursos y oposición",
    "Continuación de la diligencia",
    "",
    [
      "DEUDAS DEL EXPEDIENTE EJECUTIVO",
      "CONCEPTO | PER/EJER | Nº LIQUIDACIÓN | IMP. PENDIENTE",
      "IVA sintético | 4T/2024 | SYN-DEBT-D11 | 276,00 EUR",
      "IMPORTE PENDIENTE TOTAL: 276,00 EUR",
      "IMPORTE A EMBARGAR: 276,00 EUR",
      "DEPÓSITOS Y CUENTAS",
      "IDENTIFICADOR INTERNO | IMPORTE EMBARGADO",
      "ACTIVO-1 | 276,00 EUR",
      "IBAN ES0012345678901234567890",
      "Banco Privado Sintético",
    ].join("\n"),
    "",
  ];
  return Object.freeze({
    ownerScope: "user:synthetic-ui-v3",
    documentId: "document:synthetic-ui-v3-d11",
    pages: Object.freeze(
      content.map((text, index) =>
        Object.freeze({
          pageNumber: index + 1,
          text,
          isBlank: text.length === 0,
        }),
      ),
    ),
  });
}

function document(text: string): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "user:synthetic-ui",
    documentId: "document:synthetic-ui",
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text, isBlank: false }),
    ]),
  });
}

function reviewForFamily(
  familyId: string,
): FiscalNotificationVerticalSliceReviewV1 {
  return {
    schemaVersion: 1,
    reviewVersion: "1.0.0",
    status: "REVIEW_REQUIRED",
    documents: [
      {
        reviewDocumentId: `review:${familyId}`,
        extractorId: "informative-communication",
        familyId:
          familyId as FiscalNotificationVerticalSliceReviewV1["documents"][number]["familyId"],
        title: `Documento ${familyId}`,
        subtitle: "Estructura documental reconocida",
        pageFrom: 1,
        pageTo: 1,
        confidence: 1,
        fields: [
          {
            fieldId: "field:document-status",
            semantic: "DETAIL",
            canonicalType: "DOCUMENT_STATUS",
            label: "Estado del documento",
            displayValue: "Dato sintético localizado",
            normalizedValue: "PRESENT",
            amountCents: null,
            currency: null,
            sourcePageNumbers: [1],
            sourceLabel: "Página sintética",
            confidence: 1,
            reviewStatus: "REVIEW_REQUIRED",
          },
        ],
        warnings: [],
        requiresHumanReview: true,
      },
    ],
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
  };
}

describe("FiscalNotificationVerticalSliceReview", () => {
  it("shows an exact expired notification and its printed dates", async () => {
    const review = projectFiscalNotificationVerticalSliceReviewV1(
      await analyzeFiscalNotificationVerticalSliceV1(document(NOTIFICATION)),
    );
    const html = renderToStaticMarkup(
      createElement(FiscalNotificationVerticalSliceReview, { review }),
    );

    expect(html).toContain("Sobre o acuse de notificación electrónica");
    expect(html).toContain("Notificación expirada");
    expect(html).toContain("NOT-SYN-UI-001");
    expect(html).toContain("01/07/2026");
    expect(html).toContain("11/07/2026");
    expect(html).not.toContain("Acto sintético notificado");
    expect(html).not.toContain("10:00");
    expect(html).toContain('data-mode="review"');
    expect(html).toContain("Lo que dice el documento");
    expect(html).toContain("Qué significa y qué debes revisar");
    expect(html).toContain("Relaciones, cronología, procedencia y fuentes");
    expect(html).not.toMatch(/posible familia/iu);
  });

  it("shows the exact type and extracted fields without possible-family copy", async () => {
    const review = projectFiscalNotificationVerticalSliceReviewV1(
      await analyzeFiscalNotificationVerticalSliceV1(document(PAYMENT)),
    );
    const html = renderToStaticMarkup(
      createElement(FiscalNotificationVerticalSliceReview, { review }),
    );

    expect(html).toContain("Justificante de pago");
    expect(html).toContain("Pago parcial confirmado en el justificante");
    expect(html).toContain("DEBT-SYN-UI-001");
    expect(html).toContain("600,00 €");
    expect(html).toContain("Página 1");
    expect(html).not.toContain("Posible familia");
    expect(html).not.toContain("****9012");
    expect(html).not.toContain(RAW_ACCOUNT);
  });

  it("shows an exact seizure with useful fields instead of a possible-family card", async () => {
    const review = projectFiscalNotificationVerticalSliceReviewV1(
      await analyzeFiscalNotificationVerticalSliceV1(document(BANK_SEIZURE)),
    );
    const html = renderToStaticMarkup(
      createElement(FiscalNotificationVerticalSliceReview, { review }),
    );

    expect(html).toContain("Diligencia de embargo de cuenta bancaria");
    expect(html).toContain("Diligencia de embargo registrada");
    expect(html).toContain("EMB-SYN-UI-001");
    expect(html).toContain("Tu papel en el documento");
    expect(html).toContain("Obligado al pago");
    expect(html.match(/Tu papel en el documento/gu)).toHaveLength(1);
    expect(html).toContain("Entidad financiera destinataria");
    expect(html).not.toContain("SEIZURE_RECIPIENT_ROLE:");
    expect(html).toContain("Límite del embargo");
    expect(html).toContain("1.240,00 €");
    expect(html).toContain("Importe retenido");
    expect(html).toContain("900,00 €");
    expect(html).not.toMatch(/posible familia/iu);
    expect(html).not.toContain("PERSONA DEUDORA SINTÉTICA");
    expect(html).not.toContain("BANCO SINTÉTICO");
    expect(html).not.toContain("****1234");
    expect(html).not.toContain("ES00 0000 0000 0000 1234");
  });

  it("shows the real six-page bank-seizure fields in plain language without bank data", async () => {
    const analysis = await analyzeFiscalNotificationDocumentInput(
      realSixPageBankSeizure(),
    );
    const html = renderToStaticMarkup(
      createElement(FiscalNotificationVerticalSliceReview, {
        review: analysis.verticalSliceReview,
      }),
    );

    expect(html).toContain("Embargo de cuenta o depósito");
    expect(html).toContain("SYN-SEIZURE-D11");
    expect(html).toContain("SYN-DEBT-D11");
    expect(html).toContain("Obligado al pago");
    expect(html).toContain("Límite del embargo");
    expect(html).toContain("Importe embargado");
    expect(html).toContain("276,00\u00a0€");
    expect(html).toContain("Comprueba la deuda, diligencia, entidad y alcance");
    expect(html).not.toContain("PRIMARY_DEBTOR");
    expect(html).not.toContain("BANK_ACCOUNT_OR_DEPOSIT");
    expect(html).not.toContain("Banco Privado Sintético");
    expect(html).not.toContain("ES0012345678901234567890");
  });

  it("shows family-specific plain-language guidance for every one of the 87 covered families", () => {
    expect(AEAT_DOCUMENT_PROFILE_IDS_V1).toHaveLength(87);

    for (const familyId of AEAT_DOCUMENT_PROFILE_IDS_V1) {
      const html = renderToStaticMarkup(
        createElement(FiscalNotificationVerticalSliceReview, {
          review: reviewForFamily(familyId),
        }),
      );

      expect(html, familyId).toContain("Lo que dice el documento");
      expect(html, familyId).toContain("Qué significa y qué debes revisar");
      expect(html, familyId).toContain(
        "Relaciones, cronología, procedencia y fuentes",
      );
      expect(html, familyId).toMatch(/href="https:\/\//u);
      expect(html, familyId).not.toMatch(/(?:NIF|IBAN)\s*:\s*[A-Z0-9]/u);
    }
  });

  it("shows a specific official explanation for every V9 profile", () => {
    expect(AEAT_OFFICIAL_CATALOG_PROFILES_V9).toHaveLength(35);
    for (const profile of AEAT_OFFICIAL_CATALOG_PROFILES_V9) {
      const html = renderToStaticMarkup(
        createElement(FiscalNotificationVerticalSliceReview, {
          review: reviewForFamily(profile.id),
        }),
      );
      expect(html, profile.id).toContain("Qué significa y qué debes revisar");
      expect(html, profile.id).toContain(
        resolveAeatP0DeepProfileV10(profile.id)?.explanationTemplate.whatItIs ??
          profile.whatItIs,
      );
      expect(html, profile.id).toContain(
        "Relaciones, cronología, procedencia y fuentes",
      );
      expect(html, profile.id).toMatch(/href="https:\/\//u);
      expect(html, profile.id).not.toContain(
        "El tipo exacto del documento todavía no se ha identificado",
      );
    }
  });

  it("keeps the legacy result unchanged when the family is not a V2 profile", () => {
    const review = structuredClone(reviewForFamily("payment.receipt"));
    (review.documents[0] as unknown as { familyId: string }).familyId =
      "legacy.family.outside-v2";

    const html = renderToStaticMarkup(
      createElement(FiscalNotificationVerticalSliceReview, { review }),
    );

    expect(html).toContain("Lo que dice el documento");
    expect(html).toContain("Dato sintético localizado");
    expect(html).toContain("Qué significa y qué debes revisar");
    expect(html).not.toContain("Relaciones, cronología, procedencia y fuentes");
  });

  it("deduplicates repeated fields and translates controlled values", () => {
    const review = structuredClone(
      reviewForFamily("collection.deferral_grant"),
    );
    const document = review.documents[0]!;
    const template = document.fields[0]!;
    (document as unknown as { fields: unknown[] }).fields = [
      {
        ...template,
        fieldId: "field:method:1",
        semantic: "DETAIL",
        canonicalType: "FACT_OR_GROUND",
        label: "Forma de pago",
        displayValue: "DIRECT_DEBIT",
        normalizedValue: "DIRECT_DEBIT",
      },
      {
        ...template,
        fieldId: "field:method:2",
        semantic: "DETAIL",
        canonicalType: "FACT_OR_GROUND",
        label: "Forma de pago",
        displayValue: "DIRECT_DEBIT",
        normalizedValue: "DIRECT_DEBIT",
      },
    ];

    const html = renderToStaticMarkup(
      createElement(FiscalNotificationVerticalSliceReview, { review }),
    );

    expect(html.match(/Domiciliación bancaria/gu)).toHaveLength(1);
    expect(html).not.toContain("DIRECT_DEBIT");
  });

  it("hides internal recognition and explanation fields from the review presenter", () => {
    const review = structuredClone(
      reviewForFamily("notification.publication_or_appearance"),
    );
    const document = review.documents[0]!;
    const template = document.fields[0]!;
    (document as unknown as { fields: unknown[] }).fields = [
      {
        ...template,
        fieldId: "real-corpus:recognized-family",
        semantic: "DETAIL",
        canonicalType: "FACT_OR_GROUND",
        label: "Reconocimiento documental",
        displayValue: "Título y autoridad coinciden",
        normalizedValue: "EXACT_TITLE_AND_AUTHORITY",
      },
      {
        ...template,
        fieldId: "real-corpus:plain-explanation",
        semantic: "DETAIL",
        canonicalType: "EXPLICIT_CONSEQUENCE",
        label: "Qué significa",
        displayValue:
          "La diligencia acredita la publicación sin crear una deuda.",
        normalizedValue:
          "EXPLANATION:notification.publication_or_appearance:PUBLICATION_DILIGENCE",
      },
      {
        ...template,
        fieldId: "real-corpus:APPEARANCE_DURATION:0",
        semantic: "DETAIL",
        canonicalType: "FACT_OR_GROUND",
        label: "Plazo de comparecencia",
        displayValue: "15",
        normalizedValue: "INTEGER:APPEARANCE_DURATION:15",
      },
      {
        ...template,
        fieldId: "real-corpus:UNDERLYING_ACT_REFERENCE:1",
        semantic: "REFERENCE",
        canonicalType: "OTHER_OFFICIAL_REFERENCE",
        label: "Referencia del acto citado",
        displayValue: "ACT-SYN-PRESENTER-001",
        normalizedValue: "ACT-SYN-PRESENTER-001",
      },
    ];

    const html = renderToStaticMarkup(
      createElement(FiscalNotificationVerticalSliceReview, { review }),
    );

    expect(html).toContain("ACT-SYN-PRESENTER-001");
    expect(html).not.toMatch(
      /Reconocimiento documental|EXACT_TITLE_AND_AUTHORITY|EXPLANATION:|INTEGER:APPEARANCE_DURATION|Plazo de comparecencia/u,
    );
  });

  it("groups installment facts in a familiar table instead of scattered cards", () => {
    const review = structuredClone(
      reviewForFamily("collection.deferral_grant"),
    );
    const document = review.documents[0]!;
    const template = document.fields[0]!;
    (document as unknown as { fields: unknown[] }).fields = [
      {
        ...template,
        fieldId: "real-corpus-v6:installment:0",
        semantic: "DETAIL",
        canonicalType: "FACT_OR_GROUND",
        label: "Cuota 1",
        displayValue:
          "Vence 20/02/2027 · principal 100,00 € · interés 2,00 € · total 102,00 €",
        normalizedValue:
          "Vence 20/02/2027 · principal 100,00 € · interés 2,00 € · total 102,00 €",
      },
    ];

    const html = renderToStaticMarkup(
      createElement(FiscalNotificationVerticalSliceReview, { review }),
    );

    expect(html).toContain("Importes y tablas");
    expect(html).toContain("<table");
    expect(html).toContain("20/02/2027");
    expect(html).toContain("102,00");
    expect(html).not.toContain("V6:INSTALLMENT:");
  });

  it("renders no empty card for information-pending content", () => {
    expect(
      renderToStaticMarkup(
        createElement(FiscalNotificationVerticalSliceReview, {
          review: createEmptyFiscalNotificationVerticalSliceReviewV1(),
        }),
      ),
    ).toBe("");
  });

  it("escapes extracted values and remains presentational", async () => {
    const review = structuredClone(
      projectFiscalNotificationVerticalSliceReviewV1(
        await analyzeFiscalNotificationVerticalSliceV1(document(PAYMENT)),
      ),
    );
    const visibleReference = review.documents[0]!.fields.find(
      (field) => field.semantic === "REFERENCE",
    );
    expect(visibleReference).toBeDefined();
    (visibleReference as unknown as { displayValue: string }).displayValue =
      '<img src=x onerror="alert(1)">';
    const html = renderToStaticMarkup(
      createElement(FiscalNotificationVerticalSliceReview, { review }),
    );

    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/<(?:form|input|button|select|textarea)\b/u);
    expect(html).toMatch(
      /<a href="https:\/\/(?:www\.boe\.es|sede\.agenciatributaria\.gob\.es|clave\.gob\.es)[^"]*" target="_blank" rel="noreferrer"/u,
    );
    expect(html).not.toMatch(/(?:aria-live|role="(?:status|alert)")/u);
  });
});
