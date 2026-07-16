import type { FiscalNotificationsPersistedWorkspaceV2 } from "./persisted-workspace.v2";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";
import { projectFiscalNotificationsWorkspacePrivacyV2 } from "./workspace-privacy-projection.v2";

/**
 * Explicit, one-way privacy migration. It never mutates V1, writes storage or
 * invents missing facts. Unsupported/unsafe V1 graphs fail closed.
 */
export async function migrateFiscalNotificationsWorkspaceV1ToV2(
  value: unknown,
  expectedOwnerScope: string,
): Promise<Readonly<FiscalNotificationsPersistedWorkspaceV2> | null> {
  const workspaceV1 = parseFiscalNotificationsWorkspaceForPersistenceV1(
    value,
    expectedOwnerScope,
  );
  if (!workspaceV1) return null;
  return projectFiscalNotificationsWorkspacePrivacyV2(
    workspaceV1,
    expectedOwnerScope,
  );
}
