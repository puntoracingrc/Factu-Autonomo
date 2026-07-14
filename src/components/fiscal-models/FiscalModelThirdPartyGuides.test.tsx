import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import { MODEL_347_GUIDE_V1 } from "./model-347-guide.v1";
import { MODEL_349_GUIDE_V1 } from "./model-349-guide.v1";

type ThirdPartyGuide = FiscalModelPracticalGuideV1 & {
  readonly code: "347" | "349";
};

const guides: readonly ThirdPartyGuide[] = [
  MODEL_347_GUIDE_V1,
  MODEL_349_GUIDE_V1,
];

const OFFICIAL_HOSTS = new Set([
  "sede.agenciatributaria.gob.es",
  "www1.agenciatributaria.gob.es",
  "www2.agenciatributaria.gob.es",
  "www.boe.es",
  "ec.europa.eu",
]);

function officialContent(code: ThirdPartyGuide["code"]) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("Models 347 and 349 practical guides", () => {
  it("explains the annual Model 347 threshold and its exclusions without netting", () => {
    const copy = JSON.stringify(MODEL_347_GUIDE_V1);
    for (const expected of [
      "supera 3.005,06 €",
      "exactamente igual no lo supera",
      "con IVA",
      "Compras y ventas no se compensan",
      "valor absoluto anual",
      "6.000 €",
      "40.000 registros",
      "todo el ejercicio",
      "Modelo 180",
      "Modelo 190",
      "Modelo 349",
      "no es una declaración presentada",
    ]) expect(copy).toContain(expected);
    expect(MODEL_347_GUIDE_V1.faq).toHaveLength(18);
    expect(MODEL_347_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/349",
    );
  });

  it("explains Model 349 without turning 50,000 euros into a filing exemption", () => {
    const copy = JSON.stringify(MODEL_349_GUIDE_V1);
    for (const expected of [
      "No tiene un importe mínimo general",
      "50.000 € solo",
      "cuatro trimestres naturales anteriores",
      "no incluye las adquisiciones intracomunitarias",
      "No existe desde 2020",
      "NIF-IVA",
      "tres meses",
      "E · Entregas",
      "A · Adquisiciones",
      "S · Servicios prestados",
      "I · Servicios recibidos",
      "Gran Bretaña",
      "prefijo XI",
      "Canarias, Ceuta y Melilla",
      "40.000 registros",
      "Modelo 309",
      "Modelo 369",
      "no es válido para presentar",
    ]) expect(copy).toContain(expected);
    expect(MODEL_349_GUIDE_V1.faq).toHaveLength(20);
    expect(MODEL_349_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/347",
    );
    expect(copy).not.toContain("Presentar Modelo 349 de 2026");
  });

  it("versions both guides and keeps direct external links on official HTTPS hosts", () => {
    for (const guide of guides) {
      expect(guide.lastVerifiedAt).toBe("2026-07-14");
      expect(guide.requiresAnnualReview).toBe(true);
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
      const content = officialContent(guide.code);
      const sources = new Map(content.sources.map((source) => [source.id, source]));
      for (const sourceId of guide.sourceIds) {
        const source = sources.get(sourceId);
        expect(source, `${guide.code}: ${sourceId}`).toBeDefined();
        expect(source?.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(source?.verificationStatus).toBe("SOURCE_HASH_CAPTURED");
      }
    }
  });

  it("publishes literal routes, exact SEO and searchable catalog concepts", () => {
    const pageSource = readFileSync(
      new URL("../../app/consultor-fiscal/modelos/[codigo]/page.tsx", import.meta.url),
      "utf8",
    );
    const catalogSource = readFileSync(
      new URL("./FiscalModelCatalogView.tsx", import.meta.url),
      "utf8",
    );
    const viewSource = readFileSync(
      new URL("./FiscalModelOfficialContentView.tsx", import.meta.url),
      "utf8",
    );
    const guideComponentSource = readFileSync(
      new URL("./FiscalModelPracticalGuide.tsx", import.meta.url),
      "utf8",
    );
    const releaseSource = readFileSync(
      new URL(
        "../../lib/fiscal-models/model-pages/official-content/batch-12-information-returns-347-349.release.v1.ts",
        import.meta.url,
      ),
      "utf8",
    );

    expect(pageSource).toContain(
      '"347": "Modelo 347 AEAT: operaciones con clientes y proveedores"',
    );
    expect(pageSource).toContain(
      '"349": "Modelo 349 AEAT: operaciones intracomunitarias"',
    );
    expect(guideComponentSource).toContain('"ec.europa.eu"');
    expect(pageSource).toContain(
      "Guía sencilla del Modelo 347: quién debe presentarlo, límite de 3.005,06 euros",
    );
    expect(pageSource).toContain(
      "Guía sencilla del Modelo 349: ROI, VIES, bienes y servicios con empresas de la UE",
    );
    for (const code of ["347", "349"] as const) {
      const page = resolvePublicAeatModelReviewPageV1({ code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY") {
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${code}`);
      }
      expect(catalogSource).toContain(`"${code}": [`);
      expect(viewSource).toContain(`content.code === "${code}"`);
    }
    for (const concept of [
      "clientes y proveedores",
      "facturas con IVA",
      "ROI",
      "VIES",
      "servicios recibidos UE",
    ]) expect(releaseSource).toContain(concept);
  });
});
