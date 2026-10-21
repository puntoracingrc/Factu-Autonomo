import { QUICK_AI_IMAGE_BYTES } from "@/lib/quick-invoicing/ai-fill";

/** Re-encode only on demand: removes photo metadata and bounds mobile uploads. */
export async function prepareQuickAiImage(file: File): Promise<{ mimeType: string; base64: string; preview: string }> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Usa una foto JPG, PNG o WebP. Los PDF no se admiten aquí.");
  if (!file.size || file.size > 20 * 1024 * 1024) throw new Error("La foto debe ocupar menos de 20 MB. Prueba una captura o una foto más pequeña.");
  const source = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("No se pudo abrir la imagen. Prueba otra foto.")); image.src = source; });
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error("La imagen tiene demasiada resolución. Usa una captura o una foto de menor tamaño.");
    const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar la foto en este navegador.");
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.88, 0.72, 0.55]) {
      const preview = canvas.toDataURL("image/jpeg", quality);
      const base64 = preview.slice(preview.indexOf(",") + 1);
      if (base64.length * 3 / 4 <= QUICK_AI_IMAGE_BYTES) return { mimeType: "image/jpeg", base64, preview };
    }
    throw new Error("La imagen sigue siendo demasiado grande. Recorta lo que no necesites y vuelve a probar.");
  } finally { URL.revokeObjectURL(source); image.src = ""; }
}
