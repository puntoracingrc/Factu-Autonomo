import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import { MODEL_149_GUIDE_V1 } from "./model-149-guide.v1";
import { MODEL_151_GUIDE_V1 } from "./model-151-guide.v1";
import { MODEL_210_GUIDE_V1 } from "./model-210-guide.v1";
import { MODEL_211_GUIDE_V1 } from "./model-211-guide.v1";

type Guide = FiscalModelPracticalGuideV1 & {
  readonly code: "149" | "151" | "210" | "211";
};

const guides: readonly Guide[] = [
  MODEL_149_GUIDE_V1,
  MODEL_151_GUIDE_V1,
  MODEL_210_GUIDE_V1,
  MODEL_211_GUIDE_V1,
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

describe("Models 149, 151, 210 and 211 practical guides", () => {
  it("explains every Model 149 communication, eligibility control and deadline", () => {
    const copy = JSON.stringify(MODEL_149_GUIDE_V1);
    for (const expected of [
      "Opción",
      "Renuncia",
      "Exclusión",
      "Fin del desplazamiento",
      "cinco periodos",
      "seis meses",
      "noviembre y diciembre",
      "mes siguiente",
      "diez días hábiles",
      "persona principal",
      "número de registro",
      "NIE",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_149_GUIDE_V1.faq).toHaveLength(12);
    expect(MODEL_149_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/151",
    );
    expect(copy).toContain("/consultor-fiscal/modelos/036");
    expect(copy).toContain("inversión pasiva");
  });

  it("keeps Model 151 annual, campaign-specific and separate from ordinary IRPF", () => {
    const copy = JSON.stringify(MODEL_151_GUIDE_V1);
    for (const expected of [
      "Modelo 100",
      "600.000",
      "24 %",
      "47 %",
      "19 %",
      "30 %",
      "Gastos limitados",
      "no se compensa",
      "30 %",
      "Impuesto sobre el Patrimonio",
      "campaña",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_151_GUIDE_V1.taxPeriodYear).toBe(2025);
    expect(MODEL_151_GUIDE_V1.filingYear).toBe(2026);
    expect(MODEL_151_GUIDE_V1.faq).toHaveLength(12);
    expect(copy).toContain("/consultor-fiscal/modelos/211");
  });

  it("captures the exact Model 210 transition approved for 2026 and 2027", () => {
    const copy = JSON.stringify(MODEL_210_GUIDE_V1);
    for (const expected of [
      "1 de enero al 31 de diciembre de 2026",
      "1 de abril al 31 de diciembre de 2027",
      "23 de diciembre",
      "1 al 20 de abril de 2027",
      "abril a junio de 2026",
      "julio a septiembre de 2026",
      "octubre a diciembre de 2026",
      "1 de enero de 2027",
      "cuatro años",
      "Modelo 211",
      "gastos directamente relacionados",
      "Servicios",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_210_GUIDE_V1.faq).toHaveLength(12);
  });

  it("assigns Model 211 to the buyer and never presents 3 percent as final tax", () => {
    const copy = JSON.stringify(MODEL_211_GUIDE_V1);
    for (const expected of [
      "quien compra",
      "3 %",
      "contraprestación",
      "no sobre la ganancia",
      "Un mes",
      "por cada inmueble",
      "varios compradores",
      "Varios vendedores",
      "afección del inmueble",
      "ITP, IVA o AJD",
      "declaración complementaria",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_211_GUIDE_V1.faq).toHaveLength(12);
    expect(MODEL_211_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/210",
    );
  });

  it("versions all guides and limits direct links to official HTTPS hosts", () => {
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

  it("publishes stable routes, dedicated SEO, subtitles and catalog vocabulary", () => {
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
      "Modelo 149 AEAT: opción por el régimen de desplazados",
      "Modelo 151 AEAT: declaración de trabajadores desplazados",
      "Modelo 210 AEAT: declaración de no residentes",
      "Modelo 211 AEAT: retención en la compra a no residentes",
    ])
      expect(pageSource).toContain(title);
    expect(catalogSource).toContain("Movilidad internacional y no residentes");

    for (const code of ["149", "151", "210", "211"] as const) {
      const page = resolvePublicAeatModelReviewPageV1({ code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY") {
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${code}`);
      }
      expect(catalogSource).toContain(`"${code}": [`);
      expect(detailSource).toContain(`"${code}":`);
      expect(viewSource).toContain(`content.code === "${code}"`);
    }
  });

  it("keeps classification fail-closed and the renderer free of persistence", () => {
    for (const guide of guides) {
      const copy = JSON.stringify(guide);
      expect(copy).toContain("País Vasco o Navarra");
      expect(copy).toContain("residencia fiscal");
    }
    const renderer = readFileSync(
      new URL("./FiscalModelPracticalGuide.tsx", import.meta.url),
      "utf8",
    );
    expect(renderer).toContain('target="_blank"');
    expect(renderer).toContain('rel="noopener noreferrer"');
    expect(renderer).not.toContain("localStorage");
    expect(renderer).not.toContain("supabase");
  });
});
