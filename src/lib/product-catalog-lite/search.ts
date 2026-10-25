import { CATALOG_SEARCH_RULES, type CatalogSearchRule } from "./search-rules";

const searchFields = ["name", "sku", "externalId", "family", "subfamily", "sales->>description", "purchase->>description", "purchase->>supplierReference", "purchase->>supplierName", "attributes", "notes", "priceSourceSummary->>purchase"];
const identityFields = ["name", "subfamily"];
const accents: Record<string, string> = { a: "[aáàäâ]", e: "[eéèëê]", i: "[iíìïî]", o: "[oóòöô]", u: "[uúùüû]", n: "[nñ]" };
const fold = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const literal = (word: string) => [...word].map(c => accents[c] ?? c).join("");
// PostgreSQL word boundaries, generated only from the fixed rules above.
const wordPattern = (pattern: string) => `\\m(${pattern})\\M`;
const column = (field: string) => `current_payload${field.includes("->>") ? "->" : "->>"}${field}`;
// PostgREST quotes keep generated regex groups inside one filter value.
const quoted = (pattern: string) => `"${pattern.replace(/\\/g, "\\\\")}"`;
const anyMatch = (fields: readonly string[], pattern: string) => `or(${fields.map(field => `${column(field)}.imatch.${quoted(pattern)}`).join(",")})`;
// NOT regex alone evaluates to NULL for absent optional fields. Include NULL
// explicitly so -word never hides an otherwise matching sparse product.
const noneMatch = (fields: readonly string[], pattern: string) => fields.map(field => `or(${column(field)}.is.null,${column(field)}.not.imatch.${quoted(pattern)})`);

interface SearchTerm { word: string; excluded: boolean; rule?: CatalogSearchRule }
function terms(query: string): SearchTerm[] {
  const result: SearchTerm[] = [];
  for (const chunk of fold(query.slice(0, 100)).split(/\s+/)) {
    // A minus starts an exclusion only at a word boundary. AM45-15/17 stays
    // a positive reference search, while -somfy excludes mentions of Somfy.
    const excluded = chunk.startsWith("-");
    const words = chunk.replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
    // -a-ok excludes the compound brand, rather than every occurrence of "a".
    for (const word of excluded && words.length ? [words.join(" ")] : words) {
      const rule = CATALOG_SEARCH_RULES.find(rule => rule.terms.includes(word));
      if (!result.some(t => t.excluded === excluded && (rule ? t.rule === rule : t.word === word))) result.push({ word, excluded, rule });
      if (result.length === 8) return result;
    }
  }
  return result;
}

/** Server-side predicate, applied before count and pagination. User input never
 * supplies filter operators, fields, regex syntax or an owner identifier. */
export function catalogSearchFilter(query: string): string | null {
  const groups: string[] = [];
  const exclusions: string[] = [];
  for (const { word, excluded, rule } of terms(query)) {
    const pattern = rule ? wordPattern(rule.pattern) : word.split(" ").map(literal).join("[^[:alnum:]]*");
    if (excluded) {
      exclusions.push(pattern);
    } else if (rule) {
      // A broad family like "Mandos y automatismos" also holds receivers and
      // switches. Only a family that names this kind exactly is sufficient.
      groups.push(`or(${anyMatch(identityFields, pattern)},${column("family")}.imatch.${quoted(`^${pattern}$`)})`);
      groups.push(...noneMatch(["family", "subfamily"], wordPattern(rule.excludedCategories)));
      groups.push(...noneMatch(["name"], `${wordPattern(rule.excludedNamePrefixes)}.*${pattern}`));
    } else {
      groups.push(anyMatch(searchFields, pattern));
    }
  }
  if (exclusions.length) groups.push(...noneMatch(searchFields, exclusions.length === 1 ? exclusions[0] : `(${exclusions.join("|")})`));
  return groups.length ? `and(${groups.join(",")})` : null;
}
