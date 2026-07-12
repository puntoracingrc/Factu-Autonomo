import type {
  FiscalModelCatalogRelease,
  FiscalModelDefinition,
} from "../contracts";
import { FISCAL_MODEL_SOURCE_REGISTRY_VERSION } from "../catalog/sources.v1";

function frozenModel(
  model: FiscalModelDefinition,
): FiscalModelDefinition {
  return Object.freeze({
    ...model,
    supportedTaxYears: Object.freeze([...model.supportedTaxYears]),
    sourceIds: Object.freeze([...model.sourceIds]),
  });
}

export const FISCAL_MODEL_FOUNDATION_RELEASE_V1: FiscalModelCatalogRelease =
  Object.freeze({
    id: "fiscal-models-foundation-2026-v1",
    schemaVersion: "1.0.0",
    status: "DRAFT_LOCAL_PREVIEW",
    createdAt: "2026-07-12T11:17:37+02:00",
    sourceRegistryVersion: FISCAL_MODEL_SOURCE_REGISTRY_VERSION,
  });

export const FISCAL_MODEL_FOUNDATION_FIXTURES_V1: readonly FiscalModelDefinition[] =
  Object.freeze([
    frozenModel({
      code: "036",
      canonicalName:
        "Censo de empresarios, profesionales y retenedores - Declaración censal de alta, modificación y baja",
      category: "CENSUS",
      lifecycleStatus: "ACTIVE",
      availability: "METADATA_ONLY",
      effectiveFrom: null,
      effectiveTo: null,
      supportedTaxYears: [2026],
      parserLevel: "CATALOG_ONLY",
      reviewStatus: "PENDING_REVIEW",
      contentVersion: "2026-foundation-v1",
      releaseId: FISCAL_MODEL_FOUNDATION_RELEASE_V1.id,
      sourceIds: [
        "aeat.models.catalog",
        "aeat.model.036.procedure",
        "aeat.model.036.guide",
        "boe.model.036.base",
        "boe.census.hac-1526-2024",
      ],
    }),
    frozenModel({
      code: "303",
      canonicalName: "IVA. Autoliquidación",
      category: "VAT",
      lifecycleStatus: "ACTIVE",
      availability: "METADATA_ONLY",
      effectiveFrom: null,
      effectiveTo: null,
      supportedTaxYears: [2026],
      parserLevel: "CATALOG_ONLY",
      reviewStatus: "PENDING_REVIEW",
      contentVersion: "2026-foundation-v1",
      releaseId: FISCAL_MODEL_FOUNDATION_RELEASE_V1.id,
      sourceIds: [
        "aeat.models.catalog",
        "aeat.model.303.procedure",
        "aeat.model.303.instructions-2026",
        "boe.model.303.base",
      ],
    }),
    frozenModel({
      code: "037",
      canonicalName: "Declaración censal simplificada",
      category: "CENSUS",
      lifecycleStatus: "HISTORICAL",
      availability: "HISTORICAL_ONLY",
      effectiveFrom: null,
      effectiveTo: "2025-02-02",
      supportedTaxYears: [],
      parserLevel: "CATALOG_ONLY",
      reviewStatus: "PENDING_REVIEW",
      contentVersion: "historical-through-2025-02-02-v1",
      releaseId: FISCAL_MODEL_FOUNDATION_RELEASE_V1.id,
      sourceIds: [
        "aeat.model.037.retirement",
        "boe.census.hac-1526-2024",
      ],
    }),
  ]);
