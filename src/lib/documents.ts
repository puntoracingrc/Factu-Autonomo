import {
  formatDocumentNumberWithSettings,
  getMaxSequenceWithSettings,
  normalizeNumbering,
  parseDocumentNumberForKind,
  parseLegacyDocumentNumber,
} from "./numbering";
import type { AppData, Document, DocumentKind, DocumentType, NumberingSettings } from "./types";
import { isRectificativa } from "./rectificativas";

const KIND_TO_TYPE: Record<DocumentKind, DocumentType> = {
  factura: "factura",
  factura_rectificativa: "factura",
  presupuesto: "presupuesto",
  recibo: "recibo",
};

export type { DocumentKind };

export function getDocumentKind(doc: Document): DocumentKind {
  if (isRectificativa(doc)) return "factura_rectificativa";
  return doc.type;
}

export function formatDocumentNumber(
  kind: DocumentKind,
  year: number,
  sequence: number,
  numbering?: NumberingSettings,
): string {
  return formatDocumentNumberWithSettings(
    kind,
    year,
    sequence,
    normalizeNumbering(numbering),
  );
}

export function parseDocumentNumber(
  number: string,
  numbering?: NumberingSettings,
): { kind: DocumentKind; year: number; sequence: number } | null {
  const settings = normalizeNumbering(numbering);
  const kinds: DocumentKind[] = [
    "factura_rectificativa",
    "factura",
    "presupuesto",
    "recibo",
  ];

  for (const kind of kinds) {
    const parsed = parseDocumentNumberForKind(number, kind, settings);
    if (!parsed) continue;
    return {
      kind,
      year: parsed.year ?? settings.year,
      sequence: parsed.sequence,
    };
  }

  return null;
}

export function getDocumentYear(
  doc: Document,
  numbering?: NumberingSettings,
): number {
  const kind = getDocumentKind(doc);
  const settings = normalizeNumbering(numbering);
  const parsed = parseDocumentNumberForKind(doc.number, kind, settings);
  if (parsed?.year) return parsed.year;
  return new Date(doc.date).getFullYear();
}

export function getMaxSequence(
  documents: Document[],
  kind: DocumentKind,
  year: number,
  numbering?: NumberingSettings,
): number {
  return getMaxSequenceWithSettings(
    documents,
    kind,
    year,
    normalizeNumbering(numbering),
  );
}

export function nextDocumentSequence(
  documents: Document[],
  kind: DocumentKind,
  year: number,
  configuredLast = 0,
  numbering?: NumberingSettings,
): number {
  const fromDocs = getMaxSequence(documents, kind, year, numbering);
  return Math.max(fromDocs, configuredLast) + 1;
}

export function assignNextDocumentNumber(
  documents: Document[],
  kind: DocumentKind,
  year: number,
  configuredLast = 0,
  numbering?: NumberingSettings,
): { number: string; sequence: number } {
  const settings = normalizeNumbering(numbering);
  const sequence = nextDocumentSequence(
    documents,
    kind,
    year,
    configuredLast,
    settings,
  );
  return {
    sequence,
    number: formatDocumentNumber(kind, year, sequence, settings),
  };
}

/** Compatibilidad con tipo DocumentType (sin rectificativas) */
export function assignNextDocumentNumberByType(
  documents: Document[],
  type: DocumentType,
  year: number,
  configuredLast = 0,
  numbering?: NumberingSettings,
): { number: string; sequence: number } {
  const kind: DocumentKind =
    type === "factura"
      ? "factura"
      : type === "presupuesto"
        ? "presupuesto"
        : "recibo";
  return assignNextDocumentNumber(
    documents,
    kind,
    year,
    configuredLast,
    numbering,
  );
}

export function renumberDocumentsForKindYear(
  documents: Document[],
  kind: DocumentKind,
  year: number,
  numbering?: NumberingSettings,
): Document[] {
  const settings = normalizeNumbering(numbering);
  const templateHasYear = settings.formats[kind].template.includes("{year}");

  const ofKindYear = documents
    .filter((d) => {
      if (getDocumentKind(d) !== kind) return false;
      const parsed = parseDocumentNumberForKind(d.number, kind, settings);
      if (!parsed) return false;
      const docYear = templateHasYear
        ? (parsed.year ?? new Date(d.date).getFullYear())
        : new Date(d.date).getFullYear();
      return docYear === year;
    })
    .sort((a, b) => {
      const pa =
        parseDocumentNumberForKind(a.number, kind, settings)?.sequence ?? 0;
      const pb =
        parseDocumentNumberForKind(b.number, kind, settings)?.sequence ?? 0;
      return pa - pb;
    });

  const renumbered = new Map(
    ofKindYear.map((doc, index) => [
      doc.id,
      formatDocumentNumber(kind, year, index + 1, settings),
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
  numbering?: NumberingSettings,
): Document[] {
  const kind: DocumentKind =
    type === "factura"
      ? "factura"
      : type === "presupuesto"
        ? "presupuesto"
        : "recibo";
  return renumberDocumentsForKindYear(documents, kind, year, numbering);
}

export function countersFromDocuments(
  documents: Document[],
  year = new Date().getFullYear(),
  numbering?: NumberingSettings,
): AppData["counters"] {
  const settings = normalizeNumbering(numbering);
  return {
    factura: getMaxSequence(documents, "factura", year, settings),
    factura_rectificativa: getMaxSequence(
      documents,
      "factura_rectificativa",
      year,
      settings,
    ),
    presupuesto: getMaxSequence(documents, "presupuesto", year, settings),
    recibo: getMaxSequence(documents, "recibo", year, settings),
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

export function isDocumentEditable(doc: Document): boolean {
  if (isRectificativa(doc) || doc.rectifiedById) return false;
  return doc.status === "borrador";
}

export function getDocumentReadOnlyMessage(doc: Document): string {
  if (doc.rectification) {
    return "Las facturas rectificativas no se editan. Compártela por email o WhatsApp, o descárgala en PDF.";
  }
  if (doc.rectifiedById) {
    return "Esta factura ya fue rectificada o anulada y no se puede modificar.";
  }

  if (doc.type === "factura" && doc.status !== "borrador") {
    return "Las facturas emitidas no se editan ni se borran. Compártelas por email o WhatsApp, o rectifícalas (anulación o corrección) desde el listado.";
  }
  if (doc.type === "presupuesto" && doc.status !== "borrador") {
    return "Este presupuesto ya no está en borrador. Compártelo por email o WhatsApp, o descárgalo en PDF.";
  }
  if (doc.type === "recibo" && doc.status !== "borrador") {
    return "Este recibo ya fue emitido. Compártelo por email o WhatsApp, o descárgalo en PDF.";
  }

  return "Este documento no se puede editar.";
}

export { KIND_TO_TYPE, parseLegacyDocumentNumber };
