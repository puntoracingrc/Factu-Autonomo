import { formatMoney } from "./calculations";
import { formatClientAddressLine } from "./customer-address";
import {
  formatDocumentNumberWithSettings,
  getMaxSequenceWithSettings,
  normalizeNumbering,
  parseDocumentNumberForKind,
  parseLegacyDocumentNumber,
} from "./numbering";
import { isDocumentIntegrityLocked } from "./document-integrity";
import { isUsableLegacyImportedDocument } from "./document-integrity/legacy-import-attestation";
import { canRenumberDocument } from "./document-integrity/deletion";
import { isRectificativa } from "./rectificativas";
import type {
  AppData,
  Document,
  DocumentKind,
  DocumentType,
  NumberingSettings,
} from "./types";
import { documentAmounts } from "./vat-regime";

const KIND_TO_TYPE: Record<DocumentKind, DocumentType> = {
  factura: "factura",
  factura_rectificativa: "factura",
  presupuesto: "presupuesto",
  recibo: "recibo",
};

export const DRAFT_INVOICE_NUMBER = "BORRADOR";

export type { DocumentKind };

export function getDocumentKind(doc: Document): DocumentKind {
  if (isRectificativa(doc)) return "factura_rectificativa";
  return doc.type;
}

export function isDraftInvoiceNumber(
  doc: Pick<Document, "type" | "number">,
): boolean {
  return (
    doc.type === "factura" &&
    doc.number.trim().toUpperCase() === DRAFT_INVOICE_NUMBER
  );
}

