import { gunzipSync, strFromU8 } from "fflate";

import { writePersistedAppDataCache } from "../lib/persisted-app-data-cache";
import { buildPersistedAppDerivedCache } from "../lib/persisted-app-derived-cache-builder";
import { writePersistedAppEntityShadow } from "../lib/persisted-app-entity-shadow";
import { normalizeLoadedData } from "../lib/storage";

const COMPRESSED_STORAGE_PREFIX = "factu-gzip-v1:";
const ENTITY_SHADOW_ENABLED =
  process.env.NEXT_PUBLIC_ENTITY_SHADOW_ENABLED === "true";

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

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function parseStoredData(raw: string): unknown {
  if (!raw.startsWith(COMPRESSED_STORAGE_PREFIX)) return JSON.parse(raw);
  const encoded = raw.slice(COMPRESSED_STORAGE_PREFIX.length);
  const serialized = strFromU8(gunzipSync(base64ToBytes(encoded)));
  return JSON.parse(serialized);
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
      const entityShadow = ENTITY_SHADOW_ENABLED
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
