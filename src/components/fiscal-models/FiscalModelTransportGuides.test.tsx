import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import { MODEL_05_GUIDE_V1 } from "./model-05-guide.v1";
import { MODEL_06_GUIDE_V1 } from "./model-06-guide.v1";

const componentSource = readFileSync(
  new URL("./FiscalModelPracticalGuide.tsx", import.meta.url),
  "utf8",
);
const detailPageSource = readFileSync(
  new URL(
    "../../app/consultor-fiscal/modelos/[codigo]/page.tsx",
    import.meta.url,
  ),
  "utf8",
);

const OFFICIAL_HOSTS = new Set([
  "sede.agenciatributaria.gob.es",
  "www1.agenciatributaria.gob.es",
  "www2.agenciatributaria.gob.es",
  "www.boe.es",
]);

function officialContent(code: "05" | "06") {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") {
    throw new Error(`Model ${code} must have official content`);
  }
  return result.data;
}

describe("Model 05 and 06 practical guides", () => {
  it("publishes the complete Model 05 decision and filing guidance", () => {
    const copy = JSON.stringify(MODEL_05_GUIDE_V1);
    expect(MODEL_05_GUIDE_V1.quickSummaryTitle).toBe(
      "El Modelo 05 en pocas palabras",
    );
    expect(copy).toContain("Debe solicitarse y concederse antes de matricular");
    expect(copy).toContain("ER4");
    expect(copy).toContain("RE1");
    expect(copy).toContain("reducción del 50 % de la base imponible");
    expect(copy).toContain("debe presentarse el Modelo 576");
    expect(copy).toContain("seis meses");
    expect(copy).toContain("diez días");
    expect(copy).toContain("un plazo de un mes");
    expect(MODEL_05_GUIDE_V1.faq).toHaveLength(10);
    expect(MODEL_05_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/06",
    );
    expect(MODEL_05_GUIDE_V1.comparison.additional?.[0]?.href).toBe(
      "/consultor-fiscal/modelos/576",
    );
  });

  it("publishes every NS and ET key and the real Model 06 filing channels", () => {
    const copy = JSON.stringify(MODEL_06_GUIDE_V1);
    for (const key of [
      "NS1",
      "NS2",
      "NS3",
      "NS4",
      "NS5",
      "NS6",
      "NS7",
      "NS8",
      "NS9",
      "NS10",
      "ET1",
      "ET2",
      "ET3",
      "ET4",
    ]) {
      expect(copy, key).toContain(key);
    }
    expect(copy).toContain("exclusiva para gestores");
    expect(copy).toContain("doce meses consecutivos anteriores");
    expect(copy).toContain("al menos seis meses");
    expect(copy).toContain("amplía a 60 días");
    expect(copy).toContain("motos náuticas están sujetas");
    expect(copy).toContain("Base imponible alternativa");
    expect(copy).toContain("No existe plazo de resolución");
    expect(MODEL_06_GUIDE_V1.actionGroups?.[0]?.title).toBe(
      "Accesos exclusivos para gestores",
    );
    expect(MODEL_06_GUIDE_V1.faq).toHaveLength(10);
  });

  it("keeps external actions safe, official and separate from internal links", () => {
    expect(componentSource).not.toContain("<h1");
    expect(componentSource).toContain('target="_blank"');
    expect(componentSource).toContain('rel="noopener noreferrer"');
    expect(componentSource).toContain("guide.actionGroups");
    expect(componentSource).toContain("guide.comparison.additional");

    const guides: readonly FiscalModelPracticalGuideV1[] = [
      MODEL_05_GUIDE_V1,
      MODEL_06_GUIDE_V1,
    ];
    for (const guide of guides) {
      const directLinks = [
        ...guide.actions,
        ...guide.officialLinks,
        ...(guide.actionGroups?.flatMap((group) => group.links) ?? []),
      ];
      for (const link of directLinks) {
        if (!("href" in link) || !link.href) continue;
        const url = new URL(link.href);
        expect(url.protocol).toBe("https:");
        expect(OFFICIAL_HOSTS.has(url.hostname), link.href).toBe(true);
      }
    }
  });

  it("keeps every guide source registered, hashed and official", () => {
    const guides: readonly FiscalModelPracticalGuideV1[] = [
      MODEL_05_GUIDE_V1,
      MODEL_06_GUIDE_V1,
    ];
    for (const guide of guides) {
      if (guide.code !== "05" && guide.code !== "06") {
        throw new Error(`Unexpected guide ${guide.code}`);
      }
      const content = officialContent(guide.code);
      const sourcesById = new Map(
        content.sources.map((source) => [source.id, source]),
      );
      for (const sourceId of guide.sourceIds) {
        const source = sourcesById.get(sourceId);
        expect(source, `${guide.code}: ${sourceId}`).toBeDefined();
        expect(source?.canonicalUrl).toMatch(
          /^https:\/\/(?:sede\.agenciatributaria\.gob\.es|www\.boe\.es)\//,
        );
        expect(source?.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(source?.verificationStatus).toBe("SOURCE_HASH_CAPTURED");
      }
    }
  });

  it("publishes exact SEO copy while preserving the literal routes", () => {
    expect(detailPageSource).toContain(
      '"05": "Modelo 05 AEAT: beneficios en el impuesto de matriculación"',
    );
    expect(detailPageSource).toContain(
      '"06": "Modelo 06 AEAT: exenciones del impuesto de matriculación"',
    );
    expect(officialContent("05").summary).toBe(
      "Guía sencilla del Modelo 05: quién debe presentarlo, supuestos de discapacidad, familia numerosa, taxis, alquiler, documentación, plazos y trámite oficial.",
    );
    expect(officialContent("06").summary).toBe(
      "Guía sencilla del Modelo 06: supuestos de no sujeción y exención, claves NS y ET, traslado de residencia, documentación y presentación.",
    );

    for (const code of ["05", "06"] as const) {
      const page = resolvePublicAeatModelReviewPageV1({ code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY") {
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${code}`);
      }
    }
  });
});
