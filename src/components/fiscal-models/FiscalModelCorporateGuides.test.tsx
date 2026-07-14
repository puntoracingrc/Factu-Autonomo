import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import { MODEL_200_GUIDE_V1 } from "./model-200-guide.v1";
import { MODEL_202_GUIDE_V1 } from "./model-202-guide.v1";
import { MODEL_232_GUIDE_V1 } from "./model-232-guide.v1";

type CorporateGuide = FiscalModelPracticalGuideV1 & {
  readonly code: "200" | "202" | "232";
};

const guides: readonly CorporateGuide[] = [
  MODEL_200_GUIDE_V1,
  MODEL_202_GUIDE_V1,
  MODEL_232_GUIDE_V1,
];

function officialContent(code: CorporateGuide["code"]) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("Models 200, 202 and 232 corporate practical guides", () => {
  it("versions Model 200 for tax period 2025 and keeps rates annual-review safe", () => {
    const copy = JSON.stringify(MODEL_200_GUIDE_V1);
    for (const expected of [
      "beneficio contable no equivale siempre",
      "sociedad inactiva",
      "base imponible negativa",
      "21 %",
      "22 %",
      "24 %",
      "25 %",
      "15 %",
      "los 25 días naturales",
      "Sociedades WEB",
      "Modelo 202",
      "Modelo 232",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_200_GUIDE_V1.taxPeriodYear).toBe(2025);
    expect(MODEL_200_GUIDE_V1.filingYear).toBe(2026);
    expect(MODEL_200_GUIDE_V1.faq).toHaveLength(15);
  });

  it("explains both Model 202 methods without presenting it as quarterly", () => {
    const copy = JSON.stringify(MODEL_202_GUIDE_V1);
    for (const expected of [
      "No es una declaración trimestral",
      "1/P",
      "2/P",
      "3/P",
      "artículo 40.2",
      "artículo 40.3",
      "18 %",
      "6 millones",
      "10 millones",
      "abril, octubre y diciembre",
      "no un gasto",
      "Modelo 200",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_202_GUIDE_V1.faq).toHaveLength(12);
  });

  it("keeps Model 232 informative and separates reporting, valuation and documentation", () => {
    const copy = JSON.stringify(MODEL_232_GUIDE_V1);
    for (const expected of [
      "No calcula ni paga un impuesto",
      "250.000 €",
      "100.000 €",
      "50 %",
      "al menos el 25 %",
      "sin IVA",
      "45 millones",
      "Precio libre comparable",
      "Complementaria",
      "sustitutiva",
      "mes siguiente a los diez meses",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_232_GUIDE_V1.faq).toHaveLength(14);
  });

  it("shows the common corporate audience and territorial safeguards", () => {
    const catalogSource = readFileSync(
      new URL("./FiscalModelCatalogView.tsx", import.meta.url),
      "utf8",
    );
    for (const guide of guides) {
      const copy = JSON.stringify(guide);
      expect(copy).toContain("Autónomo persona física");
      expect(copy).toContain("Sociedad limitada");
      expect(copy).toContain("País Vasco o Navarra");
      expect(copy).toContain("territorio común");
      expect(catalogSource).toContain(`"${guide.code}": [`);
    }
    expect(catalogSource.match(/Autónomo societario y empresas/g)).toHaveLength(
      3,
    );
  });

  it("makes the catalog searchable by concepts, not only model codes", () => {
    const expectedTerms = {
      "200": ["autónomo societario", "ajustes fiscales", "sociedad inactiva"],
      "202": ["abril octubre diciembre", "artículo 40.3", "6 millones"],
      "232": [
        "operaciones socio sociedad",
        "valor de mercado",
        "límite 250000",
      ],
    } as const;
    for (const code of ["200", "202", "232"] as const) {
      const terms = officialContent(code).searchTerms.join(" | ");
      for (const expected of expectedTerms[code])
        expect(terms).toContain(expected);
    }
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

  it("publishes stable internal routes and dedicated metadata", () => {
    const pageSource = readFileSync(
      new URL(
        "../../app/consultor-fiscal/modelos/[codigo]/page.tsx",
        import.meta.url,
      ),
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
      "Modelo 200 AEAT: Impuesto sobre Sociedades",
      "Modelo 202 AEAT: pagos a cuenta de Sociedades",
      "Modelo 232 AEAT: operaciones vinculadas",
    ])
      expect(pageSource).toContain(title);

    for (const subtitle of [
      "Declaración anual del Impuesto sobre Sociedades",
      "Pagos a cuenta del Impuesto sobre Sociedades",
      "Operaciones vinculadas y situaciones relacionadas con jurisdicciones no cooperativas",
    ])
      expect(detailSource).toContain(subtitle);

    for (const code of ["200", "202", "232"] as const) {
      const page = resolvePublicAeatModelReviewPageV1({ code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY") {
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${code}`);
      }
      expect(viewSource).toContain(`content.code === "${code}"`);
    }
  });
});
