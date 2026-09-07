import { DEMO_WORKSPACE_STORAGE_KEY } from "@/lib/demo-workspace";
import { LEGACY_APP_DATA_STORAGE_KEY } from "@/lib/storage";

export const WORKSPACE_STORAGE_BINDING_SCHEMA =
  "FACTU_WORKSPACE_STORAGE_BINDING_V2";
export const WORKSPACE_STORAGE_USER_PREFIX = "factu:workspace:v2:user:";
export const WORKSPACE_STORAGE_GUEST_PREFIX = "factu:workspace:v2:guest:";
export const WORKSPACE_STORAGE_GUEST_ID_KEY =
  "factu:workspace:v2:guest-device-id";

const WORKSPACE_STORAGE_BINDING_PREFIX = "factu:workspace:v2:binding:";
const WORKSPACE_STORAGE_CANDIDATE_OWNER_PREFIX =
  "factu:workspace:v2:candidate-owner:";
const WORKSPACE_SERVER_ADOPTION_PREFIX =
  "factu:workspace:v2:server-adoption:";
const WORKSPACE_RECOVERY_PREFIX = "factu:workspace:v2:recovery:";

export interface WorkspaceStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type WorkspaceStorageScope =
  | {
      kind: "user";
      ownerScope: string;
      storageKey: string;
    }
  | {
      kind: "guest";
      ownerScope: string;
      storageKey: string;
    }
  | {
      kind: "demo";
      ownerScope: "demo";
      storageKey: typeof DEMO_WORKSPACE_STORAGE_KEY;
    };

export type WorkspaceStorageBindingSource =
  | "verified_legacy"
  | "confirmed_legacy"
  | "verified_local"
  | "confirmed_local"
  | "guest_legacy"
  | "server"
  | "new_local";

export interface WorkspaceStorageBindingReceipt {
  schema: typeof WORKSPACE_STORAGE_BINDING_SCHEMA;
  ownerScope: string;
  storageKey: string;
  source: WorkspaceStorageBindingSource;
  boundAt: string;
  sourceStorageKey?: string;
}

export type WorkspaceStorageResolution =
  | {
      status: "ready";
      scope: WorkspaceStorageScope;
      migration:
        | "existing"
        | "verified_legacy"
        | "verified_local"
        | "guest_legacy"
        | "empty";
    }
  | {
      status: "review_required";
      scope: Extract<WorkspaceStorageScope, { kind: "user" }>;
      candidateStorageKey: string;
      reason:
        | "legacy_owner_unknown"
        | "guest_owner_unknown"
        | "unbound_user_workspace";
    }
  | {
      status: "blocked";
      message: string;
    };

function validOwnerScope(value: string): boolean {
  return (
    value.trim() === value &&
    value.length >= 8 &&
    value.length <= 200 &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  );
}

function encodedOwner(ownerScope: string): string {
  if (!validOwnerScope(ownerScope)) {
    throw new Error("invalid_workspace_owner_scope");
  }
  return encodeURIComponent(ownerScope);
}

export function workspaceStorageKeyForUser(ownerScope: string): string {
  return `${WORKSPACE_STORAGE_USER_PREFIX}${encodedOwner(ownerScope)}`;
}

export function workspaceStorageBindingKey(ownerScope: string): string {
  return `${WORKSPACE_STORAGE_BINDING_PREFIX}${encodedOwner(ownerScope)}`;
}

export function workspaceStorageCandidateOwnerKey(
  candidateStorageKey: string,
): string {
  return `${WORKSPACE_STORAGE_CANDIDATE_OWNER_PREFIX}${encodeURIComponent(candidateStorageKey)}`;
}

export function readWorkspaceStorageCandidateOwner(
  candidateStorageKey: string,
  storage: WorkspaceStorageLike,
): string | null {
  const value = storage
    .getItem(workspaceStorageCandidateOwnerKey(candidateStorageKey))
    ?.trim();
  return value && validOwnerScope(value) ? value : null;
}

