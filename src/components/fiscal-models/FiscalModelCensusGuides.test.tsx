import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import { MODEL_030_GUIDE_V1 } from "./model-030-guide.v1";
import { MODEL_036_GUIDE_V1 } from "./model-036-guide.v1";
import { MODEL_037_GUIDE_V1 } from "./model-037-guide.v1";

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

function officialContent(code: "030" | "036" | "037") {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") {
    throw new Error(`Model ${code} must have official content`);
  }
  return result.data;
}

describe("Model 030, 036 and historical 037 practical guides", () => {
  it("explains the exact Model 030 audience, deadline and joint-spouse rules", () => {
    const copy = JSON.stringify(MODEL_030_GUIDE_V1);
    expect(copy).toContain("No es el alta habitual de autónomos");
    expect(copy).toContain("tres meses");
    expect(copy).toContain("Modelo 036");
    expect(copy).toContain("NIF K, L o M");
    expect(copy).toContain("firmar los dos");
    expect(copy).toContain("no sustituyen una notificación tributaria formal");
    expect(MODEL_030_GUIDE_V1.faq).toHaveLength(10);
    expect(MODEL_030_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/036",
    );
  });

  it("covers the complete, simplified and assisted Model 036 paths", () => {
    const copy = JSON.stringify(MODEL_036_GUIDE_V1);
    expect(copy).toContain("Modelo 036 simplificado");
    expect(copy).toContain("Censos WEB");
    expect(copy).toContain("no un impuesto");
    expect(copy).toContain("Antes de iniciar la actividad");
    expect(copy).toContain("dentro del mes siguiente");
    expect(copy).toContain("seis meses para los sucesores");
    expect(copy).toContain("ROI");
    expect(copy).toContain("REDEME");
    expect(copy).toContain("titulares reales");
    expect(copy).toContain("Modelo 840");
    expect(copy).toContain("validez limitada de un mes");
    expect(MODEL_036_GUIDE_V1.faq).toHaveLength(15);
  });

  it("keeps Model 037 historical and routes every new filing to Model 036", () => {
    const copy = JSON.stringify(MODEL_037_GUIDE_V1);
    expect(copy).toContain("Modelo suprimido desde el 3 de febrero de 2025.");
    expect(copy).toContain("Modelo histórico · no vigente");
    expect(copy).toContain("No presentes el 037");
    expect(copy).toContain("No es necesario presentarla de nuevo");
    expect(MODEL_037_GUIDE_V1.actions[0]).toEqual({
      label: "Ver el Modelo 036 actual",
      internalHref: "/consultor-fiscal/modelos/036",
      primary: true,
    });
    expect(
      MODEL_037_GUIDE_V1.actions.some((action) =>
        action.label.toLowerCase().includes("presentar modelo 037"),
      ),
    ).toBe(false);
    expect(MODEL_037_GUIDE_V1.faq).toHaveLength(10);
    expect(officialContent("037").lifecycleStatus).toBe("HISTORICAL");
  });

  it("keeps internal routes literal and every external action on AEAT or BOE", () => {
    expect(componentSource).toContain("InternalModelLink");
    expect(componentSource).toContain('target="_blank"');
    expect(componentSource).toContain('rel="noopener noreferrer"');

    const guides: readonly FiscalModelPracticalGuideV1[] = [
      MODEL_030_GUIDE_V1,
      MODEL_036_GUIDE_V1,
      MODEL_037_GUIDE_V1,
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

  it("keeps every cited source registered, hashed and official", () => {
    const guides = [
      MODEL_030_GUIDE_V1,
      MODEL_036_GUIDE_V1,
      MODEL_037_GUIDE_V1,
    ] as const;
    for (const guide of guides) {
      const content = officialContent(guide.code);
      const sourcesById = new Map(content.sources.map((source) => [source.id, source]));
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

  it("publishes exact SEO titles and preserves all three literal routes", () => {
    expect(detailPageSource).toContain(
      '"030": "Modelo 030 AEAT: domicilio y datos personales"',
    );
    expect(detailPageSource).toContain(
      '"036": "Modelo 036 AEAT: alta, modificación y baja censal"',
    );
    expect(detailPageSource).toContain(
      '"037": "Modelo 037 AEAT: modelo histórico sustituido por el 036"',
    );

    for (const code of ["030", "036", "037"] as const) {
      const page = resolvePublicAeatModelReviewPageV1({ code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY") {
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${code}`);
      }
    }
  });
});
