import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V3 } from "./official-sources.v3";
import {
  FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V4,
  FISCAL_NOTIFICATION_PLAIN_LANGUAGE_OFFICIAL_SOURCE_IDS_V4,
  resolveFiscalNotificationOfficialSourceV4,
} from "./official-sources.v4";

describe("fiscal notification official source catalog v4", () => {
  it("preserves v3 and adds five exact official AEAT sources", () => {
    expect(FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V4).toHaveLength(
      FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V3.length + 5,
    );
    expect(FISCAL_NOTIFICATION_PLAIN_LANGUAGE_OFFICIAL_SOURCE_IDS_V4).toEqual([
      "aeat.notification.electronic_faq",
      "aeat.collection.enforcement_surcharges",
      "aeat.collection.enforcement_nonpayment",
      "aeat.collection.enforcement_resources",
      "aeat.collection.seizure_overview",
    ]);
    expect(
      new Set(FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V4.map((source) => source.id))
        .size,
    ).toBe(FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V4.length);
  });

  it("allows general guidance but never document inference or deadline calculation", () => {
    for (const source of FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V4) {
      expect(source).toMatchObject({
        permitsGeneralPlainLanguageGuidance: true,
        permitsDocumentSpecificInference: false,
        permitsDeadlineCalculation: false,
        retainedSourceContent: "NONE",
      });
      expect(Object.isFrozen(source)).toBe(true);
    }
  });

  it("resolves exact IDs fail-closed and only uses official hosts", () => {
    for (const id of FISCAL_NOTIFICATION_PLAIN_LANGUAGE_OFFICIAL_SOURCE_IDS_V4) {
      const source = resolveFiscalNotificationOfficialSourceV4(id);
      expect(source?.authority).toBe("AEAT");
      expect(new URL(source?.canonicalUrl ?? "").hostname).toBe(
        "sede.agenciatributaria.gob.es",
      );
    }
    for (const value of [
      " aeat.notification.electronic_faq",
      "aeat.notification.electronic_faq ",
      "aeat.notification.unknown",
      "aeat.notification.\u0000faq",
      "x".repeat(161),
      null,
    ]) {
      expect(resolveFiscalNotificationOfficialSourceV4(value)).toBeNull();
    }
  });

  it("contains no runtime network, AI, persistence, PII or retained source text", () => {
    const source = readFileSync(
      new URL("./official-sources.v4.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|Date\.now|Math\.random|ownerScope|documentId|taxId|\bIBAN\b|retainedText/iu,
    );
  });
});
