import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_DRIVE_BACKUP_SETTINGS,
  DRIVE_BACKUP_SETTINGS_KEY,
  loadDriveBackupSettings,
} from "./google-drive/backup";
import {
  claimLegacyWorkspaceAuxiliarySessionStorage,
  claimLegacyWorkspaceAuxiliaryStorage,
} from "./workspace-auxiliary-storage";
import {
  setActiveWorkspaceOwnerScope,
  workspaceScopedBrowserStorageKey,
} from "./workspace-owner-runtime";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("workspace auxiliary storage", () => {
  const storage = new MemoryStorage();

  beforeEach(() => {
    storage.clear();
    setActiveWorkspaceOwnerScope(null);
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    setActiveWorkspaceOwnerScope(null);
    vi.unstubAllGlobals();
  });

  it("mueve ajustes empresariales antiguos al espacio confirmado", () => {
    const owner = "owner-account-a";
    const drive = JSON.stringify({ enabled: true, frequency: "daily" });
    storage.setItem(DRIVE_BACKUP_SETTINGS_KEY, drive);
    storage.setItem("fa_rentabilidad_real_wizard_answers", "private-a");

    const result = claimLegacyWorkspaceAuxiliaryStorage(owner, storage);

    expect(result.ok).toBe(true);
    expect(result.migratedKeys).toEqual(
      expect.arrayContaining([
        DRIVE_BACKUP_SETTINGS_KEY,
        "fa_rentabilidad_real_wizard_answers",
      ]),
    );
    expect(storage.getItem(DRIVE_BACKUP_SETTINGS_KEY)).toBeNull();
    expect(
      storage.getItem(
        workspaceScopedBrowserStorageKey(DRIVE_BACKUP_SETTINGS_KEY, owner),
      ),
    ).toBe(drive);
  });

  it("una cuenta no carga la configuración de Drive de otra", () => {
    storage.setItem(
      workspaceScopedBrowserStorageKey(
        DRIVE_BACKUP_SETTINGS_KEY,
        "owner-account-a",
      ),
      JSON.stringify({ enabled: true, frequency: "daily" }),
    );

    setActiveWorkspaceOwnerScope("owner-account-a");
    expect(loadDriveBackupSettings()).toMatchObject({
      enabled: true,
      frequency: "daily",
    });

    setActiveWorkspaceOwnerScope("owner-account-b");
    expect(loadDriveBackupSettings()).toEqual(DEFAULT_DRIVE_BACKUP_SETTINGS);
  });

  it("atribuye borradores de sesión solo después de confirmar la cuenta", () => {
    const owner = "owner-account-a";
    const postIt = JSON.stringify({ open: true, text: "Llamar al cliente" });
    const documentDraft = JSON.stringify({ client: "Cliente A" });
    storage.setItem("factu-quick-post-it-v1", postIt);
    storage.setItem("factu:document-session-draft:v1:factura", documentDraft);

    const result = claimLegacyWorkspaceAuxiliarySessionStorage(owner, storage);

    expect(result.ok).toBe(true);
    expect(result.migratedKeys).toEqual(
      expect.arrayContaining([
        "factu-quick-post-it-v1",
        "factu:document-session-draft:v1:factura",
      ]),
    );
    expect(storage.getItem("factu-quick-post-it-v1")).toBeNull();
    expect(
      storage.getItem(
        workspaceScopedBrowserStorageKey("factu-quick-post-it-v1", owner),
      ),
    ).toBe(postIt);
    expect(
      storage.getItem(
        workspaceScopedBrowserStorageKey(
          "factu:document-session-draft:v1:factura",
          owner,
        ),
      ),
    ).toBe(documentDraft);
  });
});
