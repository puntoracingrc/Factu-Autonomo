import { describe, expect, it } from "vitest";
import {
  AI_PROCESSING_CONSENT_KEY,
  AI_PROCESSING_CONSENT_VERSION,
  hasAiProcessingConsent,
  saveAiProcessingConsent,
} from "./ai-consent";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  };
}

describe("ai consent", () => {
  it("guarda y reconoce la versión vigente", () => {
    const storage = memoryStorage();

    expect(hasAiProcessingConsent(storage)).toBe(false);
    saveAiProcessingConsent("2026-06-24T10:00:00.000Z", storage);

    expect(hasAiProcessingConsent(storage)).toBe(true);
  });

  it("rechaza versiones antiguas o datos corruptos", () => {
    expect(
      hasAiProcessingConsent(
        memoryStorage({
          [AI_PROCESSING_CONSENT_KEY]: JSON.stringify({
            version: "2025-01-01",
          }),
        }),
      ),
    ).toBe(false);

    expect(
      hasAiProcessingConsent(
        memoryStorage({ [AI_PROCESSING_CONSENT_KEY]: "no-json" }),
      ),
    ).toBe(false);
  });

  it("devuelve el registro guardado", () => {
    const record = saveAiProcessingConsent(
      "2026-06-24T10:00:00.000Z",
      memoryStorage(),
    );

    expect(record).toEqual({
      version: AI_PROCESSING_CONSENT_VERSION,
      acceptedAt: "2026-06-24T10:00:00.000Z",
    });
  });
});
