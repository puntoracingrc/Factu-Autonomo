import { describe, expect, it } from "vitest";

import {
  diffRegistries,
  snapshotChangeMetadata,
} from "./cli-core.mjs";

const source = {
  sourceId: "aeat.test",
  authority: "AEAT",
  title: "Fuente oficial",
  officialLocator: "https://sede.agenciatributaria.gob.es/test",
  finalOfficialLocator: "https://sede.agenciatributaria.gob.es/test",
  declaredOfficialUpdatedAt: null,
  materialValidity: {
    status: "UNVERIFIED",
    effectiveFrom: null,
    effectiveTo: null,
    basis: "PENDING_FISCAL_REVIEW",
  },
  contentHash: "sha256:raw",
  normalizedContentHash: "sha256:normalized",
  contentLength: 10,
  contentType: "text/html",
  captureScope: "FULL_DOCUMENT",
  materialScope: "Hecho fiscal sometido a revisión",
  affectedRuleIds: ["rule.test"],
  verificationStatus: "PENDING_FISCAL_REVIEW",
};

describe("fiscal source snapshot history", () => {
  it("records initial and unchanged captures without inventing fiscal review", () => {
    expect(snapshotChangeMetadata(undefined, source)).toEqual({
      previousSnapshotHash: null,
      changeDetected: false,
      changeSummary: {
        status: "INITIAL_CAPTURE",
        nature: "INITIAL",
        requiresFiscalReview: false,
        changedFields: [],
      },
    });
    expect(snapshotChangeMetadata(source, source)).toEqual({
      previousSnapshotHash: source.contentHash,
      changeDetected: false,
      changeSummary: {
        status: "UNCHANGED",
        nature: "NONE",
        requiresFiscalReview: false,
        changedFields: [],
      },
    });
  });

  it("keeps technical-only drift behind mandatory fiscal review", () => {
    const current = { ...source, contentHash: "sha256:new-raw" };
    expect(snapshotChangeMetadata(source, current)).toMatchObject({
      previousSnapshotHash: source.contentHash,
      changeDetected: true,
      changeSummary: {
        status: "CHANGED",
        nature: "TECHNICAL",
        requiresFiscalReview: true,
        changedFields: ["contentHash"],
      },
    });
    const report = diffRegistries(
      {
        registryHash: "sha256:baseline",
        sources: [source],
      },
      {
        registryHash: "sha256:candidate",
        sources: [current],
      },
      { decisions: [] },
    );
    expect(report.status).toBe("CHANGED_REQUIRES_FISCAL_REVIEW");
    expect(report.changes[0].reviewRequirement).toBe(
      "REQUIRES_FISCAL_REVIEW",
    );
    expect(report.automaticallyIrrelevantChanges).toEqual([]);
  });
});
