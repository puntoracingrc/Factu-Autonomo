let activeWorkspaceOwnerScope: string | null = null;
let activeWorkspaceBillingOwnerScope: string | null = null;

export function setActiveWorkspaceOwnerScope(
  ownerScope: string | null,
  billingOwnerScope: string | null = ownerScope,
): void {
  activeWorkspaceOwnerScope = ownerScope?.trim() || null;
  activeWorkspaceBillingOwnerScope = billingOwnerScope?.trim() || null;
}

export function getActiveWorkspaceOwnerScope(): string | null {
  return activeWorkspaceOwnerScope;
}

export function isActiveWorkspaceOwnerScope(ownerScope: string): boolean {
  return activeWorkspaceOwnerScope === ownerScope.trim();
}

export function getActiveWorkspaceBillingOwnerScope(): string | null {
  return activeWorkspaceBillingOwnerScope;
}

export function resolveActiveWorkspaceBillingOwnerScope(
  ownerScope: string | null = activeWorkspaceOwnerScope,
): string | null {
  const normalizedOwner = ownerScope?.trim() || null;
  if (!normalizedOwner) return null;
  return normalizedOwner === activeWorkspaceOwnerScope
    ? (activeWorkspaceBillingOwnerScope ?? normalizedOwner)
    : normalizedOwner;
}

export function workspaceScopedBrowserStorageKey(
  baseKey: string,
  ownerScope: string | null = activeWorkspaceOwnerScope,
): string {
  const owner = ownerScope?.trim();
  return owner ? `${baseKey}:workspace:${encodeURIComponent(owner)}` : baseKey;
}
