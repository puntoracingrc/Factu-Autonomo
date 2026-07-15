import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  listPublicAeatModelReviewPagesV1,
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import { MODEL_040_GUIDE_V1 } from "./model-040-guide.v1";
import { MODEL_04_GUIDE_V1 } from "./model-04-guide.v1";
import { MODEL_172_GUIDE_V1 } from "./model-172-guide.v1";
import { MODEL_173_GUIDE_V1 } from "./model-173-guide.v1";
import { MODEL_179_GUIDE_V1 } from "./model-179-guide.v1";
import { MODEL_233_GUIDE_V1 } from "./model-233-guide.v1";
import { MODEL_238_GUIDE_V1 } from "./model-238-guide.v1";

type Code = "040" | "172" | "173" | "179" | "233" | "238";
type Guide = FiscalModelPracticalGuideV1 & { readonly code: Code };

const guides: readonly Guide[] = [
  MODEL_040_GUIDE_V1,
  MODEL_172_GUIDE_V1,
  MODEL_173_GUIDE_V1,
  MODEL_179_GUIDE_V1,
  MODEL_233_GUIDE_V1,
  MODEL_238_GUIDE_V1,
];

const OFFICIAL_HOSTS = new Set([
  "sede.agenciatributaria.gob.es",
  "www1.agenciatributaria.gob.es",
  "www2.agenciatributaria.gob.es",
  "www.boe.es",
]);

