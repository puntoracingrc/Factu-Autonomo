import { createHash } from "node:crypto";
import { FixtureFiscalCalendarProvider } from "./fixture-provider";
import { GooglePublicCalendarProvider } from "./google-public-calendar-provider";
import { ReviewOnlyFiscalCalendarProvider } from "./review-only-provider";
import type { FiscalCalendarRuntimeConfig } from "./config";
import type {
  FiscalCalendarCategory,
  FiscalCalendarDateRange,
  FiscalCalendarProvider,
  FiscalCalendarProviderResult,
} from "./types";

assertServerOnlyModule();

const DEFAULT_CACHE_TTL_MS = 5 * 60_000;
const MAX_CACHE_ENTRIES = 100;

interface FiscalCalendarServiceOptions {
  cacheTtlMs?: number;
  nowMs?: () => number;
}

interface ProviderFactoryDependencies {
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

interface CacheEntry {
  expiresAt: number;
  promise: Promise<FiscalCalendarProviderResult>;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error("El servicio de calendario fiscal solo puede cargarse en servidor.");
  }
}

function boundedCacheTtl(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_CACHE_TTL_MS;
  return Math.max(1, Math.min(60 * 60_000, Math.floor(value as number)));
}

function cacheKey(
  range: FiscalCalendarDateRange,
  categories: readonly FiscalCalendarCategory[],
): string {
  return [
    range.startDate,
    range.endDateExclusive,
    [...categories].sort().join(","),
  ].join("|");
}

export class FiscalCalendarService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs: number;
  private readonly nowMs: () => number;

  constructor(
    private readonly provider: FiscalCalendarProvider,
    options: FiscalCalendarServiceOptions = {},
  ) {
    this.cacheTtlMs = boundedCacheTtl(options.cacheTtlMs);
    this.nowMs = options.nowMs ?? Date.now;
  }

  private cleanCache(now: number): void {
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key);
    }
    while (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (!oldest) break;
      this.cache.delete(oldest);
    }
  }

  async listEvents(
    range: FiscalCalendarDateRange,
    categories: readonly FiscalCalendarCategory[],
  ): Promise<FiscalCalendarProviderResult> {
    const now = this.nowMs();
    const key = cacheKey(range, categories);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) return cached.promise;

    this.cleanCache(now);
    const promise = this.provider.listEvents(range, categories);
    const entry: CacheEntry = {
      expiresAt: now + this.cacheTtlMs,
      promise,
    };
    this.cache.set(key, entry);

    try {
      return await promise;
    } catch (error) {
      if (this.cache.get(key) === entry) this.cache.delete(key);
      throw error;
    }
  }
}

export function createFiscalCalendarProvider(
  config: FiscalCalendarRuntimeConfig,
  dependencies: ProviderFactoryDependencies = {},
): FiscalCalendarProvider {
  if (config.providerMode === "review-only") {
    return new ReviewOnlyFiscalCalendarProvider(dependencies.now);
  }
  if (config.providerMode === "google-calendar" && config.apiKey) {
    return new GooglePublicCalendarProvider({
      apiKey: config.apiKey,
      fetchImpl: dependencies.fetchImpl,
      now: dependencies.now,
    });
  }
  return new FixtureFiscalCalendarProvider(dependencies.now);
}

function providerConfigurationFingerprint(
  config: FiscalCalendarRuntimeConfig,
): string {
  if (config.providerMode !== "google-calendar") return config.providerMode;
  return createHash("sha256")
    .update(config.apiKey ?? "")
    .digest("hex");
}

let defaultService:
  | { providerFingerprint: string; service: FiscalCalendarService }
  | undefined;

export function getFiscalCalendarService(
  config: FiscalCalendarRuntimeConfig,
): FiscalCalendarService {
  const providerFingerprint = providerConfigurationFingerprint(config);
  if (
    !defaultService ||
    defaultService.providerFingerprint !== providerFingerprint
  ) {
    defaultService = {
      providerFingerprint,
      service: new FiscalCalendarService(createFiscalCalendarProvider(config)),
    };
  }
  return defaultService.service;
}

export function resetFiscalCalendarServiceForTests(): void {
  defaultService = undefined;
}
