import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V1,
  resolveFiscalNotificationOfficialSourceV1,
} from "./official-sources.v1";

const EXPECTED_SOURCE_IDS = [
  "aeat.collection.enforcement",
  "aeat.collection.deferral",
  "aeat.collection.offset.requested",
  "aeat.collection.offset.exofficio",
  "aeat.assessment.irpf",
  "aeat.assessment.vat",
  "aeat.sanction.general",
  "aeat.review.reconsideration",
  "aeat.review.economic_administrative",
  "aeat.refund.undue",
  "aeat.liability.solidary",
  "aeat.liability.subsidiary",
  "aeat.liability.successors",
  "aeat.inspection.general",
  "aeat.certificate.compliance",
  "aeat.collection.precautionary",
  "aeat.collection.auction",
] as const;

const EXPECTED_SOURCE_REFERENCES = [
  [
    "aeat.collection.enforcement",
    "Procedimiento de apremio",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA19.shtml",
  ],
  [
    "aeat.collection.deferral",
    "Aplazamiento y fraccionamiento de deudas",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RB01.shtml",
  ],
  [
    "aeat.collection.offset.requested",
    "Compensaciones. Compensación a instancia",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RC01.shtml",
  ],
  [
    "aeat.collection.offset.exofficio",
    "Compensaciones. Compensación de oficio",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RC02.shtml",
  ],
  [
    "aeat.assessment.irpf",
    "IRPF. Verificación de datos / Comprobación limitada",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G200.shtml",
  ],
  [
    "aeat.assessment.vat",
    "IVA. Verificación de datos / Comprobación limitada. Autoliquidaciones",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G202.shtml",
  ],
  [
    "aeat.sanction.general",
    "Procedimiento sancionador general de Gestión Tributaria",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ69.shtml",
  ],
  [
    "aeat.review.reconsideration",
    "Recurso de reposición contra actos de Gestión Tributaria",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ52.shtml",
  ],
  [
    "aeat.review.economic_administrative",
    "Reclamación económico-administrativa contra actos de Gestión Tributaria",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ53.shtml",
  ],
  [
    "aeat.refund.undue",
    "Devolución de ingresos indebidos",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA03.shtml",
  ],
  [
    "aeat.liability.solidary",
    "Procedimiento de declaración de responsabilidad solidaria",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RG01.shtml",
  ],
  [
    "aeat.liability.subsidiary",
    "Procedimiento de declaración de responsabilidad subsidiaria",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RG02.shtml",
  ],
  [
    "aeat.liability.successors",
    "Procedimiento de recaudación frente a los sucesores",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RG03.shtml",
  ],
  [
    "aeat.inspection.general",
    "Procedimiento inspector de comprobación e investigación",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/IZ01.shtml",
  ],
  [
    "aeat.certificate.compliance",
    "Certificados tributarios. Estar al corriente de obligaciones tributarias",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G304.shtml",
  ],
  [
    "aeat.collection.precautionary",
    "Recaudación. Medidas cautelares",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA09.shtml",
  ],
  [
    "aeat.collection.auction",
    "Enajenación de bienes embargados o aportados como garantía mediante subasta",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RF02.shtml",
  ],
] as const;

describe("fiscal notification official source catalog v1", () => {
  it("contains the exact notification source seed and excludes Modelos", () => {
    expect(FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V1.map((source) => source.id))
      .toEqual(EXPECTED_SOURCE_IDS);
    expect(new Set(EXPECTED_SOURCE_IDS).size).toBe(17);
    expect(JSON.stringify(FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V1)).not.toMatch(
      /aeat\.models|census\.037|fiscal-models/i,
    );
    expect(
      FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V1.map(
        ({ id, title, canonicalUrl }) => [id, title, canonicalUrl] as const,
      ),
    ).toEqual(EXPECTED_SOURCE_REFERENCES);
  });

  it("records URL-only verification without activating templates or legal rules", () => {
    for (const source of FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V1) {
      const url = new URL(source.canonicalUrl);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("sede.agenciatributaria.gob.es");
      expect(url.pathname).toMatch(/^\/Sede\/procedimientos\/[A-Z0-9]+\.shtml$/u);
      expect(source).toMatchObject({
        authority: "AEAT",
        authorityLevel: "OFFICIAL_PRIMARY",
        sourceKind: "PROCEDURE_INFORMATION",
        urlCheckedOn: "2026-07-12",
        verificationStatus: "OFFICIAL_URL_VERIFIED",
        contentSha256: null,
        legalReviewStatus: "LEGAL_REVIEW_PENDING",
        usagePolicy: "PROCEDURE_CONTEXT_ONLY",
        permitsLegalRuleActivation: false,
        permitsTemplateActivation: false,
        retainedSourceContent: "NONE",
      });
      expect(Object.isFrozen(source)).toBe(true);
    }
    expect(Object.isFrozen(FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V1)).toBe(true);
  });

  it("resolves only exact registered IDs and never coerces input", () => {
    expect(resolveFiscalNotificationOfficialSourceV1("aeat.collection.enforcement"))
      .toMatchObject({ id: "aeat.collection.enforcement" });
    for (const invalid of [
      " aeat.collection.enforcement",
      "AEAT.COLLECTION.ENFORCEMENT",
      "aeat.models.catalog",
      "aeat.collection.\u0000enforcement",
      "x".repeat(1_000_000),
      "__proto__",
      1,
      null,
      {},
    ]) {
      expect(resolveFiscalNotificationOfficialSourceV1(invalid)).toBeNull();
    }
  });

  it("contains no runtime network, AI, storage, clock, PII or rule engine", () => {
    const source = readFileSync(
      new URL("./official-sources.v1.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|Date\.now|new Date|Math\.random|ownerScope|documentId|taxId|NIF|CSV|IBAN|deadline|payment-actions|tax-engine/iu,
    );
  });
});
