import {
  getFiscalModelByCode,
  isFiscalModelCode,
} from "../catalog";
import {
  FISCAL_MODEL_SOURCES_V1,
  FISCAL_MODEL_SOURCE_REGISTRY_VERSION,
} from "../catalog/sources.v1";
import type {
  FiscalModelDefinition,
  FiscalModelSource,
} from "../contracts";
import { FISCAL_MODEL_FOUNDATION_RELEASE_V1 } from "../fixtures/foundation-catalog.v1";
import type {
  FiscalModelPageBlockReasonV1,
  FiscalModelPageDescriptorResolverV1,
  FiscalModelPageDescriptorV1,
  FiscalModelPageFieldProvenanceV1,
  FiscalModelPageListResultV1,
  FiscalModelPageManualReviewReasonV1,
  FiscalModelPagePublishedDescriptorV1,
  FiscalModelPageResolveResultV1,
  FiscalModelPageUnavailableDescriptorV1,
} from "./contracts.v1";
import { FISCAL_MODEL_PAGE_DESCRIPTOR_SCHEMA_VERSION_V1 } from "./contracts.v1";
import {
  FISCAL_MODEL_PAGE_DESCRIPTORS_V1,
  FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1,
} from "./fixtures/descriptors.v1";

const SHA256_HASH = /^sha256:[a-f0-9]{64}$/;

type ParsedObject = Record<string, unknown>;

function parseExactObject(
  value: unknown,
  allowedKeys: readonly string[],
): ParsedObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;

    const allowed = new Set(allowedKeys);
    const parsed: ParsedObject = Object.create(null) as ParsedObject;
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || !allowed.has(key)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        return null;
      }
      parsed[key] = descriptor.value;
    }
    return parsed;
  } catch {
    return null;
  }
}

