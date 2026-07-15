import { describe, expect, it } from "vitest";
import {
  composeFiscalNotificationDocumentLibraryV1,
  type FiscalNotificationDocumentLibraryViewModelV1,
} from "./structured-review-document-library.v1";
import type { FiscalNotificationStructuredHistoryEntryV1 } from "./structured-review-history-view-model.v1";
import type { StructuredReviewRelationsViewModelV1 } from "./structured-review-relations-view-model.v1";

function document(
  id: string,
  title: string,
  documentDate: string,
  createdAt: string,
): FiscalNotificationStructuredHistoryEntryV1 {
  return Object.freeze({
    key: id,
    title,
    authority: "Agencia Estatal de Administración Tributaria",
    documentDate,
    createdAt,
    pageCount: 2,
    byteLength: 2_048,
    subjectName: null,
    subjectTaxId: null,
    references: Object.freeze([]),
    printedDates: Object.freeze([]),
    money: Object.freeze([]),
    installments: Object.freeze([]),
    authenticityLabel: "Autenticidad no comprobada",
    reviewLabel: "Datos extraídos · revisa antes de actuar",
    sourceContentRetention: "NOT_RETAINED",
    originalArchive: null,
  });
}

const JANUARY = document(
  "document:january",
  "Providencia de apremio",
  "2026-01-08",
  "2026-07-15T08:00:00.000Z",
);
const MARCH = document(
  "document:march",
  "Diligencia de embargo",
  "2026-03-04",
  "2026-07-13T08:00:00.000Z",
);
const APRIL = document(
  "document:april",
  "Levantamiento de embargo",
  "2026-04-21",
  "2026-07-14T08:00:00.000Z",
);
const JUNE = document(
  "document:june",
  "Requerimiento independiente",
  "2026-06-03",
  "2026-07-12T08:00:00.000Z",
);

function relations(): StructuredReviewRelationsViewModelV1 {
  return {
    status: "READY",
    entries: [
      {
        key: "relation:march-january",
        relationType: "ENFORCES",
        title: "Embargo vinculado a providencia de apremio",
        statusLabel: "Referencia exacta · revisar efectos",
        documents: [
          { id: MARCH.key, title: MARCH.title, createdAt: MARCH.createdAt },
          {
            id: JANUARY.key,
            title: JANUARY.title,
            createdAt: JANUARY.createdAt,
          },
        ],
        matches: [],
        explanation: "La diligencia cita la providencia exacta.",
        requiresHumanReview: true,
      },
      {
        key: "relation:april-march",
        relationType: "RELEASES_SEIZURE",
        title: "Levantamiento vinculado a diligencia de embargo",
        statusLabel: "Referencia exacta · revisar efectos",
        documents: [
          { id: APRIL.key, title: APRIL.title, createdAt: APRIL.createdAt },
          { id: MARCH.key, title: MARCH.title, createdAt: MARCH.createdAt },
        ],
        matches: [],
        explanation: "El levantamiento cita la diligencia exacta.",
        requiresHumanReview: true,
      },
    ],
    timelines: [
      {
        key: "timeline:case",
        title: "Expediente relacionado · 3 documentos",
        statusLabel: "Referencias exactas · efectos por revisar",
        steps: [JANUARY, MARCH, APRIL].map((item, index) => ({
          id: item.key,
          title: item.title,
          createdAt: item.createdAt,
          position: index + 1,
        })),
        links: [
          {
            key: "relation:march-january",
            earlierDocumentId: JANUARY.key,
            laterDocumentId: MARCH.key,
            label: "Ejecución mediante embargo",
            explanation: "La diligencia cita la providencia exacta.",
          },
          {
            key: "relation:april-march",
            earlierDocumentId: MARCH.key,
            laterDocumentId: APRIL.key,
            label: "Levantamiento de la diligencia",
            explanation: "El levantamiento cita la diligencia exacta.",
          },
        ],
        requiresHumanReview: true,
      },
    ],
  };
}

describe("structured review document library v1", () => {
  it("mantiene toda la cadena en una fila y coloca a la izquierda un documento anterior escaneado después", () => {
    const result = composeFiscalNotificationDocumentLibraryV1(
      { status: "READY", entries: [MARCH, APRIL, JANUARY, JUNE] },
      relations(),
    );

    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0]?.documents.map((item) => item.key)).toEqual([
      JUNE.key,
    ]);
    expect(result.groups[1]?.documents.map((item) => item.key)).toEqual([
      JANUARY.key,
      MARCH.key,
      APRIL.key,
    ]);
    expect(result.groups[1]).toEqual(
      expect.objectContaining({
        firstDocumentChronologyKey: "2026-01-08T00:00:00.000Z",
        latestDocumentChronologyKey: "2026-04-21T00:00:00.000Z",
      }),
    );
    expect(result.groups[1]?.links.map((item) => item.label)).toEqual([
      "Ejecución mediante embargo",
      "Levantamiento de la diligencia",
    ]);
    expect(Object.isFrozen(result.groups[1]?.documents)).toBe(true);
  });

  it("expone ambas fechas documentales de fila para ordenar por inicio o último documento sin usar la carga", () => {
    const result = composeFiscalNotificationDocumentLibraryV1(
      { status: "READY", entries: [APRIL, JANUARY, MARCH] },
      relations(),
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: "READY",
        groups: [
          expect.objectContaining({
            firstDocumentChronologyKey: "2026-01-08T00:00:00.000Z",
            latestDocumentChronologyKey: "2026-04-21T00:00:00.000Z",
          }),
        ],
      }),
    );
    expect(JSON.stringify(result)).not.toContain("latestReceivedAt");
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
