import { describe, expect, expectTypeOf, it } from "vitest";
import { getFiscalModelByCode } from "../../catalog";
import {
  FISCAL_MODEL_SOURCES_V1,
  FISCAL_MODEL_SOURCE_REGISTRY_VERSION,
} from "../../catalog/sources.v1";
import { FISCAL_MODEL_FOUNDATION_RELEASE_V1 } from "../../fixtures/foundation-catalog.v1";
import type {
  FiscalModelPagePublishedDescriptorV1,
  FiscalModelPageResolveResultV1,
  FiscalModelPageRouteByCodeV1,
  FiscalModelPageUnpublishedDescriptorV1,
} from "../contracts.v1";
import { FISCAL_MODEL_PAGE_DESCRIPTOR_SCHEMA_VERSION_V1 } from "../contracts.v1";
import {
  FISCAL_MODEL_PAGE_DESCRIPTORS_V1,
  FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1,
} from "./descriptors.v1";

const DESCRIPTOR_KEYS = [
  "canonicalName",
  "canonicalPath",
  "code",
  "contentLevel",
  "contentReviewStatus",
  "descriptorContentVersion",
  "descriptorReleaseId",
  "descriptorSchemaVersion",
  "effectiveTo",
  "href",
  "lifecycleStatus",
  "modelAvailability",
  "modelContentVersion",
  "modelReleaseId",
  "provenance",
  "publicationStatus",
  "sourceIds",
  "sourceRegistryVersion",
  "summary",
] as const;

const RELEASE_KEYS = [
  "createdAt",
  "id",
  "modelCatalogReleaseId",
  "schemaVersion",
  "sourceRegistryVersion",
  "status",
] as const;

const PROVENANCE_FIELDS = [
  "canonicalName",
  "contentLevel",
  "effectiveTo",
  "lifecycleStatus",
  "modelAvailability",
  "summary",
] as const;

function collectKeys(value: unknown): readonly string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

