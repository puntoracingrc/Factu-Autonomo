import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import { MODEL_01C_GUIDE_V1 } from "./model-01c-guide.v1";
import { MODEL_04_GUIDE_V1 } from "./model-04-guide.v1";

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

function officialContent(code: "01C" | "04") {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") {
    throw new Error(`Model ${code} must have official content`);
  }
  return result.data;
}

describe("FiscalModelPracticalGuide", () => {
  it("renders complete accessible guides without adding another H1", () => {
    expect(componentSource).not.toContain("<h1");
    expect(MODEL_01C_GUIDE_V1.quickSummaryTitle).toBe(
      "El Modelo 01C en pocas palabras",
    );
    expect(MODEL_01C_GUIDE_V1.fillingTitle).toBe("Cómo rellenar el Modelo 01C");
    expect(JSON.stringify(MODEL_01C_GUIDE_V1)).toContain("tres días hábiles");
    expect(JSON.stringify(MODEL_01C_GUIDE_V1)).toContain(
      "doce meses anteriores",
    );
    expect(JSON.stringify(MODEL_01C_GUIDE_V1)).toContain(
      "Código Seguro de Verificación",
    );
    expect(MODEL_01C_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/01",
    );
    expect(MODEL_01C_GUIDE_V1.faq).toHaveLength(10);

    expect(MODEL_04_GUIDE_V1.quickSummaryTitle).toBe(
      "El Modelo 04 en pocas palabras",
    );
    expect(MODEL_04_GUIDE_V1.fillingTitle).toBe("Cómo rellenar el Modelo 04");
    expect(JSON.stringify(MODEL_04_GUIDE_V1)).toContain(
      "antes de adquirir el vehículo",
    );
    expect(JSON.stringify(MODEL_04_GUIDE_V1)).toContain(
      "Aceptación provisional",
    );
    expect(JSON.stringify(MODEL_04_GUIDE_V1)).toContain("seis meses");
    expect(MODEL_04_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/05",
    );
    expect(MODEL_04_GUIDE_V1.faq).toHaveLength(12);
  });

  it("keeps official links external, safe and restricted to official hosts", () => {
    expect(componentSource).toContain('target="_blank"');
    expect(componentSource).toContain('rel="noopener noreferrer"');
    expect(componentSource).toContain("web oficial externa, nueva pestaña");

    for (const guide of [MODEL_01C_GUIDE_V1, MODEL_04_GUIDE_V1]) {
      for (const item of [...guide.actions, ...guide.officialLinks]) {
        if (!("href" in item) || !item.href) continue;
        expect(new URL(item.href).protocol).toBe("https:");
        expect([
          "sede.agenciatributaria.gob.es",
          "www1.agenciatributaria.gob.es",
          "www2.agenciatributaria.gob.es",
        ]).toContain(new URL(item.href).hostname);
      }
    }
  });

  it("keeps every registered guide source traceable and verified", () => {
    for (const guide of [MODEL_01C_GUIDE_V1, MODEL_04_GUIDE_V1]) {
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

  it("publishes the requested SEO copy and preserves the uppercase 01C route", () => {
    expect(detailPageSource).toContain(
      '"Modelo 01C AEAT: certificado de contratistas y subcontratistas"',
    );
    expect(detailPageSource).toContain(
      '"Modelo 04 AEAT: IVA del 4 % para vehículos y movilidad reducida"',
    );
    expect(officialContent("01C").summary).toBe(
      "Guía sencilla del Modelo 01C: para qué sirve, quién debe solicitarlo, cómo identificar al pagador, plazo, duración y acceso al trámite oficial.",
    );
    expect(officialContent("04").summary).toBe(
      "Guía sencilla del Modelo 04: requisitos del IVA del 4 %, documentación, solicitud previa, regla de cuatro años y procedimiento de la AEAT.",
    );

    const canonical = resolvePublicAeatModelReviewPageV1({ code: "01C" });
    expect(canonical.status).toBe("REVIEW_ONLY");
    if (canonical.status === "REVIEW_ONLY") {
      expect(canonical.data.href).toBe("/consultor-fiscal/modelos/01C");
    }
    expect(resolvePublicAeatModelReviewPageV1({ code: "01c" }).status).toBe(
      "BLOCKED",
    );
  });

  it("does not claim that Factu presents or sends either request", () => {
    const copy = JSON.stringify([MODEL_01C_GUIDE_V1, MODEL_04_GUIDE_V1]);
    expect(copy).not.toMatch(/Factu (?:presenta|firma|envía) (?:la|el)/i);
    expect(componentSource).toContain(
      "Factu no presenta solicitudes, no firma formularios y no envía datos",
    );
  });
});
