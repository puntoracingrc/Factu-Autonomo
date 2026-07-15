import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  listPublicAeatModelReviewPagesV1,
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import {
  MODEL_221_GUIDE_V1,
  MODEL_222_GUIDE_V1,
  MODEL_237_GUIDE_V1,
} from "./model-batch-2-corporate-guides.v1";
import {
  MODEL_226_GUIDE_V1,
  MODEL_228_GUIDE_V1,
  MODEL_247_GUIDE_V1,
} from "./model-batch-2-nonresident-guides.v1";
import {
  MODEL_230_GUIDE_V1,
  MODEL_270_GUIDE_V1,
} from "./model-batch-2-lottery-guides.v1";
import {
  MODEL_231_GUIDE_V1,
  MODEL_234_GUIDE_V1,
  MODEL_235_GUIDE_V1,
  MODEL_236_GUIDE_V1,
  MODEL_239_GUIDE_V1,
} from "./model-batch-2-international-transparency-guides.v1";
import {
  MODEL_240_GUIDE_V1,
  MODEL_241_GUIDE_V1,
  MODEL_242_GUIDE_V1,
} from "./model-batch-2-pillar-two-guides.v1";
import {
  MODEL_280_GUIDE_V1,
  MODEL_289_GUIDE_V1,
  MODEL_290_GUIDE_V1,
  MODEL_291_GUIDE_V1,
  MODEL_294_GUIDE_V1,
  MODEL_295_GUIDE_V1,
} from "./model-batch-2-financial-international-guides.v1";
import {
  MODEL_281_GUIDE_V1,
  MODEL_282_GUIDE_V1,
  MODEL_283_GUIDE_V1,
} from "./model-batch-2-territorial-guides.v1";
import {
  MODEL_318_GUIDE_V1,
  MODEL_319_GUIDE_V1,
  MODEL_322_GUIDE_V1,
} from "./model-batch-2-specialized-vat-guides.v1";
import {
  MODEL_345_GUIDE_V1,
  MODEL_346_GUIDE_V1,
} from "./model-batch-2-social-agrarian-guides.v1";

const guides = [
  MODEL_221_GUIDE_V1,
  MODEL_222_GUIDE_V1,
  MODEL_226_GUIDE_V1,
  MODEL_228_GUIDE_V1,
  MODEL_230_GUIDE_V1,
  MODEL_231_GUIDE_V1,
  MODEL_234_GUIDE_V1,
  MODEL_235_GUIDE_V1,
  MODEL_236_GUIDE_V1,
  MODEL_237_GUIDE_V1,
  MODEL_239_GUIDE_V1,
  MODEL_240_GUIDE_V1,
  MODEL_241_GUIDE_V1,
  MODEL_242_GUIDE_V1,
  MODEL_247_GUIDE_V1,
  MODEL_270_GUIDE_V1,
  MODEL_280_GUIDE_V1,
  MODEL_281_GUIDE_V1,
  MODEL_282_GUIDE_V1,
  MODEL_283_GUIDE_V1,
  MODEL_289_GUIDE_V1,
  MODEL_290_GUIDE_V1,
  MODEL_291_GUIDE_V1,
  MODEL_294_GUIDE_V1,
  MODEL_295_GUIDE_V1,
  MODEL_318_GUIDE_V1,
  MODEL_319_GUIDE_V1,
  MODEL_322_GUIDE_V1,
  MODEL_345_GUIDE_V1,
  MODEL_346_GUIDE_V1,
] as const satisfies readonly FiscalModelPracticalGuideV1[];

type Code = (typeof guides)[number]["code"];

