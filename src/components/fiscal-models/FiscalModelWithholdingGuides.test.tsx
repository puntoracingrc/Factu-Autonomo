import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import { MODEL_111_GUIDE_V1 } from "./model-111-guide.v1";
import { MODEL_115_GUIDE_V1 } from "./model-115-guide.v1";
import { MODEL_180_GUIDE_V1 } from "./model-180-guide.v1";
import { MODEL_190_GUIDE_V1 } from "./model-190-guide.v1";

type WithholdingGuide = FiscalModelPracticalGuideV1 & {
  readonly code: "111" | "115" | "180" | "190";
};

const guides: readonly WithholdingGuide[] = [
  MODEL_111_GUIDE_V1,
  MODEL_190_GUIDE_V1,
  MODEL_115_GUIDE_V1,
  MODEL_180_GUIDE_V1,
];

const OFFICIAL_HOSTS = new Set([
  "sede.agenciatributaria.gob.es",
  "www1.agenciatributaria.gob.es",
  "www2.agenciatributaria.gob.es",
  "www.boe.es",
]);

function officialContent(code: WithholdingGuide["code"]) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("Models 111, 190, 115 and 180 practical guides", () => {
  it("explains who submits Model 111 and keeps annual rates versioned", () => {
    const copy = JSON.stringify(MODEL_111_GUIDE_V1);
    expect(MODEL_111_GUIDE_V1.effectiveYear).toBe(2026);
    expect(MODEL_111_GUIDE_V1.requiresAnnualReview).toBe(true);
    for (const expected of [
      "quien paga",
      "quien recibe",
      "Nóminas",
      "15 %",
      "7 %",
      "2 %",
      "1 %",
      "1.060 €",
      "declaración negativa",
      "Modelo 036",
      "Modelo 037 es histórico",
      "complementaria",
    ]) expect(copy).toContain(expected);
    expect(MODEL_111_GUIDE_V1.faq).toHaveLength(12);
    expect(MODEL_111_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/190",
    );
  });

  it("keeps Model 190 informational, annual and detailed by perceptor", () => {
    const copy = JSON.stringify(MODEL_190_GUIDE_V1);
    for (const expected of [
      "No vuelve a pagar",
      "cada perceptor",
      "A · Trabajo",
      "E · Consejeros",
      "F · Cursos",
      "G · Actividades profesionales",
      "H · Actividades",
      "K · Premios",
      "40.000 registros",
      "no es válido para presentar",
      "individuales o colectivos",
    ]) expect(copy).toContain(expected);
    expect(copy).not.toContain("Presentar ejercicio 2025");
    expect(MODEL_190_GUIDE_V1.faq).toHaveLength(11);
  });

  it("explains the Model 115 tenant boundary, exceptions and 2026 rate", () => {
    const copy = JSON.stringify(MODEL_115_GUIDE_V1);
    for (const expected of [
      "inquilino",
      "no el propietario",
      "900 €",
      "viviendas para sus empleados",
      "grupo 861",
      "coworking",
      "216/296",
      "19 %",
      "1.020 €",
      "Modelo 037 es histórico",
    ]) expect(copy).toContain(expected);
    expect(MODEL_115_GUIDE_V1.faq).toHaveLength(12);
    expect(MODEL_115_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/180",
    );
  });

  it("keeps Model 180 annual, informational and cautious about Model 347", () => {
    const copy = JSON.stringify(MODEL_180_GUIDE_V1);
    for (const expected of [
      "No vuelve a pagar",
      "referencia catastral",
      "40.000 registros",
      "Modelo 347",
      "incluidos correctamente",
      "no corrige automáticamente",
      "certificado",
    ]) expect(copy).toContain(expected);
    expect(copy).not.toContain("Presentar ejercicio 2025");
    expect(MODEL_180_GUIDE_V1.faq).toHaveLength(11);
  });

  it("versions every guide and keeps external links on official HTTPS hosts", () => {
    for (const guide of guides) {
      expect(guide.effectiveYear).toBe(2026);
      expect(guide.lastVerifiedAt).toBe("2026-07-14");
      expect(guide.requiresAnnualReview).toBe(true);
      expect(guide.faq.length).toBeGreaterThanOrEqual(11);
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

  it("publishes literal routes, dedicated SEO and practical catalog labels", () => {
    const pageSource = readFileSync(
      new URL("../../app/consultor-fiscal/modelos/[codigo]/page.tsx", import.meta.url),
      "utf8",
    );
    const catalogSource = readFileSync(
      new URL("./FiscalModelCatalogView.tsx", import.meta.url),
      "utf8",
    );
    const viewSource = readFileSync(
      new URL("./FiscalModelOfficialContentView.tsx", import.meta.url),
      "utf8",
    );
    for (const code of ["111", "115", "180", "190"] as const) {
      const page = resolvePublicAeatModelReviewPageV1({ code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY") {
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${code}`);
      }
      expect(pageSource).toContain(`\"${code}\": \"Modelo ${code} AEAT:`);
      expect(catalogSource).toContain(`\"${code}\": [`);
      expect(viewSource).toContain(`content.code === \"${code}\"`);
    }
  });
});
