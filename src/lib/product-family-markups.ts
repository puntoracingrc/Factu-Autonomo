import { roundMoney } from "./calculations";
import type { ProductFamilyMarkupSettings } from "./types";

export {
  renameProductFamilyInAppData,
  type ProductFamilyRenameResult,
} from "./product-catalog-structure";

export const MAX_PRODUCT_FAMILY_MARKUP_PERCENT = 300;

function cleanFamily(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeProductFamilyMarkupPercent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return roundMoney(
    Math.min(Math.max(value, 0), MAX_PRODUCT_FAMILY_MARKUP_PERCENT),
  );
}

export function normalizeProductFamilyMarkupSettings(
  settings?: Partial<ProductFamilyMarkupSettings>,
): ProductFamilyMarkupSettings {
  const seen = new Set<string>();
  const rules = (settings?.rules ?? [])
    .map((rule) => {
      const family = cleanFamily(rule.family);
      if (!family) return null;
      const key = family.toLocaleLowerCase("es");
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        id:
          typeof rule.id === "string" && rule.id.trim()
            ? rule.id.trim()
            : `markup-${key.replace(/[^a-z0-9]+/gi, "-")}`,
        family,
        markupPercent: normalizeProductFamilyMarkupPercent(rule.markupPercent),
      };
    })
    .filter((rule): rule is ProductFamilyMarkupSettings["rules"][number] =>
      Boolean(rule),
    );

  return { rules };
}

export function productFamilyMarkupPercent(
  family: string | undefined,
  settings?: ProductFamilyMarkupSettings,
): number {
  const normalizedFamily = cleanFamily(family).toLocaleLowerCase("es");
  if (!normalizedFamily) return 0;
  const normalized = normalizeProductFamilyMarkupSettings(settings);
  return (
    normalized.rules.find(
      (rule) => rule.family.toLocaleLowerCase("es") === normalizedFamily,
    )?.markupPercent ?? 0
  );
}
