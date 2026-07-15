import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import { MODEL_308_GUIDE_V1 } from "./model-308-guide.v1";
import { MODEL_341_GUIDE_V1 } from "./model-341-guide.v1";

type Code = "308" | "341";
type Guide = FiscalModelPracticalGuideV1 & { readonly code: Code };

const guides: readonly Guide[] = [MODEL_308_GUIDE_V1, MODEL_341_GUIDE_V1];

const OFFICIAL_HOSTS = new Set([
  "sede.agenciatributaria.gob.es",
  "www1.agenciatributaria.gob.es",
  "www2.agenciatributaria.gob.es",
  "www.boe.es",
]);

function officialContent(code: Code) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("Models 308 and 341 sectoral VAT guides", () => {
  it("explains the three Model 308 cases without hiding the institutional case", () => {
    const copy = JSON.stringify(MODEL_308_GUIDE_V1);
    for (const expected of [
      "recargo de equivalencia",
      "régimen simplificado",
      "entrega ocasional",
      "supuesto institucional",
      "DIVA",
      "Documento Electrónico de Reembolso",
      "tres meses",
      "15 días",
      "20 días naturales",
      "30 días naturales",
      "N1",
      "2.500 kg",
      "N2",
      "N3",
      "6.000 km",
      "100 horas",
      "40 horas",
      "no tienen que cumplirse ambas",
      "no debe deducirse también",
    ]) {
      expect(copy).toContain(expected);
    }
    expect(MODEL_308_GUIDE_V1.faq).toHaveLength(12);
    expect(MODEL_308_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/303",
    );
  });

  it("keeps each Model 308 deadline tied to its actual case", () => {
    const deadlines = MODEL_308_GUIDE_V1.sections.find(
      (section) => section.id === "model-308-deadlines",
    );
    expect(deadlines?.cards).toHaveLength(4);
    expect(JSON.stringify(deadlines)).toContain("Viajeros y recargo");
    expect(JSON.stringify(deadlines)).toContain("Transportistas");
    expect(JSON.stringify(deadlines)).toContain("Medio de transporte nuevo");
    expect(JSON.stringify(deadlines)).toContain("Supuesto institucional");
    expect(JSON.stringify(deadlines)).toContain("Nunca uses un único plazo");
  });

  it("covers Model 341 REAGP rates, payer boundary and quarterly cycle", () => {
    const copy = JSON.stringify(MODEL_341_GUIDE_V1);
    for (const expected of [
      "REAGP",
      "12 %",
      "10,5 %",
      "Hacienda Pública",
      "comprador",
      "recibo",
      "valor de mercado",
      "gastos accesorios",
      "exportación",
      "otro Estado miembro",
      "Modelo 349",
      "Modelo 131",
      "30 días naturales de enero",
      "no se corrige automáticamente con otro 341 negativo",
    ]) {
      expect(copy).toContain(expected);
    }
    expect(MODEL_341_GUIDE_V1.faq).toHaveLength(12);
    expect(MODEL_341_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/349",
    );
  });

  it("versions revisable rules and restricts direct links to official HTTPS hosts", () => {
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
        if (link.href.startsWith("/")) continue;
        const url = new URL(link.href);
        expect(url.protocol, link.href).toBe("https:");
        expect(OFFICIAL_HOSTS.has(url.hostname), link.href).toBe(true);
      }
    }
  });

  it("keeps every cited catalog source registered, hashed and verified", () => {
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

  it("publishes stable routes, SEO, subtitles and catalog copy", () => {
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

    expect(pageSource).toContain(
      "Modelo 308 AEAT: devolución de IVA en casos especiales",
    );
    expect(pageSource).toContain(
      "Modelo 341 AEAT: compensaciones del régimen agrario",
    );
    for (const code of ["308", "341"] as const) {
      const page = resolvePublicAeatModelReviewPageV1({ code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY") {
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${code}`);
      }
      expect(catalogSource).toContain(`"${code}": [`);
      expect(detailSource).toContain(`"${code}":`);
      expect(viewSource).toContain(`content.code === "${code}"`);
    }
    expect(catalogSource).toContain("IVA sectorial");
  });

  it("reuses the accessible renderer and stores no sensitive case data", () => {
    const renderer = readFileSync(
      new URL("./FiscalModelPracticalGuide.tsx", import.meta.url),
      "utf8",
    );
    expect(renderer).not.toContain("<h1");
    expect(renderer).toContain('target="_blank"');
    expect(renderer).toContain('rel="noopener noreferrer"');
    expect(renderer).not.toContain("localStorage");
    expect(renderer).not.toContain("supabase");
    expect(renderer).not.toContain("IBANInput");
    for (const guide of guides) {
      expect(JSON.stringify(guide)).not.toContain("returnTo=");
      expect(guide.externalActionNotice).toContain("no almacena");
    }
  });
});
