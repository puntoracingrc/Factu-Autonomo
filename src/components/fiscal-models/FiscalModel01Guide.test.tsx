import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolvePublicAeatOfficialModelContentV1 } from "@/lib/fiscal-models/model-pages";
import { MODEL_01_GUIDE_V1 } from "./model-01-guide.v1";

const componentSource = readFileSync(
  new URL("./FiscalModel01Guide.tsx", import.meta.url),
  "utf8",
);
const detailPageSource = readFileSync(
  new URL("../../app/consultor-fiscal/modelos/[codigo]/page.tsx", import.meta.url),
  "utf8",
);

function resolveModel01() {
  const result = resolvePublicAeatOfficialModelContentV1({ code: "01" });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") {
    throw new Error("Model 01 content must be published");
  }
  return result.data;
}

describe("FiscalModel01Guide", () => {
  it("defines the complete accessible guide without introducing another H1", () => {
    expect(componentSource).not.toContain("<h1");
    expect(componentSource).toContain("El Modelo 01 en pocas palabras");
    expect(componentSource).toContain("Certificados que puedes solicitar");
    expect(componentSource).toContain("Cómo rellenar el Modelo 01");
    expect(componentSource).toContain("Cómo solicitarlo");
    expect(componentSource).toContain(
      "Resultado del certificado de estar al corriente",
    );
    expect(componentSource).toContain("Qué ocurre después de solicitarlo");
    expect(MODEL_01_GUIDE_V1.csv.title).toBe(
      "Cómo comprobar que es auténtico",
    );
    expect(componentSource).toContain("Preguntas frecuentes");
    expect(componentSource).toContain("Documentos y enlaces oficiales");
    expect(componentSource).toContain("guide.comparison.model01cHref");
    expect(componentSource).toContain("Ver la ficha del Modelo 01C");
    expect(MODEL_01_GUIDE_V1.comparison.model01cHref).toBe(
      "/consultor-fiscal/modelos/01C",
    );
    expect(MODEL_01_GUIDE_V1.faq).toHaveLength(8);
  });

  it("keeps the exact public SEO title for Model 01", () => {
    expect(detailPageSource).toContain(
      '"01": "Modelo 01 AEAT: solicitud de certificados tributarios"',
    );
    expect(detailPageSource).toContain(
      "title: dedicatedSeoTitle ? { absolute: modelTitle }",
    );
  });

  it("keeps every guide source official, registered and traceable", () => {
    const content = resolveModel01();
    const sourcesById = new Map(
      content.sources.map((source) => [source.id, source]),
    );

    for (const sourceId of MODEL_01_GUIDE_V1.sourceIds) {
      const source = sourcesById.get(sourceId);
      expect(source, sourceId).toBeDefined();
      expect(source?.canonicalUrl).toMatch(
        /^https:\/\/(?:sede\.agenciatributaria\.gob\.es|www\.boe\.es)\//,
      );
      expect(source?.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(source?.verificationStatus).toBe("SOURCE_HASH_CAPTURED");
    }
  });

  it("marks official actions as external and safe", () => {
    expect(componentSource).toContain('target="_blank"');
    expect(componentSource).toContain('rel="noopener noreferrer"');
    expect(MODEL_01_GUIDE_V1.actions.procedure.label).toBe(
      "Solicitar certificado en la AEAT",
    );
    expect(MODEL_01_GUIDE_V1.actions.form.label).toBe(
      "Descargar Modelo 01 oficial",
    );
    expect(MODEL_01_GUIDE_V1.actions.instructions.label).toBe(
      "Ver instrucciones oficiales",
    );
    expect(componentSource).toContain("web oficial externa, nueva pestaña");
  });
});
