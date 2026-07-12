import type {
  FiscalModelPageDescriptorReleaseV1,
  FiscalModelPageDescriptorV1,
  FiscalModelPageFieldProvenanceV1,
} from "../contracts.v1";
import { FISCAL_MODEL_PAGE_DESCRIPTOR_SCHEMA_VERSION_V1 } from "../contracts.v1";

function freezeProvenance(
  provenance: readonly FiscalModelPageFieldProvenanceV1[],
): readonly FiscalModelPageFieldProvenanceV1[] {
  return Object.freeze(
    provenance.map((entry) =>
      entry.origin === "OFFICIAL_SOURCE"
        ? Object.freeze({
            ...entry,
            sourceIds: Object.freeze([...entry.sourceIds]) as readonly [
              string,
              ...string[],
            ],
          })
        : Object.freeze({ ...entry }),
    ),
  );
}

function freezeDescriptor(
  descriptor: FiscalModelPageDescriptorV1,
): FiscalModelPageDescriptorV1 {
  return Object.freeze({
    ...descriptor,
    sourceIds: Object.freeze([...descriptor.sourceIds]),
    provenance: freezeProvenance(descriptor.provenance),
  }) as FiscalModelPageDescriptorV1;
}

export const FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1: FiscalModelPageDescriptorReleaseV1 =
  Object.freeze({
    id: "fiscal-model-pages-descriptor-v1",
    schemaVersion: FISCAL_MODEL_PAGE_DESCRIPTOR_SCHEMA_VERSION_V1,
    status: "DRAFT_LOCAL_PREVIEW",
    createdAt: "2026-07-12T15:00:00Z",
    modelCatalogReleaseId: "fiscal-models-foundation-2026-v1",
    sourceRegistryVersion: "2026-07-12.foundation.v1",
  });

