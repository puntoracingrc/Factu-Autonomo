import { gunzipSync, strFromU8 } from "fflate";

import { writePersistedAppDataCache } from "../lib/persisted-app-data-cache";
import { normalizeLoadedData } from "../lib/storage";

const COMPRESSED_STORAGE_PREFIX = "factu-gzip-v1:";

interface CacheWorkerRequest {
  storageKey: string;
  raw: string;
}

interface CacheWorkerResponse {
  ok: boolean;
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
      await writePersistedAppDataCache(
        event.data.storageKey,
        event.data.raw,
        normalized,
      );
      self.postMessage({ ok: true } satisfies CacheWorkerResponse);
    } catch {
      self.postMessage({ ok: false } satisfies CacheWorkerResponse);
    }
  })();
};
