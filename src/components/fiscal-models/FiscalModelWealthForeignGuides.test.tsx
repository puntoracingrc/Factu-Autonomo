import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import { MODEL_714_GUIDE_V1 } from "./model-714-guide.v1";
import { MODEL_718_GUIDE_V1 } from "./model-718-guide.v1";
import { MODEL_720_GUIDE_V1 } from "./model-720-guide.v1";
import { MODEL_721_GUIDE_V1 } from "./model-721-guide.v1";

type Guide = FiscalModelPracticalGuideV1 & {
  readonly code: "714" | "718" | "720" | "721";
};

const guides: readonly Guide[] = [
  MODEL_720_GUIDE_V1,
  MODEL_721_GUIDE_V1,
  MODEL_714_GUIDE_V1,
  MODEL_718_GUIDE_V1,
];

const OFFICIAL_HOSTS = new Set([
  "sede.agenciatributaria.gob.es",
  "www1.agenciatributaria.gob.es",
  "www2.agenciatributaria.gob.es",
  "www.boe.es",
  "app.bde.es",
]);

function officialContent(code: Guide["code"]) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("Models 720, 721, 714 and 718 practical guides", () => {
  it("keeps Model 720 informative, split into three blocks and on the current penalty regime", () => {
    const copy = JSON.stringify(MODEL_720_GUIDE_V1);
    for (const expected of [
      "Tres bloques",
      "Cuentas · clave C",
      "Valores, derechos, seguros y rentas",
      "Inmuebles · clave B",
      "50.000",
      "saldo medio del último trimestre",
      "valor total",
      "superior a 20.000",
      "No se incluyen",
      "artículos 198 y 199",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_720_GUIDE_V1.faq).toHaveLength(12);
    expect(MODEL_720_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/721",
    );
  });

  it("makes custody and control of the keys decisive for Model 721", () => {
    const copy = JSON.stringify(MODEL_721_GUIDE_V1);
    for (const expected of [
      "custodiadas",
      "autocustodia",
      "controla directamente sus claves",
      "50.000",
      "superior a 20.000",
      "saldo conjunto",
      "Fuente de valoración",
      "Modelo 100",
      "Modelo 714",
      "Modelos 172 y 173",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_721_GUIDE_V1.faq).toHaveLength(12);
    expect(MODEL_721_GUIDE_V1.actions).toContainEqual(
      expect.objectContaining({ href: "https://app.bde.es/rbe_spa/" }),
    );
  });

  it("separates the two Model 714 filing causes from exemptions", () => {
    const copy = JSON.stringify(MODEL_714_GUIDE_V1);
    for (const expected of [
      "Dos causas diferentes",
      "2.000.000",
      "700.000",
      "300.000",
      "no se restan",
      "bienes exentos",
      "comunidades autónomas",
      "no están exentos automáticamente",
      "criptomonedas",
      "Obligatoriamente electrónica",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_714_GUIDE_V1.faq).toHaveLength(12);
  });

  it("keeps Model 718 current and filing conditional on a payable result", () => {
    const copy = JSON.stringify(MODEL_718_GUIDE_V1);
    for (const expected of [
      "sigue vigente",
      "cuota resulta a ingresar",
      "3.000.000",
      "700.000",
      "1,7 %",
      "2,1 %",
      "3,5 %",
      "límite conjunto",
      "efectivamente satisfecha",
      "Del 1 al 31 de julio",
      "Simulador Open",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_718_GUIDE_V1.faq).toHaveLength(12);
    expect(copy).not.toContain("Histórico");
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

  it("publishes stable routes, dedicated SEO, subtitles and catalog labels", () => {
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
      "Modelo 720 AEAT: bienes y derechos en el extranjero",
      "Modelo 721 AEAT: criptomonedas en el extranjero",
      "Modelo 714 AEAT: Impuesto sobre el Patrimonio",
      "Modelo 718 AEAT: Impuesto de Grandes Fortunas",
    ])
      expect(pageSource).toContain(title);
    for (const subtitle of [
      "Bienes y derechos situados en el extranjero",
      "Criptomonedas custodiadas en el extranjero",
      "Impuesto sobre el Patrimonio",
      "Impuesto Temporal de Solidaridad de las Grandes Fortunas",
    ])
      expect(detailSource).toContain(subtitle);

    for (const code of ["720", "721", "714", "718"] as const) {
      const page = resolvePublicAeatModelReviewPageV1({ code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY") {
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${code}`);
      }
      expect(catalogSource).toContain(`"${code}": [`);
      expect(viewSource).toContain(`content.code === "${code}"`);
    }
    expect(catalogSource).toContain("Patrimonio y activos internacionales");
  });

  it("keeps the territorial and no-storage boundaries explicit", () => {
    for (const guide of guides) {
      const copy = JSON.stringify(guide);
      expect(copy).toContain("País Vasco o Navarra");
    }
    const renderer = readFileSync(
      new URL("./FiscalModelPracticalGuide.tsx", import.meta.url),
      "utf8",
    );
    expect(renderer).toContain('target="_blank"');
    expect(renderer).toContain('rel="noopener noreferrer"');
    expect(renderer).toContain('"app.bde.es"');
    expect(renderer).not.toContain("localStorage");
    expect(renderer).not.toContain("supabase");
  });
});
