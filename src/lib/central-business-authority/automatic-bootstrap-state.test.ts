import { describe, expect, it } from "vitest";

import type { CentralBusinessBootstrapBrowserPreview } from "./bootstrap-client";
import {
  automaticBootstrapDisposition,
  hasVerifiedCentralBusinessAutomaticBootstrap,
  markCentralBusinessAutomaticBootstrapVerified,
  type CentralBusinessAutomaticBootstrapStorage,
} from "./automatic-bootstrap-state";

const OWNER = "11111111-1111-4111-8111-111111111111";

function preview(
  summary: CentralBusinessBootstrapBrowserPreview["summary"],
  canCommit: boolean,
): CentralBusinessBootstrapBrowserPreview {
  return {
    schema: "CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW_V1",
    snapshotDigest: "snapshot-digest",
    centralStateDigest: "central-state-digest",
    previewDigest: "preview-digest",
    summary,
    canCommit,
    entries: [],
  };
}

function memoryStorage(): CentralBusinessAutomaticBootstrapStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("central business automatic bootstrap state", () => {
  it("commits only additive snapshots and verifies exact matches", () => {
    expect(
      automaticBootstrapDisposition(
        preview(
          {
            local: 2,
            centralActive: 0,
            centralDeleted: 0,
            create: 2,
            identical: 0,
            conflict: 0,
            centralOnly: 0,
          },
          true,
        ),
      ),
    ).toBe("commit");
    expect(
      automaticBootstrapDisposition(
        preview(
          {
            local: 2,
            centralActive: 2,
            centralDeleted: 0,
            create: 0,
            identical: 2,
            conflict: 0,
            centralOnly: 0,
          },
          true,
        ),
      ),
    ).toBe("verified");
  });

  it("sends conflicts and central-only records to explicit review", () => {
    expect(
      automaticBootstrapDisposition(
        preview(
          {
            local: 1,
            centralActive: 2,
            centralDeleted: 0,
            create: 0,
            identical: 0,
            conflict: 1,
            centralOnly: 1,
          },
          false,
        ),
      ),
    ).toBe("manual_review");
  });

  it("stores completion per owner without sharing it across tenants", () => {
    const storage = memoryStorage();
    expect(
      markCentralBusinessAutomaticBootstrapVerified({
        ownerScope: OWNER,
        verifiedAt: "2026-08-03T20:00:00.000Z",
        storage,
      }),
    ).toBe(true);
    expect(hasVerifiedCentralBusinessAutomaticBootstrap(OWNER, storage)).toBe(
      true,
    );
    expect(
      hasVerifiedCentralBusinessAutomaticBootstrap(
        "22222222-2222-4222-8222-222222222222",
        storage,
      ),
    ).toBe(false);
  });
});
