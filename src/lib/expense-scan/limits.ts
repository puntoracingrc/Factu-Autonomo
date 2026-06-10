/** Límite del servidor tras optimización en el cliente (margen bajo el cupo de Vercel ~4,5 MB). */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_PDF_BYTES = 8 * 1024 * 1024;

/** Por encima de este tamaño las fotos se redimensionan/comprimen en el navegador. */
export const COMPRESS_IMAGE_ABOVE_BYTES = 1.5 * 1024 * 1024;

/** Objetivo de compresión para subida rápida y OCR nítido. */
export const TARGET_IMAGE_BYTES = 3 * 1024 * 1024;

export const MAX_IMAGE_DIMENSION = 2400;
