import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { reportAppError } from "@/lib/monitoring/client";
import { sendFiscalNotificationSupportReportV1 } from "./support-report-client.v1";

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClientAsync: vi.fn(),
}));
vi.mock("@/lib/monitoring/client", () => ({ reportAppError: vi.fn() }));

const input = {
  stage: "STRUCTURED_SAVE" as const,
  status: "DURABILITY_CONFLICT:stale_precondition",
  message: "No se pudo confirmar el guardado.",
  route: "/consultor-fiscal/notificaciones",
  fileByteLength: 49_000,
  mimeType: "application/pdf",
  pageCount: 6,
  persistenceState: "blocked",
};

describe("fiscal notification support report client v1", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("envía el caso saneado con la sesión y confirma el identificador", async () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "00000000-0000-4000-8000-000000000001",
    });
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "access-token" } },
        }),
      },
    } as never);
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        ok: true,
        caseId: "case:00000000-0000-4000-8000-000000000001",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendFiscalNotificationSupportReportV1(input)).resolves.toEqual({
      ok: true,
      caseId: "case:00000000-0000-4000-8000-000000000001",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/fiscal-notifications/support",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
        }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(body).toMatchObject({
      schemaVersion: 1,
      stage: "STRUCTURED_SAVE",
      status: "DURABILITY_CONFLICT:stale_precondition",
    });
    expect(body).not.toHaveProperty("fileName");
    expect(body).not.toHaveProperty("rawText");
    expect(reportAppError).not.toHaveBeenCalled();
  });

  it("no envía sin sesión y muestra un error accionable", async () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "00000000-0000-4000-8000-000000000001",
    });
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      },
    } as never);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendFiscalNotificationSupportReportV1(input)).resolves.toEqual({
      ok: false,
      error: "Inicia sesión de nuevo para enviar el caso a soporte.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("confirma el caso si el registro común de Admin verifica el fallback", async () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "00000000-0000-4000-8000-000000000001",
    });
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "access-token" } },
        }),
      },
    } as never);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          { ok: false, error: "No se pudo enviar el caso." },
          { status: 503 },
        ),
      ),
    );
    vi.mocked(reportAppError).mockResolvedValue(true);

    await expect(sendFiscalNotificationSupportReportV1(input)).resolves.toEqual({
      ok: true,
      caseId: "case:00000000-0000-4000-8000-000000000001",
    });
    expect(reportAppError).toHaveBeenCalledWith(
      expect.objectContaining({
        area: "fiscal_notifications_support",
        metadata: expect.objectContaining({ httpStatus: 503 }),
      }),
    );
  });

  it("mantiene el error si ninguna ruta confirma la recepción", async () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "00000000-0000-4000-8000-000000000001",
    });
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "access-token" } },
        }),
      },
    } as never);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          { ok: false, error: "No se pudo enviar el caso." },
          { status: 503 },
        ),
      ),
    );
    vi.mocked(reportAppError).mockResolvedValue(false);

    await expect(sendFiscalNotificationSupportReportV1(input)).resolves.toEqual({
      ok: false,
      error: "No se pudo enviar el caso.",
    });
  });
});