export const FISCAL_MODEL_PAGE_DESCRIPTORS_V1: readonly FiscalModelPageDescriptorV1[] =
  Object.freeze([
    freezeDescriptor({
      descriptorSchemaVersion:
        FISCAL_MODEL_PAGE_DESCRIPTOR_SCHEMA_VERSION_V1,
      descriptorReleaseId: FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1.id,
      descriptorContentVersion: "036-info-2026-v1",
      code: "036",
      canonicalPath: "/consultor-fiscal/modelos/036",
      canonicalName:
        "Censo de empresarios, profesionales y retenedores - Declaración censal de alta, modificación y baja",
      summary:
        "Ficha informativa del modelo censal 036 de alta, modificación y baja.",
      contentLevel: "METADATA_ONLY",
      lifecycleStatus: "ACTIVE",
      modelAvailability: "METADATA_ONLY",
      effectiveTo: null,
      modelReleaseId: "fiscal-models-foundation-2026-v1",
      modelContentVersion: "2026-foundation-v1",
      sourceRegistryVersion: "2026-07-12.foundation.v1",
      sourceIds: [
        "aeat.models.catalog",
        "aeat.model.036.procedure",
        "aeat.model.036.guide",
        "boe.model.036.base",
        "boe.census.hac-1526-2024",
      ],
      publicationStatus: "UNPUBLISHED",
      contentReviewStatus: "PENDING_REVIEW",
      href: null,
      provenance: [
        {
          field: "canonicalName",
          origin: "OFFICIAL_SOURCE",
          sourceIds: ["aeat.model.036.procedure"],
          reviewStatus: "PENDING_REVIEW",
        },
        {
          field: "summary",
          origin: "OFFICIAL_SOURCE",
          sourceIds: ["aeat.model.036.procedure"],
          reviewStatus: "PENDING_REVIEW",
        },
        {
          field: "contentLevel",
          origin: "FOUNDATION_CATALOG",
          modelReleaseId: "fiscal-models-foundation-2026-v1",
          modelContentVersion: "2026-foundation-v1",
          reviewStatus: "PENDING_REVIEW",
        },
        {
          field: "lifecycleStatus",
          origin: "OFFICIAL_SOURCE",
          sourceIds: [
            "aeat.model.036.procedure",
            "boe.census.hac-1526-2024",
          ],
          reviewStatus: "PENDING_REVIEW",
        },
        {
          field: "effectiveTo",
          origin: "FOUNDATION_CATALOG",
          modelReleaseId: "fiscal-models-foundation-2026-v1",
          modelContentVersion: "2026-foundation-v1",
          reviewStatus: "PENDING_REVIEW",
        },
        {
          field: "modelAvailability",
          origin: "FOUNDATION_CATALOG",
          modelReleaseId: "fiscal-models-foundation-2026-v1",
          modelContentVersion: "2026-foundation-v1",
          reviewStatus: "PENDING_REVIEW",
        },
      ],
    }),
    freezeDescriptor({
      descriptorSchemaVersion:
        FISCAL_MODEL_PAGE_DESCRIPTOR_SCHEMA_VERSION_V1,
      descriptorReleaseId: FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1.id,
      descriptorContentVersion: "303-info-2026-v1",
      code: "303",
      canonicalPath: "/consultor-fiscal/modelos/303",
      canonicalName: "IVA. Autoliquidación",
      summary: "Ficha informativa del modelo 303 de autoliquidación del IVA.",
      contentLevel: "METADATA_ONLY",
      lifecycleStatus: "ACTIVE",
      modelAvailability: "METADATA_ONLY",
      effectiveTo: null,
      modelReleaseId: "fiscal-models-foundation-2026-v1",
      modelContentVersion: "2026-foundation-v1",
      sourceRegistryVersion: "2026-07-12.foundation.v1",
      sourceIds: [
        "aeat.models.catalog",
        "aeat.model.303.procedure",
        "aeat.model.303.instructions-2026",
        "boe.model.303.base",
      ],
      publicationStatus: "UNPUBLISHED",
      contentReviewStatus: "PENDING_REVIEW",
      href: null,
      provenance: [
        {
          field: "canonicalName",
          origin: "OFFICIAL_SOURCE",
          sourceIds: ["aeat.model.303.procedure"],
          reviewStatus: "PENDING_REVIEW",
        },
        {
          field: "summary",
          origin: "OFFICIAL_SOURCE",
          sourceIds: ["aeat.model.303.procedure"],
          reviewStatus: "PENDING_REVIEW",
        },
        {
          field: "contentLevel",
          origin: "FOUNDATION_CATALOG",
          modelReleaseId: "fiscal-models-foundation-2026-v1",
          modelContentVersion: "2026-foundation-v1",
          reviewStatus: "PENDING_REVIEW",
        },
        {
          field: "lifecycleStatus",
          origin: "OFFICIAL_SOURCE",
          sourceIds: [
            "aeat.model.303.procedure",
            "boe.model.303.base",
          ],
          reviewStatus: "PENDING_REVIEW",
        },
        {
          field: "effectiveTo",
          origin: "FOUNDATION_CATALOG",
          modelReleaseId: "fiscal-models-foundation-2026-v1",
          modelContentVersion: "2026-foundation-v1",
          reviewStatus: "PENDING_REVIEW",
        },
        {
          field: "modelAvailability",
          origin: "FOUNDATION_CATALOG",
          modelReleaseId: "fiscal-models-foundation-2026-v1",
          modelContentVersion: "2026-foundation-v1",
          reviewStatus: "PENDING_REVIEW",
        },
      ],
    }),
    freezeDescriptor({
      descriptorSchemaVersion:
        FISCAL_MODEL_PAGE_DESCRIPTOR_SCHEMA_VERSION_V1,
      descriptorReleaseId: FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1.id,
      descriptorContentVersion: "037-historical-info-v1",
      code: "037",
      canonicalPath: "/consultor-fiscal/modelos/037",
      canonicalName: "Declaración censal simplificada",
      summary:
        "Ficha histórica del modelo 037, sin vigencia como modelo actual.",
      contentLevel: "HISTORICAL_INFO_ONLY",
      lifecycleStatus: "HISTORICAL",
      modelAvailability: "HISTORICAL_ONLY",
      effectiveTo: "2025-02-02",
      modelReleaseId: "fiscal-models-foundation-2026-v1",
      modelContentVersion: "historical-through-2025-02-02-v1",
      sourceRegistryVersion: "2026-07-12.foundation.v1",
      sourceIds: [
        "aeat.model.037.retirement",
        "boe.census.hac-1526-2024",
      ],
      publicationStatus: "UNPUBLISHED",
      contentReviewStatus: "PENDING_REVIEW",
      href: null,
      provenance: [
        {
          field: "canonicalName",
          origin: "OFFICIAL_SOURCE",
          sourceIds: [
            "aeat.model.037.retirement",
            "boe.census.hac-1526-2024",
          ],
          reviewStatus: "PENDING_REVIEW",
        },
        {
          field: "summary",
          origin: "OFFICIAL_SOURCE",
          sourceIds: ["aeat.model.037.retirement"],
          reviewStatus: "PENDING_REVIEW",
        },
        {
          field: "contentLevel",
          origin: "FOUNDATION_CATALOG",
          modelReleaseId: "fiscal-models-foundation-2026-v1",
          modelContentVersion: "historical-through-2025-02-02-v1",
          reviewStatus: "PENDING_REVIEW",
        },
        {
          field: "lifecycleStatus",
          origin: "OFFICIAL_SOURCE",
          sourceIds: [
            "aeat.model.037.retirement",
            "boe.census.hac-1526-2024",
          ],
          reviewStatus: "PENDING_REVIEW",
        },
        {
          field: "effectiveTo",
          origin: "OFFICIAL_SOURCE",
          sourceIds: [
            "aeat.model.037.retirement",
            "boe.census.hac-1526-2024",
          ],
          reviewStatus: "PENDING_REVIEW",
        },
        {
          field: "modelAvailability",
          origin: "FOUNDATION_CATALOG",
          modelReleaseId: "fiscal-models-foundation-2026-v1",
          modelContentVersion: "historical-through-2025-02-02-v1",
          reviewStatus: "PENDING_REVIEW",
        },
      ],
    }),
  ]);
