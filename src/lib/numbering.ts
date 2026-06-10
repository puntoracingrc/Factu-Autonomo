import { isRectificativa } from "./rectificativas";
import type { Document, DocumentKind } from "./types";
import type {
  NumberingFormat,
  NumberingFormats,
  NumberingLastSequence,
  NumberingSettings,
} from "./types";

export const DEFAULT_NUMBERING_FORMATS: NumberingFormats = {
  factura: { template: "F-{year}-{num}", padding: 4 },
  factura_rectificativa: { template: "FR-{year}-{num}", padding: 4 },
  presupuesto: { template: "P-{year}-{num}", padding: 4 },
  recibo: { template: "R-{year}-{num}", padding: 4 },
};

export const NUMBERING_FORMAT_EXAMPLES: Record<
  keyof NumberingLastSequence,
  string[]
> = {
  factura: ["F-{year}-{num}", "Factura - {num}", "Fact {num}"],
  factura_rectificativa: [
    "FR-{year}-{num}",
    "Rectificativa - {num}",
    "Factura rect. {num}",
  ],
  presupuesto: ["P-{year}-{num}", "Presupuesto - {num}", "Presup. {num}"],
  recibo: ["R-{year}-{num}", "Recibo - {num}", "Rec. {num}"],
};

export const NUMBERING_KIND_LABELS: Record<
  keyof NumberingLastSequence,
  { label: string }
> = {
  factura: { label: "Facturas" },
  factura_rectificativa: { label: "Facturas rectificativas" },
  presupuesto: { label: "Presupuestos" },
  recibo: { label: "Recibos" },
};

const LEGACY_PREFIX: Record<DocumentKind, string> = {
  factura: "F",
  factura_rectificativa: "FR",
  presupuesto: "P",
  recibo: "R",
};

export function emptyLastSequence(): NumberingLastSequence {
  return {
    factura: 0,
    factura_rectificativa: 0,
    presupuesto: 0,
    recibo: 0,
  };
}

export function defaultNumberingSettings(
  year = new Date().getFullYear(),
): NumberingSettings {
  return {
    year,
    lastSequence: emptyLastSequence(),
    formats: { ...DEFAULT_NUMBERING_FORMATS },
  };
}

function clampSequence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(999999, Math.floor(value)));
}

function clampPadding(value: number): number {
  if (!Number.isFinite(value)) return 4;
  return Math.max(1, Math.min(8, Math.floor(value)));
}

export function normalizeNumberingFormat(
  input: Partial<NumberingFormat> | undefined,
  fallback: NumberingFormat,
): NumberingFormat {
  const template = input?.template?.trim() || fallback.template;
  const validTemplate = template.includes("{num}") ? template : fallback.template;
  return {
    template: validTemplate,
    padding: clampPadding(input?.padding ?? fallback.padding),
  };
}

export function normalizeNumbering(
  input?: Partial<NumberingSettings> | null,
): NumberingSettings {
  const year = Number.isFinite(input?.year)
    ? Math.max(2000, Math.min(2100, Math.floor(input!.year!)))
    : new Date().getFullYear();

  const last = input?.lastSequence ?? emptyLastSequence();
  const formatsInput = input?.formats;

  return {
    year,
    lastSequence: {
      factura: clampSequence(last.factura),
      factura_rectificativa: clampSequence(last.factura_rectificativa),
      presupuesto: clampSequence(last.presupuesto),
      recibo: clampSequence(last.recibo),
    },
    formats: {
      factura: normalizeNumberingFormat(
        formatsInput?.factura,
        DEFAULT_NUMBERING_FORMATS.factura,
      ),
      factura_rectificativa: normalizeNumberingFormat(
        formatsInput?.factura_rectificativa,
        DEFAULT_NUMBERING_FORMATS.factura_rectificativa,
      ),
      presupuesto: normalizeNumberingFormat(
        formatsInput?.presupuesto,
        DEFAULT_NUMBERING_FORMATS.presupuesto,
      ),
      recibo: normalizeNumberingFormat(
        formatsInput?.recibo,
        DEFAULT_NUMBERING_FORMATS.recibo,
      ),
    },
  };
}

export function formatUsesYear(template: string): boolean {
  return template.includes("{year}");
}

export function formatNumberFromTemplate(
  template: string,
  year: number,
  sequence: number,
  padding: number,
): string {
  const num = String(sequence).padStart(padding, "0");
  return template.replace(/\{year\}/g, String(year)).replace(/\{num\}/g, num);
}

export function formatDocumentNumberWithSettings(
  kind: DocumentKind,
  year: number,
  sequence: number,
  numbering: NumberingSettings,
): string {
  const settings = normalizeNumbering(numbering);
  const format = settings.formats[kind];
  return formatNumberFromTemplate(
    format.template,
    year,
    sequence,
    format.padding,
  );
}

export function parseDocumentNumberForKind(
  number: string,
  kind: DocumentKind,
  numbering: NumberingSettings,
): { sequence: number; year?: number } | null {
  const format = normalizeNumbering(numbering).formats[kind];
  const parsed = parseWithTemplate(number, format.template);
  if (parsed) return parsed;

  return parseLegacyDocumentNumber(number, kind);
}