export function shouldUseDraftInvoiceNumber(
  doc: Pick<Document, "type" | "status">,
): boolean {
  return doc.type === "factura" && doc.status === "borrador";
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
  const matchingKindYear = documents.filter((d) => {
    if (getDocumentKind(d) !== kind) return false;
    const parsed = parseDocumentNumberForKind(d.number, kind, settings);
    if (!parsed) return false;
    const docYear = templateHasYear
      ? (parsed.year ?? new Date(d.date).getFullYear())
      : new Date(d.date).getFullYear();
    return docYear === year;
  });

  const protectedSequences = new Set(
    matchingKindYear
      .filter((doc) => !canRenumberDocument(doc))
      .map((doc) => parseDocumentNumberForKind(doc.number, kind, settings))
      .filter((parsed): parsed is { sequence: number; year?: number } =>
        Boolean(parsed),
      )
      .map((parsed) => parsed.sequence),
  );
  const protectedFloor =
    protectedSequences.size > 0 ? Math.max(...protectedSequences) : 0;

  const ofKindYear = matchingKindYear
    .filter(canRenumberDocument)
    .sort((a, b) => {
      const pa =
        parseDocumentNumberForKind(a.number, kind, settings)?.sequence ?? 0;
      const pb =
        parseDocumentNumberForKind(b.number, kind, settings)?.sequence ?? 0;
      return pa - pb;
    });

  let nextSequence = protectedFloor + 1;
  const renumbered = new Map<string, string>();

  for (const doc of ofKindYear) {
    while (protectedSequences.has(nextSequence)) nextSequence += 1;
    renumbered.set(
      doc.id,
      formatDocumentNumber(kind, year, nextSequence, settings),
    );
    nextSequence += 1;
  }

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

export function compareDocumentsByNewest(a: Document, b: Document): number {
  const byDate = b.date.localeCompare(a.date);
  if (byDate !== 0) return byDate;

  const parsedA = parseDocumentNumber(a.number);
  const parsedB = parseDocumentNumber(b.number);
  if (
    parsedA &&
    parsedB &&
    parsedA.kind === parsedB.kind &&
    parsedA.year === parsedB.year &&
    parsedA.sequence !== parsedB.sequence
  ) {
    return parsedB.sequence - parsedA.sequence;
  }

  return b.createdAt.localeCompare(a.createdAt);
}

export function sortDocumentsByNewest(documents: Document[]): Document[] {
  return [...documents].sort(compareDocumentsByNewest);
}

type DocumentNumberOrder = {
  hasNumber: boolean;
  year: number;
  sequence: number;
  revision: number;
};

function yearFromDocumentDate(doc: Pick<Document, "date">): number {
  const year = new Date(doc.date).getFullYear();
  return Number.isFinite(year) ? year : 0;
}

function fallbackNumberOrder(
  doc: Pick<Document, "date" | "number">,
): DocumentNumberOrder {
  const matches = Array.from(doc.number.matchAll(/\d+/g));
  const groups = matches.map((match) => Number(match[0]));
  const lastMatch = matches.at(-1);
  const previousMatch = matches.at(-2);
  const lastLooksLikeDecimalRevision =
    Boolean(lastMatch && previousMatch) &&
    lastMatch![0].length <= 2 &&
    previousMatch![0].length >= 3 &&
    doc.number
      .slice(previousMatch!.index! + previousMatch![0].length, lastMatch!.index)
      .includes(".");
  const sequenceMatch = lastLooksLikeDecimalRevision
    ? previousMatch
    : lastMatch;
  const sequenceIndex = sequenceMatch ? matches.indexOf(sequenceMatch) : -1;
  const revision = lastLooksLikeDecimalRevision ? Number(lastMatch![0]) : 0;
  const explicitYear = groups.find((value, index) => {
    return index !== sequenceIndex && value >= 2000 && value <= 2100;
  });

  return {
    hasNumber: sequenceMatch !== undefined,
    year: explicitYear ?? yearFromDocumentDate(doc),
    sequence: sequenceMatch ? Number(sequenceMatch[0]) : 0,
    revision,
  };
}

function documentNumberOrder(doc: Document): DocumentNumberOrder {
  const parsed = parseDocumentNumber(doc.number);
  if (parsed) {
    return {
      hasNumber: true,
      year: parsed.year,
      sequence: parsed.sequence,
      revision: 0,
    };
  }

  return fallbackNumberOrder(doc);
}

export function compareDocumentsByNumberDesc(a: Document, b: Document): number {
  const orderA = documentNumberOrder(a);
  const orderB = documentNumberOrder(b);

  if (orderA.hasNumber !== orderB.hasNumber) {
    return orderA.hasNumber ? -1 : 1;
  }

  if (orderA.year !== orderB.year) {
    return orderB.year - orderA.year;
  }

  if (orderA.sequence !== orderB.sequence) {
    return orderB.sequence - orderA.sequence;
  }

  if (orderA.revision !== orderB.revision) {
    return orderB.revision - orderA.revision;
  }

  const byDate = b.date.localeCompare(a.date);
  if (byDate !== 0) return byDate;

  const byCreatedAt = b.createdAt.localeCompare(a.createdAt);
  if (byCreatedAt !== 0) return byCreatedAt;

  return b.number.localeCompare(a.number, "es", {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortDocumentsByNumberDesc(documents: Document[]): Document[] {
  return [...documents].sort(compareDocumentsByNumberDesc);
}

function normalizeSearchAmount(value: string): string {
  return value.replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".");
}

export function documentSearchHaystack(
  doc: Document,
  vatExempt = false,
): string {
  const total = documentAmounts(doc, vatExempt).total;
  return [
    doc.number,
    doc.rectification?.originalNumber,
    doc.client.name,
    doc.client.firstName,
    doc.client.lastName,
    doc.client.nif,
    formatClientAddressLine(doc.client),
    doc.client.address,
    doc.client.email,
    doc.client.phone,
    formatMoney(total),
    total.toFixed(2),
    String(total),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function documentMatchesQuery(
  doc: Document,
  query: string,
  vatExempt = false,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  if (documentSearchHaystack(doc, vatExempt).includes(q)) {
    return true;
  }

  const queryDigits = q.replace(/\D/g, "");
  const numberDigits = doc.number.replace(/\D/g, "");
  const originalDigits =
    doc.rectification?.originalNumber.replace(/\D/g, "") ?? "";

  if (
    queryDigits.length > 0 &&
    (numberDigits.includes(queryDigits) || originalDigits.includes(queryDigits))
  ) {
    return true;
  }

  if (/\d/.test(q)) {
    const total = documentAmounts(doc, vatExempt).total;
    const normalizedQuery = normalizeSearchAmount(q);
    const queryAmount = Number.parseFloat(normalizedQuery);
    if (!Number.isNaN(queryAmount) && Math.abs(total - queryAmount) < 0.005) {
      return true;
    }

    const totalDigits = normalizeSearchAmount(total.toFixed(2));
    if (
      normalizedQuery.length >= 2 &&
      totalDigits
        .replace(/\D/g, "")
        .includes(normalizedQuery.replace(/\D/g, ""))
    ) {
      return true;
    }
  }

  return false;
}

export function filterDocumentsByQuery(
  documents: Document[],
  query: string,
  options?: { vatExempt?: boolean },
): Document[] {
  const vatExempt = options?.vatExempt ?? false;
  const q = query.trim();
  if (!q) return documents;

  return documents.filter((doc) => documentMatchesQuery(doc, q, vatExempt));
}

export function getFacturasIncludingRectificativas(
  documents: Document[],
): Document[] {
  return documents.filter((d) => d.type === "factura");
}

export function isDocumentEditable(doc: Document): boolean {
  if (isUsableLegacyImportedDocument(doc)) return false;
  if (isRectificativa(doc)) {
    return doc.status === "borrador" && !isDocumentIntegrityLocked(doc);
  }
  if (doc.rectifiedById) return false;
  if (doc.type === "presupuesto") return doc.status !== "anulada";
  return doc.status === "borrador" && !isDocumentIntegrityLocked(doc);
}

export function getDocumentReadOnlyMessage(doc: Document): string {
  if (isUsableLegacyImportedDocument(doc)) {
    return "Este documento es un histórico importado aceptado por ti. Su contenido está congelado: puede usarse en impuestos y rentabilidad, pero no tiene un sello moderno ni un registro Veri*Factu de Factu. Conserva el archivo original.";
  }
  if (doc.rectification) {
    return "Las facturas rectificativas emitidas no se editan. Compártela por email o WhatsApp, descárgala en PDF o rectifícala si hay otro error.";
  }
  if (doc.rectifiedById) {
    return "Esta factura ya fue rectificada o anulada y no se puede modificar.";
  }

  if (doc.type === "factura" && doc.status !== "borrador") {
    return "Las facturas emitidas no se editan ni se borran. Compártelas por email o WhatsApp, o rectifícalas (anulación o corrección) desde el listado.";
  }
  if (doc.type === "presupuesto" && doc.status === "anulada") {
    return "Este presupuesto está anulado. Duplícalo si necesitas preparar una nueva versión.";
  }
  if (doc.type === "recibo" && doc.status !== "borrador") {
    return "Este recibo ya fue emitido. Compártelo por email o WhatsApp, o descárgalo en PDF.";
  }

  return "Este documento no se puede editar.";
}

export { KIND_TO_TYPE, parseLegacyDocumentNumber };
