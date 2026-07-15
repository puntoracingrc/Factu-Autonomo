import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  listPublicAeatModelReviewPagesV1,
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import {
  MODEL_600_GUIDE_V1,
  MODEL_610_GUIDE_V1,
  MODEL_611_GUIDE_V1,
  MODEL_615_GUIDE_V1,
  MODEL_616_GUIDE_V1,
  MODEL_620_GUIDE_V1,
  MODEL_630_GUIDE_V1,
  MODEL_650_GUIDE_V1,
  MODEL_651_GUIDE_V1,
  MODEL_655_GUIDE_V1,
} from "./model-batch-5-property-inheritance-guides.v1";
import {
  MODEL_602_GUIDE_V1,
  MODEL_604_GUIDE_V1,
  MODEL_681_GUIDE_V1,
  MODEL_682_GUIDE_V1,
  MODEL_683_GUIDE_V1,
  MODEL_684_GUIDE_V1,
  MODEL_685_GUIDE_V1,
  MODEL_763_GUIDE_V1,
} from "./model-batch-5-sectorial-fees-guides.v1";
import {
  MODEL_695_GUIDE_V1,
  MODEL_696_GUIDE_V1,
  MODEL_770_GUIDE_V1,
  MODEL_771_GUIDE_V1,
} from "./model-batch-5-judicial-regularization-guides.v1";
import {
  MODEL_780_GUIDE_V1,
  MODEL_781_GUIDE_V1,
  MODEL_791_GUIDE_V1,
  MODEL_792_GUIDE_V1,
  MODEL_793_GUIDE_V1,
  MODEL_795_GUIDE_V1,
  MODEL_796_GUIDE_V1,
  MODEL_797_GUIDE_V1,
} from "./model-batch-5-financial-historical-guides.v1";

const guides = [
  MODEL_600_GUIDE_V1,
  MODEL_602_GUIDE_V1,
  MODEL_604_GUIDE_V1,
  MODEL_610_GUIDE_V1,
  MODEL_611_GUIDE_V1,
  MODEL_615_GUIDE_V1,
  MODEL_616_GUIDE_V1,
  MODEL_620_GUIDE_V1,
  MODEL_630_GUIDE_V1,
  MODEL_650_GUIDE_V1,
  MODEL_651_GUIDE_V1,
  MODEL_655_GUIDE_V1,
  MODEL_681_GUIDE_V1,
  MODEL_682_GUIDE_V1,
  MODEL_683_GUIDE_V1,
  MODEL_684_GUIDE_V1,
  MODEL_685_GUIDE_V1,
  MODEL_695_GUIDE_V1,
  MODEL_696_GUIDE_V1,
  MODEL_763_GUIDE_V1,
  MODEL_770_GUIDE_V1,
  MODEL_771_GUIDE_V1,
  MODEL_780_GUIDE_V1,
  MODEL_781_GUIDE_V1,
  MODEL_791_GUIDE_V1,
  MODEL_792_GUIDE_V1,
  MODEL_793_GUIDE_V1,
  MODEL_795_GUIDE_V1,
  MODEL_796_GUIDE_V1,
  MODEL_797_GUIDE_V1,
] as const satisfies readonly FiscalModelPracticalGuideV1[];

type Code = (typeof guides)[number]["code"];
const serialized = (guide: FiscalModelPracticalGuideV1) =>
  JSON.stringify(guide);

