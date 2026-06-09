import type { AppData, Document, DocumentType } from "./types";
import { isRectificativa } from "./rectificativas";

export type DocumentKind =
  | "factura"
  | "factura_rectificativa"
  | "presupuesto"
  | "recibo";

const PREFIX: Record<DocumentKind, string> = {
  factura: "F",
  factura_rectificativa: "FR",
  presupuesto: "P",
  recibo: "R",
};

const KIND_TO_TYPE: Record<DocumentKind, DocumentType> = {
  factura: "factura",
  factura_rectificativa: "factura",
  presupuesto: "presupuesto",
  recibo: "recibo",
};

export function getDocumentKind(doc: Document): DocumentKind {
  if (isRectificativa(doc)) return "factura_rectificativa";
  return doc.type;
}

export function documentPrefix(kind: DocumentKind): string {
  return PREFIX[kind];
}

export function formatDocumentNumber(
  kind: DocumentKind,
  year: number,
  sequence: number,
): string {
  return `${PREFIX[kind]}-${year}-${String(sequence).padStart(4, "0")}`;
}

export function parseDocumentNumber(
  number: string,
): { kind: DocumentKind; year: number; sequence: number } | null {
  const match = number.match(/^(FR|F|P|R)-(\d{4})-(\d+)$/);
  if (!match) return null;

  const prefix = match[1];
  const kind = (
    Object.entries(PREFIX).find(([, value]) => value === prefix)?.[0] ?? null
  ) as DocumentKind | null;
  if (!kind) return null;

  return {
    kind,
    year: Number(match[2]),
    sequence: Number(match[3]),
  };
}

export function getDocumentYear(doc: Document): number {
  return (
    parseDocumentNumber(doc.number)?.year ??
    new Date(doc.date).getFullYear()
  );
}

export function getMaxSequence(
  documents: Document[],
  kind: DocumentKind,
  year: number,
): number {
  return documents.reduce((max, doc) => {
    if (getDocumentKind(doc) !== kind) return max;
    const parsed = parseDocumentNumber(doc.number);
    if (!parsed || parsed.year !== year || parsed.kind !== kind) return max;
    return Math.max(max, parsed.sequence);
  }, 0);
}

export function nextDocumentSequence(
  documents: Document[],
  kind: DocumentKind,
  year: number,
): number {
  return getMaxSequence(documents, kind, year) + 1;
}

export function assignNextDocumentNumber(
  documents: Document[],
  kind: DocumentKind,
  year: number,
): { number: string; sequence: number } {
  const sequence = nextDocumentSequence(documents, kind, year);
  return {
    sequence,
    number: formatDocumentNumber(kind, year, sequence),
  };
}

/** Compatibilidad con tipo DocumentType (sin rectificativas) */
export function assignNextDocumentNumberByType(
  documents: Document[],
  type: DocumentType,
  year: number,
): { number: string; sequence: number } {
  const kind: DocumentKind =
    type === "factura"
      ? "factura"
      : type === "presupuesto"
        ? "presupuesto"
        : "recibo";
  return assignNextDocumentNumber(documents, kind, year);
}

export function renumberDocumentsForKindYear(
  documents: Document[],
  kind: DocumentKind,
  year: number,
): Document[] {
  const ofKindYear = documents
    .filter((d) => {
      if (getDocumentKind(d) !== kind) return false;
      const parsed = parseDocumentNumber(d.number);
      return parsed?.year === year;
    })
    .sort((a, b) => {
      const pa = parseDocumentNumber(a.number)?.sequence ?? 0;
      const pb = parseDocumentNumber(b.number)?.sequence ?? 0;
      return pa - pb;
    });

  const renumbered = new Map(
    ofKindYear.map((doc, index) => [
      doc.id,
      formatDocumentNumber(kind, year, index + 1),
    ]),
  );

  return documents.map((doc) => {
    const newNumber = renumbered.get(doc.id);
    if (!newNumber) return doc;
    return { ...doc, number: newNumber };
  });
}

export function renumberDocumentsForTypeYear(
  documents: Document[],
  type: DocumentType,
  year: number,
): Document[] {
  const kind: DocumentKind =
    type === "factura"
      ? "factura"
      : type === "presupuesto"
        ? "presupuesto"
        : "recibo";
  return renumberDocumentsForKindYear(documents, kind, year);
}

export function countersFromDocuments(
  documents: Document[],
  year = new Date().getFullYear(),
): AppData["counters"] {
  return {
    factura: getMaxSequence(documents, "factura", year),
    factura_rectificativa: getMaxSequence(
      documents,
      "factura_rectificativa",
      year,
    ),
    presupuesto: getMaxSequence(documents, "presupuesto", year),
    recibo: getMaxSequence(documents, "recibo", year),
  };
}

export function filterDocumentsByQuery(
  documents: Document[],
  query: string,
): Document[] {
  const q = query.trim().toLowerCase();
  if (!q) return documents;

  return documents.filter((doc) => {
    const clientName = doc.client.name.toLowerCase();
    const number = doc.number.toLowerCase();
    const originalNumber = doc.rectification?.originalNumber.toLowerCase() ?? "";
    const numberDigits = doc.number.replace(/\D/g, "");
    const queryDigits = q.replace(/\D/g, "");

    return (
      number.includes(q) ||
      originalNumber.includes(q) ||
      clientName.includes(q) ||
      (queryDigits.length > 0 && numberDigits.includes(queryDigits))
    );
  });
}

export function getFacturasIncludingRectificativas(
  documents: Document[],
): Document[] {
  return documents.filter((d) => d.type === "factura");
}

export { KIND_TO_TYPE };
