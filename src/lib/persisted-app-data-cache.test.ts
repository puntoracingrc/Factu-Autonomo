import { describe, expect, it } from "vitest";

import {
  matchesPersistedAppDataCacheRecord,
  persistedAppDataCacheRecordId,
  PERSISTED_APP_DATA_CACHE_RELEASE_ID,
  PERSISTED_APP_DATA_CACHE_VERSION,
} from "./persisted-app-data-cache";
import { EMPTY_DATA } from "./types";

describe("persisted app data cache", () => {
  const storageKey = "factura-autonomo-data";
  const raw = "factu-gzip-v1:contenido-exacto";
  const record = {
    id: persistedAppDataCacheRecordId(storageKey),
    version: PERSISTED_APP_DATA_CACHE_VERSION,
    releaseId: PERSISTED_APP_DATA_CACHE_RELEASE_ID,
    storageKey,
    raw,
    data: EMPTY_DATA,
  };

  it("mantiene un unico hueco por empresa entre despliegues", () => {
    expect(persistedAppDataCacheRecordId(storageKey)).toBe(
      `${PERSISTED_APP_DATA_CACHE_VERSION}:${storageKey}`,
    );
    expect(persistedAppDataCacheRecordId("otra-empresa")).not.toBe(record.id);
    expect(record.id).not.toContain(PERSISTED_APP_DATA_CACHE_RELEASE_ID);
  });

  it("acepta solo la copia ligada al contenido durable exacto", () => {
    expect(
      matchesPersistedAppDataCacheRecord(record, storageKey, raw),
    ).toBe(true);
    expect(
      matchesPersistedAppDataCacheRecord(
        record,
        storageKey,
        `${raw}-cambiado`,
      ),
    ).toBe(false);
  });

  it("rechaza versiones y estructuras incompletas", () => {
    expect(
      matchesPersistedAppDataCacheRecord(
        { ...record, version: PERSISTED_APP_DATA_CACHE_VERSION + 1 },
        storageKey,
        raw,
      ),
    ).toBe(false);
    expect(
      matchesPersistedAppDataCacheRecord(
        { ...record, releaseId: "otro-despliegue" },
        storageKey,
        raw,
      ),
    ).toBe(false);
    expect(
      matchesPersistedAppDataCacheRecord(
        { ...record, data: { profile: EMPTY_DATA.profile } },
        storageKey,
        raw,
      ),
    ).toBe(false);
  });
});
