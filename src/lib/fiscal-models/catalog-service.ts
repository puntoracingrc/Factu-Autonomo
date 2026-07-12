import {
  getFiscalModelByCode,
  isFiscalModelCode,
  listFiscalModels,
} from "./catalog";
import type {
  FiscalModelCoverageSnapshot,
  FiscalModelDefinition,
  FiscalModelManualReviewReason,
  FiscalModelReadResult,
  FiscalModelSource,
} from "./contracts";
import { calculateFiscalModelCoverage } from "./coverage";
import { FISCAL_MODEL_SOURCES_V1 } from "./catalog/sources.v1";
import { FISCAL_MODEL_FOUNDATION_RELEASE_V1 } from "./fixtures/foundation-catalog.v1";

const SUPPORTED_TAX_YEAR = 2026;
const FRESHNESS_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1_000;
const SHA256_HASH = /^sha256:[a-f0-9]{64}$/;

export interface FiscalModelCatalogService {
  readonly list: (
    input: unknown,
  ) => FiscalModelReadResult<readonly FiscalModelDefinition[]>;
  readonly get: (
    input: unknown,
  ) => FiscalModelReadResult<FiscalModelDefinition>;
  readonly coverage: (
    input: unknown,
  ) => FiscalModelReadResult<FiscalModelCoverageSnapshot>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  const allowed = new Set(allowedKeys);
  try {
    return Reflect.ownKeys(value).every((key) => {
      if (typeof key !== "string" || !allowed.has(key)) return false;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return Boolean(
        descriptor && descriptor.enumerable && "value" in descriptor,
      );
    });
  } catch {
    return false;
  }
}

function hasOwnDataKey(value: Record<string, unknown>, key: string): boolean {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return Boolean(descriptor && "value" in descriptor);
  } catch {
    return false;
  }
}

function unsupportedTaxYearResult(
  taxYear: unknown,
): Readonly<{
  status: "BLOCKED";
  reason: "UNSUPPORTED_TAX_YEAR" | "INVALID_INPUT";
}> {
  return Object.freeze({
    status: "BLOCKED",
    reason:
      typeof taxYear === "number" && Number.isSafeInteger(taxYear)
        ? "UNSUPPORTED_TAX_YEAR"
        : "INVALID_INPUT",
  });
}

function linkedSources(
  model: FiscalModelDefinition,
): readonly FiscalModelSource[] | null {
  const sources = model.sourceIds.map((sourceId) =>
    FISCAL_MODEL_SOURCES_V1.find((source) => source.id === sourceId),
  );
  if (
    sources.some(
      (source) => !source || !isCoherentAllowlistedSource(source),
    )
  ) {
    return null;
  }
  return Object.freeze(
    sources.filter((source): source is FiscalModelSource => Boolean(source)),
  );
}

function isCoherentAllowlistedSource(source: FiscalModelSource): boolean {
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
      expectedAuthority === null ||
      source.authority !== expectedAuthority
    ) {
      return false;
    }
  } catch {
    return false;
  }

  return source.verificationStatus !== "VERIFIED"
    ? true
    : source.reviewStatus === "APPROVED" &&
        source.contentHash !== null &&
        SHA256_HASH.test(source.contentHash);
}

function linkedSourcesForModels(
  models: readonly FiscalModelDefinition[],
): readonly FiscalModelSource[] | null {
  const sourcesById = new Map<string, FiscalModelSource>();
  for (const model of models) {
    const sources = linkedSources(model);
    if (!sources) return null;
    for (const source of sources) sourcesById.set(source.id, source);
  }
  return Object.freeze([...sourcesById.values()]);
}

function isValidatedModel(model: FiscalModelDefinition): boolean {
  const sources = linkedSources(model);
  return Boolean(
    model.reviewStatus === "APPROVED" &&
      sources?.every(
        (source) =>
          source.verificationStatus === "VERIFIED" &&
          source.reviewStatus === "APPROVED" &&
          source.contentHash !== null &&
          SHA256_HASH.test(source.contentHash),
      ),
  );
}

