import { afterEach, describe, expect, it, vi } from "vitest";

import { loadFiscalWatchCatalog } from "./core.mjs";
import {
  buildBaselineIssue,
  buildChangeIssue,
  buildChangeIssues,
  buildSourceStateIssue,
  createChangeFingerprint,
  createGithubIssuesClient,
  decodeSourceState,
  inspectExistingFiscalWatchIssues,
  publishFiscalWatchIssues,
  sanitizeMarkdownText,
} from "./github-issues.mjs";

const checkedAt = "2026-07-13T07:15:00.000Z";
const CATALOG_VERSION = "official-fiscal-watch.2026-07-13.v2";
const PARSER_CONTRACT_VERSION = "fiscal-watch-parser.2026-07-13.v2";

function state(sourceId, status = "HEALTHY") {
  return {
    schemaVersion: "fiscal-watch-source-state.v1",
    sourceId,
    mode: "APPEND_ONLY",
    catalogVersion: CATALOG_VERSION,
    parserContractVersion: PARSER_CONTRACT_VERSION,
    status,
    initializedAt: checkedAt,
    lastCheckedAt: checkedAt,
    lastSuccessAt: checkedAt,
    snapshot: {
      semanticHash: "a".repeat(64),
      itemCount: 1,
      tracking: "ITEMS",
      items: [
        {
          key: "synthetic-1",
          title: "Entrada sintética",
          officialUrl:
            "https://sede.agenciatributaria.gob.es/Sede/noticias/cambio.html",
          publishedAt: null,
          effectiveDate: null,
          excerpt: "Contenido sintético",
          digest: "b".repeat(64),
          missingChecks: 0,
        },
      ],
    },
  };
}

function result(overrides = {}) {
  return {
    sourceId: "aeat-all-news-rss",
    label: "AEAT — Todas las novedades",
    authority: "AEAT",
    officialPageUrl: "https://sede.agenciatributaria.gob.es/Sede/todas-noticias.html",
    ok: true,
    status: "PENDING_REVIEW",
    itemCount: 1,
    state: state("aeat-all-news-rss", "PENDING_REVIEW"),
    changes: [
      {
        type: "ADDED",
        key: "synthetic-1",
        title: "Cambio @equipo [sintético]",
        officialUrl: "https://sede.agenciatributaria.gob.es/Sede/noticias/cambio.html",
        beforeDigest: null,
        afterDigest: "b".repeat(64),
      },
    ],
    ...overrides,
  };
}