function officialContent(code: Code) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("AEAT model practical guides · batch 2 of 6", () => {
  it("publishes exactly thirty unique, deep and versioned guides", () => {
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
    }
  });

  it("keeps every cited source official, hashed and captured", () => {
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
    }
  });

  it("preserves the high-risk statutory and campaign rules", () => {
    const model231 = JSON.stringify(MODEL_231_GUIDE_V1);
    expect(model231).toContain("750 millones");
    expect(model231).toContain("comunicación previa");
    expect(model231).toContain("doce meses");

    const model237 = JSON.stringify(MODEL_237_GUIDE_V1);
    expect(model237).toContain("15 %");
    expect(model237).toContain("dos meses");
    expect(model237).toContain("acuerdo de aplicación del resultado");

    const model240 = JSON.stringify(MODEL_240_GUIDE_V1).toLowerCase();
    expect(model240).toContain("formulario web");
    expect(model240).toContain("servicio web/xml");
    expect(JSON.stringify(MODEL_241_GUIDE_V1)).toContain("GIR/DAC9");
    expect(JSON.stringify(MODEL_242_GUIDE_V1)).toContain("por lotes");

    expect(JSON.stringify(MODEL_280_GUIDE_V1)).toContain("2 de marzo de 2026");
    expect(JSON.stringify(MODEL_289_GUIDE_V1)).toContain("1 de junio de 2026");
  });

  it("applies special lifecycle and availability states fail-closed", () => {
    expect(MODEL_239_GUIDE_V1.statusTone).toBe("future");
    expect(MODEL_239_GUIDE_V1.statusLabel).toContain("pendiente de activación");
    expect(JSON.stringify(MODEL_239_GUIDE_V1)).toContain(
      "Presentación no disponible todavía",
    );
    expect(
      MODEL_239_GUIDE_V1.actions.every(
        (action) => !action.label.match(/Presentar ahora|Abrir gestiones/),
      ),
    ).toBe(true);

    expect(MODEL_291_GUIDE_V1.transitionYear).toBe(2026);
    expect(MODEL_291_GUIDE_V1.statusLabel).toContain("Modelo 196");
    expect(
      MODEL_291_GUIDE_V1.actions.every(
        (action) => !action.label.match(/Presentar/),
      ),
    ).toBe(true);

    expect(MODEL_319_GUIDE_V1.statusLabel).toContain("Nuevo en 2026");
    expect(JSON.stringify(MODEL_319_GUIDE_V1)).toContain(
      "antes de la extracción",
    );
    expect(MODEL_346_GUIDE_V1.requiresAnnualReview).toBe(true);
    expect(JSON.stringify(MODEL_346_GUIDE_V1)).toContain(
      "no se publica como regla permanente",
    );
  });

  it("keeps distinct periodicities and declarants", () => {
    expect(JSON.stringify(MODEL_230_GUIDE_V1)).toContain("Mensual");
    expect(JSON.stringify(MODEL_270_GUIDE_V1)).toContain("Anual");
    expect(JSON.stringify(MODEL_234_GUIDE_V1)).toContain(
      "Treinta días naturales",
    );
    expect(JSON.stringify(MODEL_235_GUIDE_V1)).toContain(
      "mes natural siguiente",
    );
    expect(JSON.stringify(MODEL_236_GUIDE_V1)).toContain(
      "1 de octubre al 31 de diciembre",
    );
    expect(JSON.stringify(MODEL_222_GUIDE_V1)).toContain(
      "abril, octubre y diciembre",
    );
    expect(JSON.stringify(MODEL_226_GUIDE_V1)).toContain("no convierte");
    expect(JSON.stringify(MODEL_228_GUIDE_V1)).toContain("Tres meses");
    expect(JSON.stringify(MODEL_247_GUIDE_V1)).toContain(
      "Trabajador por cuenta ajena",
    );
    for (const guide of [MODEL_289_GUIDE_V1, MODEL_290_GUIDE_V1]) {
      expect(JSON.stringify(guide)).toContain("Institución financiera");
    }
    for (const guide of [MODEL_294_GUIDE_V1, MODEL_295_GUIDE_V1]) {
      expect(JSON.stringify(guide)).toContain("31 de marzo");
    }
    expect(JSON.stringify(MODEL_322_GUIDE_V1)).toContain("Mensual");
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

  it("preserves the 229-model catalog and all direct routes", () => {
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
  });

  it("registers renderers, catalog copy, subtitles and SEO for all thirty", () => {
    const view = readFileSync(
      new URL("./FiscalModelOfficialContentView.tsx", import.meta.url),
      "utf8",
    );
    const catalog = readFileSync(
      new URL("./FiscalModelCatalogView.tsx", import.meta.url),
      "utf8",
    );
    const detail = readFileSync(
      new URL("./FiscalModelStructuralDetailView.tsx", import.meta.url),
      "utf8",
    );
    const metadata = readFileSync(
      new URL(
        "../../app/consultor-fiscal/modelos/[codigo]/page.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    for (const guide of guides) {
      expect(view).toContain(`\"${guide.code}\": MODEL_${guide.code}_GUIDE_V1`);
      expect(catalog).toContain(`\"${guide.code}\":`);
      expect(detail).toContain(`\"${guide.code}\":`);
      expect(metadata).toContain(`\"${guide.code}\":`);
    }
    expect(metadata).toContain("alternates");
    expect(metadata).toContain("openGraph");
  });

  it("uses the existing accessible, responsive and safe shared renderer", () => {
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
