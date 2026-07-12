export const AI_PROCESSING_CONSENT_VERSION = "2026-07-12";
export const AI_PROCESSING_CONSENT_KEY = "factura-autonomo-ai-consent";

interface AiConsentRecord {
  version: string;
  acceptedAt: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function storageOrNull(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function hasAiProcessingConsent(storage?: StorageLike): boolean {
  const target = storageOrNull(storage);
  if (!target) return false;

  try {
    const raw = target.getItem(AI_PROCESSING_CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<AiConsentRecord>;
    return parsed.version === AI_PROCESSING_CONSENT_VERSION;
  } catch {
    return false;
  }
}

export function saveAiProcessingConsent(
  acceptedAt = new Date().toISOString(),
  storage?: StorageLike,
): AiConsentRecord {
  const record = {
    version: AI_PROCESSING_CONSENT_VERSION,
    acceptedAt,
  };
  const target = storageOrNull(storage);
  if (target) {
    target.setItem(AI_PROCESSING_CONSENT_KEY, JSON.stringify(record));
  }
  return record;
}
