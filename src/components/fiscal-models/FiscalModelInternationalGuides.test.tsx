import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import { MODEL_216_GUIDE_V1 } from "./model-216-guide.v1";
import { MODEL_296_GUIDE_V1 } from "./model-296-guide.v1";
import { MODEL_360_GUIDE_V1 } from "./model-360-guide.v1";
import { MODEL_361_GUIDE_V1 } from "./model-361-guide.v1";

type Guide = FiscalModelPracticalGuideV1 & {
  readonly code: "216" | "296" | "360" | "361";
};

const guides: readonly Guide[] = [
  MODEL_216_GUIDE_V1,
  MODEL_296_GUIDE_V1,
  MODEL_360_GUIDE_V1,
  MODEL_361_GUIDE_V1,
];

function officialContent(code: Guide["code"]) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("Models 216, 296, 360 and 361 practical guides", () => {
  it("explains Model 360 without promising a refund", () => {
    const copy = JSON.stringify(MODEL_360_GUIDE_V1);
    for (const expected of [
      "otro Estado miembro",
      "factura rectificativa",
      "tres meses",
      "400 €",
      "50 €",
      "30 de septiembre",
      "cuatro meses",
      "ocho",
      "Modelo 303",
      "Modelo 349",
      "Modelo 361",
      "no está garantizada",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_360_GUIDE_V1.faq).toHaveLength(15);
  });

  it("keeps Model 361 international, representative-aware and reciprocity-safe", () => {
    const copy = JSON.stringify(MODEL_361_GUIDE_V1);
    for (const expected of [
      "fuera de la Unión Europea",
      "representante establecido en España",
      "responsable solidario",
      "reciprocidad",
      "Dirección General de Tributos",
      "OSS",
      "1.000 €",
      "250 €",
      "apostilla",
      "Modelo 360",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_361_GUIDE_V1.faq).toHaveLength(15);
  });

  it("makes Model 216 conditional on residence, income and evidence", () => {
    const copy = JSON.stringify(MODEL_216_GUIDE_V1);
    for (const expected of [
      "No se presenta por cualquier factura extranjera",
      "pagador obligado a retener",
      "certificado de residencia",
      "establecimiento permanente",
      "Modelo 115",
      "Modelo 211",
      "Modelo 296",
      "19 %",
      "24 %",
      "declaración negativa",
      "No se presenta vacío",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_216_GUIDE_V1.effectiveYear).toBe(2026);
    expect(MODEL_216_GUIDE_V1.faq).toHaveLength(15);
  });

  it("versions Model 296 by exercise and separates web and file corrections", () => {
    const copy = JSON.stringify(MODEL_296_GUIDE_V1);
    for (const expected of [
      "declaración informativa anual",
      "Modelo 216",
      "rentas exentas",
      "TIN",
      "no acredita por sí sola",
      "40.000 registros",
      "vista previa",
      "conjunto completo",
      "TGVI",
      "Orden HAC/623/2026",
      "presentará en 2027",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_296_GUIDE_V1.effectiveYear).toBe(2026);
    expect(MODEL_296_GUIDE_V1.filingYear).toBe(2027);
    expect(MODEL_296_GUIDE_V1.faq).toHaveLength(15);
  });

  it("versions every guide and restricts direct links to official HTTPS hosts", () => {
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
      const sources = new Map(
        content.sources.map((source) => [source.id, source]),
      );
      for (const sourceId of guide.sourceIds) {
        const source = sources.get(sourceId);
        expect(source, `${guide.code}: ${sourceId}`).toBeDefined();
        expect(source?.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(source?.verificationStatus).toBe("SOURCE_HASH_CAPTURED");
      }
    }
  });

  it("publishes the guides through stable routes with dedicated SEO", () => {
    const pageSource = readFileSync(
      new URL(
        "../../app/consultor-fiscal/modelos/[codigo]/page.tsx",
        import.meta.url,
      ),
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
      "Modelo 216 AEAT: retenciones por pagos a no residentes",
      "Modelo 296 AEAT: resumen anual de pagos a no residentes",
      "Modelo 360 AEAT: devolución del IVA soportado en la UE",
      "Modelo 361 AEAT: devolución del IVA a empresas de fuera de la UE",
    ])
      expect(pageSource).toContain(title);
    for (const subtitle of [
      "Retenciones por pagos a personas y empresas no residentes",
      "Resumen anual de rentas pagadas a no residentes",
      "Devolución del IVA soportado en otros países de la Unión Europea",
      "Devolución del IVA español a empresarios establecidos fuera de la Unión Europea",
    ])
      expect(detailSource).toContain(subtitle);

    for (const code of ["216", "296", "360", "361"] as const) {
      const page = resolvePublicAeatModelReviewPageV1({ code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY") {
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${code}`);
      }
      expect(catalogSource).toContain(`"${code}": [`);
      expect(viewSource).toContain(`content.code === "${code}"`);
    }
  });

  it("keeps the prescribed territorial notes visible", () => {
    expect(JSON.stringify(MODEL_360_GUIDE_V1)).toContain(
      "Canarias, Ceuta y Melilla tienen particularidades específicas",
    );
    expect(JSON.stringify(MODEL_361_GUIDE_V1)).toContain(
      "Canarias, Ceuta y Melilla tienen sistemas tributarios propios",
    );
    for (const guide of [MODEL_216_GUIDE_V1, MODEL_296_GUIDE_V1]) {
      expect(JSON.stringify(guide)).toContain("País Vasco y Navarra");
    }
  });
});
