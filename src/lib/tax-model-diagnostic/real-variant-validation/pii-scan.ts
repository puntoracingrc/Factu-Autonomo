import type {
  PdfLayerSnapshot,
  PiiFindingSummary,
  PiiScanResult,
} from "./contracts";

type PatternCategory = PiiFindingSummary["category"];

const PATTERNS: readonly { category: PatternCategory; pattern: RegExp }[] = [
  {
    category: "TAX_ID",
    pattern: /\b(?:[XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[A-Z]\d{7}[A-Z0-9])\b/giu,
  },
  { category: "IBAN", pattern: /\bES\d{22}\b/giu },
  {
    category: "NRC_OR_CSV",
    pattern: /\b(?:NRC|CSV)\s*[:.\-]?\s*[A-Z0-9-]{8,}\b/giu,
  },
  { category: "PHONE", pattern: /(?<!\d)(?:\+34\s*)?[6789]\d{8}(?!\d)/gu },
  {
    category: "EMAIL",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
  },
  { category: "POSTAL_CODE", pattern: /\b(?:0[1-9]|[1-4]\d|5[0-2])\d{3}\b/gu },
];

const LAYERS: readonly (keyof PdfLayerSnapshot)[] = [
  "fileName",
  "nativeText",
  "ocrText",
  "xmpValues",
  "documentProperties",
  "acroFormValues",
  "xfaValues",
  "annotationValues",
  "embeddedFileNames",
  "embeddedTextValues",
  "optionalContentLayerNames",
  "qrAndBarcodeValues",
  "internalPathValues",
];

function asValues(value: string | readonly string[]): readonly string[] {
  return typeof value === "string" ? [value] : value;
}

function countMatches(pattern: RegExp, value: string): number {
  pattern.lastIndex = 0;
  return [...value.matchAll(pattern)].length;
}

export function scanPdfLayersForPii(
  snapshot: PdfLayerSnapshot,
  knownOriginalValues: readonly string[] = [],
  approvedSyntheticReplacements: readonly string[] = [],
): PiiScanResult {
  const findings: PiiFindingSummary[] = [];
  for (const layer of LAYERS) {
    const originalValues = asValues(snapshot[layer]);
    const values = originalValues.map((value) =>
      approvedSyntheticReplacements.reduce(
        (redacted, replacement) =>
          replacement.length >= 4
            ? redacted.replaceAll(replacement, "[SYNTHETIC_REPLACEMENT]")
            : redacted,
        value,
      ),
    );
    for (const { category, pattern } of PATTERNS) {
      const count = values.reduce(
        (total, value) => total + countMatches(pattern, value),
        0,
      );
      if (count > 0) findings.push({ category, layer, count });
    }
    const exactCount = originalValues.reduce((total, value) => {
      const folded = value.toLocaleLowerCase("es-ES");
      return (
        total +
        knownOriginalValues.filter(
          (known) =>
            known.trim().length >= 4 &&
            folded.includes(known.toLocaleLowerCase("es-ES")),
        ).length
      );
    }, 0);
    if (exactCount > 0) {
      findings.push({
        category: "KNOWN_ORIGINAL_VALUE",
        layer,
        count: exactCount,
      });
    }
  }
  const findingCount = findings.reduce((total, item) => total + item.count, 0);
  return Object.freeze({
    safeForCorpus: findingCount === 0,
    findingCount,
    findings: Object.freeze(findings.map((item) => Object.freeze({ ...item }))),
    scannedLayerCount: LAYERS.length,
    rawValuesExposed: false as const,
  });
}
