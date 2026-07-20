import { describe, expect, it } from "vitest";
import {
  composeFiscalNotificationDocumentLibraryV1,
  EMPTY_FISCAL_NOTIFICATION_DOCUMENT_LIBRARY_FILTERS_V1,
  filterAndSortFiscalNotificationDocumentLibraryGroupsV1,
  relationAtFiscalNotificationDocumentBoundaryV1,
  type FiscalNotificationDocumentLibraryFiltersV1,
  type FiscalNotificationDocumentLibraryViewModelV1,
} from "./structured-review-document-library.v1";
import type { FiscalNotificationStructuredHistoryEntryV1 } from "./structured-review-history-view-model.v1";
import type {
  StructuredReviewRelationEntryV1,
  StructuredReviewRelationsViewModelV1,
} from "./structured-review-relations-view-model.v1";
import { explainFiscalNotificationDocumentV1 } from "./structured-document-explanation.v1";
import type { DocumentRelationType } from "./types";

function document(
  id: string,
  title: string,
  documentDate: string | null,
  createdAt: string,
  overrides: Partial<FiscalNotificationStructuredHistoryEntryV1> = {},
): FiscalNotificationStructuredHistoryEntryV1 {
  return Object.freeze({
    key: id,
    documentType: "GENERIC_ADMINISTRATIVE_NOTICE",
    documentSubtype: null,
    title,
    authority: "Agencia Estatal de Administración Tributaria",
    documentDate,
    documentDateBasis: documentDate ? "Fecha de emision" : null,
    createdAt,
    pageCount: 2,
    byteLength: 2_048,
    subjectName: null,
    subjectTaxId: null,
    references: Object.freeze([]),
    printedDates: Object.freeze([]),
    orderedFacts: Object.freeze([]),
    money: Object.freeze([]),
    installments: Object.freeze([]),
    explanation: explainFiscalNotificationDocumentV1({
      documentType: "GENERIC_ADMINISTRATIVE_NOTICE",
      documentSubtype: null,
      documentDate,
      receiptDate: null,
      facts: [],
      money: [],
    }),
    authenticityLabel: "Autenticidad no comprobada",
    reviewStatus: "PENDING",
    reviewLabel: "Datos extraídos · revisa antes de actuar",
    sourceContentRetention: "NOT_RETAINED",
    originalArchive: null,
    ...overrides,
  });
}

const JANUARY = document(
  "document:january",
  "Providencia de apremio",
  "2026-01-08",
  "2026-07-15T08:00:00.000Z",
  {
    documentSubtype: "collection.enforcement_order",
    references: [
      { label: "Número de expediente", value: "EXP-SYNTH-001" },
      { label: "Clave de liquidación", value: "LQ-SYNTH-001" },
    ],
    orderedFacts: [
      {
        key: "fact:january:model",
        semantic: "DETAIL",
        label: "Modelo",
        value: "100",
        pageNumber: 1,
        sourceReference: null,
      },
      {
        key: "fact:january:period",
        semantic: "DETAIL",
        label: "Periodo",
        value: "2025 / 4T",
        pageNumber: 1,
        sourceReference: null,
      },
      {
        key: "fact:january:deadline",
        semantic: "DATE",
        label: "Vencimiento del plazo de pago",
        value: "20/08/2026",
        pageNumber: 1,
        sourceReference: null,
      },
    ],
    money: [
      {
        key: "money:january",
        label: "Importe total",
        kind: "DOCUMENT_TOTAL",
        amountCents: 12_000,
        currency: "EUR",
        sourceReference: null,
        sourceReferenceType: null,
        pageNumbers: [1],
      },
    ],
  },
);
const MARCH = document(
  "document:march",
  "Diligencia de embargo",
  "2026-03-04",
  "2026-07-13T08:00:00.000Z",
  { documentSubtype: "seizure.bank_account" },
);
const APRIL = document(
  "document:april",
  "Levantamiento de embargo",
  "2026-04-21",
  "2026-07-14T08:00:00.000Z",
  { documentSubtype: "seizure.release" },
);
const JUNE = document(
  "document:june",
  "Requerimiento independiente",
  "2026-06-03",
  "2026-07-12T08:00:00.000Z",
  {
    documentSubtype: "compliance.formal_filing_requirement",
    authority: "Delegación Especial de la AEAT",
  },
);
const UNDATED = document(
  "document:undated",
  "Respuesta del tercero",
  null,
  "2026-07-16T08:00:00.000Z",
  { documentSubtype: "seizure.third_party_response" },
);

