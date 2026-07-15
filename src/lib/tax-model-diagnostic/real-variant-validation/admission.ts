import type {
  CorpusAdmissionDecision,
  PdfInspectionSnapshot,
  PiiScanResult,
  RealVariantManifest,
} from "./contracts";

export const REAL_VARIANT_FILE_LIMITS = Object.freeze({
  maxBytes: 25 * 1024 * 1024,
  maxPages: 200,
  maxPageDimensionPoints: 20_000,
});

function unique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)]);
}

export function evaluateCorpusAdmission(
  manifest: RealVariantManifest,
  inspection: PdfInspectionSnapshot,
  piiScan: PiiScanResult,
  knownHashes: readonly string[] = [],
): CorpusAdmissionDecision {
  const blockingCodes: string[] = [];
  const warningCodes: string[] = [];

  if (!inspection.hasPdfHeader) blockingCodes.push("INVALID_PDF_HEADER");
  if (!inspection.parseable) blockingCodes.push("UNPARSEABLE_PDF");
  if (inspection.unexpectedlyTruncated) {
    blockingCodes.push("UNEXPECTED_TRUNCATION");
  }
  if (inspection.encrypted) blockingCodes.push("ENCRYPTED_PDF");
  if (inspection.byteLength <= 0) blockingCodes.push("EMPTY_FILE");
  if (inspection.byteLength > REAL_VARIANT_FILE_LIMITS.maxBytes) {
    blockingCodes.push("FILE_TOO_LARGE");
  }
  if (
    inspection.pageCount < 1 ||
    inspection.pageCount > REAL_VARIANT_FILE_LIMITS.maxPages
  ) {
    blockingCodes.push("PAGE_COUNT_OUT_OF_RANGE");
  }
  if (
    inspection.pageSizes.some(
      ({ width, height }) =>
        width <= 0 ||
        height <= 0 ||
        width > REAL_VARIANT_FILE_LIMITS.maxPageDimensionPoints ||
        height > REAL_VARIANT_FILE_LIMITS.maxPageDimensionPoints,
    )
  ) {
    blockingCodes.push("EXTREME_PAGE_DIMENSIONS");
  }
  if (inspection.hasJavaScript) blockingCodes.push("PDF_JAVASCRIPT_PRESENT");
  if (inspection.embeddedFileCount > 0) {
    blockingCodes.push("EMBEDDED_FILES_PRESENT");
  }
  if (inspection.malformedCriticalObjectCount > 0) {
    blockingCodes.push("MALFORMED_CRITICAL_OBJECT");
  }
  if (inspection.sha256 !== manifest.sha256) {
    blockingCodes.push("SHA256_MISMATCH");
  }
  if (knownHashes.includes(inspection.sha256)) {
    blockingCodes.push("DUPLICATE_SHA256");
  }
  if (inspection.pageCount !== manifest.observedPageCount) {
    blockingCodes.push("OBSERVED_PAGE_COUNT_MISMATCH");
  }
  if (
    inspection.declaredPageCount !== null &&
    inspection.declaredPageCount !== inspection.pageCount
  ) {
    blockingCodes.push("DECLARED_PAGE_COUNT_MISMATCH");
  }
  if (!piiScan.safeForCorpus) blockingCodes.push("PII_SCAN_BLOCKED");
  if (inspection.externalLinkCount > 0) {
    warningCodes.push("EXTERNAL_LINKS_IGNORED");
  }
  if (!manifest.completeDocument) warningCodes.push("INCOMPLETE_DOCUMENT");
  if (manifest.documentKind === "PARTIAL_SCREEN_CAPTURE") {
    warningCodes.push("PARTIAL_CAPTURE_CANNOT_PROVE_ABSENCE");
  }
  if (
    manifest.sourceClass === "SYNTHETIC" ||
    manifest.sourceClass === "OFFICIAL_SYNTHETIC"
  ) {
    warningCodes.push("SYNTHETIC_SOURCE_NOT_REAL_COMPATIBILITY_EVIDENCE");
  }

  const outcome =
    blockingCodes.length > 0
      ? ("REJECT" as const)
      : warningCodes.length > 0
        ? ("ACCEPT_WITH_REVIEW" as const)
        : ("ACCEPT" as const);
  return Object.freeze({
    outcome,
    blockingCodes: unique(blockingCodes),
    warningCodes: unique(warningCodes),
  });
}