export function workspaceServerAdoptionKey(ownerScope: string): string {
  return `${WORKSPACE_SERVER_ADOPTION_PREFIX}${encodedOwner(ownerScope)}`;
}

function randomGuestId(): string {
  const value = globalThis.crypto?.randomUUID?.();
  if (value) return value;
  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateGuestWorkspaceScope(
  storage: WorkspaceStorageLike,
): Extract<WorkspaceStorageScope, { kind: "guest" }> {
  const existing = readExistingGuestWorkspaceScope(storage);
  if (existing) return existing;
  return createGuestWorkspaceScope(storage);
}

function createGuestWorkspaceScope(
  storage: WorkspaceStorageLike,
): Extract<WorkspaceStorageScope, { kind: "guest" }> {
  const ownerScope = randomGuestId();
  storage.setItem(WORKSPACE_STORAGE_GUEST_ID_KEY, ownerScope);
  if (storage.getItem(WORKSPACE_STORAGE_GUEST_ID_KEY) !== ownerScope) {
    throw new Error("guest_workspace_id_not_persisted");
  }
  return {
    kind: "guest",
    ownerScope,
    storageKey: `${WORKSPACE_STORAGE_GUEST_PREFIX}${encodeURIComponent(ownerScope)}`,
  };
}

export function readExistingGuestWorkspaceScope(
  storage: WorkspaceStorageLike,
): Extract<WorkspaceStorageScope, { kind: "guest" }> | null {
  const ownerScope =
    storage.getItem(WORKSPACE_STORAGE_GUEST_ID_KEY)?.trim() ?? "";
  if (!validOwnerScope(ownerScope)) return null;
  return {
    kind: "guest",
    ownerScope,
    storageKey: `${WORKSPACE_STORAGE_GUEST_PREFIX}${encodeURIComponent(ownerScope)}`,
  };
}

export function workspaceStorageScopeForUser(
  ownerScope: string,
): Extract<WorkspaceStorageScope, { kind: "user" }> {
  return {
    kind: "user",
    ownerScope,
    storageKey: workspaceStorageKeyForUser(ownerScope),
  };
}

export function demoWorkspaceStorageScope(): Extract<
  WorkspaceStorageScope,
  { kind: "demo" }
> {
  return {
    kind: "demo",
    ownerScope: "demo",
    storageKey: DEMO_WORKSPACE_STORAGE_KEY,
  };
}

export function readWorkspaceStorageBinding(
  ownerScope: string,
  storage: WorkspaceStorageLike,
): WorkspaceStorageBindingReceipt | null {
  try {
    const raw = storage.getItem(workspaceStorageBindingKey(ownerScope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkspaceStorageBindingReceipt>;
    if (
      parsed.schema !== WORKSPACE_STORAGE_BINDING_SCHEMA ||
      parsed.ownerScope !== ownerScope ||
      parsed.storageKey !== workspaceStorageKeyForUser(ownerScope) ||
      ![
        "verified_legacy",
        "confirmed_legacy",
        "verified_local",
        "confirmed_local",
        "server",
        "new_local",
      ].includes(parsed.source ?? "") ||
      typeof parsed.boundAt !== "string" ||
      !parsed.boundAt
    ) {
      return null;
    }
    return parsed as WorkspaceStorageBindingReceipt;
  } catch {
    return null;
  }
}

function bindWorkspaceRaw(input: {
  scope: Exclude<WorkspaceStorageScope, { kind: "demo" }>;
  raw: string;
  source: WorkspaceStorageBindingSource;
  sourceStorageKey?: string;
  storage: WorkspaceStorageLike;
  now?: string;
}): boolean {
  const before = input.storage.getItem(input.scope.storageKey);
  const bindingKey = workspaceStorageBindingKey(input.scope.ownerScope);
  const bindingBefore = input.storage.getItem(bindingKey);
  let serializedReceipt: string | null = null;
  try {
    input.storage.setItem(input.scope.storageKey, input.raw);
    if (input.storage.getItem(input.scope.storageKey) !== input.raw) {
      throw new Error("workspace_data_not_persisted");
    }
    const receipt: WorkspaceStorageBindingReceipt = {
      schema: WORKSPACE_STORAGE_BINDING_SCHEMA,
      ownerScope: input.scope.ownerScope,
      storageKey: input.scope.storageKey,
      source: input.source,
      boundAt: input.now ?? new Date().toISOString(),
      ...(input.sourceStorageKey
        ? { sourceStorageKey: input.sourceStorageKey }
        : {}),
    };
    serializedReceipt = JSON.stringify(receipt);
    input.storage.setItem(bindingKey, serializedReceipt);
    if (input.storage.getItem(bindingKey) !== serializedReceipt) {
      throw new Error("workspace_binding_not_persisted");
    }
    return true;
  } catch {
    try {
      if (input.storage.getItem(input.scope.storageKey) === input.raw) {
        if (before === null) input.storage.removeItem(input.scope.storageKey);
        else input.storage.setItem(input.scope.storageKey, before);
      }
    } catch {
      // Un estado concurrente o indeterminado se deja intacto y se bloquea.
    }
    try {
      if (
        serializedReceipt !== null &&
        input.storage.getItem(bindingKey) === serializedReceipt
      ) {
        if (bindingBefore === null) input.storage.removeItem(bindingKey);
        else input.storage.setItem(bindingKey, bindingBefore);
      }
    } catch {
      // Un estado concurrente o indeterminado se deja intacto y se bloquea.
    }
    return false;
  }
}

export function claimWorkspaceStorageCandidate(input: {
  scope: Extract<WorkspaceStorageScope, { kind: "user" }>;
  candidateStorageKey: string;
  source:
    | "verified_legacy"
    | "confirmed_legacy"
    | "verified_local"
    | "confirmed_local";
  storage: WorkspaceStorageLike;
  now?: string;
}): boolean {
  const raw = input.storage.getItem(input.candidateStorageKey);
  if (raw === null) return false;
  const ownerKey = workspaceStorageCandidateOwnerKey(
    input.candidateStorageKey,
  );
  const ownerBefore = input.storage.getItem(ownerKey);
  if (ownerBefore && ownerBefore !== input.scope.ownerScope) return false;
  let ownerWritten = false;
  if (!ownerBefore) {
    try {
      input.storage.setItem(ownerKey, input.scope.ownerScope);
      if (input.storage.getItem(ownerKey) !== input.scope.ownerScope) {
        return false;
      }
      ownerWritten = true;
    } catch {
      return false;
    }
  }
  const bound = bindWorkspaceRaw({
    scope: input.scope,
    raw,
    source: input.source,
    sourceStorageKey: input.candidateStorageKey,
    storage: input.storage,
    now: input.now,
  });
  if (!bound && ownerWritten) {
    try {
      if (input.storage.getItem(ownerKey) === input.scope.ownerScope) {
        input.storage.removeItem(ownerKey);
      }
    } catch {
      // La operación ya está bloqueada y no se atribuye la copia a otra cuenta.
    }
  }
  return bound;
}

export function initializeWorkspaceStorage(input: {
  scope: Exclude<WorkspaceStorageScope, { kind: "demo" }>;
  emptyRaw: string;
  source: "server" | "new_local";
  storage: WorkspaceStorageLike;
  requireServerAdoption?: boolean;
  now?: string;
}): boolean {
  const adoptionKey =
    input.scope.kind === "user" && input.requireServerAdoption
      ? workspaceServerAdoptionKey(input.scope.ownerScope)
      : null;
  const adoptionBefore = adoptionKey
    ? input.storage.getItem(adoptionKey)
    : null;
  if (adoptionKey) {
    try {
      input.storage.setItem(adoptionKey, "1");
      if (input.storage.getItem(adoptionKey) !== "1") return false;
    } catch {
      return false;
    }
  }
  const bound = bindWorkspaceRaw({
    scope: input.scope,
    raw: input.emptyRaw,
    source: input.source,
    storage: input.storage,
    now: input.now,
  });
  if (!bound && adoptionKey) {
    try {
      if (input.storage.getItem(adoptionKey) === "1") {
        if (adoptionBefore === null) input.storage.removeItem(adoptionKey);
        else input.storage.setItem(adoptionKey, adoptionBefore);
      }
    } catch {
      // La inicialización queda bloqueada; no se intenta ocultar el fallo.
    }
  }
  return bound;
}

export function preserveWorkspaceStorageCandidate(input: {
  ownerScope: string;
  candidateStorageKey: string;
  storage: WorkspaceStorageLike;
  preservedAt?: string;
}): string | null {
  const raw = input.storage.getItem(input.candidateStorageKey);
  if (raw === null) return null;
  const stamp = (input.preservedAt ?? new Date().toISOString()).replace(
    /[^0-9A-Za-z]/gu,
    "",
  );
  const recoveryKey = `${WORKSPACE_RECOVERY_PREFIX}${encodedOwner(input.ownerScope)}:${stamp}`;
  try {
    input.storage.setItem(recoveryKey, raw);
    return input.storage.getItem(recoveryKey) === raw ? recoveryKey : null;
  } catch {
    return null;
  }
}

export function workspaceRequiresServerAdoption(
  ownerScope: string,
  storage: WorkspaceStorageLike,
): boolean {
  return storage.getItem(workspaceServerAdoptionKey(ownerScope)) === "1";
}

export function markWorkspaceServerAdoptionComplete(
  ownerScope: string,
  storage: WorkspaceStorageLike,
): void {
  storage.removeItem(workspaceServerAdoptionKey(ownerScope));
}

export function resolveWorkspaceStorage(input: {
  userId: string | null;
  demoMode: boolean;
  legacyHasContent: boolean;
  guestHasContent?: boolean;
  canAutoClaimLegacy: boolean;
  emptyRaw: string;
  storage: WorkspaceStorageLike;
}): WorkspaceStorageResolution {
  try {
    if (input.userId) {
      const scope = workspaceStorageScopeForUser(input.userId);
      const targetRaw = input.storage.getItem(scope.storageKey);
      if (targetRaw !== null) {
        return readWorkspaceStorageBinding(input.userId, input.storage)
          ? { status: "ready", scope, migration: "existing" }
          : {
              status: "review_required",
              scope,
              candidateStorageKey: scope.storageKey,
              reason: "unbound_user_workspace",
            };
      }

      const guestScope = readExistingGuestWorkspaceScope(input.storage);
      if (guestScope && input.guestHasContent) {
        const candidateOwner = readWorkspaceStorageCandidateOwner(
          guestScope.storageKey,
          input.storage,
        );
        if (!candidateOwner || candidateOwner === input.userId) {
          if (candidateOwner === input.userId) {
            if (
              !claimWorkspaceStorageCandidate({
                scope,
                candidateStorageKey: guestScope.storageKey,
                source: "verified_local",
                storage: input.storage,
              })
            ) {
              return {
                status: "blocked",
                message:
                  "No se pudo recuperar el espacio local verificado de esta cuenta.",
              };
            }
            return { status: "ready", scope, migration: "verified_local" };
          }
          return {
            status: "review_required",
            scope,
            candidateStorageKey: guestScope.storageKey,
            reason: "guest_owner_unknown",
          };
        }
      }

      const legacyRaw = input.storage.getItem(LEGACY_APP_DATA_STORAGE_KEY);
      if (legacyRaw !== null && input.legacyHasContent) {
        const candidateOwner = readWorkspaceStorageCandidateOwner(
          LEGACY_APP_DATA_STORAGE_KEY,
          input.storage,
        );
        if (candidateOwner && candidateOwner !== input.userId) {
          // La copia global antigua ya fue atribuida a otra cuenta.
        } else if (!input.canAutoClaimLegacy && candidateOwner !== input.userId) {
          return {
            status: "review_required",
            scope,
            candidateStorageKey: LEGACY_APP_DATA_STORAGE_KEY,
            reason: "legacy_owner_unknown",
          };
        } else if (
          !claimWorkspaceStorageCandidate({
            scope,
            candidateStorageKey: LEGACY_APP_DATA_STORAGE_KEY,
            source: "verified_legacy",
            storage: input.storage,
          })
        ) {
          return {
            status: "blocked",
            message: "No se pudo preparar de forma verificable el espacio local de esta cuenta.",
          };
        } else {
          return { status: "ready", scope, migration: "verified_legacy" };
        }
      }

      if (
        !initializeWorkspaceStorage({
          scope,
          emptyRaw: input.emptyRaw,
          source: "server",
          storage: input.storage,
          requireServerAdoption: true,
        })
      ) {
        return {
          status: "blocked",
          message: "El navegador no pudo crear el espacio seguro de esta cuenta.",
        };
      }
      return { status: "ready", scope, migration: "empty" };
    }

    if (input.demoMode) {
      return {
        status: "ready",
        scope: demoWorkspaceStorageScope(),
        migration: "existing",
      };
    }

    let scope = getOrCreateGuestWorkspaceScope(input.storage);
    if (input.storage.getItem(scope.storageKey) !== null) {
      const candidateOwner = readWorkspaceStorageCandidateOwner(
        scope.storageKey,
        input.storage,
      );
      if (!candidateOwner || candidateOwner === scope.ownerScope) {
        return { status: "ready", scope, migration: "existing" };
      }
      scope = createGuestWorkspaceScope(input.storage);
    }
    const legacyRaw = input.storage.getItem(LEGACY_APP_DATA_STORAGE_KEY);
    if (legacyRaw !== null) {
      const legacyOwnerKey = workspaceStorageCandidateOwnerKey(
        LEGACY_APP_DATA_STORAGE_KEY,
      );
      const legacyOwnerBefore = input.storage.getItem(legacyOwnerKey);
      if (!legacyOwnerBefore || legacyOwnerBefore === scope.ownerScope) {
        let legacyOwnerWritten = false;
        if (!legacyOwnerBefore) {
          input.storage.setItem(legacyOwnerKey, scope.ownerScope);
          if (input.storage.getItem(legacyOwnerKey) !== scope.ownerScope) {
            return {
              status: "blocked",
              message:
                "El navegador no pudo proteger la procedencia de la copia local.",
            };
          }
          legacyOwnerWritten = true;
        }
        if (
          !bindWorkspaceRaw({
            scope,
            raw: legacyRaw,
            source: "guest_legacy",
            sourceStorageKey: LEGACY_APP_DATA_STORAGE_KEY,
            storage: input.storage,
          })
        ) {
          if (
            legacyOwnerWritten &&
            input.storage.getItem(legacyOwnerKey) === scope.ownerScope
          ) {
            input.storage.removeItem(legacyOwnerKey);
          }
          return {
            status: "blocked",
            message: "El navegador no pudo aislar los datos locales existentes.",
          };
        }
        return { status: "ready", scope, migration: "guest_legacy" };
      }
    }
    if (
      !initializeWorkspaceStorage({
        scope,
        emptyRaw: input.emptyRaw,
        source: "new_local",
        storage: input.storage,
      })
    ) {
      return {
        status: "blocked",
        message: "El navegador no pudo crear un espacio local.",
      };
    }
    return { status: "ready", scope, migration: "empty" };
  } catch {
    return {
      status: "blocked",
      message: "No se pudo determinar con seguridad qué datos pertenecen a esta sesión.",
    };
  }
}