function manualReviewReasons(
  models: readonly FiscalModelDefinition[],
): readonly FiscalModelManualReviewReason[] {
  const reasons = new Set<FiscalModelManualReviewReason>();
  if (FISCAL_MODEL_FOUNDATION_RELEASE_V1.status === "DRAFT_LOCAL_PREVIEW") {
    reasons.add("DRAFT_RELEASE");
  }

  for (const model of models) {
    if (model.reviewStatus !== "APPROVED") {
      reasons.add("FISCAL_REVIEW_MISSING");
    }
    const sources = linkedSources(model);
    if (!sources) {
      reasons.add("SOURCE_UNAVAILABLE");
      continue;
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
        reasons.add("FISCAL_REVIEW_MISSING");
      }
    }
  }

  return Object.freeze([...reasons]);
}

function hasCriticalSourceChange(model: FiscalModelDefinition): boolean {
  const sources = linkedSources(model);
  return Boolean(
    sources?.some(
      (source) =>
        source.verificationStatus === "CHANGED" ||
        source.verificationStatus === "REPLACED",
    ),
  );
}

function manualResult<T>(
  data: T,
  reasons: readonly FiscalModelManualReviewReason[],
): FiscalModelReadResult<T> {
  return Object.freeze({
    status: "MANUAL_REVIEW",
    data,
    reasons: Object.freeze([...reasons]),
  });
}

