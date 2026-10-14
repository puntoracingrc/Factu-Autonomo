import { sha256Hex } from "./document-integrity/snapshot-hash";
import { isProductImageDataUrl } from "./product-image";
import { purchaseProductKey } from "./purchase-products";
import type { Product } from "./types";

export interface ProductImageCatalogEntry {
  sourceId: string;
  sku: string;
  name: string;
  description: string;
  family: string;
  subfamily: string;
  aliases: string[];
  imageDataUrl: string;
}
export interface ProductImageCatalog {
  schema: "FACTU_PRODUCT_IMAGE_CATALOG_V1";
  catalogId: string;
  products: ProductImageCatalogEntry[];
}
function text(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}
export function parseProductImageCatalog(value: unknown): ProductImageCatalog {
  if (!value || typeof value !== "object") throw new Error("El archivo no es un catálogo de Factu.");
  const input = value as Record<string, unknown>;
  if (input.schema !== "FACTU_PRODUCT_IMAGE_CATALOG_V1" || !text(input.catalogId, 100) || !/^[a-z0-9_-]+$/i.test(input.catalogId) || !Array.isArray(input.products) || !input.products.length || input.products.length > 500) throw new Error("Formato de catálogo no admitido.");
  const ids = new Set<string>(), skus = new Set<string>();
  const products = input.products.map((raw): ProductImageCatalogEntry => {
    if (!raw || typeof raw !== "object") throw new Error("Ficha de producto no válida.");
    const p = raw as Record<string, unknown>;
    if (!text(p.sourceId, 160) || !text(p.sku, 64) || !text(p.name, 250) || !text(p.description, 6000) || !text(p.family, 100) || !text(p.subfamily, 100) || !Array.isArray(p.aliases) || p.aliases.length > 20 || !p.aliases.every(a=>text(a,100)) || !isProductImageDataUrl(p.imageDataUrl)) throw new Error("Hay una ficha incompleta o una imagen no válida en el catálogo.");
    if (ids.has(p.sourceId) || skus.has(p.sku.toUpperCase())) throw new Error("El archivo repite identificadores o referencias.");
    ids.add(p.sourceId); skus.add(p.sku.toUpperCase());
    return { sourceId:p.sourceId, sku:p.sku, name:p.name, description:p.description, family:p.family, subfamily:p.subfamily, aliases:p.aliases as string[], imageDataUrl:p.imageDataUrl };
  });
  return { schema:"FACTU_PRODUCT_IMAGE_CATALOG_V1", catalogId:input.catalogId, products };
}
export function catalogProductExternalId(catalogId: string, sourceId: string): string {
  return `image-catalog:${catalogId}:${sourceId}`;
}
export function materializeCatalogProduct(catalogId: string, entry: ProductImageCatalogEntry, ownerScope: string, now: string, ivaPercent: number): Product {
  const externalId = catalogProductExternalId(catalogId,entry.sourceId);
  const h = sha256Hex(`${ownerScope}\0${externalId}`);
  return {
    id: `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`,
    // purchaseProductKey intentionally truncates long names to eight words.
    // Put a stable identity first so sibling material/opening variants stay distinct.
    key: purchaseProductKey(`${h.slice(0,16)} ${entry.sku} ${entry.name}`), externalId,
    sku: entry.sku, name:entry.name, family:entry.family, subfamily:entry.subfamily,
    aliases:entry.aliases.map(purchaseProductKey), imageDataUrl:entry.imageDataUrl,
    unit:"ud", ivaPercent, sales:{enabled:true,description:entry.description,unit:"ud",ivaPercent},
    notes:`Referencias originales: ${entry.aliases.join(", ")}. Precio pendiente de definir para cada trabajo.`,
    source:"manual",createdAt:now,updatedAt:now,
  };
}
/** Each independent admission is atomic and comfortably below the existing 1 MiB API limit. */
export function catalogAdmissionBatches(products: Product[]): Product[][] {
  const batches: Product[][] = []; let batch: Product[] = [], size = 0;
  for (const product of products) {
    const bytes = new TextEncoder().encode(JSON.stringify(product)).length + 512;
    if (bytes > 600_000) throw new Error("La ficha es demasiado grande.");
    if (batch.length >= 50 || size + bytes > 600_000) { batches.push(batch); batch=[];size=0; }
    batch.push(product);size+=bytes;
  }
  if (batch.length) batches.push(batch);
  return batches;
}
