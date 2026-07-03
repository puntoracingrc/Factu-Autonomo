import type { ProductAttribute } from "./types";

export const PRODUCT_ATTRIBUTE_SUGGESTIONS = [
  "Marca",
  "Modelo",
  "Serie",
  "SKU",
  "GTIN/EAN",
  "MPN",
  "Referencia proveedor",
  "Fabricante",
  "Talla",
  "Color",
  "Material",
  "Acabado",
  "Composición",
  "Textura",
  "Uso",
  "Largo",
  "Ancho",
  "Alto",
  "Grosor",
  "Diámetro",
  "Peso",
  "Volumen",
  "Capacidad",
  "Formato",
  "Envase",
  "Pack",
  "Potencia",
  "Voltaje",
  "Rosca",
  "Compatibilidad",
  "Caducidad",
  "Lama",
  "Cajón",
  "Guía",
  "Motor",
  "Accionamiento",
  "Tejido",
  "Transparencia",
  "Caída",
] as const;

function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function keyFromLabel(label: string): string {
  return cleanText(label)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function productAttributesToText(
  attributes?: ProductAttribute[],
): string {
  return (attributes ?? [])
    .filter((item) => item.label.trim() && item.value.trim())
    .map((item) => {
      const unit = item.unit?.trim();
      return `${item.label.trim()}: ${item.value.trim()}${unit ? ` ${unit}` : ""}`;
    })
    .join("\n");
}

export function productAttributesFromText(text: string): ProductAttribute[] {
  const seen = new Set<string>();
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([^:=]+)[:=](.+)$/);
      if (!match) return null;
      const label = cleanText(match[1]);
      const value = cleanText(match[2]);
      if (!label || !value) return null;
      const key = keyFromLabel(label);
      if (!key || seen.has(key)) return null;
      seen.add(key);
      return { key, label, value };
    })
    .filter((item): item is ProductAttribute => Boolean(item));
}

export function addProductAttributeLine(text: string, label: string): string {
  const cleanLabel = cleanText(label);
  if (!cleanLabel) return text;
  const key = keyFromLabel(cleanLabel);
  const exists = productAttributesFromText(text).some((item) => item.key === key);
  if (exists) return text;
  return [text.trim(), `${cleanLabel}: `].filter(Boolean).join("\n");
}
