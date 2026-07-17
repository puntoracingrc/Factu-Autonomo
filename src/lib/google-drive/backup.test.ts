import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const protectionMocks = vi.hoisted(() => ({
  createProtectedBackupArtifact: vi.fn(),
}));

vi.mock("@/lib/security/protected-backup", () => ({
  createProtectedBackupArtifact: protectionMocks.createProtectedBackupArtifact,
}));
import {
  buildGoogleDriveAuthorizationUrl,
  buildDriveBackupFileName,
  buildDriveBackupSignature,
  cacheDriveAccessToken,
  clearDriveAccessToken,
  DRIVE_BACKUP_CALLBACK_PATH,
  DRIVE_BACKUP_SETTINGS_EVENT,
  DRIVE_BACKUP_SETTINGS_KEY,
  DRIVE_BACKUP_RETENTION_LIMIT,
  DRIVE_BACKUP_SCOPE,
  hasUsableDriveToken,
  normalizeDriveBackupSettings,
  restoreDriveAccessToken,
  saveDriveBackupSettings,
  shouldRunAutomaticDriveBackup,
  uploadAppBackupToGoogleDriveWithAccessToken,
} from "./backup";
import { createBackupPayload } from "@/lib/backup";
import { DEFAULT_PROFILE, type AppData } from "@/lib/types";

const NOW = new Date("2026-06-29T12:00:00.000Z");

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => values.delete(key)),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

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
    products: [],
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

function expense(
  createdAt = "2026-06-29T10:00:00.000Z",
): AppData["expenses"][number] {
  return {
    id: "expense-drive-test",
    date: "2026-06-29",
    supplierName: "Proveedor Drive",
    description: "Material de prueba",
    amount: 100,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Transferencia",
    purchaseLines: [
      {
        id: "expense-line-drive-test",
        description: "Pieza",
        quantity: 1,
        unitPrice: 100,
      },
    ],
    createdAt,
  };
}

function recurringExpense(
  updatedAt = "2026-06-29T10:00:00.000Z",
): AppData["recurringExpenses"][number] {
  return {
    id: "recurring-drive-test",
    supplierName: "Proveedor recurrente",
    description: "Cuota mensual",
    amount: 50,
    ivaPercent: 21,
    category: "Suministros",
    paymentMethod: "Domiciliación",
    frequency: "monthly",
    dueTiming: { kind: "start_of_month" },
    duration: { kind: "indefinite" },
    startDate: "2026-06-01",
    enabled: true,
    createdAt: "2026-06-29T10:00:00.000Z",
    updatedAt,
  };
}

function importantSettings(data: AppData) {
  return {
    enabled: true as const,
    frequency: "important" as const,
    lastAutoSignature: buildDriveBackupSignature(data, "important", NOW),
  };
}

