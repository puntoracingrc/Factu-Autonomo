import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import { getFiscalModelDocumentTitle } from "./fiscal-model-document-title";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import { MODEL_035_GUIDE_V1 } from "./model-035-guide.v1";
import { MODEL_369_GUIDE_V1 } from "./model-369-guide.v1";
import { MODEL_840_GUIDE_V1 } from "./model-840-guide.v1";

type Guide = FiscalModelPracticalGuideV1 & {
  readonly code: "035" | "369" | "840";
};

const guides: readonly Guide[] = [
  MODEL_035_GUIDE_V1,
  MODEL_369_GUIDE_V1,
  MODEL_840_GUIDE_V1,
];

function officialContent(code: Guide["code"]) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("Formulario 035 and Models 369/840 practical guides", () => {
  it("uses the official document type centrally without changing other models", () => {
    expect(getFiscalModelDocumentTitle("035")).toBe("Formulario 035");
    expect(getFiscalModelDocumentTitle("369")).toBe("Modelo 369");
    expect(getFiscalModelDocumentTitle("840")).toBe("Modelo 840");
  });

  it("keeps Form 035 censal and explains the complete OSS/IOSS decision", () => {
    const copy = JSON.stringify(MODEL_035_GUIDE_V1);
    for (const expected of [
      "No es una declaración periódica",
      "Régimen de la Unión",
      "Régimen exterior de la Unión",
      "IOSS",
      "no superior a 150 euros",
      "10.000 euros",
      "no obliga automáticamente a OSS",
      "un 035 separado",
      "décimo día",
      "quince días",
      "Modelo 369",
      "Modelo 036",
      "Modelo 303",
      "Modelo 349",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_035_GUIDE_V1.faq).toHaveLength(15);
  });

  it("keeps Model 369 periodic, exhaustive and input-VAT safe", () => {
    const copy = JSON.stringify(MODEL_369_GUIDE_V1);
    for (const expected of [
      "incluso cuando no haya",
      "trimestre natural",
      "mes natural",
      "No utilices el día 20",
      "todas las operaciones",
      "país de consumo",
      "no se deduce",
      "no puede producir un importe total negativo",
      "no reduce la deuda de otros Estados",
      "pago parcial",
      "tres años",
      "Modelo 360",
      "Modelo 361",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_369_GUIDE_V1.faq).toHaveLength(15);
  });

  it("makes the individual IAE exemption and 036/840/848 split prominent", () => {
    const copy = JSON.stringify(MODEL_840_GUIDE_V1);
    for (const expected of [
      "persona física autónoma está exenta",
      "con independencia de su cifra de negocios",
      "1.000.000",
      "dos primeros periodos",
      "inicio real",
      "Sección 1",
      "Sección 2",
      "Sección 3",
      "gestión censal está delegada",
      "dentro de un mes",
      "durante diciembre",
      "no produce un pago inmediato",
      "trimestres naturales completos",
      "Modelo 848",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_840_GUIDE_V1.faq).toHaveLength(15);
  });

  it("versions all guides and restricts direct links to official HTTPS hosts", () => {
    const allowedHosts = new Set([
      "sede.agenciatributaria.gob.es",
      "www.boe.es",
      "ec.europa.eu",
      "taxation-customs.ec.europa.eu",
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

  it("publishes exact summaries, SEO, subtitles, labels and routes", () => {
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
      "Formulario 035 AEAT: alta en OSS e IOSS",
      "Modelo 369 AEAT: declaración de IVA OSS e IOSS",
      "Modelo 840 AEAT: alta, variación y baja en el IAE",
    ])
      expect(pageSource).toContain(title);
    for (const subtitle of [
      "Alta, modificación y baja en OSS e IOSS",
      "Declaración del IVA de OSS e IOSS",
      "Alta, variación y baja en el Impuesto sobre Actividades Económicas",
    ])
      expect(detailSource).toContain(subtitle);
    for (const code of ["035", "369", "840"] as const) {
      const page = resolvePublicAeatModelReviewPageV1({ code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY") {
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${code}`);
      }
      expect(catalogSource).toContain(`"${code}": [`);
      expect(viewSource).toContain(`content.code === "${code}"`);
    }
  });

  it("keeps the prescribed territorial notes visible", () => {
    expect(JSON.stringify(MODEL_035_GUIDE_V1)).toContain(
      "La Península y Baleares forman el territorio de aplicación del IVA español",
    );
    expect(JSON.stringify(MODEL_369_GUIDE_V1)).toContain(
      "Los empresarios establecidos en Canarias, Ceuta o Melilla",
    );
    expect(JSON.stringify(MODEL_840_GUIDE_V1)).toContain(
      "País Vasco y Navarra pueden tener reglas y trámites de sus Haciendas forales",
    );
  });
});
