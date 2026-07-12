import { describe, expect, it } from "vitest";
import { FISCAL_MODEL_SOURCES_V1 } from "../catalog/sources.v1";
import {
  FISCAL_MODEL_FOUNDATION_FIXTURES_V1,
  FISCAL_MODEL_FOUNDATION_RELEASE_V1,
} from "./foundation-catalog.v1";

const MODEL_METADATA_KEYS = [
  "availability",
  "canonicalName",
  "category",
  "code",
  "contentVersion",
  "effectiveFrom",
  "effectiveTo",
  "lifecycleStatus",
  "parserLevel",
  "releaseId",
  "reviewStatus",
  "sourceIds",
  "supportedTaxYears",
] as const;

const RELEASE_METADATA_KEYS = [
  "createdAt",
  "id",
  "schemaVersion",
  "sourceRegistryVersion",
  "status",
] as const;

const SOURCE_METADATA_KEYS = [
  "authority",
  "canonicalUrl",
  "contentHash",
  "contentVersion",
  "id",
  "officialUpdatedAt",
  "reviewStatus",
  "sourceType",
  "title",
  "verificationStatus",
  "verifiedAt",
] as const;

function collectKeys(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectKeys);

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

describe("fiscal models foundation fixtures v1", () => {
  it("keeps the release local, draft, and limited to the approved model set", () => {
    expect(FISCAL_MODEL_FOUNDATION_RELEASE_V1.status).toBe(
      "DRAFT_LOCAL_PREVIEW",
    );
    expect(
      FISCAL_MODEL_FOUNDATION_FIXTURES_V1.map((model) => model.code).sort(),
    ).toEqual(["036", "037", "303"]);
  });

  it("keeps 036 and 303 metadata-only and pending review", () => {
    const pilots = FISCAL_MODEL_FOUNDATION_FIXTURES_V1.filter(
      (model) => model.code !== "037",
    );

    expect(pilots).toHaveLength(2);
    for (const model of pilots) {
      expect(model).toMatchObject({
        lifecycleStatus: "ACTIVE",
        availability: "METADATA_ONLY",
        parserLevel: "CATALOG_ONLY",
        reviewStatus: "PENDING_REVIEW",
        supportedTaxYears: [2026],
      });
    }
  });

  it("keeps 037 historical, non-current, and without a 2026 filing year", () => {
    const historical = FISCAL_MODEL_FOUNDATION_FIXTURES_V1.find(
      (model) => model.code === "037",
    );

    expect(historical).toMatchObject({
      lifecycleStatus: "HISTORICAL",
      availability: "HISTORICAL_ONLY",
      effectiveTo: "2025-02-02",
      supportedTaxYears: [],
    });
  });

  it("contains no fiscal calculation, filing, deadline, or money fields", () => {
    const forbiddenKeys = new Set([
      "amount",
      "amounts",
      "box",
      "boxes",
      "calculation",
      "calculations",
      "deadline",
      "deadlines",
      "filingAction",
      "filingUrl",
      "obligation",
      "obligations",
      "recommendation",
      "recommendations",
    ]);

    expect(
      collectKeys(FISCAL_MODEL_FOUNDATION_FIXTURES_V1).filter((key) =>
        forbiddenKeys.has(key),
      ),
    ).toEqual([]);

    expect(Object.keys(FISCAL_MODEL_FOUNDATION_RELEASE_V1).sort()).toEqual(
      [...RELEASE_METADATA_KEYS].sort(),
    );
    for (const model of FISCAL_MODEL_FOUNDATION_FIXTURES_V1) {
      expect(Object.keys(model).sort()).toEqual([...MODEL_METADATA_KEYS].sort());
    }
    for (const source of FISCAL_MODEL_SOURCES_V1) {
      expect(Object.keys(source).sort()).toEqual([
        ...SOURCE_METADATA_KEYS,
      ].sort());
    }
  });

  it("uses only pending HTTPS AEAT/BOE sources with no claimed content hash", () => {
    const sourceIds = new Set(FISCAL_MODEL_SOURCES_V1.map((source) => source.id));
    expect(sourceIds.size).toBe(FISCAL_MODEL_SOURCES_V1.length);

    for (const source of FISCAL_MODEL_SOURCES_V1) {
      const url = new URL(source.canonicalUrl);
      expect(url.protocol).toBe("https:");
      expect(["sede.agenciatributaria.gob.es", "www.boe.es"]).toContain(
        url.hostname,
      );
      expect(source.verificationStatus).toBe("HASH_PENDING");
      expect(source.reviewStatus).toBe("PENDING_REVIEW");
      expect(source.contentHash).toBeNull();
      expect(source.officialUpdatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.verifiedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
      );
    }

    for (const model of FISCAL_MODEL_FOUNDATION_FIXTURES_V1) {
      expect(model.sourceIds.length).toBeGreaterThan(0);
      expect(model.sourceIds.every((sourceId) => sourceIds.has(sourceId))).toBe(
        true,
      );
    }
  });

  it("freezes fixture and source structures", () => {
    expect(Object.isFrozen(FISCAL_MODEL_FOUNDATION_FIXTURES_V1)).toBe(true);
    expect(Object.isFrozen(FISCAL_MODEL_FOUNDATION_FIXTURES_V1[0])).toBe(true);
    expect(
      Object.isFrozen(FISCAL_MODEL_FOUNDATION_FIXTURES_V1[0].sourceIds),
    ).toBe(true);
    expect(Object.isFrozen(FISCAL_MODEL_SOURCES_V1)).toBe(true);
    expect(Object.isFrozen(FISCAL_MODEL_SOURCES_V1[0])).toBe(true);
  });
});
