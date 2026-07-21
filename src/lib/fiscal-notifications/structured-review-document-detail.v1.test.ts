import { describe, expect, it } from "vitest";
import { AEAT_DOCUMENT_PROFILES_V1 } from "./knowledge/aeat-document-knowledge.v1";
import {
  FISCAL_NOTIFICATION_DETAIL_PREVIEW_LIMIT_V1,
  FISCAL_NOTIFICATION_DETAIL_TABLE_LIMIT_V1,
  projectFiscalNotificationDocumentDetailV1,
} from "./structured-review-document-detail.v1";
import type {
  FiscalNotificationDocumentLibraryGroupV1,
  FiscalNotificationDocumentLibraryLinkV1,
} from "./structured-review-document-library.v1";
import { explainFiscalNotificationDocumentV1 } from "./structured-document-explanation.v1";
import type { FiscalNotificationStructuredHistoryEntryV1 } from "./structured-review-history-view-model.v1";

const BASE_EXPLANATION = explainFiscalNotificationDocumentV1({
  documentType: "GENERIC_ADMINISTRATIVE_NOTICE",
  documentSubtype: null,
  documentDate: "2026-04-20",
  receiptDate: null,
  facts: [],
  money: [],
});

function document(
  overrides: Partial<FiscalNotificationStructuredHistoryEntryV1> = {},
): FiscalNotificationStructuredHistoryEntryV1 {
  return {
    key: "document:current",
    documentType: "GENERIC_ADMINISTRATIVE_NOTICE",
    documentSubtype: "collection.enforcement_order",
    title: "Providencia de apremio",
    authority: "Agencia Estatal de Administración Tributaria",
    documentDate: "2026-04-20",
    documentDateBasis: "Fecha del acto",
    createdAt: "2026-07-20T08:00:00.000Z",
    pageCount: 7,
    byteLength: 7_000,
    subjectName: null,
    subjectTaxId: null,
    references: [],
    printedDates: [],
    orderedFacts: [],
    money: [],
    installments: [],
    explanation: {
      ...BASE_EXPLANATION,
      whatItIs: "Es un acto de recaudación ejecutiva.",
      whyReceived: "La explicación se basa en conocimiento oficial separado.",
      result: "El documento requiere revisar el pago indicado.",
      nextStep: {
        status: "REVIEW_DOCUMENT_ACTION",
        title: "Comprueba la deuda y las referencias",
        detail: "Revisa el acto y cualquier plazo impreso.",
      },
      deadline: {
        status: "DOCUMENT_STATED",
        title: "Plazo indicado en el documento",
        detail: "El documento fija un vencimiento explícito.",
      },
      keyFacts: [],
      officialSources: [],
    },
    authenticityLabel: "Autenticidad no comprobada",
    reviewStatus: "PENDING",
    reviewLabel: "Datos extraídos · revisa antes de actuar",
    sourceContentRetention: "NOT_RETAINED",
    originalArchive: null,
    ...overrides,
  };
}

function group(
  documents: readonly FiscalNotificationStructuredHistoryEntryV1[],
  links: readonly FiscalNotificationDocumentLibraryLinkV1[] = [],
): FiscalNotificationDocumentLibraryGroupV1 {
  const dated = documents
    .flatMap((item) => (item.documentDate ? [item.documentDate] : []))
    .sort();
  return {
    key: "document-group:synthetic",
    documents,
    summaries: [],
    links,
    firstDocumentChronologyKey: dated[0] ? `${dated[0]}T00:00:00.000Z` : "",
    latestDocumentChronologyKey: dated.at(-1)
      ? `${dated.at(-1)}T00:00:00.000Z`
      : "",
    deadlineChronologyKeys: [],
    dateRangeLabel: dated.length === 0 ? "Fecha pendiente" : "ABR 2026",
    primaryReference: null,
    reviewStatus: "PENDING",
    hasConfirmedRelation: links.some(
      (link) => link.relationStatus !== "SUGGESTED",
    ),
    hasSuggestedRelation: links.some(
      (link) => link.relationStatus === "SUGGESTED",
    ),
  };
}

function project(
  current: FiscalNotificationStructuredHistoryEntryV1,
  related: readonly FiscalNotificationStructuredHistoryEntryV1[] = [],
  links: readonly FiscalNotificationDocumentLibraryLinkV1[] = [],
) {
  const allDocuments = [current, ...related];
  return projectFiscalNotificationDocumentDetailV1({
    document: current,
    group: group(allDocuments, links),
    allDocuments,
  });
}