function relation(
  source: FiscalNotificationStructuredHistoryEntryV1,
  target: FiscalNotificationStructuredHistoryEntryV1,
  relationType: DocumentRelationType,
  status: "SUGGESTED" | "USER_CONFIRMED" | "SYSTEM_CONFIRMED_EXACT" =
    "SYSTEM_CONFIRMED_EXACT",
): StructuredReviewRelationEntryV1 {
  return {
    key: `relation:${source.key}:${target.key}`,
    relationType,
    title: "Vínculo documental sintético",
    statusLabel:
      status === "SUGGESTED"
        ? "Relación detectada · revisar"
        : "Referencia exacta · revisar efectos",
    relationStatus: status,
    documents: [
      {
        id: source.key,
        title: source.title,
        chronologyDate: source.documentDate,
        createdAt: source.createdAt,
      },
      {
        id: target.key,
        title: target.title,
        chronologyDate: target.documentDate,
        createdAt: target.createdAt,
      },
    ],
    matches: [
      {
        label: "Número de expediente",
        value: "EXP-SYNTH-001",
        issuer: "AEAT",
        matchMode: "EXACT_PRINTED",
        sourcePageNumbers: [1],
        targetPageNumbers: [1],
      },
    ],
    explanation: "Los dos actos contienen el mismo expediente sintético.",
    requiresHumanReview: true,
  };
}

function relations(
  documents: readonly FiscalNotificationStructuredHistoryEntryV1[] = [
    JANUARY,
    MARCH,
    APRIL,
  ],
  entries: readonly StructuredReviewRelationEntryV1[] = [
    relation(JANUARY, MARCH, "ENFORCES"),
    relation(MARCH, APRIL, "RELEASES_SEIZURE"),
  ],
): StructuredReviewRelationsViewModelV1 {
  return {
    status: "READY",
    entries,
    timelines: entries.length
      ? [
          {
            key: "timeline:case",
            title: `Expediente relacionado · ${documents.length} documentos`,
            statusLabel: "Referencias exactas · efectos por revisar",
            steps: documents.map((item, index) => ({
              id: item.key,
              title: item.title,
              createdAt: item.createdAt,
              position: index + 1,
            })),
            links: entries.map((entry) => ({
              ...(() => {
                const chronological = [...entry.documents].sort((left, right) => {
                  if (left.chronologyDate && right.chronologyDate) {
                    return left.chronologyDate.localeCompare(right.chronologyDate);
                  }
                  if (left.chronologyDate) return -1;
                  if (right.chronologyDate) return 1;
                  return left.id.localeCompare(right.id);
                });
                return {
                  earlierDocumentId: chronological[0]!.id,
                  laterDocumentId: chronological[1]!.id,
                };
              })(),
              key: entry.key,
              label: entry.title,
              explanation: entry.explanation,
            })),
            requiresHumanReview: true,
          },
        ]
      : [],
  };
}

function ready(
  entries: readonly FiscalNotificationStructuredHistoryEntryV1[],
  relationViewModel: StructuredReviewRelationsViewModelV1 = {
    status: "READY",
    entries: [],
    timelines: [],
  },
) {
  const result = composeFiscalNotificationDocumentLibraryV1(
    { status: "READY", entries },
    relationViewModel,
  );
  expect(result.status).toBe("READY");
  if (result.status !== "READY") throw new Error("expected ready library");
  return result;
}

function filters(
  overrides: Partial<FiscalNotificationDocumentLibraryFiltersV1> = {},
): FiscalNotificationDocumentLibraryFiltersV1 {
  return { ...EMPTY_FISCAL_NOTIFICATION_DOCUMENT_LIBRARY_FILTERS_V1, ...overrides };
}

