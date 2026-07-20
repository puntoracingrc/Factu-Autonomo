import {
  SPAIN_MUNICIPALITIES_BY_PROVINCE,
  SPAIN_MUNICIPALITIES_SOURCE,
} from "./spain-municipalities-2026";

export { SPAIN_MUNICIPALITIES_SOURCE };

export type SpanishMunicipalityResolution = {
  value: string;
  status: "exact" | "corrected" | "unmatched" | "conflict";
  provinceCode: string | null;
};

type MunicipalityMatch = {
  display: string;
  provinceCode: string;
};

type MunicipalityIndex = {
  global: Map<string, MunicipalityMatch | null>;
  globalCandidates: MunicipalityCandidate[];
  byProvince: Map<string, Map<string, MunicipalityMatch | null>>;
  candidatesByProvince: Map<string, MunicipalityCandidate[]>;
};

type MunicipalityCandidate = MunicipalityMatch & {
  comparable: string;
};

const TRAILING_ARTICLE_REGEX =
  /^(.+),\s*(A|As|El|La|Las|Lo|Los|L'|O|Os)$/iu;

const MANUAL_ALIASES: ReadonlyArray<{
  aliases: readonly string[];
  display: string;
  provinceCode: string;
}> = [
  { aliases: ["barna", "bcn"], display: "Barcelona", provinceCode: "08" },
  { aliases: ["mad"], display: "Madrid", provinceCode: "28" },
  { aliases: ["vlc"], display: "Valencia", provinceCode: "46" },
  { aliases: ["bilbo"], display: "Bilbao", provinceCode: "48" },
  {
    aliases: ["donosti"],
    display: "Donostia/San Sebastián",
    provinceCode: "20",
  },
  { aliases: ["gasteiz"], display: "Vitoria-Gasteiz", provinceCode: "01" },
  { aliases: ["irunea", "iruna"], display: "Pamplona/Iruña", provinceCode: "31" },
  { aliases: ["xixon"], display: "Gijón", provinceCode: "33" },
  { aliases: ["uvieu"], display: "Oviedo", provinceCode: "33" },
  { aliases: ["palma de mallorca"], display: "Palma", provinceCode: "07" },
  {
    aliases: ["las palmas"],
    display: "Las Palmas de Gran Canaria",
    provinceCode: "35",
  },
  { aliases: ["lerida"], display: "Lleida", provinceCode: "25" },
  { aliases: ["gerona"], display: "Girona", provinceCode: "17" },
  { aliases: ["alicante"], display: "Alicante/Alacant", provinceCode: "03" },
  {
    aliases: ["castellon", "castello"],
    display: "Castelló de la Plana",
    provinceCode: "12",
  },
  { aliases: ["ibiza"], display: "Eivissa", provinceCode: "07" },
  { aliases: ["mahon"], display: "Maó", provinceCode: "07" },
];

export function normalizeSpanishPlaceComparable(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("es-ES")
    .replace(/\b(?:espana|spain)\b/gu, " ")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function humanizeOfficialName(value: string): string {
  return value
    .split("/")
    .map((part) => {
      const cleaned = part.trim();
      const match = cleaned.match(TRAILING_ARTICLE_REGEX);
      if (!match) return cleaned;
      const name = match[1]?.trim() ?? cleaned;
      const article = match[2] ?? "";
      return article.endsWith("'") ? `${article}${name}` : `${article} ${name}`;
    })
    .join("/");
}

function aliasesForOfficialName(value: string): string[] {
  const display = humanizeOfficialName(value);
  return Array.from(
    new Set([
      value,
      display,
      ...value.split("/"),
      ...display.split("/"),
    ].map((entry) => entry.trim()).filter(Boolean)),
  );
}

function addIndexedMatch(
  map: Map<string, MunicipalityMatch | null>,
  comparable: string,
  match: MunicipalityMatch,
): void {
  if (!comparable) return;
  const existing = map.get(comparable);
  if (existing === undefined) {
    map.set(comparable, match);
    return;
  }
  if (
    existing &&
    existing.display === match.display &&
    existing.provinceCode === match.provinceCode
  ) {
    return;
  }
  map.set(comparable, null);
}

function buildMunicipalityIndex(): MunicipalityIndex {
  const global = new Map<string, MunicipalityMatch | null>();
  const globalCandidates: MunicipalityCandidate[] = [];
  const byProvince = new Map<string, Map<string, MunicipalityMatch | null>>();
  const candidatesByProvince = new Map<string, MunicipalityCandidate[]>();

  const add = (alias: string, match: MunicipalityMatch) => {
    const comparable = normalizeSpanishPlaceComparable(alias);
    if (!comparable) return;
    const provinceMap = byProvince.get(match.provinceCode) ?? new Map();
    const provinceCandidates = candidatesByProvince.get(match.provinceCode) ?? [];
    addIndexedMatch(global, comparable, match);
    addIndexedMatch(provinceMap, comparable, match);
    globalCandidates.push({ ...match, comparable });
    provinceCandidates.push({ ...match, comparable });
    byProvince.set(match.provinceCode, provinceMap);
    candidatesByProvince.set(match.provinceCode, provinceCandidates);
  };

  for (const [provinceCode, municipalities] of Object.entries(
    SPAIN_MUNICIPALITIES_BY_PROVINCE,
  )) {
    for (const officialName of municipalities) {
      const match = {
        display: humanizeOfficialName(officialName),
        provinceCode,
      };
      for (const alias of aliasesForOfficialName(officialName)) add(alias, match);
    }
  }

  for (const manual of MANUAL_ALIASES) {
    for (const alias of manual.aliases) add(alias, manual);
  }

  return { global, globalCandidates, byProvince, candidatesByProvince };
}

let municipalityIndex: MunicipalityIndex | null = null;

function getMunicipalityIndex(): MunicipalityIndex {
  municipalityIndex ??= buildMunicipalityIndex();
  return municipalityIndex;
}

function postalProvinceCode(postalCode: string | null | undefined): string | null {
  const match = postalCode?.match(/^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/u);
  return match?.[1] ?? null;
}

function trimPlaceCandidate(value: string): string {
  return value
    .trim()
    .replace(/^[,.;:\-\s]+|[,.;:\-\s]+$/gu, "")
    .replace(/\s*\([^)]{2,60}\)\s*$/u, "")
    .replace(/\s+/gu, " ");
}

function damerauLevenshteinWithin(
  left: string,
  right: string,
  maximum: number,
): number | null {
  if (Math.abs(left.length - right.length) > maximum) return null;
  if (left === right) return 0;

  const previousPrevious = new Array<number>(right.length + 1).fill(0);
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = new Array<number>(right.length + 1).fill(0);
    current[0] = leftIndex;
    let rowMinimum = current[0];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) + substitutionCost,
      );

      if (
        leftIndex > 1 &&
        rightIndex > 1 &&
        left[leftIndex - 1] === right[rightIndex - 2] &&
        left[leftIndex - 2] === right[rightIndex - 1]
      ) {
        current[rightIndex] = Math.min(
          current[rightIndex] ?? Number.POSITIVE_INFINITY,
          (previousPrevious[rightIndex - 2] ?? 0) + 1,
        );
      }
      rowMinimum = Math.min(rowMinimum, current[rightIndex] ?? rowMinimum);
    }

    if (rowMinimum > maximum) return null;
    for (let index = 0; index < previous.length; index += 1) {
      previousPrevious[index] = previous[index] ?? 0;
    }
    previous = current;
  }

  const distance = previous[right.length] ?? maximum + 1;
  return distance <= maximum ? distance : null;
}

