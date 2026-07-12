import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  listOfficialAeatModelInventoryV1,
  getOfficialAeatModelInventoryV1,
} from "../inventory/index.v1";
import {
  listPublicAeatModelReviewPagesV1,
  resolvePublicAeatModelCalendarCatalogContextV1,
  resolvePublicAeatModelCalendarDetailContextV1,
  resolvePublicAeatModelCalendarNavigationV1,
  resolvePublicAeatModelReviewPageV1,
  searchPublicAeatModelReviewPagesV1,
} from "./public-review-catalog.v1";
import {
  isPublicAeatModelReviewPathV1,
  PUBLIC_AEAT_MODEL_REVIEW_CODES_V1,
  PUBLIC_AEAT_MODEL_REVIEW_PATHS_V1,
  PUBLIC_AEAT_MODEL_REVIEW_ROUTES_V1,
  PUBLIC_AEAT_MODEL_REVIEW_ROUTE_RELEASE_V1,
  resolvePublicAeatModelReviewPathV1,
} from "./public-review-route-manifest.v1";

describe("public AEAT model review catalog v1", () => {
  it("matches the 228 official identifiers plus the historical 037 exactly", () => {
    const inventory = listOfficialAeatModelInventoryV1();
    expect(inventory.status).toBe("REVIEW_ONLY");
    if (inventory.status !== "REVIEW_ONLY") return;

    const officialCodes = inventory.data.map((record) => record.code);
    const insertAt = officialCodes.indexOf("036") + 1;
    const expectedCodes = [
      ...officialCodes.slice(0, insertAt),
      "037",
      ...officialCodes.slice(insertAt),
    ];

    expect(PUBLIC_AEAT_MODEL_REVIEW_ROUTE_RELEASE_V1).toMatchObject({
      id: "public-aeat-model-review-routes.2026-07-12.v1",
      inventoryReleaseId: "aeat-declarations-by-model-2026-07-08.v1",
      routeDeploymentStatus: "DEPLOYED",
      reviewStatus: "PENDING_REVIEW",
      routeCount: 229,
    });
    expect(PUBLIC_AEAT_MODEL_REVIEW_ROUTES_V1).toHaveLength(229);
    expect(PUBLIC_AEAT_MODEL_REVIEW_CODES_V1).toEqual(expectedCodes);
    expect(new Set(PUBLIC_AEAT_MODEL_REVIEW_CODES_V1).size).toBe(229);
    expect(new Set(PUBLIC_AEAT_MODEL_REVIEW_PATHS_V1).size).toBe(229);
    for (const route of PUBLIC_AEAT_MODEL_REVIEW_ROUTES_V1) {
      expect(route.path, route.code).toBe(
        "/consultor-fiscal/modelos/" + route.code,
      );
    }
    expect(
      PUBLIC_AEAT_MODEL_REVIEW_CODES_V1.filter((code) => code === "037"),
    ).toEqual(["037"]);
    expect(getOfficialAeatModelInventoryV1({ code: "037" })).toEqual({
      status: "BLOCKED",
      reason: "MODEL_NOT_FOUND",
    });
  });

  it("resolves only literal deployed routes without constructing from input", () => {
    for (const code of ["01", "01C", "036", "037", "130", "349", "A22", "A24"]) {
      const result = resolvePublicAeatModelReviewPageV1({ code });
      expect(result.status, code).toBe("REVIEW_ONLY");
      if (result.status !== "REVIEW_ONLY") continue;
      expect(result).toMatchObject({
        href: "/consultor-fiscal/modelos/" + code,
        data: {
          code,
          href: "/consultor-fiscal/modelos/" + code,
          reviewPagePath: "/consultor-fiscal/modelos/" + code,
          routeDeploymentStatus: "DEPLOYED",
          contentReviewStatus: "PENDING_REVIEW",
          fiscalReviewStatus: "PENDING_REVIEW",
        },
      });
      expect(resolvePublicAeatModelReviewPathV1(code)).toBe(result.href);
      expect(isPublicAeatModelReviewPathV1(result.href)).toBe(true);
    }

    for (const code of ["000", "601", "999", "A25", "99X"]) {
      expect(resolvePublicAeatModelReviewPageV1({ code })).toEqual({
        status: "BLOCKED",
        reason: "MODEL_NOT_FOUND",
        href: null,
      });
      expect(resolvePublicAeatModelReviewPathV1(code)).toBeNull();
    }
  });

  it("keeps every deployed page in review and avoids inferred validity", () => {
    const catalog = listPublicAeatModelReviewPagesV1();
    expect(catalog.status).toBe("REVIEW_ONLY");
    if (catalog.status !== "REVIEW_ONLY") return;

    expect(catalog.data).toHaveLength(229);
    expect(catalog.data.map((page) => page.code)).toEqual(
      PUBLIC_AEAT_MODEL_REVIEW_CODES_V1,
    );
    expect(catalog.data.map((page) => page.href)).toEqual(
      PUBLIC_AEAT_MODEL_REVIEW_PATHS_V1,
    );

    for (const page of catalog.data) {
      expect(page).toMatchObject({
        routeDeploymentStatus: "DEPLOYED",
        contentReviewStatus: "PENDING_REVIEW",
        fiscalReviewStatus: "PENDING_REVIEW",
      });
      expect(page).not.toHaveProperty("obligations");
      expect(page).not.toHaveProperty("deadlines");
      expect(page).not.toHaveProperty("amounts");
      expect(page).not.toHaveProperty("boxes");
      expect(page).not.toHaveProperty("filingHref");
      expect(page).not.toHaveProperty("officialProcedureHref");
    }

    const historical = catalog.data.find((page) => page.code === "037");
    expect(historical).toMatchObject({
      kind: "HISTORICAL_FOUNDATION",
      lifecycleStatus: "HISTORICAL",
      validityStatus: "HISTORICAL_RECORDED",
      contentLevel: "HISTORICAL_INFO_ONLY",
      effectiveTo: "2025-02-02",
    });
    expect(historical?.historicalNotice).toContain("no vigente");

    for (const page of catalog.data.filter((item) => item.code !== "037")) {
      expect(page).toMatchObject({
        kind: "OFFICIAL_INDEX",
        lifecycleStatus: "UNDETERMINED",
        validityStatus: "SOURCE_PENDING",
        contentLevel: "STRUCTURAL_INDEX_ONLY",
        effectiveTo: null,
        historicalNotice: null,
      });
    }
  });

  it("exposes an exhaustive immutable Calendar navigation descriptor without deriving consumer hrefs", () => {
    const catalog = listPublicAeatModelReviewPagesV1();
    expect(catalog.status).toBe("REVIEW_ONLY");
    if (catalog.status !== "REVIEW_ONLY") return;

    expect(catalog.data).toHaveLength(229);
    for (const page of catalog.data) {
      expect(page.catalogCardId, page.code).toBe(`modelo-${page.code}`);

      const first = resolvePublicAeatModelCalendarNavigationV1({
        code: page.code,
      });
      const second = resolvePublicAeatModelCalendarNavigationV1({
        code: page.code,
      });
      expect(first.status, page.code).toBe("REVIEW_ONLY");
      expect(second.status, page.code).toBe("REVIEW_ONLY");
      if (first.status !== "REVIEW_ONLY" || second.status !== "REVIEW_ONLY") {
        continue;
      }

      const expectedCatalogFocusHref =
        `/consultor-fiscal/modelos?origen=calendario&foco=${page.code}` +
        `#modelo-${page.code}`;
      const expectedDetailHref = `${page.href}?origen=calendario`;
      expect(first).toEqual({
        status: "REVIEW_ONLY",
        data: {
          code: page.code,
          origin: "FISCAL_CALENDAR",
          originQueryValue: "calendario",
          routeDeploymentStatus: "DEPLOYED",
          catalogCardId: `modelo-${page.code}`,
          catalogFocusHref: expectedCatalogFocusHref,
          detailHref: expectedDetailHref,
          returnHref: "/consultor-fiscal/calendario",
        },
        catalogFocusHref: expectedCatalogFocusHref,
        detailHref: expectedDetailHref,
      });
      expect(second).toEqual(first);
      expect(second).not.toBe(first);
      expect(second.data).not.toBe(first.data);
      expect(Object.isFrozen(first)).toBe(true);
      expect(Object.isFrozen(first.data)).toBe(true);
    }

    expect(
      new Set(catalog.data.map((page) => page.catalogCardId)).size,
    ).toBe(229);
  });

  it("fails Calendar navigation closed for unknown, coerced, decorated, and accessor inputs", () => {
    for (const code of ["000", "601", "999", "A25", "99X"]) {
      expect(resolvePublicAeatModelCalendarNavigationV1({ code })).toEqual({
        status: "BLOCKED",
        reason: "MODEL_NOT_FOUND",
        catalogFocusHref: null,
        detailHref: null,
      });
    }

    let getterCalls = 0;
    const accessor = {};
    Object.defineProperty(accessor, "code", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return "130";
      },
    });

    for (const input of [
      null,
      undefined,
      [],
      {},
      { code: 130 },
      { code: ["130"] },
      { code: "130", extra: true },
      { code: "130", returnTo: "/evil" },
      { code: "130 " },
      { code: "130/extra" },
      { code: "01c" },
      Object.create({ code: "130" }),
      accessor,
    ]) {
      expect(resolvePublicAeatModelCalendarNavigationV1(input)).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
        catalogFocusHref: null,
        detailHref: null,
      });
    }
    expect(getterCalls).toBe(0);
  });

  it("accepts only the exact Calendar catalog origin and ignores manipulated context", () => {
    for (const code of PUBLIC_AEAT_MODEL_REVIEW_CODES_V1) {
      for (const input of [
        { origen: "calendario", foco: code },
        { modelo: "", origen: "calendario", foco: code },
      ]) {
        const result = resolvePublicAeatModelCalendarCatalogContextV1(input);
        expect(result.status, code).toBe("FROM_CALENDAR");
        if (result.status !== "FROM_CALENDAR") continue;
        expect(result.data).toMatchObject({
          code,
          origin: "FISCAL_CALENDAR",
          catalogCardId: `modelo-${code}`,
          catalogFocusHref:
            `/consultor-fiscal/modelos?origen=calendario&foco=${code}` +
            `#modelo-${code}`,
          detailHref: `/consultor-fiscal/modelos/${code}?origen=calendario`,
          returnHref: "/consultor-fiscal/calendario",
        });
        expect(Object.isFrozen(result)).toBe(true);
        expect(Object.isFrozen(result.data)).toBe(true);
      }
    }

    for (const input of [
      null,
      undefined,
      [],
      {},
      { origen: "calendario" },
      { foco: "130" },
      { origen: ["calendario"], foco: "130" },
      { origen: "FISCAL_CALENDAR", foco: "130" },
      { origen: "calendario", foco: ["130"] },
      { origen: "calendario", foco: "130", extra: true },
      { origen: "calendario", foco: "130", returnTo: "/evil" },
      { modelo: "IVA", origen: "calendario", foco: "130" },
      { modelo: [""], origen: "calendario", foco: "130" },
      { origen: "calendario", foco: "999" },
      { origen: "calendario", foco: "130 " },
      Object.create({ origen: "calendario", foco: "130" }),
    ]) {
      expect(resolvePublicAeatModelCalendarCatalogContextV1(input)).toEqual({
        status: "DIRECT",
        data: null,
      });
    }
  });

  it("propagates only the fixed Calendar origin to detail pages", () => {
    for (const code of PUBLIC_AEAT_MODEL_REVIEW_CODES_V1) {
      const result = resolvePublicAeatModelCalendarDetailContextV1({
        code,
        searchParams: { origen: "calendario" },
      });
      expect(result.status, code).toBe("FROM_CALENDAR");
      if (result.status !== "FROM_CALENDAR") continue;
      expect(result.data).toMatchObject({
        code,
        origin: "FISCAL_CALENDAR",
        detailHref: `/consultor-fiscal/modelos/${code}?origen=calendario`,
        returnHref: "/consultor-fiscal/calendario",
      });
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.data)).toBe(true);
    }

    for (const input of [
      null,
      undefined,
      [],
      {},
      { code: "130" },
      { code: ["130"], searchParams: { origen: "calendario" } },
      { code: "999", searchParams: { origen: "calendario" } },
      { code: "130 ", searchParams: { origen: "calendario" } },
      { code: "130", searchParams: null },
      { code: "130", searchParams: [] },
      { code: "130", searchParams: {} },
      { code: "130", searchParams: { origen: ["calendario"] } },
      { code: "130", searchParams: { origen: "FISCAL_CALENDAR" } },
      {
        code: "130",
        searchParams: { origen: "calendario", returnTo: "/evil" },
      },
      {
        code: "130",
        searchParams: { origen: "calendario" },
        returnTo: "/evil",
      },
      Object.create({
        code: "130",
        searchParams: { origen: "calendario" },
      }),
    ]) {
      expect(resolvePublicAeatModelCalendarDetailContextV1(input)).toEqual({
        status: "DIRECT",
        data: null,
      });
    }
  });

  it("returns fresh Calendar descriptors that consumer mutation cannot corrupt", () => {
    const first = resolvePublicAeatModelCalendarNavigationV1({ code: "130" });
    const context = resolvePublicAeatModelCalendarCatalogContextV1({
      origen: "calendario",
      foco: "130",
    });
    expect(first.status).toBe("REVIEW_ONLY");
    expect(context.status).toBe("FROM_CALENDAR");
    if (first.status !== "REVIEW_ONLY" || context.status !== "FROM_CALENDAR") {
      return;
    }

    expect(() => {
      (first.data as unknown as { returnHref: string }).returnHref = "/evil";
    }).toThrow(TypeError);
    expect(() => {
      (context.data as unknown as { catalogCardId: string }).catalogCardId =
        "modelo-999";
    }).toThrow(TypeError);

    const after = resolvePublicAeatModelCalendarNavigationV1({ code: "130" });
    expect(after).toEqual(first);
    expect(after).not.toBe(first);
    if (after.status === "REVIEW_ONLY") {
      expect(after.data).not.toBe(first.data);
    }
  });

  it("supports exact bounded local search and explicit no-match results", () => {
    const all = searchPublicAeatModelReviewPagesV1({});
    expect(all.status).toBe("REVIEW_ONLY");
    if (all.status === "REVIEW_ONLY") {
      expect(all).toMatchObject({ query: null, match: "ALL" });
      expect(all.data).toHaveLength(229);
    }

    for (const code of ["01", "01C", "037", "130", "349", "A22"]) {
      const result = searchPublicAeatModelReviewPagesV1({ modelo: code });
      expect(result.status, code).toBe("REVIEW_ONLY");
      if (result.status !== "REVIEW_ONLY") continue;
      expect(result).toMatchObject({
        query: code,
        match: "EXACT",
        data: [{ code, href: "/consultor-fiscal/modelos/" + code }],
      });
    }

    expect(searchPublicAeatModelReviewPagesV1({ modelo: "999" })).toEqual({
      status: "REVIEW_ONLY",
      data: [],
      query: "999",
      match: "NO_MATCH",
    });
  });

  it("blocks malformed, coerced, decorated, and accessor inputs", () => {
    for (const code of [
      "01c",
      "a22",
      "036 ",
      " 036",
      "036\n",
      "０３６",
      "1",
      "1234",
      "036/extra",
    ]) {
      expect(resolvePublicAeatModelReviewPageV1({ code })).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
        href: null,
      });
    }

    let getterCalls = 0;
    const accessor = {};
    Object.defineProperty(accessor, "code", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return "130";
      },
    });

    for (const input of [
      null,
      undefined,
      [],
      {},
      { code: 130 },
      { code: "130", extra: true },
      Object.create({ code: "130" }),
      { [Symbol("code")]: "130" },
      accessor,
    ]) {
      expect(resolvePublicAeatModelReviewPageV1(input)).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
        href: null,
      });
    }
    expect(getterCalls).toBe(0);

    for (const input of [
      { modelo: "01c" },
      { modelo: ["130"] },
      { modelo: "130", extra: true },
    ]) {
      expect(searchPublicAeatModelReviewPagesV1(input)).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
      });
    }
  });

  it("exposes only allowlisted official references as informational metadata", () => {
    const catalog = listPublicAeatModelReviewPagesV1();
    expect(catalog.status).toBe("REVIEW_ONLY");
    if (catalog.status !== "REVIEW_ONLY") return;

    for (const page of catalog.data) {
      expect(page.sources.length, page.code).toBeGreaterThan(0);
      for (const source of page.sources) {
        const url = new URL(source.canonicalUrl);
        expect(url.protocol, page.code).toBe("https:");
        expect(
          ["sede.agenciatributaria.gob.es", "www.boe.es"],
          page.code,
        ).toContain(url.hostname);
        expect(url.port, page.code).toBe("");
        expect(url.username, page.code).toBe("");
        expect(url.password, page.code).toBe("");
        expect(source.reviewStatus, page.code).toBe("PENDING_REVIEW");
      }
    }

    const model130 = resolvePublicAeatModelReviewPageV1({ code: "130" });
    expect(model130.status).toBe("REVIEW_ONLY");
    if (model130.status === "REVIEW_ONLY") {
      expect(model130.data.sources).toEqual([
        expect.objectContaining({
          canonicalUrl:
            "https://sede.agenciatributaria.gob.es/Sede/presentar-consultar-declaraciones-modelo.html",
          verificationStatus: "SOURCE_HASH_CAPTURED",
          reviewStatus: "PENDING_REVIEW",
        }),
      ]);
    }
  });

  it("returns fresh deeply frozen values that consumers cannot corrupt", () => {
    const first = listPublicAeatModelReviewPagesV1();
    const second = listPublicAeatModelReviewPagesV1();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    if (first.status !== "REVIEW_ONLY" || second.status !== "REVIEW_ONLY") {
      return;
    }

    expect(first.data).not.toBe(second.data);
    expect(first.data[0]).not.toBe(second.data[0]);
    expect(first.data[0]?.sources).not.toBe(second.data[0]?.sources);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.data)).toBe(true);
    expect(Object.isFrozen(first.data[0])).toBe(true);
    expect(Object.isFrozen(first.data[0]?.sources)).toBe(true);
    expect(Object.isFrozen(first.data[0]?.sources[0])).toBe(true);
    expect(Object.isFrozen(PUBLIC_AEAT_MODEL_REVIEW_ROUTES_V1)).toBe(true);
    expect(Object.isFrozen(PUBLIC_AEAT_MODEL_REVIEW_ROUTES_V1[0])).toBe(true);
    expect(Object.isFrozen(PUBLIC_AEAT_MODEL_REVIEW_CODES_V1)).toBe(true);
    expect(Object.isFrozen(PUBLIC_AEAT_MODEL_REVIEW_PATHS_V1)).toBe(true);

    expect(() => {
      (first.data as unknown as unknown[]).push({});
    }).toThrow(TypeError);
    expect(() => {
      (first.data[0]?.sources as unknown as unknown[]).push({});
    }).toThrow(TypeError);
    expect(listPublicAeatModelReviewPagesV1()).toEqual(second);
  });

  it("stays deterministic, local, Edge-safe, and isolated", () => {
    const manifest = readFileSync(
      new URL("./public-review-route-manifest.v1.ts", import.meta.url),
      "utf8",
    );
    const catalog = readFileSync(
      new URL("./public-review-catalog.v1.ts", import.meta.url),
      "utf8",
    );
    const production = manifest + "\n" + catalog;

    expect(manifest.match(/path: "\/consultor-fiscal\/modelos\//g)).toHaveLength(
      229,
    );
    expect(manifest).not.toMatch(/\.\.\/inventory|official-aeat-index|fetch|node:/);
    expect(catalog).not.toMatch(/\/modelos\/\$\{/);
    expect(production).not.toMatch(/\bfetch\s*\(|Date\.now|process\.env/);
    expect(production).not.toMatch(
      /node:fs|localStorage|sessionStorage|supabase|stripe|openai|anthropic/i,
    );
    expect(production).not.toMatch(
      /fiscal-calendar|fiscal-notifications|AppStore|BusinessProfile|tax-engine|taxes\.ts|verifactu/i,
    );
    expect(production).not.toMatch(/\b(?:AVAILABLE|CURRENT|APPROVED)\b/);
  });
});