function officialContent(code: Code) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("AEAT model practical guides · batch 5 of 6", () => {
  it("publishes exactly thirty unique, deep and versioned guides", () => {
    expect(guides).toHaveLength(30);
    expect(new Set(guides.map((guide) => guide.code)).size).toBe(30);
    for (const guide of guides) {
      expect(guide.lastVerifiedAt, guide.code).toBe("2026-07-15");
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

  it("places territorial competence before filing", () => {
    for (const guide of [
      MODEL_600_GUIDE_V1,
      MODEL_610_GUIDE_V1,
      MODEL_615_GUIDE_V1,
      MODEL_620_GUIDE_V1,
      MODEL_630_GUIDE_V1,
      MODEL_650_GUIDE_V1,
      MODEL_651_GUIDE_V1,
      MODEL_655_GUIDE_V1,
      MODEL_685_GUIDE_V1,
    ]) {
      expect(guide.actions[0]?.label, guide.code).toBe(
        "Comprobar Administración competente",
      );
      expect(serialized(guide)).toContain(
        "Primero comprueba qué Administración es competente",
      );
    }
    for (const guide of [
      MODEL_600_GUIDE_V1,
      MODEL_620_GUIDE_V1,
      MODEL_630_GUIDE_V1,
    ]) {
      expect(serialized(guide)).toContain("Adobe Acrobat Reader");
      expect(serialized(guide)).toContain("no equivale a pagar ni presentar");
    }
  });

  it("keeps payments and annual summaries separate", () => {
    expect(serialized(MODEL_610_GUIDE_V1)).toContain("entidades colaboradoras");
    expect(serialized(MODEL_611_GUIDE_V1)).toContain(
      "no genera un segundo pago",
    );
    expect(serialized(MODEL_611_GUIDE_V1)).toContain(
      "1 de enero al 20 de febrero de 2026",
    );
    expect(serialized(MODEL_615_GUIDE_V1)).toContain("función de giro");
    expect(serialized(MODEL_616_GUIDE_V1)).toContain("sin nuevo ingreso");
  });

  it("preserves the financial-transaction monthly workflow", () => {
    const model604 = serialized(MODEL_604_GUIDE_V1);
    expect(model604).toContain("0,2 %");
    expect(model604).toContain("Mensual");
    expect(model604).toContain("día 10 al 20");
    expect(model604).toContain("anexo informativo");
    expect(model604).toContain("1.000 millones");
  });

  it("keeps inheritance individual, territorial and cause-specific", () => {
    expect(serialized(MODEL_650_GUIDE_V1)).toContain("Cada heredero");
    expect(serialized(MODEL_650_GUIDE_V1)).toContain("seis meses");
    expect(serialized(MODEL_650_GUIDE_V1)).toContain("primeros cinco meses");
    expect(serialized(MODEL_651_GUIDE_V1)).toContain("donatario");
    expect(serialized(MODEL_651_GUIDE_V1)).toContain("30 días hábiles");
    expect(serialized(MODEL_655_GUIDE_V1)).toContain("causa de extinción");
    expect(serialized(MODEL_655_GUIDE_V1)).toContain(
      "autoliquidación original",
    );
  });

  it("differentiates the radioactive-waste declarants and deadlines", () => {
    expect(serialized(MODEL_681_GUIDE_V1)).toContain("día 10 del segundo mes");
    expect(serialized(MODEL_682_GUIDE_V1)).toContain("tres meses naturales");
    expect(serialized(MODEL_683_GUIDE_V1)).toContain("tres primeros meses");
    expect(serialized(MODEL_684_GUIDE_V1)).toContain("60 días naturales");
    expect(serialized(MODEL_684_GUIDE_V1)).toContain("ENRESA");
  });

  it("keeps judicial percentages, exemptions and constitutional warning", () => {
    expect(serialized(MODEL_695_GUIDE_V1)).toContain("60 %");
    expect(serialized(MODEL_695_GUIDE_V1)).toContain("20 %");
    expect(serialized(MODEL_696_GUIDE_V1)).toContain("personas físicas");
    expect(serialized(MODEL_696_GUIDE_V1)).toContain("STC 140/2016");
  });

  it("keeps 770 and 771 exceptional and fail-closed", () => {
    for (const guide of [MODEL_770_GUIDE_V1, MODEL_771_GUIDE_V1]) {
      expect(serialized(guide)).toContain("alta complejidad");
      expect(serialized(guide)).toContain("no garantiza");
    }
    expect(serialized(MODEL_770_GUIDE_V1)).toContain("intereses y recargos");
    expect(serialized(MODEL_770_GUIDE_V1)).toContain(
      "No incluye la cuota principal",
    );
    expect(serialized(MODEL_771_GUIDE_V1)).toContain(
      "Solo sin modelo ordinario",
    );
    expect(serialized(MODEL_771_GUIDE_V1)).toContain("modelo ordinario");
  });

  it("preserves financial tax periods and no-filing guards", () => {
    expect(serialized(MODEL_780_GUIDE_V1)).toContain("1–20 de septiembre");
    expect(serialized(MODEL_780_GUIDE_V1)).toContain(
      "base liquidable no es positiva",
    );
    expect(serialized(MODEL_781_GUIDE_V1)).toContain("40 %");
    expect(serialized(MODEL_781_GUIDE_V1)).toContain("1–20 de febrero");
    expect(serialized(MODEL_781_GUIDE_V1)).toContain(
      "cuota líquida no es positiva",
    );
  });

  it("keeps employment non-tax and audiovisual rates exact", () => {
    expect(MODEL_791_GUIDE_V1.statusTone).toBe("auxiliary");
    expect(serialized(MODEL_791_GUIDE_V1)).toContain(
      "Pagar la tasa no equivale",
    );
    expect(serialized(MODEL_792_GUIDE_V1)).toContain("3 %");
    expect(serialized(MODEL_792_GUIDE_V1)).toContain("1,5 %");
    expect(serialized(MODEL_792_GUIDE_V1)).toContain("15 %");
    expect(serialized(MODEL_793_GUIDE_V1)).toContain("25 %");
    for (const month of ["abril", "julio", "octubre"])
      expect(serialized(MODEL_793_GUIDE_V1)).toContain(month);
  });

  it("keeps 795, 796 and 797 historical with no current filing action", () => {
    for (const guide of [
      MODEL_795_GUIDE_V1,
      MODEL_796_GUIDE_V1,
      MODEL_797_GUIDE_V1,
    ]) {
      expect(guide.statusTone).toBe("historical");
      expect(
        guide.actions.every(
          (action) => !action.label.match(/Presentar|Abrir gestiones/),
        ),
      ).toBe(true);
      expect(serialized(guide)).toContain("históric");
    }
    for (const guide of [MODEL_795_GUIDE_V1, MODEL_796_GUIDE_V1]) {
      expect(serialized(guide)).toContain("2023 y 2024");
      expect(serialized(guide)).toContain("23 de enero de 2025");
    }
    expect(serialized(MODEL_797_GUIDE_V1)).toContain("780");
    expect(serialized(MODEL_797_GUIDE_V1)).toContain("781");
  });

  it("keeps every relationship on an existing canonical route", () => {
    for (const guide of guides) {
      for (const relation of [
        guide.comparison.related,
        ...(guide.comparison.additional ?? []),
      ]) {
        if (relation.href === "/consultor-fiscal/modelos") continue;
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

  it("registers renderers, catalog copy, subtitles and SEO", () => {
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
    for (const guide of guides)
      for (const file of files) expect(file).toContain(`"${guide.code}":`);
  });

  it("uses the accessible, responsive and safe shared renderer", () => {
    const view = readFileSync(
      new URL("./FiscalModelPracticalGuide.tsx", import.meta.url),
      "utf8",
    );
    expect(view).toContain('target="_blank"');
    expect(view).toContain('rel="noopener noreferrer"');
    expect(view).toContain("focus-visible:outline");
    expect(view).toContain("break-words");
    expect(view).toContain("min-w-0");
    expect(view).toContain("<details");
    expect(view).toContain("<summary");
  });
});