function maximumTypoDistance(comparable: string): number {
  const compactLength = comparable.replace(/\s/gu, "").length;
  if (compactLength < 5) return 0;
  if (compactLength <= 8) return 1;
  return 2;
}

function uniqueClosestMatch(
  comparable: string,
  candidates: readonly MunicipalityCandidate[],
): { match: MunicipalityMatch; distance: number } | null {
  const maximum = maximumTypoDistance(comparable);
  if (maximum === 0) return null;

  let bestDistance = maximum + 1;
  const winners = new Map<string, MunicipalityMatch>();
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const candidateKey = `${candidate.provinceCode}:${candidate.display}:${candidate.comparable}`;
    if (seen.has(candidateKey)) continue;
    seen.add(candidateKey);

    const distance = damerauLevenshteinWithin(
      comparable,
      candidate.comparable,
      Math.min(maximum, bestDistance),
    );
    if (distance === null || distance > bestDistance) continue;
    if (distance < bestDistance) {
      bestDistance = distance;
      winners.clear();
    }
    winners.set(`${candidate.provinceCode}:${candidate.display}`, candidate);
  }

  if (winners.size !== 1 || bestDistance > maximum) return null;
  const match = winners.values().next().value as MunicipalityMatch | undefined;
  return match ? { match, distance: bestDistance } : null;
}

export function resolveSpanishMunicipality(
  value: string | null | undefined,
  postalCode?: string | null,
): SpanishMunicipalityResolution | null {
  const cleaned = trimPlaceCandidate(value ?? "");
  if (!cleaned) return null;

  const comparable = normalizeSpanishPlaceComparable(cleaned);
  if (!comparable) return null;

  const provinceCode = postalProvinceCode(postalCode);
  const index = getMunicipalityIndex();
  const exactGlobal = index.global.get(comparable);
  const exactProvince = provinceCode
    ? index.byProvince.get(provinceCode)?.get(comparable)
    : undefined;

  if (exactGlobal) {
    if (provinceCode && exactGlobal.provinceCode !== provinceCode) {
      return { value: cleaned, status: "conflict", provinceCode };
    }
    return {
      value: exactGlobal.display,
      status: "exact",
      provinceCode: exactGlobal.provinceCode,
    };
  }

  if (exactProvince) {
    return {
      value: exactProvince.display,
      status: "exact",
      provinceCode: exactProvince.provinceCode,
    };
  }

  const candidates = provinceCode
    ? index.candidatesByProvince.get(provinceCode) ?? []
    : index.globalCandidates;
  const closest = uniqueClosestMatch(comparable, candidates);
  if (!closest) return { value: cleaned, status: "unmatched", provinceCode };

  if (provinceCode) {
    const globalClosest = uniqueClosestMatch(comparable, index.globalCandidates);
    if (
      globalClosest &&
      globalClosest.distance < closest.distance &&
      globalClosest.match.provinceCode !== provinceCode
    ) {
      return { value: cleaned, status: "conflict", provinceCode };
    }
  }

  return {
    value: closest.match.display,
    status: "corrected",
    provinceCode: closest.match.provinceCode,
  };
}

export function spanishMunicipalityCount(): number {
  return Object.values(SPAIN_MUNICIPALITIES_BY_PROVINCE).reduce(
    (total, municipalities) => total + municipalities.length,
    0,
  );
}

export function spanishMunicipalitiesByProvince(): Readonly<
  Record<string, readonly string[]>
> {
  return SPAIN_MUNICIPALITIES_BY_PROVINCE;
}
