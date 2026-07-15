import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelReviewPageV1,
  resolvePublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import { MODEL_117_GUIDE_V1 } from "./model-117-guide.v1";
import { MODEL_124_GUIDE_V1 } from "./model-124-guide.v1";
import { MODEL_126_GUIDE_V1 } from "./model-126-guide.v1";
import { MODEL_128_GUIDE_V1 } from "./model-128-guide.v1";
import { MODEL_187_GUIDE_V1 } from "./model-187-guide.v1";
import { MODEL_188_GUIDE_V1 } from "./model-188-guide.v1";
import { MODEL_194_GUIDE_V1 } from "./model-194-guide.v1";
import { MODEL_196_GUIDE_V1 } from "./model-196-guide.v1";

type Code = "117" | "124" | "126" | "128" | "187" | "188" | "194" | "196";
type Guide = FiscalModelPracticalGuideV1 & { readonly code: Code };

const guides: readonly Guide[] = [
  MODEL_117_GUIDE_V1,
  MODEL_124_GUIDE_V1,
  MODEL_126_GUIDE_V1,
  MODEL_128_GUIDE_V1,
  MODEL_187_GUIDE_V1,
  MODEL_188_GUIDE_V1,
  MODEL_194_GUIDE_V1,
  MODEL_196_GUIDE_V1,
];

function officialContent(code: Code) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
  return result.data;
}

describe("specialized financial withholding guides", () => {
  it("distinguishes each periodic filing from its informative counterpart", () => {
    const pairs = [
      [MODEL_117_GUIDE_V1, "187"],
      [MODEL_124_GUIDE_V1, "194"],
      [MODEL_126_GUIDE_V1, "196"],
      [MODEL_128_GUIDE_V1, "188"],
    ] as const;

    for (const [periodic, annual] of pairs) {
      expect(periodic.comparison.related.href).toBe(
        `/consultor-fiscal/modelos/${annual}`,
      );
      expect(JSON.stringify(periodic)).toContain("no presenta");
      expect(JSON.stringify(periodic)).toContain("19 %");
    }
    for (const informative of [
      MODEL_187_GUIDE_V1,
      MODEL_188_GUIDE_V1,
      MODEL_194_GUIDE_V1,
    ]) {
      expect(JSON.stringify(informative)).toContain("Durante enero");
      expect(JSON.stringify(informative)).toContain(
        "1 de enero al 2 de febrero de 2026",
      );
      expect(JSON.stringify(informative)).toContain("no presenta");
    }
  });

  it("documents the 2026 monthly Model 196 without reusing the annual regime", () => {
    const copy = JSON.stringify(MODEL_196_GUIDE_V1);
    for (const expected of [
      "enero de 2026",
      "febrero de 2026",
      "periodo es autónomo",
      "Todas las cuentas",
      "Enero a noviembre",
      "Declaración de diciembre",
      "A0 · alta",
      "A1 · modificación",
      "A2 · baja",
      "servicio web",
      "10.000 registros",
    ]) {
      expect(copy).toContain(expected);
    }
    expect(MODEL_196_GUIDE_V1.effectiveYear).toBe(2026);
    expect(MODEL_196_GUIDE_V1.monthlyFromYear).toBe(2026);
    expect(MODEL_196_GUIDE_V1.firstMonthlyFiling).toBe("2026-02");
    expect(MODEL_196_GUIDE_V1.lastAnnualOnlyYear).toBe(2025);
    expect(MODEL_196_GUIDE_V1.faq).toHaveLength(15);
  });

  it("keeps every guide versioned, detailed and on official HTTPS hosts", () => {
    const officialHosts = new Set([
      "sede.agenciatributaria.gob.es",
      "www1.agenciatributaria.gob.es",
      "www2.agenciatributaria.gob.es",
      "www.boe.es",
    ]);
    for (const guide of guides) {
      expect(guide.lastVerifiedAt).toBe("2026-07-15");
      expect(guide.requiresAnnualReview).toBe(true);
      expect(guide.editorialCategory).toBe(
        "Retenciones e información financiera especializada",
      );
      expect(guide.faq.length).toBeGreaterThanOrEqual(12);
      expect(guide.quickFacts.length).toBeGreaterThanOrEqual(6);
      for (const link of [
        ...guide.actions,
        ...guide.officialLinks,
        ...guide.legalLinks,
      ]) {
        if (!("href" in link) || !link.href) continue;
        const url = new URL(link.href);
        expect(url.protocol, link.href).toBe("https:");
        expect(officialHosts.has(url.hostname), link.href).toBe(true);
      }
    }
  });

  it("keeps every cited source registered, hashed and verified", () => {
    for (const guide of guides) {
      const sources = new Map(
        officialContent(guide.code).sources.map((source) => [source.id, source]),
      );
      for (const sourceId of guide.sourceIds) {
        const source = sources.get(sourceId);
        expect(source, `${guide.code}: ${sourceId}`).toBeDefined();
        expect(source?.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(source?.verificationStatus).toBe("SOURCE_HASH_CAPTURED");
      }
    }
  });

  it("publishes literal routes, practical views and dedicated SEO", () => {
    const pageSource = readFileSync(
      new URL(
        "../../app/consultor-fiscal/modelos/[codigo]/page.tsx",
        import.meta.url,
      ),
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

    for (const code of guides.map((guide) => guide.code)) {
      const page = resolvePublicAeatModelReviewPageV1({ code });
      expect(page.status).toBe("REVIEW_ONLY");
      if (page.status === "REVIEW_ONLY") {
        expect(page.data.href).toBe(`/consultor-fiscal/modelos/${code}`);
      }
      expect(viewSource).toContain(`content.code === "${code}"`);
      expect(pageSource).toContain(`"${code}": "Modelo ${code} AEAT:`);
      expect(detailSource).toContain(`"${code}":`);
    }
  });

  it("only links related models through fixed internal paths", () => {
    const allowed = /^\/consultor-fiscal\/modelos\/(117|123|124|126|128|187|188|189|193|194|196|198|280)$/;
    for (const guide of guides) {
      const hrefs = [
        guide.comparison.related.href,
        ...(guide.comparison.additional?.map((item) => item.href) ?? []),
        ...guide.sections.flatMap(
          (section) => section.cards?.flatMap((card) => card.links ?? []) ?? [],
        ).map((link) => link.href),
      ];
      for (const href of hrefs) expect(href).toMatch(allowed);
    }
  });
});
