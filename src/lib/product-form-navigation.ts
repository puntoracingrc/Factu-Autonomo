import { workspaceScopedBrowserStorageKey } from "@/lib/workspace-owner-runtime";

const PRODUCT_CATALOG_EDIT_REQUEST_KEY =
  "factu:product-catalog-edit-request:v1";

function storageKey(): string {
  return workspaceScopedBrowserStorageKey(PRODUCT_CATALOG_EDIT_REQUEST_KEY);
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): StorageLike | null {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export function saveProductCatalogEditRequest(
  productKey: string,
  storage: StorageLike | null = browserStorage(),
): boolean {
  const key = productKey.trim();
  if (!storage || !key) return false;
  storage.setItem(storageKey(), key);
  return true;
}

export function getProductCatalogEditRequest(
  storage: StorageLike | null = browserStorage(),
): string | null {
  return storage?.getItem(storageKey())?.trim() || null;
}

export function clearProductCatalogEditRequest(
  storage: StorageLike | null = browserStorage(),
): void {
  storage?.removeItem(storageKey());
}
