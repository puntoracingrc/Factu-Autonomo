import { describe, expect, it } from "vitest";
import {
  listPublicAeatModelReviewPagesV1,
  searchPublicAeatModelReviewPagesV2,
} from "./public-review-catalog.v1";
import {
  createPublicAeatModelSearchEntryV2,
  createPublicAeatModelSearchEntryWithTermsV2,
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
    expect(resultCodes("gravamen especial SOCIMI")).toContain("217");
    expect(resultCodes("consolidacion fiscal ingreso devolucion")).toContain(
      "220",
    );
    expect(resultCodes("activos impuesto diferido credito exigible")).toContain(
      "221",
    );
    expect(resultCodes("consolidacion fiscal pago fraccionado")).toContain(
      "222",
    );
    expect(resultCodes("regimen opcional residentes union europea")).toContain(
      "226",
    );
    expect(
      resultCodes("reinversion vivienda habitual no residentes"),
    ).toContain("228");
    expect(resultCodes("retenciones premios loterias apuestas")).toContain(
      "230",
    );
    expect(resultCodes("informacion pais por pais CBC DAC4")).toContain("231");
    expect(resultCodes("operaciones vinculadas paraisos fiscales")).toContain(
      "232",
    );
    expect(resultCodes("gastos guarderias educacion infantil")).toContain(
      "233",
    );
    expect(resultCodes("mecanismos transfronterizos")).toContain("234");
    expect(
      resultCodes("actualizacion mecanismos transfronterizos comercializables"),
    ).toContain("235");
    expect(resultCodes("utilizacion mecanismos transfronterizos")).toContain(
      "236",
    );
    expect(resultCodes("beneficios no distribuidos SOCIMI")).toContain("237");
    expect(resultCodes("operadores plataformas")).toContain("238");
    expect(
      resultCodes("elusion estandar comun estructuras extraterritoriales"),
    ).toContain("239");
    expect(
      resultCodes("entidad constitutiva declarante impuesto complementario"),
    ).toContain("240");
    expect(resultCodes("grupos multinacionales gran magnitud")).toContain(
      "241",
    );
    expect(resultCodes("autoliquidacion impuesto complementario")).toContain(
      "242",
    );
    expect(
      resultCodes("desplazamiento extranjero trabajadores cuenta ajena"),
    ).toContain("247");
    expect(resultCodes("retenciones premios loterias apuestas")).toContain(
      "270",
    );
    expect(resultCodes("planes ahorro largo plazo")).toContain("280");
    expect(
      resultCodes("comercio bienes corporales zona especial canaria"),
    ).toContain("281");
    expect(resultCodes("ayudas REF Canarias estado")).toContain("282");
    expect(resultCodes("ayudas regimen fiscal Illes Balears")).toContain("283");
    expect(resultCodes("cuentas financieras asistencia mutua")).toContain(
      "289",
    );
    expect(resultCodes("FATCA cuentas financieras")).toContain("290");
    expect(resultCodes("IRNR cuentas no residentes")).toContain("291");
    expect(
      resultCodes("clientes perceptores beneficios distribuidos"),
    ).toContain("294");
    expect(resultCodes("posicion inversora 31 diciembre")).toContain("295");
    expect(resultCodes("IRNR resumen anual")).toContain("296");
    expect(resultCodes("IVA autoliquidacion")).toContain("303");
    expect(resultCodes("recargo equivalencia solicitud devolucion")).toContain(
      "308",
    );
    expect(resultCodes("liquidacion no periodica")).toContain("309");
    expect(resultCodes("regularizacion proporciones")).toContain("318");
    expect(resultCodes("gasolinas gasoleos biocarburantes")).toContain("319");
    expect(resultCodes("grupos entidades individual")).toContain("322");
    expect(resultCodes("reintegro compensaciones agricultura")).toContain(
      "341",
    );
    expect(resultCodes("planes fondos pensiones")).toContain("345");
    expect(
      resultCodes("subvenciones indemnizaciones agricultores ganaderos"),
    ).toContain("346");
    expect(resultCodes("operaciones terceras personas")).toContain("347");
    expect(resultCodes("operaciones intracomunitarias")).toContain("349");
    expect(resultCodes("grupo entidades agregado")).toContain("353");
    expect(resultCodes("devoluciones no establecidos")).toEqual(
      expect.arrayContaining(["360", "361"]),
    );
    expect(resultCodes("OTAN reembolso")).toContain("364");
    expect(resultCodes("OTAN reconocimiento exenciones")).toContain("365");
    expect(
      resultCodes("telecomunicaciones radiodifusion electronicos"),
    ).toContain("368");
    expect(resultCodes("one stop shop OSS")).toContain("369");
    expect(resultCodes("pagos transfronterizos CESOP")).toContain("379");
    expect(resultCodes("operaciones asimiladas importaciones")).toContain(
      "380",
    );
    expect(resultCodes("fuerzas armadas estados miembros reembolso")).toContain(
      "381",
    );
    expect(resultCodes("resumen anual IVA")).toContain("390");
    expect(resultCodes("pago a cuenta depositos entidades credito")).toContain(
      "410",
    );
    expect(resultCodes("depositos entidades credito autoliquidacion")).toContain(
      "411",
    );
    expect(resultCodes("primas seguros declaracion liquidacion")).toContain(
      "430",
    );
    expect(resultCodes("primas seguros resumen anual")).toContain("480");
    expect(resultCodes("servicios digitales interfaz digital")).toContain(
      "490",
    );
    expect(resultCodes("solicitud autorizacion productos union europea")).toContain(
      "504",
    );
    expect(resultCodes("autorizacion CARE productos union europea")).toContain(
      "505",
    );
    expect(resultCodes("devolución introducción depósito fiscal")).toContain(
      "506",
    );
    expect(resultCodes("devolución envíos garantizados")).toContain("507");
    expect(resultCodes("devolución ventas distancia")).toContain("508");
    expect(resultCodes("operaciones recepción resto UE")).toContain("510");
    expect(resultCodes("destinatarios productos tarifa segunda")).toContain(
      "512",
    );
    expect(resultCodes("marcas fiscales labores tabaco")).toContain("515");
    expect(resultCodes("marcas fiscales alcohol bebidas derivadas")).toContain(
      "517",
    );
    expect(resultCodes("declaración trabajo alcohol")).toContain("518");
    expect(resultCodes("incidencias operaciones trabajo")).toContain("519");
    expect(resultCodes("resultado operaciones trabajo")).toContain("520");
    expect(resultCodes("primeras materias entregadas")).toContain("521");
    expect(resultCodes("productos artículo 108 ter")).toContain("522");
    expect(resultCodes("beneficio devolución aromas")).toContain("523");
    expect(
      resultCodes("solicitud devolución alcohol bebidas alcohólicas"),
    ).toContain("524");
    expect(resultCodes("cheque tarjetas gasóleo bonificado")).toContain("544");
    expect(
      resultCodes("carburantes relaciones internacionales hidrocarburos"),
    ).toContain("545");
    expect(resultCodes("avituallamiento embarcaciones SIANE")).toContain(
      "546",
    );
    expect(resultCodes("abonos detallistas gasóleo bonificado")).toContain(
      "547",
    );
    expect(resultCodes("cuotas repercutidas declaración informativa")).toContain(
      "548",
    );
    expect(
      resultCodes("fábricas depósitos vino bebidas fermentadas"),
    ).toContain("553");
  }, 15_000);

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
      ["modelo 303", "303"],
      ["A22", "A22"],
      ["a22", "A22"],
      ["Modelo A22", "A22"],
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
    expect(resultCodes("IVA 303")).toEqual(["303"]);
    expect(resultCodes("modelo A22 plastico")).toEqual(["A22"]);
    expect(resultCodes("303 intracomunitarias")).toEqual([]);
  });

  it("blocks ambiguous queries containing more than one exact model code", () => {
    for (const query of ["303 308", "IVA 303 308", "modelo 303 308"]) {
      expect(search(query), query).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
      });
    }
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

  it("rejects malformed or duplicate consumer entries and copies valid entries defensively", () => {
    const original = createPublicAeatModelSearchEntryV2(getPages()[0]!);
    const mutable = {
      code: original.code,
      catalogCardId: original.catalogCardId,
      normalizedText: original.normalizedText,
      words: [...original.words],
    };
    const result = filterPublicAeatModelSearchEntriesV2([mutable], null);
    expect(result.status).toBe("REVIEW_ONLY");
    if (result.status === "REVIEW_ONLY") {
      expect(result.data[0]).not.toBe(mutable);
      expect(result.data[0]?.words).not.toBe(mutable.words);
      expect(Object.isFrozen(result.data[0])).toBe(true);
      expect(Object.isFrozen(result.data[0]?.words)).toBe(true);
      const expectedCode = result.data[0]?.code;
      const expectedWord = result.data[0]?.words[0];
      mutable.code = "999";
      mutable.words[0] = "corrupto";
      expect(result.data[0]?.code).toBe(expectedCode);
      expect(result.data[0]?.words[0]).toBe(expectedWord);
    }

    let getterCalls = 0;
    const accessorEntry = {
      catalogCardId: original.catalogCardId,
      normalizedText: original.normalizedText,
      words: [...original.words],
    };
    Object.defineProperty(accessorEntry, "code", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return original.code;
      },
    });
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();

    for (const entries of [
      [original, { ...original }],
      [
        { ...original, catalogCardId: "duplicada" },
        { ...original, catalogCardId: "duplicada" },
      ],
      [{ ...original, code: null }],
      [{ ...original, catalogCardId: "modelo-999" }],
      [{ ...original, words: null }],
      [{ ...original, words: [...original.words, "extra"] }],
      [accessorEntry],
      [revoked.proxy],
    ]) {
      expect(
        filterPublicAeatModelSearchEntriesV2(
          entries as unknown as readonly ReturnType<
            typeof createPublicAeatModelSearchEntryV2
          >[],
          "IVA",
        ),
      ).toEqual({ status: "BLOCKED", reason: "INVALID_INPUT" });
    }
    expect(
      filterPublicAeatModelSearchEntriesV2(
        null as unknown as readonly ReturnType<
          typeof createPublicAeatModelSearchEntryV2
        >[],
        "IVA",
      ),
    ).toEqual({ status: "BLOCKED", reason: "INVALID_INPUT" });
    expect(getterCalls).toBe(0);
  });

  it("validates factory inputs before marking their entries as trusted", () => {
    const page = getPages()[0]!;
    const invalidPages = [
      { ...page, code: null },
      { ...page, code: "9999", catalogCardId: "modelo-9999" },
      { ...page, catalogCardId: "modelo-999" },
      { ...page, canonicalName: "x".repeat(20_001) },
    ];

    for (const invalidPage of invalidPages) {
      expect(() =>
        createPublicAeatModelSearchEntryV2(
          invalidPage as unknown as Parameters<
            typeof createPublicAeatModelSearchEntryV2
          >[0],
        ),
      ).toThrow(TypeError);
      expect(() =>
        createPublicAeatModelSearchEntryWithTermsV2(
          invalidPage as unknown as Parameters<
            typeof createPublicAeatModelSearchEntryWithTermsV2
          >[0],
          [],
        ),
      ).toThrow(TypeError);
    }

    let getterCalls = 0;
    const accessorPage = { ...page };
    Object.defineProperty(accessorPage, "code", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return page.code;
      },
    });
    expect(() => createPublicAeatModelSearchEntryV2(accessorPage)).toThrow(
      TypeError,
    );
    expect(getterCalls).toBe(0);
    expect(() =>
      createPublicAeatModelSearchEntryWithTermsV2(page, ["x".repeat(20_001)]),
    ).toThrow(TypeError);
  });
});