describe("Google Drive backup", () => {
  beforeEach(() => {
    protectionMocks.createProtectedBackupArtifact.mockReset();
    protectionMocks.createProtectedBackupArtifact.mockImplementation(
      async (data: AppData, exportedAt: string) => {
        const text = JSON.stringify(createBackupPayload(data, exportedAt), null, 2);
        return {
          blob: new Blob([text], { type: "application/json" }),
          text,
          contentSha256: "sha256:test",
          byteLength: new TextEncoder().encode(text).byteLength,
          encrypted: true,
          keyVersion: 1,
        };
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearDriveAccessToken();
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
      archiveExpenseOriginals: false,
      lastBackupAt: "2026-06-29T10:00:00.000Z",
      lastAutoSignature: undefined,
      lastFileId: undefined,
      lastFileName: undefined,
      lastFolderWebViewLink: undefined,
      lastWebViewLink: undefined,
    });
  });

  it("solo activa el archivo de originales de gastos con consentimiento explícito", () => {
    expect(
      normalizeDriveBackupSettings({
        enabled: true,
        frequency: "important",
        archiveExpenseOriginals: true,
      }),
    ).toMatchObject({
      enabled: true,
      frequency: "important",
      archiveExpenseOriginals: true,
    });
    expect(
      normalizeDriveBackupSettings({
        enabled: true,
        frequency: "important",
        archiveExpenseOriginals: "yes",
      }),
    ).toMatchObject({ archiveExpenseOriginals: false });
  });

  it("conserva el enlace a la carpeta de Drive si existe", () => {
    expect(
      normalizeDriveBackupSettings({
        enabled: true,
        frequency: "daily",
        lastFolderWebViewLink:
          "https://drive.google.com/drive/folders/folder-id",
      }),
    ).toMatchObject({
      enabled: true,
      frequency: "daily",
      lastFolderWebViewLink: "https://drive.google.com/drive/folders/folder-id",
    });
  });

  it("avisa a la app cuando se guardan ajustes de Drive", () => {
    const storage = createMemoryStorage();
    const dispatchEvent = vi.fn();

    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { dispatchEvent });

    saveDriveBackupSettings({ enabled: true, frequency: "important" });

    expect(storage.setItem).toHaveBeenCalledWith(
      DRIVE_BACKUP_SETTINGS_KEY,
      JSON.stringify({ enabled: true, frequency: "important" }),
    );
    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: DRIVE_BACKUP_SETTINGS_EVENT }),
    );
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

  it("recupera el permiso de Drive sin pedir consentimiento si Google lo mantiene activo", async () => {
    const requestAccessToken = vi.fn();
    const initTokenClient = vi.fn(
      (config: {
        callback: (response: {
          access_token?: string;
          expires_in?: number;
        }) => void;
      }) => ({
        requestAccessToken: (options?: { prompt?: string }) => {
          requestAccessToken(options);
          config.callback({
            access_token: "restored-access-token",
            expires_in: 3600,
          });
        },
      }),
    );

    vi.stubGlobal("document", {});
    vi.stubGlobal("sessionStorage", createMemoryStorage());
    vi.stubGlobal("window", {
      google: {
        accounts: {
          oauth2: {
            initTokenClient,
          },
        },
      },
    });

    const result = await restoreDriveAccessToken("google-client-id");

    expect(result).toEqual({ ok: true });
    expect(initTokenClient).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "google-client-id",
        scope: DRIVE_BACKUP_SCOPE,
        include_granted_scopes: true,
      }),
    );
    expect(requestAccessToken).toHaveBeenCalledWith({ prompt: "" });
    expect(hasUsableDriveToken()).toBe(true);
  });

  it("no intenta reactivar Drive si falta la configuracion de Google", async () => {
    await expect(restoreDriveAccessToken(" ")).resolves.toEqual({
      ok: false,
      error: "Google Drive no está configurado.",
    });
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

  it("mantiene la frecuencia manual fuera del programador automático", () => {
    const data = dataWithDocument("2026-06-29T10:00:00.000Z");

    expect(buildDriveBackupSignature(data, "manual", NOW)).toBe("");
    expect(
      shouldRunAutomaticDriveBackup(
        { enabled: true, frequency: "manual" },
        data,
        NOW,
      ),
    ).toMatchObject({ due: false, reason: "disabled", signature: "" });
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

  it("programa copia importante al dar de alta, editar y borrar un gasto", () => {
    const initial = dataWithDocument("2026-06-29T10:00:00.000Z");
    const added: AppData = {
      ...initial,
      expenses: [expense()],
    };
    expect(
      shouldRunAutomaticDriveBackup(importantSettings(initial), added, NOW).due,
    ).toBe(true);

    const edits: AppData["expenses"][number][] = [
      { ...added.expenses[0], amount: 175 },
      { ...added.expenses[0], supplierName: "Proveedor corregido" },
      {
        ...added.expenses[0],
        purchaseLines: [
          { ...added.expenses[0].purchaseLines![0], discountPercent: 10 },
        ],
      },
    ];
    for (const editedExpense of edits) {
      expect(
        shouldRunAutomaticDriveBackup(
          importantSettings(added),
          { ...added, expenses: [editedExpense] },
          NOW,
        ).due,
      ).toBe(true);
    }

    const deleted: AppData = {
      ...added,
      expenses: [],
    };
    expect(
      shouldRunAutomaticDriveBackup(importantSettings(added), deleted, NOW).due,
    ).toBe(true);
  });

  it("detecta alta, edición y borrado de una recurrencia", () => {
    const initial = dataWithDocument("2026-06-29T10:00:00.000Z");
    const added: AppData = {
      ...initial,
      recurringExpenses: [recurringExpense()],
    };
    expect(
      shouldRunAutomaticDriveBackup(importantSettings(initial), added, NOW).due,
    ).toBe(true);

    const edited: AppData = {
      ...added,
      recurringExpenses: [
        { ...added.recurringExpenses[0], frequency: "annual", amount: 600 },
      ],
    };
    expect(
      shouldRunAutomaticDriveBackup(importantSettings(added), edited, NOW).due,
    ).toBe(true);

    const deleted: AppData = {
      ...edited,
      recurringExpenses: [],
    };
    expect(
      shouldRunAutomaticDriveBackup(importantSettings(edited), deleted, NOW)
        .due,
    ).toBe(true);
  });

  it("limita la frecuencia importante a documentos, gastos y recurrencias", () => {
    const initial = dataWithDocument("2026-06-29T10:00:00.000Z");
    const changedProfile: AppData = {
      ...initial,
      profile: { ...initial.profile, commercialName: "Nuevo nombre" },
    };

    expect(
      shouldRunAutomaticDriveBackup(
        importantSettings(initial),
        changedProfile,
        NOW,
      ).due,
    ).toBe(false);
  });

  it("cubre con cada cambio todos los datos exportables de AppData", () => {
    const initial = dataWithDocument("2026-06-29T10:00:00.000Z");
    const baseline = buildDriveBackupSignature(initial, "every_change", NOW);
    const surfaces: Array<[string, AppData]> = [
      [
        "profile",
        {
          ...initial,
          profile: { ...initial.profile, commercialName: "Perfil cambiado" },
        },
      ],
      [
        "documents",
        {
          ...initial,
          documents: [{ ...initial.documents[0], notes: "Nota nueva" }],
        },
      ],
      ["expenses", { ...initial, expenses: [expense()] }],
      [
        "recurringExpenses",
        { ...initial, recurringExpenses: [recurringExpense()] },
      ],
      [
        "userReminders",
        {
          ...initial,
          userReminders: [
            {
              id: "reminder-drive-test",
              text: "Revisar copia",
              link: { kind: "none" },
              target: "self",
              completed: false,
              createdAt: "2026-06-29T10:00:00.000Z",
              updatedAt: "2026-06-29T10:00:00.000Z",
            },
          ],
        },
      ],
      [
        "suppliers",
        {
          ...initial,
          suppliers: [
            {
              id: "supplier-drive-test",
              name: "Proveedor de prueba",
              createdAt: "2026-06-29T10:00:00.000Z",
            },
          ],
        },
      ],
      [
        "customers",
        {
          ...initial,
          customers: [
            {
              id: "customer-drive-test",
              firstName: "Cliente",
              lastName: "Prueba",
              name: "Cliente Prueba",
              createdAt: "2026-06-29T10:00:00.000Z",
              updatedAt: "2026-06-29T10:00:00.000Z",
            },
          ],
        },
      ],
      [
        "products",
        {
          ...initial,
          products: [
            {
              id: "product-drive-test",
              key: "producto-prueba",
              name: "Producto prueba",
              family: "Material",
              source: "manual",
              createdAt: "2026-06-29T10:00:00.000Z",
              updatedAt: "2026-06-29T10:00:00.000Z",
            },
          ],
        },
      ],
      [
        "counters",
        { ...initial, counters: { ...initial.counters, recibo: 2 } },
      ],
      [
        "verifactuChain",
        {
          ...initial,
          verifactuChain: {
            issuerNif: "12345678Z",
            lastHash: "hash-prueba",
            recordCount: 1,
          },
        },
      ],
    ];

    for (const [surface, changed] of surfaces) {
      expect(
        buildDriveBackupSignature(changed, "every_change", NOW),
        surface,
      ).not.toBe(baseline);
    }
  });

  it("ignora meta en la firma porque no forma parte del archivo exportado", () => {
    const initial = dataWithDocument("2026-06-29T10:00:00.000Z");
    const onlyMetaChanged: AppData = {
      ...initial,
      meta: { lastModified: "2026-06-29T11:00:00.000Z" },
    };

    expect(
      buildDriveBackupSignature(onlyMetaChanged, "every_change", NOW),
    ).toBe(buildDriveBackupSignature(initial, "every_change", NOW));
  });

  it("crea carpeta y sube un JSON de copia usando el permiso de Drive", async () => {
    const sourceData = dataWithDocument("2026-06-29T10:00:00.000Z");
    const expectedJson = JSON.stringify(
      createBackupPayload(sourceData, NOW.toISOString()),
      null,
      2,
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ files: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "folder-id",
            webViewLink: "https://drive.google.com/drive/folders/folder-id",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
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
      )
      .mockResolvedValueOnce(new Response(expectedJson, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [
              {
                id: "file-id",
                name: "factu-autonomo-drive-backup-2026-06-29-1200.json",
                createdTime: "2026-06-29T12:00:00.000Z",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadAppBackupToGoogleDriveWithAccessToken(
      sourceData,
      "access-token",
      { now: () => NOW },
    );

    expect(result).toEqual({
      ok: true,
      fileId: "file-id",
      fileName: "factu-autonomo-drive-backup-2026-06-29-1200.json",
      webViewLink: "https://drive.google.com/file/d/file-id/view",
      folderWebViewLink: "https://drive.google.com/drive/folders/folder-id",
      exportedAt: "2026-06-29T12:00:00.000Z",
      retention: {
        limit: DRIVE_BACKUP_RETENTION_LIMIT,
        kept: 1,
        removed: 0,
      },
      cleanupWarning: undefined,
    });

    expect(protectionMocks.createProtectedBackupArtifact).toHaveBeenCalledWith(
      sourceData,
      NOW.toISOString(),
      { requireEncryption: true },
    );

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "https://www.googleapis.com/drive/v3/files",
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "https://www.googleapis.com/drive/v3/files?fields=id,webViewLink",
    );
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    );
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain(
      "/drive/v3/files/file-id?alt=media",
    );
    expect(String(fetchMock.mock.calls[4]?.[0])).toContain(
      "name+contains+%27factu-autonomo-drive-backup-",
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

  it("rechaza una copia de Drive si no puede confirmar que esta cifrada", async () => {
    protectionMocks.createProtectedBackupArtifact.mockResolvedValueOnce({
      blob: new Blob(["{}"], { type: "application/json" }),
      text: "{}",
      contentSha256: "sha256:test",
      byteLength: 2,
      encrypted: false,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      uploadAppBackupToGoogleDriveWithAccessToken(
        dataWithDocument("2026-06-29T10:00:00.000Z"),
        "access-token",
        { now: () => NOW },
      ),
    ).resolves.toEqual({
      ok: false,
      error: "No se ha podido confirmar el cifrado de la copia de Drive.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retira de Drive las copias antiguas y conserva solo las diez últimas", async () => {
    const sourceData = dataWithDocument("2026-06-29T10:00:00.000Z");
    const expectedJson = JSON.stringify(
      createBackupPayload(sourceData, NOW.toISOString()),
      null,
      2,
    );
    const oldFiles = Array.from({ length: 12 }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return {
        id: `backup-${index + 1}`,
        name: `factu-autonomo-drive-backup-2026-06-${day}-1200.json`,
        createdTime: `2026-06-${day}T12:00:00.000Z`,
      };
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [
              {
                id: "folder-id",
                name: "Factu - copias de seguridad",
                webViewLink: "https://drive.google.com/drive/folders/folder-id",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "uploaded-file",
            name: "factu-autonomo-drive-backup-2026-06-29-1200.json",
            webViewLink: "https://drive.google.com/file/d/uploaded-file/view",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(new Response(expectedJson, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [
              {
                id: "uploaded-file",
                name: "factu-autonomo-drive-backup-2026-06-29-1200.json",
                createdTime: "2026-06-29T12:00:00.000Z",
              },
              ...oldFiles,
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockImplementation(async () => {
        return new Response(
          JSON.stringify({ id: "trashed-file", trashed: true }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadAppBackupToGoogleDriveWithAccessToken(
      sourceData,
      "access-token",
      { now: () => NOW },
    );

    expect(result).toMatchObject({
      ok: true,
      retention: {
        limit: DRIVE_BACKUP_RETENTION_LIMIT,
        kept: DRIVE_BACKUP_RETENTION_LIMIT,
        removed: 3,
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(7);

    const trashedIds = fetchMock.mock.calls
      .slice(4)
      .map(([url]) => String(url));
    expect(trashedIds).toEqual([
      "https://www.googleapis.com/drive/v3/files/backup-3?fields=id,trashed",
      "https://www.googleapis.com/drive/v3/files/backup-2?fields=id,trashed",
      "https://www.googleapis.com/drive/v3/files/backup-1?fields=id,trashed",
    ]);

    const trashBody = fetchMock.mock.calls[4]?.[1] as RequestInit;
    expect(trashBody.method).toBe("PATCH");
    expect(trashBody.body).toBe(JSON.stringify({ trashed: true }));
  });

  it("no confirma una copia si Drive no devuelve exactamente los bytes subidos", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [{ id: "folder-id", name: "Factu - copias de seguridad" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "file-id",
            name: "factu-autonomo-drive-backup-2026-06-29-1200.json",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response('{"contenido":"distinto"}', { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      uploadAppBackupToGoogleDriveWithAccessToken(
        dataWithDocument("2026-06-29T10:00:00.000Z"),
        "access-token",
        { now: () => NOW },
      ),
    ).resolves.toEqual({
      ok: false,
      error:
        "Drive recibió el archivo, pero no devolvió una copia idéntica. No se ha marcado como copia válida.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
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
      error: "El permiso de Google Drive ha caducado. Vuelve a conectar Drive.",
    });
    expect(hasUsableDriveToken()).toBe(false);
  });
});