function officialContent(code: Code) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("Models 040, 238, 179, 172, 173 and 233 practical guides", () => {
  it("keeps Model 040 distinct from Model 04 and explains both operator registers", () => {
    const copy = JSON.stringify(MODEL_040_GUIDE_V1);
    for (const expected of [
      "no lo presenta el vendedor",
      "operadores extranjeros no cualificados",
      "otros operadores obligados",
      "dentro del mes",
      "certificado electrónico",
      "no sustituye al Modelo 036",
      "/consultor-fiscal/modelos/238",
      "/consultor-fiscal/modelos/04",
    ])
      expect(copy.toLowerCase()).toContain(expected.toLowerCase());
    expect(MODEL_040_GUIDE_V1.code).toBe("040");
    expect(MODEL_04_GUIDE_V1.code).toBe("04");
    expect(MODEL_040_GUIDE_V1.faq).toHaveLength(12);
  });

  it("limits the Model 238 double threshold to sales of goods and never calls it tax-free", () => {
    const copy = JSON.stringify(MODEL_238_GUIDE_V1);
    for (const expected of [
      "menos de 30",
      "2.000 euros",
      "dos condiciones",
      "solo en venta de bienes",
      "no son límites fiscales",
      "29 ventas y 2.100 euros",
      "31 ventas y 500 euros",
      "20 ventas y 1.500 euros",
      "declaración negativa",
      "aceptación parcial",
      "protección de datos",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_238_GUIDE_V1.faq).toHaveLength(12);
  });

  it("keeps Model 179 historical with no current filing action", () => {
    const copy = JSON.stringify(MODEL_179_GUIDE_V1);
    for (const expected of [
      "no vigente desde el ejercicio 2024",
      "último ejercicio ordinario fue 2023",
      "enero de 2024",
      "intermediarios",
      "/consultor-fiscal/modelos/238",
      "consultas o correcciones",
    ])
      expect(copy.toLowerCase()).toContain(expected.toLowerCase());
    expect(
      MODEL_179_GUIDE_V1.actions.every(
        (action) => !action.label.includes("Presentar"),
      ),
    ).toBe(true);
    expect(officialContent("179").lifecycleStatus).toBe("HISTORICAL");
    expect(MODEL_179_GUIDE_V1.faq).toHaveLength(12);
  });

  it("explains Model 172 balances, valuation, fiat and the absence of the 721 threshold", () => {
    const copy = JSON.stringify(MODEL_172_GUIDE_V1);
    for (const expected of [
      "custodios",
      "Titulares",
      "Autorizados",
      "Beneficiarios",
      "31 de diciembre",
      "moneda fiduciaria",
      "cada moneda",
      "estimación razonable",
      "No aplica el límite de 50.000 euros",
      "mensajes XML",
      "/consultor-fiscal/modelos/721",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_172_GUIDE_V1.faq).toHaveLength(12);
  });

  it("explains every Model 173 operation and transfer sign without inferring tax", () => {
    const copy = JSON.stringify(MODEL_173_GUIDE_V1);
    for (const expected of [
      "Adquisición",
      "transmisión",
      "Permuta",
      "Transferencias",
      "Ofertas iniciales",
      "individualmente",
      "signo negativo",
      "signo positivo",
      "comisiones",
      "mensajes XML",
      "ni sustituye la declaración",
    ])
      expect(copy.toLowerCase()).toContain(expected.toLowerCase());
    expect(MODEL_173_GUIDE_V1.faq).toHaveLength(12);
  });

  it("assigns Model 233 to centers and preserves the two authorization types", () => {
    const copy = JSON.stringify(MODEL_233_GUIDE_V1);
    for (const expected of [
      "no lo presentan los padres",
      "Tipo 1 · autorización educativa",
      "Tipo 2 · otra autorización",
      "información del ejercicio 2025",
      "meses completos",
      "Importe total",
      "Subvención",
      "centro público",
      "Gestión indirecta",
      "/consultor-fiscal/modelos/100",
      "/consultor-fiscal/modelos/140",
      "no solicita, importa, almacena",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_233_GUIDE_V1.faq).toHaveLength(12);
  });

  it("versions all six guides and keeps campaign dates separate from the general rule", () => {
    for (const guide of guides) {
      expect(guide.lastVerifiedAt).toBe("2026-07-15");
      expect(guide.requiresAnnualReview).toBe(true);
      expect(guide.faq.length).toBeGreaterThanOrEqual(12);
    }
    for (const guide of [
      MODEL_172_GUIDE_V1,
      MODEL_173_GUIDE_V1,
      MODEL_233_GUIDE_V1,
      MODEL_238_GUIDE_V1,
    ]) {
      const copy = JSON.stringify(guide);
      expect(copy.toLowerCase()).toContain("durante enero");
      expect(copy).toContain("1 de enero al 2 de febrero de 2026");
      expect(copy).toContain("cuatro días");
      expect(guide.taxPeriodYear).toBe(2025);
      expect(guide.filingYear).toBe(2026);
    }
  });

  it("limits direct navigation to official HTTPS hosts", () => {
    for (const guide of guides) {
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
      const sources = new Map(
        officialContent(guide.code).sources.map((source) => [
          source.id,
          source,
        ]),
      );
      for (const sourceId of guide.sourceIds) {
        const source = sources.get(sourceId);
        expect(source, `${guide.code}: ${sourceId}`).toBeDefined();
        expect(source?.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(source?.verificationStatus).toBe("SOURCE_HASH_CAPTURED");
      }
    }
  });

  it("publishes six stable routes without changing the 229-entry catalog", () => {
    const catalog = listPublicAeatModelReviewPagesV1();
    expect(catalog.status).toBe("REVIEW_ONLY");
    if (catalog.status === "BLOCKED") throw new Error(catalog.reason);
    expect(catalog.data).toHaveLength(229);
    for (const code of guides.map((guide) => guide.code)) {
      const page = resolvePublicAeatModelReviewPageV1({ code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY")
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${code}`);
    }
    const model04 = resolvePublicAeatModelReviewPageV1({ code: "04" });
    expect(model04.status).toBe("REVIEW_ONLY");
    if (model04.status === "REVIEW_ONLY")
      expect(model04.data.href).toBe("/consultor-fiscal/modelos/04");
  });

  it("registers dedicated SEO, catalog copy, subtitles and renderers", () => {
    const page = readFileSync(
      new URL(
        "../../app/consultor-fiscal/modelos/[codigo]/page.tsx",
        import.meta.url,
      ),
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
    const view = readFileSync(
      new URL("./FiscalModelOfficialContentView.tsx", import.meta.url),
      "utf8",
    );

    for (const title of [
      "Modelo 040 AEAT: registro de operadores de plataformas",
      "Modelo 172 AEAT: saldos en monedas virtuales",
      "Modelo 173 AEAT: operaciones con monedas virtuales",
      "Modelo 179 AEAT: histórico de alquileres turísticos",
      "Modelo 233 AEAT: gastos de guarderías y centros infantiles",
      "Modelo 238 AEAT: información de operadores de plataformas",
    ])
      expect(page).toContain(title);
    expect(catalog).toContain("Obligaciones informativas sectoriales");
    for (const code of guides.map((guide) => guide.code)) {
      expect(catalog).toContain(`"${code}": [`);
      expect(detail).toContain(`"${code}":`);
      expect(view).toContain(`content.code === "${code}"`);
    }
  });

  it("keeps the renderer read-only and external links safe", () => {
    const renderer = readFileSync(
      new URL("./FiscalModelPracticalGuide.tsx", import.meta.url),
      "utf8",
    );
    expect(renderer).toContain('target="_blank"');
    expect(renderer).toContain('rel="noopener noreferrer"');
    for (const forbidden of [
      "localStorage",
      "supabase",
      "fetch(",
      "XMLHttpRequest",
    ])
      expect(renderer).not.toContain(forbidden);
  });
});