function parseWithTemplate(
  number: string,
  template: string,
): { sequence: number; year?: number } | null {
  const parts = template.split(/(\{year\}|\{num\})/);
  let regexStr = "^";
  let numGroupIndex = -1;
  let yearGroupIndex = -1;
  let groupCount = 0;

  for (const part of parts) {
    if (part === "{num}") {
      groupCount += 1;
      numGroupIndex = groupCount;
      regexStr += "(\\d+)";
    } else if (part === "{year}") {
      groupCount += 1;
      yearGroupIndex = groupCount;
      regexStr += "(\\d{4})";
    } else if (part) {
      regexStr += part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }

  regexStr += "$";
  const match = number.match(new RegExp(regexStr));
  if (!match) return null;

  const sequence = Number(match[numGroupIndex]);
  if (!Number.isFinite(sequence)) return null;

  const year =
    yearGroupIndex > 0 ? Number(match[yearGroupIndex]) : undefined;

  return { sequence, year };
}

export function parseLegacyDocumentNumber(
  number: string,
  kind: DocumentKind,
): { sequence: number; year: number } | null {
  const prefix = LEGACY_PREFIX[kind];
  const match = number.match(
    new RegExp(`^${prefix}-(\\d{4})-(\\d+)$`),
  );
  if (!match) return null;
  return {
    year: Number(match[1]),
    sequence: Number(match[2]),
  };
}

export function configuredLastForKind(
  numbering: NumberingSettings,
  kind: DocumentKind,
  year: number,
): number {
  if (numbering.year !== year) return 0;
  return numbering.lastSequence[kind];
}

export function nextSequencePreview(
  numbering: NumberingSettings,
  kind: DocumentKind,
  documentsMax: number,
): { lastUsed: number; nextSequence: number; nextNumber: string } {
  const normalized = normalizeNumbering(numbering);
  const configured = configuredLastForKind(normalized, kind, normalized.year);
  const lastUsed = Math.max(documentsMax, configured);
  const nextSequence = lastUsed + 1;
  return {
    lastUsed,
    nextSequence,
    nextNumber: formatDocumentNumberWithSettings(
      kind,
      normalized.year,
      nextSequence,
      normalized,
    ),
  };
}

export function bumpNumberingAfterAssign(
  numbering: NumberingSettings,
  kind: DocumentKind,
  year: number,
  sequence: number,
): NumberingSettings {
  const normalized = normalizeNumbering(numbering);

  if (normalized.year !== year) {
    const lastSequence = emptyLastSequence();
    lastSequence[kind] = sequence;
    return { ...normalized, year, lastSequence };
  }

  return {
    ...normalized,
    lastSequence: {
      ...normalized.lastSequence,
      [kind]: Math.max(normalized.lastSequence[kind], sequence),
    },
  };
}

export function setManualLastSequence(
  numbering: NumberingSettings,
  kind: keyof NumberingLastSequence,
  value: number,
): NumberingSettings {
  const normalized = normalizeNumbering(numbering);
  return {
    ...normalized,
    lastSequence: {
      ...normalized.lastSequence,
      [kind]: clampSequence(value),
    },
  };
}

export function setManualFormat(
  numbering: NumberingSettings,
  kind: keyof NumberingFormats,
  template: string,
): NumberingSettings {
  const normalized = normalizeNumbering(numbering);
  return {
    ...normalized,
    formats: {
      ...normalized.formats,
      [kind]: normalizeNumberingFormat(
        { template, padding: normalized.formats[kind].padding },
        normalized.formats[kind],
      ),
    },
  };
}

export function getMaxSequenceWithSettings(
  documents: Document[],
  kind: DocumentKind,
  year: number,
  numbering: NumberingSettings,
): number {
  const settings = normalizeNumbering(numbering);
  const templateHasYear = formatUsesYear(settings.formats[kind].template);

  return documents.reduce((max, doc) => {
    if (getDocumentKindFromDoc(doc) !== kind) return max;

    const parsed = parseDocumentNumberForKind(doc.number, kind, settings);
    if (!parsed) return max;

    const docYear = templateHasYear
      ? (parsed.year ?? new Date(doc.date).getFullYear())
      : new Date(doc.date).getFullYear();

    if (docYear !== year) return max;
    return Math.max(max, parsed.sequence);
  }, 0);
}

function getDocumentKindFromDoc(doc: Document): DocumentKind {
  if (isRectificativa(doc)) return "factura_rectificativa";
  return doc.type;
}

export function syncNumberingToDocuments(
  numbering: NumberingSettings,
  documents: Document[],
): NumberingSettings {
  const { year } = normalizeNumbering(numbering);
  return {
    ...normalizeNumbering(numbering),
    lastSequence: {
      factura: getMaxSequenceWithSettings(documents, "factura", year, numbering),
      factura_rectificativa: getMaxSequenceWithSettings(
        documents,
        "factura_rectificativa",
        year,
        numbering,
      ),
      presupuesto: getMaxSequenceWithSettings(
        documents,
        "presupuesto",
        year,
        numbering,
      ),
      recibo: getMaxSequenceWithSettings(documents, "recibo", year, numbering),
    },
  };
}
