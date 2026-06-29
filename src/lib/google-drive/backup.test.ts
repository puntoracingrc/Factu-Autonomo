import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildGoogleDriveAuthorizationUrl,
  buildDriveBackupFileName,
  buildDriveBackupSignature,
  cacheDriveAccessToken,
  clearDriveAccessToken,
  DRIVE_BACKUP_CALLBACK_PATH,
  DRIVE_BACKUP_SCOPE,
  hasUsableDriveToken,
  normalizeDriveBackupSettings,
  shouldRunAutomaticDriveBackup,
  uploadAppBackupToGoogleDriveWithAccessToken,
} from "./backup";
import { DEFAULT_PROFILE, type AppData } from "@/lib/types";

const NOW = new Date("2026-06-29T12:00:00.000Z");

function dataWithDocument(updatedAt: string): AppData {
  return {
    profile: DEFAULT_PROFILE,
    documents: [
      {
        id: "invoice-drive-test",
        type: "factura",
        number: "F-2026-0001",
        date: "2026-06-29",
        client: { name: "Cliente Drive" },
        items: [],
        status: "borrador",
        createdAt: updatedAt,
        updatedAt,
      },
    ],
    expenses: [],
    recurringExpenses: [],
    userReminders: [],
    suppliers: [],
    customers: [],
    counters: {
      factura: 1,
      factura_rectificativa: 0,
      presupuesto: 0,
      recibo: 0,
    },
    meta: {
      lastModified: updatedAt,
    },
  };
}

describe("Google Drive backup", () => {
  afterEach(() => {
    clearDriveAccessToken();
    vi.unstubAllGlobals();
  });

  it("normaliza ajustes locales sin aceptar valores raros", () => {
    expect(
      normalizeDriveBackupSettings({
        enabled: true,
        frequency: "cada_segundo",
        lastBackupAt: "2026-06-29T10:00:00.000Z",
      }),
    ).toEqual({
      enabled: true,
      frequency: "manual",
      lastBackupAt: "2026-06-29T10:00:00.000Z",
      lastAutoSignature: undefined,
      lastFileId: undefined,
      lastFileName: undefined,
      lastWebViewLink: undefined,
    });
  });

  it("crea nombres de archivo con fecha y hora", () => {
    expect(buildDriveBackupFileName("2026-06-29T12:34:56.000Z")).toBe(
      "factu-autonomo-drive-backup-2026-06-29-1234.json",
    );
  });

  it("construye el permiso de Drive con callback propio", () => {
    const url = new URL(
      buildGoogleDriveAuthorizationUrl({
        clientId: "google-client-id",
        redirectUri: `https://facturacion-autonomos.app${DRIVE_BACKUP_CALLBACK_PATH}`,
        state: "state-123",
      }),
    );

    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.pathname).toBe("/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("google-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      `https://facturacion-autonomos.app${DRIVE_BACKUP_CALLBACK_PATH}`,
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe(DRIVE_BACKUP_SCOPE);
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("prompt")).toBe("consent");
  });

  it("evita repetir la copia diaria en el mismo día", () => {
    const data = dataWithDocument("2026-06-29T10:00:00.000Z");
    expect(
      shouldRunAutomaticDriveBackup(
        {
          enabled: true,
          frequency: "daily",
          lastBackupAt: "2026-06-29T09:00:00.000Z",
        },
        data,
        NOW,
      ).due,
    ).toBe(false);

    expect(
      shouldRunAutomaticDriveBackup(
        {
          enabled: true,
          frequency: "daily",
          lastBackupAt: "2026-06-28T09:00:00.000Z",
        },
        data,
        NOW,
      ).due,
    ).toBe(true);
  });

  it("detecta cambios importantes en documentos y gastos", () => {
    const data = dataWithDocument("2026-06-29T10:00:00.000Z");
    const signature = buildDriveBackupSignature(data, "important", NOW);

    expect(
      shouldRunAutomaticDriveBackup(
        {
          enabled: true,
          frequency: "important",
          lastAutoSignature: signature,
        },
        data,
        NOW,
      ).due,
    ).toBe(false);

    const changed = dataWithDocument("2026-06-29T11:00:00.000Z");
    expect(
      shouldRunAutomaticDriveBackup(
        {
          enabled: true,
          frequency: "important",
          lastAutoSignature: signature,
        },
        changed,
        NOW,
      ).due,
    ).toBe(true);
  });

  it("crea carpeta y sube un JSON de copia usando el permiso de Drive", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ files: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "folder-id" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "file-id",
            name: "factu-autonomo-drive-backup-2026-06-29-1200.json",
            webViewLink: "https://drive.google.com/file/d/file-id/view",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadAppBackupToGoogleDriveWithAccessToken(
      dataWithDocument("2026-06-29T10:00:00.000Z"),
      "access-token",
      { now: () => NOW },
    );

    expect(result).toEqual({
      ok: true,
      fileId: "file-id",
      fileName: "factu-autonomo-drive-backup-2026-06-29-1200.json",
      webViewLink: "https://drive.google.com/file/d/file-id/view",
      exportedAt: "2026-06-29T12:00:00.000Z",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "https://www.googleapis.com/drive/v3/files",
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "https://www.googleapis.com/drive/v3/files?fields=id",
    );
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    );

    const createFolderInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(createFolderInit.method).toBe("POST");
    expect(createFolderInit.body).toContain("Factu - copias de seguridad");

    const uploadInit = fetchMock.mock.calls[2]?.[1] as RequestInit;
    expect(uploadInit.method).toBe("POST");
    expect(uploadInit.body).toContain(
      "factu-autonomo-drive-backup-2026-06-29-1200.json",
    );
    expect(uploadInit.body).toContain('"documents"');
    expect(uploadInit.body).toContain('"exportVersion"');
  });

  it("olvida el permiso temporal cuando Google responde no autorizado", async () => {
    cacheDriveAccessToken("access-token", 3600);
    expect(hasUsableDriveToken()).toBe(true);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            error: { message: "Invalid Credentials" },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const result = await uploadAppBackupToGoogleDriveWithAccessToken(
      dataWithDocument("2026-06-29T10:00:00.000Z"),
      "access-token",
    );

    expect(result).toEqual({
      ok: false,
      error:
        "El permiso de Google Drive ha caducado. Vuelve a conectar Drive.",
    });
    expect(hasUsableDriveToken()).toBe(false);
  });
});
