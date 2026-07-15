import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  listPublicAeatModelReviewPagesV1,
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import {
  MODEL_353_GUIDE_V1,
  MODEL_364_GUIDE_V1,
  MODEL_365_GUIDE_V1,
  MODEL_368_GUIDE_V1,
  MODEL_379_GUIDE_V1,
  MODEL_380_GUIDE_V1,
  MODEL_381_GUIDE_V1,
} from "./model-batch-3-vat-guides.v1";
import {
  MODEL_410_GUIDE_V1,
  MODEL_411_GUIDE_V1,
  MODEL_430_GUIDE_V1,
  MODEL_480_GUIDE_V1,
  MODEL_490_GUIDE_V1,
} from "./model-batch-3-sectorial-tax-guides.v1";
import {
  MODEL_504_GUIDE_V1,
  MODEL_505_GUIDE_V1,
  MODEL_506_GUIDE_V1,
  MODEL_507_GUIDE_V1,
  MODEL_508_GUIDE_V1,
  MODEL_510_GUIDE_V1,
  MODEL_512_GUIDE_V1,
} from "./model-batch-3-excise-movement-guides.v1";
import {
  MODEL_515_GUIDE_V1,
  MODEL_517_GUIDE_V1,
  MODEL_518_GUIDE_V1,
  MODEL_519_GUIDE_V1,
  MODEL_520_GUIDE_V1,
  MODEL_521_GUIDE_V1,
  MODEL_522_GUIDE_V1,
  MODEL_523_GUIDE_V1,
  MODEL_524_GUIDE_V1,
} from "./model-batch-3-excise-control-guides.v1";
import {
  MODEL_544_GUIDE_V1,
  MODEL_545_GUIDE_V1,
} from "./model-batch-3-fuel-guides.v1";

