import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import { MODEL_123_GUIDE_V1 } from "./model-123-guide.v1";
import { MODEL_145_GUIDE_V1 } from "./model-145-guide.v1";
import { MODEL_193_GUIDE_V1 } from "./model-193-guide.v1";

type Guide = FiscalModelPracticalGuideV1 & {
  readonly code: "123" | "145" | "193";
};

const guides: readonly Guide[] = [
  MODEL_123_GUIDE_V1,
  MODEL_193_GUIDE_V1,
  MODEL_145_GUIDE_V1,
];

const OFFICIAL_HOSTS = new Set([
  "sede.agenciatributaria.gob.es",
  "www1.agenciatributaria.gob.es",
  "www2.agenciatributaria.gob.es",
  "www.boe.es",
]);

function officialContent(code: Guide["code"]) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("Models 123, 193 and 145 practical guides", () => {
  it("explains Model 123 as a payer filing and links its annual summary", () => {
    const copy = JSON.stringify(MODEL_123_GUIDE_V1);
    for (const expected of [
      "quien paga",
      "no quien recibe",
      "Dividendos",
      "intereses",
      "19 %",
      "Modelo 115",
      "Modelo 117",
      "Modelos 124, 126 y 128",
      "Modelo 216",
      "resultado cero",
      "complementaria",
      "Modelo 193",
    ]) expect(copy).toContain(expected);
    expect(MODEL_123_GUIDE_V1.faq).toHaveLength(12);
    expect(MODEL_123_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/193",
    );
  });

  it("keeps Model 193 annual, informative and reconciled by perceptor", () => {
    const copy = JSON.stringify(MODEL_193_GUIDE_V1);
    for (const expected of [
      "No vuelve a pagar",
      "cada perceptor",
      "Clave A",
      "Clave B",
      "Clave C",
      "modalidad simplificada",
      "40.000 registros",
      "TGVI",
      "no es válido para presentar",
      "registros erróneos",
      "Modelo 123",
    ]) expect(copy).toContain(expected);
    expect(MODEL_193_GUIDE_V1.faq).toHaveLength(12);
    expect(MODEL_193_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/123",
    );
  });

  it("keeps Model 145 between worker and payer with no AEAT filing", () => {
    const copy = JSON.stringify(MODEL_145_GUIDE_V1);
    for (const expected of [
      "No se presenta ante la Agencia Tributaria",
      "diez días",
      "cinco días",
      "tipo superior",
      "debe conservar",
      "Factu no los solicita, recibe ni almacena",
      "Modelo 111",
      "Modelo 190",
    ]) expect(copy).toContain(expected);
    expect(MODEL_145_GUIDE_V1.faq).toHaveLength(15);
    expect(
      MODEL_145_GUIDE_V1.actions.some((action) =>
        action.label.startsWith("Presentar"),
      ),
    ).toBe(false);
  });

  it("renders the specific Model 145 privacy notice", () => {
    const componentSource = readFileSync(
      new URL("./FiscalModelPracticalGuide.tsx", import.meta.url),
      "utf8",
    );
    expect(MODEL_145_GUIDE_V1.externalActionNotice).toBe(
      "El documento se descarga desde la AEAT, pero debe entregarse al pagador. Factu no recibe ni almacena sus datos.",
    );
    expect(componentSource).toContain("guide.externalActionNotice ??");
    expect(componentSource).toContain('target="_blank"');
    expect(componentSource).toContain('rel="noopener noreferrer"');
  });

  it("versions every guide and restricts direct links to official HTTPS hosts", () => {
    for (const guide of guides) {
      expect(guide.effectiveYear).toBe(2026);
      expect(guide.lastVerifiedAt).toBe("2026-07-15");
      expect(guide.requiresAnnualReview).toBe(true);
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

  it("publishes literal routes, SEO, subtitles and practical catalog labels", () => {
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

    for (const expected of [
      "Modelo 123 AEAT: retenciones sobre dividendos e intereses",
      "Modelo 193 AEAT: resumen anual de dividendos e intereses",
      "Modelo 145 AEAT: datos para calcular la retención de la nómina",
    ]) expect(pageSource).toContain(expected);
    for (const expected of [
      "Retenciones sobre dividendos, intereses y otras rentas del capital",
      "Resumen anual de dividendos, intereses y otras rentas del capital",
      "Datos del trabajador para calcular la retención de su nómina",
    ]) expect(detailSource).toContain(expected);

    for (const code of ["123", "145", "193"] as const) {
      const page = resolvePublicAeatModelReviewPageV1({ code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY") {
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${code}`);
      }
      expect(catalogSource).toContain(`"${code}": [`);
      expect(viewSource).toContain(`content.code === "${code}"`);
    }
  });

  it("includes the territorial boundary in Models 123 and 193", () => {
    for (const guide of [MODEL_123_GUIDE_V1, MODEL_193_GUIDE_V1]) {
      expect(JSON.stringify(guide)).toContain(
        "En País Vasco o Navarra la obligación puede corresponder a la Hacienda foral competente.",
      );
    }
  });
});
