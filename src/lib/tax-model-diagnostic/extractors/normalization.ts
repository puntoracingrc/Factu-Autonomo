import type {
  ExtractedFact,
  JsonValue,
  StructuredExtractionMethod,
  TemporalScope,
  EvidenceStatus,
} from "./contracts";

export function normalizeDocumentText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[|¦]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Señales explícitas de que faltan páginas o de que un campo crítico no es
 * legible. Son deliberadamente conservadoras: ante cualquiera de ellas la
 * extracción puede conservar hechos visibles, pero nunca declarar el
 * documento completo ni cerrar preguntas por ausencia.
 */
export function hasExplicitIncompleteEvidence(value: string): boolean {
  const normalized = normalizeDocumentText(value);
  return /\b(?:REVIEW[ _]+OR[ _]+REJECT|SYNTHETIC[ _]+INCOMPLETE|NO VISIBLE|ILEGIBLE|BORROSO|RECORTAD[OA]|CAPTURA PARCIAL|PAGINA(?: FINAL| ANEXA)? AUSENTE|ANEXO(?: DE [A-Z ]+)? AUSENTE|CAMPO PARCIALMENTE ILEGIBLE)\b/.test(
    normalized,
  );
}

export function maskSpanishTaxId(value: string | null | undefined): string | null {
  const normalized = value?.replace(/[^A-Z0-9]/gi, "").toUpperCase() ?? "";
  if (normalized.length < 5) return null;
  return `${"*".repeat(Math.max(3, normalized.length - 4))}${normalized.slice(-4)}`;
}

export function maskReference(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, "") ?? "";
  if (normalized.length < 4) return null;
  return `***${normalized.slice(-4)}`;
}

export function parseSpanishDate(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})\b/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function extractDateAfterLabel(
  text: string,
  labels: readonly string[],
): string | null {
  const normalized = normalizeDocumentText(text);
  for (const label of labels) {
    const match = normalized.match(
      new RegExp(`${label}[^0-9]{0,28}(\\d{1,2}[/.\\-]\\d{1,2}[/.\\-]20\\d{2})`),
    );
    const parsed = parseSpanishDate(match?.[1]);
    if (parsed) return parsed;
  }
  return null;
}

export function extractFiscalYear(text: string): number | null {
  const normalized = normalizeDocumentText(text);
  const explicit = normalized.match(/\bEJERCICIO\s*[:.\-]?\s*(20\d{2})\b/);
  if (explicit) return Number(explicit[1]);
  return null;
}

export function extractPeriod(text: string): string | null {
  const normalized = normalizeDocumentText(text);
  return (
    normalized.match(
      /\bPERIODO\s*[:.\-]?\s*(0A|ANUAL|[1-4]T|[1-3]P|0[1-9]|1[0-2])\b/,
    )?.[1] ?? null
  );
}

export interface FactInput {
  documentId: string;
  index: number;
  factType: string;
  value: JsonValue;
  normalizedValue?: JsonValue;
  temporalScope: TemporalScope;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  sourcePage?: number | null;
  sourceField?: string | null;
  sourceLabel?: string | null;
  extractionMethod: StructuredExtractionMethod;
  extractionConfidence: number;
  filingVerified?: boolean;
  status: EvidenceStatus;
  warnings?: readonly string[];
}

export function createExtractedFact(input: FactInput): ExtractedFact {
  return {
    factId: `${input.documentId}:fact:${input.index}:${input.factType}`,
    factType: input.factType,
    value: input.value,
    normalizedValue: input.normalizedValue ?? input.value,
    temporalScope: input.temporalScope,
    effectiveFrom: input.effectiveFrom ?? null,
    effectiveTo: input.effectiveTo ?? null,
    sourceDocumentId: input.documentId,
    sourcePage: input.sourcePage ?? null,
    sourceField: input.sourceField ?? null,
    sourceLabel: input.sourceLabel ?? null,
    sourceCoordinates: null,
    extractionMethod: input.extractionMethod,
    extractionConfidence: Math.max(0, Math.min(1, input.extractionConfidence)),
    filingVerified: input.filingVerified ?? false,
    userConfirmed: false,
    status: input.status,
    conflictsWith: [],
    supersededBy: null,
    warnings: input.warnings ?? [],
  };
}
