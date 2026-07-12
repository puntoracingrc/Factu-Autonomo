import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  listPublicAeatModelReviewPagesV1,
  resolvePublicAeatModelCalendarNavigationV1,
  searchPublicAeatModelReviewPagesV2,
} from "./public-review-catalog.v1";
import {
  createPublicAeatModelSearchEntryWithTermsV2,
  filterPublicAeatModelSearchEntriesV2,
} from "./public-review-search.v2";
import { resolvePublicAeatModelContentV1 } from "./model-01-content.v1";

const EXPECTED_OFFICIAL_URLS = [
  "https://sede.agenciatributaria.gob.es/Sede/presentar-consultar-declaraciones-modelo.html",
  "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G304.shtml",
  "https://sede.agenciatributaria.gob.es/Sede/certificaciones/situacion-tributaria/certificados-trib_____os-estar-corriente-obligaciones-tributarias/que-certifica.html",
  "https://sede.agenciatributaria.gob.es/Sede/certificaciones/situacion-tributaria/certificados-trib_____os-estar-corriente-obligaciones-tributarias/se-obtiene.html",
  "https://sede.agenciatributaria.gob.es/Sede/certificaciones/situacion-tributaria/certificados-trib_____os-estar-corriente-obligaciones-tributarias/descarga-modelo.html",
  "https://sede.agenciatributaria.gob.es/Sede/certificaciones/situacion-tributaria/certificados-trib_____os-estar-corriente-obligaciones-tributarias/preguntas-frecuentes.html",
  "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G304.shtml",
  "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/Certificados/mod01_es_ES.pdf",
  "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/Certificados/instr_mod01.pdf",
  "https://sede.agenciatributaria.gob.es/Sede/mi-area-personal.html",
  "https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984&tn=1#a70",
] as const;

function expectDeepFrozen(value: unknown): void {
  if (!value || typeof value !== "object") return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    expectDeepFrozen(nested);
  }
}

