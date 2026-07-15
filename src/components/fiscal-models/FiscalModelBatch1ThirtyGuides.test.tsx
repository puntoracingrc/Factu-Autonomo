import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  listPublicAeatModelReviewPagesV1,
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import {
  MODEL_038_GUIDE_V1,
  MODEL_039_GUIDE_V1,
  MODEL_043_GUIDE_V1,
  MODEL_044_GUIDE_V1,
  MODEL_045_GUIDE_V1,
} from "./model-batch-1-sectorial-guides.v1";
import {
  MODEL_102_GUIDE_V1,
  MODEL_113_GUIDE_V1,
  MODEL_136_GUIDE_V1,
  MODEL_146_GUIDE_V1,
  MODEL_147_GUIDE_V1,
  MODEL_150_GUIDE_V1,
} from "./model-batch-1-irpf-guides.v1";
import {
  MODEL_156_GUIDE_V1,
  MODEL_159_GUIDE_V1,
  MODEL_165_GUIDE_V1,
  MODEL_170_GUIDE_V1,
  MODEL_171_GUIDE_V1,
  MODEL_174_GUIDE_V1,
} from "./model-batch-1-specialized-information-guides.v1";
import {
  MODEL_181_GUIDE_V1,
  MODEL_182_GUIDE_V1,
  MODEL_185_GUIDE_V1,
  MODEL_186_GUIDE_V1,
  MODEL_189_GUIDE_V1,
  MODEL_192_GUIDE_V1,
  MODEL_195_GUIDE_V1,
  MODEL_198_GUIDE_V1,
  MODEL_199_GUIDE_V1,
} from "./model-batch-1-financial-social-guides.v1";
import {
  MODEL_206_GUIDE_V1,
  MODEL_213_GUIDE_V1,
  MODEL_217_GUIDE_V1,
  MODEL_220_GUIDE_V1,
} from "./model-batch-1-corporate-nonresident-guides.v1";

const guides = [
  MODEL_038_GUIDE_V1,
  MODEL_039_GUIDE_V1,
  MODEL_043_GUIDE_V1,
  MODEL_044_GUIDE_V1,
  MODEL_045_GUIDE_V1,
  MODEL_102_GUIDE_V1,
  MODEL_113_GUIDE_V1,
  MODEL_136_GUIDE_V1,
  MODEL_146_GUIDE_V1,
  MODEL_147_GUIDE_V1,
  MODEL_150_GUIDE_V1,
  MODEL_156_GUIDE_V1,
  MODEL_159_GUIDE_V1,
  MODEL_165_GUIDE_V1,
  MODEL_170_GUIDE_V1,
  MODEL_171_GUIDE_V1,
  MODEL_174_GUIDE_V1,
  MODEL_181_GUIDE_V1,
  MODEL_182_GUIDE_V1,
  MODEL_185_GUIDE_V1,
  MODEL_186_GUIDE_V1,
  MODEL_189_GUIDE_V1,
  MODEL_192_GUIDE_V1,
  MODEL_195_GUIDE_V1,
  MODEL_198_GUIDE_V1,
  MODEL_199_GUIDE_V1,
  MODEL_206_GUIDE_V1,
  MODEL_213_GUIDE_V1,
  MODEL_217_GUIDE_V1,
  MODEL_220_GUIDE_V1,
] as const satisfies readonly FiscalModelPracticalGuideV1[];

type Code = (typeof guides)[number]["code"];

