export interface NormalizedConcept {
  original: string;
  comparable: string;
  tokens: readonly string[];
}

export function normalizeComparableText(value: string): string {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeConcept(value: string): NormalizedConcept {
  const comparable = normalizeComparableText(value);
  return {
    original: value,
    comparable,
    tokens: comparable ? comparable.split(" ") : [],
  };
}

export function tokenSet(value: string): ReadonlySet<string> {
  return new Set(normalizeConcept(value).tokens);
}
