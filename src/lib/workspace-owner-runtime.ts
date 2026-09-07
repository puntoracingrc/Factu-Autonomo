let activeWorkspaceOwnerScope: string | null = null;

export function setActiveWorkspaceOwnerScope(ownerScope: string | null): void {
  activeWorkspaceOwnerScope = ownerScope?.trim() || null;
}

export function getActiveWorkspaceOwnerScope(): string | null {
  return activeWorkspaceOwnerScope;
}

export function isActiveWorkspaceOwnerScope(ownerScope: string): boolean {
  return activeWorkspaceOwnerScope === ownerScope.trim();
}

export function workspaceScopedBrowserStorageKey(
  baseKey: string,
  ownerScope: string | null = activeWorkspaceOwnerScope,
): string {
  const owner = ownerScope?.trim();
  return owner
    ? `${baseKey}:workspace:${encodeURIComponent(owner)}`
    : baseKey;
}
