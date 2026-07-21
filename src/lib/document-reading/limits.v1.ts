export const DOCUMENT_READING_LIMITS_V1 = Object.freeze({
  maxIdentifierChars: 160,
  maxPdfBytes: 4 * 1024 * 1024,
  maxPdfPages: 80,
  maxTextItemsPerPage: 5_000,
  maxTextItemsTotal: 50_000,
  maxTextItemChars: 32_768,
  maxTextChars: 500_000,
  maxLayoutRowsPerPage: 5_000,
  maxLayoutCellsTotal: 50_000,
  maxLayoutTextChars: 500_000,
  maxLayoutCoordinateMilli: 10_000_000,
  timeoutMs: 15_000,
} as const);
