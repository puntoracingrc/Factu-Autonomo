export const MAX_FISCAL_WATCH_MODEL_HINTS = 80;

const MODEL_CODE_SOURCE = String.raw`(?:A\d{2}|\d{2,3}[A-Z]?)`;
const BOUNDED_MODEL_CODE_SOURCE = `${MODEL_CODE_SOURCE}(?![A-Z0-9])`;
const OPTIONAL_NUMBER_LABEL = String.raw`(?:(?:n(?:ú|u)meros?)|n\.?\s*[º°o])?`;
const SINGLE_MODEL_REFERENCE = new RegExp(
  String.raw`\b(?:modelo|formulario)\s+${OPTIONAL_NUMBER_LABEL}\s*:?\s*(${BOUNDED_MODEL_CODE_SOURCE})`,
  "giu",
);
const PLURAL_MODEL_REFERENCE = new RegExp(
  String.raw`\b(?:modelos|formularios)\s+${OPTIONAL_NUMBER_LABEL}\s*:?\s*(${BOUNDED_MODEL_CODE_SOURCE}(?:\s*(?:[,;/]|\by\b|\be\b)\s*${BOUNDED_MODEL_CODE_SOURCE}){0,39})`,
  "giu",
);
const MODEL_CODE_IN_LIST = new RegExp(
  String.raw`(?<![A-Z0-9])${MODEL_CODE_SOURCE}(?![A-Z0-9])`,
  "giu",
);

function explicitModelCodes(value) {
  if (typeof value !== "string" || value.length === 0) return [];
  const normalized = value.normalize("NFC");
  const codes = [];
  for (const match of normalized.matchAll(SINGLE_MODEL_REFERENCE)) {
    codes.push(match[1].toUpperCase());
  }
  for (const match of normalized.matchAll(PLURAL_MODEL_REFERENCE)) {
    for (const code of match[1].matchAll(MODEL_CODE_IN_LIST)) {
      codes.push(code[0].toUpperCase());
    }
  }
  return codes;
}

function evidenceTexts(change) {
  if (!change || typeof change !== "object") return [];
  const candidates = [
    change.title,
    change.before?.title,
    change.before?.excerpt,
    change.after?.title,
    change.after?.excerpt,
  ];
  return candidates.filter((value) => typeof value === "string");
}

export function extractFiscalWatchModelHints(changes) {
  const codes = new Set();
  for (const change of Array.isArray(changes) ? changes : []) {
    for (const text of evidenceTexts(change)) {
      for (const code of explicitModelCodes(text)) codes.add(code);
    }
  }
  const sorted = [...codes].sort();
  return Object.freeze({
    codes: Object.freeze(sorted.slice(0, MAX_FISCAL_WATCH_MODEL_HINTS)),
    truncated: sorted.length > MAX_FISCAL_WATCH_MODEL_HINTS,
  });
}