const guides = [
  MODEL_353_GUIDE_V1,
  MODEL_364_GUIDE_V1,
  MODEL_365_GUIDE_V1,
  MODEL_368_GUIDE_V1,
  MODEL_379_GUIDE_V1,
  MODEL_380_GUIDE_V1,
  MODEL_381_GUIDE_V1,
  MODEL_410_GUIDE_V1,
  MODEL_411_GUIDE_V1,
  MODEL_430_GUIDE_V1,
  MODEL_480_GUIDE_V1,
  MODEL_490_GUIDE_V1,
  MODEL_504_GUIDE_V1,
  MODEL_505_GUIDE_V1,
  MODEL_506_GUIDE_V1,
  MODEL_507_GUIDE_V1,
  MODEL_508_GUIDE_V1,
  MODEL_510_GUIDE_V1,
  MODEL_512_GUIDE_V1,
  MODEL_515_GUIDE_V1,
  MODEL_517_GUIDE_V1,
  MODEL_518_GUIDE_V1,
  MODEL_519_GUIDE_V1,
  MODEL_520_GUIDE_V1,
  MODEL_521_GUIDE_V1,
  MODEL_522_GUIDE_V1,
  MODEL_523_GUIDE_V1,
  MODEL_524_GUIDE_V1,
  MODEL_544_GUIDE_V1,
  MODEL_545_GUIDE_V1,
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

describe("AEAT model practical guides · batch 3 of 6", () => {
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

  it("preserves the critical IVA rules and distinct institutional procedures", () => {
    const model353 = serialized(MODEL_353_GUIDE_V1);
    expect(model353).toContain("Mensual");
    expect(model353).toContain("Modelos 322");
    expect(model353).toContain("día 1 al 30");
    expect(model353).toContain("último día de febrero");
    expect(model353).toContain(
      "no elimina la obligación ni la responsabilidad",
    );

    expect(MODEL_368_GUIDE_V1.statusTone).toBe("historical");
    expect(serialized(MODEL_368_GUIDE_V1)).toContain("Modelo 035");
    expect(serialized(MODEL_368_GUIDE_V1)).toContain("Modelo 369");
    expect(
      MODEL_368_GUIDE_V1.actions.every(
        (action) => !action.label.match(/Presentar|Abrir gestiones/),
      ),
    ).toBe(true);

    const model379 = serialized(MODEL_379_GUIDE_V1);
    expect(model379).toContain("Trimestral");
    expect(model379).toContain("CESOP");
    expect(model379).toContain("Más de 25 pagos");
    expect(model379).toContain("sin importe mínimo");
    expect(model379).toContain("agregar");
    expect(model379).toContain("No lo presenta el comercio");

    const model364Name = officialContent("364").canonicalName;
    const model365Name = officialContent("365").canonicalName;
    const model381Name = officialContent("381").canonicalName;
    expect(model364Name).toContain(
      "Organización del Tratado del Atlántico Norte",
    );
    expect(model365Name).toContain("exenciones");
    expect(model381Name).toContain("Fuerzas Armadas");
    expect(new Set([model364Name, model365Name, model381Name]).size).toBe(3);
  });

  it("keeps sectoral payments, annual summaries and the digital-services rate distinct", () => {
    expect(serialized(MODEL_410_GUIDE_V1)).toContain("pago a cuenta");
    expect(serialized(MODEL_411_GUIDE_V1)).toContain("Anual");
    expect(serialized(MODEL_430_GUIDE_V1)).toContain("Mensual");
    expect(serialized(MODEL_480_GUIDE_V1)).toContain("Anual");
    expect(serialized(MODEL_490_GUIDE_V1)).toContain("3 %");
    expect(serialized(MODEL_490_GUIDE_V1)).toContain("Trimestral");
  });

  it("keeps the 504/505 authorization pair and current 507 lifecycle fail-closed", () => {
    expect(serialized(MODEL_504_GUIDE_V1)).toContain("Orden HFP/626/2023");
    expect(serialized(MODEL_504_GUIDE_V1)).toContain("Solicitud");
    expect(MODEL_505_GUIDE_V1.statusTone).toBe("auxiliary");
    expect(serialized(MODEL_505_GUIDE_V1)).toContain(
      "No tiene presentación independiente",
    );
    expect(
      MODEL_505_GUIDE_V1.actions.every(
        (action) => !action.label.match(/Presentar|Abrir gestiones/),
      ),
    ).toBe(true);
    expect(MODEL_507_GUIDE_V1.statusTone).toBe("current");
    expect(serialized(MODEL_507_GUIDE_V1)).toContain("Orden HFP/626/2023");
    expect(serialized(MODEL_507_GUIDE_V1)).toContain(
      "No es un modelo derogado",
    );

    for (const guide of [MODEL_506_GUIDE_V1, MODEL_508_GUIDE_V1]) {
      expect(serialized(guide)).toContain("20");
      expect(serialized(guide)).toContain("Trimestral");
    }
    expect(serialized(MODEL_510_GUIDE_V1)).toContain(
      "No se presenta por cualquier adquisición intracomunitaria",
    );
    expect(serialized(MODEL_512_GUIDE_V1)).toContain("50.000 litros");
    expect(serialized(MODEL_512_GUIDE_V1)).toContain("primer trimestre");
  });

  it("does not interchange fiscal marks or the 518–519–520 sequence", () => {
    const model515 = serialized(MODEL_515_GUIDE_V1);
    expect(model515).toContain("todas las labores del tabaco");
    expect(model515).toContain("Solicitud electrónica");
    expect(model515).toContain("recepción y contabilidad");
    expect(serialized(MODEL_517_GUIDE_V1)).toContain("bebidas derivadas");

    expect(serialized(MODEL_518_GUIDE_V1)).toContain("al menos un día hábil");
    expect(serialized(MODEL_519_GUIDE_V1)).toContain("inmediatamente");
    expect(serialized(MODEL_520_GUIDE_V1)).toContain(
      "El día en que finaliza el periodo de actividad",
    );
  });

  it("keeps alcohol benefits and the genuine Model 522 conflict explicit", () => {
    const model521 = serialized(MODEL_521_GUIDE_V1);
    expect(model521).toContain("alcohol vínico");
    expect(model521).toContain("Orujos, piquetas");
    expect(model521).toContain("artículo 89");

    expect(MODEL_522_GUIDE_V1.statusTone).toBe("auxiliary");
    expect(serialized(MODEL_522_GUIDE_V1)).toContain("derogado en 2013");
    expect(serialized(MODEL_522_GUIDE_V1)).toContain("confirmarse");
    expect(
      MODEL_522_GUIDE_V1.actions.every(
        (action) => !action.label.match(/Presentar|Abrir gestiones/),
      ),
    ).toBe(true);

    expect(serialized(MODEL_523_GUIDE_V1)).toContain("Reconocimiento previo");
    expect(serialized(MODEL_523_GUIDE_V1)).toContain("aromas");
    expect(serialized(MODEL_524_GUIDE_V1)).toContain("Trimestral");
  });

  it("preserves the quarterly day-20 deadline for Models 544 and 545", () => {
    for (const guide of [MODEL_544_GUIDE_V1, MODEL_545_GUIDE_V1]) {
      expect(serialized(guide)).toContain("Trimestral");
      expect(serialized(guide)).toContain(
        "día 20 del mes siguiente a la finalización del trimestre",
      );
    }
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