function hasOwn(value: ParsedObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function blockedResolve(
  reason: FiscalModelPageBlockReasonV1,
): FiscalModelPageResolveResultV1 {
  return Object.freeze({ status: "BLOCKED", reason, href: null });
}

function blockedList(
  reason: FiscalModelPageBlockReasonV1,
): FiscalModelPageListResultV1 {
  return Object.freeze({ status: "BLOCKED", reason });
}

function copyProvenance(
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

function copyDescriptor(
  descriptor: FiscalModelPageDescriptorV1,
): FiscalModelPageDescriptorV1 {
  return Object.freeze({
    ...descriptor,
    sourceIds: Object.freeze([...descriptor.sourceIds]),
    provenance: copyProvenance(descriptor.provenance),
  }) as FiscalModelPageDescriptorV1;
}

function copyUnavailableDescriptor(
  descriptor: FiscalModelPageDescriptorV1,
): FiscalModelPageUnavailableDescriptorV1 {
  const copy = copyDescriptor(descriptor);
  return Object.freeze({ ...copy, href: null }) as FiscalModelPageUnavailableDescriptorV1;
}

function copyPublishedDescriptor(
  descriptor: FiscalModelPagePublishedDescriptorV1,
): FiscalModelPagePublishedDescriptorV1 {
  return copyDescriptor(
    descriptor as unknown as FiscalModelPageDescriptorV1,
  ) as unknown as FiscalModelPagePublishedDescriptorV1;
}

function canonicalPathMatchesCode(
  descriptor: FiscalModelPageDescriptorV1,
): boolean {
  switch (descriptor.code) {
    case "036":
      return descriptor.canonicalPath === "/consultor-fiscal/modelos/036";
    case "037":
      return descriptor.canonicalPath === "/consultor-fiscal/modelos/037";
    case "303":
      return descriptor.canonicalPath === "/consultor-fiscal/modelos/303";
  }
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function sourceIsAllowlistedAndCoherent(source: FiscalModelSource): boolean {
  try {
    const url = new URL(source.canonicalUrl);
    const expectedAuthority =
      url.hostname === "sede.agenciatributaria.gob.es"
        ? "AEAT"
        : url.hostname === "www.boe.es"
          ? "BOE"
          : null;
    if (
      url.protocol !== "https:" ||
      url.port !== "" ||
      url.username !== "" ||
      url.password !== "" ||
      expectedAuthority === null ||
      source.authority !== expectedAuthority
    ) {
      return false;
    }
  } catch {
    return false;
  }

  const verificationStatus: unknown = source.verificationStatus;
  switch (verificationStatus) {
    case "VERIFIED":
      return source.contentHash !== null && SHA256_HASH.test(source.contentHash);
    case "HASH_PENDING":
    case "CHANGED":
    case "UNAVAILABLE":
    case "REPLACED":
      return true;
    default:
      return false;
  }
}

function linkedSources(
  descriptor: FiscalModelPageDescriptorV1,
  model: FiscalModelDefinition,
): readonly FiscalModelSource[] | null {
  if (
    new Set(descriptor.sourceIds).size !== descriptor.sourceIds.length ||
    !sameStrings(descriptor.sourceIds, model.sourceIds)
  ) {
    return null;
  }

  const sources = descriptor.sourceIds.map((sourceId) =>
    FISCAL_MODEL_SOURCES_V1.find((source) => source.id === sourceId),
  );
  if (
    sources.some(
      (source) => !source || !sourceIsAllowlistedAndCoherent(source),
    )
  ) {
    return null;
  }
  return Object.freeze(
    sources.filter((source): source is FiscalModelSource => Boolean(source)),
  );
}

function provenanceIsCoherent(
  descriptor: FiscalModelPageDescriptorV1,
): boolean {
  const expectedFields = new Set([
    "canonicalName",
    "summary",
    "contentLevel",
    "lifecycleStatus",
    "effectiveTo",
    "modelAvailability",
  ]);
  const actualFields = descriptor.provenance.map((entry) => entry.field);
  if (
    actualFields.length !== expectedFields.size ||
    new Set(actualFields).size !== actualFields.length ||
    actualFields.some((field) => !expectedFields.has(field))
  ) {
    return false;
  }

  const allowedSourceIds = new Set(descriptor.sourceIds);
  return descriptor.provenance.every((entry) => {
    if (entry.origin === "OFFICIAL_SOURCE") {
      return (
        entry.sourceIds.length > 0 &&
        new Set(entry.sourceIds).size === entry.sourceIds.length &&
        entry.sourceIds.every((sourceId) => allowedSourceIds.has(sourceId))
      );
    }
    if (entry.origin !== "FOUNDATION_CATALOG") return false;
    return (
      entry.modelReleaseId === descriptor.modelReleaseId &&
      entry.modelContentVersion === descriptor.modelContentVersion
    );
  });
}

function descriptorIsCoherent(
  descriptor: FiscalModelPageDescriptorV1,
): boolean {
  const model = getFiscalModelByCode(descriptor.code);
  if (!model) return false;
  const sources = linkedSources(descriptor, model);
  if (!sources) return false;

  if (
    descriptor.descriptorSchemaVersion !==
      FISCAL_MODEL_PAGE_DESCRIPTOR_SCHEMA_VERSION_V1 ||
    descriptor.descriptorReleaseId !==
      FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1.id ||
    descriptor.descriptorContentVersion.length === 0 ||
    descriptor.modelReleaseId !== model.releaseId ||
    model.releaseId !== FISCAL_MODEL_FOUNDATION_RELEASE_V1.id ||
    descriptor.modelReleaseId !==
      FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1.modelCatalogReleaseId ||
    descriptor.modelContentVersion !== model.contentVersion ||
    descriptor.sourceRegistryVersion !==
      FISCAL_MODEL_SOURCE_REGISTRY_VERSION ||
    descriptor.canonicalName !== model.canonicalName ||
    descriptor.lifecycleStatus !== model.lifecycleStatus ||
    descriptor.modelAvailability !== model.availability ||
    descriptor.effectiveTo !== model.effectiveTo ||
    !canonicalPathMatchesCode(descriptor) ||
    !provenanceIsCoherent(descriptor)
  ) {
    return false;
  }

  if (
    descriptor.lifecycleStatus === "HISTORICAL" ||
    descriptor.modelAvailability === "HISTORICAL_ONLY"
  ) {
    if (
      descriptor.code !== "037" ||
      descriptor.contentLevel !== "HISTORICAL_INFO_ONLY" ||
      descriptor.effectiveTo !== "2025-02-02"
    ) {
      return false;
    }
  } else if (
    descriptor.code === "037" ||
    descriptor.contentLevel !== "METADATA_ONLY"
  ) {
    return false;
  }

  return descriptor.publicationStatus === "UNPUBLISHED"
    ? descriptor.href === null
    : descriptor.contentReviewStatus === "APPROVED" &&
        descriptor.href === descriptor.canonicalPath &&
        descriptor.provenance.every(
          (entry) => entry.reviewStatus === "APPROVED",
        );
}

function catalogIsCoherent(): boolean {
  if (
    FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1.schemaVersion !==
      FISCAL_MODEL_PAGE_DESCRIPTOR_SCHEMA_VERSION_V1 ||
    FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1.modelCatalogReleaseId !==
      FISCAL_MODEL_FOUNDATION_RELEASE_V1.id ||
    FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1.sourceRegistryVersion !==
      FISCAL_MODEL_SOURCE_REGISTRY_VERSION ||
    FISCAL_MODEL_FOUNDATION_RELEASE_V1.sourceRegistryVersion !==
      FISCAL_MODEL_SOURCE_REGISTRY_VERSION
  ) {
    return false;
  }

  const codes = FISCAL_MODEL_PAGE_DESCRIPTORS_V1.map(
    (descriptor) => descriptor.code,
  );
  const paths = FISCAL_MODEL_PAGE_DESCRIPTORS_V1.map(
    (descriptor) => descriptor.canonicalPath,
  );
  const expectedCodes = ["036", "037", "303"] as const;
  return (
    codes.length === 3 &&
    new Set(codes).size === codes.length &&
    new Set(paths).size === paths.length &&
    expectedCodes.every((code) => codes.includes(code)) &&
    FISCAL_MODEL_PAGE_DESCRIPTORS_V1.every(descriptorIsCoherent)
  );
}

function manualReviewReasons(
  descriptor: FiscalModelPageDescriptorV1,
): readonly FiscalModelPageManualReviewReasonV1[] | null {
  const model = getFiscalModelByCode(descriptor.code);
  if (!model) return null;
  const sources = linkedSources(descriptor, model);
  if (!sources) return null;

  const reasons = new Set<FiscalModelPageManualReviewReasonV1>();
  const foundationReleaseStatus: unknown =
    FISCAL_MODEL_FOUNDATION_RELEASE_V1.status;
  if (
    FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1.status !== "PUBLISHED" ||
    foundationReleaseStatus !== "PUBLISHED"
  ) {
    reasons.add("DRAFT_RELEASE");
  }
  if (descriptor.publicationStatus !== "PUBLISHED") {
    reasons.add("PAGE_UNPUBLISHED");
  }
  if (
    descriptor.contentReviewStatus !== "APPROVED" ||
    descriptor.provenance.some(
      (entry) => entry.reviewStatus !== "APPROVED",
    )
  ) {
    reasons.add("PAGE_REVIEW_REQUIRED");
  }
  if (model.reviewStatus !== "APPROVED") {
    reasons.add("MODEL_REVIEW_REQUIRED");
  }

  for (const source of sources) {
    if (source.verificationStatus === "HASH_PENDING") {
      reasons.add("SOURCE_HASH_PENDING");
    } else if (source.verificationStatus === "UNAVAILABLE") {
      reasons.add("SOURCE_UNAVAILABLE");
    } else if (
      source.verificationStatus === "CHANGED" ||
      source.verificationStatus === "REPLACED"
    ) {
      reasons.add("SOURCE_CHANGED");
    }
    if (source.reviewStatus !== "APPROVED") {
      reasons.add("SOURCE_REVIEW_REQUIRED");
    }
  }

  return Object.freeze([...reasons]);
}

function parseResolverOptions(options: unknown): Readonly<{
  valid: boolean;
  featureEnabled: boolean;
}> {
  const parsed = parseExactObject(options, ["featureEnabled"]);
  if (!parsed) return Object.freeze({ valid: false, featureEnabled: false });
  if (!hasOwn(parsed, "featureEnabled")) {
    return Object.freeze({ valid: true, featureEnabled: false });
  }
  return typeof parsed.featureEnabled === "boolean"
    ? Object.freeze({
        valid: true,
        featureEnabled: parsed.featureEnabled === true,
      })
    : Object.freeze({ valid: false, featureEnabled: false });
}

export function createFiscalModelPageDescriptorResolverV1(
  options: unknown = {},
): FiscalModelPageDescriptorResolverV1 {
  const configuration = parseResolverOptions(options);
  const catalogCoherent = catalogIsCoherent();

  function resolve(input: unknown): FiscalModelPageResolveResultV1 {
    if (!configuration.valid) return blockedResolve("INVALID_CONFIGURATION");
    if (!configuration.featureEnabled) return blockedResolve("FEATURE_DISABLED");
    if (!catalogCoherent) return blockedResolve("INCONSISTENT_DESCRIPTOR");

    const parsed = parseExactObject(input, ["code"]);
    if (
      !parsed ||
      !hasOwn(parsed, "code") ||
      typeof parsed.code !== "string" ||
      !/^\d{3}$/.test(parsed.code)
    ) {
      return blockedResolve("INVALID_INPUT");
    }
    if (!isFiscalModelCode(parsed.code)) {
      return blockedResolve("MODEL_NOT_FOUND");
    }

    const descriptor = FISCAL_MODEL_PAGE_DESCRIPTORS_V1.find(
      (candidate) => candidate.code === parsed.code,
    );
    if (!descriptor || !descriptorIsCoherent(descriptor)) {
      return blockedResolve("INCONSISTENT_DESCRIPTOR");
    }

    const reasons = manualReviewReasons(descriptor);
    if (!reasons) return blockedResolve("INCONSISTENT_DESCRIPTOR");
    if (reasons.length > 0) {
      return Object.freeze({
        status: "MANUAL_REVIEW",
        data: copyUnavailableDescriptor(descriptor),
        reasons: Object.freeze([...reasons]),
        href: null,
      });
    }
    if (
      descriptor.publicationStatus !== "PUBLISHED" ||
      descriptor.href === null
    ) {
      return blockedResolve("INCONSISTENT_DESCRIPTOR");
    }

    const data = copyPublishedDescriptor(descriptor);
    switch (data.code) {
      case "036":
        return Object.freeze({ status: "AVAILABLE", data, href: data.href });
      case "037":
        return Object.freeze({ status: "AVAILABLE", data, href: data.href });
      case "303":
        return Object.freeze({ status: "AVAILABLE", data, href: data.href });
    }
  }

  function list(input: unknown): FiscalModelPageListResultV1 {
    if (!configuration.valid) return blockedList("INVALID_CONFIGURATION");
    if (!configuration.featureEnabled) return blockedList("FEATURE_DISABLED");
    if (!catalogCoherent) return blockedList("INCONSISTENT_DESCRIPTOR");

    const parsed = parseExactObject(input, ["includeHistorical"]);
    if (
      !parsed ||
      (hasOwn(parsed, "includeHistorical") &&
        typeof parsed.includeHistorical !== "boolean")
    ) {
      return blockedList("INVALID_INPUT");
    }
    const includeHistorical =
      hasOwn(parsed, "includeHistorical") && parsed.includeHistorical === true;
    const descriptors = FISCAL_MODEL_PAGE_DESCRIPTORS_V1.filter(
      (descriptor) =>
        includeHistorical || descriptor.lifecycleStatus !== "HISTORICAL",
    ).sort((left, right) => left.code.localeCompare(right.code));

    const reasons = new Set<FiscalModelPageManualReviewReasonV1>();
    for (const descriptor of descriptors) {
      if (!descriptorIsCoherent(descriptor)) {
        return blockedList("INCONSISTENT_DESCRIPTOR");
      }
      const descriptorReasons = manualReviewReasons(descriptor);
      if (!descriptorReasons) return blockedList("INCONSISTENT_DESCRIPTOR");
      for (const reason of descriptorReasons) reasons.add(reason);
    }

    if (reasons.size > 0) {
      return Object.freeze({
        status: "MANUAL_REVIEW",
        data: Object.freeze(descriptors.map(copyUnavailableDescriptor)),
        reasons: Object.freeze([...reasons]),
      });
    }
    if (
      descriptors.some(
        (descriptor) =>
          descriptor.publicationStatus !== "PUBLISHED" ||
          descriptor.href === null,
      )
    ) {
      return blockedList("INCONSISTENT_DESCRIPTOR");
    }

    return Object.freeze({
      status: "AVAILABLE",
      data: Object.freeze(
        descriptors.map((descriptor) =>
          copyPublishedDescriptor(
            descriptor as FiscalModelPagePublishedDescriptorV1,
          ),
        ),
      ),
    });
  }

  return Object.freeze({ resolve, list });
}
