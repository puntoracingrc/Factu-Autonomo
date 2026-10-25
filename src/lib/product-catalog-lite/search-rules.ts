/** Product-kind rules for the lightweight catalog. Add confirmed vocabulary here;
 * descriptions remain searchable for other terms, without changing product data. */
export interface CatalogSearchRule {
  terms: readonly string[];
  pattern: string;
  /** Require the name or subfamily to start with the product kind. */
  identityPrefixOnly?: boolean;
  /** These categories describe another product, even when they mention this kind. */
  excludedCategories: string;
  /** A named component before the searched kind: "motor con mando", for example. */
  excludedNamePrefixes: string;
}

const lamaAccessories = "tirantes?|topes?|conteras?|tap[oó]n(es)?|flejes?|embudos?|clips?|soportes?|gu[ií]as?";

export const CATALOG_SEARCH_RULES: readonly CatalogSearchRule[] = [
  {
    terms: ["guia", "guias"],
    pattern: "gu[ií]as?",
    excludedCategories: "basculador(es)?",
    excludedNamePrefixes: "basculador(es)?",
  },
  {
    terms: ["lama", "lamas"],
    pattern: "lamas?",
    identityPrefixOnly: true,
    // Lamas currently live under "Accesorios de persiana". Only the exact
    // complete-shutter family is excluded, alongside specific accessory kinds.
    excludedCategories: `^persianas?$|${lamaAccessories}`,
    excludedNamePrefixes: `persianas?|accesorios?|${lamaAccessories}`,
  },
  {
    terms: ["mando", "mandos", "emisor", "emisores"],
    pattern: "mandos?|emisor(es)?",
    excludedCategories: "motor(es)?|pilas?|bater[ií]as?",
    excludedNamePrefixes: "motor(es)?|operador(es)?|pilas?|bater[ií]as?",
  },
];
