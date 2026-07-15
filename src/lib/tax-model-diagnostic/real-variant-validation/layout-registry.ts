import type { FiscalDocumentType } from "../extractors/contracts";
import { getExtractorDefinition } from "../extractors/registry";
import {
  REAL_VARIANT_LAYOUT_REGISTRY_VERSION,
  type DocumentLayoutVersion,
  type LayoutResolution,
} from "./contracts";
import {
  CURRENT_CORPUS_INVENTORY,
  isRealVariantFamily,
} from "./family-registry";

function buildLayout(
  inventory: (typeof CURRENT_CORPUS_INVENTORY)[number],
  layoutId: string,
): DocumentLayoutVersion {
  const extractor = getExtractorDefinition(inventory.family);
  if (!extractor) {
    throw new Error(`Extractor no registrado para ${inventory.family}`);
  }
  const boxNumberMap = Object.fromEntries(
    extractor.fieldDefinitions
      .filter((field) => field.officialBoxNumber !== null)
      .map((field) => [field.fieldId, field.officialBoxNumber as string]),
  );
  const labelAnchors = [
    ...new Set(
      extractor.fieldDefinitions.flatMap((field) => [
        ...field.possibleLabels,
        ...field.anchorLabels,
      ]),
    ),
  ];
  const isPortalView = inventory.family.includes("_VIEW");
  return Object.freeze({
    registryVersion: REAL_VARIANT_LAYOUT_REGISTRY_VERSION,
    family: inventory.family,
    authority: inventory.authority,
    territory: "ES_COMMON" as const,
    fiscalYear: inventory.fiscalYears[0],
    layoutId,
    validFrom: null,
    validTo: null,
    generationChannel: isPortalView
      ? ("SCREEN_CAPTURE" as const)
      : ("SYNTHETIC_FACSIMILE" as const),
    pageCountRange: Object.freeze([1, isPortalView ? 20 : 50]) as readonly [
      number,
      number,
    ],
    pageFingerprints: Object.freeze([]),
    titleAnchors: Object.freeze([...extractor.detectors]),
    labelAnchors: Object.freeze(labelAnchors),
    boxNumberMap: Object.freeze(boxNumberMap),
    formFieldMap: Object.freeze({}),
    tableDefinitions: Object.freeze([...extractor.tableDefinitions]),
    textOrderNotes: Object.freeze([
      "El corpus actual es sintético; el orden de lectura real sigue pendiente de variantes oficiales.",
    ]),
    fontNotes: Object.freeze([
      "Fuentes y mapas ToUnicode reales pendientes de admisión.",
    ]),
    knownVariants: Object.freeze(
      inventory.rasterOrOcrCount > 0
        ? [
            "NATIVE_TEXT_PDF",
            "RASTER_SCAN_COMPRESSED",
            "RASTER_ROTATED_CAPTURE",
          ]
        : ["NATIVE_OR_SCREEN_SYNTHETIC"],
    ),
    extractorVersion: extractor.extractorId,
    officialSourceReferences: Object.freeze([...extractor.officialSources]),
    sourceHash: "HASH_PENDING" as const,
    reviewStatus: "SYNTHETIC_ONLY" as const,
    firstSeenAt: "2026-07-14",
    lastVerifiedAt: "2026-07-15",
  });
}

export const DOCUMENT_LAYOUT_REGISTRY: readonly DocumentLayoutVersion[] =
  Object.freeze(
    CURRENT_CORPUS_INVENTORY.flatMap((inventory) =>
      inventory.layoutIds.map((layoutId) => buildLayout(inventory, layoutId)),
    ),
  );

export interface ResolveDocumentLayoutInput {
  family: unknown;
  fiscalYear: unknown;
  layoutId: unknown;
}

export function resolveDocumentLayout(
  input: ResolveDocumentLayoutInput,
): LayoutResolution {
  if (!isRealVariantFamily(input.family)) {
    return Object.freeze({
      status: "UNSUPPORTED_DOCUMENT",
      layout: null,
      mayAutoConfirm: false,
      requiresManualReview: true,
    });
  }
  if (
    !Number.isInteger(input.fiscalYear) ||
    typeof input.layoutId !== "string" ||
    input.layoutId.length === 0
  ) {
    return Object.freeze({
      status: "KNOWN_FAMILY_UNKNOWN_LAYOUT",
      layout: null,
      mayAutoConfirm: false,
      requiresManualReview: true,
    });
  }
  const layout = DOCUMENT_LAYOUT_REGISTRY.find(
    (candidate) =>
      candidate.family === input.family &&
      candidate.fiscalYear === input.fiscalYear &&
      candidate.layoutId === input.layoutId,
  );
  if (layout) {
    return Object.freeze({
      status: "KNOWN_LAYOUT",
      layout: { ...layout },
      mayAutoConfirm: false,
      requiresManualReview: true,
    });
  }
  const familyLayouts = DOCUMENT_LAYOUT_REGISTRY.filter(
    (candidate) => candidate.family === input.family,
  );
  const latestKnownYear = Math.max(
    ...familyLayouts.map((candidate) => candidate.fiscalYear),
  );
  return Object.freeze({
    status:
      Number(input.fiscalYear) > latestKnownYear
        ? "UNSUPPORTED_LAYOUT_NEEDS_REVIEW"
        : "KNOWN_FAMILY_UNKNOWN_LAYOUT",
    layout: null,
    mayAutoConfirm: false,
    requiresManualReview: true,
  });
}

export function readDocumentLayoutRegistry(): readonly DocumentLayoutVersion[] {
  return DOCUMENT_LAYOUT_REGISTRY.map((layout) => ({
    ...layout,
    pageCountRange: [...layout.pageCountRange] as [number, number],
    pageFingerprints: [...layout.pageFingerprints],
    titleAnchors: [...layout.titleAnchors],
    labelAnchors: [...layout.labelAnchors],
    boxNumberMap: { ...layout.boxNumberMap },
    formFieldMap: { ...layout.formFieldMap },
    tableDefinitions: [...layout.tableDefinitions],
    textOrderNotes: [...layout.textOrderNotes],
    fontNotes: [...layout.fontNotes],
    knownVariants: [...layout.knownVariants],
    officialSourceReferences: [...layout.officialSourceReferences],
  }));
}

export function hasLayoutForFamily(family: FiscalDocumentType): boolean {
  return DOCUMENT_LAYOUT_REGISTRY.some((layout) => layout.family === family);
}
