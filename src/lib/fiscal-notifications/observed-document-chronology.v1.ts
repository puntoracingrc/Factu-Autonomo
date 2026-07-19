import type { BoundedDocumentInput } from "./input-contract";
import {
  parseFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewDocumentV1,
  type FiscalNotificationVerticalSliceReviewFieldV1,
  type FiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";

export const OBSERVED_DOCUMENT_CHRONOLOGY_VERSION_V1 =
  "observed-document-chronology.2026-07-19.v1" as const;

export interface ObservedDocumentChronologyDateV1 {
  readonly canonicalType: "SIGNING_DATE";
  readonly valueIso: string;
  readonly pageNumber: number;
}

const SIGNING_MARKERS = Object.freeze([
  "DOCUMENTO FIRMADO ELECTRONICAMENTE",
  "FIRMADO ELECTRONICAMENTE",
  "FIRMA DE ESTE DOCUMENTO",
  "SIGNAT ELECTRONICAMENT",
]);

const EXPLICIT_SIGNING_DATE_LABEL =
  /(?:FECHA(?: Y HORA)? DE (?:LA )?FIRMA|(?:DOCUMENTO )?FIRMADO ELECTRONICAMENTE (?:EL|EN FECHA)|SIGNAT ELECTRONICAMENT (?:EL|EN DATA))/u;

const SPANISH_MONTHS: Readonly<Record<string, number>> = Object.freeze({
  ENERO: 1,
  FEBRERO: 2,
  MARZO: 3,
  ABRIL: 4,
  MAYO: 5,
  JUNIO: 6,
  JULIO: 7,
  AGOSTO: 8,
  SEPTIEMBRE: 9,
  SETIEMBRE: 9,
  OCTUBRE: 10,
  NOVIEMBRE: 11,
  DICIEMBRE: 12,
});

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleUpperCase("es-ES");
}

function validDate(year: number, month: number, day: number): string | null {
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year &&
    value.getUTCMonth() === month - 1 &&
    value.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : null;
}

function observedDates(raw: string): readonly string[] {
  const value = normalize(raw);
  const dates = new Set<string>();
  for (const match of value.matchAll(
    /(?:^|\D)((?:19|20)\d{2})-(\d{1,2})-(\d{1,2})(?=\D|$)/gu,
  )) {
    const date = validDate(Number(match[1]), Number(match[2]), Number(match[3]));
    if (date) dates.add(date);
  }
  for (const match of value.matchAll(
    /(?:^|\D)(\d{1,2})[./-](\d{1,2})[./-]((?:19|20)\d{2})(?=\D|$)/gu,
  )) {
    const date = validDate(Number(match[3]), Number(match[2]), Number(match[1]));
    if (date) dates.add(date);
  }
  for (const match of value.matchAll(
    /(?:^|\D)(\d{1,2})\s+DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+DE\s+((?:19|20)\d{2})(?=\D|$)/gu,
  )) {
    const date = validDate(
      Number(match[3]),
      SPANISH_MONTHS[match[2]!]!,
      Number(match[1]),
    );
    if (date) dates.add(date);
  }
  return Object.freeze([...dates]);
}

export function extractObservedDocumentChronologyV1(
  document: BoundedDocumentInput,
): readonly ObservedDocumentChronologyDateV1[] {
  const result: ObservedDocumentChronologyDateV1[] = [];
  const seen = new Set<string>();
  for (const page of document.pages) {
    const lines = page.text
      .split(/\r?\n/gu)
      .map((raw) => Object.freeze({ raw, normalized: normalize(raw) }));
    for (let markerIndex = 0; markerIndex < lines.length; markerIndex += 1) {
      const marker = lines[markerIndex]!;
      if (
        !SIGNING_MARKERS.some((value) => marker.normalized.includes(value))
      ) {
        continue;
      }
      const candidates = lines
        .slice(Math.max(0, markerIndex - 1), markerIndex + 3)
        .flatMap((line, windowIndex) => {
          const offset =
            Math.max(0, markerIndex - 1) + windowIndex - markerIndex;
          if (!EXPLICIT_SIGNING_DATE_LABEL.test(line.normalized)) {
            return [];
          }
          return observedDates(line.raw).map((valueIso) => ({
            valueIso,
            distance: Math.abs(offset),
            beforeMarker: offset < 0 ? 1 : 0,
          }));
        })
        .sort(
          (left, right) =>
            left.distance - right.distance ||
            left.beforeMarker - right.beforeMarker ||
            left.valueIso.localeCompare(right.valueIso),
        );
      const selected = candidates[0];
      if (!selected) continue;
      const key = `${page.pageNumber}:${selected.valueIso}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(
        Object.freeze({
          canonicalType: "SIGNING_DATE" as const,
          valueIso: selected.valueIso,
          pageNumber: page.pageNumber,
        }),
      );
    }
  }
  return Object.freeze(result);
}

function containingDocumentIndex(
  documents: readonly FiscalNotificationVerticalSliceReviewDocumentV1[],
  pageNumber: number,
): number {
  return documents
    .map((document, index) => ({
      index,
      document,
      span: document.pageTo - document.pageFrom,
    }))
    .filter(
      ({ document }) =>
        document.pageFrom <= pageNumber && pageNumber <= document.pageTo,
    )
    .sort(
      (left, right) =>
        left.span - right.span ||
        left.document.pageFrom - right.document.pageFrom ||
        left.document.reviewDocumentId.localeCompare(
          right.document.reviewDocumentId,
        ),
    )[0]?.index ?? -1;
}

function chronologyField(
  observation: ObservedDocumentChronologyDateV1,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  const [year, month, day] = observation.valueIso.split("-");
  return Object.freeze({
    fieldId: `observed-chronology:signing:${observation.pageNumber}:${observation.valueIso}`,
    semantic: "DATE" as const,
    canonicalType: observation.canonicalType,
    label: "Fecha de firma",
    displayValue: `${day}/${month}/${year}`,
    normalizedValue: observation.valueIso,
    amountCents: null,
    currency: null,
    sourcePageNumbers: Object.freeze([observation.pageNumber]),
    sourceLabel: "Fecha de firma",
    confidence: 1,
    reviewStatus: "REVIEW_REQUIRED" as const,
  });
}

export function appendObservedDocumentChronologyV1(
  review: FiscalNotificationVerticalSliceReviewV1,
  documentInput: BoundedDocumentInput,
): FiscalNotificationVerticalSliceReviewV1 {
  const observations = extractObservedDocumentChronologyV1(documentInput);
  if (observations.length === 0 || review.documents.length === 0) return review;
  const documents = [...review.documents];
  let changed = false;
  for (const observation of observations) {
    const index = containingDocumentIndex(documents, observation.pageNumber);
    if (index < 0) continue;
    const document = documents[index]!;
    if (
      document.fields.some(
        (field) =>
          field.semantic === "DATE" &&
          field.canonicalType === observation.canonicalType &&
          field.normalizedValue === observation.valueIso,
      )
    ) {
      continue;
    }
    documents[index] = Object.freeze({
      ...document,
      fields: Object.freeze([
        ...document.fields,
        chronologyField(observation),
      ]),
    });
    changed = true;
  }
  if (!changed) return review;
  return parseFiscalNotificationVerticalSliceReviewV1({
    ...review,
    documents: Object.freeze(documents),
  });
}
