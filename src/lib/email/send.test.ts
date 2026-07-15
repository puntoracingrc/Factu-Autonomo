import { afterEach, describe, expect, it, vi } from "vitest";
import { getEmailDeliveryStatus, sendEmail } from "./send";

const input = {
  to: "owner@example.test",
  subject: "Bienvenida",
  html: "<p>Hola</p>",
  text: "Hola",
};

describe("sendEmail provider result classification", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("mantiene ambiguo y reintentable un 5xx aunque falle su body", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers(),
        text: vi.fn().mockRejectedValue(new Error("body stream interrupted")),
      }),
    );

    await expect(sendEmail(input)).resolves.toEqual({
      ok: false,
      status: 503,
      failureKind: "ambiguous",
      retryable: true,
      error: "Resend respondió 503",
    });
  });

  it("clasifica un 4xx como rechazo conocido y respeta Retry-After", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          headers: new Headers(),
          text: vi.fn().mockResolvedValue('{"name":"validation_error"}'),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ "Retry-After": "17" }),
          text: vi.fn().mockResolvedValue('{"name":"rate_limit_exceeded"}'),
        }),
    );

    await expect(sendEmail(input)).resolves.toMatchObject({
      ok: false,
      status: 400,
      providerCode: "validation_error",
      failureKind: "known",
      retryable: false,
    });
    await expect(sendEmail(input)).resolves.toMatchObject({
      ok: false,
      status: 429,
      providerCode: "rate_limit_exceeded",
      failureKind: "known",
      retryable: true,
      retryAfterSeconds: 17,
    });
  });

  it("trata como ambiguo el 409 de otra petición idempotente en curso", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        headers: new Headers(),
        text: vi
          .fn()
          .mockResolvedValue('{"name":"concurrent_idempotent_requests"}'),
      }),
    );

    await expect(sendEmail(input)).resolves.toMatchObject({
      ok: false,
      status: 409,
      providerCode: "concurrent_idempotent_requests",
      failureKind: "ambiguous",
      retryable: true,
    });
  });

  it("envía una Idempotency-Key explícita al proveedor", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({ id: "email-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendEmail({ ...input, idempotencyKey: "welcome-user-v1/user-1" }),
    ).resolves.toEqual({ ok: true, id: "email-1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": "welcome-user-v1/user-1",
        }),
      }),
    );
  });

  it("permite un remitente dedicado para el buzón", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email-1" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail({
      ...input,
      from: "Factu <hola@mail.facturacion-autonomos.app>",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.from).toBe("Factu <hola@mail.facturacion-autonomos.app>");
  });

  it("distingue entrega real de estado pendiente y rebote", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ last_event: "delivered" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ last_event: "sent" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ last_event: "bounced" }), {
          status: 200,
        }),
      );

    await expect(
      getEmailDeliveryStatus("email-1", { fetchImpl }),
    ).resolves.toMatchObject({ state: "delivered", retryable: false });
    await expect(
      getEmailDeliveryStatus("email-2", { fetchImpl }),
    ).resolves.toMatchObject({ state: "pending", retryable: true });
    await expect(
      getEmailDeliveryStatus("email-3", { fetchImpl }),
    ).resolves.toMatchObject({
      state: "failed",
      event: "bounced",
      retryable: false,
    });
  });

  it("mantiene ambiguo un 2xx cuyo identificador no puede confirmarse", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockRejectedValue(new Error("invalid provider metadata")),
      }),
    );

    await expect(sendEmail(input)).resolves.toMatchObject({
      ok: false,
      status: 200,
      failureKind: "ambiguous",
      retryable: true,
    });
  });

  it("mantiene el timeout activo mientras consume el body", async () => {
    vi.useFakeTimers();
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(
          async (_url: string, init: RequestInit | undefined) => ({
            ok: false,
            status: 503,
            headers: new Headers(),
            text: () =>
              new Promise<string>((_resolve, reject) => {
                init?.signal?.addEventListener(
                  "abort",
                  () => reject(new DOMException("Aborted", "AbortError")),
                  { once: true },
                );
              }),
          }),
        ),
    );

    const resultPromise = sendEmail({ ...input, timeoutMs: 25 });
    await vi.advanceTimersByTimeAsync(25);

    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      status: 503,
      failureKind: "ambiguous",
      retryable: true,
    });
  });
});
