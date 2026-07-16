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
import {
  hasLegacyImportProtectionClaim,
  isUsableLegacyImportedDocument,
} from "./document-integrity/legacy-import-attestation";
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

export type InvoiceDocumentNumberSeries = {
  key: string;
  label: string;
  rank: number;
  explicitYear: number;
  hasNumber: boolean;
  sequence: number;
  exactSequence: string;
  revision: number;
  exactRevision: string;
};

type NumericToken = {
  raw: string;
  value: number;
  index: number;
};

function numericTokens(value: string): NumericToken[] {
  return Array.from(value.matchAll(/\d+/g)).map((match) => ({
    raw: match[0],
    value: Number(match[0]),
    index: match.index ?? 0,
  }));
}

function looksLikeFourDigitYear(token: NumericToken): boolean {
  return token.raw.length === 4 && token.value >= 2000 && token.value <= 2100;
}

function exactUnsignedInteger(raw: string | undefined): string {
  if (!raw) return "0";
  return raw.replace(/^0+(?=\d)/, "");
}

function compareExactUnsignedIntegersDesc(a: string, b: string): number {
  if (a.length !== b.length) return b.length - a.length;
  if (a === b) return 0;
  return a < b ? 1 : -1;
}

function configuredPrincipalNumberToken(
  document: Document,
  numbering?: NumberingSettings,
): {
  sequence: NumericToken;
  explicitYear?: NumericToken;
  pattern: string;
} | null {
  const format =
    normalizeNumbering(numbering).formats[getDocumentKind(document)];
  const parts = format.template.split(/(\{year\}|\{num\})/);
  let hasSequenceCapture = false;
  let hasYearCapture = false;
  let regex = "^";

  for (const part of parts) {
    if (part === "{num}") {
      regex += hasSequenceCapture ? "\\k<sequence>" : "(?<sequence>\\d+)";
      hasSequenceCapture = true;
    } else if (part === "{year}") {
      regex += hasYearCapture ? "\\k<year>" : "(?<year>\\d{4})";
      hasYearCapture = true;
    } else {
      regex += part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }

  const match = document.number.match(new RegExp(`${regex}$`));
  if (!match) return null;

  let cursor = 0;
  const sequenceRaw = match.groups?.sequence;
  const yearRaw = match.groups?.year;
  if (!sequenceRaw) return null;

  let sequence: NumericToken | undefined;
  let explicitYear: NumericToken | undefined;
  for (const part of parts) {
    if (part !== "{num}" && part !== "{year}") {
      cursor += part.length;
      continue;
    }

    const raw = part === "{num}" ? sequenceRaw : (yearRaw ?? "");
    const token = { raw, value: Number(raw), index: cursor };
    if (part === "{num}" && !sequence) sequence = token;
    if (part === "{year}" && !explicitYear) explicitYear = token;
    cursor += raw.length;
  }

  return sequence
    ? {
        sequence,
        explicitYear,
        pattern: format.template
          .replaceAll("{year}", yearRaw ?? "")
          .replaceAll("{num}", "…"),
      }
    : null;
}

function principalNumberToken(
  document: Document,
  numbering?: NumberingSettings,
): {
  sequence?: NumericToken;
  revision?: NumericToken;
  explicitYear?: NumericToken;
  pattern?: string;
} {
  const configured = configuredPrincipalNumberToken(document, numbering);
  if (configured) return configured;

  const tokens = numericTokens(document.number);
  const canonical = parseDocumentNumber(document.number);
  if (canonical) {
    const sequence = [...tokens]
      .reverse()
      .find((token) => token.value === canonical.sequence);
    const explicitYear = tokens.find(
      (token) => token !== sequence && token.value === canonical.year,
    );
    return {
      sequence,
      explicitYear,
    };
  }

  const lastToken = tokens.at(-1);
  const beforeLastToken = tokens.at(-2);
  const beforePreviousCharacter = beforeLastToken
    ? document.number.slice(0, beforeLastToken.index).at(-1)
    : undefined;
  const betweenLastTokens =
    beforeLastToken && lastToken
      ? document.number.slice(
          beforeLastToken.index + beforeLastToken.raw.length,
          lastToken.index,
        )
      : "";
  const previousLooksEmbeddedInPrefix = Boolean(
    beforePreviousCharacter && /[\p{L}]/u.test(beforePreviousCharacter),
  );
  const suffixYear =
    lastToken &&
    beforeLastToken &&
    looksLikeFourDigitYear(lastToken) &&
    (!previousLooksEmbeddedInPrefix ||
      beforeLastToken.raw.length >= 3 ||
      /[-/]/.test(betweenLastTokens))
      ? lastToken
      : undefined;
  const withoutSuffixYear = suffixYear
    ? tokens.filter((token) => token !== suffixYear)
    : tokens;
  const revisionCandidate = withoutSuffixYear.at(-1);
  const sequenceBeforeRevision = withoutSuffixYear.at(-2);
  const decimalRevision = Boolean(
    revisionCandidate &&
    sequenceBeforeRevision &&
    document.number
      .slice(
        sequenceBeforeRevision.index + sequenceBeforeRevision.raw.length,
        revisionCandidate.index,
      )
      .trim() === ".",
  );
  const revision = decimalRevision ? revisionCandidate : undefined;
  const withoutRevision = revision
    ? withoutSuffixYear.filter((token) => token !== revision)
    : withoutSuffixYear;
  const lastBaseToken = withoutRevision.at(-1);
  const prefixYear = withoutRevision.find(
    (token) => token !== lastBaseToken && looksLikeFourDigitYear(token),
  );
  const explicitYear = prefixYear ?? suffixYear;
  const sequence = (
    prefixYear
      ? withoutRevision.filter((token) => token !== prefixYear)
      : withoutRevision
  ).at(-1);

  return {
    sequence,
    revision,
    explicitYear,
  };
}

function documentNumberSeriesPattern(
  number: string,
  sequence: NumericToken | undefined,
  revision: NumericToken | undefined,
): string {
  if (!sequence) return "Sin número definitivo";

  const before = number.slice(0, sequence.index);
  const sequenceEnd = sequence.index + sequence.raw.length;
  let after = number.slice(sequenceEnd);
  if (revision) {
    const between = number.slice(sequenceEnd, revision.index);
    after = `${between}x${number.slice(revision.index + revision.raw.length)}`;
  }
  return `${before}…${after}`.trim();
}

function normalizedSeriesKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

/**
 * Contrato visual del listado de facturas. La serie se obtiene exclusivamente
 * del número persistido. Solo una procedencia legacy persistida recibe la
 * etiqueta de histórica importada; una reclamación provisional conserva un
 * bloque explícitamente pendiente. Nunca clasifica ni desbloquea integridad.
 */
export function describeInvoiceDocumentSeries(
  document: Document,
  numbering?: NumberingSettings,
): InvoiceDocumentNumberSeries {
  const token = principalNumberToken(document, numbering);
  const draft =
    document.status === "borrador" || isDraftInvoiceNumber(document);
  const hasNumber = Boolean(token.sequence) && !draft;
  const rectification = isRectificativa(document);
  const persistedHistoricalProvenance = Boolean(
    document.legacyImportProvenance &&
    document.documentLifecycle === "issued" &&
    document.integrityLock === "locked" &&
    !draft,
  );
  const protectedHistoricalCandidate =
    !persistedHistoricalProvenance && hasLegacyImportProtectionClaim(document);
  const historicalImport = persistedHistoricalProvenance;
  const pattern =
    hasNumber && token.pattern
      ? token.pattern
      : documentNumberSeriesPattern(
          document.number,
          hasNumber ? token.sequence : undefined,
          token.revision,
        );
  const rank = !hasNumber
    ? 6
    : historicalImport
      ? rectification
        ? 3
        : 2
      : protectedHistoricalCandidate
        ? rectification
          ? 5
          : 4
        : rectification
          ? 1
          : 0;
  const prefix = !hasNumber
    ? "Borradores sin número definitivo"
    : historicalImport
      ? rectification
        ? "Rectificativas históricas importadas"
        : "Históricas importadas"
      : protectedHistoricalCandidate
        ? rectification
          ? "Rectificativas protegidas pendientes de revisar"
          : "Importaciones protegidas pendientes de revisar"
        : rectification
          ? "Rectificativas"
          : "Facturas actuales";

  return {
    key: `${rank}:${normalizedSeriesKey(pattern)}`,
    label: hasNumber ? `${prefix} · Serie ${pattern}` : prefix,
    rank,
    explicitYear: token.explicitYear?.value ?? 0,
    hasNumber,
    sequence: token.sequence?.value ?? 0,
    exactSequence: exactUnsignedInteger(token.sequence?.raw),
    revision: token.revision?.value ?? 0,
    exactRevision: exactUnsignedInteger(token.revision?.raw),
  };
}

export function compareInvoicesBySeriesAndNumberDesc(
  a: Document,
  b: Document,
  numbering?: NumberingSettings,
): number {
  const seriesA = describeInvoiceDocumentSeries(a, numbering);
  const seriesB = describeInvoiceDocumentSeries(b, numbering);

  if (seriesA.rank !== seriesB.rank) return seriesA.rank - seriesB.rank;
  if (seriesA.explicitYear !== seriesB.explicitYear) {
    return seriesB.explicitYear - seriesA.explicitYear;
  }

  const bySeries = seriesA.key.localeCompare(seriesB.key, "es", {
    numeric: true,
    sensitivity: "base",
  });
  if (bySeries !== 0) return bySeries;

  if (seriesA.hasNumber !== seriesB.hasNumber) {
    return seriesA.hasNumber ? -1 : 1;
  }
  const byExactSequence = compareExactUnsignedIntegersDesc(
    seriesA.exactSequence,
    seriesB.exactSequence,
  );
  if (byExactSequence !== 0) return byExactSequence;
  const byExactRevision = compareExactUnsignedIntegersDesc(
    seriesA.exactRevision,
    seriesB.exactRevision,
  );
  if (byExactRevision !== 0) return byExactRevision;

  const byDate = b.date.localeCompare(a.date);
  if (byDate !== 0) return byDate;

  const byCreatedAt = b.createdAt.localeCompare(a.createdAt);
  if (byCreatedAt !== 0) return byCreatedAt;

  const byNumber = b.number.localeCompare(a.number, "es", {
    numeric: true,
    sensitivity: "base",
  });
  if (byNumber !== 0) return byNumber;

  if (a.number !== b.number) return a.number < b.number ? 1 : -1;

  const byId = a.id.localeCompare(b.id, "es", {
    numeric: true,
    sensitivity: "base",
  });
  if (byId !== 0) return byId;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

export function sortInvoicesBySeriesAndNumberDesc(
  documents: Document[],
  numbering?: NumberingSettings,
): Document[] {
  return [...documents].sort((a, b) =>
    compareInvoicesBySeriesAndNumberDesc(a, b, numbering),
  );
}

type InvoiceListPeriodOrder = {
  valid: boolean;
  key: string;
};

function invoiceListPeriodOrder(date: string): InvoiceListPeriodOrder {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { valid: false, key: "" };

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const valid =
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= lastDay;

  return valid
    ? { valid: true, key: `${match[1]}-${match[2]}` }
    : { valid: false, key: "" };
}

/**
 * Contrato del listado de facturas:
 *
 * 1. El periodo real (año y mes de la fecha del documento) siempre manda, de
 *    forma que una factura antigua nunca se inserta bajo un mes moderno.
 * 2. Dentro del mismo periodo, la secuencia es el último bloque numérico útil
 *    del número, con independencia de cualquier prefijo o del año incluido en
 *    él. Los formatos configurados y las revisiones decimales se respetan.
 * 3. Prefijo, serie, procedencia y texto completo solo desempatan; nunca crean
 *    bloques que repitan meses ni cambian la prioridad de la secuencia.
 *
 * Esta función es solo de presentación. No reclasifica procedencia ni modifica
 * documentos, snapshots, sellos, hashes o cálculos fiscales.
 */
export function compareInvoicesByPeriodAndNumberDesc(
  a: Document,
  b: Document,
  numbering?: NumberingSettings,
): number {
  const periodA = invoiceListPeriodOrder(a.date);
  const periodB = invoiceListPeriodOrder(b.date);

  if (periodA.valid !== periodB.valid) return periodA.valid ? -1 : 1;
  if (periodA.key !== periodB.key) return periodB.key.localeCompare(periodA.key);

  const numberA = describeInvoiceDocumentSeries(a, numbering);
  const numberB = describeInvoiceDocumentSeries(b, numbering);
  if (numberA.hasNumber !== numberB.hasNumber) {
    return numberA.hasNumber ? -1 : 1;
  }

  const byExactSequence = compareExactUnsignedIntegersDesc(
    numberA.exactSequence,
    numberB.exactSequence,
  );
  if (byExactSequence !== 0) return byExactSequence;

  const byExactRevision = compareExactUnsignedIntegersDesc(
    numberA.exactRevision,
    numberB.exactRevision,
  );
  if (byExactRevision !== 0) return byExactRevision;

  const byDate = b.date.localeCompare(a.date);
  if (byDate !== 0) return byDate;

  const byNumber = b.number.localeCompare(a.number, "es", {
    numeric: true,
    sensitivity: "base",
  });
  if (byNumber !== 0) return byNumber;
  if (a.number !== b.number) return a.number < b.number ? 1 : -1;

  const byCreatedAt = b.createdAt.localeCompare(a.createdAt);
  if (byCreatedAt !== 0) return byCreatedAt;

  const byId = a.id.localeCompare(b.id, "es", {
    numeric: true,
    sensitivity: "base",
  });
  if (byId !== 0) return byId;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

export function sortInvoicesByPeriodAndNumberDesc(
  documents: Document[],
  numbering?: NumberingSettings,
): Document[] {
  return [...documents].sort((a, b) =>
    compareInvoicesByPeriodAndNumberDesc(a, b, numbering),
  );
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
  if (hasLegacyImportProtectionClaim(doc)) return false;
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
