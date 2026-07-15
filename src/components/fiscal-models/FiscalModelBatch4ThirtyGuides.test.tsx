import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  listPublicAeatModelReviewPagesV1,
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import {
  MODEL_546_GUIDE_V1,
  MODEL_547_GUIDE_V1,
  MODEL_548_GUIDE_V1,
  MODEL_568_GUIDE_V1,
  MODEL_571_GUIDE_V1,
  MODEL_572_GUIDE_V1,
  MODEL_576_GUIDE_V1,
  MODEL_590_GUIDE_V1,
} from "./model-batch-4-supply-refund-guides.v1";
import {
  MODEL_553_GUIDE_V1,
  MODEL_559_GUIDE_V1,
  MODEL_560_GUIDE_V1,
  MODEL_561_GUIDE_V1,
  MODEL_562_GUIDE_V1,
  MODEL_563_GUIDE_V1,
  MODEL_566_GUIDE_V1,
  MODEL_573_GUIDE_V1,
  MODEL_581_GUIDE_V1,
  MODEL_582_GUIDE_V1,
  MODEL_595_GUIDE_V1,
  MODEL_596_GUIDE_V1,
} from "./model-batch-4-excise-manufacturing-guides.v1";
import {
  MODEL_583_GUIDE_V1,
  MODEL_584_GUIDE_V1,
  MODEL_585_GUIDE_V1,
  MODEL_588_GUIDE_V1,
  MODEL_589_GUIDE_V1,
  MODEL_591_GUIDE_V1,
} from "./model-batch-4-energy-nuclear-guides.v1";
import {
  MODEL_586_GUIDE_V1,
  MODEL_587_GUIDE_V1,
  MODEL_592_GUIDE_V1,
  MODEL_593_GUIDE_V1,
} from "./model-batch-4-environmental-guides.v1";

const guides = [
  MODEL_546_GUIDE_V1,
  MODEL_547_GUIDE_V1,
  MODEL_548_GUIDE_V1,
  MODEL_553_GUIDE_V1,
  MODEL_559_GUIDE_V1,
  MODEL_560_GUIDE_V1,
  MODEL_561_GUIDE_V1,
  MODEL_562_GUIDE_V1,
  MODEL_563_GUIDE_V1,
  MODEL_566_GUIDE_V1,
  MODEL_568_GUIDE_V1,
  MODEL_571_GUIDE_V1,
  MODEL_572_GUIDE_V1,
  MODEL_573_GUIDE_V1,
  MODEL_576_GUIDE_V1,
  MODEL_581_GUIDE_V1,
  MODEL_582_GUIDE_V1,
  MODEL_583_GUIDE_V1,
  MODEL_584_GUIDE_V1,
  MODEL_585_GUIDE_V1,
  MODEL_586_GUIDE_V1,
  MODEL_587_GUIDE_V1,
  MODEL_588_GUIDE_V1,
  MODEL_589_GUIDE_V1,
  MODEL_590_GUIDE_V1,
  MODEL_591_GUIDE_V1,
  MODEL_592_GUIDE_V1,
  MODEL_593_GUIDE_V1,
  MODEL_595_GUIDE_V1,
  MODEL_596_GUIDE_V1,
] as const satisfies readonly FiscalModelPracticalGuideV1[];

type Code = (typeof guides)[number]["code"];

function officialContent(code: Code) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

function serialized(guide: FiscalModelPracticalGuideV1): string {
  return JSON.stringify(guide);
}

describe("AEAT model practical guides · batch 4 of 6", () => {
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

  it("preserves the gasóleo, repercussion and transport distinctions", () => {
    for (const guide of [MODEL_546_GUIDE_V1, MODEL_547_GUIDE_V1]) {
      expect(serialized(guide)).toContain("Trimestral");
      expect(serialized(guide)).toContain("20 días");
    }
    expect(serialized(MODEL_547_GUIDE_V1)).toContain("entidad emisora");
    expect(serialized(MODEL_547_GUIDE_V1)).toContain("detallistas");
    expect(serialized(MODEL_548_GUIDE_V1)).toContain("Mensual");
    expect(serialized(MODEL_548_GUIDE_V1)).toContain("cuenta ajena");
    expect(serialized(MODEL_548_GUIDE_V1)).toContain("electricidad");
    expect(serialized(MODEL_568_GUIDE_V1)).toContain("revendedor profesional");
    expect(serialized(MODEL_568_GUIDE_V1)).toContain("cuatro años");
  });

  it("keeps the 553 transition and SILICIE exemption explicit", () => {
    const model553 = serialized(MODEL_553_GUIDE_V1);
    expect(model553).toContain("2025 y siguientes");
    expect(model553).toContain("SILICIE");
    expect(model553).toContain("contabilidad en papel");
    expect(model553).toContain(
      "Primeros 20 días de enero, abril, julio y octubre",
    );
    expect(model553).toContain("tipo cero no borra");
  });

  it("keeps historical hydrocarbons and gases fail-closed", () => {
    expect(MODEL_582_GUIDE_V1.statusTone).toBe("historical");
    expect(serialized(MODEL_582_GUIDE_V1)).toContain("anteriores a 2019");
    expect(MODEL_586_GUIDE_V1.statusTone).toBe("historical");
    expect(serialized(MODEL_586_GUIDE_V1)).toContain("31 de agosto de 2022");
    for (const guide of [MODEL_582_GUIDE_V1, MODEL_586_GUIDE_V1]) {
      expect(
        guide.actions.every(
          (action) => !action.label.match(/Presentar|Abrir gestiones/),
        ),
      ).toBe(true);
    }
  });

  it("preserves environmental transitions without silently reusing old corrections", () => {
    const model573 = serialized(MODEL_573_GUIDE_V1);
    expect(model573).toContain("Mensual");
    expect(model573).toContain("1 de abril de 2025");

    const model587 = serialized(MODEL_587_GUIDE_V1);
    expect(model587).toContain("1 de julio de 2026");
    expect(model587).toContain("autoliquidación rectificativa");
    expect(model587).toContain("periodos anteriores");

    expect(MODEL_592_GUIDE_V1.effectiveYear).toBe(2023);
    expect(serialized(MODEL_592_GUIDE_V1)).toContain("plástico no reciclado");
    expect(serialized(MODEL_592_GUIDE_V1)).toContain("Aduanas");
    expect(MODEL_593_GUIDE_V1.effectiveYear).toBe(2023);
    expect(serialized(MODEL_593_GUIDE_V1)).toContain("comunidad autónoma");
    expect(serialized(MODEL_593_GUIDE_V1)).toContain("No existe una única");
  });

  it("preserves the electric-production calendar and separates payer information", () => {
    const model583 = serialized(MODEL_583_GUIDE_V1);
    for (const month of ["mayo", "septiembre", "noviembre", "febrero"]) {
      expect(model583).toContain(month);
    }
    expect(model583).toContain("1 al 30 de noviembre del año siguiente");
    expect(serialized(MODEL_588_GUIDE_V1)).toContain("cese");
    expect(serialized(MODEL_591_GUIDE_V1)).toContain("pagador");
    expect(serialized(MODEL_591_GUIDE_V1)).toContain("no liquida");
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
      if (page.status === "REVIEW_ONLY") {
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${guide.code}`);
      }
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
      expect(view).toContain(`"${guide.code}": MODEL_${guide.code}_GUIDE_V1`);
      expect(catalog).toContain(`"${guide.code}":`);
      expect(detail).toContain(`"${guide.code}":`);
      expect(metadata).toContain(`"${guide.code}":`);
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
  });
});