function officialContent(code: Code) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("AEAT model practical guides · batch 1 of 6", () => {
  it("publishes exactly thirty unique guides with deep, versioned content", () => {
    expect(guides).toHaveLength(30);
    expect(new Set(guides.map((guide) => guide.code)).size).toBe(30);
    for (const guide of guides) {
      expect(guide.lastVerifiedAt, guide.code).toBe("2026-07-15");
      expect(guide.requiresAnnualReview, guide.code).toBe(true);
      expect(guide.faq.length, guide.code).toBeGreaterThanOrEqual(8);
      expect(guide.quickFacts, guide.code).toHaveLength(6);
      expect(guide.sections.length, guide.code).toBeGreaterThanOrEqual(4);
      expect(guide.fillingSteps.length, guide.code).toBeGreaterThanOrEqual(5);
      expect(guide.afterSteps.length, guide.code).toBeGreaterThanOrEqual(3);
      expect(guide.comparison.related.href).toMatch(
        /^\/consultor-fiscal\/modelos\/[A-Z0-9]+$/,
      );
    }
  });

  it("keeps every cited source official, hashed and verified", () => {
    for (const guide of guides) {
      const sources = new Map(
        officialContent(guide.code).sources.map((source) => [source.id, source]),
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
    }
  });

  it("preserves the four exact high-risk rules", () => {
    const model038 = JSON.stringify(MODEL_038_GUIDE_V1);
    expect(model038).toContain("Mensual");
    expect(model038).toContain("mes inmediato anterior");
    expect(model038).toContain("cuatro días adicionales");
    expect(model038).toContain("habilite expresamente");

    const model170 = JSON.stringify(MODEL_170_GUIDE_V1);
    expect(MODEL_170_GUIDE_V1.monthlyFromYear).toBe(2026);
    expect(MODEL_170_GUIDE_V1.firstMonthlyFiling).toBe("2026-02");
    for (const copy of ["entidad de crédito", "pagos asociados", "no lo presenta el comercio"])
      expect(model170.toLowerCase()).toContain(copy.toLowerCase());

    const model185 = JSON.stringify(MODEL_185_GUIDE_V1);
    expect(MODEL_185_GUIDE_V1.monthlyFromYear).toBe(2026);
    expect(model185).toContain("diez días naturales");
    expect(model185).toContain("El afiliado nunca es el declarante");

    const model217 = JSON.stringify(MODEL_217_GUIDE_V1);
    expect(model217).toContain("19 %");
    expect(model217).toContain("dos meses siguientes");
    expect(model217).toContain("acuerdo de distribución");
  });

  it("renders historical, future, auxiliary and territorial treatments fail-closed", () => {
    expect(MODEL_150_GUIDE_V1.statusTone).toBe("historical");
    expect(MODEL_150_GUIDE_V1.statusLabel).toContain("anterior a 2015");
    expect(JSON.stringify(MODEL_150_GUIDE_V1)).toContain(
      "/consultor-fiscal/modelos/151",
    );
    expect(
      MODEL_150_GUIDE_V1.actions.every(
        (action) => !action.label.match(/Presentar|Solicitar|Alta/),
      ),
    ).toBe(true);

    expect(MODEL_174_GUIDE_V1.statusTone).toBe("future");
    expect(MODEL_174_GUIDE_V1.taxPeriodYear).toBe(2026);
    expect(MODEL_174_GUIDE_V1.filingYear).toBe(2027);
    expect(JSON.stringify(MODEL_174_GUIDE_V1)).toContain("enero de 2027");

    expect(MODEL_206_GUIDE_V1.statusTone).toBe("auxiliary");
    expect(MODEL_206_GUIDE_V1.statusLabel).toContain("Modelo 200");
    expect(
      MODEL_206_GUIDE_V1.actions.every(
        (action) => !action.label.includes("Presentar"),
      ),
    ).toBe(true);

    for (const guide of [
      MODEL_043_GUIDE_V1,
      MODEL_044_GUIDE_V1,
      MODEL_045_GUIDE_V1,
    ]) {
      expect(guide.statusTone).toBe("territorial");
      expect(JSON.stringify(guide).toLowerCase()).toContain(
        "administración competente",
      );
    }
  });

  it("keeps 102 non-independent and the required model distinctions", () => {
    expect(
      MODEL_102_GUIDE_V1.actions.every(
        (action) => !action.label.includes("Presentar"),
      ),
    ).toBe(true);
    expect(JSON.stringify(MODEL_102_GUIDE_V1)).toContain("segundo 40 %");
    expect(JSON.stringify(MODEL_136_GUIDE_V1)).toContain(
      "/consultor-fiscal/modelos/230",
    );
    expect(JSON.stringify(MODEL_136_GUIDE_V1)).toContain(
      "/consultor-fiscal/modelos/270",
    );
    expect(JSON.stringify(MODEL_147_GUIDE_V1)).toContain("No concede el régimen");
    expect(JSON.stringify(MODEL_220_GUIDE_V1)).toContain(
      "/consultor-fiscal/modelos/222",
    );
  });

  it("keeps all internal relationships on deployed catalog routes", () => {
    for (const guide of guides) {
      const relationships = [
        guide.comparison.related,
        ...(guide.comparison.additional ?? []),
      ];
      for (const relationship of relationships) {
        const code = relationship.href.split("/").at(-1);
        const page = resolvePublicAeatModelReviewPageV1({ code });
        expect(page.status, `${guide.code} -> ${relationship.href}`).toBe(
          "REVIEW_ONLY",
        );
      }
    }
  });

  it("preserves the 229-entry catalog and all thirty direct routes", () => {
    const catalog = listPublicAeatModelReviewPagesV1();
    expect(catalog.status).toBe("REVIEW_ONLY");
    if (catalog.status === "BLOCKED") throw new Error(catalog.reason);
    expect(catalog.data).toHaveLength(229);
    for (const guide of guides) {
      const page = resolvePublicAeatModelReviewPageV1({ code: guide.code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY") {
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${guide.code}`);
        expect(page.data.code).toBe(guide.code);
      }
    }
    expect(resolvePublicAeatModelReviewPageV1({ code: "38" }).status).toBe(
      "BLOCKED",
    );
  });

  it("registers dedicated SEO, subtitles, catalog summaries and renderers", () => {
    const metadata = readFileSync(
      new URL(
        "../../app/consultor-fiscal/modelos/[codigo]/page.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const detail = readFileSync(
      new URL("./FiscalModelStructuralDetailView.tsx", import.meta.url),
      "utf8",
    );
    const catalog = readFileSync(
      new URL("./FiscalModelCatalogView.tsx", import.meta.url),
      "utf8",
    );
    const view = readFileSync(
      new URL("./FiscalModelOfficialContentView.tsx", import.meta.url),
      "utf8",
    );

    for (const guide of guides) {
      expect(view).toContain(`\"${guide.code}\": MODEL_${guide.code}_GUIDE_V1`);
      expect(detail).toContain(`\"${guide.code}\":`);
      expect(catalog).toContain(`\"${guide.code}\":`);
    }
    for (const expected of [
      "Modelo 150 AEAT histórico",
      "Modelo 174 AEAT: tarjetas y primera presentación en 2027",
      "Modelo 206 AEAT: documento auxiliar del Modelo 200",
      "Modelo 217 AEAT: gravamen especial SOCIMI del 19 %",
    ])
      expect(metadata).toContain(expected);
    expect(metadata).toContain("alternates");
    expect(metadata).toContain("openGraph");
  });

  it("keeps external links safe and the shared accessible responsive template", () => {
    const practicalView = readFileSync(
      new URL("./FiscalModelPracticalGuide.tsx", import.meta.url),
      "utf8",
    );
    expect(practicalView).toContain('target="_blank"');
    expect(practicalView).toContain('rel="noopener noreferrer"');
    expect(practicalView).toContain("focus-visible:outline");
    expect(practicalView).toContain("break-words");
    expect(practicalView).toContain("min-w-0");
    expect(practicalView).toContain("<details");
    expect(practicalView).toContain("<summary");
    const detail = readFileSync(
      new URL("./FiscalModelStructuralDetailView.tsx", import.meta.url),
      "utf8",
    );
    expect(detail.match(/<h1/g)).toHaveLength(1);
  });
});
