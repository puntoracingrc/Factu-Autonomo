import { describe, expect, it } from "vitest";
import {
  listPublicAeatModelReviewPagesV1,
  searchPublicAeatModelReviewPagesV2,
} from "./public-review-catalog.v1";
import {
  createPublicAeatModelSearchEntryV2,
  filterPublicAeatModelSearchEntriesV2,
  filterPublicAeatModelSearchEntriesInteractiveV2,
  normalizePublicAeatModelSearchTextV2,
} from "./public-review-search.v2";

function getPages() {
  const catalog = listPublicAeatModelReviewPagesV1();
  expect(catalog.status).toBe("REVIEW_ONLY");
  if (catalog.status !== "REVIEW_ONLY") {
    throw new Error("Expected the coherent public review catalog fixture");
  }
  return catalog.data;
}

function search(modelo?: unknown) {
  const input = modelo === undefined ? {} : { modelo };
  return searchPublicAeatModelReviewPagesV2(input);
}

function resultCodes(modelo: unknown): readonly string[] {
  const result = search(modelo);
  expect(result.status).toBe("REVIEW_ONLY");
  if (result.status !== "REVIEW_ONLY") return [];
  return result.data.map((page) => page.code);
}

describe("public AEAT model review search v2", () => {
  it("returns all 229 pages in catalog order when the query is absent", () => {
    const pages = getPages();
    const result = search();

    expect(result.status).toBe("REVIEW_ONLY");
    if (result.status !== "REVIEW_ONLY") return;
    expect(result).toMatchObject({
      query: null,
      normalizedQuery: null,
      match: "ALL",
      total: 229,
    });
    expect(result.data).toHaveLength(229);
    expect(result.data.map((page) => page.code)).toEqual(
      pages.map((page) => page.code),
    );
    expect(new Set(result.data.map((page) => page.code)).size).toBe(229);
    expect(new Set(result.data.map((page) => page.catalogCardId)).size).toBe(
      229,
    );
  });

  it("finds official names and concepts without depending on case or accents", () => {
    const ivaUpper = resultCodes("IVA");
    expect(resultCodes("iva")).toEqual(ivaUpper);
    expect(resultCodes("IvA")).toEqual(ivaUpper);
    expect(ivaUpper).toContain("303");
    expect(ivaUpper).toContain("349");

    const accented = resultCodes("estimación directa");
    expect(resultCodes("estimacion directa")).toEqual(accented);
    expect(accented).toContain("130");

    expect(resultCodes("operaciones intracomunitarias")).toContain("349");
    expect(resultCodes("declaracion censal")).toContain("036");
    expect(resultCodes("retenciones arrendamiento")).toContain("115");
    expect(resultCodes("pensionistas dos pagadores")).toContain("146");
    expect(resultCodes("opcion regimen desplazados")).toContain("149");
    expect(resultCodes("anterior 1 enero 2015")).toContain("150");
    expect(resultCodes("deduccion maternidad mutualidades")).toContain("156");
    expect(resultCodes("consumo energia electrica")).toContain("159");
    expect(resultCodes("entidades nueva creacion")).toContain("165");
    expect(resultCodes("pagos asociados telefono movil")).toContain("170");
    expect(resultCodes("imposiciones disposiciones fondos")).toContain("171");
    expect(resultCodes("saldos monedas virtuales")).toContain("172");
    expect(resultCodes("operaciones monedas virtuales")).toContain("173");
    expect(resultCodes("todo tipo tarjetas")).toContain("174");
    expect(resultCodes("viviendas fines turisticos")).toContain("179");
    expect(resultCodes("arrendamiento inmuebles urbanos")).toContain("180");
    expect(resultCodes("prestamos creditos inmuebles")).toContain("181");
    expect(resultCodes("donativos aportaciones recibidas")).toContain("182");
    expect(resultCodes("atribucion rentas anual")).toContain("184");
    expect(resultCodes("cotizaciones afiliados mutualistas")).toContain("185");
    expect(resultCodes("nacimientos defunciones")).toContain("186");
    expect(
      resultCodes("acciones participaciones inversion colectiva"),
    ).toContain("187");
    expect(resultCodes("seguro vida invalidez")).toContain("188");
    expect(resultCodes("valores seguros rentas")).toContain("189");
    expect(
      resultCodes("rendimientos trabajo actividades economicas"),
    ).toContain("190");
    expect(resultCodes("Letras del Tesoro")).toContain("192");
    expect(resultCodes("capital mobiliario")).toContain("193");
    expect(resultCodes("captacion capitales ajenos")).toContain("194");
    expect(resultCodes("titulares no han facilitado NIF")).toContain("195");
    expect(resultCodes("personas autorizadas saldos cuentas")).toContain("196");
    expect(resultCodes("declaracion censal simplificada")).toContain("037");
    expect(resultCodes("activos financieros valores mobiliarios")).toContain(
      "198",
    );
    expect(resultCodes("operaciones cheques entidades credito")).toContain(
      "199",
    );
    expect(resultCodes("impuesto sociedades 2025")).toContain("200");
    expect(resultCodes("pago fraccionado sociedades")).toContain("202");
    expect(resultCodes("no residentes establecimientos permanentes")).toContain(
      "206",
    );
    expect(
      resultCodes("no residentes sin establecimiento permanente"),
    ).toContain("210");
    expect(resultCodes("retencion adquisicion inmuebles")).toContain("211");
    expect(
      resultCodes("gravamen especial bienes inmuebles entidades"),
    ).toContain("213");
    expect(resultCodes("retenciones no residentes ingresos cuenta")).toContain(
      "216",
    );
  });

  it("supports word-prefix discovery without fuzzy or substring matching", () => {
    expect(resultCodes("estim direc")).toContain("130");
    expect(resultCodes("oper intracom")).toContain("349");
    expect(resultCodes("subcontrat")).toContain("01C");

    const ivaCodes = resultCodes("IVA");
    expect(ivaCodes).not.toContain("190");
    expect(resultCodes("informativa")).toContain("190");
    expect(resultCodes("IVX")).toEqual([]);
  });

  it("recognizes exact codes case-insensitively only in the discovery search", () => {
    for (const [query, code] of [
      ["130", "130"],
      ["349", "349"],
      ["036", "036"],
      ["303", "303"],
      ["A22", "A22"],
      ["a22", "A22"],
      ["01C", "01C"],
      ["01c", "01C"],
    ] as const) {
      const result = search(query);
      expect(result.status, query).toBe("REVIEW_ONLY");
      if (result.status !== "REVIEW_ONLY") continue;
      expect(result).toMatchObject({
        query,
        normalizedQuery: query.toLocaleLowerCase("es"),
        match: "EXACT_CODE",
        total: 1,
        data: [{ code, href: `/consultor-fiscal/modelos/${code}` }],
      });
    }
  });

  it("combines code and title terms with AND semantics", () => {
    expect(resultCodes("modelo 303")).toEqual(["303"]);
    expect(resultCodes("303 IVA")).toEqual(["303"]);
    expect(resultCodes("modelo A22 plastico")).toEqual(["A22"]);
    expect(resultCodes("303 intracomunitarias")).toEqual([]);
  });

  it("returns an explicit no-match result for unknown codes and concepts", () => {
    for (const query of ["999", "99X", "concepto inexistente"]) {
      const result = search(query);
      expect(result, query).toEqual({
        status: "REVIEW_ONLY",
        data: [],
        query,
        normalizedQuery: normalizePublicAeatModelSearchTextV2(query),
        match: "NO_MATCH",
        total: 0,
      });
    }
  });

  it("blocks malformed, coerced, decorated, and accessor inputs", () => {
    let getterCalls = 0;
    const accessor = {};
    Object.defineProperty(accessor, "modelo", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return "IVA";
      },
    });

    for (const input of [
      null,
      undefined,
      [],
      "IVA",
      { modelo: 303 },
      { modelo: ["IVA"] },
      Object.create({ modelo: "IVA" }),
      { [Symbol("modelo")]: "IVA" },
      accessor,
    ]) {
      expect(searchPublicAeatModelReviewPagesV2(input)).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
      });
    }
    expect(getterCalls).toBe(0);

    const nullPrototype = Object.create(null) as Record<string, unknown>;
    nullPrototype.modelo = "IVA";
    expect(searchPublicAeatModelReviewPagesV2(nullPrototype).status).toBe(
      "REVIEW_ONLY",
    );
    expect(
      searchPublicAeatModelReviewPagesV2({
        modelo: "IVA",
        origen: "manipulado",
        returnTo: "/evil",
      }),
    ).toEqual(searchPublicAeatModelReviewPagesV2({ modelo: "IVA" }));
  });

  it("enforces exact query boundaries and rejects unsafe characters", () => {
    const eightyCharacters = "z".repeat(80);
    const tooManyTokens = Array.from(
      { length: 13 },
      (_, index) => `palabra${index}`,
    ).join(" ");

    expect(search(eightyCharacters).status).toBe("REVIEW_ONLY");
    expect(search("x").status).toBe("REVIEW_ONLY");
    for (const query of [
      "z".repeat(81),
      tooManyTokens,
      " IVA",
      "IVA ",
      "IVA\n",
      "I\u200bVA",
      "I\u0000VA",
      "I\ud800VA",
      "---",
    ]) {
      expect(search(query), JSON.stringify(query)).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
      });
    }

    for (const query of [null, ""]) {
      const result = search(query);
      expect(result.status).toBe("REVIEW_ONLY");
      if (result.status !== "REVIEW_ONLY") continue;
      expect(result).toMatchObject({ match: "ALL", total: 229 });
    }
  });

  it("allows transient whitespace only in the interactive browser filter", () => {
    const entries = getPages().map(createPublicAeatModelSearchEntryV2);
    for (const query of ["IVA ", " estimacion ", "operaciones  intra"]) {
      const interactive = filterPublicAeatModelSearchEntriesInteractiveV2(
        entries,
        query,
      );
      expect(interactive.status, query).toBe("REVIEW_ONLY");
    }
    expect(
      filterPublicAeatModelSearchEntriesInteractiveV2(entries, "IVA "),
    ).toMatchObject({ match: "RESULTS" });
    expect(searchPublicAeatModelReviewPagesV2({ modelo: "IVA " })).toEqual({
      status: "BLOCKED",
      reason: "INVALID_INPUT",
    });
  });

  it("does not accept a consumer-supplied catalog as fiscal truth", () => {
    expect(searchPublicAeatModelReviewPagesV2.length).toBe(1);
    expect(searchPublicAeatModelReviewPagesV2({}).status).toBe("REVIEW_ONLY");
  });

  it("returns frozen deterministic values that consumers cannot corrupt", () => {
    const pages = getPages();
    const first = searchPublicAeatModelReviewPagesV2({ modelo: "IVA" });
    const second = searchPublicAeatModelReviewPagesV2({ modelo: "IVA" });

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
    if (first.status !== "REVIEW_ONLY" || second.status !== "REVIEW_ONLY") {
      return;
    }
    expect(first.data).not.toBe(second.data);
    expect(Object.isFrozen(first.data)).toBe(true);
    expect(Object.isFrozen(first.data[0])).toBe(true);
    expect(() => {
      (first.data as unknown as unknown[]).push({});
    }).toThrow(TypeError);
    expect(() => {
      (first.data[0] as unknown as { code: string }).code = "999";
    }).toThrow(TypeError);
    expect(searchPublicAeatModelReviewPagesV2({ modelo: "IVA" })).toEqual(
      second,
    );

    const entries = pages.map(createPublicAeatModelSearchEntryV2);
    const filtered = filterPublicAeatModelSearchEntriesV2(entries, "IVA");
    expect(Object.isFrozen(entries[0])).toBe(true);
    expect(Object.isFrozen(entries[0]?.words)).toBe(true);
    expect(Object.isFrozen(filtered)).toBe(true);
    if (filtered.status === "REVIEW_ONLY") {
      expect(Object.isFrozen(filtered.data)).toBe(true);
    }
  });
});