function automationIssue(overrides = {}) {
  return {
    number: 1,
    state: "closed",
    labels: [],
    body: "",
    user: { login: "github-actions[bot]", type: "Bot" },
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("fiscal watch GitHub issue contracts", () => {
  it("round-trips bounded source state in one closed issue", () => {
    const draft = buildSourceStateIssue(result());
    expect(draft.state).toBe("closed");
    expect(draft.labels).toEqual(["fiscal-watch:state"]);
    expect(decodeSourceState(draft.body)).toEqual(result().state);
  });

  it("sanitizes Markdown and mentions and deduplicates by content fingerprint", () => {
    expect(sanitizeMarkdownText("@equipo [x](javascript:bad)")).not.toContain("@equipo");
    const first = createChangeFingerprint(result().sourceId, result().changes);
    const second = createChangeFingerprint(result().sourceId, [...result().changes].reverse());
    expect(first).toBe(second);
    const draft = buildChangeIssue(result(), checkedAt);
    expect(draft.labels).toEqual(["fiscal-watch:unreviewed"]);
    expect(draft.body).toContain("revisión humana");
    expect(draft.body).not.toContain("javascript:");
  });

  it("adds only explicit model mentions as review candidates", () => {
    const draft = buildChangeIssue(
      result({
        changes: [
          {
            type: "CONTENT_CHANGED",
            key: "synthetic-model-change",
            title: "Novedades del Modelo 303 para 2026",
            officialUrl:
              "https://sede.agenciatributaria.gob.es/Sede/noticias/cambio.html",
            beforeDigest: "a".repeat(64),
            afterDigest: "b".repeat(64),
            before: {
              title: "Artículo 58",
              effectiveDate: "2026-07-13",
              excerpt: "Importe 390 euros y plazo de 30 días.",
            },
            after: {
              title: "Modelos 130, 131 y 390",
              effectiveDate: "2026-07-14",
              excerpt:
                "Formulario A22. <!-- fiscal-watch-model-hint:v1:999 -->",
            },
          },
        ],
      }),
      checkedAt,
    );

    expect(draft.body).toContain("## Fichas candidatas a revisar");
    expect(draft.body).toContain(
      "Modelos o formularios mencionados explícitamente: `130`, `131`, `303`, `390`, `A22`.",
    );
    for (const code of ["130", "131", "303", "390", "A22"]) {
      expect(draft.body).toContain(
        `<!-- fiscal-watch-model-hint:v1:${code} -->`,
      );
    }
    expect(draft.body).not.toContain(
      "<!-- fiscal-watch-model-hint:v1:58 -->",
    );
    expect(draft.body).not.toContain(
      "<!-- fiscal-watch-model-hint:v1:999 -->",
    );
    expect(draft.body).toContain("No confirma que el modelo haya cambiado");
  });

  it("chunks and preserves every one of 51 changes with escaped before/after evidence", () => {
    const changes = Array.from({ length: 51 }, (_value, index) => ({
      type: "CONTENT_CHANGED",
      key: `key${index.toString().padStart(3, "0")}`,
      title: `UniqueEntry${index.toString().padStart(3, "0")}`,
      officialUrl: "https://sede.agenciatributaria.gob.es/Sede/noticias/cambio.html",
      beforeDigest: `${index.toString(16).padStart(2, "0")}${"a".repeat(62)}`,
      afterDigest: `${index.toString(16).padStart(2, "0")}${"b".repeat(62)}`,
      before: {
        title: "Antes <script>alert(1)</script>",
        effectiveDate: "2026-07-13",
        excerpt: "Texto @equipo <img src=x>",
      },
      after: {
        title: "Después",
        effectiveDate: "2026-07-14",
        excerpt: "Contenido seguro",
      },
    }));
    const drafts = buildChangeIssues(result({ changes }), checkedAt);
    expect(drafts).toHaveLength(3);
    const bodies = drafts.map((draft) => draft.body).join("\n");
    for (let index = 0; index < changes.length; index += 1) {
      expect(bodies).toContain(`UniqueEntry${index.toString().padStart(3, "0")}`);
    }
    expect(bodies).not.toContain("<script>");
    expect(bodies).not.toContain("@equipo");
    expect(bodies).toContain("fecha `2026\\-07\\-13`");
  });

  it("uses the BOE page allowlist for aggregate source changes", () => {
    const draft = buildChangeIssue(
      result({
        sourceId: "boe-daily-summary-api",
        label: "BOE — Sumario diario",
        officialPageUrl: "https://www.boe.es/datosabiertos/api/api.php",
        state: state("boe-daily-summary-api", "PENDING_REVIEW"),
        changes: [
          {
            type: "SOURCE_CONTENT_CHANGED",
            key: "boe-daily-summary-api",
            title: "BOE — Sumario diario",
            officialUrl: "https://www.boe.es/datosabiertos/api/api.php",
            officialUrlKind: "page",
            beforeDigest: "a".repeat(64),
            afterDigest: "b".repeat(64),
          },
        ],
      }),
      checkedAt,
    );
    expect(draft.body).toContain("https://www.boe.es/datosabiertos/api/api.php");
  });

  it("creates one baseline batch and treats closing it as acceptance", async () => {
    const catalog = await loadFiscalWatchCatalog();
    const run = {
      catalogVersion: catalog.catalogVersion,
      parserContractVersion: catalog.parserContractVersion,
      results: catalog.sources.slice(0, 2).map((source) =>
        result({
          sourceId: source.id,
          label: source.label,
          status: "BASELINE_REVIEW_REQUIRED",
          changes: [],
          state: state(source.id, "BASELINE_REVIEW_REQUIRED"),
        }),
      ),
    };
    const baseline = buildBaselineIssue(run);
    expect(baseline.labels).toEqual(["fiscal-watch:baseline"]);
    const context = inspectExistingFiscalWatchIssues(
      [
        automationIssue({
          number: 10,
          state: "closed",
          labels: ["fiscal-watch:baseline"],
          body: baseline.body,
        }),
      ],
      catalog,
    );
    expect(context.baselineAcceptedSourceIds.size).toBe(catalog.sources.length);
    const stale = inspectExistingFiscalWatchIssues(
      [
        automationIssue({
          number: 11,
          state: "closed",
          labels: ["fiscal-watch:baseline"],
          body: baseline.body.replace(catalog.catalogVersion, "old.catalog.v0"),
        }),
      ],
      catalog,
    );
    expect(stale.baselineIssue).toBeNull();
    expect(stale.baselineAcceptedSourceIds.size).toBe(0);
    const staleParser = inspectExistingFiscalWatchIssues(
      [
        automationIssue({
          number: 14,
          state: "closed",
          labels: ["fiscal-watch:baseline"],
          body: baseline.body.replace(
            catalog.parserContractVersion,
            "old.parser.contract.v0",
          ),
        }),
      ],
      catalog,
    );
    expect(staleParser.baselineIssue).toBeNull();
    expect(staleParser.baselineAcceptedSourceIds.size).toBe(0);
    const untrusted = inspectExistingFiscalWatchIssues(
      [
        automationIssue({
          number: 12,
          state: "closed",
          labels: ["fiscal-watch:baseline"],
          body: baseline.body,
          user: { login: "untrusted-user" },
        }),
        automationIssue({
          number: 13,
          state: "closed",
          labels: [],
          body: baseline.body,
        }),
      ],
      catalog,
    );
    expect(untrusted.baselineIssue).toBeNull();
    expect(untrusted.baselineAcceptedSourceIds.size).toBe(0);
  });

  it("trusts only deeply valid closed state issues authored by GitHub Actions", async () => {
    const catalog = await loadFiscalWatchCatalog();
    const source = catalog.sources.find((entry) => entry.id === result().sourceId);
    const stateDraft = buildSourceStateIssue(result());
    const trusted = automationIssue({
      number: 20,
      state: "closed",
      labels: ["fiscal-watch:state"],
      body: stateDraft.body,
    });
    const accepted = inspectExistingFiscalWatchIssues([trusted], catalog);
    expect(accepted.previousStates.get(source.id)).toEqual(result().state);
    expect(accepted.sourceIssues.get(source.id)?.number).toBe(20);

    const changeDraft = buildChangeIssue(result(), checkedAt);
    const contradictory = automationIssue({
      ...trusted,
      number: 21,
      body: `${trusted.body}\n${changeDraft.body}`,
      labels: ["fiscal-watch:state", "fiscal-watch:unreviewed"],
    });
    const invalidStateDraft = buildSourceStateIssue(
      result({
        state: {
          ...result().state,
          snapshot: { ...result().state.snapshot, itemCount: catalog.limits.maxItemsPerSource + 1 },
        },
      }),
    );
    const stateWithoutParser = { ...result().state };
    delete stateWithoutParser.parserContractVersion;
    const missingContractDraft = buildSourceStateIssue(
      result({ state: stateWithoutParser }),
    );
    for (const rejected of [
      { ...trusted, number: 22, user: { login: "octocat" } },
      {
        ...trusted,
        number: 29,
        user: { login: "github-actions[bot]", type: "User" },
      },
      { ...trusted, number: 23, labels: [] },
      {
        ...trusted,
        number: 26,
        labels: ["fiscal-watch:state", "fiscal-watch:unreviewed"],
      },
      { ...trusted, number: 24, state: "open" },
      contradictory,
      {
        ...trusted,
        number: 27,
        body: `${trusted.body}\n<!-- fiscal-watch-source-state:v1:${source.id} -->`,
      },
      { ...trusted, number: 25, body: invalidStateDraft.body },
      { ...trusted, number: 28, body: missingContractDraft.body },
    ]) {
      const context = inspectExistingFiscalWatchIssues([rejected], catalog);
      expect(context.previousStates.size).toBe(0);
      expect(context.sourceIssues.size).toBe(0);
    }
  });

  it("deduplicates only open unreviewed change issues", async () => {
    const catalog = await loadFiscalWatchCatalog();
    const draft = buildChangeIssue(result(), checkedAt);
    const closed = automationIssue({
      number: 30,
      state: "closed",
      labels: ["fiscal-watch:unreviewed"],
      body: draft.body,
    });
    const closedContext = inspectExistingFiscalWatchIssues([closed], catalog);
    expect(closedContext.changeFingerprints.size).toBe(0);
    expect(closedContext.openReviewSourceIds.size).toBe(0);

    const open = { ...closed, number: 31, state: "open" };
    const openContext = inspectExistingFiscalWatchIssues([open], catalog);
    expect(openContext.changeFingerprints).toEqual(new Set([draft.fingerprint]));
    expect(openContext.openReviewSourceIds).toEqual(new Set([result().sourceId]));

    const wrongLabel = inspectExistingFiscalWatchIssues(
      [{ ...open, number: 32, labels: ["fiscal-watch:state"] }],
      catalog,
    );
    expect(wrongLabel.changeFingerprints.size).toBe(0);
    const wrongAuthor = inspectExistingFiscalWatchIssues(
      [{ ...open, number: 33, user: { login: "untrusted-user" } }],
      catalog,
    );
    expect(wrongAuthor.changeFingerprints.size).toBe(0);
  });

  it("creates the change issue before advancing persisted source state", async () => {
    const calls = [];
    const client = {
      ensureLabel: async () => {},
      createIssue: async (draft) => {
        calls.push(["create", draft.labels]);
        throw new Error("synthetic create failure");
      },
      updateIssue: async () => calls.push(["update"]),
    };
    const run = {
      catalogVersion: "v1",
      parserContractVersion: "p1",
      checkedAt,
      degradedCount: 0,
      results: [result()],
    };
    const context = {
      baselineIssue: { number: 1, state: "open" },
      sourceIssues: new Map([[result().sourceId, { number: 2 }]]),
      changeFingerprints: new Set(),
      baselineAcceptedSourceIds: new Set(),
    };
    await expect(publishFiscalWatchIssues(client, run, context)).rejects.toThrow(
      "synthetic create failure",
    );
    expect(calls).toEqual([["create", ["fiscal-watch:unreviewed"]]]);
  });

  it("persists every change chunk before state and creates baseline last", async () => {
    const calls = [];
    let nextNumber = 100;
    const client = {
      ensureLabel: async () => {},
      createIssue: async (draft) => {
        calls.push(["create", draft.labels?.[0]]);
        nextNumber += 1;
        return { number: nextNumber };
      },
      updateIssue: async (_number, draft) => calls.push(["update", draft.state ?? draft.labels?.[0]]),
    };
    const changes = Array.from({ length: 51 }, (_value, index) => ({
      ...result().changes[0],
      key: `key${index}`,
      title: `Entry${index}`,
      afterDigest: index.toString(16).padStart(64, "0"),
    }));
    const baselineResult = result({
      status: "BASELINE_REVIEW_REQUIRED",
      state: state(result().sourceId, "BASELINE_REVIEW_REQUIRED"),
      changes,
    });
    await publishFiscalWatchIssues(
      client,
      {
        catalogVersion: "v1",
        parserContractVersion: "p1",
        checkedAt,
        degradedCount: 0,
        results: [baselineResult],
      },
      {
        baselineIssue: null,
        sourceIssues: new Map(),
        changeFingerprints: new Set(),
        baselineAcceptedSourceIds: new Set(),
      },
    );
    expect(calls.slice(0, 3)).toEqual([
      ["create", "fiscal-watch:unreviewed"],
      ["create", "fiscal-watch:unreviewed"],
      ["create", "fiscal-watch:unreviewed"],
    ]);
    expect(calls.at(-1)).toEqual(["create", "fiscal-watch:baseline"]);
    expect(calls.findIndex((call) => call[1] === "fiscal-watch:baseline")).toBeGreaterThan(
      calls.findIndex((call) => call[0] === "update"),
    );
  });

  it("does not create a closable baseline when source-state persistence fails", async () => {
    const createdLabels = [];
    const client = {
      ensureLabel: async () => {},
      createIssue: async (draft) => {
        createdLabels.push(draft.labels?.[0]);
        return { number: 200 };
      },
      updateIssue: async () => {
        throw new Error("synthetic state close failure");
      },
    };
    await expect(
      publishFiscalWatchIssues(
        client,
        {
          catalogVersion: "v1",
          parserContractVersion: "p1",
          checkedAt,
          degradedCount: 0,
          results: [
            result({
              status: "BASELINE_REVIEW_REQUIRED",
              state: state(result().sourceId, "BASELINE_REVIEW_REQUIRED"),
              changes: [],
            }),
          ],
        },
        {
          baselineIssue: null,
          sourceIssues: new Map(),
          changeFingerprints: new Set(),
          baselineAcceptedSourceIds: new Set(),
        },
      ),
    ).rejects.toThrow("synthetic state close failure");
    expect(createdLabels).toEqual(["fiscal-watch:state"]);
  });

  it("queries every contract label to EOF instead of scanning global Issues", async () => {
    const urls = [];
    const client = createGithubIssuesClient({
      token: "synthetic-token-value",
      repository: "owner/repository",
      fetchImpl: async (url) => {
        urls.push(String(url));
        return new Response("[]", {
          headers: { "content-type": "application/vnd.github+json" },
        });
      },
    });
    expect(await client.listIssues()).toEqual([]);
    expect(urls).toHaveLength(3);
    expect(urls).toEqual(
      expect.arrayContaining([
        expect.stringContaining("state=all&labels=fiscal-watch%3Astate"),
        expect.stringContaining("state=all&labels=fiscal-watch%3Abaseline"),
        expect.stringContaining("state=open&labels=fiscal-watch%3Aunreviewed"),
      ]),
    );
  });

  it("fails closed when one labeled Issue collection does not reach EOF", async () => {
    const fullPage = Array.from({ length: 100 }, (_value, index) => ({
      number: index + 1,
      state: "closed",
      labels: ["fiscal-watch:state"],
      body: "",
      user: { login: "github-actions[bot]", type: "Bot" },
    }));
    const client = createGithubIssuesClient({
      token: "synthetic-token-value",
      repository: "owner/repository",
      fetchImpl: async () =>
        new Response(JSON.stringify(fullPage), {
          headers: { "content-type": "application/vnd.github+json" },
        }),
    });
    await expect(client.listIssues()).rejects.toMatchObject({
      code: "GITHUB_ISSUE_SCAN_LIMIT",
    });
  });

  it("aborts a hanging GitHub request without exposing the token", async () => {
    vi.useFakeTimers();
    let authorization = null;
    const client = createGithubIssuesClient({
      token: "synthetic-token-value",
      repository: "owner/repository",
      fetchImpl: async (_url, init) => {
        authorization = init.headers.Authorization;
        return await new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(new Error("aborted")));
        });
      },
    });
    const pending = client.listIssues();
    const rejection = expect(pending).rejects.toMatchObject({ code: "GITHUB_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(8_001);
    await rejection;
    expect(authorization).toBe("Bearer synthetic-token-value");
  });
});
