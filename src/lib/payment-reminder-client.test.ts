import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { showFactuToast } from "./factu/occasional";
import { issueDocument, markDocumentSent } from "./document-integrity";
import { downloadDocumentPdf } from "./pdf";
import { sendPaymentReminderByEmail } from "./payment-reminder-client";
import { getSupabaseClientAsync } from "./supabase/client";
import { DEFAULT_PROFILE, type Document } from "./types";

vi.mock("./factu/occasional", () => ({
  showFactuToast: vi.fn(),
}));

vi.mock("./pdf", () => ({
  buildDocumentPdfBlob: vi.fn(),
  downloadDocumentPdf: vi.fn(),
}));

vi.mock("./supabase/client", () => ({
  getSupabaseClientAsync: vi.fn(),
}));

const localProfile = {
  ...DEFAULT_PROFILE,
  name: "Emisor local que no debe viajar",
  email: "private-issuer@example.com",
};

const localDocument: Document = markDocumentSent(
  issueDocument(
    {
      id: "invoice-1",
      type: "factura",
      number: "F-2026-0001",
      date: "2026-07-01",
      client: { name: "Cliente local", email: "local@example.com" },
      items: [
        {
          id: "line-1",
          description: "Servicio",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
      status: "borrador",
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-01T10:00:00.000Z",
    },
    localProfile,
    "2026-07-01T10:05:00.000Z",
  ),
  "2026-07-01T10:10:00.000Z",
);

describe("payment reminder email client", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "test-access-token" } },
        }),
      },
    } as never);
    vi.mocked(downloadDocumentPdf).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it("envía a la API solo documentId y mensaje, nunca doc ni profile", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ ok: true }, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendPaymentReminderByEmail({
      doc: localDocument,
      profile: localProfile,
      message: " Recordatorio seguro ",
    });

    expect(result).toEqual({ ok: true, via: "api" });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      documentId: "invoice-1",
      message: "Recordatorio seguro",
    });
    expect(String(init.body)).not.toContain("local@example.com");
    expect(String(init.body)).not.toContain("private-issuer@example.com");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-access-token",
    });
    expect(downloadDocumentPdf).not.toHaveBeenCalled();
  });

  it("mantiene el fallback local cuando el servidor declara no estar configurado", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { ok: false, skipped: true, error: "No configurado" },
            { status: 503 },
          ),
        ),
    );
    const location = { href: "" };
    vi.stubGlobal("window", { location });

    const result = await sendPaymentReminderByEmail({
      doc: localDocument,
      profile: localProfile,
      message: "Recordatorio local",
    });

    expect(result).toEqual({ ok: true, via: "mailto" });
    expect(downloadDocumentPdf).toHaveBeenCalledWith(
      localDocument,
      localProfile,
      undefined,
    );
    expect(location.href).toMatch(/^mailto:local@example\.com\?/);
    expect(showFactuToast).toHaveBeenCalled();
  });

  it("usa el fallback local sin llamar a la API cuando no hay sesión cloud", async () => {
    vi.mocked(getSupabaseClientAsync).mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const location = { href: "" };
    vi.stubGlobal("window", { location });

    const result = await sendPaymentReminderByEmail({
      doc: localDocument,
      profile: localProfile,
      message: "Recordatorio local",
    });

    expect(result).toEqual({ ok: true, via: "mailto" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(downloadDocumentPdf).toHaveBeenCalledWith(
      localDocument,
      localProfile,
      undefined,
    );
  });

  it("hace fallback exclusivamente local ante 404 marcado como skipped", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            ok: false,
            skipped: true,
            error: "No se encontró la factura sincronizada.",
          },
          { status: 404 },
        ),
      ),
    );
    const location = { href: "" };
    vi.stubGlobal("window", { location });

    const result = await sendPaymentReminderByEmail({
      doc: localDocument,
      profile: localProfile,
      message: "Recordatorio",
    });

    expect(result).toEqual({ ok: true, via: "mailto" });
    expect(downloadDocumentPdf).toHaveBeenCalledWith(
      localDocument,
      localProfile,
      undefined,
    );
    expect(location.href).toMatch(/^mailto:local@example\.com\?/);
  });

  it("mantiene cerrado un 404 que el servidor no marque como fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { ok: false, error: "Documento no autorizado." },
            { status: 404 },
          ),
        ),
    );

    const result = await sendPaymentReminderByEmail({
      doc: localDocument,
      profile: localProfile,
      message: "Recordatorio",
    });

    expect(result).toEqual({ ok: false, error: "Documento no autorizado." });
    expect(downloadDocumentPdf).not.toHaveBeenCalled();
  });
});
