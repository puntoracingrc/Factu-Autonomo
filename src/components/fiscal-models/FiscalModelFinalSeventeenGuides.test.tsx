import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  listPublicAeatModelReviewPagesV1,
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import {
  MODEL_901_GUIDE_V1,
  MODEL_933_GUIDE_V1,
  MODEL_980_GUIDE_V1,
  MODEL_981_GUIDE_V1,
  MODEL_990_GUIDE_V1,
} from "./model-final-administrations-901-990-guides.v1";
import {
  MODEL_991_GUIDE_V1,
  MODEL_992_GUIDE_V1,
  MODEL_993_GUIDE_V1,
  MODEL_995_GUIDE_V1,
  MODEL_996_GUIDE_V1,
  MODEL_997_GUIDE_V1,
} from "./model-final-administrations-991-997-guides.v1";
import {
  MODEL_A22_GUIDE_V1,
  MODEL_A23_GUIDE_V1,
  MODEL_A24_GUIDE_V1,
} from "./model-final-environment-refund-guides.v1";
import {
  MODEL_798_GUIDE_V1,
  MODEL_848_GUIDE_V1,
  MODEL_952_GUIDE_V1,
} from "./model-final-financial-iae-vat-guides.v1";

const guides = [
  MODEL_798_GUIDE_V1,
  MODEL_848_GUIDE_V1,
  MODEL_901_GUIDE_V1,
  MODEL_933_GUIDE_V1,
  MODEL_952_GUIDE_V1,
  MODEL_980_GUIDE_V1,
  MODEL_981_GUIDE_V1,
  MODEL_990_GUIDE_V1,
  MODEL_991_GUIDE_V1,
  MODEL_992_GUIDE_V1,
  MODEL_993_GUIDE_V1,
  MODEL_995_GUIDE_V1,
  MODEL_996_GUIDE_V1,
  MODEL_997_GUIDE_V1,
  MODEL_A22_GUIDE_V1,
  MODEL_A23_GUIDE_V1,
  MODEL_A24_GUIDE_V1,
] as const satisfies readonly FiscalModelPracticalGuideV1[];

const institutionalGuides = [
  MODEL_901_GUIDE_V1,
  MODEL_933_GUIDE_V1,
  MODEL_980_GUIDE_V1,
  MODEL_981_GUIDE_V1,
  MODEL_990_GUIDE_V1,
  MODEL_991_GUIDE_V1,
  MODEL_992_GUIDE_V1,
  MODEL_993_GUIDE_V1,
  MODEL_995_GUIDE_V1,
  MODEL_996_GUIDE_V1,
  MODEL_997_GUIDE_V1,
] as const;

type Code = (typeof guides)[number]["code"];
const serialized = (guide: FiscalModelPracticalGuideV1) =>
  JSON.stringify(guide);

