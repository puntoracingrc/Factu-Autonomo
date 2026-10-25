import type { CatalogEdit } from "./model";

function comparable(value: unknown): unknown {
  if (typeof value === "string") return value.replace(/\r\n?/g, "\n");
  if (Array.isArray(value)) return value.map(comparable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, comparable(item)]),
    );
  return value;
}

/** Compare form values, not JSON property order or an absent optional unit. */
export function catalogEditHasChanges(
  original: CatalogEdit,
  draft: CatalogEdit,
): boolean {
  const form = (edit: CatalogEdit) =>
    comparable({
      ...edit,
      attributes: edit.attributes.map((attribute) => ({
        ...attribute,
        unit: attribute.unit ?? "",
      })),
    });
  return JSON.stringify(form(original)) !== JSON.stringify(form(draft));
}
