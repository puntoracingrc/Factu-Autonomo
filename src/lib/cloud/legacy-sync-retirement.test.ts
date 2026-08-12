import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isLegacyCloudExplicitlyRetiredForUser } from "@/lib/supabase/config";

const ROOT = process.cwd();
const ownerId = "11111111-1111-4111-8111-111111111111";

function source(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("legacy cloud retirement", () => {
  it("preserves explicit UUID cutovers without accepting a wildcard there", () => {
    expect(
      isLegacyCloudExplicitlyRetiredForUser(ownerId, {
        userIds: ` other, ${ownerId.toUpperCase()} `,
      }),
    ).toBe(true);
    expect(
      isLegacyCloudExplicitlyRetiredForUser(ownerId, { userIds: "*" }),
    ).toBe(false);
    expect(
      isLegacyCloudExplicitlyRetiredForUser(ownerId, {
        userIds: "user@example.test",
      }),
    ).toBe(false);
    expect(
      isLegacyCloudExplicitlyRetiredForUser(null, { userIds: ownerId }),
    ).toBe(false);
  });

  it("removes the generic browser synchronizer", () => {
    const context = source("src/context/CloudSyncContext.tsx");
    const appStore = source("src/context/AppStore.tsx");
    expect(context).not.toContain("pushSyncChanges");
    expect(context).not.toContain("pullSyncChanges");
    expect(context).not.toContain("user_backups");
    expect(context).toContain("const legacyCloudRetired = Boolean(user)");
    expect(context).toContain("canUseCloudForUser(user.id)");
    expect(context).toContain("pendingUpload: pendingChangeCount > 0");
    expect(context).toContain("void syncNow()");
    expect(appStore).not.toContain("isCloudSyncTemporarilyPaused");
  });

  it("archives the old tables without browser access", () => {
    const preparation = source(
      "supabase/migrations/20260812170000_retire_legacy_sync_entities.sql",
    );
    const finalization = source(
      "supabase/migrations/20260812173000_finalize_legacy_sync_retirement.sql",
    );
    expect(preparation).toContain(
      "workspace_auxiliary_entities_owner_type_uidx",
    );
    expect(preparation).toContain("workspace_auxiliary_entities");
    expect(preparation).not.toContain(
      "alter table public.sync_entities rename to legacy_sync_entities_archive",
    );
    expect(finalization).toContain(
      "alter table public.sync_entities rename to legacy_sync_entities_archive",
    );
    expect(finalization).toContain(
      "alter table public.user_backups rename to legacy_user_backups_archive",
    );
    expect(finalization).toMatch(
      /revoke all on table public\.legacy_sync_entities_archive\s+from public, anon, authenticated, service_role/,
    );
    expect(finalization).toContain(
      "LEGACY_SYNC_RETIREMENT_PREPARATION_REQUIRED",
    );
  });
});
