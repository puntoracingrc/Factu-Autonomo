import { writePersistedAppDataCache } from "../lib/persisted-app-data-cache";
import { buildPersistedAppDerivedCache } from "../lib/persisted-app-derived-cache-builder";
import { writePersistedAppEntityShadow } from "../lib/persisted-app-entity-shadow";
import { evaluatePersistedAppEntityShadowCanary } from "../lib/persisted-app-entity-shadow-canary";
import { normalizeLoadedData, parseStoredData } from "../lib/storage";

interface CacheWorkerRequest {
  storageKey: string;
  raw: string;
}

interface CacheWorkerResponse {
  ok: boolean;
  entityShadow: {
    written: boolean;
    verified: boolean;
    upserted: number;
    deleted: number;
  };
}

self.onmessage = (event: MessageEvent<CacheWorkerRequest>) => {
  void (async () => {
    try {
      const normalized = normalizeLoadedData(parseStoredData(event.data.raw));
      const derived = buildPersistedAppDerivedCache(normalized);
      const written = await writePersistedAppDataCache(
        event.data.storageKey,
        event.data.raw,
        normalized,
        derived,
      );
      const entityShadowCanary = evaluatePersistedAppEntityShadowCanary(
        event.data.storageKey,
      );
      const entityShadow = entityShadowCanary.enabled
        ? await writePersistedAppEntityShadow(
            event.data.storageKey,
            event.data.raw,
            normalized,
          )
        : {
            written: false,
            upserted: 0,
            deleted: 0,
            verification: undefined,
          };
      self.postMessage({
        ok: written,
        entityShadow: {
          written: entityShadow.written,
          verified: entityShadow.verification?.matches === true,
          upserted: entityShadow.upserted,
          deleted: entityShadow.deleted,
        },
      } satisfies CacheWorkerResponse);
    } catch {
      self.postMessage({
        ok: false,
        entityShadow: {
          written: false,
          verified: false,
          upserted: 0,
          deleted: 0,
        },
      } satisfies CacheWorkerResponse);
    }
  })();
};
