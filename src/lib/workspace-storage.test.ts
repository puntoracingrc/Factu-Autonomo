import { describe, expect, it } from "vitest";

import { LEGACY_APP_DATA_STORAGE_KEY } from "./storage";
import {
  claimWorkspaceStorageCandidate,
  initializeWorkspaceStorage,
  preserveWorkspaceStorageCandidate,
  readWorkspaceStorageCandidateOwner,
  resolveWorkspaceStorage,
  workspaceRequiresServerAdoption,
  workspaceStorageBindingKey,
  workspaceStorageKeyForUser,
  workspaceStorageScopeForUser,
  type WorkspaceStorageLike,
} from "./workspace-storage";

class MemoryStorage implements WorkspaceStorageLike {
  private readonly values = new Map<string, string>();

  constructor(private readonly failSetKey: string | null = null) {}

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (key === this.failSetKey) throw new Error("write_failed");
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const USER_A = "user-account-a-0001";
const USER_B = "user-account-b-0002";
const EMPTY_RAW = JSON.stringify({ profile: {}, documents: [] });

function resolveUser(input: {
  storage: MemoryStorage;
  userId: string;
  legacyHasContent?: boolean;
  guestHasContent?: boolean;
  canAutoClaimLegacy?: boolean;
}) {
  return resolveWorkspaceStorage({
    userId: input.userId,
    demoMode: false,
    legacyHasContent: input.legacyHasContent ?? false,
    guestHasContent: input.guestHasContent ?? false,
    canAutoClaimLegacy: input.canAutoClaimLegacy ?? false,
    emptyRaw: EMPTY_RAW,
    storage: input.storage,
  });
}

describe("workspace storage isolation", () => {
  it("mantiene separadas dos cuentas aunque la primera conserve cambios pendientes", () => {
    const storage = new MemoryStorage();
    const legacyRaw = JSON.stringify({
      profile: { name: "Empresa A" },
      meta: { pendingChanges: [{ id: "pending-a" }] },
    });
    storage.setItem(LEGACY_APP_DATA_STORAGE_KEY, legacyRaw);

    const first = resolveUser({
      storage,
      userId: USER_A,
      legacyHasContent: true,
      canAutoClaimLegacy: true,
    });
    expect(first).toMatchObject({
      status: "ready",
      migration: "verified_legacy",
    });

    const userAKey = workspaceStorageKeyForUser(USER_A);
    const pendingUserARaw = JSON.stringify({
      profile: { name: "Empresa A" },
      meta: { pendingChanges: [{ id: "pending-a-after-login" }] },
    });
    storage.setItem(userAKey, pendingUserARaw);

    const second = resolveUser({
      storage,
      userId: USER_B,
      legacyHasContent: true,
    });
    expect(second).toMatchObject({ status: "ready", migration: "empty" });
    expect(storage.getItem(workspaceStorageKeyForUser(USER_B))).toBe(EMPTY_RAW);
    expect(workspaceRequiresServerAdoption(USER_B, storage)).toBe(true);

    const backToFirst = resolveUser({ storage, userId: USER_A });
    expect(backToFirst).toMatchObject({
      status: "ready",
      migration: "existing",
    });
    expect(storage.getItem(userAKey)).toBe(pendingUserARaw);
    expect(storage.getItem(LEGACY_APP_DATA_STORAGE_KEY)).toBe(legacyRaw);
  });

  it("no atribuye silenciosamente una copia antigua sin prueba de propietario", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      LEGACY_APP_DATA_STORAGE_KEY,
      JSON.stringify({ profile: { name: "Empresa sin atribuir" } }),
    );

    const resolution = resolveUser({
      storage,
      userId: USER_A,
      legacyHasContent: true,
    });

    expect(resolution).toMatchObject({
      status: "review_required",
      reason: "legacy_owner_unknown",
      candidateStorageKey: LEGACY_APP_DATA_STORAGE_KEY,
    });
    expect(storage.getItem(workspaceStorageKeyForUser(USER_A))).toBeNull();
    expect(
      readWorkspaceStorageCandidateOwner(
        LEGACY_APP_DATA_STORAGE_KEY,
        storage,
      ),
    ).toBeNull();
  });

  it("no sobrescribe un espacio de usuario existente sin recibo de vinculación", () => {
    const storage = new MemoryStorage();
    const unboundRaw = JSON.stringify({
      profile: { name: "Empresa pendiente de confirmar" },
      documents: [{ id: "draft-unbound" }],
    });
    storage.setItem(workspaceStorageKeyForUser(USER_A), unboundRaw);

    const resolution = resolveUser({ storage, userId: USER_A });

    expect(resolution).toMatchObject({
      status: "review_required",
      reason: "unbound_user_workspace",
      candidateStorageKey: workspaceStorageKeyForUser(USER_A),
    });
    expect(storage.getItem(workspaceStorageKeyForUser(USER_A))).toBe(
      unboundRaw,
    );
  });