describe("structured review document detail v1", () => {
  it("compone una ficha sencilla sin secciones vacías ni mensajes económicos de relleno", () => {
    const current = document({
      documentDate: null,
      documentDateBasis: null,
      title: "Datos fiscales",
      orderedFacts: [
        {
          key: "fact:reference",
          semantic: "REFERENCE",
          label: "Número de expediente",
          value: "EXP-SYNTH-001",
          pageNumber: 1,
          sourceReference: null,
        },
        {
          key: "fact:obligation",
          semantic: "OBLIGATION",
          label: "Obligación",
          value: "Revisar la deuda indicada",
          pageNumber: 2,
          sourceReference: null,
        },
      ],
    });

    const result = project(current);

    expect(result.header.title).toBe("Providencia de apremio");
    expect(result.header.literalTitle).toBeNull();
    expect(result.header.primaryDateValue).toBe("No identificada");
    expect(result.economy).toBeNull();
    expect(result.connections).toBeNull();
    expect(result.factGroups.map((item) => item.id)).toEqual([
      "REFERENCES",
      "OBLIGATIONS",
    ]);
    expect(JSON.stringify(result)).not.toContain("Sin importes guardados");
  });

  it("limpia el papel, la carta de pago y las referencias redundantes después de guardar", () => {
    const result = project(
      document({
        orderedFacts: [
          {
            key: "reference:liquidation",
            semantic: "REFERENCE",
            label: "Clave de liquidación",
            value: "SYN-LIQ-STORED-001",
            pageNumber: 1,
            sourceReference: null,
          },
          {
            key: "reference:act-duplicate",
            semantic: "REFERENCE",
            label: "Acto o requerimiento",
            value: "SYN-LIQ-STORED-001",
            pageNumber: 1,
            sourceReference: null,
          },
          {
            key: "reference:short-expiry-code",
            semantic: "REFERENCE",
            label: "Referencia oficial",
            value: "14",
            pageNumber: 2,
            sourceReference: null,
          },
          {
            key: "reference:legacy-payment-form",
            semantic: "REFERENCE",
            label: "Justificante de pago",
            value: "082600000001A",
            pageNumber: 2,
            sourceReference: null,
          },
          {
            key: "party:debtor",
            semantic: "PARTY",
            label: "Deudor principal",
            value: "Deudor principal",
            pageNumber: 1,
            sourceReference: null,
          },
          {
            key: "party:debtor-duplicate",
            semantic: "PARTY",
            label: "Deudor principal",
            value: "Deudor principal",
            pageNumber: 2,
            sourceReference: null,
          },
        ],
      }),
    );
    const facts = result.factGroups.flatMap((item) => item.fields);

    expect(facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Clave de liquidación",
          value: "SYN-LIQ-STORED-001",
        }),
        expect.objectContaining({
          label: "Número de la carta de pago",
          value: "082600000001A",
        }),
        expect.objectContaining({
          label: "Tu papel en el documento",
          value: "Obligado al pago",
          provenance: expect.objectContaining({ pageNumbers: [1, 2] }),
        }),
      ]),
    );
    expect(JSON.stringify(facts)).not.toMatch(
      /Acto o requerimiento|Referencia oficial|Justificante de pago|Deudor principal/u,
    );
  });

  it("mantiene el modelo 002 dentro de la carta de pago si falta el modelo tributario", () => {
    const result = project(
      document({
        orderedFacts: [
          {
            key: "payment-form:model",
            semantic: "REFERENCE",
            label: "Modelo de ingreso",
            value: "002",
            pageNumber: 2,
            sourceReference: null,
          },
        ],
      }),
    );

    expect(result.header.metadata).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "model" })]),
    );
    expect(result.factGroups.flatMap((group) => group.fields)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Modelo de ingreso", value: "002" }),
      ]),
    );
  });

  it("agrupa muchas fechas y referencias con expansión estable y procedencia por página", () => {
    const dates = Array.from({ length: 31 }, (_, index) => ({
      key: `date:${index}`,
      semantic: "DATE" as const,
      label: `Fecha documental ${index + 1}`,
      value: `2026-04-${String((index % 28) + 1).padStart(2, "0")}`,
      pageNumber: (index % 7) + 1,
      sourceReference: null,
    }));
    const references = Array.from({ length: 30 }, (_, index) => ({
      key: `reference:${index}`,
      semantic: "REFERENCE" as const,
      label: `Referencia de acto ${index + 1}`,
      value: `REF-SYNTH-${String(index + 1).padStart(3, "0")}`,
      pageNumber: (index % 7) + 1,
      sourceReference: null,
    }));

    const result = project(
      document({ orderedFacts: [...dates, ...references] }),
    );
    const dateGroup = result.factGroups.find((item) => item.id === "DATES");
    const referenceGroup = result.factGroups.find(
      (item) => item.id === "REFERENCES",
    );

    expect(dateGroup?.fields).toHaveLength(31);
    expect(referenceGroup?.fields).toHaveLength(30);
    expect(dateGroup?.previewLimit).toBe(
      FISCAL_NOTIFICATION_DETAIL_PREVIEW_LIMIT_V1,
    );
    expect(dateGroup?.fields[18]?.provenance).toMatchObject({
      pageNumber: 5,
      basis: "PRINTED",
    });
    expect(result.header.primaryDateProvenance).toBeNull();
  });

  it("lleva la identidad documental a la cabecera sin duplicarla en otros datos", () => {
    const result = project(
      document({
        orderedFacts: [
          {
            key: "header:date",
            semantic: "DATE",
            label: "Fecha del acto",
            value: "20/04/2026",
            pageNumber: 1,
            sourceReference: null,
          },
          {
            key: "header:unit",
            semantic: "DETAIL",
            label: "Unidad emisora",
            value: "Dependencia de Recaudación",
            pageNumber: 1,
            sourceReference: null,
          },
          {
            key: "header:act",
            semantic: "DETAIL",
            label: "Acto principal",
            value: "Providencia de apremio",
            pageNumber: 1,
            sourceReference: null,
          },
          {
            key: "header:model",
            semantic: "DETAIL",
            label: "Modelo",
            value: "002",
            pageNumber: 1,
            sourceReference: null,
          },
          {
            key: "header:period",
            semantic: "DETAIL",
            label: "Periodo",
            value: "2025 / 3T",
            pageNumber: 1,
            sourceReference: null,
          },
          {
            key: "header:year",
            semantic: "DETAIL",
            label: "Ejercicio",
            value: "2025",
            pageNumber: 1,
            sourceReference: null,
          },
        ],
      }),
    );

    expect(result.header.issuingUnit).toBe("Dependencia de Recaudación");
    expect(result.header.metadata.map((item) => item.label)).toEqual([
      "Acto",
      "Modelo",
      "Periodo",
      "Ejercicio",
      "Páginas",
    ]);
    expect(result.header.primaryDateProvenance).toMatchObject({
      fieldLabel: "Fecha del acto",
      pageNumber: 1,
    });
    expect(result.factGroups).toEqual([]);
  });

  it("asocia la fecha principal con la procedencia de su semántica jurídica", () => {
    const result = project(
      document({
        documentDateBasis: "Fecha del acto",
        orderedFacts: [
          {
            key: "date:notification",
            semantic: "DATE",
            label: "Fecha de notificación",
            value: "20/04/2026",
            pageNumber: 4,
            sourceReference: null,
          },
          {
            key: "date:act",
            semantic: "DATE",
            label: "Fecha de la resolución",
            value: "20/04/2026",
            pageNumber: 1,
            sourceReference: null,
          },
        ],
      }),
    );

    expect(result.header.primaryDateProvenance).toMatchObject({
      fieldLabel: "Fecha de la resolución",
      pageNumber: 1,
    });
    expect(result.factGroups[0]?.fields).toEqual([
      expect.objectContaining({ label: "Fecha de notificación" }),
    ]);
  });

  it("no atribuye una página de otra fecha cuando falta la semántica principal", () => {
    const result = project(
      document({
        documentDateBasis: "Fecha de firma",
        orderedFacts: [
          {
            key: "date:act-only",
            semantic: "DATE",
            label: "Fecha del acto",
            value: "20/04/2026",
            pageNumber: 3,
            sourceReference: null,
          },
        ],
      }),
    );

    expect(result.header.primaryDateLabel).toBe("Fecha de firma");
    expect(result.header.primaryDateProvenance).toBeNull();
    expect(result.factGroups[0]?.fields[0]).toMatchObject({
      label: "Fecha del acto",
      provenance: { pageNumber: 3 },
    });
  });

  it("diferencia sujetos y roles y enmascara identificadores fiscales", () => {
    const result = project(
      document({
        orderedFacts: [
          {
            key: "party:debtor",
            semantic: "PARTY",
            label: "Deudor",
            value: "Persona sintética",
            pageNumber: 1,
            sourceReference: null,
          },
          {
            key: "party:payer",
            semantic: "PARTY",
            label: "Tercero pagador",
            value: "Entidad sintética",
            pageNumber: 2,
            sourceReference: null,
          },
          {
            key: "party:nif",
            semantic: "MASKED_VALUE",
            label: "NIF del deudor",
            value: "12345678Z",
            pageNumber: 1,
            sourceReference: null,
          },
        ],
      }),
    );
    const parties = result.factGroups.find((item) => item.id === "PARTIES");

    expect(parties?.fields.map((item) => item.label)).toEqual([
      "Deudor",
      "Tercero pagador",
      "NIF del deudor",
    ]);
    expect(parties?.fields[2]?.value).toBe("12*****8Z");
    expect(JSON.stringify(result)).not.toContain("12345678Z");
  });

  it("presenta una tabla económica larga sin convertir importes en relaciones", () => {
    const money = Array.from({ length: 50 }, (_, index) => ({
      key: `money:${index}`,
      label:
        index % 4 === 0
          ? "Compensación aplicada"
          : index % 4 === 1
            ? "Límite del embargo"
            : index % 4 === 2
              ? "Principal de cuota"
              : "Pendiente tras el acto",
      kind: "DOCUMENT_TOTAL" as const,
      amountCents: (index + 1) * 1_000,
      currency: "EUR" as const,
      sourceReference: `DEBT-SYNTH-${index + 1}`,
      sourceReferenceType: "DEBT_KEY" as const,
      pageNumbers: [(index % 7) + 1],
    }));
    const result = project(
      document({
        money,
        installments: [
          {
            key: "installment:1",
            label: "Cuota 1",
            amountCents: 10_200,
            dueDate: "2026-06-05",
            dueDatePageNumbers: [4],
            totalPageNumbers: [4],
            components: [
              { label: "Principal", amountCents: 10_000, pageNumbers: [4] },
              { label: "Intereses", amountCents: 200, pageNumbers: [4] },
            ],
            pageNumbers: [4],
          },
        ],
      }),
    );

    expect(result.economy?.rows).toHaveLength(50);
    expect(result.economy?.summary).toHaveLength(4);
    expect(result.economy?.previewLimit).toBe(
      FISCAL_NOTIFICATION_DETAIL_TABLE_LIMIT_V1,
    );
    expect(result.economy?.rows[32]).toMatchObject({
      sourceReference: "DEBT-SYNTH-33",
      pageNumbers: [5],
    });
    expect(result.economy?.installments[0]).toMatchObject({
      dueDate: "05/06/2026",
      dueDatePageNumbers: [4],
      total: "102,00 €",
      totalPageNumbers: [4],
      components: [
        { label: "Principal", pageNumbers: [4] },
        { label: "Intereses", pageNumbers: [4] },
      ],
      pageNumbers: [4],
    });
    expect(result.connections).toBeNull();
  });

  it("conserva la compensación fila a fila con deuda, crédito, referencia y página", () => {
    const result = project(
      document({
        documentSubtype: "collection.offset_ex_officio",
        orderedFacts: [
          {
            key: "reference:offset",
            semantic: "REFERENCE",
            label: "Número de acuerdo",
            value: "OFFSET-SYNTH-001",
            pageNumber: 1,
            sourceReference: null,
          },
        ],
        money: [
          {
            key: "money:credit",
            label: "Crédito reconocido",
            kind: "CREDIT_TOTAL",
            amountCents: 30_000,
            currency: "EUR",
            sourceReference: "CREDIT-SYNTH-001",
            sourceReferenceType: "PROCEDURE_NUMBER",
            pageNumbers: [2],
          },
          {
            key: "money:applied",
            label: "Importe aplicado a la deuda",
            kind: "OFFSET_APPLIED",
            amountCents: 20_000,
            currency: "EUR",
            sourceReference: "DEBT-SYNTH-001",
            sourceReferenceType: "DEBT_KEY",
            pageNumbers: [2],
          },
          {
            key: "money:remaining",
            label: "Crédito restante",
            kind: "REMAINING_AFTER_OFFSET",
            amountCents: 10_000,
            currency: "EUR",
            sourceReference: "CREDIT-SYNTH-001",
            sourceReferenceType: "PROCEDURE_NUMBER",
            pageNumbers: [3],
          },
        ],
      }),
    );

    expect(result.economy?.showSourceReference).toBe(true);
    expect(result.economy?.rows).toEqual([
      expect.objectContaining({
        label: "Crédito reconocido",
        sourceReference: "CREDIT-SYNTH-001",
        pageNumbers: [2],
      }),
      expect.objectContaining({
        label: "Importe aplicado a la deuda",
        sourceReference: "DEBT-SYNTH-001",
        pageNumbers: [2],
      }),
      expect.objectContaining({
        label: "Crédito restante",
        sourceReference: "CREDIT-SYNTH-001",
        pageNumbers: [3],
      }),
    ]);
  });

  it("mantiene separados deudor, tercero receptor y conceptos de un embargo", () => {
    const result = project(
      document({
        documentSubtype: "seizure.commercial_credits",
        orderedFacts: [
          {
            key: "party:debtor",
            semantic: "PARTY",
            label: "Deudor",
            value: "Persona de prueba",
            pageNumber: 1,
            sourceReference: null,
          },
          {
            key: "party:receiver",
            semantic: "PARTY",
            label: "Tercero receptor",
            value: "Entidad de prueba",
            pageNumber: 1,
            sourceReference: null,
          },
        ],
        money: [
          {
            key: "money:outstanding",
            label: "Deuda pendiente",
            kind: "OUTSTANDING_PRINCIPAL",
            amountCents: 41_000,
            currency: "EUR",
            sourceReference: "DEBT-SYNTH-002",
            sourceReferenceType: "DEBT_KEY",
            pageNumbers: [2],
          },
          {
            key: "money:seized",
            label: "Límite del embargo",
            kind: "SEIZED_AMOUNT",
            amountCents: 27_500,
            currency: "EUR",
            sourceReference: "SEIZURE-SYNTH-002",
            sourceReferenceType: "DOCUMENT_REFERENCE",
            pageNumbers: [3],
          },
        ],
      }),
    );

    expect(
      result.factGroups.find((item) => item.id === "PARTIES")?.fields,
    ).toEqual([
      expect.objectContaining({ label: "Deudor" }),
      expect.objectContaining({ label: "Tercero receptor" }),
    ]);
    expect(result.economy?.rows.map((item) => item.label)).toEqual([
      "Deuda pendiente",
      "Límite del embargo",
    ]);
    expect(JSON.stringify(result)).not.toContain("transferido");
  });

  it("presenta el aplazamiento como cabecera y cuotas, sin mezclar sus vencimientos", () => {
    const result = project(
      document({
        documentSubtype: "collection.deferral_grant",
        orderedFacts: [
          {
            key: "reference:deferral",
            semantic: "REFERENCE",
            label: "Número de acuerdo",
            value: "DEFERRAL-SYNTH-001",
            pageNumber: 1,
            sourceReference: null,
          },
        ],
        money: [
          {
            key: "money:plan-principal",
            label: "Principal del plan",
            kind: "ORIGINAL_TAX_PRINCIPAL",
            amountCents: 24_000,
            currency: "EUR",
            sourceReference: null,
            sourceReferenceType: null,
            pageNumbers: [2, 3],
          },
          {
            key: "money:plan-interest",
            label: "Intereses del plan",
            kind: "DEFERRAL_INTEREST",
            amountCents: 900,
            currency: "EUR",
            sourceReference: null,
            sourceReferenceType: null,
            pageNumbers: [2, 3],
          },
          {
            key: "money:plan-total",
            label: "Total del plan",
            kind: "DOCUMENT_TOTAL",
            amountCents: 24_900,
            currency: "EUR",
            sourceReference: null,
            sourceReferenceType: null,
            pageNumbers: [2, 3],
          },
        ],
        installments: [
          {
            key: "installment:one",
            label: "Cuota 1",
            amountCents: 12_500,
            dueDate: "2026-08-05",
            dueDatePageNumbers: [2],
            totalPageNumbers: [2],
            components: [
              { label: "Principal", amountCents: 12_000, pageNumbers: [2] },
              { label: "Intereses", amountCents: 500, pageNumbers: [2] },
            ],
            pageNumbers: [2],
          },
          {
            key: "installment:two",
            label: "Cuota 2",
            amountCents: 12_400,
            dueDate: "2026-09-05",
            dueDatePageNumbers: [3],
            totalPageNumbers: [3],
            components: [
              { label: "Principal", amountCents: 12_000, pageNumbers: [3] },
              { label: "Intereses", amountCents: 400, pageNumbers: [3] },
            ],
            pageNumbers: [3],
          },
        ],
      }),
    );

    expect(result.economy?.installments).toEqual([
      expect.objectContaining({
        label: "Cuota 1",
        dueDate: "05/08/2026",
        pageNumbers: [2],
      }),
      expect.objectContaining({
        label: "Cuota 2",
        dueDate: "05/09/2026",
        pageNumbers: [3],
      }),
    ]);
    expect(result.economy?.rows).toEqual([]);
    expect(result.economy?.summary).toEqual([
      expect.objectContaining({ label: "Número de cuotas", value: "2" }),
      expect.objectContaining({ label: "Principal total", value: "240,00 €" }),
      expect.objectContaining({ label: "Intereses totales", value: "9,00 €" }),
      expect.objectContaining({ label: "Total programado", value: "249,00 €" }),
    ]);
    expect(result.economy?.installmentTotals).toMatchObject({
      count: 2,
      principal: "240,00 €",
      interest: "9,00 €",
      surcharge: "0,00 €",
      total: "249,00 €",
      pageNumbers: [2, 3],
    });
    expect(result.economy).toMatchObject({
      featuredInstallment: {
        label: "Primera cuota del calendario",
        dueDate: "05/08/2026",
        total: "125,00 €",
      },
      showInstallmentSurcharge: false,
    });
    expect(result.header).toMatchObject({
      primaryDateLabel: "Fecha del acuerdo",
      reviewLabel: "Revisión personal pendiente",
      originalLabel: "PDF original no archivado",
    });
    expect(result.explanation).toMatchObject({
      documentSays:
        "El acuerdo fija 2 cuotas con sus respectivos vencimientos, principales e intereses.",
      officialMeaning:
        "Hacienda ha aceptado que el principal de 240,00 € se pague en 2 cuotas. Con los intereses del aplazamiento, el total programado asciende a 249,00 €.",
      reviewTitle: "Comprueba el calendario y la domiciliación",
      deadlineTitle: "Cada cuota tiene su propio vencimiento",
    });
  });

  it("conserva la jerarquía económica y documental de la liquidación 180/115 guardada", () => {
    const result = project(document({
      documentSubtype: "assessment.final_provisional_assessment",
      title: "Resolución con liquidación provisional",
      orderedFacts: [
        { key: "reference:model", semantic: "REFERENCE", label: "Modelo tributario", value: "180", pageNumber: 1, sourceReference: null },
        { key: "reference:related-model", semantic: "REFERENCE", label: "Modelo relacionado", value: "115", pageNumber: 1, sourceReference: null },
        { key: "reference:liquidation", semantic: "REFERENCE", label: "Clave de liquidación", value: "SYN-LIQ-ASSESSMENT-24", pageNumber: 2, sourceReference: null },
        { key: "reference:payment-form", semantic: "REFERENCE", label: "Número de la carta de pago", value: "SYN-PAYMENT-FORM-24", pageNumber: 2, sourceReference: null },
        { key: "reference:payment-model", semantic: "REFERENCE", label: "Modelo de ingreso", value: "002", pageNumber: 2, sourceReference: null },
      ],
      money: [
        { key: "money:annual", label: "Retenciones anuales declaradas", kind: "DOCUMENT_TOTAL", amountCents: 68_400, currency: "EUR", sourceReference: null, sourceReferenceType: null, pageNumbers: [1] },
        { key: "money:periodic", label: "Pagos periódicos declarados", kind: "DOCUMENT_TOTAL", amountCents: 45_600, currency: "EUR", sourceReference: null, sourceReferenceType: null, pageNumbers: [1] },
        { key: "money:quota", label: "Cuota final", kind: "FINAL_QUOTA", amountCents: 22_800, currency: "EUR", sourceReference: null, sourceReferenceType: null, pageNumbers: [1] },
        { key: "money:interest", label: "Intereses", kind: "LATE_PAYMENT_INTEREST", amountCents: 307, currency: "EUR", sourceReference: null, sourceReferenceType: null, pageNumbers: [1] },
        { key: "money:total", label: "Total del documento", kind: "DOCUMENT_TOTAL", amountCents: 23_107, currency: "EUR", sourceReference: null, sourceReferenceType: null, pageNumbers: [1] },
      ],
    }));
    expect(result.header.metadata).toEqual(expect.arrayContaining([
      { key: "model", label: "Modelo", value: "180" },
    ]));
    expect(result.economy?.summary.map((row) => row.label)).toEqual([
      "Cuota resultante", "Intereses de demora", "Total a ingresar",
      "Retenciones anuales declaradas",
    ]);
    expect(result.economy?.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Cuota resultante", value: "228,00 €" }),
      expect.objectContaining({ label: "Intereses de demora", value: "3,07 €" }),
      expect.objectContaining({ label: "Total a ingresar", value: "231,07 €" }),
    ]));
    expect(result.factGroups.flatMap((group) => group.fields)).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Modelo de ingreso", value: "002" }),
      expect.objectContaining({ label: "Número de la carta de pago", value: "SYN-PAYMENT-FORM-24" }),
    ]));
    expect(result.explanation).toMatchObject({
      documentSays: "La resolución fija una cuota de 228,00 €, añade 3,07 € de intereses de demora y establece un total a ingresar de 231,07 €.",
      officialMeaning: expect.stringContaining(
        "se declararon 684,00 € en el resumen anual y constan 456,00 € mediante autoliquidaciones periódicas",
      ),
    });
  });

  it("agrupa un recurso por acto impugnado, suspensión, decisión y efectos", () => {
    const result = project(
      document({
        documentSubtype: "review.recurso_reposicion",
        orderedFacts: [
          {
            key: "appeal:act",
            semantic: "DETAIL",
            label: "Acto impugnado",
            value: "Liquidación provisional sintética",
            pageNumber: 1,
            sourceReference: "ACT-SYNTH-001",
          },
          {
            key: "appeal:suspension",
            semantic: "DETAIL",
            label: "Suspensión solicitada",
            value: "Consta la solicitud en el escrito",
            pageNumber: 2,
            sourceReference: null,
          },
          {
            key: "appeal:decision",
            semantic: "STATUS",
            label: "Decisión",
            value: "Estimación parcial",
            pageNumber: 3,
            sourceReference: null,
          },
        ],
      }),
    );

    expect(
      result.factGroups
        .find((item) => item.id === "APPEALS")
        ?.fields.map((item) => item.label),
    ).toEqual(["Acto impugnado", "Suspensión solicitada"]);
    expect(
      result.factGroups.find((item) => item.id === "OUTCOME")?.fields[0],
    ).toMatchObject({ label: "Decisión", value: "Estimación parcial" });
  });

  it("separa relaciones confirmadas y sugeridas, conserva páginas y ordena solo documentos por fecha documental", () => {
    const current = document({
      documentDate: "2026-04-04",
      documentDateBasis: "Fecha del acto",
      orderedFacts: [
        {
          key: "date:current-act",
          semantic: "DATE",
          label: "Fecha de la resolución",
          value: "04/04/2026",
          pageNumber: 1,
          sourceReference: null,
        },
      ],
    });
    const earlier = document({
      key: "document:earlier",
      title: "Providencia anterior",
      documentDate: "2026-03-10",
      documentDateBasis: "Fecha de emision",
      orderedFacts: [
        {
          key: "date:earlier-issue",
          semantic: "DATE",
          label: "Fecha de emisión",
          value: "10/03/2026",
          pageNumber: 2,
          sourceReference: null,
        },
      ],
      createdAt: "2026-07-20T10:00:00.000Z",
    });
    const later = document({
      key: "document:later",
      title: "Levantamiento posterior",
      documentDate: "2026-05-12",
      documentDateBasis: "Fecha de notificacion",
      orderedFacts: [
        {
          key: "date:later-notification",
          semantic: "DATE",
          label: "Fecha de notificación",
          value: "12/05/2026",
          pageNumber: 4,
          sourceReference: null,
        },
      ],
      createdAt: "2026-07-19T10:00:00.000Z",
    });
    const links: FiscalNotificationDocumentLibraryLinkV1[] = [
      relation({
        key: "relation:confirmed",
        fromDocumentId: earlier.key,
        toDocumentId: current.key,
        relationStatus: "SYSTEM_CONFIRMED_EXACT",
        sourcePageNumbers: [2],
        targetPageNumbers: [1],
      }),
      relation({
        key: "relation:suggested",
        fromDocumentId: current.key,
        toDocumentId: later.key,
        relationStatus: "SUGGESTED",
        sourcePageNumbers: [3],
        targetPageNumbers: [4],
      }),
    ];

    const result = project(current, [later, earlier], links);

    expect(result.connections?.timeline.map((item) => item.documentId)).toEqual(
      [earlier.key, current.key, later.key],
    );
    expect(
      result.connections?.timeline.map((item) => ({
        dateLabel: item.dateLabel,
        datePageNumber: item.datePageNumber,
      })),
    ).toEqual([
      { dateLabel: "Fecha de emisión", datePageNumber: 2 },
      { dateLabel: "Fecha del acto", datePageNumber: 1 },
      { dateLabel: "Fecha de notificación", datePageNumber: 4 },
    ]);
    expect(result.connections?.relations.map((item) => item.status)).toEqual([
      "CONFIRMED",
      "SUGGESTED",
    ]);
    expect(
      result.connections?.relations.map((item) => item.statusLabel),
    ).toEqual(["Referencia exacta", "Relación sugerida"]);
    expect(result.connections?.relations[0]?.matches[0]).toMatchObject({
      currentDocumentPages: [1],
      relatedDocumentPages: [2],
    });
    expect(result.connections?.relations[1]?.matches[0]).toMatchObject({
      currentDocumentPages: [3],
      relatedDocumentPages: [4],
    });
    expect(JSON.stringify(result.connections?.timeline)).not.toContain(
      "Posible levantamiento",
    );
  });

  it("distingue una relación confirmada por el usuario de una coincidencia exacta", () => {
    const current = document();
    const related = document({
      key: "document:user-confirmed",
      title: "Documento relacionado confirmado",
      documentDate: "2026-04-21",
    });
    const result = project(
      current,
      [related],
      [
        relation({
          key: "relation:user-confirmed",
          fromDocumentId: current.key,
          toDocumentId: related.key,
          relationStatus: "USER_CONFIRMED",
          sourcePageNumbers: [1],
          targetPageNumbers: [2],
        }),
      ],
    );

    expect(result.connections?.relations[0]).toMatchObject({
      status: "CONFIRMED",
      statusLabel: "Relación confirmada",
    });
  });

  it("no presenta relaciones ni cronología basadas en importes", () => {
    const current = document();
    const related = document({
      key: "document:amount-only",
      title: "Documento con importe coincidente",
      documentDate: "2026-04-21",
    });
    const amountOnly = {
      ...relation({
        key: "relation:amount-only",
        fromDocumentId: current.key,
        toDocumentId: related.key,
        relationStatus: "SYSTEM_CONFIRMED_EXACT",
        sourcePageNumbers: [1],
        targetPageNumbers: [2],
      }),
      matches: [
        {
          label: "Importe total",
          value: "125,00 €",
          issuer: "AEAT",
          matchMode: "EXACT_PRINTED" as const,
          sourcePageNumbers: [1],
          targetPageNumbers: [2],
        },
      ],
    } satisfies FiscalNotificationDocumentLibraryLinkV1;

    expect(project(current, [related], [amountOnly]).connections).toBeNull();
  });

  it("mantiene explicación y fuentes oficiales separadas de los hechos impresos", () => {
    const current = document({
      explanation: {
        ...document().explanation,
        keyFacts: [
          {
            label: "Vencimiento calculado",
            value: "05/05/2026",
            basis: "CALCULATED_FROM_PRINTED_VALUES",
          },
        ],
        officialSources: [
          {
            id: "source:boe",
            authority: "BOE",
            title: "Ley General Tributaria",
            canonicalUrl:
              "https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186",
          },
        ],
      },
      orderedFacts: [
        {
          key: "fact:result",
          semantic: "STATUS",
          label: "Resultado impreso",
          value: "Acuerdo estimado parcialmente",
          pageNumber: 3,
          sourceReference: null,
        },
      ],
    });

    const result = project(current);

    expect(result.explanation.calculatedFacts).toEqual([
      {
        key: "calculated:0",
        label: "Vencimiento calculado",
        value: "05/05/2026",
      },
    ]);
    expect(result.connections?.sources).toEqual([
      expect.objectContaining({
        authority: "BOE",
        title: "Ley General Tributaria",
      }),
    ]);
    expect(
      result.factGroups.find((item) => item.id === "OUTCOME")?.fields[0],
    ).toMatchObject({ value: "Acuerdo estimado parcialmente" });
  });

  it("ofrece selector cuando un original contiene varios actos sin mezclarlos", () => {
    const archive = {
      status: "ARCHIVED_VERIFIED" as const,
      driveFileId: "drive-file-synthetic",
      sourceSha256: "a".repeat(64),
      documentIds: ["document:current", "document:annex"],
      archivedAt: "2026-07-20T08:00:00.000Z",
    };
    const current = document({ originalArchive: archive });
    const annex = document({
      key: "document:annex",
      title: "Carta de pago anexa",
      originalArchive: archive,
    });
    const result = project(current, [annex]);

    expect(result.siblingActs).toEqual([
      { documentId: current.key, title: current.title, current: true },
      { documentId: annex.key, title: annex.title, current: false },
    ]);
    expect(result.actions.driveFileId).toBe("drive-file-synthetic");
  });

  it("no expone tokens internos aunque una entrada histórica defectuosa los contenga", () => {
    const base = document();
    const current = document({
      title: "EXACT_TITLE_AND_AUTHORITY",
      explanation: {
        ...base.explanation,
        whatItIs: "EXPLANATION:notification.publication",
        whyReceived: "BOOLEAN:PROVES_UNDERLYING_ACT_CONTENT:FALSE",
        keyFacts: [
          {
            label: "Plazo calculado",
            value: "INTEGER:APPEARANCE_DURATION:15",
            basis: "CALCULATED_FROM_PRINTED_VALUES",
          },
        ],
        officialSources: [
          {
            id: "source:internal",
            authority: "AEAT",
            title: "EXACT_OFFICIAL_SOURCE",
            canonicalUrl: "https://sede.agenciatributaria.gob.es/",
          },
        ],
      },
      orderedFacts: [
        {
          key: "internal:1",
          semantic: "DETAIL",
          label: "Reconocimiento documental",
          value: "EXACT_TITLE_AND_AUTHORITY",
          pageNumber: 1,
          sourceReference: null,
        },
        {
          key: "internal:2",
          semantic: "DATE",
          label: "Plazo de comparecencia",
          value: "INTEGER:APPEARANCE_DURATION:15",
          pageNumber: 1,
          sourceReference: null,
        },
        {
          key: "visible:1",
          semantic: "DETAIL",
          label: "Acto citado",
          value: "Diligencia de publicación",
          pageNumber: 2,
          sourceReference: null,
        },
      ],
      money: [
        {
          key: "money:internal-label",
          label: "EXACT_DOCUMENT_TOTAL",
          kind: "DOCUMENT_TOTAL",
          amountCents: 12_500,
          currency: "EUR",
          sourceReference: null,
          sourceReferenceType: null,
          pageNumbers: [1],
        },
        {
          key: "money:internal-reference",
          label: "Total impreso",
          kind: "DOCUMENT_TOTAL",
          amountCents: 12_500,
          currency: "EUR",
          sourceReference: "EXACT_INTERNAL_REFERENCE",
          sourceReferenceType: "DOCUMENT_REFERENCE",
          pageNumbers: [1],
        },
      ],
      installments: [
        {
          key: "installment:internal",
          label: "Cuota aparente",
          amountCents: null,
          dueDate: "INTEGER:APPEARANCE_DURATION:15",
          dueDatePageNumbers: [1],
          totalPageNumbers: [],
          components: [
            {
              label: "BOOLEAN:PROVES_UNDERLYING_ACT_CONTENT:FALSE",
              amountCents: 10_000,
              pageNumbers: [1],
            },
          ],
          pageNumbers: [1],
        },
      ],
    });
    const related = document({
      key: "document:internal-related",
      title: "EXACT_RELATED_TITLE",
      documentDate: "2026-04-21",
    });
    const internalRelation = {
      ...relation({
        key: "relation:internal",
        fromDocumentId: current.key,
        toDocumentId: related.key,
        relationStatus: "SYSTEM_CONFIRMED_EXACT",
        sourcePageNumbers: [1],
        targetPageNumbers: [2],
      }),
      matches: [
        {
          label: "Número de expediente",
          value: "EXACT_INTERNAL_REFERENCE",
          issuer: "AEAT",
          matchMode: "EXACT_PRINTED" as const,
          sourcePageNumbers: [1],
          targetPageNumbers: [2],
        },
      ],
    } satisfies FiscalNotificationDocumentLibraryLinkV1;
    const result = project(current, [related], [internalRelation]);
    const serialized = JSON.stringify(result);

    expect(serialized).toContain("Diligencia de publicación");
    expect(result.economy?.rows).toEqual([
      expect.objectContaining({
        label: "Total impreso",
        sourceReference: null,
      }),
    ]);
    expect(result.economy?.installments).toEqual([]);
    expect(result.connections).toBeNull();
    expect(serialized).not.toMatch(
      /EXACT_|INTEGER:|BOOLEAN:|EXPLANATION:|_DURATION|_CONTENT/u,
    );
  });

  it("proyecta las 87 familias con un nombre humano y nunca con el id interno como título", () => {
    for (const profile of AEAT_DOCUMENT_PROFILES_V1) {
      const result = project(
        document({
          documentSubtype: profile.id,
          title: profile.nameEs,
          orderedFacts: [
            {
              key: `fact:${profile.id}`,
              semantic: "DETAIL",
              label: "Dato observado",
              value: "Consta expresamente en el documento sintético",
              pageNumber: 1,
              sourceReference: null,
            },
          ],
        }),
      );

      expect(result.header.familyLabel, profile.id).toBe(profile.nameEs);
      expect(result.header.title, profile.id).toBe(profile.nameEs);
      expect(result.header.title, profile.id).not.toBe(profile.id);
    }
  });
});

