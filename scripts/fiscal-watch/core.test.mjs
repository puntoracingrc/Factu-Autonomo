import { describe, expect, it } from "vitest";

import {
  __test,
  FISCAL_WATCH_PARSER_CONTRACT_VERSION,
  FiscalWatchError,
  compareSourceSnapshots,
  fetchOfficialSource,
  loadFiscalWatchCatalog,
  normalizePlainText,
  parseSourceSnapshot,
  runFiscalWatch,
  validateFiscalWatchCatalog,
  validateOfficialSourceUrl,
} from "./core.mjs";

const NOW = new Date("2026-07-13T07:15:00.000Z");

function fetched(body, overrides = {}) {
  return {
    body,
    fetchedAt: NOW.toISOString(),
    httpStatus: 200,
    contentType: "text/plain",
    receivedBytes: new TextEncoder().encode(body).byteLength,
    resolvedUrl: "https://example.invalid",
    emptyPublication: false,
    ...overrides,
  };
}

function response(body, contentType, options = {}) {
  const headers = new Headers({ "content-type": contentType, ...(options.headers ?? {}) });
  return new Response(body, { status: options.status ?? 200, headers });
}

describe("fiscal watch official source catalog", () => {
  it("loads a closed, versioned catalog with the five existing AEAT calendars", async () => {
    const catalog = await loadFiscalWatchCatalog();
    expect(catalog.schemaVersion).toBe("fiscal-watch-sources.v1");
    expect(catalog.sources).toHaveLength(13);
    expect(catalog.sources.filter((source) => source.format === "ICS")).toHaveLength(5);
    expect(catalog.parserContractVersion).toBe(FISCAL_WATCH_PARSER_CONTRACT_VERSION);
    expect(catalog.sources.map((source) => source.id)).toEqual(
      expect.arrayContaining([
        "boe-tax-legislation-rss",
        "boe-daily-summary-api",
        "aeat-all-news-rss",
        "aeat-analysis-rss",
        "aeat-irpf-news",
        "aeat-iva-news",
        "aeat-corporate-tax-news",
        "aeat-calendar-year-news",
      ]),
    );
  });

  it("fails closed on malformed catalog versions or parser/implementation drift", async () => {
    const catalog = JSON.parse(JSON.stringify(await loadFiscalWatchCatalog()));
    expect(() =>
      validateFiscalWatchCatalog({ ...catalog, catalogVersion: "invalid version" }),
    ).toThrowError(/Contrato de catálogo no reconocido/);
    expect(() =>
      validateFiscalWatchCatalog({
        ...catalog,
        parserContractVersion: "fiscal-watch-parser.future.v999",
      }),
    ).toThrowError(/Contrato de catálogo no reconocido/);
  });

  it("allows only the exact official host/path contracts", () => {
    expect(
      validateOfficialSourceUrl(
        "https://www.boe.es/datosabiertos/api/boe/sumario/20260713",
      ).href,
    ).toContain("20260713");
    expect(() =>
      validateOfficialSourceUrl(
        "https://www.boe.es/buscar/doc.php?id=BOE-A-2026-1",
        "item",
      ),
    ).toThrowError(FiscalWatchError);
    expect(
      validateOfficialSourceUrl(
        "https://www.boe.es/buscar/doc.php?id=DOUE-L-2026-80715",
        "item",
      ).href,
    ).toContain("DOUE-L-2026-80715");
    expect(
      validateOfficialSourceUrl(
        "https://www.boe.es/buscar/doc.php?id=DOUE-Z-2026-70001",
        "item",
      ).href,
    ).toContain("DOUE-Z-2026-70001");
    expect(() =>
      validateOfficialSourceUrl(
        "https://www.boe.es/buscar/doc.php?id=DOUE-X-2026-1",
        "item",
      ),
    ).toThrowError(FiscalWatchError);
    expect(() =>
      validateOfficialSourceUrl(
        "https://sede.agenciatributaria.gob.es.evil.test/Sede/todas-noticias.xml",
      ),
    ).toThrowError(FiscalWatchError);
    expect(() =>
      validateOfficialSourceUrl(
        "https://calendar.google.com/calendar/ical/id/public/basic.ics?key=secret",
      ),
    ).toThrowError(FiscalWatchError);
  });
});

