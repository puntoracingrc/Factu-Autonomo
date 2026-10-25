/** Product-kind rules for the lightweight catalog. Add confirmed vocabulary here;
 * descriptions remain searchable for other terms, without changing product data. */
export interface CatalogSearchRule {
  terms: readonly string[];
  pattern: string;
  /** These categories describe another product, even when they mention this kind. */
  excludedCategories: string;
  /** A named component before the searched kind: "motor con mando", for example. */
  excludedNamePrefixes: string;
}

export const CATALOG_SEARCH_RULES: readonly CatalogSearchRule[] = [
  {
    terms: ["guia", "guias"],
    pattern: "gu[ií]as?",
    excludedCategories: "basculador(es)?",
    excludedNamePrefixes: "basculador(es)?",
  },
  {
    terms: ["mando", "mandos", "emisor", "emisores"],
    pattern: "mandos?|emisor(es)?",
    excludedCategories: "motor(es)?|pilas?|bater[ií]as?",
    excludedNamePrefixes: "motor(es)?|operador(es)?|pilas?|bater[ií]as?",
  },
];
