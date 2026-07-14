import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import { MODEL_100_GUIDE_V1 } from "./model-100-guide.v1";
import { MODEL_184_GUIDE_V1 } from "./model-184-guide.v1";
import { MODEL_309_GUIDE_V1 } from "./model-309-guide.v1";

type Guide = FiscalModelPracticalGuideV1 & {
  readonly code: "100" | "184" | "309";
};

const guides: readonly Guide[] = [
  MODEL_100_GUIDE_V1,
  MODEL_184_GUIDE_V1,
  MODEL_309_GUIDE_V1,
];

function officialContent(code: Guide["code"]) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("Models 100, 184 and 309 practical guides", () => {
  it("explains the Model 100 RETA obligation and annual personal return", () => {
    const copy = JSON.stringify(MODEL_100_GUIDE_V1);
    for (const expected of [
      "en cualquier momento del año",
      "autónomo colaborador",
      "no hubiera ingresos",
      "resto de sus rentas personales",
      "pagos a cuenta",
      "Renta WEB",
      "Renta DIRECTA",
      "estimación directa",
      "estimación objetiva",
      "Modelo 184",
    ]) expect(copy).toContain(expected);
    expect(MODEL_100_GUIDE_V1.faq).toHaveLength(14);
  });

  it("keeps Model 309 non-periodic, special and always payable", () => {
    const copy = JSON.stringify(MODEL_309_GUIDE_V1);
    for (const expected of [
      "no periódica",
      "No sustituye al Modelo 303",
      "recargo de equivalencia",
      "actividades exentas",
      "régimen agrario",
      "Treinta días",
      "un mes",
      "periodo 0A",
      "no admite resultado a compensar",
      "complementaria",
      "Modelo 349",
    ]) expect(copy).toContain(expected);
    expect(MODEL_309_GUIDE_V1.faq).toHaveLength(12);
  });

  it("explains Model 184 entity filing, threshold and member notice", () => {
    const copy = JSON.stringify(MODEL_184_GUIDE_V1);
    for (const expected of [
      "Declara la entidad, no cada miembro",
      "con independencia del importe",
      "no exceden de 3.000 €",
      "conserva su naturaleza",
      "por partes iguales",
      "plazo de un mes",
      "hasta 40.000 registros",
      "Modelo 100",
    ]) expect(copy).toContain(expected);
    expect(MODEL_184_GUIDE_V1.faq).toHaveLength(15);
  });

  it("versions all guides and restricts direct links to official HTTPS hosts", () => {
    const allowedHosts = new Set([
      "sede.agenciatributaria.gob.es",
      "www.boe.es",
    ]);
    for (const guide of guides) {
      expect(guide.lastVerifiedAt).toBe("2026-07-14");
      expect(guide.requiresAnnualReview).toBe(true);
      for (const link of [
        ...guide.actions,
        ...guide.officialLinks,
        ...guide.legalLinks,
      ]) {
        if (!("href" in link) || !link.href) continue;
        const url = new URL(link.href);
        expect(url.protocol, link.href).toBe("https:");
        expect(allowedHosts.has(url.hostname), link.href).toBe(true);
      }
    }
  });

  it("keeps every cited source registered, hashed and verified", () => {
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

  it("publishes exact SEO, subtitles, search labels and literal routes", () => {
    const pageSource = readFileSync(
      new URL("../../app/consultor-fiscal/modelos/[codigo]/page.tsx", import.meta.url),
      "utf8",
    );
    const catalogSource = readFileSync(
      new URL("./FiscalModelCatalogView.tsx", import.meta.url),
      "utf8",
    );
    const detailSource = readFileSync(
      new URL("./FiscalModelStructuralDetailView.tsx", import.meta.url),
      "utf8",
    );
    const viewSource = readFileSync(
      new URL("./FiscalModelOfficialContentView.tsx", import.meta.url),
      "utf8",
    );

    for (const title of [
      "Modelo 100 AEAT: declaración de la Renta del autónomo",
      "Modelo 309 AEAT: IVA no periódico",
      "Modelo 184 AEAT: comunidades de bienes y rentas atribuidas",
    ]) expect(pageSource).toContain(title);
    for (const subtitle of [
      "Declaración anual de la Renta del autónomo",
      "IVA no periódico para operaciones especiales",
      "Rentas de comunidades de bienes y otras entidades",
    ]) expect(detailSource).toContain(subtitle);

    for (const code of ["100", "184", "309"] as const) {
      const page = resolvePublicAeatModelReviewPageV1({ code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY") {
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${code}`);
      }
      expect(catalogSource).toContain(`"${code}": [`);
      expect(viewSource).toContain(`content.code === "${code}"`);
    }
  });

  it("includes the required territorial warning in all three guides", () => {
    const expected =
      "Esta guía se refiere principalmente a los trámites de la Agencia Tributaria estatal y al territorio común. En País Vasco o Navarra la declaración puede corresponder a la Hacienda foral competente. En materia de IVA, Canarias, Ceuta y Melilla tienen regímenes fiscales distintos.";
    for (const guide of guides) expect(JSON.stringify(guide)).toContain(expected);
  });
});
