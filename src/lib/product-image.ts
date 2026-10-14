/** Small, self-contained raster illustrations; never URLs or active SVG content. */
export const PRODUCT_IMAGE_MAX_BYTES = 48 * 1024;
export const PRODUCT_IMAGE_MAX_SIDE = 512;

export function isProductImageDataUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > PRODUCT_IMAGE_MAX_BYTES * 4 / 3 + 32) return false;
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  try {
    const raw = atob(match[2]);
    if (raw.length > PRODUCT_IMAGE_MAX_BYTES) return false;
    const b = (i: number) => raw.charCodeAt(i);
    let width = 0, height = 0;
    if (match[1] === "png") {
      if (raw.length < 45 || raw.slice(0, 8) !== "\x89PNG\r\n\x1a\n" || raw.slice(12, 16) !== "IHDR" || raw.slice(-8, -4) !== "IEND") return false;
      const uint32 = (i: number) => b(i) * 0x1000000 + b(i + 1) * 0x10000 + b(i + 2) * 0x100 + b(i + 3);
      width = uint32(16); height = uint32(20);
    } else {
      if (b(0) !== 0xff || b(1) !== 0xd8 || raw.slice(-2) !== "\xff\xd9") return false;
      for (let offset = 2; offset + 8 < raw.length;) {
        if (b(offset) !== 0xff) return false;
        const marker = b(offset + 1);
        const size = b(offset + 2) * 256 + b(offset + 3);
        if ([0xc0, 0xc1, 0xc2].includes(marker)) {
          height = b(offset + 5) * 256 + b(offset + 6);
          width = b(offset + 7) * 256 + b(offset + 8);
          break;
        }
        if (size < 2) return false;
        offset += size + 2;
      }
    }
    return width > 0 && height > 0 && width <= PRODUCT_IMAGE_MAX_SIDE && height <= PRODUCT_IMAGE_MAX_SIDE;
  } catch { return false; }
}

/** Optional spread keeps the canonical shape/hash of every pre-image document unchanged. */
export function productImageSnapshot(value: unknown): { imageDataUrl?: string } {
  if (value === undefined || value === "") return {};
  if (!isProductImageDataUrl(value)) throw new Error("La imagen del producto no es válida. Usa PNG o JPG de hasta 512 px y 48 KB.");
  return { imageDataUrl: value };
}

export async function prepareProductImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Formato no admitido. Selecciona una imagen PNG, JPG o WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("La imagen supera 5 MB. Selecciona un archivo más pequeño.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 32_000_000) throw new Error("Dimensiones de imagen no admitidas.");
    const scale = Math.min(1, PRODUCT_IMAGE_MAX_SIDE / image.naturalWidth, PRODUCT_IMAGE_MAX_SIDE / image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la imagen.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = canvas.toDataURL("image/png");
    if (isProductImageDataUrl(png)) return png;
    for (const quality of [0.8, 0.6, 0.4]) {
      const jpeg = canvas.toDataURL("image/jpeg", quality);
      if (isProductImageDataUrl(jpeg)) return jpeg;
    }
    throw new Error("La imagen sigue siendo demasiado grande. Usa un esquema más sencillo.");
  } finally { URL.revokeObjectURL(url); }
}