describe("public AEAT Model 01 reviewed content v1", () => {
  it("resolves only the exact Model 01 input and fails closed", () => {
    const resolved = resolvePublicAeatModelContentV1({ code: "01" });
    expect(resolved.status).toBe("REVIEW_ONLY");
    if (resolved.status !== "REVIEW_ONLY") return;
    expect(resolved.data).toMatchObject({
      schemaVersion: "public-aeat-model-content.v1",
      releaseId: "public-aeat-model-01-content.2026-07-13.v1",
      code: "01",
      contentStatus: "REVIEW_ONLY",
      fiscalReviewStatus: "PENDING_REVIEW",
      lifecycleStatus: "UNDETERMINED",
      verifiedOn: "2026-07-13",
    });

    expect(resolvePublicAeatModelContentV1({ code: "01C" })).toEqual({
      status: "BLOCKED",
      reason: "MODEL_CONTENT_NOT_FOUND",
    });
    expect(resolvePublicAeatModelContentV1({ code: "130" })).toEqual({
      status: "BLOCKED",
      reason: "MODEL_CONTENT_NOT_FOUND",
    });
    for (const input of [
      null,
      undefined,
      "01",
      1,
      [],
      {},
      { code: 1 },
      { code: "1" },
      { code: "01 " },
      { code: "01", extra: true },
      Object.create({ code: "01" }),
    ]) {
      expect(resolvePublicAeatModelContentV1(input)).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
      });
    }

    let getterCalls = 0;
    const accessor = Object.defineProperty({}, "code", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "01";
      },
    });
    expect(resolvePublicAeatModelContentV1(accessor)).toEqual({
      status: "BLOCKED",
      reason: "INVALID_INPUT",
    });
    expect(getterCalls).toBe(0);
  });

  it("keeps a literal allowlisted source inventory and pending fiscal review", () => {
    const resolved = resolvePublicAeatModelContentV1({ code: "01" });
    expect(resolved.status).toBe("REVIEW_ONLY");
    if (resolved.status !== "REVIEW_ONLY") return;

    expect(resolved.data.sources.map((source) => source.canonicalUrl)).toEqual(
      EXPECTED_OFFICIAL_URLS,
    );
    expect(new Set(resolved.data.sources.map((source) => source.id)).size).toBe(
      resolved.data.sources.length,
    );
    for (const source of resolved.data.sources) {
      const url = new URL(source.canonicalUrl);
      expect(url.protocol).toBe("https:");
      expect(url.username).toBe("");
      expect(url.password).toBe("");
      expect(url.port).toBe("");
      expect([
        "sede.agenciatributaria.gob.es",
        "www.boe.es",
      ]).toContain(url.hostname);
      expect(source.reviewStatus).toBe("PENDING_REVIEW");
    }
    expect(resolved.data.facts.every((fact) => fact.reviewStatus === "PENDING_REVIEW")).toBe(true);
    expect(resolved.data.legalReferences[0]).toMatchObject({
      boeId: "BOE-A-2007-15984",
      coherenceStatus: "SOURCE_SCOPE_DIFFERS_PENDING_REVIEW",
      consolidatedTextStatus: "INFORMATIVE_CONSOLIDATION",
      reviewStatus: "PENDING_REVIEW",
    });
  });

  it("records exact official PDF artifacts without serving or embedding them", () => {
    const resolved = resolvePublicAeatModelContentV1({ code: "01" });
    expect(resolved.status).toBe("REVIEW_ONLY");
    if (resolved.status !== "REVIEW_ONLY") return;

    expect(resolved.data.documents).toEqual([
      expect.objectContaining({
        id: "model-01-form",
        fileName: "mod01_es_ES.pdf",
        byteLength: 322139,
        pageCount: 2,
        sha256:
          "d3cf04259bca029b43bc7f92df9ff3ad07f112cd05fe612659c4fbdf44ee32c2",
        activeContentStatus: "JAVASCRIPT_PRESENT",
        freshnessStatus: "CURRENTNESS_UNDETERMINED",
        usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
      }),
      expect.objectContaining({
        id: "model-01-instructions",
        fileName: "instr_mod01.pdf",
        byteLength: 56614,
        pageCount: 1,
        sha256:
          "b06ee06058f3804d9b10c70fe24fcc57cb777ebc2aa226ac949544ad608cb6d2",
        activeContentStatus: "NO_JAVASCRIPT_DETECTED",
        freshnessStatus: "LEGACY_REFERENCES_DETECTED",
        usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
      }),
    ]);
    expect(
      resolved.data.documents.every((document) =>
        document.officialUrl.startsWith(
          "https://sede.agenciatributaria.gob.es/",
        ),
      ),
    ).toBe(true);
  });

  it("locks the inert 640 square preview to the verified form PDF", () => {
    const resolved = resolvePublicAeatModelContentV1({ code: "01" });
    expect(resolved.status).toBe("REVIEW_ONLY");
    if (resolved.status !== "REVIEW_ONLY") return;
    const preview = resolved.data.thumbnail;
    expect(preview).toMatchObject({
      sourcePdfId: "model-01-form",
      publicHref:
        "/fiscal-models/modelo-01/formulario-modelo-01-preview.png",
      width: 640,
      height: 640,
      pageNumber: 1,
      cropVariant: "HEADER_AND_FORM_START",
      sha256:
        "205665d686f3fd00bbfc9ae7c80935f9d3da4696e44c703d74dea79e02fac873",
    });

    const asset = readFileSync(
      resolve(
        process.cwd(),
        "public/fiscal-models/modelo-01/formulario-modelo-01-preview.png",
      ),
    );
    expect(asset.byteLength).toBe(121595);
    expect(asset.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(asset.subarray(12, 16).toString("ascii")).toBe("IHDR");
    expect(asset.readUInt32BE(16)).toBe(640);
    expect(asset.readUInt32BE(20)).toBe(640);
    expect(createHash("sha256").update(asset).digest("hex")).toBe(
      preview.sha256,
    );
  });

  it("returns deeply immutable content without changing catalog or Calendar links", () => {
    const first = resolvePublicAeatModelContentV1({ code: "01" });
    const second = resolvePublicAeatModelContentV1({ code: "01" });
    expect(first.status).toBe("REVIEW_ONLY");
    expect(second.status).toBe("REVIEW_ONLY");
    if (first.status !== "REVIEW_ONLY" || second.status !== "REVIEW_ONLY") {
      return;
    }
    expectDeepFrozen(first);
    expectDeepFrozen(second);
    expect(first.data).toEqual(second.data);

    const catalog = listPublicAeatModelReviewPagesV1();
    expect(catalog.status).toBe("REVIEW_ONLY");
    if (catalog.status === "REVIEW_ONLY") expect(catalog.data).toHaveLength(229);
    expect(resolvePublicAeatModelCalendarNavigationV1({ code: "01" })).toMatchObject({
      status: "REVIEW_ONLY",
      catalogFocusHref:
        "/consultor-fiscal/modelos?origen=calendario&foco=01#modelo-01",
      detailHref: "/consultor-fiscal/modelos/01?origen=calendario",
      data: { returnHref: "/consultor-fiscal/calendario" },
    });
  });

  it("adds source-backed Model 01 concepts to the local catalog search", () => {
    const content = resolvePublicAeatModelContentV1({ code: "01" });
    const catalog = listPublicAeatModelReviewPagesV1();
    expect(content.status).toBe("REVIEW_ONLY");
    expect(catalog.status).toBe("REVIEW_ONLY");
    if (content.status !== "REVIEW_ONLY" || catalog.status !== "REVIEW_ONLY") {
      return;
    }
    const entries = catalog.data.map((page) =>
      createPublicAeatModelSearchEntryWithTermsV2(
        page,
        page.code === "01" ? content.data.searchTerms : [],
      ),
    );
    for (const query of [
      "situación tributaria",
      "certificado positivo",
      "deudas tributarias",
      "clave",
    ]) {
      const result = filterPublicAeatModelSearchEntriesV2(entries, query);
      expect(result.status).toBe("REVIEW_ONLY");
      if (result.status === "REVIEW_ONLY") {
        expect(result.data.map((entry) => entry.code)).toContain("01");
      }
    }
    expect(
      searchPublicAeatModelReviewPagesV2({
        modelo: "situación tributaria",
      }),
    ).toMatchObject({
      status: "REVIEW_ONLY",
      match: "RESULTS",
      total: 1,
      data: [{ code: "01" }],
    });
  });
});