describe("structured review document library v1", () => {
  it("proyecta un documento independiente sin textos de relleno y con sus datos útiles", () => {
    const result = ready([JANUARY]);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toEqual(
      expect.objectContaining({
        dateRangeLabel: "8 ENE 2026",
        primaryReference: {
          label: "Número de expediente",
          value: "EXP-SYNTH-001",
        },
        reviewStatus: "PENDING",
      }),
    );
    expect(result.groups[0]?.summaries[0]).toEqual(
      expect.objectContaining({
        key: JANUARY.key,
        eyebrowLabel: "Acto ejecutivo",
        title: "Providencia de apremio",
        authorityAbbreviation: "AEAT",
        documentDateLabel: "08/01/2026",
        model: "100",
        period: "2025 / 4T",
        amounts: [
          expect.objectContaining({ label: "Importe total", value: "120,00 €" }),
        ],
        deadlineChronologyKeys: ["2026-08-20"],
      }),
    );
    expect(JSON.stringify(result)).not.toMatch(
      /Documento independiente|Sin importes guardados|Datos fiscales|Solo ficha|Ficha pendiente/u,
    );
    expect(ready([JUNE]).groups[0]?.summaries[0]?.amounts).toEqual([]);

    const literalTitle = document(
      "document:literal-title",
      "Requerimiento de pago en vía ejecutiva",
      "2026-01-09",
      "2026-07-20T08:00:00.000Z",
      { documentSubtype: "collection.enforcement_order" },
    );
    expect(ready([literalTitle]).groups[0]?.summaries[0]).toEqual(
      expect.objectContaining({
        eyebrowLabel: "Providencia de apremio",
        title: "Requerimiento de pago en vía ejecutiva",
      }),
    );
  });

  it("depura tokens internos de referencias, coincidencias y textos mostrables", () => {
    const polluted = document(
      "document:polluted",
      "EXACT_TITLE_AND_AUTHORITY",
      "2026-01-10",
      "2026-07-20T08:00:00.000Z",
      {
        documentSubtype: "collection.enforcement_order",
        authority: "EXPLANATION:internal.authority",
        references: [
          {
            label: "Número de expediente",
            value: "INTEGER:APPEARANCE_DURATION:15",
          },
        ],
      },
    );
    const related = document(
      "document:related-safe",
      "Acto relacionado sintético",
      "2026-02-10",
      "2026-07-20T08:01:00.000Z",
    );
    const pollutedRelation: StructuredReviewRelationEntryV1 = {
      ...relation(polluted, related, "POSSIBLY_RELATED"),
      title: "EXACT_INTERNAL_RELATION",
      explanation: "EXPLANATION:internal.relation",
      matches: [
        {
          label: "Número de expediente",
          value: "BOOLEAN:PROVES_UNDERLYING_ACT_CONTENT:FALSE",
          issuer: "EXACT_INTERNAL_ISSUER",
          matchMode: "EXACT_PRINTED",
          sourcePageNumbers: [1],
          targetPageNumbers: [1],
        },
      ],
    };

    const result = ready(
      [polluted, related],
      relations([polluted, related], [pollutedRelation]),
    );
    const group = result.groups[0]!;
    const summary = group.summaries.find((item) => item.key === polluted.key)!;

    expect(summary.primaryReference).toBeNull();
    expect(summary.authority).toBe("Organismo no identificado");
    expect(group.links[0]).toMatchObject({
      label: "Relación documental",
      explanation:
        "Consulta los documentos y el identificador coincidente antes de interpretar este vínculo.",
      matches: [],
    });
    expect(JSON.stringify({ summaries: group.summaries, links: group.links })).not.toMatch(
      /EXACT_|INTEGER:|BOOLEAN:|EXPLANATION:|_DURATION|_CONTENT/u,
    );
  });

  it.each([
    {
      name: "requerimiento a sanción",
      families: [
        "compliance.formal_filing_requirement",
        "sanction.initiation_and_hearing",
      ],
      relationTypes: ["CONTINUES"],
    },
    {
      name: "propuesta a liquidación",
      families: [
        "assessment.allegations_and_proposal",
        "assessment.final_provisional_assessment",
      ],
      relationTypes: ["RESOLVES"],
    },
    {
      name: "aplazamiento, cuotas e incumplimiento",
      families: [
        "collection.deferral_request_receipt",
        "collection.deferral_grant",
        "collection.deferral_breach",
      ],
      relationTypes: ["CREATES_PAYMENT_PLAN_FOR", "CLAIMS_UNPAID_INSTALLMENT"],
    },
    {
      name: "devolución, compensación y pago",
      families: [
        "refund.request_or_recognition",
        "collection.offset_resolution",
        "refund.payment_communication",
      ],
      relationTypes: ["COMPENSATES", "PAYS_REFUND"],
    },
    {
      name: "apremio, embargo, ingreso y levantamiento",
      families: [
        "collection.enforcement_order",
        "seizure.commercial_credits",
        "seizure.third_party_payment",
        "seizure.release",
      ],
      relationTypes: [
        "ENFORCES",
        "TRANSFERS_SEIZED_FUNDS",
        "RELEASES_SEIZURE",
      ],
    },
  ] satisfies readonly {
    readonly name: string;
    readonly families: readonly string[];
    readonly relationTypes: readonly DocumentRelationType[];
  }[])("mantiene la cadena sintética $name como una fila cronológica", ({ name, families, relationTypes }) => {
    const documents = families.map((family, index) =>
      document(
        `document:chain:${name}:${index}`,
        `Acto sintético ${index + 1}`,
        `2026-${String(index + 1).padStart(2, "0")}-10`,
        `2026-07-20T08:${String(index).padStart(2, "0")}:00.000Z`,
        { documentSubtype: family },
      ),
    );
    const entries = relationTypes.map((relationType, index) =>
      relation(documents[index + 1]!, documents[index]!, relationType),
    );
    const result = ready(
      [...documents].reverse(),
      relations(documents, entries),
    );

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]?.documents.map((item) => item.key)).toEqual(
      documents.map((item) => item.key),
    );
    expect(result.groups[0]?.links.map((item) => item.relationType)).toEqual(
      relationTypes,
    );
    expect(new Set(result.groups[0]?.documents.map((item) => item.key)).size).toBe(
      documents.length,
    );
  });

  it("mantiene una cadena de cinco documentos en una fila, inserta el antiguo a la izquierda y deja el que no tiene fecha al final", () => {
    const payment = document(
      "document:payment",
      "Ingreso del tercero",
      "2026-04-10",
      "2026-07-20T08:00:00.000Z",
      { documentSubtype: "seizure.third_party_payment" },
    );
    const chain = [JANUARY, MARCH, payment, APRIL, UNDATED];
    const links = [
      relation(MARCH, JANUARY, "ENFORCES"),
      relation(payment, MARCH, "TRANSFERS_SEIZED_FUNDS"),
      relation(APRIL, MARCH, "RELEASES_SEIZURE"),
      relation(UNDATED, APRIL, "CONTINUES", "SUGGESTED"),
    ];
    const result = ready(
      [MARCH, APRIL, UNDATED, payment, JANUARY],
      relations(chain, links),
    );

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]?.documents.map((item) => item.key)).toEqual(
      chain.map((item) => item.key),
    );
    expect(result.groups[0]).toEqual(
      expect.objectContaining({
        firstDocumentChronologyKey: "2026-01-08T00:00:00.000Z",
        latestDocumentChronologyKey: "2026-04-21T00:00:00.000Z",
        dateRangeLabel: "ENE–ABR 2026",
        hasConfirmedRelation: true,
        hasSuggestedRelation: true,
      }),
    );
    expect(result.groups[0]?.summaries.at(-1)?.documentDateLabel).toBe(
      "Fecha pendiente",
    );
    expect(Object.isFrozen(result.groups[0]?.summaries)).toBe(true);
  });

  it("deja un documento sin fecha al final aunque una cronología heredada lo coloque primero", () => {
    const edge = relation(UNDATED, JANUARY, "CONTINUES");
    const relationViewModel = relations([JANUARY, UNDATED], [edge]);
    expect(relationViewModel.status).toBe("READY");
    if (relationViewModel.status !== "READY") return;
    const hostileTimeline: StructuredReviewRelationsViewModelV1 = {
      ...relationViewModel,
      timelines: [
        {
          ...relationViewModel.timelines[0]!,
          steps: [
            {
              id: UNDATED.key,
              title: UNDATED.title,
              createdAt: UNDATED.createdAt,
              position: 1,
            },
            {
              id: JANUARY.key,
              title: JANUARY.title,
              createdAt: JANUARY.createdAt,
              position: 2,
            },
          ],
        },
      ],
    };

    expect(
      ready([UNDATED, JANUARY], hostileTimeline).groups[0]?.documents.map(
        (item) => item.key,
      ),
    ).toEqual([JANUARY.key, UNDATED.key]);
  });

  it("mueve cada expediente como una unidad al ordenar por primer documento, último documento y más antiguo", () => {
    const longCaseStart = document(
      "document:long:start",
      "Propuesta antigua",
      "2022-02-01",
      "2026-07-20T08:00:00.000Z",
    );
    const longCaseEnd = document(
      "document:long:end",
      "Resolución reciente",
      "2026-05-01",
      "2026-07-20T08:01:00.000Z",
    );
    const middle = document(
      "document:middle",
      "Documento de 2025",
      "2025-06-01",
      "2026-07-20T08:02:00.000Z",
      {
        reviewStatus: "REVIEWED",
        reviewLabel: "Revisión completada",
      },
    );
    const result = ready(
      [middle, longCaseEnd, longCaseStart],
      relations(
        [longCaseStart, longCaseEnd],
        [relation(longCaseStart, longCaseEnd, "RESOLVES")],
      ),
    );

    const byFirst = filterAndSortFiscalNotificationDocumentLibraryGroupsV1({
      groups: result.groups,
      filters: filters(),
      order: "FIRST_DOCUMENT",
      today: "2026-01-01",
    });
    const byLast = filterAndSortFiscalNotificationDocumentLibraryGroupsV1({
      groups: result.groups,
      filters: filters(),
      order: "LAST_DOCUMENT",
      today: "2026-01-01",
    });
    const oldest = filterAndSortFiscalNotificationDocumentLibraryGroupsV1({
      groups: result.groups,
      filters: filters(),
      order: "OLDEST",
      today: "2026-01-01",
    });
    const newest = filterAndSortFiscalNotificationDocumentLibraryGroupsV1({
      groups: result.groups,
      filters: filters(),
      order: "NEWEST",
      today: "2026-01-01",
    });
    const pendingFirst = filterAndSortFiscalNotificationDocumentLibraryGroupsV1({
      groups: result.groups,
      filters: filters(),
      order: "PENDING_REVIEW",
      today: "2026-01-01",
    });

    expect(byFirst[0]?.documents.map((item) => item.key)).toEqual([middle.key]);
    expect(byLast[0]?.documents.map((item) => item.key)).toEqual([
      longCaseStart.key,
      longCaseEnd.key,
    ]);
    expect(oldest[0]?.documents.map((item) => item.key)).toEqual([
      longCaseStart.key,
      longCaseEnd.key,
    ]);
    expect(newest[0]?.documents.map((item) => item.key)).toEqual([
      longCaseStart.key,
      longCaseEnd.key,
    ]);
    expect(pendingFirst[0]?.documents.map((item) => item.key)).toEqual([
      longCaseStart.key,
      longCaseEnd.key,
    ]);
    expect(byLast.flatMap((group) => group.documents)).toHaveLength(3);
  });

  it("ordena por el próximo vencimiento observado y deja filas sin vencimiento al final", () => {
    const laterDeadline = document(
      "document:later-deadline",
      "Cuota posterior",
      "2026-05-01",
      "2026-07-20T08:00:00.000Z",
      {
        orderedFacts: [
          {
            key: "fact:deadline:later",
            semantic: "DATE",
            label: "Vencimiento de la cuota",
            value: "2026-10-01",
            pageNumber: 1,
            sourceReference: null,
          },
        ],
      },
    );
    const result = ready([JUNE, laterDeadline, JANUARY]);
    const ordered = filterAndSortFiscalNotificationDocumentLibraryGroupsV1({
      groups: result.groups,
      filters: filters(),
      order: "NEXT_DEADLINE",
      today: "2026-07-20",
    });

    expect(ordered.map((group) => group.documents[0]?.key)).toEqual([
      JANUARY.key,
      laterDeadline.key,
      JUNE.key,
    ]);
  });

  it("busca por título, familia, organismo, expediente, referencia, modelo y periodo sin separar la fila", () => {
    const result = ready(
      [JANUARY, MARCH, JUNE],
      relations(
        [JANUARY, MARCH],
        [relation(JANUARY, MARCH, "ENFORCES")],
      ),
    );
    const relatedGroup = result.groups.find((group) => group.documents.length === 2)!;
    for (const query of [
      relatedGroup.summaries[0]!.title,
      relatedGroup.summaries[0]!.familyLabel,
      "Agencia Estatal de Administración Tributaria",
      "EXP-SYNTH-001",
      "LQ-SYNTH-001",
      "modelo 100",
      "periodo 2025 / 4T",
    ]) {
      const found = filterAndSortFiscalNotificationDocumentLibraryGroupsV1({
        groups: result.groups,
        filters: filters({ query }),
        order: "FIRST_DOCUMENT",
        today: "2026-07-20",
      });
      expect(found).toHaveLength(1);
      expect(found[0]?.documents.map((item) => item.key)).toEqual([
        JANUARY.key,
        MARCH.key,
      ]);
    }
  });

  it("aplica filtros de familia, organismo, año, periodo, revisión, relaciones, original y vencimiento a la fila completa", () => {
    const archived = document(
      "document:archived",
      "Documento archivado",
      "2025-12-01",
      "2026-07-20T08:00:00.000Z",
      {
        reviewStatus: "REVIEWED",
        reviewLabel: "Revisión completada",
        originalArchive: {
          status: "ARCHIVED_VERIFIED",
          driveFileId: "drive-file-synthetic",
          sourceSha256: "a".repeat(64),
          documentIds: ["document:archived"],
          archivedAt: "2026-07-20T08:00:00.000Z",
        },
      },
    );
    const result = ready(
      [JANUARY, MARCH, archived],
      relations(
        [JANUARY, MARCH],
        [relation(JANUARY, MARCH, "ENFORCES")],
      ),
    );
    const checks: Partial<FiscalNotificationDocumentLibraryFiltersV1>[] = [
      { family: result.groups.find((group) => group.documents.length === 2)!.summaries[0]!.familyLabel },
      { authority: JANUARY.authority },
      { year: "2026" },
      { period: "2025 / 4T" },
      { reviewStatus: "PENDING" },
      { relation: "WITH_RELATIONS" },
      { relation: "CONFIRMED" },
      { relation: "WITHOUT_RELATIONS" },
      { original: "UNAVAILABLE" },
      { deadline: "UPCOMING" },
    ];
    for (const check of checks) {
      const found = filterAndSortFiscalNotificationDocumentLibraryGroupsV1({
        groups: result.groups,
        filters: filters(check),
        order: "FIRST_DOCUMENT",
        today: "2026-07-20",
      });
      expect(found.length, JSON.stringify(check)).toBeGreaterThan(0);
    }
    expect(
      filterAndSortFiscalNotificationDocumentLibraryGroupsV1({
        groups: result.groups,
        filters: filters({ original: "DRIVE" }),
        order: "FIRST_DOCUMENT",
        today: "2026-07-20",
      })[0]?.documents.map((item) => item.key),
    ).toEqual([archived.key]);
    expect(
      filterAndSortFiscalNotificationDocumentLibraryGroupsV1({
        groups: result.groups,
        filters: filters({ reviewStatus: "REVIEWED" }),
        order: "FIRST_DOCUMENT",
        today: "2026-07-20",
      })[0]?.documents.map((item) => item.key),
    ).toEqual([archived.key]);
    expect(
      result.groups
        .find((group) => group.documents[0]?.key === archived.key)
        ?.summaries[0],
    ).toMatchObject({
      originalStatus: "DRIVE",
      reviewStatus: "REVIEWED",
    });
  });

  it("distingue vínculos confirmados y sugeridos y no relaciona documentos por compartir importe", () => {
    const suggested = relation(APRIL, MARCH, "CONTINUES", "SUGGESTED");
    const connected = ready(
      [JANUARY, MARCH, APRIL],
      relations(
        [JANUARY, MARCH, APRIL],
        [relation(MARCH, JANUARY, "ENFORCES"), suggested],
      ),
    );
    expect(connected.groups[0]?.links.map((item) => item.visualStatus)).toEqual([
      "CONFIRMED",
      "SUGGESTED",
    ]);
    expect(connected.groups[0]?.links[0]).toEqual(
      expect.objectContaining({
        label: "Embarga",
        visualStatusLabel: "Confirmada por referencia exacta",
        fromDocumentTitle: MARCH.title,
        toDocumentTitle: JANUARY.title,
        directionSource: "DOMAIN_RELATION",
      }),
    );
    expect(
      filterAndSortFiscalNotificationDocumentLibraryGroupsV1({
        groups: connected.groups,
        filters: filters({ relation: "SUGGESTED" }),
        order: "FIRST_DOCUMENT",
        today: "2026-07-20",
      }),
    ).toHaveLength(1);

    const sameAmount = {
      ...JANUARY.money[0]!,
      key: "money:duplicate-value",
    };
    const unrelatedA = document(
      "document:amount:a",
      "Documento A",
      "2026-01-01",
      "2026-07-20T08:00:00.000Z",
      { money: [sameAmount] },
    );
    const unrelatedB = document(
      "document:amount:b",
      "Documento B",
      "2026-02-01",
      "2026-07-20T08:01:00.000Z",
      { money: [{ ...sameAmount, key: "money:duplicate-value-b" }] },
    );
    expect(ready([unrelatedA, unrelatedB]).groups).toHaveLength(2);
  });

  it("elige para cada frontera un vínculo real aunque la relación no una directamente las dos tarjetas adyacentes", () => {
    const links = [
      relation(JANUARY, APRIL, "ENFORCES"),
      relation(JANUARY, MARCH, "CONTINUES"),
    ];
    const result = ready(
      [JANUARY, MARCH, APRIL],
      relations([JANUARY, MARCH, APRIL], links),
    );
    const group = result.groups[0]!;
    expect(relationAtFiscalNotificationDocumentBoundaryV1(group, 0)?.key).toBe(
      links[1]!.key,
    );
    expect(relationAtFiscalNotificationDocumentBoundaryV1(group, 1)?.key).toBe(
      links[0]!.key,
    );
  });

  it("mantiene visible N-1 tras eliminar una ficha y conserva los documentos restantes", () => {
    const result = ready(
      [JANUARY, MARCH, JUNE],
      relations(
        [JANUARY, MARCH],
        [relation(JANUARY, MARCH, "ENFORCES")],
      ),
    );
    expect(result.documents.map((item) => item.key)).toEqual([
      JANUARY.key,
      MARCH.key,
      JUNE.key,
    ]);
    expect(result.groups.flatMap((group) => group.documents)).toHaveLength(3);
    expect(result.groups.map((group) => group.documents.map((item) => item.key))).toEqual([
      [JUNE.key],
      [JANUARY.key, MARCH.key],
    ]);
  });

  it("bloquea toda la biblioteca si falla el ownerScope o una relación parcial", () => {
    const blocked: FiscalNotificationDocumentLibraryViewModelV1 =
      composeFiscalNotificationDocumentLibraryV1(
        { status: "BLOCKED", entries: [] },
        { status: "READY", entries: [], timelines: [] },
      );
    expect(blocked).toEqual({ status: "BLOCKED", documents: [], groups: [] });
  });
});