function officialContent(code: Code) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("AEAT model practical guides · final 17", () => {
  it("publishes exactly seventeen unique, deep and versioned guides", () => {
    expect(guides).toHaveLength(17);
    expect(new Set(guides.map((guide) => guide.code)).size).toBe(17);
    expect(guides.map((guide) => guide.code)).toEqual([
      "798",
      "848",
      "901",
      "933",
      "952",
      "980",
      "981",
      "990",
      "991",
      "992",
      "993",
      "995",
      "996",
      "997",
      "A22",
      "A23",
      "A24",
    ]);
    for (const guide of guides) {
      expect(guide.lastVerifiedAt, guide.code).toBe("2026-07-15");
      expect(guide.faq.length, guide.code).toBeGreaterThanOrEqual(10);
      expect(guide.quickFacts, guide.code).toHaveLength(6);
      expect(guide.sections.length, guide.code).toBeGreaterThanOrEqual(4);
      expect(guide.fillingSteps.length, guide.code).toBeGreaterThanOrEqual(4);
      expect(guide.afterSteps.length, guide.code).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps every registered source official, hashed and captured", () => {
    for (const guide of guides) {
      const sources = new Map(
        officialContent(guide.code).sources.map((source) => [
          source.id,
          source,
        ]),
      );
      for (const sourceId of guide.sourceIds) {
        const source = sources.get(sourceId);
        expect(source, `${guide.code}: ${sourceId}`).toBeDefined();
        expect(source?.canonicalUrl).toMatch(
          /^https:\/\/(?:sede\.agenciatributaria\.gob\.es|www\.boe\.es)\//,
        );
        expect(source?.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(source?.verificationStatus).toBe("SOURCE_HASH_CAPTURED");
      }
      for (const link of [...guide.officialLinks, ...guide.legalLinks]) {
        if (link.href)
          expect(link.href, `${guide.code}: ${link.label}`).toMatch(
            /^https:\/\/(?:sede\.agenciatributaria\.gob\.es|www\.boe\.es)\//,
          );
      }
    }
  });

  it("pins the corrected BOE orders for A23 and A24", () => {
    const a23Order = officialContent("A23").sources.find(
      (source) => source.id === "boe.order-hfp-826-2022.model-a23.2026-07-15",
    );
    expect(a23Order).toMatchObject({
      canonicalUrl: "https://www.boe.es/buscar/doc.php?id=BOE-A-2022-14275",
      capturedOn: "2026-07-15",
      sourceSha256:
        "10604ea3a50a54b7075ad368237e59b8d9911be8e6a58b0ff7340755cd983798",
    });

    const a24Order = officialContent("A24").sources.find(
      (source) => source.id === "boe.order-hac-86-2025.model-a24.2026-07-15",
    );
    expect(a24Order).toMatchObject({
      title: "Orden HAC/86/2025, de 13 de enero",
      canonicalUrl: "https://www.boe.es/buscar/doc.php?id=BOE-A-2025-1732",
      capturedOn: "2026-07-15",
      sourceSha256:
        "0df29bac3ecaff980c24ccdcdec1eb90f43f3118d11dcf1a8e22a1d87888618e",
    });
  });

  it("keeps 798 and 981 historical without a current filing action", () => {
    for (const guide of [MODEL_798_GUIDE_V1, MODEL_981_GUIDE_V1]) {
      expect(guide.statusTone).toBe("historical");
      expect(serialized(guide)).toContain("Histórico");
      expect(
        guide.actions.every(
          (action) => !action.label.match(/Presentar|Abrir trámite/),
        ),
      ).toBe(true);
    }
    const model798 = serialized(MODEL_798_GUIDE_V1);
    for (const fact of ["2023 y 2024", "800.000.000", "4,8 %", "50 %"]) {
      expect(model798).toContain(fact);
    }
    const model981 = serialized(MODEL_981_GUIDE_V1);
    for (const fact of [
      "2019",
      "2014",
      "2015",
      "2016",
      "2017",
      "subclave 27",
    ]) {
      expect(model981).toContain(fact);
    }
  });

  it("keeps the 848 exceptional and excludes natural persons", () => {
    const model848 = serialized(MODEL_848_GUIDE_V1);
    expect(model848).toContain("Las personas físicas no presentan");
    expect(model848).toContain("un millón de euros");
    expect(model848).toContain("1 de enero al 14 de febrero");
    expect(model848).toContain("AEAT no conoce");
  });

  it("provides the deep 952 workflow without replacing 303 or SII", () => {
    const model952 = serialized(MODEL_952_GUIDE_V1);
    for (const fact of [
      "6.010.121,04 euros",
      "seis meses o un año",
      "superar 50 euros",
      "factura rectificativa",
      "dentro del mes siguiente",
      "Modelo 303",
      "SII",
      "concurso",
    ]) {
      expect(model952).toContain(fact);
    }
  });

  it("keeps institutional models visibly non-citizen and non-filing", () => {
    for (const guide of institutionalGuides) {
      const model = serialized(guide);
      expect(model, guide.code).toContain("No lo presenta el ciudadano");
      expect(model, guide.code).toContain("Para la Administración declarante");
      expect(model, guide.code).toContain("Para el ciudadano afectado");
      expect(
        guide.actions.map((action) => action.label),
        guide.code,
      ).toEqual([
        "Entender para qué se utiliza",
        "Consultar el procedimiento institucional",
        "Comprobar qué organismo debe corregir mis datos",
      ]);
      expect(model, guide.code).not.toContain("Presentar este modelo");
    }
  });

  it("preserves the institutional distinctions and recourse paths", () => {
    expect(serialized(MODEL_933_GUIDE_V1)).toContain("233");
    expect(serialized(MODEL_991_GUIDE_V1)).toContain("115");
    expect(serialized(MODEL_991_GUIDE_V1)).toContain("180");
    expect(serialized(MODEL_992_GUIDE_V1)).toContain("043");
    expect(serialized(MODEL_993_GUIDE_V1)).toContain("100");
    expect(serialized(MODEL_995_GUIDE_V1)).toContain("40.000 registros");
    expect(serialized(MODEL_996_GUIDE_V1)).toContain("devoluciones");
    expect(serialized(MODEL_997_GUIDE_V1)).toContain("2.000 euros");
    expect(serialized(MODEL_997_GUIDE_V1)).toContain("siete días naturales");
  });

  it("keeps A22, A23 and A24 distinct and correctly cased", () => {
    expect(MODEL_A22_GUIDE_V1.code).toBe("A22");
    expect(MODEL_A23_GUIDE_V1.code).toBe("A23");
    expect(MODEL_A24_GUIDE_V1.code).toBe("A24");
    expect(serialized(MODEL_A22_GUIDE_V1)).toContain("Trimestral");
    expect(serialized(MODEL_A22_GUIDE_V1)).toContain("592");
    expect(serialized(MODEL_A23_GUIDE_V1)).toContain("Trimestral");
    expect(serialized(MODEL_A23_GUIDE_V1)).toContain("587");
    expect(serialized(MODEL_A24_GUIDE_V1)).toContain("Mensual");
    expect(serialized(MODEL_A24_GUIDE_V1)).toContain("1 de abril de 2025");
    expect(serialized(MODEL_A24_GUIDE_V1)).toContain("otro Estado miembro");
  });

  it("pins the current A23 exempt destination and rejects stale categories", () => {
    const modelA23 = serialized(MODEL_A23_GUIDE_V1);
    expect(modelA23).toContain("buques o aeronaves");
    expect(modelA23).toContain("navegación marítima o aérea internacional");
    expect(modelA23).toContain("privada de recreo");
    expect(modelA23).toContain("15 de julio de 2026");
    expect(modelA23).toContain("inhaladores");
  });

  it("keeps every relationship on an existing canonical route", () => {
    for (const guide of guides) {
      for (const relation of [
        guide.comparison.related,
        ...(guide.comparison.additional ?? []),
      ]) {
        const code = relation.href.split("/").at(-1);
        expect(
          resolvePublicAeatModelReviewPageV1({ code }).status,
          `${guide.code} -> ${relation.href}`,
        ).toBe("REVIEW_ONLY");
      }
    }
  });

  it("preserves 229 exact routes including uppercase A codes", () => {
    const catalog = listPublicAeatModelReviewPagesV1();
    expect(catalog.status).toBe("REVIEW_ONLY");
    if (catalog.status === "BLOCKED") throw new Error(catalog.reason);
    expect(catalog.data).toHaveLength(229);
    for (const guide of guides) {
      const page = resolvePublicAeatModelReviewPageV1({ code: guide.code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY")
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${guide.code}`);
    }
    for (const invalid of ["a22", "a23", "a24", "A22 ", "A23/", "A%32%34"]) {
      expect(resolvePublicAeatModelReviewPageV1({ code: invalid }).status).toBe(
        "BLOCKED",
      );
    }
  });

  it("registers all final guides in renderer, catalog, subtitle and SEO", () => {
    const files = [
      readFileSync(
        new URL("./FiscalModelOfficialContentView.tsx", import.meta.url),
        "utf8",
      ),
      readFileSync(
        new URL("./FiscalModelCatalogView.tsx", import.meta.url),
        "utf8",
      ),
      readFileSync(
        new URL("./FiscalModelStructuralDetailView.tsx", import.meta.url),
        "utf8",
      ),
      readFileSync(
        new URL(
          "../../app/consultor-fiscal/modelos/[codigo]/page.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
    ];
    for (const guide of guides) {
      const key = guide.code.startsWith("A")
        ? `${guide.code}:`
        : `"${guide.code}":`;
      for (const file of files) expect(file, guide.code).toContain(key);
    }
  });

  it("maps all 229 catalog entries to full guides with no structural fallback", () => {
    const catalog = listPublicAeatModelReviewPagesV1();
    if (catalog.status === "BLOCKED") throw new Error(catalog.reason);
    const renderer = readFileSync(
      new URL("./FiscalModelOfficialContentView.tsx", import.meta.url),
      "utf8",
    );

    let fullGuideCount = 0;
    let structuralOnlyCount = 0;
    for (const page of catalog.data) {
      const result = resolvePublicAeatOfficialModelContentV1({
        code: page.code,
      });
      expect(result.status, page.code).toBe("OFFICIAL_INFORMATION");
      const mapKey = page.code.startsWith("A")
        ? `${page.code}:`
        : `"${page.code}":`;
      const hasDedicatedGuide =
        renderer.includes(mapKey) ||
        renderer.includes(`content.code === "${page.code}"`);
      if (hasDedicatedGuide) fullGuideCount += 1;
      else structuralOnlyCount += 1;
    }

    expect({
      fullGuideCount,
      structuralOnlyCount,
      pendingGuideCount: 0,
    }).toEqual({
      fullGuideCount: 229,
      structuralOnlyCount: 0,
      pendingGuideCount: 0,
    });
  });
});
