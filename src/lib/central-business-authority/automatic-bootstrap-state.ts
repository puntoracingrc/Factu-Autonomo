import type { CentralBusinessBootstrapBrowserPreview } from "./bootstrap-client";

export const CENTRAL_BUSINESS_AUTOMATIC_BOOTSTRAP_STATE =
  "CENTRAL_BUSINESS_AUTOMATIC_BOOTSTRAP_STATE_V1";
export const CENTRAL_BUSINESS_AUTOMATIC_BOOTSTRAP_VERIFIED_EVENT =
  "fa-central-business-auto-bootstrap-verified";

const STORAGE_PREFIX = "factu:central-business:auto-bootstrap:v1";
const verifiedOwnersInMemory = new Set<string>();

export type CentralBusinessAutomaticBootstrapDisposition =
  "commit" | "verified" | "manual_review";

export interface CentralBusinessAutomaticBootstrapStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface StoredAutomaticBootstrapState {
  schema: typeof CENTRAL_BUSINESS_AUTOMATIC_BOOTSTRAP_STATE;
  ownerScope: string;
  verifiedAt: string;
}

function storageKey(ownerScope: string): string {
  return `${STORAGE_PREFIX}:${ownerScope}`;
}

function browserStorage(): CentralBusinessAutomaticBootstrapStorage | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

export function automaticBootstrapDisposition(
  preview: CentralBusinessBootstrapBrowserPreview,
): CentralBusinessAutomaticBootstrapDisposition {
  if (
    !preview.canCommit ||
    preview.summary.conflict > 0 ||
    preview.summary.centralOnly > 0
  ) {
    return "manual_review";
  }
  return preview.summary.create > 0 ? "commit" : "verified";
}

export function hasVerifiedCentralBusinessAutomaticBootstrap(
  ownerScope: string,
  storage: CentralBusinessAutomaticBootstrapStorage | null = browserStorage(),
): boolean {
  if (verifiedOwnersInMemory.has(ownerScope)) return true;
  if (!storage) return false;
  try {
    const raw = storage.getItem(storageKey(ownerScope));
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<StoredAutomaticBootstrapState>;
    const verified =
      parsed.schema === CENTRAL_BUSINESS_AUTOMATIC_BOOTSTRAP_STATE &&
      parsed.ownerScope === ownerScope &&
      typeof parsed.verifiedAt === "string" &&
      parsed.verifiedAt.length > 0;
    if (verified) verifiedOwnersInMemory.add(ownerScope);
    return verified;
  } catch {
    return false;
  }
}

export function markCentralBusinessAutomaticBootstrapVerified(input: {
  ownerScope: string;
  verifiedAt?: string;
  storage?: CentralBusinessAutomaticBootstrapStorage | null;
}): boolean {
  const storage = input.storage ?? browserStorage();
  const state: StoredAutomaticBootstrapState = {
    schema: CENTRAL_BUSINESS_AUTOMATIC_BOOTSTRAP_STATE,
    ownerScope: input.ownerScope,
    verifiedAt: input.verifiedAt ?? new Date().toISOString(),
  };
  verifiedOwnersInMemory.add(input.ownerScope);
  let persisted = false;
  try {
    storage?.setItem(storageKey(input.ownerScope), JSON.stringify(state));
    persisted = storage !== null;
  } catch {
    persisted = false;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CENTRAL_BUSINESS_AUTOMATIC_BOOTSTRAP_VERIFIED_EVENT, {
        detail: { ownerScope: input.ownerScope, persisted },
      }),
    );
  }
  return true;
}