describe("fiscal model page descriptor fixtures v1", () => {
  it("binds each model code to one literal canonical path at type level", () => {
    expectTypeOf<FiscalModelPageRouteByCodeV1["036"]>().toEqualTypeOf<
      "/consultor-fiscal/modelos/036"
    >();
    expectTypeOf<FiscalModelPageRouteByCodeV1["037"]>().toEqualTypeOf<
      "/consultor-fiscal/modelos/037"
    >();
    expectTypeOf<FiscalModelPageRouteByCodeV1["303"]>().toEqualTypeOf<
      "/consultor-fiscal/modelos/303"
    >();
    expectTypeOf<
      FiscalModelPageUnpublishedDescriptorV1<"036">["href"]
    >().toEqualTypeOf<null>();
    expectTypeOf<
      FiscalModelPagePublishedDescriptorV1<"036">["href"]
    >().toEqualTypeOf<"/consultor-fiscal/modelos/036">();
    expectTypeOf<
      FiscalModelPagePublishedDescriptorV1<"036">["contentReviewStatus"]
    >().toEqualTypeOf<"APPROVED">();
    type Available036 = Extract<
      FiscalModelPageResolveResultV1,
      { status: "AVAILABLE"; data: { code: "036" } }
    >;
    expectTypeOf<Available036["href"]>().toEqualTypeOf<
      "/consultor-fiscal/modelos/036"
    >();
    expectTypeOf<Available036["data"]["href"]>().toEqualTypeOf<
      Available036["href"]
    >();
  });

  it("keeps the release draft and the model set exact", () => {
    expect(FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1).toEqual({
      id: "fiscal-model-pages-descriptor-v1",
      schemaVersion: FISCAL_MODEL_PAGE_DESCRIPTOR_SCHEMA_VERSION_V1,
      status: "DRAFT_LOCAL_PREVIEW",
      createdAt: "2026-07-12T15:00:00Z",
      modelCatalogReleaseId: FISCAL_MODEL_FOUNDATION_RELEASE_V1.id,
      sourceRegistryVersion: FISCAL_MODEL_SOURCE_REGISTRY_VERSION,
    });
    expect(
      FISCAL_MODEL_PAGE_DESCRIPTORS_V1.map((descriptor) =>
        descriptor.code,
      ).sort(),
    ).toEqual(["036", "037", "303"]);
  });

  it("starts every known page unpublished, pending, and without a link", () => {
    const expectedPaths = {
      "036": "/consultor-fiscal/modelos/036",
      "037": "/consultor-fiscal/modelos/037",
      "303": "/consultor-fiscal/modelos/303",
    } as const;

    for (const descriptor of FISCAL_MODEL_PAGE_DESCRIPTORS_V1) {
      expect(descriptor).toMatchObject({
        publicationStatus: "UNPUBLISHED",
        contentReviewStatus: "PENDING_REVIEW",
        href: null,
      });
      expect(descriptor.canonicalPath).toBe(expectedPaths[descriptor.code]);
      expect(descriptor.canonicalPath).not.toMatch(/[?#]/);
      expect(descriptor.canonicalPath).not.toContain("://");
      expect(descriptor.canonicalPath).not.toContain("..");
    }
    expect(
      new Set(
        FISCAL_MODEL_PAGE_DESCRIPTORS_V1.map(
          (descriptor) => descriptor.canonicalPath,
        ),
      ).size,
    ).toBe(FISCAL_MODEL_PAGE_DESCRIPTORS_V1.length);
  });

  it("keeps 036 and 303 metadata-only and 037 historical-only", () => {
    for (const code of ["036", "303"] as const) {
      expect(
        FISCAL_MODEL_PAGE_DESCRIPTORS_V1.find(
          (descriptor) => descriptor.code === code,
        ),
      ).toMatchObject({
        lifecycleStatus: "ACTIVE",
        modelAvailability: "METADATA_ONLY",
        contentLevel: "METADATA_ONLY",
        effectiveTo: null,
      });
    }

    const historical = FISCAL_MODEL_PAGE_DESCRIPTORS_V1.find(
      (descriptor) => descriptor.code === "037",
    );
    expect(historical).toMatchObject({
      lifecycleStatus: "HISTORICAL",
      modelAvailability: "HISTORICAL_ONLY",
      contentLevel: "HISTORICAL_INFO_ONLY",
      effectiveTo: "2025-02-02",
      href: null,
    });
    expect(historical).not.toHaveProperty("replacementModel");
  });

  it("matches Batch A identity, versions, and source membership", () => {
    const sourceIds = new Set(FISCAL_MODEL_SOURCES_V1.map((source) => source.id));

    for (const descriptor of FISCAL_MODEL_PAGE_DESCRIPTORS_V1) {
      const model = getFiscalModelByCode(descriptor.code);
      expect(model).toBeDefined();
      expect(descriptor).toMatchObject({
        canonicalName: model?.canonicalName,
        lifecycleStatus: model?.lifecycleStatus,
        modelAvailability: model?.availability,
        effectiveTo: model?.effectiveTo,
        modelReleaseId: model?.releaseId,
        modelContentVersion: model?.contentVersion,
        sourceRegistryVersion: FISCAL_MODEL_SOURCE_REGISTRY_VERSION,
      });
      expect(model?.releaseId).toBe(FISCAL_MODEL_FOUNDATION_RELEASE_V1.id);
      expect(descriptor.modelReleaseId).toBe(
        FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1.modelCatalogReleaseId,
      );
      expect(descriptor.sourceIds).toEqual(model?.sourceIds);
      expect(descriptor.sourceIds.every((sourceId) => sourceIds.has(sourceId))).toBe(
        true,
      );
    }
  });

  it("keeps provenance complete, pending, and limited to each model's sources", () => {
    for (const descriptor of FISCAL_MODEL_PAGE_DESCRIPTORS_V1) {
      expect(
        descriptor.provenance.map((entry) => entry.field).sort(),
      ).toEqual([...PROVENANCE_FIELDS].sort());
      const allowedSourceIds = new Set(descriptor.sourceIds);

      for (const entry of descriptor.provenance) {
        expect(entry.reviewStatus).toBe("PENDING_REVIEW");
        if (entry.origin === "OFFICIAL_SOURCE") {
          expect(entry.sourceIds.length).toBeGreaterThan(0);
          expect(
            entry.sourceIds.every((sourceId) => allowedSourceIds.has(sourceId)),
          ).toBe(true);
        } else {
          expect(entry).toMatchObject({
            modelReleaseId: descriptor.modelReleaseId,
            modelContentVersion: descriptor.modelContentVersion,
          });
        }
      }
    }

    for (const source of FISCAL_MODEL_SOURCES_V1) {
      expect(source).toMatchObject({
        verificationStatus: "HASH_PENDING",
        reviewStatus: "PENDING_REVIEW",
        contentHash: null,
      });
    }
  });

  it("uses an exact metadata-only schema with no tax or filing logic", () => {
    expect(Object.keys(FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1).sort()).toEqual(
      [...RELEASE_KEYS].sort(),
    );
    for (const descriptor of FISCAL_MODEL_PAGE_DESCRIPTORS_V1) {
      expect(Object.keys(descriptor).sort()).toEqual([...DESCRIPTOR_KEYS].sort());
    }

    const forbiddenKeys = new Set([
      "amount",
      "amountCents",
      "box",
      "boxes",
      "calculation",
      "deadline",
      "filingAction",
      "filingUrl",
      "obligation",
      "payment",
      "recommendation",
      "replacementModel",
      "signature",
      "submitUrl",
      "supportedTaxYears",
      "taxBox",
    ]);
    expect(
      collectKeys(FISCAL_MODEL_PAGE_DESCRIPTORS_V1).filter((key) =>
        forbiddenKeys.has(key),
      ),
    ).toEqual([]);
  });

  it("deep-freezes release, descriptors, source ids, and provenance", () => {
    const descriptor = FISCAL_MODEL_PAGE_DESCRIPTORS_V1[0];
    expect(Object.isFrozen(FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1)).toBe(true);
    expect(Object.isFrozen(FISCAL_MODEL_PAGE_DESCRIPTORS_V1)).toBe(true);
    expect(Object.isFrozen(descriptor)).toBe(true);
    expect(Object.isFrozen(descriptor.sourceIds)).toBe(true);
    expect(Object.isFrozen(descriptor.provenance)).toBe(true);
    expect(Object.isFrozen(descriptor.provenance[0])).toBe(true);
    const official = descriptor.provenance.find(
      (entry) => entry.origin === "OFFICIAL_SOURCE",
    );
    expect(official?.origin).toBe("OFFICIAL_SOURCE");
    if (official?.origin === "OFFICIAL_SOURCE") {
      expect(Object.isFrozen(official.sourceIds)).toBe(true);
    }
  });
});
