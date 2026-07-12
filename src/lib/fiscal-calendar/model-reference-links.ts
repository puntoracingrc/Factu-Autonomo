import type { FiscalCalendarModelPageLink } from "./types";

export type { FiscalCalendarModelPageLink } from "./types";

interface FiscalCalendarTextEvent {
  title: string;
  description: string;
}

export type FiscalCalendarTextSegment =
  | { text: string; modelPage: null }
  | { text: string; modelPage: FiscalCalendarModelPageLink };

const MODEL_CODE_SOURCE = String.raw`(?:\d{2}[A-Z]|[A-Z]\d{2}|\d{2,3})`;
const MODEL_LIST_SOURCE = String.raw`${MODEL_CODE_SOURCE}(?:\s*(?:,|\/|\by\b|\be\b|\bo\b)\s*${MODEL_CODE_SOURCE}){0,511}`;
const MODEL_CODE_PATTERN = new RegExp(
  String.raw`(?<![A-Z0-9])${MODEL_CODE_SOURCE}(?![A-Z0-9])`,
  "gi",
);
const MODEL_LIST_CONTEXT_PATTERN = new RegExp(
  String.raw`\bmodelos?\b\s*(?::|-)?\s*(${MODEL_LIST_SOURCE})`,
  "gi",
);
const FISCAL_LABEL_CONTEXT_PATTERN = new RegExp(
  String.raw`\b(?:autoliquidaci[oó]n|declaraci[oó]n(?:-liquidaci[oó]n)?|solicitud|reintegro|operaciones?|impuesto)\b[^:\n]{0,160}:\s*(${MODEL_LIST_SOURCE})`,
  "gi",
);
const MAX_RESOLVED_MODEL_LINKS = 512;
const MAX_MODEL_REFERENCE_SCAN_LENGTH = 20_000;
const CANONICAL_CATALOG_FOCUS_HREF = new RegExp(
  String.raw`^/consultor-fiscal/modelos\?origen=calendario&foco=(${MODEL_CODE_SOURCE})#modelo-(${MODEL_CODE_SOURCE})$`,
);

export function isCanonicalFiscalCalendarModelPageLink(
  value: unknown,
): value is FiscalCalendarModelPageLink {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== 3 ||
      !keys.every(
        (key) =>
          typeof key === "string" &&
          (key === "code" || key === "href" || key === "historical"),
      )
    ) {
      return false;
    }
    const descriptors = Object.fromEntries(
      keys.map((key) => [key, Object.getOwnPropertyDescriptor(value, key)]),
    );
    if (
      keys.some((key) => {
        const descriptor = descriptors[key as string];
        return (
          !descriptor || !descriptor.enumerable || !("value" in descriptor)
        );
      })
    ) {
      return false;
    }

    const record = value as Record<string, unknown>;
    if (
      typeof record.code !== "string" ||
      typeof record.href !== "string" ||
      typeof record.historical !== "boolean"
    ) {
      return false;
    }
    const match = CANONICAL_CATALOG_FOCUS_HREF.exec(record.href);
    if (!match || match[1] !== record.code || match[2] !== record.code) {
      return false;
    }
    const url = new URL(record.href, "https://calendar.invalid");
    return (
      url.origin === "https://calendar.invalid" &&
      url.pathname === "/consultor-fiscal/modelos" &&
      url.port === "" &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function candidateMatches(text: string): Array<{
  code: string;
  start: number;
  end: number;
}> {
  const scannedText = text.slice(0, MAX_MODEL_REFERENCE_SCAN_LENGTH);
  const matches = new Map<
    string,
    { code: string; start: number; end: number }
  >();
  for (const pattern of [
    MODEL_LIST_CONTEXT_PATTERN,
    FISCAL_LABEL_CONTEXT_PATTERN,
  ]) {
    for (const contextMatch of scannedText.matchAll(pattern)) {
      const list = contextMatch[1];
      if (!list) continue;
      const listStart = contextMatch.index + contextMatch[0].lastIndexOf(list);
      for (const codeMatch of list.matchAll(MODEL_CODE_PATTERN)) {
        const start = listStart + codeMatch.index;
        const code = codeMatch[0].toUpperCase();
        matches.set(`${start}:${code}`, {
          code,
          start,
          end: start + codeMatch[0].length,
        });
        if (matches.size >= MAX_RESOLVED_MODEL_LINKS) break;
      }
      if (matches.size >= MAX_RESOLVED_MODEL_LINKS) break;
    }
    if (matches.size >= MAX_RESOLVED_MODEL_LINKS) break;
  }
  return [...matches.values()].sort((left, right) => left.start - right.start);
}

export function extractFiscalCalendarModelCodes(text: string): string[] {
  return [...new Set(candidateMatches(text).map((match) => match.code))];
}

export function collectFiscalCalendarModelPageLinks(
  events: readonly FiscalCalendarTextEvent[],
  resolveLink: (code: string) => unknown,
): FiscalCalendarModelPageLink[] {
  const codes = new Set<string>();
  for (const event of events) {
    for (const code of extractFiscalCalendarModelCodes(
      `${event.title}\n${event.description}`,
    )) {
      codes.add(code);
      if (codes.size >= MAX_RESOLVED_MODEL_LINKS) break;
    }
    if (codes.size >= MAX_RESOLVED_MODEL_LINKS) break;
  }

  const links: FiscalCalendarModelPageLink[] = [];
  for (const code of codes) {
    let value: unknown;
    try {
      value = resolveLink(code);
    } catch {
      continue;
    }
    if (!isCanonicalFiscalCalendarModelPageLink(value) || value.code !== code) {
      continue;
    }
    links.push({
      code,
      href: value.href,
      historical: value.historical,
    });
  }
  return links;
}

export function segmentFiscalCalendarModelReferences(
  text: string,
  links: ReadonlyMap<string, FiscalCalendarModelPageLink>,
): FiscalCalendarTextSegment[] {
  const linkedMatches = candidateMatches(text).flatMap((match) => {
    const modelPage = links.get(match.code);
    return modelPage ? [{ ...match, modelPage }] : [];
  });
  if (linkedMatches.length === 0) return [{ text, modelPage: null }];

  const segments: FiscalCalendarTextSegment[] = [];
  let cursor = 0;
  for (const match of linkedMatches) {
    if (match.start < cursor) continue;
    if (match.start > cursor) {
      segments.push({ text: text.slice(cursor, match.start), modelPage: null });
    }
    segments.push({
      text: text.slice(match.start, match.end),
      modelPage: match.modelPage,
    });
    cursor = match.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), modelPage: null });
  }
  return segments;
}
