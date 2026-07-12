import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as publicModelPagesApi from "./index";
import {
  getFiscalModelReviewPageViewV1,
  listFiscalModelReviewPageViewsV1,
  searchFiscalModelReviewPageViewsV1,
} from "./review-view-model.v1";

const EXPECTED_PATHS = {
  "036": "/consultor-fiscal/modelos/036",
  "037": "/consultor-fiscal/modelos/037",
  "303": "/consultor-fiscal/modelos/303",
} as const;

const EXPECTED_REASONS = [
  "DRAFT_RELEASE",
  "PAGE_UNPUBLISHED",
  "PAGE_REVIEW_REQUIRED",
  "MODEL_REVIEW_REQUIRED",
  "SOURCE_HASH_PENDING",
  "SOURCE_REVIEW_REQUIRED",
] as const;

describe("fiscal model review page view model v1", () => {
  it("projects only the three reviewed routes as REVIEW_ONLY with null descriptor href", () => {
    const result = listFiscalModelReviewPageViewsV1();

    expect(result.status).toBe("REVIEW_ONLY");
    if (result.status !== "REVIEW_ONLY") return;
    expect(result.data.map((page) => page.code)).toEqual(["036", "037", "303"]);

    for (const page of result.data) {
      expect(page.reviewPagePath).toBe(EXPECTED_PATHS[page.code]);
      expect(page.descriptorHref).toBeNull();
      expect(page).toMatchObject({
        publicationStatus: "UNPUBLISHED",
        contentReviewStatus: "PENDING_REVIEW",
        reviewBadge: "Información en revisión",
        reviewTitle: "Contenido pendiente de revisión fiscal",
        reasons: EXPECTED_REASONS,
      });
      expect(page.reviewMessage).toContain(
        "la verificación de contenido y la revisión fiscal continúan pendientes",
      );
      expect(page.limitations).toBe(
        "No calcula casillas ni importes y no permite presentar, firmar, pagar ni enviar declaraciones.",
      );
      expect(page.linkNotice).toContain("permanece bloqueado");
    }
  });

  it("keeps 037 historical and never infers a replacement", () => {
    const result = getFiscalModelReviewPageViewV1({ code: "037" });

    expect(result.status).toBe("REVIEW_ONLY");
    if (result.status !== "REVIEW_ONLY") return;
    expect(result.data).toMatchObject({
      code: "037",
      contentLevel: "HISTORICAL_INFO_ONLY",
      lifecycleStatus: "HISTORICAL",
      modelAvailability: "HISTORICAL_ONLY",
      effectiveTo: "2025-02-02",
      descriptorHref: null,
      historicalNotice:
        "Modelo histórico · no vigente. Esta ficha no permite tramitar el modelo 037 ni lo ofrece como opción actual.",
    });
    expect(result.data).not.toHaveProperty("replacementModel");
    expect(JSON.stringify(result.data)).not.toMatch(
      /sustituid[oa]|reemplazad[oa]/i,
    );
  });

  it("keeps 036 and 303 metadata-only and under the exact pending state", () => {
    for (const code of ["036", "303"] as const) {
      const result = getFiscalModelReviewPageViewV1({ code });
      expect(result.status).toBe("REVIEW_ONLY");
      if (result.status !== "REVIEW_ONLY") continue;
      expect(result.data).toMatchObject({
        code,
        contentLevel: "METADATA_ONLY",
        lifecycleStatus: "ACTIVE",
        modelAvailability: "METADATA_ONLY",
        effectiveTo: null,
        historicalNotice: null,
        descriptorHref: null,
      });
    }
  });

  it("blocks uncatalogued and malformed codes without leaking a route", () => {
    for (const code of ["130", "349", "999", "000"]) {
      expect(getFiscalModelReviewPageViewV1({ code })).toEqual({
        status: "BLOCKED",
        reason: "MODEL_NOT_FOUND",
        descriptorHref: null,
      });
    }

    for (const input of [
      null,
      undefined,
      {},
      [],
      { code: 36 },
      { code: "036 " },
      { code: "０３６" },
      { code: "036", extra: true },
      Object.create({ code: "036" }),
    ]) {
      expect(getFiscalModelReviewPageViewV1(input)).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
        descriptorHref: null,
      });
    }
  });

  it("exposes only allowlisted official references with visibly pending review", () => {
    const result = listFiscalModelReviewPageViewsV1();
    expect(result.status).toBe("REVIEW_ONLY");
    if (result.status !== "REVIEW_ONLY") return;

    for (const page of result.data) {
      expect(page.sources.length).toBeGreaterThan(0);
      for (const source of page.sources) {
        const url = new URL(source.externalHref);
        expect(url.protocol).toBe("https:");
        expect(["sede.agenciatributaria.gob.es", "www.boe.es"]).toContain(
          url.hostname,
        );
        expect(source).toMatchObject({
          verificationStatus: "HASH_PENDING",
          reviewStatus: "PENDING_REVIEW",
          verificationLabel: "Verificación de contenido pendiente",
          reviewLabel: "Revisión fiscal pendiente",
        });
        expect(source).not.toHaveProperty("contentHash");
        expect(source).not.toHaveProperty("verifiedAt");
        expect(source).not.toHaveProperty("contentVersion");
      }
    }
  });

  it("preserves complete per-field provenance without upgrading review", () => {
    const result = listFiscalModelReviewPageViewsV1();
    expect(result.status).toBe("REVIEW_ONLY");
    if (result.status !== "REVIEW_ONLY") return;

    const expectedFields = [
      "canonicalName",
      "contentLevel",
      "effectiveTo",
      "lifecycleStatus",
      "modelAvailability",
      "summary",
    ];
    for (const page of result.data) {
      expect(page.provenance.map((entry) => entry.field).sort()).toEqual(
        expectedFields,
      );
      expect(
        page.provenance.every(
          (entry) => entry.reviewStatus === "PENDING_REVIEW",
        ),
      ).toBe(true);
    }
  });

  it("searches locally by one exact bounded code and never creates fallbacks", () => {
    const all = searchFiscalModelReviewPageViewsV1({});
    expect(all.status).toBe("REVIEW_ONLY");
    if (all.status === "REVIEW_ONLY") {
      expect(all.match).toBe("ALL");
      expect(all.query).toBeNull();
      expect(all.data).toHaveLength(3);
    }

    const exact = searchFiscalModelReviewPageViewsV1({ modelo: "036" });
    expect(exact.status).toBe("REVIEW_ONLY");
    if (exact.status === "REVIEW_ONLY") {
      expect(exact.match).toBe("EXACT");
      expect(exact.data.map((page) => page.code)).toEqual(["036"]);
    }

    for (const modelo of ["130", "349", "999"]) {
      const missing = searchFiscalModelReviewPageViewsV1({ modelo });
      expect(missing.status).toBe("REVIEW_ONLY");
      if (missing.status === "REVIEW_ONLY") {
        expect(missing).toMatchObject({ query: modelo, match: "NO_MATCH" });
        expect(missing.data).toEqual([]);
      }
    }
  });

  it("rejects decorated, repeated, inherited, accessor, and extra search inputs", () => {
    let getterCalls = 0;
    const accessor = {};
    Object.defineProperty(accessor, "modelo", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return "036";
      },
    });

    for (const input of [
      null,
      undefined,
      [],
      { modelo: ["036", "303"] },
      { modelo: 36 },
      { modelo: "36" },
      { modelo: " 036" },
      { modelo: "036\n" },
      { modelo: "０３６" },
      { modelo: "036", extra: true },
      { [Symbol("extra")]: true },
      Object.create({ modelo: "036" }),
      accessor,
    ]) {
      expect(searchFiscalModelReviewPageViewsV1(input)).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
      });
    }
    expect(getterCalls).toBe(0);
  });

  it("returns fresh deeply frozen copies that consumer mutation cannot corrupt", () => {
    const first = getFiscalModelReviewPageViewV1({ code: "036" });
    const second = getFiscalModelReviewPageViewV1({ code: "036" });
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    if (first.status !== "REVIEW_ONLY" || second.status !== "REVIEW_ONLY") {
      return;
    }

    expect(first.data).not.toBe(second.data);
    expect(first.data.sources).not.toBe(second.data.sources);
    expect(first.data.provenance).not.toBe(second.data.provenance);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.data)).toBe(true);
    expect(Object.isFrozen(first.data.sources)).toBe(true);
    expect(Object.isFrozen(first.data.sources[0])).toBe(true);
    expect(Object.isFrozen(first.data.provenance)).toBe(true);
    expect(Object.isFrozen(first.data.provenance[0])).toBe(true);
    expect(Object.isFrozen(first.data.reasons)).toBe(true);
    expect(() => {
      (first.data as { canonicalName: string }).canonicalName = "Manipulado";
    }).toThrow(TypeError);

    const third = getFiscalModelReviewPageViewV1({ code: "036" });
    expect(third.status).toBe("REVIEW_ONLY");
    if (third.status === "REVIEW_ONLY") {
      expect(third.data.canonicalName).not.toBe("Manipulado");
    }
  });

  it("keeps the review adapter private, pure, and free of fiscal actions", () => {
    expect(publicModelPagesApi).not.toHaveProperty(
      "getFiscalModelReviewPageViewV1",
    );
    expect(publicModelPagesApi).not.toHaveProperty(
      "listFiscalModelReviewPageViewsV1",
    );

    const source = readFileSync(
      new URL("./review-view-model.v1.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain('result.status === "AVAILABLE"');
    expect(source).toContain("UNEXPECTED_AVAILABLE_DESCRIPTOR");
    expect(source).not.toMatch(/\/modelos\/\$\{/);
    expect(source).toContain(
      "descriptor.canonicalPath !== REVIEW_PAGE_PATH_BY_CODE[descriptor.code]",
    );
    expect(source).not.toMatch(/\bfetch\s*\(|Date\.now|process\.env/);
    expect(source).not.toMatch(
      /localStorage|sessionStorage|supabase|stripe|openai|anthropic/i,
    );
    expect(source).not.toMatch(
      /fiscal-calendar|fiscal-notifications|AppStore|tax-engine|taxes\.ts/i,
    );

    const result = listFiscalModelReviewPageViewsV1();
    expect(result.status).toBe("REVIEW_ONLY");
    if (result.status === "REVIEW_ONLY") {
      const visible = JSON.stringify(result.data);
      expect(visible).not.toMatch(/\b(?:AVAILABLE|CURRENT)\b/);
      expect(visible).not.toMatch(/fuente verificada/i);
    }
  });
});