  it("entrega una copia invitada una sola vez y no se la ofrece a otra cuenta", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      LEGACY_APP_DATA_STORAGE_KEY,
      JSON.stringify({ profile: { name: "Trabajo sin sesión" } }),
    );

    const guest = resolveWorkspaceStorage({
      userId: null,
      demoMode: false,
      legacyHasContent: true,
      canAutoClaimLegacy: false,
      emptyRaw: EMPTY_RAW,
      storage,
    });
    expect(guest).toMatchObject({ status: "ready", migration: "guest_legacy" });
    if (guest.status !== "ready" || guest.scope.kind !== "guest") {
      throw new Error("guest_workspace_not_created");
    }

    const latestGuestRaw = JSON.stringify({
      profile: { name: "Trabajo sin sesión actualizado" },
      documents: [{ id: "draft-1" }],
    });
    storage.setItem(guest.scope.storageKey, latestGuestRaw);

    const firstLogin = resolveUser({
      storage,
      userId: USER_A,
      legacyHasContent: true,
      guestHasContent: true,
    });
    expect(firstLogin).toMatchObject({
      status: "review_required",
      reason: "guest_owner_unknown",
      candidateStorageKey: guest.scope.storageKey,
    });
    if (firstLogin.status !== "review_required") {
      throw new Error("guest_review_not_requested");
    }
    expect(
      claimWorkspaceStorageCandidate({
        scope: firstLogin.scope,
        candidateStorageKey: firstLogin.candidateStorageKey,
        source: "confirmed_local",
        storage,
      }),
    ).toBe(true);
    expect(storage.getItem(workspaceStorageKeyForUser(USER_A))).toBe(
      latestGuestRaw,
    );

    const signedOut = resolveWorkspaceStorage({
      userId: null,
      demoMode: false,
      legacyHasContent: true,
      canAutoClaimLegacy: false,
      emptyRaw: EMPTY_RAW,
      storage,
    });
    expect(signedOut).toMatchObject({ status: "ready", migration: "empty" });
    if (signedOut.status !== "ready" || signedOut.scope.kind !== "guest") {
      throw new Error("fresh_guest_workspace_not_created");
    }
    expect(signedOut.scope.ownerScope).not.toBe(guest.scope.ownerScope);
    expect(storage.getItem(signedOut.scope.storageKey)).toBe(EMPTY_RAW);
    expect(storage.getItem(guest.scope.storageKey)).toBe(latestGuestRaw);

    const secondLogin = resolveUser({
      storage,
      userId: USER_B,
      legacyHasContent: true,
      guestHasContent: false,
    });
    expect(secondLogin).toMatchObject({ status: "ready", migration: "empty" });
    expect(storage.getItem(workspaceStorageKeyForUser(USER_B))).toBe(EMPTY_RAW);
  });

  it("revierte datos y marcador si no puede escribir el recibo de vinculación", () => {
    const bindingKey = workspaceStorageBindingKey(USER_A);
    const storage = new MemoryStorage(bindingKey);
    const scope = workspaceStorageScopeForUser(USER_A);

    expect(
      initializeWorkspaceStorage({
        scope,
        emptyRaw: EMPTY_RAW,
        source: "server",
        storage,
        requireServerAdoption: true,
      }),
    ).toBe(false);
    expect(storage.getItem(scope.storageKey)).toBeNull();
    expect(storage.getItem(bindingKey)).toBeNull();
    expect(workspaceRequiresServerAdoption(USER_A, storage)).toBe(false);
  });

  it("conserva una copia de recuperación antes de elegir el servidor", () => {
    const storage = new MemoryStorage();
    const raw = JSON.stringify({ profile: { name: "Copia dudosa" } });
    storage.setItem(LEGACY_APP_DATA_STORAGE_KEY, raw);

    const recoveryKey = preserveWorkspaceStorageCandidate({
      ownerScope: USER_A,
      candidateStorageKey: LEGACY_APP_DATA_STORAGE_KEY,
      storage,
      preservedAt: "2026-09-07T10:20:30.000Z",
    });

    expect(recoveryKey).not.toBeNull();
    expect(storage.getItem(recoveryKey ?? "")).toBe(raw);
    expect(storage.getItem(LEGACY_APP_DATA_STORAGE_KEY)).toBe(raw);
  });
});
