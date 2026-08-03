import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  isLegacyCloudExplicitlyRetiredForUser,
  isLegacyCloudRetiredForUser,
} from "@/lib/supabase/config";

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

  it("retires the legacy writer for a selected central rollout owner", () => {
    expect(
      isLegacyCloudRetiredForUser(ownerId, {
        rolloutPercent: "100",
        rolloutEligibleUserIds: "*",
      }),
    ).toBe(true);
    expect(
      isLegacyCloudRetiredForUser(ownerId, {
        rolloutPercent: "0",
        rolloutEligibleUserIds: "*",
      }),
    ).toBe(false);
  });

  it("keeps the legacy synchronizer paused for a retired owner", () => {
    const context = source("src/context/CloudSyncContext.tsx");
    expect(context).toContain(
      "const cloudSyncPaused = globalCloudSyncPaused || legacyCloudRetired;",
    );
    expect(context).toContain("legacyCloudRetired: boolean");
  });

  it("removes the temporary pause warning after the explicit cutover", () => {
    const indicator = source("src/components/cloud/CloudSyncIndicator.tsx");
    const account = source("src/components/cloud/CloudAccountCard.tsx");
    const env = source(".env.example");

    expect(indicator).toContain("if (legacyCloudRetired) return null;");
    expect(account).toContain("Servidor central activo");
    expect(account).toContain("!legacyCloudRetired");
    expect(env).toContain(
      "NEXT_PUBLIC_CENTRAL_AUTHORITY_LEGACY_SYNC_RETIRED_USER_IDS=",
    );
  });
});