function relation(input: {
  readonly key: string;
  readonly fromDocumentId: string;
  readonly toDocumentId: string;
  readonly relationStatus:
    "SUGGESTED" | "USER_CONFIRMED" | "SYSTEM_CONFIRMED_EXACT";
  readonly sourcePageNumbers: readonly number[];
  readonly targetPageNumbers: readonly number[];
}): FiscalNotificationDocumentLibraryLinkV1 {
  return {
    key: input.key,
    relationType: "BELONGS_TO_CASE",
    fromDocumentId: input.fromDocumentId,
    fromDocumentTitle: "Documento origen",
    toDocumentId: input.toDocumentId,
    toDocumentTitle: "Documento destino",
    label: "Vínculo por expediente",
    explanation: "Los documentos comparten un identificador fuerte.",
    matches: [
      {
        label: "Número de expediente",
        value: "EXP-SYNTH-001",
        issuer: "AEAT",
        matchMode: "EXACT_PRINTED",
        sourcePageNumbers: input.sourcePageNumbers,
        targetPageNumbers: input.targetPageNumbers,
      },
    ],
    relationStatus: input.relationStatus,
    visualStatus:
      input.relationStatus === "SUGGESTED" ? "SUGGESTED" : "CONFIRMED",
    visualStatusLabel:
      input.relationStatus === "SUGGESTED"
        ? "Relación sugerida"
        : input.relationStatus === "USER_CONFIRMED"
          ? "Confirmada por el usuario"
          : "Confirmada por referencia exacta",
    statusLabel:
      input.relationStatus === "SUGGESTED"
        ? "Relación detectada · revisar"
        : "Referencia exacta · revisar efectos",
    directionSource: "DOMAIN_RELATION",
  };
}
