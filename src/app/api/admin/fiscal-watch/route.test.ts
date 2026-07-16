import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import {
  listFiscalWatchReviewKeys,
  recordFiscalWatchReview,
} from "@/lib/fiscal-watch/review-store";
import { checkRateLimit, type RateLimitResult } from "@/lib/server/rate-limit";
import { GET, POST } from "./route";

vi.mock("@/lib/admin/server-access", () => ({
  getAdminAccessFromRequest: vi.fn(),
}));

vi.mock("@/lib/fiscal-watch/review-store", () => ({
  listFiscalWatchReviewKeys: vi.fn(),
  recordFiscalWatchReview: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/server/rate-limit")
  >("@/lib/server/rate-limit");
  return { ...actual, checkRateLimit: vi.fn() };
});

const ALLOWED_RATE_LIMIT: RateLimitResult = {
  allowed: true,
  limit: 12,
  remaining: 11,
  resetAt: Date.parse("2026-07-13T09:25:00.000Z"),
  retryAfterSeconds: 600,
  backend: "memory",
};

function request() {
  return new Request("http://localhost/api/admin/fiscal-watch", {
    headers: { Authorization: "Bearer admin-token" },
  });
}

function reviewRequest(
  body: unknown = { action: "review", issueNumber: 81, kind: "change" },
) {
  return new Request("http://localhost/api/admin/fiscal-watch", {
    method: "POST",
    headers: {
      Authorization: "Bearer admin-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function jsonResponse(value: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

function workflowFixture() {
  return {
    workflow_runs: [
      {
        id: 73,
        status: "completed",
        conclusion: "success",
        updated_at: "2026-07-13T09:00:00.000Z",
        html_url:
          "https://github.com/puntoracingrc/Factu-Autonomo/actions/runs/73",
        head_sha: "private-hash-never-returned",
      },
    ],
  };
}

function issueFixture(label: string) {
  const marker =
    label === "fiscal-watch:unreviewed"
      ? "<!-- fiscal-watch-change:v1:aeat-all-news-rss:0123456789abcdef0123456789abcdef -->"
      : "<!-- fiscal-watch-baseline:v1:official-fiscal-watch.2026-07-13.v2:fiscal-watch-parser.2026-07-13.v2 -->";
  return {
    number: 81,
    state: "open",
    title: "Cambio detectado en fuente oficial",
    html_url: "https://github.com/puntoracingrc/Factu-Autonomo/issues/81",
    created_at: "2026-07-13T09:02:00.000Z",
    updated_at: "2026-07-13T09:03:00.000Z",
    labels: [{ name: label }],
    user: { login: "github-actions[bot]", type: "Bot" },
    body:
      `${marker}\nFuente oficial: https://sede.agenciatributaria.gob.es/Sede/todas-noticias.html\n` +
      (label === "fiscal-watch:unreviewed"
        ? "<!-- fiscal-watch-model-hint:v1:303 -->\n"
        : "") +
      "raw-secret-body",
  };
}

function installGithubFetch(input?: {
  workflow?: () => Response;
  unreviewed?: () => Response;
  baseline?: () => Response;
}) {
  const fetchMock = vi.fn(
    async (urlInput: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(
        typeof urlInput === "string"
          ? urlInput
          : urlInput instanceof URL
            ? urlInput.toString()
            : urlInput.url,
      );
      expect(url.origin).toBe("https://api.github.com");
      expect(url.pathname).toContain("/repos/puntoracingrc/Factu-Autonomo/");
      expect(init?.cache).toBe("force-cache");
      expect(init?.next).toEqual({ revalidate: 15 * 60 });
      expect(init?.redirect).toBe("error");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(new Headers(init?.headers).has("authorization")).toBe(false);

      if (url.pathname.includes("/actions/workflows/fiscal-watch.yml/runs")) {
        expect(url.searchParams.get("branch")).toBe("main");
        expect(url.searchParams.get("per_page")).toBe("1");
        return input?.workflow?.() ?? jsonResponse(workflowFixture());
      }
      if (url.searchParams.get("labels") === "fiscal-watch:unreviewed") {
        expect(url.searchParams.get("per_page")).toBe("21");
        return input?.unreviewed?.() ?? jsonResponse([]);
      }
      if (url.searchParams.get("labels") === "fiscal-watch:baseline") {
        expect(url.searchParams.get("per_page")).toBe("21");
        return input?.baseline?.() ?? jsonResponse([]);
      }
      return new Response(null, { status: 404 });
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function expectPrivateHeaders(response: Response) {
  expect(response.headers.get("cache-control")).toBe(
    "private, no-store, max-age=0",
  );
  expect(response.headers.get("cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("vercel-cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("x-robots-tag")).toBe(
    "noindex, nofollow, noarchive",
  );
}

describe("GET /api/admin/fiscal-watch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T09:15:00.000Z"));
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: true,
      user: { id: "admin-1" },
    } as never);
    vi.mocked(checkRateLimit).mockResolvedValue(ALLOWED_RATE_LIMIT);
    vi.mocked(listFiscalWatchReviewKeys).mockResolvedValue({
      available: true,
      keys: [],
    });
    vi.mocked(recordFiscalWatchReview).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it("autentica admin/MFA antes del rate limit y de cualquier red", async () => {
    const fetchMock = installGithubFetch();
    vi.mocked(getAdminAccessFromRequest).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "MFA requerida" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    } as never);

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expectPrivateHeaders(response);
  });

  it("aplica el rate limit antes de consultar GitHub", async () => {
    const fetchMock = installGithubFetch();
    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      ...ALLOWED_RATE_LIMIT,
      allowed: false,
      remaining: 0,
    });

    const response = await GET(request());

    expect(response.status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      {
        namespace: "admin_fiscal_watch",
        limit: 12,
        windowMs: 10 * 60_000,
      },
      "admin-1",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expectPrivateHeaders(response);
  });

  it("consulta solo el workflow y las dos etiquetas públicas y devuelve datos saneados", async () => {
    const fetchMock = installGithubFetch({
      unreviewed: () => jsonResponse([issueFixture("fiscal-watch:unreviewed")]),
    });

    const response = await GET(request());
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(body.status).toMatchObject({
      level: "watch",
      pendingReviews: 1,
      baselinePending: false,
      lastRunAt: "2026-07-13T09:00:00.000Z",
    });
    expect(body.reviewStoreAvailable).toBe(true);
    expect(body.status.issues[0]).toMatchObject({
      number: 81,
      sourceLabel: "Agencia Tributaria",
      sourceUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-noticias.html",
      modelCodes: ["303"],
      modelHintsTruncated: false,
    });
    expect(serialized).not.toContain("raw-secret-body");
    expect(serialized).not.toContain("private-hash-never-returned");
    expect(serialized).not.toContain("admin-token");
    expectPrivateHeaders(response);
  });

  it("reutiliza cinco minutos el estado público sin saltarse auth ni rate limit", async () => {
    const fetchMock = installGithubFetch();

    const first = await GET(request());
    const second = await GET(request());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(getAdminAccessFromRequest).toHaveBeenCalledTimes(2);
    expect(checkRateLimit).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(5 * 60_000 + 1);
    const afterExpiry = await GET(request());
    expect(afterExpiry.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("falla cerrado en rojo si Content-Length supera 1 MiB sin leer el cuerpo", async () => {
    const fetchMock = installGithubFetch({
      workflow: () =>
        jsonResponse(workflowFixture(), { "Content-Length": "1048577" }),
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(body.status.level).toBe("action");
    expect(body.status.sourcesValid).toBe(false);
    expectPrivateHeaders(response);
  });

  it("cuenta bytes reales multibyte y corta un cuerpo mayor de 1 MiB sin Content-Length", async () => {
    const oversizedMultibyteBody = "á".repeat(600_000);
    const fetchMock = installGithubFetch({
      unreviewed: () =>
        new Response(oversizedMultibyteBody, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    });

    const response = await GET(request());
    const body = await response.json();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(body.status.level).toBe("action");
    expect(body.status.sourcesValid).toBe(false);
    expectPrivateHeaders(response);
  });

  it("convierte timeout, HTTP o MIME inválido en señal roja sin filtrar detalles", async () => {
    const fetchMock = installGithubFetch({
      baseline: () =>
        new Response("<html>private upstream detail</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
    });

    const response = await GET(request());
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(body.status.level).toBe("action");
    expect(serialized).not.toContain("private upstream detail");
    expectPrivateHeaders(response);
  });
});

describe("POST /api/admin/fiscal-watch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T09:15:00.000Z"));
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: true,
      user: { id: "admin-1" },
    } as never);
    vi.mocked(checkRateLimit).mockResolvedValue(ALLOWED_RATE_LIMIT);
    vi.mocked(listFiscalWatchReviewKeys).mockResolvedValue({
      available: true,
      keys: [],
    });
    vi.mocked(recordFiscalWatchReview).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it("autentica y limita antes de leer el cuerpo o consultar GitHub", async () => {
    const fetchMock = installGithubFetch();
    vi.mocked(getAdminAccessFromRequest).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "MFA requerida" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    } as never);

    const denied = await POST(reviewRequest());

    expect(denied.status).toBe(403);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(recordFiscalWatchReview).not.toHaveBeenCalled();
    expectPrivateHeaders(denied);
  });

  it("rechaza cuerpos desconocidos antes de consultar la fuente", async () => {
    const fetchMock = installGithubFetch();

    const response = await POST(
      reviewRequest({
        action: "review",
        issueNumber: 81,
        kind: "change",
        deleteEvidence: true,
      }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(recordFiscalWatchReview).not.toHaveBeenCalled();
    expectPrivateHeaders(response);
  });

  it("verifica el aviso fresco, registra al actor y devuelve verde al retirarlo", async () => {
    const fetchMock = installGithubFetch({
      unreviewed: () => jsonResponse([issueFixture("fiscal-watch:unreviewed")]),
    });
    vi.mocked(listFiscalWatchReviewKeys).mockResolvedValue({
      available: true,
      keys: ["change:81"],
    });

    const response = await POST(reviewRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(recordFiscalWatchReview).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      kind: "change",
      issueNumber: 81,
    });
    expect(body).toMatchObject({
      reviewed: true,
      reviewStoreAvailable: true,
      status: {
        level: "ok",
        label: "Al día",
        pendingReviews: 0,
        baselinePending: false,
        issues: [],
      },
    });
    expectPrivateHeaders(response);
  });

  it("no registra un número que no esté actualmente pendiente", async () => {
    const fetchMock = installGithubFetch();

    const response = await POST(reviewRequest());

    expect(response.status).toBe(409);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(recordFiscalWatchReview).not.toHaveBeenCalled();
    expectPrivateHeaders(response);
  });

  it("falla sin ocultar el aviso si no puede persistir la revisión", async () => {
    installGithubFetch({
      unreviewed: () => jsonResponse([issueFixture("fiscal-watch:unreviewed")]),
    });
    vi.mocked(recordFiscalWatchReview).mockResolvedValue(false);

    const response = await POST(reviewRequest());

    expect(response.status).toBe(503);
    expect(listFiscalWatchReviewKeys).not.toHaveBeenCalled();
    expectPrivateHeaders(response);
  });
});
