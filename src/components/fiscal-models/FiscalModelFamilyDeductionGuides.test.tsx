import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import { MODEL_121_GUIDE_V1 } from "./model-121-guide.v1";
import { MODEL_122_GUIDE_V1 } from "./model-122-guide.v1";
import { MODEL_140_GUIDE_V1 } from "./model-140-guide.v1";
import { MODEL_143_GUIDE_V1 } from "./model-143-guide.v1";

type Code = "121" | "122" | "140" | "143";
type Guide = FiscalModelPracticalGuideV1 & { readonly code: Code };

const guides: readonly Guide[] = [
  MODEL_121_GUIDE_V1,
  MODEL_122_GUIDE_V1,
  MODEL_140_GUIDE_V1,
  MODEL_143_GUIDE_V1,
];

const OFFICIAL_HOSTS = new Set([
  "sede.agenciatributaria.gob.es",
  "www1.agenciatributaria.gob.es",
  "www2.agenciatributaria.gob.es",
  "www12.agenciatributaria.gob.es",
  "www.boe.es",
]);

function officialContent(code: Code) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("Models 121, 122, 140 and 143 practical guides", () => {
  it("keeps Model 140 separate from daycare reporting and family regularization", () => {
    const copy = JSON.stringify(MODEL_140_GUIDE_V1);
    for (const expected of [
      "1.200 euros",
      "100 euros",
      "30 días",
      "150 euros",
      "1.000 euros",
      "Modelo 233",
      "15 días naturales",
      "no debe repetirse",
      "No uses el 122",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_140_GUIDE_V1.faq).toHaveLength(12);
    expect(MODEL_140_GUIDE_V1.comparison.related.href).toBe(
      "/consultor-fiscal/modelos/100",
    );
  });

  it("covers every current Model 143 family and disability category", () => {
    const copy = JSON.stringify(MODEL_143_GUIDE_V1);
    for (const expected of [
      "Familia numerosa",
      "Descendientes o ascendientes con discapacidad",
      "Ascendiente con dos hijos",
      "Cónyuge con discapacidad",
      "200 euros",
      "50 euros",
      "15 días del mes",
      "solicitud colectiva",
      "Solo puede realizarse en enero",
    ])
      expect(copy).toContain(expected);
    expect(MODEL_143_GUIDE_V1.faq).toHaveLength(12);
  });

  it("keeps Models 121 and 122 exceptional and outside normal RETA use", () => {
    const model121 = JSON.stringify(MODEL_121_GUIDE_V1);
    const model122 = JSON.stringify(MODEL_122_GUIDE_V1);
    for (const copy of [model121, model122]) {
      expect(copy).toMatch(/Desde (el ejercicio )?2023/);
      expect(copy).toContain("RETA");
      expect(copy).toContain("no está obligado");
      expect(copy).toContain("Modelo 100");
    }
    expect(model121).toContain("No se usa tras una solicitud colectiva");
    expect(model121).toContain("No incluidas");
    expect(model121).toContain("Cónyuge no separado legalmente con discapacidad");
    expect(model122).toContain("periodo anual 0A");
    expect(model122).toContain("Reconocer una deuda no concede");
    expect(model122).toContain("1.200 €");
    expect(model122).toContain("400 €");
    expect(MODEL_121_GUIDE_V1.faq).toHaveLength(10);
    expect(MODEL_122_GUIDE_V1.faq).toHaveLength(12);
  });

  it("versions every guide and restricts direct links to official HTTPS hosts", () => {
    for (const guide of guides) {
      expect(guide.effectiveYear).toBe(2026);
      expect(guide.lastVerifiedAt).toBe("2026-07-15");
      expect(guide.requiresAnnualReview).toBe(true);
      const links = [
        ...guide.actions,
        ...guide.officialLinks,
        ...guide.legalLinks,
        ...(guide.actionGroups?.flatMap((group) => group.links) ?? []),
      ];
      for (const link of links) {
        if (!("href" in link) || !link.href) continue;
        if (link.href.startsWith("/")) continue;
        const url = new URL(link.href);
        expect(url.protocol, link.href).toBe("https:");
        expect(OFFICIAL_HOSTS.has(url.hostname), link.href).toBe(true);
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

  it("publishes stable routes, dedicated SEO, subtitles and catalog labels", () => {
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
      "Modelo 121 AEAT: cesión de deducciones familiares",
      "Modelo 122 AEAT: regularización de deducciones familiares",
      "Modelo 140 AEAT: abono anticipado por maternidad",
      "Modelo 143 AEAT: abono anticipado de deducciones familiares",
    ])
      expect(pageSource).toContain(title);

    for (const code of ["121", "122", "140", "143"] as const) {
      const page = resolvePublicAeatModelReviewPageV1({ code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY")
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${code}`);
      expect(catalogSource).toContain(`"${code}": [`);
      expect(detailSource).toContain(`"${code}":`);
      expect(viewSource).toContain(`content.code === "${code}"`);
    }
    expect(catalogSource).toContain("Deducciones familiares");
  });

  it("does not store family, disability, minor or bank details", () => {
    const renderer = readFileSync(
      new URL("./FiscalModelPracticalGuide.tsx", import.meta.url),
      "utf8",
    );
    expect(renderer).not.toContain("localStorage");
    expect(renderer).not.toContain("supabase");
    expect(renderer).not.toContain("IBANInput");
    for (const guide of guides) {
      expect(JSON.stringify(guide)).not.toContain("returnTo=");
    }
  });
});
