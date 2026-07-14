import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import { MODEL_130_GUIDE_V1 } from "./model-130-guide.v1";
import { MODEL_131_GUIDE_V1 } from "./model-131-guide.v1";
import { MODEL_303_GUIDE_V1 } from "./model-303-guide.v1";
import { MODEL_390_GUIDE_V1 } from "./model-390-guide.v1";

type QuarterlyGuide = FiscalModelPracticalGuideV1 & {
  readonly code: "130" | "131" | "303" | "390";
};

const guides: readonly QuarterlyGuide[] = [
  MODEL_303_GUIDE_V1,
  MODEL_390_GUIDE_V1,
  MODEL_130_GUIDE_V1,
  MODEL_131_GUIDE_V1,
];

const OFFICIAL_HOSTS = new Set([
  "sede.agenciatributaria.gob.es",
  "www1.agenciatributaria.gob.es",
  "www2.agenciatributaria.gob.es",
  "www.boe.es",
]);

function officialContent(code: "130" | "131" | "303" | "390") {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("Models 303, 390, 130 and 131 practical guides", () => {
  it("covers the Model 303 VAT lifecycle and rectification boundary", () => {
    const copy = JSON.stringify(MODEL_303_GUIDE_V1);
    for (const expected of [
      "IVA repercutido",
      "IVA soportado deducible",
      "sin actividad",
      "REDEME",
      "Pre303",
      "inversión del sujeto pasivo",
      "adquisiciones intracomunitarias",
      "tercer trimestre de 2024",
      "no permite adjuntar documentación",
    ]) expect(copy).toContain(expected);
    expect(MODEL_303_GUIDE_V1.faq).toHaveLength(12);
    expect(MODEL_303_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/390",
    );
  });

  it("keeps Model 390 annual, informational and explicitly exonerable", () => {
    const copy = JSON.stringify(MODEL_390_GUIDE_V1);
    expect(copy).toContain("no sustituye");
    expect(copy).toContain("No genera normalmente un nuevo pago");
    expect(copy).toContain("exonerado");
    expect(copy).toContain("último Modelo 303");
    expect(copy).toContain("archivo .ses");
    expect(copy).toContain("no corrige automáticamente un 303");
    expect(MODEL_390_GUIDE_V1.faq).toHaveLength(10);
  });

  it("explains Model 130 as an accumulated IRPF advance", () => {
    const copy = JSON.stringify(MODEL_130_GUIDE_V1);
    expect(copy).toContain("acumulado desde enero");
    expect(copy).toContain("70 %");
    expect(copy).toContain("20 %");
    expect(copy).toContain("900 €");
    expect(copy).toContain("no genera devolución trimestral");
    expect(copy).toContain("No se copia el sistema especial de rectificativas del 303");
    expect(MODEL_130_GUIDE_V1.faq).toHaveLength(10);
  });

  it("versions every annual Model 131 rule for 2026", () => {
    const copy = JSON.stringify(MODEL_131_GUIDE_V1);
    expect(MODEL_131_GUIDE_V1.effectiveYear).toBe(2026);
    expect(MODEL_131_GUIDE_V1.requiresAnnualReview).toBe(true);
    expect(MODEL_131_GUIDE_V1.lastVerifiedAt).toBe("2026-07-14");
    expect(copy).toContain("250.000 €");
    expect(copy).toContain("125.000 €");
    expect(copy).toContain("reducción general del 5 %");
    expect(copy).toContain("unidades de personal asalariado");
    expect(copy).toContain("No se usa por comodidad");
    expect(MODEL_131_GUIDE_V1.faq).toHaveLength(12);
  });

  it("renders accessible guide sections without a second h1", () => {
    const componentSource = readFileSync(
      new URL("./FiscalModelPracticalGuide.tsx", import.meta.url),
      "utf8",
    );
    expect(componentSource).not.toContain("<h1");
    expect(componentSource).toContain('target="_blank"');
    expect(componentSource).toContain('rel="noopener noreferrer"');
    for (const guide of guides) {
      expect(guide.faq.length).toBeGreaterThanOrEqual(10);
      expect(guide.lastVerifiedAt).toBe("2026-07-14");
    }
  });

  it("keeps every external link on an official HTTPS host", () => {
    for (const guide of guides) {
      const links = [
        ...guide.actions,
        ...guide.officialLinks,
        ...guide.legalLinks,
        ...(guide.actionGroups?.flatMap((group) => group.links) ?? []),
      ];
      for (const link of links) {
        if (!("href" in link) || !link.href) continue;
        const url = new URL(link.href);
        expect(url.protocol, link.href).toBe("https:");
        expect(OFFICIAL_HOSTS.has(url.hostname), link.href).toBe(true);
      }
    }
  });

  it("keeps every cited source registered, hashed and official", () => {
    for (const guide of guides) {
      const content = officialContent(guide.code);
      const sources = new Map(content.sources.map((source) => [source.id, source]));
      for (const sourceId of guide.sourceIds) {
        const source = sources.get(sourceId);
        expect(source, `${guide.code}: ${sourceId}`).toBeDefined();
        expect(source?.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(source?.verificationStatus).toBe("SOURCE_HASH_CAPTURED");
      }
    }
  });

  it("preserves literal routes and publishes dedicated SEO copy", () => {
    const pageSource = readFileSync(
      new URL("../../app/consultor-fiscal/modelos/[codigo]/page.tsx", import.meta.url),
      "utf8",
    );
    const catalogSource = readFileSync(
      new URL("./FiscalModelCatalogView.tsx", import.meta.url),
      "utf8",
    );
    for (const code of ["130", "131", "303", "390"] as const) {
      const page = resolvePublicAeatModelReviewPageV1({ code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY") {
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${code}`);
      }
      expect(pageSource).toContain(`\"${code}\": \"Modelo ${code} AEAT:`);
      expect(catalogSource).toContain(`\"${code}\": [`);
    }
  });
});
