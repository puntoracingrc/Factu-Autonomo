import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OpenAiClientError,
  requestOpenAiJson,
} from "./openai-client";

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...Object.fromEntries(new Headers(headers).entries()),
    },
  });
}

function pendingFetchUntilAborted() {
  return vi.fn(
    (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const rejectAsAborted = () =>
          reject(new DOMException("Aborted", "AbortError"));
        if (init?.signal?.aborted) {
          rejectAsAborted();
          return;
        }
        init?.signal?.addEventListener("abort", rejectAsAborted, {
          once: true,
        });
      }),
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("requestOpenAiJson", () => {
  it("envía la clave únicamente en Authorization y devuelve JSON y métricas de Responses", async () => {
    const secret = "sk-test-super-secret-value";
    vi.stubEnv("OPENAI_API_KEY", secret);
    const consoleSpies = [
      vi.spyOn(console, "debug").mockImplementation(() => {}),
      vi.spyOn(console, "info").mockImplementation(() => {}),
      vi.spyOn(console, "warn").mockImplementation(() => {}),
      vi.spyOn(console, "error").mockImplementation(() => {}),
    ];
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        id: "resp_safe",
        output_text: '{"status":"review"}',
        usage: {
          input_tokens: 23,
          output_tokens: 11,
          total_tokens: 34,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestOpenAiJson<{
      id: string;
      output_text: string;
      usage: Record<string, number>;
    }>({
      endpoint: "responses",
      body: {
        model: "configured-model",
        store: false,
        input: "contexto mínimo",
      },
    });

    expect(result).toEqual({
      data: {
        id: "resp_safe",
        output_text: '{"status":"review"}',
        usage: {
          input_tokens: 23,
          output_tokens: 11,
          total_tokens: 34,
        },
      },
      metrics: {
        attempts: 1,
        durationMs: expect.any(Number),
        inputTokens: 23,
        outputTokens: 11,
        totalTokens: 34,
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(init.headers).toMatchObject({
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    });
    expect(url).not.toContain(secret);
    expect(String(init.body)).not.toContain(secret);
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(consoleSpies.flatMap((spy) => spy.mock.calls)).toEqual([]);
  });

  it("corta llamadas pendientes y agota solo los intentos configurados", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-timeout-secret");
    const fetchMock = pendingFetchUntilAborted();
    vi.stubGlobal("fetch", fetchMock);

    const result = requestOpenAiJson({
      endpoint: "responses",
      body: { store: false },
      timeoutMs: 25,
      maxAttempts: 3,
    });
    const assertion = expect(result).rejects.toMatchObject({
      name: "OpenAiClientError",
      code: "TIMEOUT",
      transient: true,
      attempts: 3,
    });

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("propaga la cancelación externa sin convertirla en timeout ni reintentar", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-cancel-secret");
    const fetchMock = pendingFetchUntilAborted();
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    const result = requestOpenAiJson({
      endpoint: "responses",
      body: { store: false },
      signal: controller.signal,
      maxAttempts: 3,
    });
    const assertion = expect(result).rejects.toMatchObject({
      name: "OpenAiClientError",
      code: "ABORTED",
      transient: false,
      attempts: 1,
    });

    controller.abort();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reintenta un fallo transitorio y conserva el número real de intentos", async () => {
    vi.useFakeTimers();
    vi.stubEnv("OPENAI_API_KEY", "sk-test-retry-secret");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "temporary" }, 503))
      .mockResolvedValueOnce(
        jsonResponse({
          output_text: '{"status":"review"}',
          usage: { input_tokens: 2, output_tokens: 1 },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = requestOpenAiJson<{ output_text: string }>({
      endpoint: "responses",
      body: { store: false },
      maxAttempts: 2,
    });
    await vi.runAllTimersAsync();

    await expect(result).resolves.toMatchObject({
      data: { output_text: '{"status":"review"}' },
      metrics: { attempts: 2 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("limita a tres los reintentos aunque el llamador solicite más", async () => {
    vi.useFakeTimers();
    vi.stubEnv("OPENAI_API_KEY", "sk-test-bounded-secret");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: "temporary" }, 503));
    vi.stubGlobal("fetch", fetchMock);

    const result = requestOpenAiJson({
      endpoint: "responses",
      body: { store: false },
      maxAttempts: 99,
    });
    const assertion = expect(result).rejects.toMatchObject({
      code: "TRANSIENT_PROVIDER_ERROR",
      status: 503,
      transient: true,
      attempts: 3,
    });
    await vi.runAllTimersAsync();

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["segundos", "60"],
    ["fecha HTTP", new Date(Date.now() + 60_000).toUTCString()],
  ])(
    "no reintenta en línea cuando Retry-After por %s supera el presupuesto",
    async (_label, retryAfter) => {
      vi.stubEnv("OPENAI_API_KEY", "sk-test-retry-after-secret");
      const response = jsonResponse({ error: "rate-limited" }, 429, {
        "Retry-After": retryAfter,
      });
      const cancel = vi.spyOn(response.body!, "cancel");
      const fetchMock = vi.fn().mockResolvedValue(response);
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        requestOpenAiJson({
          endpoint: "responses",
          body: { store: false },
          maxAttempts: 3,
        }),
      ).rejects.toMatchObject({
        code: "TRANSIENT_PROVIDER_ERROR",
        status: 429,
        attempts: 1,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(cancel).toHaveBeenCalledOnce();
    },
  );

  it("no reintenta un rechazo no transitorio ni expone el body del proveedor", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-rejected-secret");
    const sensitiveProviderBody = {
      error: {
        message: "NIF 12345678Z y cuenta ES9121000418450200051332",
      },
    };
    const response = jsonResponse(sensitiveProviderBody, 400);
    const cancel = vi.spyOn(response.body!, "cancel");
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    let caught: unknown;
    try {
      await requestOpenAiJson({
        endpoint: "responses",
        body: { store: false },
        maxAttempts: 3,
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(OpenAiClientError);
    expect(caught).toMatchObject({
      code: "PROVIDER_REJECTED",
      status: 400,
      transient: false,
      attempts: 1,
      message: "La solicitud al proveedor de IA no pudo completarse.",
    });
    expect(JSON.stringify(caught)).not.toContain("12345678Z");
    expect(JSON.stringify(caught)).not.toContain("ES9121000418450200051332");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledOnce();
  });
});
