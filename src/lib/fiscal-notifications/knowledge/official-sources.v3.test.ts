import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2 } from "./official-sources.v2";
import {
  FISCAL_NOTIFICATION_OFFICIAL_SOURCES_RELEASE_ID_V3,
  FISCAL_NOTIFICATION_OFFICIAL_SOURCES_SCHEMA_VERSION_V3,
  FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V3,
  FISCAL_NOTIFICATION_ROI_OFFICIAL_SOURCE_IDS_V3,
  resolveFiscalNotificationOfficialSourceV3,
} from "./official-sources.v3";

const EXPECTED_ROI_SOURCES = {
  "aeat.census.roi.registry_information":
    "https://sede.agenciatributaria.gob.es/Sede/censos-nif-domicilio-fiscal/quien-debe-estar-censado/registro-operadores-intracomunitarios.html",
  "aeat.census.roi.registration_faq":
    "https://sede.agenciatributaria.gob.es/Sede/censos-nif-domicilio-fiscal/tramites-censales-relacionados-empresarios-profesionales-retenedores/preguntas-frecuentes-modelos-036-037/modificaciones-censales/solicitud-alta-baja-registro-operadores-intracomunitarios.html",
} as const;

describe("fiscal notification official source catalog v3", () => {
  it("preserves every v2 source and adds only the two closed ROI sources", () => {
    expect(FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V3).toHaveLength(
      FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2.length + 2,
    );
    expect(FISCAL_NOTIFICATION_ROI_OFFICIAL_SOURCE_IDS_V3).toEqual(
      Object.keys(EXPECTED_ROI_SOURCES),
    );
    expect(
      new Set(
        FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V3.map((source) => source.id),
      ).size,
    ).toBe(FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V3.length);

    for (const [
      index,
      sourceV2,
    ] of FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2.entries()) {
      const sourceV3 = FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V3[index];
      expect(sourceV3).toEqual({
        ...sourceV2,
        schemaVersion: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_SCHEMA_VERSION_V3,
        releaseId: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_RELEASE_ID_V3,
        permitsCurrentRoiStatusInference: false,
        permitsViesStatusInference: false,
        permitsDocumentAgreementInterpretation: false,
      });
    }
  });

  it("registers the exact verified AEAT canonical URLs", () => {
    for (const [id, canonicalUrl] of Object.entries(EXPECTED_ROI_SOURCES)) {
      const source = resolveFiscalNotificationOfficialSourceV3(id);
      expect(source).toMatchObject({
        id,
        canonicalUrl,
        authorityLevel: "OFFICIAL_PRIMARY",
        verificationStatus: "OFFICIAL_URL_VERIFIED",
      });
      const url = new URL(source?.canonicalUrl ?? "");
      expect(url.hostname).toBe("sede.agenciatributaria.gob.es");
      expect(source).toMatchObject({
        authority: "AEAT",
        sourceKind: "PROCEDURE_INFORMATION",
      });
    }
  });

  it("has no duplicate canonical URL or duplicate identity for RD 1065/2007", () => {
    const canonicalUrls = FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V3.map(
      (source) => source.canonicalUrl,
    );
    expect(new Set(canonicalUrls).size).toBe(canonicalUrls.length);

    const managementInspectionRegulation =
      FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V3.filter(
        (source) =>
          source.authority === "BOE" &&
          source.title.startsWith("Real Decreto 1065/2007"),
      );
    expect(managementInspectionRegulation.map((source) => source.id)).toEqual([
      "boe.tax.management_inspection.regulation",
    ]);
    expect(managementInspectionRegulation[0]?.canonicalUrl).toBe(
      "https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984",
    );
  });

  it("keeps all sources contextual, pending legal review and non-operational", () => {
    for (const source of FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V3) {
      expect(source).toMatchObject({
        legalReviewStatus: "LEGAL_REVIEW_PENDING",
        usagePolicy: "CONTEXT_ONLY",
        permitsLegalRuleActivation: false,
        permitsTemplateActivation: false,
        retainedSourceContent: "NONE",
        permitsCurrentRoiStatusInference: false,
        permitsViesStatusInference: false,
        permitsDocumentAgreementInterpretation: false,
      });
      expect(Object.isFrozen(source)).toBe(true);
    }
  });

  it("is immutable and resolves only exact registered IDs", () => {
    expect(Object.isFrozen(FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V3)).toBe(true);
    expect(
      Object.isFrozen(FISCAL_NOTIFICATION_ROI_OFFICIAL_SOURCE_IDS_V3),
    ).toBe(true);
    const source = resolveFiscalNotificationOfficialSourceV3(
      "aeat.census.roi.registry_information",
    );
    expect(
      Reflect.set(source ?? {}, "permitsCurrentRoiStatusInference", true),
    ).toBe(false);
    for (const invalid of [
      " aeat.census.roi.registry_information",
      "AEAT.CENSUS.ROI.REGISTRY_INFORMATION",
      "aeat.census.roi.\u0000registry_information",
      "aeat.census.roi.unknown",
      "x".repeat(1_000_000),
      "__proto__",
      1,
      null,
      {},
    ]) {
      expect(resolveFiscalNotificationOfficialSourceV3(invalid)).toBeNull();
    }
  });

  it("contains no runtime network, AI, persistence, PII or retained text", () => {
    const source = readFileSync(
      new URL("./official-sources.v3.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|Date\.now|new Date|Math\.random|ownerScope|documentId|taxId|\bCSV\b|\bIBAN\b|retainedText/iu,
    );
  });
});