describe("fiscal watch normalization and parsers", () => {
  it("removes active and incomplete active content without executing or joining words", () => {
    expect(
      normalizePlainText(
        "uno<div>dos<script>alert(1)</script>tres</div><style>secret{}</style>cuatro<noscript>oculto",
      ),
    ).toBe("uno\ndos\ntres\ncuatro");
    expect(normalizePlainText("á 😀 &amp; &#x1F680;")).toBe("á 😀 & 🚀");
    expect(normalizePlainText("seguro &lt;script&gt;bad()&lt;/script&gt; final")).toBe(
      "seguro\nfinal",
    );
  });

  it("parses bounded RSS as plain text and rejects unsafe item links", async () => {
    const catalog = await loadFiscalWatchCatalog();
    const source = catalog.sources.find((entry) => entry.id === "aeat-all-news-rss");
    const body = `<?xml version="1.0"?><rss><channel><item>
      <guid>synthetic-1</guid><title><![CDATA[Nueva <b>orden</b>]]></title>
      <link>https://sede.agenciatributaria.gob.es/Sede/noticias/2026/cambio.html</link>
      <description>Texto<script>bad()</script> seguro</description><pubDate>2026-07-13</pubDate>
    </item></channel></rss>`;
    const snapshot = parseSourceSnapshot(source, fetched(body), catalog.limits);
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0]).toMatchObject({
      key: "synthetic-1",
      title: "Nueva orden",
      officialUrl:
        "https://sede.agenciatributaria.gob.es/Sede/noticias/2026/cambio.html",
    });
    expect(() =>
      parseSourceSnapshot(
        source,
        fetched(body.replace("sede.agenciatributaria.gob.es", "evil.test")),
        catalog.limits,
      ),
    ).toThrowError(/Enlace no permitido/);
    expect(() =>
      parseSourceSnapshot(source, fetched("<rss><channel></channel></rss>"), catalog.limits),
    ).toThrowError(/no contiene entradas/);
  });

  it("parses BOE JSON, HTML and ICS with deterministic hashes", async () => {
    const catalog = await loadFiscalWatchCatalog();
    const boe = catalog.sources.find((entry) => entry.id === "boe-daily-summary-api");
    const boeSnapshot = parseSourceSnapshot(
      boe,
      fetched(
        JSON.stringify({
          status: { code: "200", text: "OK" },
          data: {
            sumario: {
              diario: {
                seccion: [
                  {
                    codigo: "1",
                    nombre: "I. Disposiciones generales",
                    departamento: {
                      epigrafe: {
                        item: [
                          {
                            id: "BOE-A-2026-123",
                            titulo: "Orden tributaria sintética de prueba",
                            url_html: "/diario_boe/txt.php?id=BOE-A-2026-123",
                          },
                          {
                            id: "BOE-A-2026-124",
                            titulo: "Orden sobre una materia educativa ajena",
                            url_html:
                              "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-124",
                          },
                          {
                            id: "BOE-A-2026-125",
                            titulo: "Informe de fiscalización de contratos públicos",
                            url_html:
                              "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-125",
                          },
                        ],
                      },
                    },
                  },
                  {
                    codigo: "2A",
                    nombre:
                      "II. Autoridades y personal. - A. Nombramientos, situaciones e incidencias",
                    departamento: {
                      nombre: "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA",
                      epigrafe: {
                        nombre: "Ceses",
                        item: {
                          id: "BOE-A-2026-126",
                          titulo: "Cese de personal directivo de la Agencia Tributaria",
                        },
                      },
                    },
                  },
                  {
                    codigo: "2B",
                    nombre: "II. Autoridades y personal. - B. Oposiciones y concursos",
                    departamento: {
                      epigrafe: {
                        nombre: "Grupo IVA",
                        item: {
                          id: "BOE-A-2026-127",
                          titulo: "Convocatoria de recursos humanos del grupo IVA",
                        },
                      },
                    },
                  },
                  {
                    codigo: "5A",
                    nombre: "V. Anuncios. - A. Contratación del Sector Público",
                    departamento: {
                      epigrafe: {
                        item: {
                          id: "BOE-A-2026-128",
                          titulo: "Contrato de mantenimiento de sistemas del IVA",
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        }),
      ),
      catalog.limits,
    );
    expect(boeSnapshot.items[0].key).toBe("BOE-A-2026-123");
    expect(boeSnapshot.items).toHaveLength(1);
    expect(() =>
      parseSourceSnapshot(
        boe,
        fetched(
          JSON.stringify({
            status: { code: "200" },
            data: {
              sumario: {
                diario: {
                  seccion: {
                    codigo: "1",
                    nombre: "I. Clasificación inesperada",
                    departamento: [],
                  },
                },
              },
            },
          }),
        ),
        catalog.limits,
      ),
    ).toThrowError(/Clasificación BOE no reconocida/);
    const officialSection = {
      codigo: "1",
      nombre: "I. Disposiciones generales",
    };
    const boeBodyWithSection = (section) =>
      fetched(
        JSON.stringify({
          status: { code: "200" },
          data: { sumario: { diario: { seccion: section } } },
        }),
      );
    const structurallyInvalidSections = [
      officialSection,
      { ...officialSection, departamento: [] },
      { ...officialSection, departamento: "tipo incorrecto" },
      { ...officialSection, departamento: {} },
      { ...officialSection, departamento: { epigrafe: [] } },
      { ...officialSection, departamento: { epigrafe: "tipo incorrecto" } },
      { ...officialSection, departamento: { epigrafe: {} } },
      { ...officialSection, departamento: { epigrafe: { item: [] } } },
      {
        ...officialSection,
        departamento: { epigrafe: { item: "tipo incorrecto" } },
      },
    ];
    for (const invalidSection of structurallyInvalidSections) {
      expect(() =>
        parseSourceSnapshot(
          boe,
          boeBodyWithSection(invalidSection),
          catalog.limits,
        ),
      ).toThrowError(/Colección BOE no válida/);
    }
    const dayWithoutSectionOne = parseSourceSnapshot(
      boe,
      boeBodyWithSection({
        codigo: "2A",
        nombre:
          "II. Autoridades y personal. - A. Nombramientos, situaciones e incidencias",
      }),
      catalog.limits,
    );
    expect(dayWithoutSectionOne.items).toEqual([]);

    const html = catalog.sources.find((entry) => entry.id === "aeat-iva-news");
    const htmlSnapshot = parseSourceSnapshot(
      html,
      fetched(
        '<!doctype html><html><nav>menú</nav><main><h1 id="js-nombre-canal">Novedades de IVA</h1><p>Contenido</p><script>bad()</script></main></html>',
      ),
      catalog.limits,
    );
    expect(htmlSnapshot.items).toHaveLength(1);
    expect(() =>
      parseSourceSnapshot(
        html,
        fetched(
          '<!doctype html><html><main><h1 id="js-nombre-canal">Mantenimiento</h1><p>Vuelva después</p></main></html>',
        ),
        catalog.limits,
      ),
    ).toThrowError(/sentinela esperada/);
    expect(() =>
      parseSourceSnapshot(
        html,
        fetched("<!doctype html><html><main><p>Soft 404</p></main></html>"),
        catalog.limits,
      ),
    ).toThrowError(/sentinela esperada/);

    const ics = catalog.sources.find((entry) => entry.id === "aeat-calendar-iva-ics");
    const ical = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:synthetic-event",
      "DTSTART;VALUE=DATE:20270120",
      "DTEND;VALUE=DATE:20270121",
      "SUMMARY:Modelo 303\\, prueba",
      "DESCRIPTION:Texto\\nseguro<script>bad()</script>",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const first = parseSourceSnapshot(ics, fetched(ical), catalog.limits);
    const second = parseSourceSnapshot(ics, fetched(ical), catalog.limits);
    expect(first.items[0].title).toBe("Modelo 303, prueba");
    expect(first.semanticHash).toBe(second.semanticHash);
  });

  it("keeps ICS as Europe/Madrid date-only within the versioned future horizon", async () => {
    const catalog = await loadFiscalWatchCatalog();
    const source = catalog.sources.find((entry) => entry.id === "aeat-calendar-iva-ics");
    const body = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:expired",
      "DTSTART;VALUE=DATE:20261230",
      "SUMMARY:Vencido",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:new-year",
      "DTSTART:20261231T230000Z",
      "SUMMARY:Cambio de año",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:dst",
      "DTSTART;VALUE=DATE:20270328",
      "SUMMARY:Cambio DST sin UTC",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:leap",
      "DTSTART;VALUE=DATE:20280229",
      "SUMMARY:Bisiesto",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const snapshot = parseSourceSnapshot(
      source,
      fetched(body, { fetchedAt: "2026-12-31T23:30:00.000Z" }),
      catalog.limits,
    );
    expect(snapshot.items.map((item) => [item.key, item.effectiveDate])).toEqual([
      ["dst", "2027-03-28"],
      ["leap", "2028-02-29"],
      ["new-year", "2027-01-01"],
    ]);
    const floating = body.replace("DTSTART:20261231T230000Z", "DTSTART:20270101T000000");
    expect(() =>
      parseSourceSnapshot(
        source,
        fetched(floating, { fetchedAt: "2026-12-31T23:30:00.000Z" }),
        catalog.limits,
      ),
    ).toThrowError(/instante UTC estricto/);
    const unknownZone = body.replace(
      "DTSTART:20261231T230000Z",
      "DTSTART;TZID=Atlantic/Unknown:20270101T000000",
    );
    expect(() =>
      parseSourceSnapshot(
        source,
        fetched(unknownZone, { fetchedAt: "2026-12-31T23:30:00.000Z" }),
        catalog.limits,
      ),
    ).toThrowError(/instante UTC estricto/);
  });
});

describe("fiscal watch transport hardening", () => {
  it("fails closed on redirects, MIME and advertised size", async () => {
    const catalog = await loadFiscalWatchCatalog();
    const source = catalog.sources.find((entry) => entry.id === "aeat-all-news-rss");
    await expect(
      fetchOfficialSource(source, catalog.limits, {
        fetchImpl: async () => response("<rss/>", "text/html"),
        now: () => NOW,
      }),
    ).rejects.toMatchObject({ code: "MIME_MISMATCH" });
    await expect(
      fetchOfficialSource(source, { ...catalog.limits, maxResponseBytes: 4 }, {
        fetchImpl: async () =>
          response("hola", "application/rss+xml", {
            headers: { "content-length": "100" },
          }),
        now: () => NOW,
      }),
    ).rejects.toMatchObject({ code: "RESPONSE_TOO_LARGE" });
  });

  it("counts real UTF-8 bytes by chunk even without Content-Length", async () => {
    const catalog = await loadFiscalWatchCatalog();
    const source = catalog.sources.find((entry) => entry.id === "aeat-all-news-rss");
    const bytes = new TextEncoder().encode("ááá");
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes.slice(0, 2));
        controller.enqueue(bytes.slice(2));
        controller.close();
      },
    });
    await expect(
      fetchOfficialSource(source, { ...catalog.limits, maxResponseBytes: 5 }, {
        fetchImpl: async () =>
          new Response(stream, { headers: { "content-type": "application/rss+xml" } }),
        now: () => NOW,
      }),
    ).rejects.toMatchObject({ code: "RESPONSE_TOO_LARGE" });
  });

  it("decodes the allowlisted ISO-8859-1 charset used by the BOE RSS", async () => {
    const catalog = await loadFiscalWatchCatalog();
    const source = catalog.sources.find((entry) => entry.id === "boe-tax-legislation-rss");
    const prefix = new TextEncoder().encode(
      "<?xml version=\"1.0\"?><rss><channel><item><guid>x</guid><title>Imposici",
    );
    const suffix = new TextEncoder().encode(
      "n</title><link>https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-1</link></item></channel></rss>",
    );
    const body = new Uint8Array(prefix.length + 1 + suffix.length);
    body.set(prefix);
    body[prefix.length] = 0xf3;
    body.set(suffix, prefix.length + 1);
    const result = await fetchOfficialSource(source, catalog.limits, {
      fetchImpl: async () =>
        new Response(body, {
          headers: { "content-type": "application/rss+xml; charset=ISO-8859-1" },
        }),
      now: () => NOW,
    });
    expect(result.body).toContain("Imposición");
  });

  it("aborts a timed-out source", async () => {
    const catalog = await loadFiscalWatchCatalog();
    const source = catalog.sources.find((entry) => entry.id === "aeat-all-news-rss");
    await expect(
      fetchOfficialSource(source, { ...catalog.limits, timeoutMs: 5 }, {
        fetchImpl: async (_url, init) =>
          await new Promise((_resolve, reject) => {
            init.signal.addEventListener("abort", () => reject(new Error("aborted")));
          }),
        now: () => NOW,
      }),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });
});

describe("fiscal watch state transitions", () => {
  function snapshot(source, items, at = NOW.toISOString()) {
    const digestItems = items.map((item) => ({
      key: item.key,
      title: item.title ?? item.key,
      officialUrl: item.officialUrl ?? source.officialPageUrl,
      publishedAt: null,
      effectiveDate: item.effectiveDate ?? null,
      digest: item.digest,
    }));
    return {
      schemaVersion: "fiscal-watch-source-snapshot.v1",
      sourceId: source.id,
      mode: source.mode,
      fetchedAt: at,
      itemCount: digestItems.length,
      semanticHash: digestItems.map((item) => `${item.key}:${item.digest}`).join("|"),
      items: digestItems,
      complete: true,
      emptyPublication: false,
    };
  }

  it("creates the first baseline without mass alerts and keeps review explicit", async () => {
    const catalog = await loadFiscalWatchCatalog();
    const source = catalog.sources.find((entry) => entry.id === "aeat-all-news-rss");
    const first = compareSourceSnapshots(source, null, snapshot(source, [{ key: "a", digest: "1" }]));
    expect(first.state.status).toBe("BASELINE_REVIEW_REQUIRED");
    expect(first.changes).toEqual([]);
    const second = compareSourceSnapshots(source, first.state, snapshot(source, [{ key: "a", digest: "1" }]));
    expect(second.state.status).toBe("BASELINE_REVIEW_REQUIRED");
    const accepted = compareSourceSnapshots(
      source,
      second.state,
      snapshot(source, [{ key: "a", digest: "1" }]),
      { baselineAccepted: true },
    );
    expect(accepted.state.status).toBe("HEALTHY");
  });

  it("invalidates missing or changed catalog/parser contracts into a quiet new baseline", async () => {
    const catalog = await loadFiscalWatchCatalog();
    const source = catalog.sources.find((entry) => entry.id === "aeat-all-news-rss");
    const firstSnapshot = snapshot(source, [{ key: "a", digest: "1" }]);
    const first = compareSourceSnapshots(source, null, firstSnapshot, {
      catalogVersion: "catalog.v1",
      parserContractVersion: "parser.v1",
    });
    const changedSnapshot = snapshot(source, [
      { key: "a", digest: "2" },
      { key: "b", digest: "3" },
    ]);
    for (const options of [
      { catalogVersion: "catalog.v2", parserContractVersion: "parser.v1" },
      { catalogVersion: "catalog.v1", parserContractVersion: "parser.v2" },
    ]) {
      const migrated = compareSourceSnapshots(source, first.state, changedSnapshot, options);
      expect(migrated.state.status).toBe("BASELINE_REVIEW_REQUIRED");
      expect(migrated.changes).toEqual([]);
    }
    const missingContract = { ...first.state };
    delete missingContract.parserContractVersion;
    const rejected = compareSourceSnapshots(source, missingContract, changedSnapshot, {
      catalogVersion: "catalog.v1",
      parserContractVersion: "parser.v1",
    });
    expect(rejected.state.status).toBe("BASELINE_REVIEW_REQUIRED");
    expect(rejected.changes).toEqual([]);
  });

  it("ignores disappearance in append-only sources but confirms future snapshot absence twice", async () => {
    const catalog = await loadFiscalWatchCatalog();
    const append = catalog.sources.find((entry) => entry.id === "aeat-all-news-rss");
    const base = compareSourceSnapshots(append, null, snapshot(append, [{ key: "a", digest: "1" }])).state;
    expect(compareSourceSnapshots(append, base, snapshot(append, [])).changes).toEqual([]);

    const future = catalog.sources.find((entry) => entry.id === "aeat-iva-news");
    const futureBase = compareSourceSnapshots(future, null, snapshot(future, [{ key: "a", digest: "1" }])).state;
    const once = compareSourceSnapshots(future, futureBase, snapshot(future, []));
    expect(once.changes).toEqual([]);
    const twice = compareSourceSnapshots(future, once.state, snapshot(future, []));
    expect(twice.changes.map((change) => change.type)).toEqual(["NO_LONGER_PRESENT"]);

    const expiredBase = compareSourceSnapshots(
      future,
      null,
      snapshot(future, [{ key: "old", digest: "1", effectiveDate: "2026-07-12" }]),
    ).state;
    const expiredOnce = compareSourceSnapshots(future, expiredBase, snapshot(future, []));
    const expiredTwice = compareSourceSnapshots(future, expiredOnce.state, snapshot(future, []));
    expect(expiredOnce.changes).toEqual([]);
    expect(expiredTwice.changes).toEqual([]);
  });

  it("marks source failures degraded without leaking exception messages", async () => {
    const catalog = await loadFiscalWatchCatalog();
    const result = await runFiscalWatch({
      catalog: { ...catalog, sources: catalog.sources.slice(0, 1) },
      fetchImpl: async () => {
        throw new Error("secret upstream detail");
      },
      now: () => NOW,
    });
    expect(result).toMatchObject({ status: "DEGRADED", degradedCount: 1 });
    expect(JSON.stringify(result)).not.toContain("secret upstream detail");
  });
});

describe("BOE daily recovery window", () => {
  it("uses a bounded seven-day Madrid baseline across year and leap-day boundaries", () => {
    expect(__test.boeBackfillDates(new Date("2027-01-02T08:00:00.000Z"))).toEqual([
      "2026-12-27",
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
    expect(__test.boeBackfillDates(new Date("2028-03-01T08:00:00.000Z"))).toContain(
      "2028-02-29",
    );
  });

  it("recovers from the day before last success through today without exceeding seven days", () => {
    expect(
      __test.boeBackfillDates(
        new Date("2027-01-02T08:00:00.000Z"),
        "2026-12-31T08:00:00.000Z",
      ),
    ).toEqual(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
    const missed = __test.boeBackfillDates(
      new Date("2027-03-29T07:00:00.000Z"),
      "2027-03-20T08:00:00.000Z",
    );
    expect(missed).toHaveLength(7);
    expect(missed.at(-1)).toBe("2027-03-29");
  });

  it("fetches seven BOE days on baseline but does not multiply another source", async () => {
    const catalog = await loadFiscalWatchCatalog();
    const boe = catalog.sources.find((source) => source.id === "boe-daily-summary-api");
    const boeUrls = [];
    const boeRun = await runFiscalWatch({
      catalog: { ...catalog, sources: [boe] },
      fetchImpl: async (url) => {
        boeUrls.push(url.href);
        return new Response(null, { status: 404 });
      },
      now: () => new Date("2027-01-02T08:00:00.000Z"),
    });
    expect(boeRun.degradedCount).toBe(0);
    expect(boeUrls).toHaveLength(7);
    expect(boeUrls[0]).toContain("20261227");
    expect(boeUrls.at(-1)).toContain("20270102");

    const rss = catalog.sources.find((source) => source.id === "aeat-all-news-rss");
    let rssCalls = 0;
    const rssRun = await runFiscalWatch({
      catalog: { ...catalog, sources: [rss] },
      fetchImpl: async () => {
        rssCalls += 1;
        return response(
          "<rss><channel><item><guid>x</guid><title>Novedad sintética</title><link>https://sede.agenciatributaria.gob.es/Sede/noticias/cambio.html</link></item></channel></rss>",
          "application/rss+xml",
        );
      },
      now: () => NOW,
    });
    expect(rssRun.degradedCount).toBe(0);
    expect(rssCalls).toBe(1);
  });
});