export function createFiscalModelCatalogService(options: Readonly<{
  featureEnabled: boolean;
  clock: () => string;
}>): FiscalModelCatalogService {
  const featureEnabled = options.featureEnabled === true;
  const clock = options.clock;

  function featureDisabled<T>(): FiscalModelReadResult<T> | null {
    return featureEnabled
      ? null
      : Object.freeze({ status: "BLOCKED", reason: "FEATURE_DISABLED" });
  }

  function list(
    input: unknown,
  ): FiscalModelReadResult<readonly FiscalModelDefinition[]> {
    const disabled = featureDisabled<readonly FiscalModelDefinition[]>();
    if (disabled) return disabled;
    if (
      !isRecord(input) ||
      !hasOnlyKeys(input, ["taxYear", "includeHistorical"]) ||
      !hasOwnDataKey(input, "taxYear") ||
      (hasOwnDataKey(input, "includeHistorical") &&
        typeof input.includeHistorical !== "boolean")
    ) {
      return Object.freeze({ status: "BLOCKED", reason: "INVALID_INPUT" });
    }
    if (input.taxYear !== SUPPORTED_TAX_YEAR) {
      return unsupportedTaxYearResult(input.taxYear);
    }

    const models = listFiscalModels({
      includeHistorical:
        hasOwnDataKey(input, "includeHistorical") &&
        input.includeHistorical === true,
    });
    if (!linkedSourcesForModels(models)) {
      return Object.freeze({
        status: "BLOCKED",
        reason: "INCONSISTENT_VERSION",
      });
    }
    const reasons = manualReviewReasons(models);
    return reasons.length > 0
      ? manualResult(models, reasons)
      : Object.freeze({ status: "OK", data: models });
  }

  function get(
    input: unknown,
  ): FiscalModelReadResult<FiscalModelDefinition> {
    const disabled = featureDisabled<FiscalModelDefinition>();
    if (disabled) return disabled;
    if (
      !isRecord(input) ||
      !hasOnlyKeys(input, ["code", "taxYear"]) ||
      !hasOwnDataKey(input, "code") ||
      !hasOwnDataKey(input, "taxYear") ||
      typeof input.code !== "string" ||
      !/^\d{3}$/.test(input.code)
    ) {
      return Object.freeze({ status: "BLOCKED", reason: "INVALID_INPUT" });
    }
    if (input.taxYear !== SUPPORTED_TAX_YEAR) {
      return unsupportedTaxYearResult(input.taxYear);
    }
    if (!isFiscalModelCode(input.code)) {
      return Object.freeze({ status: "BLOCKED", reason: "MODEL_NOT_FOUND" });
    }

    const model = getFiscalModelByCode(input.code);
    if (!model) {
      return Object.freeze({ status: "BLOCKED", reason: "MODEL_NOT_FOUND" });
    }
    if (
      model.lifecycleStatus === "HISTORICAL" ||
      model.availability === "HISTORICAL_ONLY"
    ) {
      return Object.freeze({ status: "BLOCKED", reason: "MODEL_NOT_CURRENT" });
    }
    if (!model.supportedTaxYears.includes(input.taxYear)) {
      return Object.freeze({
        status: "BLOCKED",
        reason: "UNSUPPORTED_TAX_YEAR",
      });
    }
    if (!linkedSources(model)) {
      return Object.freeze({
        status: "BLOCKED",
        reason: "INCONSISTENT_VERSION",
      });
    }
    if (hasCriticalSourceChange(model)) {
      return Object.freeze({
        status: "BLOCKED",
        reason: "CRITICAL_CHANGE_PENDING",
      });
    }

    const reasons = manualReviewReasons([model]);
    return reasons.length > 0
      ? manualResult(model, reasons)
      : Object.freeze({ status: "OK", data: model });
  }

  function coverage(
    input: unknown,
  ): FiscalModelReadResult<FiscalModelCoverageSnapshot> {
    const disabled = featureDisabled<FiscalModelCoverageSnapshot>();
    if (disabled) return disabled;
    if (
      !isRecord(input) ||
      !hasOnlyKeys(input, ["taxYear"]) ||
      !hasOwnDataKey(input, "taxYear")
    ) {
      return Object.freeze({ status: "BLOCKED", reason: "INVALID_INPUT" });
    }
    if (input.taxYear !== SUPPORTED_TAX_YEAR) {
      return unsupportedTaxYearResult(input.taxYear);
    }

    const activeModels = listFiscalModels();
    const activeSources = linkedSourcesForModels(activeModels);
    if (!activeSources) {
      return Object.freeze({
        status: "BLOCKED",
        reason: "INCONSISTENT_VERSION",
      });
    }
    let calculatedAt: string;
    try {
      calculatedAt = clock();
    } catch {
      return Object.freeze({
        status: "BLOCKED",
        reason: "INCONSISTENT_VERSION",
      });
    }
    const releaseIsDraft =
      FISCAL_MODEL_FOUNDATION_RELEASE_V1.status === "DRAFT_LOCAL_PREVIEW";
    const result = calculateFiscalModelCoverage({
      taxYear: input.taxYear,
      targetUnits: activeModels.length,
      validatedUnits: releaseIsDraft
        ? 0
        : activeModels.filter(isValidatedModel).length,
      pendingCriticalDiffs: activeModels.filter(hasCriticalSourceChange).length,
      degradedUnits: activeModels.filter((model) =>
        linkedSources(model)?.some(
          (source) => source.verificationStatus === "UNAVAILABLE",
        ),
      ).length,
      lastSuccessfulSyncAt: null,
      lastFiscalReviewAt: null,
      calculatedAt,
      freshnessThresholdMs: FRESHNESS_THRESHOLD_MS,
      sourceVerificationStatuses: activeSources.map(
        (source) => source.verificationStatus,
      ),
    });
    if (!releaseIsDraft || result.status === "BLOCKED") return result;
    if (result.status === "OK") {
      return Object.freeze({
        status: "BLOCKED",
        reason: "INCONSISTENT_VERSION",
      });
    }
    const reasons: FiscalModelManualReviewReason[] = [
      "DRAFT_RELEASE",
      ...result.reasons,
    ];
    return Object.freeze({
      ...result,
      reasons: Object.freeze([...new Set(reasons)]),
    });
  }

  return Object.freeze({ list, get, coverage });
}
