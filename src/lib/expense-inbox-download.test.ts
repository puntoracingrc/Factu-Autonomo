import { describe, expect, it, vi } from "vitest";
import {
  assertAllowedResendDownloadUrl,
  downloadResendAttachment,
  ExpenseInboxDownloadError,
  MAX_RESEND_ATTACHMENT_BYTES,
  MAX_RESEND_ATTACHMENTS_PER_EMAIL,
  splitResendAttachmentBatch,
} from "./expense-inbox-download";

function metadataResponse(
  overrides: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({
      download_url:
        "https://inbound-cdn.resend.com/email_123/attachments/att_123?signature=test",
      filename: "factura.pdf",
      content_type: "application/pdf",
      ...overrides,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function downloadInput(fetchImpl: typeof fetch, maxBytes = 4) {
  return {
    apiKey: "synthetic-test-key",
    emailId: "email_123",
    attachmentId: "att_123",
    fetchImpl,
    maxBytes,
    timeoutMs: 100,
  };
}

function failureOf(error: unknown): string | undefined {
  return error instanceof ExpenseInboxDownloadError
    ? error.failure
    : undefined;
}

describe("expense inbox attachment download boundaries", () => {
  it("solo admite dominios controlados por Resend mediante HTTPS", () => {
    expect(
      assertAllowedResendDownloadUrl(
        "https://inbound-cdn.resend.com/email/attachments/file?signature=test",
      ).hostname,
    ).toBe("inbound-cdn.resend.com");
    expect(
      assertAllowedResendDownloadUrl(
        "https://eu.inbound-cdn.resend.com/email/attachments/file?signature=test",
      ).hostname,
    ).toBe("eu.inbound-cdn.resend.com");
    expect(
      assertAllowedResendDownloadUrl(
        "https://attachments.resend.com/email/attachments/file?signature=test",
      ).hostname,
    ).toBe("attachments.resend.com");
    expect(
      assertAllowedResendDownloadUrl(
        "https://cdn.resend.app/email/attachments/file?signature=test",
      ).hostname,
    ).toBe("cdn.resend.app");

    const blocked = [
      "http://inbound-cdn.resend.com/email/attachments/file",
      "https://inbound-cdn.resend.com.attacker.test/file",
      "https://cdn.resend.app.attacker.test/file",
      "https://attacker.test/file",
      "https://localhost/file",
      "https://127.0.0.1/file",
      "https://[::1]/file",
      "https://user:password@inbound-cdn.resend.com/file",
      "https://inbound-cdn.resend.com:8443/file",
    ];

    for (const url of blocked) {
      expect(() => assertAllowedResendDownloadUrl(url), url).toThrowError(
        ExpenseInboxDownloadError,
      );
    }
  });

  it("corta la lista antes de iniciar cualquier descarga adicional", () => {
    const attachments = Array.from({ length: 13 }, (_, index) => index);
    const batch = splitResendAttachmentBatch(attachments);

    expect(MAX_RESEND_ATTACHMENTS_PER_EMAIL).toBe(10);
    expect(batch.selected).toEqual(attachments.slice(0, 10));
    expect(batch.overflow).toEqual(attachments.slice(10));
  });

  it("rechaza el tamaño declarado por el webhook antes de llamar a Resend", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(
      downloadResendAttachment({
        ...downloadInput(fetchImpl),
        declaredSize: 5,
      }),
    ).rejects.toSatisfy((error: unknown) => failureOf(error) === "too_large");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rechaza content-length excesivo antes de leer el cuerpo", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(metadataResponse())
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1]), {
          status: 200,
          headers: { "content-length": "5" },
        }),
      );

    await expect(
      downloadResendAttachment(downloadInput(fetchImpl)),
    ).rejects.toSatisfy((error: unknown) => failureOf(error) === "too_large");
  });

  it("identifica la llamada directa y solicita JSON a la API de Resend", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(metadataResponse({ size: 4 }))
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 }),
      );

    await downloadResendAttachment(downloadInput(fetchImpl));

    const headers = new Headers(fetchImpl.mock.calls[0]?.[1]?.headers);
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("user-agent")).toBe(
      "Facturacion-Autonomos/expense-inbox",
    );
    expect(headers.get("authorization")).toBe("Bearer synthetic-test-key");
  });

  it("conserva solo el estado seguro cuando Resend rechaza la lectura", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('{"message":"secret provider detail"}', { status: 401 }),
      );

    const error = await downloadResendAttachment(downloadInput(fetchImpl)).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ExpenseInboxDownloadError);
    expect(error).toMatchObject({
      failure: "provider_error",
      providerStatus: 401,
      message: "Resend no devolvió el adjunto solicitado.",
    });
    expect(String(error)).not.toContain("secret provider detail");
  });

  it("lee por streaming y corta aunque no exista content-length", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.enqueue(new Uint8Array([4, 5]));
        controller.close();
      },
    });
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(metadataResponse())
      .mockResolvedValueOnce(new Response(body, { status: 200 }));

    await expect(
      downloadResendAttachment(downloadInput(fetchImpl)),
    ).rejects.toSatisfy((error: unknown) => failureOf(error) === "too_large");
  });

  it("rechaza redirecciones y solicita a fetch que no las siga", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(metadataResponse())
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://127.0.0.1/private" },
        }),
      );

    await expect(
      downloadResendAttachment(downloadInput(fetchImpl)),
    ).rejects.toSatisfy((error: unknown) => failureOf(error) === "redirect");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ redirect: "manual" });
    expect(fetchImpl.mock.calls[1]?.[1]).toMatchObject({ redirect: "manual" });
  });

  it("rechaza la URL ajena devuelta por los metadatos sin solicitarla", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        metadataResponse({ download_url: "https://attacker.test/invoice.pdf" }),
      );

    await expect(
      downloadResendAttachment(downloadInput(fetchImpl)),
    ).rejects.toSatisfy(
      (error: unknown) => failureOf(error) === "blocked_url",
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("aborta una solicitud que no responde", async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchImpl = vi.fn<typeof fetch>((_input, init) => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise<Response>(() => undefined);
    });

    await expect(
      downloadResendAttachment({
        ...downloadInput(fetchImpl),
        timeoutMs: 5,
      }),
    ).rejects.toSatisfy((error: unknown) => failureOf(error) === "timeout");
    expect(capturedSignal?.aborted).toBe(true);
  });

  it("devuelve exactamente los bytes leídos dentro del límite", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3, 4]));
        controller.close();
      },
    });
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(metadataResponse({ size: 4 }))
      .mockResolvedValueOnce(new Response(body, { status: 200 }));

    const downloaded = await downloadResendAttachment(
      downloadInput(fetchImpl),
    );

    expect(downloaded.buffer).toEqual(Buffer.from([1, 2, 3, 4]));
    expect(downloaded.buffer.byteLength).toBe(4);
    expect(MAX_RESEND_ATTACHMENT_BYTES).toBe(4 * 1024 * 1024);
  });
});
